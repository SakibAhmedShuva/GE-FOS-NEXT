import { notFound, redirect } from "next/navigation";
import ChallanBuilderClient from "@/components/challan/challan-builder-client";
import { getSessionUser } from "@/lib/auth/session";
import { getChallanProjectForUser, serializeChallanProject } from "@/lib/services/challan-project.service";

export default async function EditChallanPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { projectId } = await params;
  const project = await getChallanProjectForUser(projectId, user);
  if (!project) notFound();
  return <ChallanBuilderClient initialProject={serializeChallanProject(project) as any} />;
}
