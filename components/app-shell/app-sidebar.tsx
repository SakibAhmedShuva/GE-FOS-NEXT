import Link from "next/link";
import type { SessionUser } from "@/lib/auth/session";

const primaryNav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/offer/new", label: "Offer" },
  { href: "/catalog", label: "Catalog" },
  { href: "/challan/new", label: "Challan" },
  { href: "/projects", label: "My Projects" },
  { href: "/shared", label: "Shared With Me" },
  { href: "/reviews", label: "My Reviews" },
  { href: "/notifications", label: "Notifications" },
  { href: "/chat", label: "Chat" },
  { href: "/ai-helper", label: "AI Helper" },
];

const adminNav = [
  { href: "/purchase-order/new", label: "Purchase Order" },
  { href: "/admin/projects", label: "All Projects" },
  { href: "/admin/reviews", label: "Admin Reviews" },
  { href: "/admin/activity", label: "Activity Log" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/catalog", label: "Catalog Admin" },
  { href: "/admin/messages", label: "Messaging" },
];

export default function AppSidebar({ user }: { user: SessionUser }) {
  const isAdmin = user.role === "ADMIN";

  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-slate-950 text-white lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">FOS</p>
          <h1 className="mt-2 text-lg font-bold leading-tight">Financial Offer System</h1>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{user.name} · {isAdmin ? "Admin" : "User"}</p>
        </div>

        <nav className="flex-1 space-y-7 px-4 py-5 text-sm" aria-label="Application navigation">
          <div>
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace</p>
            <div className="mt-2 space-y-1">
              {primaryNav.map((item) => (
                <Link key={item.href} href={item.href} className="block rounded-xl px-3 py-2.5 font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {isAdmin && (
            <div>
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Admin</p>
              <div className="mt-2 space-y-1">
                {adminNav.map((item) => (
                  <Link key={item.href} href={item.href} className="block rounded-xl px-3 py-2.5 font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-white/10 px-6 py-4 text-xs text-slate-400">
          Authenticated as {user.email}. Server-side RBAC still controls all API routes.
        </div>
      </div>
    </aside>
  );
}
