import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { canAccessProject } from "@/lib/permissions/rbac";
import { InvalidStoragePathError, resolveStoragePath } from "@/lib/storage/local-storage";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  PDF: "application/pdf",
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function safeDownloadName(filename: string) {
  return String(filename || "download.bin").replace(/["\r\n]/g, "");
}

export async function GET(_request: Request, { params }: { params: Promise<{ exportId: string }> }) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;

  const { exportId } = await params;
  const exportRecord = await prisma.export.findUnique({
    where: { id: exportId },
    include: {
      project: {
        include: { shares: { select: { sharedWithUserId: true, permission: true } } },
      },
    },
  });

  if (!exportRecord || exportRecord.project.deletedAt) {
    return NextResponse.json({ error: "Export not found" }, { status: 404 });
  }
  if (!canAccessProject(auth.user, exportRecord.project)) {
    return NextResponse.json({ error: "Export access denied" }, { status: 403 });
  }

  let fullPath: string;
  try {
    fullPath = resolveStoragePath(exportRecord.storageKey);
  } catch (error) {
    if (error instanceof InvalidStoragePathError) {
      return NextResponse.json({ error: "Invalid export storage path" }, { status: 403 });
    }
    return NextResponse.json({ error: "Export path error" }, { status: 500 });
  }

  let file: Buffer;
  try {
    file = await readFile(fullPath);
  } catch {
    return NextResponse.json({ error: "Export file missing" }, { status: 404 });
  }

  const contentType = CONTENT_TYPES[exportRecord.exportType] || "application/octet-stream";
  return new Response(file as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${safeDownloadName(exportRecord.filename)}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
