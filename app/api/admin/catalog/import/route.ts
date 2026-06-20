import { NextResponse } from "next/server";
import { getApiAdmin } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { saveUploadToLocalStorage, safeOriginalFilename } from "@/lib/storage/local-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getApiAdmin();
  if (auth.response) return auth.response;
  const form = await request.formData();
  const file = form.get("file");
  const sourceType = String(form.get("sourceType") || "FOREIGN").toUpperCase();
  if (!(file instanceof File)) return NextResponse.json({ error: "File is required" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".xlsx")) return NextResponse.json({ error: "Only .xlsx price lists are accepted" }, { status: 400 });
  if (!["FOREIGN", "LOCAL"].includes(sourceType)) return NextResponse.json({ error: "sourceType must be FOREIGN or LOCAL" }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const stored = await saveUploadToLocalStorage({ folder: "imports/price-lists", filename: safeOriginalFilename(file.name), bytes });
  const record = await prisma.priceListImport.create({ data: { sourceType: sourceType as never, filename: stored.originalFilename, uploadedById: auth.user.id, status: "UPLOADED", rowCount: 0, errorCount: 0 } });
  await prisma.activityLog.create({ data: { actorUserId: auth.user.id, actorNameSnapshot: auth.user.name, action: "price_list_uploaded", entityType: "price_list_import", entityId: record.id, filePathOrStorageKey: stored.storageKey, metadata: { sourceType, filename: stored.originalFilename } } });
  return NextResponse.json({ import: record, storageKey: stored.storageKey }, { status: 201 });
}
