import type { SessionUser } from "@/lib/auth/session";
import AppSidebar from "@/components/app-shell/app-sidebar";
import AppTopbar from "@/components/app-shell/app-topbar";

export default function AppShell({ children, user }: { children: React.ReactNode; user: SessionUser }) {
  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <AppSidebar user={user} />
      <div className="min-w-0 flex-1">
        <AppTopbar user={user} />
        <main className="px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
