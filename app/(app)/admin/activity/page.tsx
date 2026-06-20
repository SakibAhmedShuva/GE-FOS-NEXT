import { redirect } from "next/navigation";
import ActivityLogClient from "@/components/admin/activity-log-client";
import { getSessionUser } from "@/lib/auth/session";

export default async function AdminActivityPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return <ActivityLogClient />;
}
