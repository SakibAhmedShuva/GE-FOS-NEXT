import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { getOfferProjectForUser, saveOfferProject, serializeOfferProject } from "@/lib/services/offer-project.service";
import { offerProjectSaveSchema } from "@/lib/validators/offer-project";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const { projectId } = await params;
  const project = await getOfferProjectForUser(projectId, auth.user);

  if (!project) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  return NextResponse.json({ project: serializeOfferProject(project) });
}

export async function PUT(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const { projectId } = await params;
  const parsed = offerProjectSaveSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid offer payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const project = await saveOfferProject({ user: auth.user, projectId, input: parsed.data });
    if (!project) return NextResponse.json({ error: "Offer save failed" }, { status: 500 });
    return NextResponse.json({ project: serializeOfferProject(project) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Offer save failed" }, { status: 403 });
  }
}
