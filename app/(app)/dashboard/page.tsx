import { legacyFeatureMatrix } from "@/lib/migration/legacy-feature-matrix";
import auditReport from "@/docs/migration/legacy-audit-2026-06-20.json";

const counts = auditReport.counts;

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Stage 1</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Legacy workflow lock and migration schema</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This stage is deliberately not the final UI. It locks the old feature matrix, data model, audit counts, and route parity so offer/export/review/search/chat behavior is not lost during the Next.js migration.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Flask routes" value={counts.flaskRoutes} />
        <StatCard label="Project JSON files" value={counts.projectJsonFiles} />
        <StatCard label="Generated FOS files" value={counts.generatedFosFiles} />
        <StatCard label="Activity rows" value={counts.activityLogRows} />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-950">Feature migration matrix</h2>
          <p className="mt-1 text-sm text-slate-500">Each row remains blocked until import, API, UI, and parity tests pass.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3">Feature</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Required owners</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {legacyFeatureMatrix.map((feature) => (
                <tr key={feature.key}>
                  <td className="px-6 py-4 font-semibold text-slate-900">{feature.key}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-200">{feature.status}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{feature.requiredNewOwners.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-slate-950">{value.toLocaleString()}</p>
    </div>
  );
}
