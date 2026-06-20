import type { SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { canAccessProject } from "@/lib/permissions/rbac";

export async function getProjectSummaryForUser(projectId: string, user: SessionUser) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      shares: { select: { sharedWithUserId: true, permission: true } },
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { items: true, exports: true, activityLogs: true } },
    },
  });

  if (!project || project.deletedAt) return null;
  if (!canAccessProject(user, project)) return null;

  return {
    id: project.id,
    referenceNumber: project.referenceNumber,
    projectType: project.projectType,
    status: project.status,
    owner: project.owner,
    clientSnapshot: project.clientSnapshot as Record<string, unknown> | null,
    lastModifiedAt: project.lastModifiedAt?.toISOString() ?? null,
    updatedAt: project.updatedAt.toISOString(),
    counts: project._count,
  };
}
