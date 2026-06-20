import type { SessionUser } from "@/lib/auth/session";

export default function AppTopbar({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Protected Workspace</p>
          <h2 className="text-xl font-bold text-slate-950">{user.role === "ADMIN" ? "Admin" : "User"} session active</h2>
          <p className="text-xs text-slate-500">{user.name} · {user.email}</p>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Logout</button>
        </form>
      </div>
    </header>
  );
}
