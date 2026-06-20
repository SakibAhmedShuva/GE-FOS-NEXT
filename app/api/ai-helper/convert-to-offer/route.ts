import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { convertAiRowsToOffer } from "@/lib/services/ai-helper.service";
export async function POST(request: Request) { const auth = await getApiUser(); if (auth.response) return auth.response; const body = await request.json().catch(() => null) as { rows?: Array<any> } | null; if (!body?.rows?.length) return NextResponse.json({ error: "Selected rows are required" }, { status: 400 }); const project = await convertAiRowsToOffer(auth.user, body as never); return NextResponse.json({ project }, { status: 201 }); }
