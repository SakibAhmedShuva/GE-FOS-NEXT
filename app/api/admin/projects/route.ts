import { NextResponse } from "next/server";
import { getApiAdmin } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const auth = await getApiAdmin();
  if (auth.response) return auth.response;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const projects = await prisma.project.findMany({
    where: { deletedAt: null, ...(q ? { referenceNumber: { contains: q, mode: "insensitive" } } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 250,
    select: { id: true, referenceNumber: true, projectType: true, status: true, clientSnapshot: true, updatedAt: true, lastModifiedAt: true, owner: { select: { id: true, name: true, email: true } }, _count: { select: { shares: true, exports: true, items: true } } },
  });
  return NextResponse.json({ projects });
}
