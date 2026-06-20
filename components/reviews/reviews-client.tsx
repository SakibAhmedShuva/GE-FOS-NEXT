"use client";

import { useEffect, useState } from "react";

type ReviewRow = { id: string; requestType: string; itemCode?: string | null; status: string; visibility: string; remarks?: string | null; details?: Record<string, unknown> | null; updatedAt: string; project?: { referenceNumber: string } | null };

export default function ReviewsClient() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [requestType, setRequestType] = useState("DESCRIPTION_CHANGE");
  const [itemCode, setItemCode] = useState("");
  const [remarks, setRemarks] = useState("");
  const [detailsText, setDetailsText] = useState("{} ".trim());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/reviews");
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Failed to load reviews");
    setRows(body.requests || []);
  }
  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  async function create() {
    setError(null); setMessage(null);
    let details: Record<string, unknown> = {};
    try { details = detailsText.trim() ? JSON.parse(detailsText) : {}; } catch { setError("Details must be valid JSON"); return; }
    const response = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestType, itemCode, remarks, details }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error || "Create failed"); return; }
    setMessage("Review draft created"); setItemCode(""); setRemarks(""); setDetailsText("{}"); await load();
  }

  async function sendToAdmin(row: ReviewRow) {
    setBusyId(row.id); setError(null); setMessage(null);
    try {
      const response = await fetch(`/api/reviews/${row.id}/send-to-admin`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Send failed");
      setMessage("Sent to admin"); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Send failed"); }
    finally { setBusyId(null); }
  }

  return <section className="space-y-6">
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Reviews</p><h1 className="mt-2 text-2xl font-bold text-slate-950">My Review Requests</h1><p className="mt-2 text-sm text-slate-500">Create item correction drafts, then send them to admin for approval.</p></div>
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm grid gap-4 md:grid-cols-3"><label className="text-sm font-semibold text-slate-700">Request type<select value={requestType} onChange={(e) => setRequestType(e.target.value)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm"><option>DESCRIPTION_CHANGE</option><option>PRICE_CHANGE</option><option>REMOVE_ITEM</option><option>GENERAL</option></select></label><label className="text-sm font-semibold text-slate-700">Item code<input value={itemCode} onChange={(e) => setItemCode(e.target.value)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" /></label><label className="text-sm font-semibold text-slate-700">Remarks<input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="mt-2 w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm" /></label><label className="text-sm font-semibold text-slate-700 md:col-span-3">Details JSON<textarea value={detailsText} onChange={(e) => setDetailsText(e.target.value)} className="mt-2 min-h-28 w-full rounded-xl border-slate-300 px-3 py-2.5 font-mono text-xs" placeholder='{"descriptionPlain":"New description", "offerPrice":"100"}' /></label><button type="button" onClick={create} className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950">Create draft</button></div>
    {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">Type</th><th className="px-6 py-3">Item</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Visibility</th><th className="px-6 py-3">Remarks</th><th className="px-6 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="px-6 py-4 font-semibold">{row.requestType}</td><td className="px-6 py-4">{row.itemCode || "—"}</td><td className="px-6 py-4">{row.status}</td><td className="px-6 py-4">{row.visibility}</td><td className="px-6 py-4">{row.remarks || "—"}</td><td className="px-6 py-4 text-right">{row.visibility !== "ADMIN" && row.status !== "APPROVED" && row.status !== "REJECTED" && <button disabled={busyId === row.id} onClick={() => sendToAdmin(row)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">{busyId === row.id ? "Sending..." : "Send to admin"}</button>}</td></tr>)}{!rows.length && <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500">No review requests.</td></tr>}</tbody></table></div>
  </section>;
}
