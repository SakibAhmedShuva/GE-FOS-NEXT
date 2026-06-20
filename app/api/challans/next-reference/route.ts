import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { getNextChallanReference } from "@/lib/services/challan-project.service";

export async function POST() {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const referenceNumber = await getNextChallanReference();
  return NextResponse.json({ referenceNumber });
}
