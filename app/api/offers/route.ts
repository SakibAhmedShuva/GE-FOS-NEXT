import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { saveOfferProject, serializeOfferProject } from "@/lib/services/offer-project.service";
import { offerProjectSaveSchema } from "@/lib/validators/offer-project";

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;

  const parsed = offerProjectSaveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid offer payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const project = await saveOfferProject({ user: auth.user, input: parsed.data });
  if (!project) return NextResponse.json({ error: "Offer save failed" }, { status: 500 });

  return NextResponse.json({ project: serializeOfferProject(project) }, { status: 201 });
}
