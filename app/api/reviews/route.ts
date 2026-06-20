import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { createReviewRequest } from "@/lib/services/review.service";
import { reviewRequestCreateSchema } from "@/lib/validators/review-request";

export async function GET() {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const requests = await prisma.reviewRequest.findMany({ where: { userId: auth.user.id }, orderBy: { updatedAt: "desc" }, take: 100, include: { project: { select: { id: true, referenceNumber: true, projectType: true } } } });
  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const parsed = reviewRequestCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid review payload", issues: parsed.error.flatten() }, { status: 400 });
  const review = await createReviewRequest(auth.user, parsed.data);
  return NextResponse.json({ request: review }, { status: 201 });
}
