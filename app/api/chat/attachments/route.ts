import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { saveUploadToLocalStorage, safeOriginalFilename } from "@/lib/storage/local-storage";
export const runtime = "nodejs";
const MAX_SIZE = 10 * 1024 * 1024;
export async function POST(request: Request) { const auth = await getApiUser(); if (auth.response) return auth.response; const form = await request.formData(); const file = form.get("file"); if (!(file instanceof File)) return NextResponse.json({ error: "File is required" }, { status: 400 }); if (file.size > MAX_SIZE) return NextResponse.json({ error: "Max attachment size is 10MB" }, { status: 400 }); const bytes = Buffer.from(await file.arrayBuffer()); const stored = await saveUploadToLocalStorage({ folder: "chat-attachments", filename: safeOriginalFilename(file.name), bytes }); const record = await prisma.chatAttachment.create({ data: { storageKey: stored.storageKey, originalFilename: stored.originalFilename, mimeType: file.type || null, sizeBytes: file.size, uploadedByUserId: auth.user.id } }); return NextResponse.json({ attachment: record }, { status: 201 }); }
