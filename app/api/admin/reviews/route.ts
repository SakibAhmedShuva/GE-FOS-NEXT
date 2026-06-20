import { NextResponse } from "next/server";
import { getApiAdmin } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const auth = await getApiAdmin();
  if (auth.response) return auth.response;
  const requests = await prisma.reviewRequest.findMany({ where: { visibility: "ADMIN" }, orderBy: { updatedAt: "desc" }, take: 150, include: { user: { select: { id: true, name: true, email: true } }, project: { select: { id: true, referenceNumber: true, projectType: true } } } });
  return NextResponse.json({ requests });
}
