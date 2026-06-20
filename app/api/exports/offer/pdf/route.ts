import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { buildOfferDocumentModel } from "@/lib/document-generation/offer-document";
import { generateOfferPdfBuffer } from "@/lib/document-generation/offer-pdf";
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
  const buffer = generateOfferPdfBuffer(model);
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
        note: "Foundation PDF; final old-layout parity/cover merge still requires visual pass.",
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
      metadata: { filename: exportRecord.filename, itemCount: model.items.length },
    },
  });

  return NextResponse.json({ export: exportRecord, downloadUrl: `/api/exports/${exportRecord.id}/download` }, { status: 201 });
}
