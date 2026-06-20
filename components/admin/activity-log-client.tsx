"use client";

import { useEffect, useState } from "react";

type ActivityRow = {
  id: string;
  actorNameSnapshot?: string | null;
  action: string;
  entityType?: string | null;
  referenceNumber?: string | null;
  filePathOrStorageKey?: string | null;
  createdAt: string;
};

export default function ActivityLogClient() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/activity?limit=100")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Failed to load activity");
        return body.logs as ActivityRow[];
      })
      .then(setRows)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-bold text-slate-950">Admin Activity Log</h1>
        <p className="mt-1 text-sm text-slate-500">Append-only imported and new activity records.</p>
      </div>
      {error ? <p className="p-6 text-sm font-medium text-red-600">{error}</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Actor</th><th className="px-6 py-3">Action</th><th className="px-6 py-3">Reference</th><th className="px-6 py-3">File</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id}><td className="px-6 py-4 text-slate-500">{new Date(row.createdAt).toLocaleString()}</td><td className="px-6 py-4 text-slate-600">{row.actorNameSnapshot || "—"}</td><td className="px-6 py-4 font-semibold text-slate-900">{row.action}</td><td className="px-6 py-4 text-slate-600">{row.referenceNumber || "—"}</td><td className="px-6 py-4 text-slate-500">{row.filePathOrStorageKey || "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
