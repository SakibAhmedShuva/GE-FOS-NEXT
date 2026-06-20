import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { saveAiHelperProject } from "@/lib/services/ai-helper.service";

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Payload is required" }, { status: 400 });
  try {
    const project = await saveAiHelperProject(auth.user, body);
    return NextResponse.json({ project }, { status: body.projectId ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI helper save failed";
    const status = message.includes("access denied") ? 403 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
