import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { canAccessProject, canDeleteProject } from "@/lib/permissions/rbac";
import { prisma } from "@/lib/db/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const user = auth.user;
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      offerSetting: true,
      shares: { select: { sharedWithUserId: true, permission: true } },
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  if (!project || project.deletedAt) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!canAccessProject(user, project)) {
    return NextResponse.json({ error: "Project access denied" }, { status: 403 });
  }

  return NextResponse.json({ project });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const user = auth.user;
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { shares: { select: { sharedWithUserId: true, permission: true } } },
  });

  if (!project || project.deletedAt) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!canDeleteProject(user, project)) {
    return NextResponse.json({ error: "Project delete denied" }, { status: 403 });
  }

  await prisma.project.update({ where: { id: projectId }, data: { deletedAt: new Date() } });
  await prisma.activityLog.create({
    data: {
      actorUserId: user.id,
      actorNameSnapshot: user.name,
      action: "project_deleted",
      entityType: "project",
      entityId: project.id,
      projectId: project.id,
      referenceNumber: project.referenceNumber,
    },
  });

  return NextResponse.json({ ok: true });
}
