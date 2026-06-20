import { redirect } from "next/navigation";
import ProjectListClient from "@/components/projects/project-list-client";
import { getSessionUser } from "@/lib/auth/session";

export default async function AdminProjectsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return <ProjectListClient scope="admin" />;
}
