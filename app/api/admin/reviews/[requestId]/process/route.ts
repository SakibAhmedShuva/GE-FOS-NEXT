import { NextResponse } from "next/server";
import { getApiAdmin } from "@/lib/api/auth";
import { processAdminReview } from "@/lib/services/review.service";
import { adminReviewProcessSchema } from "@/lib/validators/review-request";

export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const auth = await getApiAdmin();
  if (auth.response) return auth.response;
  const parsed = adminReviewProcessSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid admin review payload" }, { status: 400 });
  const { requestId } = await params;
  try {
    const review = await processAdminReview(auth.user, requestId, parsed.data);
    return NextResponse.json({ request: review });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Review processing failed" }, { status: 400 });
  }
}
