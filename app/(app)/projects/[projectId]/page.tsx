import { notFound, redirect } from "next/navigation";
import ProjectRoutePlaceholder from "@/components/projects/project-route-placeholder";
import { getSessionUser } from "@/lib/auth/session";
import { getProjectSummaryForUser } from "@/lib/services/project-read.service";

export default async function GenericProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { projectId } = await params;
  const project = await getProjectSummaryForUser(projectId, user);
  if (!project) notFound();
  return <ProjectRoutePlaceholder project={project} moduleName={`${project.projectType.replaceAll("_", " ")} Project`} />;
}
