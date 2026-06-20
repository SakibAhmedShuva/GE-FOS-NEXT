import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const auth = await getApiUser();
  if (auth.response) return auth.response;

  const rows = await prisma.catalogItem.findMany({
    distinct: ["productType"],
    select: { productType: true },
    orderBy: { productType: "asc" },
  });

  return NextResponse.json({ sheetNames: rows.map((row: { productType: string | null }) => row.productType).filter(Boolean) });
}
