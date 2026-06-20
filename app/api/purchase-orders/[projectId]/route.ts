import { NextResponse } from "next/server";
import { getApiAdmin } from "@/lib/api/auth";
import { getPurchaseOrderForAdmin, savePurchaseOrder, serializePurchaseOrder } from "@/lib/services/purchase-order-project.service";
import { purchaseOrderSaveSchema } from "@/lib/validators/purchase-order-project";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await getApiAdmin(); if (auth.response) return auth.response;
  const { projectId } = await params; const project = await getPurchaseOrderForAdmin(projectId, auth.user);
  if (!project) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
  return NextResponse.json({ project: serializePurchaseOrder(project) });
}
export async function PUT(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await getApiAdmin(); if (auth.response) return auth.response;
  const { projectId } = await params; const parsed = purchaseOrderSaveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid purchase order payload", issues: parsed.error.flatten() }, { status: 400 });
  try { const project = await savePurchaseOrder({ user: auth.user, projectId, input: parsed.data }); if (!project) return NextResponse.json({ error: "Purchase order save failed" }, { status: 500 }); return NextResponse.json({ project: serializePurchaseOrder(project) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Purchase order save failed" }, { status: 403 }); }
}
