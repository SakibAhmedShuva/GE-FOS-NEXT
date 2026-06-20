import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { reviewRequestUpdateSchema } from "@/lib/validators/review-request";

export async function PATCH(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const parsed = reviewRequestUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid review update payload" }, { status: 400 });
  const { requestId } = await params;
  const existing = await prisma.reviewRequest.findFirst({ where: { id: requestId, userId: auth.user.id } });
  if (!existing) return NextResponse.json({ error: "Review request not found" }, { status: 404 });
  if (existing.visibility === "ADMIN") return NextResponse.json({ error: "Request is already with admin" }, { status: 400 });
  const updated = await prisma.reviewRequest.update({ where: { id: requestId }, data: { ...parsed.data, details: (parsed.data.details ?? undefined) as never } });
  return NextResponse.json({ request: updated });
}
