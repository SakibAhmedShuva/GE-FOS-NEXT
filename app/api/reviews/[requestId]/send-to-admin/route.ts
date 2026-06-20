import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { sendReviewToAdmin } from "@/lib/services/review.service";

export async function POST(_request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const { requestId } = await params;
  try {
    const review = await sendReviewToAdmin(auth.user, requestId);
    return NextResponse.json({ request: review });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Send to admin failed" }, { status: 400 });
  }
}
