import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { buildChallanDocumentModel } from "@/lib/document-generation/challan-document";
import { generateChallanPdfBuffer } from "@/lib/document-generation/challan-pdf";
import { applyBusinessPdfAssets } from "@/lib/document-generation/pdf-assets";
import { prisma } from "@/lib/db/prisma";
import { getChallanProjectForUser } from "@/lib/services/challan-project.service";
import { saveGeneratedFileToLocalStorage, safeOriginalFilename } from "@/lib/storage/local-storage";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const auth = await getApiUser(); if (auth.response) return auth.response;
  const body = await request.json().catch(() => null) as { projectId?: string } | null;
  if (!body?.projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  const project = await getChallanProjectForUser(body.projectId, auth.user);
  if (!project) return NextResponse.json({ error: "Challan not found" }, { status: 404 });
  const model = buildChallanDocumentModel(project);
  const assetResult = await applyBusinessPdfAssets({ documentPdf: generateChallanPdfBuffer(model), includeSignature: model.includeSignature });
  const buffer = assetResult.buffer;
  const stored = await saveGeneratedFileToLocalStorage({ folder: "exports/challans", filename: safeOriginalFilename(`${project.referenceNumber}.pdf`), bytes: buffer });
  const exportRecord = await prisma.export.create({ data: { projectId: project.id, exportType: "PDF", documentType: "CHALLAN", filename: stored.originalFilename, storageKey: stored.storageKey, generatedByUserId: auth.user.id, metadata: { itemCount: model.items.length, pdfAssets: assetResult.applied, warnings: assetResult.warnings } } });
  await prisma.activityLog.create({ data: { actorUserId: auth.user.id, actorNameSnapshot: auth.user.name, action: "challan_pdf_exported", entityType: "export", entityId: exportRecord.id, projectId: project.id, referenceNumber: project.referenceNumber, filePathOrStorageKey: exportRecord.storageKey, metadata: { pdfAssets: assetResult.applied, warnings: assetResult.warnings } } });
  return NextResponse.json({ export: exportRecord, downloadUrl: `/api/exports/${exportRecord.id}/download`, warnings: assetResult.warnings }, { status: 201 });
}
