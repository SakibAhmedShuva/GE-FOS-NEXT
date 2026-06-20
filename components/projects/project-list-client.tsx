"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ProjectRow = {
  id: string;
  referenceNumber: string;
  projectType: "OFFER" | "CHALLAN" | "PURCHASE_ORDER" | "AI_HELPER";
  status: string;
  clientSnapshot?: { name?: string; client_name?: string } | null;
  updatedAt: string;
  owner?: { name: string; email: string } | null;
};

function editorHref(project: ProjectRow) {
  if (project.projectType === "OFFER") return `/offer/${project.id}`;
  if (project.projectType === "CHALLAN") return `/challan/${project.id}`;
  if (project.projectType === "PURCHASE_ORDER") return `/purchase-order/${project.id}`;
  if (project.projectType === "AI_HELPER") return `/ai-helper?projectId=${project.id}`;
  return `/projects/${project.id}`;
}

export default function ProjectListClient({ scope }: { scope: "mine" | "shared" }) {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredProjects = useMemo(() => projects, [projects]);

  async function loadProjects(active = true) {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ scope });
    if (query.trim()) params.set("q", query.trim());

    try {
      const response = await fetch(`/api/projects?${params.toString()}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Failed to load projects");
      if (active) setProjects(body.projects as ProjectRow[]);
    } catch (err) {
      if (active) setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      if (active) setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    loadProjects(active);
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  async function deleteProject(project: ProjectRow) {
    const confirmed = window.confirm(`Delete project ${project.referenceNumber}? Delivered projects are protected unless you are admin.`);
    if (!confirmed) return;
    setDeletingId(project.id);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Delete failed");
      setProjects((current) => current.filter((row) => row.id !== project.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <Panel title="Projects" description="Loading projects..." />;
  if (error && !projects.length) return <Panel title="Projects" description={error} tone="error" />;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-950">{scope === "shared" ? "Shared With Me" : "My Projects"}</h1>
            <p className="mt-1 text-sm text-slate-500">Projects now link back into their editor routes instead of becoming dead saved records.</p>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              loadProjects(true);
            }}
            className="flex w-full max-w-xl gap-2"
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search reference number"
              className="min-w-0 flex-1 rounded-xl border-slate-300 px-3 py-2 text-sm"
            />
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">Search</button>
            <Link href="/offer/new" className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300">New offer</Link>
          </form>
        </div>
        {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">{error}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-3">Reference</th>
              <th className="px-6 py-3">Client</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Owner</th>
              <th className="px-6 py-3">Updated</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredProjects.map((project) => (
              <tr key={project.id}>
                <td className="px-6 py-4 font-semibold text-slate-900">{project.referenceNumber}</td>
                <td className="px-6 py-4 text-slate-600">{project.clientSnapshot?.name || project.clientSnapshot?.client_name || "—"}</td>
                <td className="px-6 py-4 text-slate-600">{project.projectType.replaceAll("_", " ")}</td>
                <td className="px-6 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{project.status}</span></td>
                <td className="px-6 py-4 text-slate-600">{project.owner?.name || "—"}</td>
                <td className="px-6 py-4 text-slate-500">{new Date(project.updatedAt).toLocaleString()}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={editorHref(project)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700">Open</Link>
                    {scope === "mine" && (
                      <button
                        type="button"
                        onClick={() => deleteProject(project)}
                        disabled={deletingId === project.id}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === project.id ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!filteredProjects.length && (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-500">No projects found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Panel({ title, description, tone = "default" }: { title: string; description: string; tone?: "default" | "error" }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-slate-950">{title}</h1>
      <p className={`mt-2 text-sm ${tone === "error" ? "text-red-600" : "text-slate-500"}`}>{description}</p>
    </section>
  );
}
