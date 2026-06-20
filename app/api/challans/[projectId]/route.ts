import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { getChallanProjectForUser, saveChallanProject, serializeChallanProject } from "@/lib/services/challan-project.service";
import { challanProjectSaveSchema } from "@/lib/validators/challan-project";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const { projectId } = await params;
  const project = await getChallanProjectForUser(projectId, auth.user);
  if (!project) return NextResponse.json({ error: "Challan not found" }, { status: 404 });
  return NextResponse.json({ project: serializeChallanProject(project) });
}

export async function PUT(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const { projectId } = await params;
  const parsed = challanProjectSaveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid challan payload", issues: parsed.error.flatten() }, { status: 400 });
  try {
    const project = await saveChallanProject({ user: auth.user, projectId, input: parsed.data });
    if (!project) return NextResponse.json({ error: "Challan save failed" }, { status: 500 });
    return NextResponse.json({ project: serializeChallanProject(project) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Challan save failed" }, { status: 403 });
  }
}
