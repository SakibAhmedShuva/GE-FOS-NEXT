import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

function uniqueSorted(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));
}

export async function GET() {
  const auth = await getApiUser();
  if (auth.response) return auth.response;

  const [productTypes, makes, approvals, models] = await Promise.all([
    prisma.catalogItem.findMany({ distinct: ["productType"], select: { productType: true }, orderBy: { productType: "asc" } }),
    prisma.catalogItem.findMany({ distinct: ["make"], select: { make: true }, orderBy: { make: "asc" } }),
    prisma.catalogItem.findMany({ distinct: ["approvals"], select: { approvals: true }, orderBy: { approvals: "asc" } }),
    prisma.catalogItem.findMany({ distinct: ["model"], select: { model: true }, orderBy: { model: "asc" } }),
  ]);

  return NextResponse.json({
    productTypes: uniqueSorted(productTypes.map((row: { productType: string | null }) => row.productType)),
    makes: uniqueSorted(makes.map((row: { make: string | null }) => row.make)),
    approvals: uniqueSorted(approvals.map((row: { approvals: string | null }) => row.approvals)),
    models: uniqueSorted(models.map((row: { model: string | null }) => row.model)),
  });
}
