import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { safeOriginalFilename, saveUploadToLocalStorage } from "@/lib/storage/local-storage";

export const runtime = "nodejs";

const MAX_COVER_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;

  const formData = await request.formData();
  const file = formData.get("file");
  const projectReference = String(formData.get("projectReference") || "").trim() || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
  }

  const filename = safeOriginalFilename(file.name);
  if (!filename.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) {
    return NextResponse.json({ error: "Only PDF covers are allowed" }, { status: 400 });
  }

  if (file.size > MAX_COVER_BYTES) {
    return NextResponse.json({ error: "Cover PDF is too large" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await saveUploadToLocalStorage({ folder: "covers", filename, bytes: buffer });

  const cover = await prisma.cover.create({
    data: {
      filename: stored.originalFilename,
      storageKey: stored.storageKey,
      uploadedByUserId: auth.user.id,
      projectReference,
    },
    select: {
      id: true,
      filename: true,
      storageKey: true,
      thumbnailStorageKey: true,
      projectReference: true,
      createdAt: true,
    },
  });

  await prisma.activityLog.create({
    data: {
      actorUserId: auth.user.id,
      actorNameSnapshot: auth.user.name,
      action: "cover_uploaded",
      entityType: "cover",
      entityId: cover.id,
      referenceNumber: projectReference,
      filePathOrStorageKey: cover.storageKey,
      metadata: { filename: cover.filename },
    },
  });

  return NextResponse.json({ cover }, { status: 201 });
}
