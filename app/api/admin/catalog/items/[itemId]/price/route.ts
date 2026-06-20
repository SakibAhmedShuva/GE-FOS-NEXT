import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

const payloadSchema = z.object({
  poPrice: z.number().nonnegative().optional(),
  offerPrice: z.number().nonnegative().optional(),
  installationPrice: z.number().nonnegative().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const auth = await getApiAdmin();
  if (auth.response) return auth.response;
  const { itemId } = await params;
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid catalog price payload" }, { status: 400 });

  const before = await prisma.catalogItem.findUnique({ where: { id: itemId } });
  if (!before) return NextResponse.json({ error: "Catalog item not found" }, { status: 404 });

  const item = await prisma.catalogItem.update({
    where: { id: itemId },
    data: {
      ...(parsed.data.poPrice !== undefined ? { poPrice: parsed.data.poPrice } : {}),
      ...(parsed.data.offerPrice !== undefined ? { offerPrice: parsed.data.offerPrice } : {}),
      ...(parsed.data.installationPrice !== undefined ? { installationPrice: parsed.data.installationPrice } : {}),
    },
  });

  await prisma.activityLog.create({
    data: {
      actorUserId: auth.user.id,
      actorNameSnapshot: auth.user.name,
      action: "catalog_price_updated",
      entityType: "catalog_item",
      entityId: item.id,
      metadata: { before, after: item },
    },
  });

  return NextResponse.json({ item });
}
