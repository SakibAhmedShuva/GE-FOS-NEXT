import { randomUUID } from "node:crypto";
import type { SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { canAccessProject, canEditProject } from "@/lib/permissions/rbac";
import { richTextToPlainText, sanitizeLegacyRichText } from "@/lib/validators/sanitize-html";
import type { ChallanProjectSaveInput } from "@/lib/validators/challan-project";

function nullableText(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function decimalValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? String(value) : null;
}

function parseDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeItem(item: ChallanProjectSaveInput["items"][number], projectId: string, sortOrder: number) {
  const descriptionHtml = sanitizeLegacyRichText(item.descriptionHtml || item.descriptionPlain || "");
  return {
    id: randomUUID(),
    projectId,
    sortOrder,
    sourceType: item.sourceType,
    catalogItemId: item.catalogItemId || null,
    itemCode: nullableText(item.itemCode),
    productType: nullableText(item.productType),
    descriptionHtml,
    descriptionPlain: richTextToPlainText(descriptionHtml),
    qty: decimalValue(item.qty),
    unit: nullableText(item.unit),
    isCustom: item.sourceType === "CUSTOM" || !item.catalogItemId,
    metadata: (item.metadata ?? item) as never,
  };
}

export async function getNextChallanReference() {
  const sequence = await prisma.$transaction(async (tx: any) => tx.challanSequence.upsert({
    where: { key: "default" },
    update: { currentRef: { increment: 1 } },
    create: { id: randomUUID(), key: "default", currentRef: 1 },
  }));
  return `CH-${String(sequence.currentRef).padStart(4, "0")}`;
}

export async function getChallanProjectForUser(projectId: string, user: SessionUser) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      shares: { select: { sharedWithUserId: true, permission: true } },
      owner: { select: { id: true, name: true, email: true, signatureStorageKey: true } },
      challanLogs: { orderBy: { createdAt: "desc" }, take: 1, include: { preparedBy: { select: { id: true, name: true, email: true, signatureStorageKey: true } } } },
    },
  });
  if (!project || project.deletedAt || project.projectType !== "CHALLAN") return null;
  if (!canAccessProject(user, project)) return null;
  return project;
}

export function serializeChallanProject(project: NonNullable<Awaited<ReturnType<typeof getChallanProjectForUser>>>) {
  const metadata = (project.metadata || {}) as Record<string, unknown>;
  return {
    id: project.id,
    referenceNumber: project.referenceNumber,
    projectType: project.projectType,
    status: project.status,
    owner: project.owner,
    clientSnapshot: project.clientSnapshot,
    metadata,
    challanLog: project.challanLogs[0] || null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    items: project.items.map((item: any) => ({
      id: item.id,
      sourceType: item.sourceType,
      catalogItemId: item.catalogItemId,
      itemCode: item.itemCode,
      productType: item.productType,
      descriptionPlain: item.descriptionPlain,
      descriptionHtml: item.descriptionHtml,
      qty: item.qty?.toString() || "",
      unit: item.unit,
      metadata: item.metadata,
    })),
  };
}

export async function saveChallanProject({ user, projectId, input }: { user: SessionUser; projectId?: string; input: ChallanProjectSaveInput }) {
  const existing = projectId ? await prisma.project.findUnique({ where: { id: projectId }, include: { shares: { select: { sharedWithUserId: true, permission: true } } } }) : null;
  if (projectId && !existing) throw new Error("Challan not found");
  if (existing && (!canEditProject(user, existing) || existing.projectType !== "CHALLAN" || existing.deletedAt)) throw new Error("Challan edit denied");

  const id = existing?.id || randomUUID();
  const now = new Date();
  const metadata = {
    ...(input.metadata || {}),
    challan: {
      includeSignature: input.includeSignature,
      challanDate: input.challanDate || null,
      signedCopyReceived: input.signedCopyReceived || null,
      remarks: input.remarks || null,
      challanCarrier: input.challanCarrier || null,
    },
  };

  return prisma.$transaction(async (tx: any) => {
    const project = existing
      ? await tx.project.update({ where: { id }, data: { referenceNumber: input.referenceNumber, status: input.status, clientSnapshot: (input.clientSnapshot ?? undefined) as never, metadata: metadata as never, lastModifiedAt: now } })
      : await tx.project.create({ data: { id, referenceNumber: input.referenceNumber, projectType: "CHALLAN", status: input.status, ownerUserId: user.id, clientSnapshot: (input.clientSnapshot ?? undefined) as never, metadata: metadata as never, lastModifiedAt: now } });

    await tx.projectItem.deleteMany({ where: { projectId: id } });
    for (const [index, item] of input.items.entries()) {
      await tx.projectItem.create({ data: normalizeItem(item, id, index) });
    }

    await tx.challanLog.upsert({
      where: { id: (await tx.challanLog.findFirst({ where: { projectId: id }, select: { id: true } }))?.id || randomUUID() },
      update: {
        ref: input.referenceNumber,
        date: parseDate(input.challanDate),
        clientName: String((input.clientSnapshot as Record<string, unknown> | null | undefined)?.name || ""),
        description: input.items.map((item: any) => item.descriptionPlain || item.itemCode || "").filter(Boolean).join("; ").slice(0, 1000),
        signedCopyReceived: nullableText(input.signedCopyReceived),
        remarks: nullableText(input.remarks),
        challanCarrier: nullableText(input.challanCarrier),
        projectId: id,
      },
      create: {
        id: randomUUID(),
        ref: input.referenceNumber,
        date: parseDate(input.challanDate),
        clientName: String((input.clientSnapshot as Record<string, unknown> | null | undefined)?.name || ""),
        description: input.items.map((item: any) => item.descriptionPlain || item.itemCode || "").filter(Boolean).join("; ").slice(0, 1000),
        signedCopyReceived: nullableText(input.signedCopyReceived),
        remarks: nullableText(input.remarks),
        challanCarrier: nullableText(input.challanCarrier),
        preparedByUserId: user.id,
        projectId: id,
      },
    });

    await tx.activityLog.create({ data: { actorUserId: user.id, actorNameSnapshot: user.name, action: existing ? "challan_saved" : "challan_created", entityType: "project", entityId: id, projectId: id, referenceNumber: input.referenceNumber, metadata: { itemCount: input.items.length } } });

    return tx.project.findUnique({ where: { id: project.id }, include: { items: { orderBy: { sortOrder: "asc" } }, shares: { select: { sharedWithUserId: true, permission: true } }, owner: { select: { id: true, name: true, email: true, signatureStorageKey: true } }, challanLogs: { orderBy: { createdAt: "desc" }, take: 1, include: { preparedBy: { select: { id: true, name: true, email: true, signatureStorageKey: true } } } } } });
  });
}
