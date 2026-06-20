import { NextResponse } from "next/server";
import { getApiAdmin } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const auth = await getApiAdmin();
  if (auth.response) return auth.response;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 100), 500);

  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      actorNameSnapshot: true,
      action: true,
      entityType: true,
      entityId: true,
      referenceNumber: true,
      filePathOrStorageKey: true,
      metadata: true,
      createdAt: true,
      actor: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ logs });
}
