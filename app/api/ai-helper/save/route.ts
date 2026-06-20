import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { saveAiHelperProject } from "@/lib/services/ai-helper.service";
export async function POST(request: Request) { const auth = await getApiUser(); if (auth.response) return auth.response; const body = await request.json().catch(() => null); if (!body) return NextResponse.json({ error: "Payload is required" }, { status: 400 }); const project = await saveAiHelperProject(auth.user, body); return NextResponse.json({ project }, { status: 201 }); }
