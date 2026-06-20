"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ChallanRow = { itemCode: string; productType: string; descriptionPlain: string; qty: string; unit: string };
type ChallanProject = { id: string; referenceNumber: string; status: "PENDING" | "DELIVERED" | "ARCHIVED"; clientSnapshot?: Record<string, unknown> | null; items: ChallanRow[]; metadata?: any };
const emptyRow = (): ChallanRow => ({ itemCode: "", productType: "", descriptionPlain: "", qty: "1", unit: "Pcs" });
function text(value: unknown) { return value === null || value === undefined ? "" : String(value); }
function initialRows(project?: ChallanProject | null) { return project?.items?.length ? project.items.map((item) => ({ itemCode: text(item.itemCode), productType: text(item.productType), descriptionPlain: text(item.descriptionPlain), qty: text(item.qty) || "1", unit: text(item.unit) || "Pcs" })) : [emptyRow()]; }

export default function ChallanBuilderClient({ initialProject = null }: { initialProject?: ChallanProject | null }) {
  const router = useRouter();
  const metadata = initialProject?.metadata?.challan || {};
  const clientSnapshot = (initialProject?.clientSnapshot || {}) as Record<string, unknown>;
  const [projectId, setProjectId] = useState(initialProject?.id || "");
  const [referenceNumber, setReferenceNumber] = useState(initialProject?.referenceNumber || "");
  const [status, setStatus] = useState<"PENDING" | "DELIVERED" | "ARCHIVED">(initialProject?.status || "PENDING");
  const [clientName, setClientName] = useState(text(clientSnapshot.name ?? clientSnapshot.client_name));
  const [clientAddress, setClientAddress] = useState(text(clientSnapshot.address ?? clientSnapshot.client_address));
  const [challanDate, setChallanDate] = useState(text(metadata.challanDate || new Date().toISOString().slice(0, 10)));
  const [signedCopyReceived, setSignedCopyReceived] = useState(text(metadata.signedCopyReceived));
  const [remarks, setRemarks] = useState(text(metadata.remarks));
  const [challanCarrier, setChallanCarrier] = useState(text(metadata.challanCarrier));
  const [includeSignature, setIncludeSignature] = useState(Boolean(metadata.includeSignature));
  const [rows, setRows] = useState<ChallanRow[]>(initialRows(initialProject));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function updateRow(index: number, key: keyof ChallanRow, value: string) { setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row)); }
  function payload() { return { referenceNumber, status, clientSnapshot: { name: clientName, address: clientAddress }, challanDate, signedCopyReceived, remarks, challanCarrier, includeSignature, items: rows.map((row) => ({ ...row, sourceType: "CUSTOM" })) }; }
  async function nextReference() { const res = await fetch("/api/challans/next-reference", { method: "POST" }); const body = await res.json(); if (res.ok) setReferenceNumber(body.referenceNumber); else setError(body.error || "Reference failed"); }
  async function save() { setBusy(true); setError(null); setMessage(null); try { const res = await fetch(projectId ? `/api/challans/${projectId}` : "/api/challans", { method: projectId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) }); const body = await res.json(); if (!res.ok) throw new Error(body.error || "Save failed"); setProjectId(body.project.id); setMessage(`Saved ${body.project.referenceNumber}`); if (!projectId) router.replace(`/challan/${body.project.id}`); router.refresh(); } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); } finally { setBusy(false); } }
  async function exportDoc(kind: "pdf" | "xlsx") { if (!projectId) { setError("Save challan first"); return; } setBusy(true); setError(null); try { const res = await fetch(`/api/exports/challan/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) }); const body = await res.json(); if (!res.ok) throw new Error(body.error || "Export failed"); setMessage(`Generated ${kind.toUpperCase()} ${body.export.filename}`); window.open(body.downloadUrl, "_blank"); } catch (err) { setError(err instanceof Error ? err.message : "Export failed"); } finally { setBusy(false); } }

  return <section className="space-y-6">
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Challan module</p><h1 className="mt-2 text-2xl font-bold text-slate-950">{projectId ? "Edit Challan" : "New Challan"}</h1><p className="mt-2 text-sm text-slate-500">Save/load, duplicate-safe reference, challan log, PDF/XLSX export.</p></div>
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm grid gap-4 md:grid-cols-4">
      <label className="text-sm font-semibold text-slate-700">Reference<input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" /></label>
      <button type="button" onClick={nextReference} className="self-end rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Next Ref</button>
      <label className="text-sm font-semibold text-slate-700">Date<input type="date" value={challanDate} onChange={(e) => setChallanDate(e.target.value)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" /></label>
      <label className="text-sm font-semibold text-slate-700">Status<select value={status} onChange={(e) => setStatus(e.target.value as any)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm"><option value="PENDING">Pending</option><option value="DELIVERED">Delivered</option><option value="ARCHIVED">Archived</option></select></label>
      <label className="text-sm font-semibold text-slate-700 md:col-span-2">Client<input value={clientName} onChange={(e) => setClientName(e.target.value)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" /></label>
      <label className="text-sm font-semibold text-slate-700 md:col-span-2">Address<input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" /></label>
      <label className="text-sm font-semibold text-slate-700">Carrier<input value={challanCarrier} onChange={(e) => setChallanCarrier(e.target.value)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" /></label>
      <label className="text-sm font-semibold text-slate-700">Signed Copy<input value={signedCopyReceived} onChange={(e) => setSignedCopyReceived(e.target.value)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" /></label>
      <label className="flex items-center gap-2 self-end text-sm font-semibold text-slate-700"><input type="checkbox" checked={includeSignature} onChange={(e) => setIncludeSignature(e.target.checked)} /> Include signature</label>
      <label className="text-sm font-semibold text-slate-700 md:col-span-4">Remarks<textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="mt-2 min-h-20 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" /></label>
    </div>
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-x-auto"><table className="min-w-[900px] text-sm"><thead><tr className="text-left text-xs uppercase text-slate-500"><th className="p-2">Code</th><th className="p-2">Product</th><th className="p-2">Description</th><th className="p-2">Qty</th><th className="p-2">Unit</th><th></th></tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t"><td className="p-2"><input value={row.itemCode} onChange={(e) => updateRow(index, "itemCode", e.target.value)} className="w-32 rounded-xl border-slate-300 px-3 py-2" /></td><td className="p-2"><input value={row.productType} onChange={(e) => updateRow(index, "productType", e.target.value)} className="w-40 rounded-xl border-slate-300 px-3 py-2" /></td><td className="p-2"><textarea value={row.descriptionPlain} onChange={(e) => updateRow(index, "descriptionPlain", e.target.value)} className="min-h-16 w-96 rounded-xl border-slate-300 px-3 py-2" /></td><td className="p-2"><input value={row.qty} onChange={(e) => updateRow(index, "qty", e.target.value)} className="w-20 rounded-xl border-slate-300 px-3 py-2" /></td><td className="p-2"><input value={row.unit} onChange={(e) => updateRow(index, "unit", e.target.value)} className="w-20 rounded-xl border-slate-300 px-3 py-2" /></td><td className="p-2"><button type="button" onClick={() => setRows((cur) => cur.length <= 1 ? cur : cur.filter((_, i) => i !== index))} className="text-xs font-bold text-red-600">Remove</button></td></tr>)}</tbody></table><button type="button" onClick={() => setRows((cur) => [...cur, emptyRow()])} className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold">Add row</button></div>
    <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={save} className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950">{busy ? "Working..." : "Save"}</button><button disabled={!projectId || busy} onClick={() => exportDoc("pdf")} className="rounded-xl border px-5 py-2.5 text-sm font-bold">PDF</button><button disabled={!projectId || busy} onClick={() => exportDoc("xlsx")} className="rounded-xl border px-5 py-2.5 text-sm font-bold">XLSX</button></div>
    {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
  </section>;
}
