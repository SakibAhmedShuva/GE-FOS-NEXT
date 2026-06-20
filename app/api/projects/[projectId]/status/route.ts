import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { canEditProject } from "@/lib/permissions/rbac";

const schema = z.object({ status: z.enum(["PENDING", "DELIVERED", "ARCHIVED"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid status payload" }, { status: 400 });
  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { shares: { select: { sharedWithUserId: true, permission: true } } } });
  if (!project || project.deletedAt) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!canEditProject(auth.user, project)) return NextResponse.json({ error: "Status update denied" }, { status: 403 });
  const updated = await prisma.project.update({ where: { id: projectId }, data: { status: parsed.data.status, lastModifiedAt: new Date() } });
  await prisma.activityLog.create({ data: { actorUserId: auth.user.id, actorNameSnapshot: auth.user.name, action: "project_status_updated", entityType: "project", entityId: projectId, projectId, referenceNumber: updated.referenceNumber, metadata: { previousStatus: project.status, status: updated.status } } });
  return NextResponse.json({ project: updated });
}
