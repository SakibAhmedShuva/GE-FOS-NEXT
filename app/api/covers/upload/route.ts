import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { saveUploadToLocalStorage } from "@/lib/storage/local-storage";

export const runtime = "nodejs";
const MAX_COVER_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;

  const form = await request.formData();
  const file = form.get("file");
  const projectReference = String(form.get("projectReference") || "").trim() || null;

  if (!(file instanceof File)) return NextResponse.json({ error: "Cover PDF is required" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".pdf") || file.type && file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF covers are accepted" }, { status: 400 });
  }
  if (file.size > MAX_COVER_BYTES) return NextResponse.json({ error: "Cover PDF must be 25 MB or smaller" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const stored = await saveUploadToLocalStorage({ folder: "covers", filename: file.name, bytes });
  const cover = await prisma.cover.create({
    data: {
      filename: stored.originalFilename,
      storageKey: stored.storageKey,
      uploadedByUserId: auth.user.id,
      projectReference,
    },
  });

  await prisma.activityLog.create({
    data: {
      actorUserId: auth.user.id,
      actorNameSnapshot: auth.user.name,
      action: "cover_uploaded",
      entityType: "cover",
      entityId: cover.id,
      filePathOrStorageKey: stored.storageKey,
      metadata: { filename: stored.originalFilename, projectReference },
    },
  });

  return NextResponse.json({ cover }, { status: 201 });
}
