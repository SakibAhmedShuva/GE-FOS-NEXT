import { randomUUID } from "node:crypto";
import type { SessionUser } from "@/lib/auth/session";
import { calculateOfferItemTotals } from "@/lib/calculations/offer";
import { prisma } from "@/lib/db/prisma";
import { canAccessProject, canEditProject } from "@/lib/permissions/rbac";
import { richTextToPlainText, sanitizeLegacyRichText } from "@/lib/validators/sanitize-html";
import type { OfferProjectSaveInput } from "@/lib/validators/offer-project";

type LoadedOfferProject = Awaited<ReturnType<typeof getOfferProjectForUser>>;

function nullableText(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function decimalValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? normalized : null;
}

function decimalToString(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "toString" in value && typeof value.toString === "function") {
    return value.toString();
  }
  return String(value);
}

function jsonValue<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  return value as T;
}

function normalizeItem(item: OfferProjectSaveInput["items"][number], projectId: string, sortOrder: number) {
  const descriptionHtml = sanitizeLegacyRichText(item.descriptionHtml || item.descriptionPlain || "");
  const totals = calculateOfferItemTotals({
    qty: item.qty,
    foreign_price_usd: item.foreignPriceUsd,
    foreign_total_usd: item.foreignTotalUsd,
    local_supply_price_bdt: item.localSupplyPriceBdt,
    local_supply_total_bdt: item.localSupplyTotalBdt,
    installation_price_bdt: item.installationPriceBdt,
    installation_total_bdt: item.installationTotalBdt,
    po_price_usd: item.poPriceUsd,
    po_total_usd: item.poTotalUsd,
  });

  return {
    id: randomUUID(),
    projectId,
    sortOrder,
    sourceType: item.sourceType,
    catalogItemId: item.catalogItemId || null,
    itemCode: nullableText(item.itemCode),
    productType: nullableText(item.productType),
    make: nullableText(item.make),
    model: nullableText(item.model),
    approvals: nullableText(item.approvals),
    descriptionHtml,
    descriptionPlain: richTextToPlainText(descriptionHtml),
    qty: decimalValue(item.qty),
    unit: nullableText(item.unit),
    foreignPriceUsd: decimalValue(item.foreignPriceUsd),
    foreignTotalUsd: totals.foreignTotalUsd.toFixed(2),
    localSupplyPriceBdt: decimalValue(item.localSupplyPriceBdt),
    localSupplyTotalBdt: totals.localSupplyTotalBdt.toFixed(2),
    installationPriceBdt: decimalValue(item.installationPriceBdt),
    installationTotalBdt: totals.installationTotalBdt.toFixed(2),
    poPriceUsd: decimalValue(item.poPriceUsd),
    poTotalUsd: totals.poTotalUsd.toFixed(2),
    poPriceBdt: decimalValue(item.poPriceBdt),
    isCustom: item.isCustom || item.sourceType === "CUSTOM",
    metadata: (item.metadata ?? item) as never,
  };
}

export async function getOfferProjectForUser(projectId: string, user: SessionUser) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      offerSetting: true,
      shares: { select: { sharedWithUserId: true, permission: true } },
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  if (!project || project.deletedAt || project.projectType !== "OFFER") return null;
  if (!canAccessProject(user, project)) return null;
  return project;
}

export function serializeOfferProject(project: NonNullable<LoadedOfferProject>) {
  return {
    id: project.id,
    referenceNumber: project.referenceNumber,
    projectType: project.projectType,
    status: project.status,
    owner: project.owner,
    clientSnapshot: project.clientSnapshot,
    legacyProjectId: project.legacyProjectId,
    legacyJson: project.legacyJson,
    metadata: project.metadata,
    lastModifiedAt: project.lastModifiedAt?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    items: project.items.map((item: any) => ({
      id: item.id,
      sortOrder: item.sortOrder,
      sourceType: item.sourceType,
      catalogItemId: item.catalogItemId,
      itemCode: item.itemCode,
      productType: item.productType,
      make: item.make,
      model: item.model,
      approvals: item.approvals,
      descriptionHtml: item.descriptionHtml,
      descriptionPlain: item.descriptionPlain,
      qty: decimalToString(item.qty),
      unit: item.unit,
      foreignPriceUsd: decimalToString(item.foreignPriceUsd),
      foreignTotalUsd: decimalToString(item.foreignTotalUsd),
      localSupplyPriceBdt: decimalToString(item.localSupplyPriceBdt),
      localSupplyTotalBdt: decimalToString(item.localSupplyTotalBdt),
      installationPriceBdt: decimalToString(item.installationPriceBdt),
      installationTotalBdt: decimalToString(item.installationTotalBdt),
      poPriceUsd: decimalToString(item.poPriceUsd),
      poTotalUsd: decimalToString(item.poTotalUsd),
      poPriceBdt: decimalToString(item.poPriceBdt),
      isCustom: item.isCustom,
      metadata: item.metadata,
    })),
    offerSetting: project.offerSetting
      ? {
          financials: jsonValue(project.offerSetting.financials, {}),
          financialLabels: jsonValue(project.offerSetting.financialLabels, {}),
          visibleColumns: jsonValue(project.offerSetting.visibleColumns, {}),
          selectedCoverId: project.offerSetting.selectedCoverId,
          isSummaryPageEnabled: project.offerSetting.isSummaryPageEnabled,
          summaryScopeDescriptions: jsonValue(project.offerSetting.summaryScopeDescriptions, {}),
          tncState: jsonValue(project.offerSetting.tncState, {}),
          includeSignature: project.offerSetting.includeSignature,
        }
      : null,
  };
}

export async function saveOfferProject({
  user,
  projectId,
  input,
}: {
  user: SessionUser;
  projectId?: string;
  input: OfferProjectSaveInput;
}) {
  const existing = projectId
    ? await prisma.project.findUnique({
        where: { id: projectId },
        include: { shares: { select: { sharedWithUserId: true, permission: true } } },
      })
    : null;

  if (projectId && !existing) {
    throw new Error("Offer not found");
  }

  if (existing && (!canEditProject(user, existing) || existing.projectType !== "OFFER" || existing.deletedAt)) {
    throw new Error("Offer edit denied");
  }

  const now = new Date();
  const id = existing?.id || randomUUID();

  return prisma.$transaction(async (tx: any) => {
    const project = existing
      ? await tx.project.update({
          where: { id },
          data: {
            referenceNumber: input.referenceNumber,
            status: input.status,
            clientSnapshot: (input.clientSnapshot ?? undefined) as never,
            metadata: (input.metadata ?? undefined) as never,
            lastModifiedAt: now,
          },
        })
      : await tx.project.create({
          data: {
            id,
            legacyProjectId: null,
            referenceNumber: input.referenceNumber,
            projectType: "OFFER",
            status: input.status,
            ownerUserId: user.id,
            clientSnapshot: (input.clientSnapshot ?? undefined) as never,
            metadata: (input.metadata ?? undefined) as never,
            lastModifiedAt: now,
          },
        });

    await tx.projectItem.deleteMany({ where: { projectId: id } });

    for (const [index, item] of input.items.entries()) {
      await tx.projectItem.create({ data: normalizeItem(item, id, index) });
    }

    await tx.offerSetting.upsert({
      where: { projectId: id },
      update: {
        financials: (input.financials ?? undefined) as never,
        financialLabels: (input.financialLabels ?? undefined) as never,
        visibleColumns: (input.visibleColumns ?? undefined) as never,
        selectedCoverId: input.selectedCoverId || null,
        isSummaryPageEnabled: input.isSummaryPageEnabled,
        summaryScopeDescriptions: (input.summaryScopeDescriptions ?? undefined) as never,
        tncState: (input.tncState ?? undefined) as never,
        includeSignature: input.includeSignature,
      },
      create: {
        projectId: id,
        financials: (input.financials ?? undefined) as never,
        financialLabels: (input.financialLabels ?? undefined) as never,
        visibleColumns: (input.visibleColumns ?? undefined) as never,
        selectedCoverId: input.selectedCoverId || null,
        isSummaryPageEnabled: input.isSummaryPageEnabled,
        summaryScopeDescriptions: (input.summaryScopeDescriptions ?? undefined) as never,
        tncState: (input.tncState ?? undefined) as never,
        includeSignature: input.includeSignature,
      },
    });

    await tx.activityLog.create({
      data: {
        actorUserId: user.id,
        actorNameSnapshot: user.name,
        action: existing ? "offer_saved" : "offer_created",
        entityType: "project",
        entityId: id,
        projectId: id,
        referenceNumber: input.referenceNumber,
        metadata: { itemCount: input.items.length },
      },
    });

    return tx.project.findUnique({
      where: { id: project.id },
      include: { items: { orderBy: { sortOrder: "asc" } }, offerSetting: true, shares: { select: { sharedWithUserId: true, permission: true } }, owner: { select: { id: true, name: true, email: true } } },
    });
  });
}
