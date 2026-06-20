export default function Page() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Route locked</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-950">My Reviews</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Blocked until review_requests.csv and notification flow are imported.</p>
    </section>
  );
}
