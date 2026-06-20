"use client";

import { useEffect, useState } from "react";

type AiSuggestion = {
  id?: string;
  sourceType?: string;
  itemCode?: string;
  productType?: string;
  make?: string;
  model?: string;
  approvals?: string;
  descriptionPlain?: string;
  offerPrice?: string;
  poPrice?: string;
  installationPrice?: string;
  unit?: string;
};

type AiRow = {
  rowNumber: number;
  description: string;
  qty: string;
  unit: string;
  unitPrice: string;
  suggestions: AiSuggestion[];
  selected?: boolean;
  selectedIndex?: number;
};

export default function AiHelperClient({ projectId = "" }: { projectId?: string }) {
  const [currentProjectId, setCurrentProjectId] = useState(projectId);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("both");
  const [rows, setRows] = useState<AiRow[]>([]);
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/ai-helper/${projectId}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Failed to reopen AI helper project");
        return body.project;
      })
      .then((project) => {
        const data = project.legacyJson || project.metadata?.aiHelper || {};
        setCurrentProjectId(project.id);
        setReferenceNumber(project.referenceNumber || "");
        setMeta(data.meta || null);
        setRows((data.rows || []).map((row: AiRow) => ({ ...row, selected: row.selected ?? true, selectedIndex: row.selectedIndex ?? 0 })));
        setMessage(`Reopened ${project.referenceNumber}`);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to reopen AI helper project"));
  }, [projectId]);

  async function process() {
    if (!file) {
      setError("Select .xlsx first");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const form = new FormData();
    form.set("file", file);
    form.set("source", source);
    try {
      const response = await fetch("/api/ai-helper/process-file", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Process failed");
      setMeta({ worksheetName: body.worksheetName, headerRowIndex: body.headerRowIndex, columns: body.columns });
      setRows((body.rows || []).map((row: AiRow) => ({ ...row, selected: true, selectedIndex: 0 })));
      setMessage(`Processed ${(body.rows || []).length} rows`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Process failed");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const payload = {
      projectId: currentProjectId || undefined,
      referenceNumber: referenceNumber || `AI-${Date.now()}`,
      meta,
      rows,
    };
    const response = await fetch("/api/ai-helper/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Save failed");
      return;
    }
    setCurrentProjectId(body.project.id);
    setReferenceNumber(body.project.referenceNumber);
    setMessage(`${currentProjectId ? "Updated" : "Saved"} AI project ${body.project.referenceNumber}`);
  }

  async function convert() {
    const selected = rows
      .filter((row) => row.selected)
      .map((row) => ({ ...row, selectedSuggestion: row.suggestions?.[row.selectedIndex || 0] }));
    const response = await fetch("/api/ai-helper/convert-to-offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenceNumber: `FO-AI-${Date.now()}`, clientSnapshot: {}, rows: selected }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Convert failed");
      return;
    }
    window.location.href = `/offer/${body.project.id}`;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">AI Helper</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Spreadsheet Matching</h1>
        <p className="mt-2 text-sm text-slate-500">Upload spreadsheet, detect columns, remove footers, match catalog, then convert selected rows to an offer.</p>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <input value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} placeholder="AI project reference" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          <input type="file" accept=".xlsx" onChange={(event) => setFile(event.target.files?.[0] || null)} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          <select value={source} onChange={(event) => setSource(event.target.value)} className="rounded-xl border-slate-300 px-3 py-2.5 text-sm">
            <option value="both">Foreign + Local</option>
            <option value="foreign">Foreign</option>
            <option value="local">Local</option>
          </select>
          <button onClick={process} disabled={busy} className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950">Process file</button>
          {rows.length > 0 && (
            <>
              <button onClick={save} className="rounded-xl border px-5 py-2.5 text-sm font-bold">{currentProjectId ? "Update AI project" : "Save AI project"}</button>
              <button onClick={convert} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white">Convert to offer</button>
            </>
          )}
        </div>
      </div>

      {meta && <pre className="rounded-2xl bg-slate-950 p-4 text-xs text-cyan-100">{JSON.stringify(meta, null, 2)}</pre>}

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Use</th><th className="px-4 py-3">Row</th><th className="px-4 py-3">Original description</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Match</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={row.rowNumber}>
                <td className="px-4 py-3"><input type="checkbox" checked={Boolean(row.selected)} onChange={(event) => setRows((current) => current.map((r, i) => i === index ? { ...r, selected: event.target.checked } : r))} /></td>
                <td className="px-4 py-3">{row.rowNumber}</td>
                <td className="max-w-xl px-4 py-3">{row.description}</td>
                <td className="px-4 py-3">{row.qty} {row.unit}</td>
                <td className="px-4 py-3">
                  <select value={row.selectedIndex || 0} onChange={(event) => setRows((current) => current.map((r, i) => i === index ? { ...r, selectedIndex: Number(event.target.value) } : r))} className="rounded-xl border-slate-300 px-3 py-2 text-xs">
                    {row.suggestions?.length ? row.suggestions.map((suggestion, i) => <option key={suggestion.id || i} value={i}>{suggestion.itemCode || suggestion.productType} — {suggestion.descriptionPlain?.slice(0, 80)}</option>) : <option>No match</option>}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
