import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

  const covers = await prisma.cover.findMany({
    where: q
      ? {
          OR: [
            { filename: { contains: q, mode: "insensitive" } },
            { projectReference: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      filename: true,
      storageKey: true,
      thumbnailStorageKey: true,
      projectReference: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ covers });
}
