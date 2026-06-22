"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PurchaseOrderRow = {
  itemCode: string;
  productType: string;
  make: string;
  model: string;
  approvals: string;
  descriptionPlain: string;
  qty: string;
  unit: string;
  poPriceUsd: string;
  poPriceBdt: string;
};

type PurchaseOrderProject = {
  id: string;
  referenceNumber: string;
  status: "PENDING" | "DELIVERED" | "ARCHIVED";
  clientSnapshot?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  parentProject?: { id: string; referenceNumber: string } | null;
  items: PurchaseOrderRow[];
};

const emptyRow = (): PurchaseOrderRow => ({ itemCode: "", productType: "", make: "", model: "", approvals: "", descriptionPlain: "", qty: "1", unit: "Pcs", poPriceUsd: "", poPriceBdt: "" });
function text(value: unknown) { return value === null || value === undefined ? "" : String(value); }
function money(qty: string, price: string) { const q = Number(qty.replace(/,/g, "")); const p = Number(price.replace(/,/g, "")); return (Number.isFinite(q) && Number.isFinite(p) ? q * p : 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function initialRows(project?: PurchaseOrderProject | null) { return project?.items?.length ? project.items.map((item) => ({ itemCode: text(item.itemCode), productType: text(item.productType), make: text(item.make), model: text(item.model), approvals: text(item.approvals), descriptionPlain: text(item.descriptionPlain), qty: text(item.qty) || "1", unit: text(item.unit) || "Pcs", poPriceUsd: text(item.poPriceUsd), poPriceBdt: text(item.poPriceBdt) })) : [emptyRow()]; }

export default function PurchaseOrderBuilderClient({ initialProject = null }: { initialProject?: PurchaseOrderProject | null }) {
  const router = useRouter();
  const clientSnapshot = (initialProject?.clientSnapshot || {}) as Record<string, unknown>;
  const metadata = (initialProject?.metadata || {}) as Record<string, unknown>;
  const purchaseOrderMeta = (metadata.purchaseOrder || {}) as Record<string, unknown>;
  const [projectId, setProjectId] = useState(initialProject?.id || "");
  const [referenceNumber, setReferenceNumber] = useState(initialProject?.referenceNumber || "");
  const [status, setStatus] = useState<"PENDING" | "DELIVERED" | "ARCHIVED">(initialProject?.status || "PENDING");
  const [clientName, setClientName] = useState(text(clientSnapshot.name ?? clientSnapshot.client_name));
  const [clientAddress, setClientAddress] = useState(text(clientSnapshot.address ?? clientSnapshot.client_address));
  const [originalOfferProjectId, setOriginalOfferProjectId] = useState(initialProject?.parentProject?.id || "");
  const [originalOfferReference, setOriginalOfferReference] = useState(text(purchaseOrderMeta.originalOfferReference || initialProject?.parentProject?.referenceNumber || ""));
  const [terms, setTerms] = useState(text(purchaseOrderMeta.terms));
  const [rows, setRows] = useState<PurchaseOrderRow[]>(initialRows(initialProject));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function updateRow(index: number, key: keyof PurchaseOrderRow, value: string) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  }

  function payload() {
    return {
      referenceNumber,
      status,
      clientSnapshot: { name: clientName, address: clientAddress },
      originalOfferProjectId: originalOfferProjectId || null,
      originalOfferReference,
      terms,
      items: rows.map((row) => ({ ...row, sourceType: "CUSTOM" })),
    };
  }

  async function save() {
    setBusy(true); setError(null); setMessage(null);
    try {
      const res = await fetch(projectId ? `/api/purchase-orders/${projectId}` : "/api/purchase-orders", { method: projectId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Save failed");
      setProjectId(body.project.id);
      setMessage(`Saved ${body.project.referenceNumber}`);
      if (!projectId) router.replace(`/purchase-order/${body.project.id}`);
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); } finally { setBusy(false); }
  }

  async function createFromOffer() {
    if (!originalOfferProjectId) { setError("Paste the offer project ID first"); return; }
    setBusy(true); setError(null); setMessage(null);
    try {
      const res = await fetch("/api/purchase-orders/from-offer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offerProjectId: originalOfferProjectId }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Create from offer failed");
      setMessage(`Created ${body.project.referenceNumber}`);
      router.replace(`/purchase-order/${body.project.id}`);
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Create from offer failed"); } finally { setBusy(false); }
  }

  async function exportDoc(kind: "pdf" | "xlsx") {
    if (!projectId) { setError("Save purchase order first"); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/exports/purchase-order/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Export failed");
      const warnings = Array.isArray(body.warnings) && body.warnings.length ? ` Warning: ${body.warnings.join(" ")}` : "";
      setMessage(`Generated ${kind.toUpperCase()} ${body.export.filename}.${warnings}`);
      window.open(body.downloadUrl, "_blank");
    } catch (err) { setError(err instanceof Error ? err.message : "Export failed"); } finally { setBusy(false); }
  }

  const totalUsd = rows.reduce((sum, row) => {
    const q = Number(row.qty.replace(/,/g, ""));
    const p = Number(row.poPriceUsd.replace(/,/g, ""));
    return sum + (Number.isFinite(q) && Number.isFinite(p) ? q * p : 0);
  }, 0);
  const totalBdt = rows.reduce((sum, row) => {
    const q = Number(row.qty.replace(/,/g, ""));
    const p = Number(row.poPriceBdt.replace(/,/g, ""));
    return sum + (Number.isFinite(q) && Number.isFinite(p) ? q * p : 0);
  }, 0);

  return <section className="space-y-6">
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Admin purchase order</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-950">{projectId ? "Edit Purchase Order" : "New Purchase Order"}</h1>
      <p className="mt-2 text-sm text-slate-500">Admin-only PO save/load, PO-from-offer, original offer reference preservation, PDF/XLSX export.</p>
    </div>

    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm grid gap-4 md:grid-cols-4">
      <label className="text-sm font-semibold text-slate-700">PO Reference<input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" /></label>
      <label className="text-sm font-semibold text-slate-700">Status<select value={status} onChange={(e) => setStatus(e.target.value as any)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm"><option value="PENDING">Pending</option><option value="DELIVERED">Delivered</option><option value="ARCHIVED">Archived</option></select></label>
      <label className="text-sm font-semibold text-slate-700">Offer Project ID<input value={originalOfferProjectId} onChange={(e) => setOriginalOfferProjectId(e.target.value)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" /></label>
      <button type="button" onClick={createFromOffer} disabled={busy || Boolean(projectId)} className="self-end rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold disabled:opacity-40">Create from offer</button>
      <label className="text-sm font-semibold text-slate-700">Original Offer Ref<input value={originalOfferReference} onChange={(e) => setOriginalOfferReference(e.target.value)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" /></label>
      <label className="text-sm font-semibold text-slate-700 md:col-span-3">Client<input value={clientName} onChange={(e) => setClientName(e.target.value)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" /></label>
      <label className="text-sm font-semibold text-slate-700 md:col-span-4">Address<input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" /></label>
      <label className="text-sm font-semibold text-slate-700 md:col-span-4">PO Terms<textarea value={terms} onChange={(e) => setTerms(e.target.value)} className="mt-2 min-h-24 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" /></label>
    </div>

    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-x-auto">
      <table className="min-w-[1200px] text-sm"><thead><tr className="text-left text-xs uppercase text-slate-500"><th className="p-2">Code</th><th className="p-2">Product</th><th className="p-2">Make</th><th className="p-2">Model</th><th className="p-2">Description</th><th className="p-2">Qty</th><th className="p-2">Unit</th><th className="p-2">USD</th><th className="p-2">USD Total</th><th className="p-2">BDT</th><th className="p-2">BDT Total</th><th></th></tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t align-top"><td className="p-2"><input value={row.itemCode} onChange={(e) => updateRow(index, "itemCode", e.target.value)} className="w-32 rounded-xl border-slate-300 px-3 py-2" /></td><td className="p-2"><input value={row.productType} onChange={(e) => updateRow(index, "productType", e.target.value)} className="w-36 rounded-xl border-slate-300 px-3 py-2" /></td><td className="p-2"><input value={row.make} onChange={(e) => updateRow(index, "make", e.target.value)} className="w-28 rounded-xl border-slate-300 px-3 py-2" /></td><td className="p-2"><input value={row.model} onChange={(e) => updateRow(index, "model", e.target.value)} className="w-28 rounded-xl border-slate-300 px-3 py-2" /></td><td className="p-2"><textarea value={row.descriptionPlain} onChange={(e) => updateRow(index, "descriptionPlain", e.target.value)} className="min-h-16 w-80 rounded-xl border-slate-300 px-3 py-2" /></td><td className="p-2"><input value={row.qty} onChange={(e) => updateRow(index, "qty", e.target.value)} className="w-20 rounded-xl border-slate-300 px-3 py-2" /></td><td className="p-2"><input value={row.unit} onChange={(e) => updateRow(index, "unit", e.target.value)} className="w-20 rounded-xl border-slate-300 px-3 py-2" /></td><td className="p-2"><input value={row.poPriceUsd} onChange={(e) => updateRow(index, "poPriceUsd", e.target.value)} className="w-28 rounded-xl border-slate-300 px-3 py-2" /></td><td className="p-2 text-right font-semibold">{money(row.qty, row.poPriceUsd)}</td><td className="p-2"><input value={row.poPriceBdt} onChange={(e) => updateRow(index, "poPriceBdt", e.target.value)} className="w-28 rounded-xl border-slate-300 px-3 py-2" /></td><td className="p-2 text-right font-semibold">{money(row.qty, row.poPriceBdt)}</td><td className="p-2"><button type="button" onClick={() => setRows((cur) => cur.length <= 1 ? cur : cur.filter((_, i) => i !== index))} className="text-xs font-bold text-red-600">Remove</button></td></tr>)}</tbody></table>
      <button type="button" onClick={() => setRows((cur) => [...cur, emptyRow()])} className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold">Add row</button>
    </div>

    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm grid gap-4 md:grid-cols-2"><div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">PO Grand Total USD</p><p className="text-2xl font-bold text-slate-950">{totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div><div><p className="text-xs uppercase tracking-[0.2em] text-slate-500">PO Grand Total BDT</p><p className="text-2xl font-bold text-slate-950">{totalBdt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div></div>

    <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={save} className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950">{busy ? "Working..." : "Save"}</button><button disabled={!projectId || busy} onClick={() => exportDoc("pdf")} className="rounded-xl border px-5 py-2.5 text-sm font-bold">PDF</button><button disabled={!projectId || busy} onClick={() => exportDoc("xlsx")} className="rounded-xl border px-5 py-2.5 text-sm font-bold">XLSX</button></div>
    {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
  </section>;
}
