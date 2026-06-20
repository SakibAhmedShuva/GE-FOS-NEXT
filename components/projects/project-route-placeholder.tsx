import Link from "next/link";

type ProjectSummary = {
  id: string;
  referenceNumber: string;
  projectType: string;
  status: string;
  owner?: { name: string; email: string } | null;
  clientSnapshot?: Record<string, unknown> | null;
  lastModifiedAt?: string | null;
  updatedAt: string;
  counts?: { items: number; exports: number; activityLogs: number };
};

function text(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export default function ProjectRoutePlaceholder({ project, moduleName }: { project: ProjectSummary; moduleName: string }) {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">{moduleName}</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">{project.referenceNumber}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          This project route is intentionally wired now so migrated records never land on a dead page. The full {moduleName.toLowerCase()} editor/export parity is scheduled for the next module-specific stage.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard label="Client" value={text(project.clientSnapshot?.name ?? project.clientSnapshot?.client_name)} />
        <InfoCard label="Status" value={project.status} />
        <InfoCard label="Owner" value={project.owner?.name || project.owner?.email || "—"} />
        <InfoCard label="Items" value={String(project.counts?.items ?? 0)} />
        <InfoCard label="Exports" value={String(project.counts?.exports ?? 0)} />
        <InfoCard label="Updated" value={new Date(project.updatedAt).toLocaleString()} />
      </div>

      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-900">
        The database/access route is active, but this editor is not implemented yet. This prevents silent feature loss while offer, challan, PO, reviews, chat, and AI helper are migrated in separate parity stages.
      </div>

      <Link href="/projects" className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">Back to projects</Link>
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 font-bold text-slate-950">{value}</p>
    </div>
  );
}
