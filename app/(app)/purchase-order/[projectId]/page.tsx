import { notFound, redirect } from "next/navigation";
import PurchaseOrderBuilderClient from "@/components/purchase-order/purchase-order-builder-client";
import { getSessionUser } from "@/lib/auth/session";
import { getPurchaseOrderForAdmin, serializePurchaseOrder } from "@/lib/services/purchase-order-project.service";

export default async function PurchaseOrderProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  const { projectId } = await params;
  const project = await getPurchaseOrderForAdmin(projectId, user);
  if (!project) notFound();
  return <PurchaseOrderBuilderClient initialProject={serializePurchaseOrder(project)} />;
}
