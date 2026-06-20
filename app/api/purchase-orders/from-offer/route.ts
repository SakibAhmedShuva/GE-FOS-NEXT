import { NextResponse } from "next/server";
import { getApiAdmin } from "@/lib/api/auth";
import { createPurchaseOrderFromOffer, serializePurchaseOrder } from "@/lib/services/purchase-order-project.service";

export async function POST(request: Request) {
  const auth = await getApiAdmin(); if (auth.response) return auth.response;
  const body = await request.json().catch(() => null) as { offerProjectId?: string } | null;
  if (!body?.offerProjectId) return NextResponse.json({ error: "offerProjectId is required" }, { status: 400 });
  try { const project = await createPurchaseOrderFromOffer({ user: auth.user, offerProjectId: body.offerProjectId }); if (!project) return NextResponse.json({ error: "Purchase order create failed" }, { status: 500 }); return NextResponse.json({ project: serializePurchaseOrder(project) }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Purchase order create failed" }, { status: 403 }); }
}
