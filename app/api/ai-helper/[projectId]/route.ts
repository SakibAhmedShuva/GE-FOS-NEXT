import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { canAccessProject } from "@/lib/permissions/rbac";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { shares: { select: { sharedWithUserId: true, permission: true } }, owner: { select: { id: true, name: true, email: true } } } });
  if (!project || project.deletedAt || project.projectType !== "AI_HELPER") return NextResponse.json({ error: "AI helper project not found" }, { status: 404 });
  if (!canAccessProject(auth.user, project)) return NextResponse.json({ error: "AI helper access denied" }, { status: 403 });
  return NextResponse.json({ project: { id: project.id, referenceNumber: project.referenceNumber, owner: project.owner, metadata: project.metadata, legacyJson: project.legacyJson, updatedAt: project.updatedAt } });
}
