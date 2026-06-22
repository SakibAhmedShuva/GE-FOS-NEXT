import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { buildOfferDocumentModel } from "@/lib/document-generation/offer-document";
import { generateOfferPdfBuffer } from "@/lib/document-generation/offer-pdf";
import { prependCoverPdf } from "@/lib/document-generation/pdf-postprocess";
import { applyBusinessPdfAssets } from "@/lib/document-generation/pdf-assets";
import { pdfSignatureMetadata, resolvePdfSignatureSource } from "@/lib/document-generation/signature-source";
import { prisma } from "@/lib/db/prisma";
import { getOfferConfig } from "@/lib/settings/offer-config";
import { getOfferProjectForUser } from "@/lib/services/offer-project.service";
import { saveGeneratedFileToLocalStorage, safeOriginalFilename } from "@/lib/storage/local-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => null) as { projectId?: string } | null;
  const projectId = body?.projectId;
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  const project = await getOfferProjectForUser(projectId, auth.user);
  if (!project) return NextResponse.json({ error: "Offer not found" }, { status: 404 });

  const offerConfig = await getOfferConfig();
  const model = buildOfferDocumentModel(project, offerConfig);
  const baseBuffer = generateOfferPdfBuffer(model);
  const signatureSource = resolvePdfSignatureSource({
    includeSignature: model.settings.includeSignature,
    candidates: [
      { type: "owner", userId: project.owner?.id, storageKey: project.owner?.signatureStorageKey },
      { type: "exporter", userId: auth.user.id, storageKey: auth.user.signatureStorageKey },
    ],
  });
  const assetResult = await applyBusinessPdfAssets({ documentPdf: baseBuffer, includeSignature: signatureSource.signatureRequested, signatureStorageKey: signatureSource.signatureStorageKey, documentType: "offer" });
  const signatureMetadata = pdfSignatureMetadata(signatureSource, assetResult.applied.signature);
  const coverStorageKey = project.offerSetting?.selectedCover?.storageKey || null;
  const coverMerge = await prependCoverPdf({ coverStorageKey, documentPdf: assetResult.buffer });
  const warnings = [
    ...assetResult.warnings,
    ...(coverStorageKey && !coverMerge.merged ? [`Selected cover could not be merged: ${coverMerge.reason || "unknown error"}`] : []),
  ];
  const buffer = coverMerge.buffer;
  const filename = safeOriginalFilename(`${project.referenceNumber || "offer"}.pdf`);
  const stored = await saveGeneratedFileToLocalStorage({ folder: "exports/offers", filename, bytes: buffer });

  const exportRecord = await prisma.export.create({
    data: {
      projectId: project.id,
      exportType: "PDF",
      documentType: "OFFER",
      filename: stored.originalFilename,
      storageKey: stored.storageKey,
      generatedByUserId: auth.user.id,
      metadata: {
        itemCount: model.items.length,
        generatedAt: model.generatedAt,
        coverMerged: coverMerge.merged,
        coverMergeReason: coverMerge.reason,
        pdfAssets: assetResult.applied,
        ...signatureMetadata,
        warnings,
        note: "Foundation PDF; final old-layout visual parity still requires golden visual pass.",
      },
    },
  });

  await prisma.activityLog.create({
    data: {
      actorUserId: auth.user.id,
      actorNameSnapshot: auth.user.name,
      action: "offer_pdf_exported",
      entityType: "export",
      entityId: exportRecord.id,
      projectId: project.id,
      referenceNumber: project.referenceNumber,
      filePathOrStorageKey: exportRecord.storageKey,
      metadata: { filename: exportRecord.filename, itemCount: model.items.length, coverMerged: coverMerge.merged, coverMergeReason: coverMerge.reason, pdfAssets: assetResult.applied, ...signatureMetadata, warnings },
    },
  });

  return NextResponse.json({ export: exportRecord, downloadUrl: `/api/exports/${exportRecord.id}/download`, warnings }, { status: 201 });
}
