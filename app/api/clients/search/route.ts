import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const user = auth.user;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const limit = Math.min(Number(searchParams.get("limit") || 25), 50);

  const clients = await prisma.client.findMany({
    where: q
      ? {
          OR: [
            { clientName: { contains: q, mode: "insensitive" } },
            { clientAddress: { contains: q, mode: "insensitive" } },
            { searchText: { contains: q.toLowerCase() } },
          ],
        }
      : undefined,
    orderBy: { clientName: "asc" },
    take: limit,
    select: { id: true, clientName: true, clientAddress: true },
  });

  return NextResponse.json({ user: { id: user.id }, clients });
}
