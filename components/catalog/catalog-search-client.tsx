"use client";

import { FormEvent, useState } from "react";

type CatalogItem = {
  id: string;
  sourceType: string;
  productType?: string | null;
  itemCode?: string | null;
  make?: string | null;
  model?: string | null;
  descriptionPlain: string;
  poPrice?: string | number | null;
  offerPrice?: string | number | null;
  unit?: string | null;
};

export default function CatalogSearchClient() {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ q: query, limit: "50" });
    if (source !== "all") params.set("source", source);

    const response = await fetch(`/api/catalog/search?${params.toString()}`);
    const body = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(body.error || "Catalog search failed");
      return;
    }
    setItems(body.items || []);
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-950">Catalog Search</h1>
          <p className="mt-1 text-sm text-slate-500">Supports negative keywords like <code>-pump</code> and source filtering.</p>
        </div>
      </div>

      <form onSubmit={search} className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_auto]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search item description, code, make..." className="rounded-xl border-slate-300 px-3 py-2.5 text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500" />
        <select value={source} onChange={(event) => setSource(event.target.value)} className="rounded-xl border-slate-300 px-3 py-2.5 text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500">
          <option value="all">All sources</option>
          <option value="foreign">Foreign</option>
          <option value="local">Local</option>
          <option value="custom">Custom</option>
        </select>
        <button disabled={loading} className="rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60">{loading ? "Searching..." : "Search"}</button>
      </form>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">{error}</p>}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">PO</th>
              <th className="px-4 py-3">Offer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-slate-600">{item.sourceType}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{item.itemCode || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{item.productType || "—"}</td>
                <td className="max-w-xl px-4 py-3 text-slate-600">{item.descriptionPlain}</td>
                <td className="px-4 py-3 text-right text-slate-600">{item.poPrice ?? "—"}</td>
                <td className="px-4 py-3 text-right text-slate-600">{item.offerPrice ?? "—"}</td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Search after catalog import.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
