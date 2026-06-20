import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { InvalidStoragePathError, resolveStoragePath } from "@/lib/storage/local-storage";

export const runtime = "nodejs";

function safeDownloadName(filename: string) {
  return String(filename || "attachment.bin").replace(/["\r\n]/g, "");
}

export async function GET(_request: Request, { params }: { params: Promise<{ attachmentId: string }> }) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;

  const { attachmentId } = await params;
  const attachment = await prisma.chatAttachment.findUnique({
    where: { id: attachmentId },
    include: { message: true },
  });

  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  const canDownload =
    attachment.uploadedByUserId === auth.user.id ||
    attachment.message?.senderUserId === auth.user.id ||
    attachment.message?.recipientUserId === auth.user.id;

  if (!canDownload) {
    return NextResponse.json({ error: "Attachment access denied" }, { status: 403 });
  }

  let fullPath: string;
  try {
    fullPath = resolveStoragePath(attachment.storageKey);
  } catch (error) {
    if (error instanceof InvalidStoragePathError) {
      return NextResponse.json({ error: "Invalid attachment storage path" }, { status: 403 });
    }
    return NextResponse.json({ error: "Attachment path error" }, { status: 500 });
  }

  let file: Buffer;
  try {
    file = await readFile(fullPath);
  } catch {
    return NextResponse.json({ error: "Attachment file missing" }, { status: 404 });
  }

  return new Response(file as BodyInit, {
    headers: {
      "Content-Type": attachment.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeDownloadName(attachment.originalFilename)}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
