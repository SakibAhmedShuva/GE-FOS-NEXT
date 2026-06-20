import { NextResponse } from "next/server";
import { getApiAdmin } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST() {
  const auth = await getApiAdmin();
  if (auth.response) return auth.response;

  const items = await prisma.catalogItem.findMany({
    select: { id: true, descriptionPlain: true, itemCode: true, productType: true, make: true, approvals: true, model: true },
  });

  for (const item of items) {
    const searchText = [item.descriptionPlain, item.itemCode, item.productType, item.make, item.approvals, item.model]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    await prisma.catalogItem.update({ where: { id: item.id }, data: { searchText } });
  }

  await prisma.activityLog.create({
    data: {
      actorUserId: auth.user.id,
      actorNameSnapshot: auth.user.name,
      action: "catalog_reindexed",
      entityType: "catalog_item",
      metadata: { updatedCount: items.length, note: "Text search only; semantic embeddings are a later worker stage." },
    },
  });

  return NextResponse.json({ updatedCount: items.length });
}
