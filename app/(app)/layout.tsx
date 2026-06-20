import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell/app-shell";
import { getSessionUser } from "@/lib/auth/session";

export default async function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <AppShell user={user}>{children}</AppShell>;
}
