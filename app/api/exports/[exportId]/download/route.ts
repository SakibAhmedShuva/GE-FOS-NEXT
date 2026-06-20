import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { canAccessProject } from "@/lib/permissions/rbac";
import { resolveStoragePath } from "@/lib/storage/local-storage";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  PDF: "application/pdf",
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(_request: Request, { params }: { params: Promise<{ exportId: string }> }) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const { exportId } = await params;
  const exportRecord = await prisma.export.findUnique({ where: { id: exportId }, include: { project: { include: { shares: { select: { sharedWithUserId: true, permission: true } } } } } });
  if (!exportRecord || exportRecord.project.deletedAt) return NextResponse.json({ error: "Export not found" }, { status: 404 });
  if (!canAccessProject(auth.user, exportRecord.project)) return NextResponse.json({ error: "Export access denied" }, { status: 403 });
  let file: Buffer;
  try { file = await readFile(resolveStoragePath(exportRecord.storageKey)); } catch { return NextResponse.json({ error: "Export file missing" }, { status: 404 }); }
  const contentType = CONTENT_TYPES[exportRecord.exportType] || "application/octet-stream";
  return new Response(file as BodyInit, { headers: { "Content-Type": contentType, "Content-Disposition": `attachment; filename="${exportRecord.filename.replace(/"/g, "")}"`, "Cache-Control": "private, max-age=0, must-revalidate" } });
}
