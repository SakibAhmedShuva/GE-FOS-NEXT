import { prisma } from "@/lib/db/prisma";
import type { SessionUser } from "@/lib/auth/session";
import { sanitizeLegacyRichText, richTextToPlainText } from "@/lib/validators/sanitize-html";

function text(value: unknown) {
  if (value === null || value === undefined) return null;
  const out = String(value).trim();
  return out || null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function decimal(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? String(value) : undefined;
}

export async function createReviewRequest(user: SessionUser, input: { projectId?: string | null; requestType: string; itemCode?: string | null; details?: Record<string, unknown> | null; remarks?: string | null }) {
  const request = await prisma.reviewRequest.create({
    data: {
      userId: user.id,
      projectId: input.projectId || null,
      requestType: input.requestType,
      itemCode: text(input.itemCode),
      details: (input.details || {}) as never,
      remarks: text(input.remarks),
      status: "DRAFT",
      visibility: "USER",
    },
  });
  await prisma.activityLog.create({ data: { actorUserId: user.id, actorNameSnapshot: user.name, action: "review_request_created", entityType: "review_request", entityId: request.id, projectId: input.projectId || null, metadata: { requestType: input.requestType, itemCode: input.itemCode } } });
  return request;
}

export async function sendReviewToAdmin(user: SessionUser, requestId: string) {
  const existing = await prisma.reviewRequest.findFirst({ where: { id: requestId, userId: user.id } });
  if (!existing) throw new Error("Review request not found");
  const request = await prisma.reviewRequest.update({ where: { id: requestId }, data: { status: "PENDING", visibility: "ADMIN" } });
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  if (admins.length) {
    await prisma.notification.createMany({ data: admins.map((admin: { id: string }) => ({ userId: admin.id, type: "REVIEW" as const, title: "Review request pending", messageHtml: `${user.name} sent ${request.requestType} for admin review.`, actionUrl: "/admin/reviews", metadata: { reviewRequestId: request.id } })) });
  }
  await prisma.activityLog.create({ data: { actorUserId: user.id, actorNameSnapshot: user.name, action: "review_request_sent_to_admin", entityType: "review_request", entityId: request.id, projectId: request.projectId, metadata: { requestType: request.requestType, itemCode: request.itemCode } } });
  return request;
}

async function applyApprovedCatalogChange(request: any) {
  const details = record(request.details);
  const catalogItemId = text(details.catalogItemId);
  const itemCode = text(request.itemCode || details.itemCode);
  const where = catalogItemId ? { id: catalogItemId } : itemCode ? { itemCode } : null;
  if (!where) return { applied: false, reason: "No catalog item identifier" };

  const updateData: Record<string, unknown> = {};
  if (request.requestType === "DESCRIPTION_CHANGE" || details.descriptionHtml || details.descriptionPlain) {
    const html = sanitizeLegacyRichText(String(details.descriptionHtml || details.descriptionPlain || ""));
    if (html) { updateData.descriptionHtml = html; updateData.descriptionPlain = richTextToPlainText(html); }
  }
  const poPrice = decimal(details.poPrice);
  const offerPrice = decimal(details.offerPrice);
  const installationPrice = decimal(details.installationPrice);
  if (poPrice !== undefined) updateData.poPrice = poPrice;
  if (offerPrice !== undefined) updateData.offerPrice = offerPrice;
  if (installationPrice !== undefined) updateData.installationPrice = installationPrice;
  if (request.requestType === "REMOVE_ITEM") {
    updateData.metadata = { disabledByReviewRequestId: request.id, disabledAt: new Date().toISOString(), previousDetails: details };
    updateData.searchText = "__DISABLED__";
  }
  if (!Object.keys(updateData).length) return { applied: false, reason: "No supported catalog update fields" };
  const item = await prisma.catalogItem.updateMany({ where, data: updateData as never });
  return { applied: item.count > 0, count: item.count };
}

export async function processAdminReview(admin: SessionUser, requestId: string, input: { decision: "APPROVED" | "REJECTED"; remarks?: string | null }) {
  if (admin.role !== "ADMIN") throw new Error("Admin access required");
  const request = await prisma.reviewRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("Review request not found");
  const applyResult = input.decision === "APPROVED" ? await applyApprovedCatalogChange(request) : { applied: false };
  const updated = await prisma.reviewRequest.update({ where: { id: requestId }, data: { status: input.decision, visibility: "USER", remarks: text(input.remarks) ?? request.remarks, processedByUserId: admin.id, processedAt: new Date(), details: { ...record(request.details), adminApplyResult: applyResult } as never } });
  await prisma.notification.create({ data: { userId: request.userId, type: "REVIEW", title: `Review ${input.decision.toLowerCase()}`, messageHtml: `Your ${request.requestType} request was ${input.decision.toLowerCase()}.`, actionUrl: "/reviews", metadata: { reviewRequestId: request.id, decision: input.decision } } });
  await prisma.activityLog.create({ data: { actorUserId: admin.id, actorNameSnapshot: admin.name, action: input.decision === "APPROVED" ? "review_request_approved" : "review_request_rejected", entityType: "review_request", entityId: request.id, projectId: request.projectId, metadata: { requestType: request.requestType, itemCode: request.itemCode, applyResult } } });
  return updated;
}
