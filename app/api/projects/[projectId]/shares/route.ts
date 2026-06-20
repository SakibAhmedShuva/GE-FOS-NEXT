import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { canEditProject } from "@/lib/permissions/rbac";

const shareSchema = z.object({ email: z.string().email(), permission: z.enum(["VIEW", "EDIT"]).default("VIEW") });

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { shares: { include: { sharedWith: { select: { id: true, name: true, email: true } } } } } });
  if (!project || project.deletedAt) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!canEditProject(auth.user, project)) return NextResponse.json({ error: "Share list denied" }, { status: 403 });
  return NextResponse.json({ shares: project.shares });
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const parsed = shareSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid share payload" }, { status: 400 });
  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { shares: { select: { sharedWithUserId: true, permission: true } } } });
  if (!project || project.deletedAt) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!canEditProject(auth.user, project)) return NextResponse.json({ error: "Project share denied" }, { status: 403 });
  const recipient = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!recipient || !recipient.isActive) return NextResponse.json({ error: "Active user not found for that email" }, { status: 404 });
  if (recipient.id === project.ownerUserId) return NextResponse.json({ error: "Project owner already has access" }, { status: 400 });
  const share = await prisma.projectShare.upsert({ where: { projectId_sharedWithUserId: { projectId, sharedWithUserId: recipient.id } }, update: { permission: parsed.data.permission }, create: { projectId, ownerUserId: project.ownerUserId, sharedWithUserId: recipient.id, permission: parsed.data.permission } });
  await prisma.notification.create({ data: { userId: recipient.id, type: "PROJECT_SHARE", title: "Project shared", messageHtml: `${auth.user.name} shared project ${project.referenceNumber} with ${parsed.data.permission.toLowerCase()} permission.`, actionUrl: `/projects/${projectId}`, metadata: { projectId, permission: parsed.data.permission } } });
  await prisma.activityLog.create({ data: { actorUserId: auth.user.id, actorNameSnapshot: auth.user.name, action: "project_shared", entityType: "project_share", entityId: share.id, projectId, referenceNumber: project.referenceNumber, metadata: { sharedWith: recipient.email, permission: parsed.data.permission } } });
  return NextResponse.json({ share }, { status: 201 });
}
