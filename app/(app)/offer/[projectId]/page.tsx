import { notFound, redirect } from "next/navigation";
import OfferCalculatorClient from "@/components/offer/offer-calculator-client";
import { getSessionUser } from "@/lib/auth/session";
import { getOfferProjectForUser, serializeOfferProject } from "@/lib/services/offer-project.service";

export default async function EditOfferPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { projectId } = await params;
  const project = await getOfferProjectForUser(projectId, user);
  if (!project) notFound();

  return <OfferCalculatorClient initialProject={serializeOfferProject(project) as any} />;
}
