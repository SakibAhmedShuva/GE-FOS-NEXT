import { NextResponse } from "next/server";
import { getApiAdmin } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST() {
  const auth = await getApiAdmin();
  if (auth.response) return auth.response;

  const candidates = await prisma.catalogItem.findMany({
    where: {
      OR: [{ installationPrice: null }, { installationPrice: 0 }],
      offerPrice: { not: null },
    },
    select: { id: true, offerPrice: true },
    take: 5000,
  });

  for (const item of candidates) {
    if (!item.offerPrice) continue;
    await prisma.catalogItem.update({
      where: { id: item.id },
      data: { installationPrice: Number(item.offerPrice) * 0.1 },
    });
  }

  await prisma.activityLog.create({
    data: {
      actorUserId: auth.user.id,
      actorNameSnapshot: auth.user.name,
      action: "catalog_installation_autofilled",
      entityType: "catalog_item",
      metadata: { updatedCount: candidates.length, rule: "installationPrice = offerPrice * 10%" },
    },
  });

  return NextResponse.json({ updatedCount: candidates.length });
}
