import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Financial Offer System</p>
        <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
          Clean Next.js + Node.js replacement foundation.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
          This clean project removes the old public template and keeps only the migration-ready business app source: auth, database schema, import scripts, catalog APIs, project APIs, notifications, admin activity, and centralized offer calculations.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300">Sign in</Link>
          <Link href="/dashboard" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">Open dashboard</Link>
        </div>
      </section>
    </main>
  );
}
