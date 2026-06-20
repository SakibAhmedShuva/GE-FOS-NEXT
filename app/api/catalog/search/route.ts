import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

function splitQuery(raw: string) {
  const tokens = raw.split(/\s+/).map((token) => token.trim()).filter(Boolean);
  return {
    include: tokens.filter((token) => !token.startsWith("-")),
    exclude: tokens.filter((token) => token.startsWith("-")).map((token) => token.slice(1)).filter(Boolean),
  };
}

function sourceFilter(value: string | null) {
  if (value === "foreign") return "FOREIGN";
  if (value === "local") return "LOCAL";
  if (value === "custom") return "CUSTOM";
  return undefined;
}

export async function GET(request: Request) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const { include, exclude } = splitQuery(q);
  const limit = Math.min(Number(searchParams.get("limit") || 25), 100);
  const sourceType = sourceFilter(searchParams.get("source"));
  const productType = searchParams.get("productType")?.trim();
  const make = searchParams.get("make")?.trim();
  const approvals = searchParams.get("approvals")?.trim();
  const model = searchParams.get("model")?.trim();

  const items = await prisma.catalogItem.findMany({
    where: {
      ...(sourceType ? { sourceType: sourceType as never } : {}),
      ...(productType ? { productType: { contains: productType, mode: "insensitive" } } : {}),
      ...(make ? { make: { contains: make, mode: "insensitive" } } : {}),
      ...(approvals ? { approvals: { contains: approvals, mode: "insensitive" } } : {}),
      ...(model ? { model: { contains: model, mode: "insensitive" } } : {}),
      AND: [
        ...include.map((term) => ({ searchText: { contains: term.toLowerCase() } })),
        ...exclude.map((term) => ({ NOT: { searchText: { contains: term.toLowerCase() } } })),
      ],
    },
    orderBy: [{ productType: "asc" }, { itemCode: "asc" }],
    take: limit,
    select: {
      id: true,
      sourceType: true,
      productType: true,
      itemCode: true,
      make: true,
      approvals: true,
      model: true,
      descriptionHtml: true,
      descriptionPlain: true,
      poPrice: true,
      offerPrice: true,
      installationPrice: true,
      unit: true,
    },
  });

  return NextResponse.json({ items, query: { include, exclude } });
}
