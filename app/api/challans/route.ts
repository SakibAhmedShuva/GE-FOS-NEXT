import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { saveChallanProject, serializeChallanProject } from "@/lib/services/challan-project.service";
import { challanProjectSaveSchema } from "@/lib/validators/challan-project";

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const parsed = challanProjectSaveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid challan payload", issues: parsed.error.flatten() }, { status: 400 });
  const project = await saveChallanProject({ user: auth.user, input: parsed.data });
  if (!project) return NextResponse.json({ error: "Challan save failed" }, { status: 500 });
  return NextResponse.json({ project: serializeChallanProject(project) }, { status: 201 });
}
