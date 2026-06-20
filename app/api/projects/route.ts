import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

const createProjectSchema = z.object({
  referenceNumber: z.string().min(1),
  projectType: z.enum(["OFFER", "CHALLAN", "PURCHASE_ORDER", "AI_HELPER"]),
  clientSnapshot: z.unknown().optional(),
  legacyJson: z.unknown().optional(),
  metadata: z.unknown().optional(),
});

export async function GET(request: Request) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const user = auth.user;
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") || "mine";
  const q = searchParams.get("q")?.trim();

  const where: Record<string, unknown> = scope === "shared"
    ? { shares: { some: { sharedWithUserId: user.id } }, deletedAt: null }
    : { ownerUserId: user.id, deletedAt: null };

  const projects = await prisma.project.findMany({
    where: {
      ...where,
      ...(q ? { referenceNumber: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      referenceNumber: true,
      projectType: true,
      status: true,
      clientSnapshot: true,
      lastModifiedAt: true,
      updatedAt: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const user = auth.user;
  const parsed = createProjectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid project payload" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      referenceNumber: parsed.data.referenceNumber,
      projectType: parsed.data.projectType,
      ownerUserId: user.id,
      clientSnapshot: (parsed.data.clientSnapshot ?? undefined) as never,
      legacyJson: (parsed.data.legacyJson ?? undefined) as never,
      metadata: (parsed.data.metadata ?? undefined) as never,
      lastModifiedAt: new Date(),
    },
  });

  await prisma.activityLog.create({
    data: {
      actorUserId: user.id,
      actorNameSnapshot: user.name,
      action: "project_created",
      entityType: "project",
      entityId: project.id,
      projectId: project.id,
      referenceNumber: project.referenceNumber,
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
