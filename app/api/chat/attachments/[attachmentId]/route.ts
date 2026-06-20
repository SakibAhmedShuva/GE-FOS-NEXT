import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { getStorageRoot } from "@/lib/storage/local-storage";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ attachmentId: string }> }) { const auth = await getApiUser(); if (auth.response) return auth.response; const { attachmentId } = await params; const attachment = await prisma.chatAttachment.findUnique({ where: { id: attachmentId }, include: { message: true } }); if (!attachment) return NextResponse.json({ error: "Attachment not found" }, { status: 404 }); const canDownload = attachment.uploadedByUserId === auth.user.id || attachment.message?.senderUserId === auth.user.id || attachment.message?.recipientUserId === auth.user.id; if (!canDownload) return NextResponse.json({ error: "Attachment access denied" }, { status: 403 }); const file = await readFile(path.join(getStorageRoot(), attachment.storageKey)); return new Response(file as BodyInit, { headers: { "Content-Type": attachment.mimeType || "application/octet-stream", "Content-Disposition": `attachment; filename="${attachment.originalFilename.replace(/"/g, "")}"` } }); }
