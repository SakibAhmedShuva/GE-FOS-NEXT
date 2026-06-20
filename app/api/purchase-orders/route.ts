import { NextResponse } from "next/server";
import { getApiAdmin } from "@/lib/api/auth";
import { savePurchaseOrder, serializePurchaseOrder } from "@/lib/services/purchase-order-project.service";
import { purchaseOrderSaveSchema } from "@/lib/validators/purchase-order-project";

export async function POST(request: Request) {
  const auth = await getApiAdmin(); if (auth.response) return auth.response;
  const parsed = purchaseOrderSaveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid purchase order payload", issues: parsed.error.flatten() }, { status: 400 });
  const project = await savePurchaseOrder({ user: auth.user, input: parsed.data });
  if (!project) return NextResponse.json({ error: "Purchase order save failed" }, { status: 500 });
  return NextResponse.json({ project: serializePurchaseOrder(project) }, { status: 201 });
}
