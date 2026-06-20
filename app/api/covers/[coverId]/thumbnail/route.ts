import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { InvalidStoragePathError, resolveStoragePath } from "@/lib/storage/local-storage";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ coverId: string }> }) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;

  const { coverId } = await params;
  const cover = await prisma.cover.findUnique({ where: { id: coverId } });
  if (!cover || !cover.thumbnailStorageKey) return NextResponse.json({ error: "Cover thumbnail not found" }, { status: 404 });

  let fullPath: string;
  try {
    fullPath = resolveStoragePath(cover.thumbnailStorageKey);
  } catch (error) {
    if (error instanceof InvalidStoragePathError) return NextResponse.json({ error: "Invalid thumbnail storage path" }, { status: 403 });
    return NextResponse.json({ error: "Thumbnail path error" }, { status: 500 });
  }

  try {
    const file = await readFile(fullPath);
    return new Response(file as BodyInit, { headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=300" } });
  } catch {
    return NextResponse.json({ error: "Cover thumbnail file missing" }, { status: 404 });
  }
}
