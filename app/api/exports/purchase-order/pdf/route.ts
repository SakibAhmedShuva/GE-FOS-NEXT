import { NextResponse } from "next/server";
import { getApiAdmin } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { buildPurchaseOrderDocumentModel } from "@/lib/document-generation/purchase-order-document";
import { generatePurchaseOrderPdfBuffer } from "@/lib/document-generation/purchase-order-pdf";
import { applyBusinessPdfAssets } from "@/lib/document-generation/pdf-assets";
import { getPurchaseOrderForAdmin } from "@/lib/services/purchase-order-project.service";
import { saveGeneratedFileToLocalStorage, safeOriginalFilename } from "@/lib/storage/local-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getApiAdmin();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => null) as { projectId?: string } | null;
  if (!body?.projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  const project = await getPurchaseOrderForAdmin(body.projectId, auth.user);
  if (!project) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
  const model = buildPurchaseOrderDocumentModel(project);
  const includeSignature = process.env.FOS_PO_INCLUDE_SIGNATURE === "true";
  const assetResult = await applyBusinessPdfAssets({ documentPdf: generatePurchaseOrderPdfBuffer(model), includeSignature });
  const buffer = assetResult.buffer;
  const stored = await saveGeneratedFileToLocalStorage({ folder: "exports/purchase-orders", filename: safeOriginalFilename(`${project.referenceNumber}.pdf`), bytes: buffer });
  const exportRecord = await prisma.export.create({ data: { projectId: project.id, exportType: "PDF", documentType: "PURCHASE_ORDER", filename: stored.originalFilename, storageKey: stored.storageKey, generatedByUserId: auth.user.id, metadata: { itemCount: model.items.length, originalOfferReference: model.originalOfferReference, pdfAssets: assetResult.applied, warnings: assetResult.warnings } } });
  await prisma.activityLog.create({ data: { actorUserId: auth.user.id, actorNameSnapshot: auth.user.name, action: "purchase_order_pdf_exported", entityType: "export", entityId: exportRecord.id, projectId: project.id, referenceNumber: project.referenceNumber, filePathOrStorageKey: exportRecord.storageKey, metadata: { originalOfferReference: model.originalOfferReference, pdfAssets: assetResult.applied, warnings: assetResult.warnings } } });
  return NextResponse.json({ export: exportRecord, downloadUrl: `/api/exports/${exportRecord.id}/download`, warnings: assetResult.warnings }, { status: 201 });
}
