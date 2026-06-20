import { NextResponse } from "next/server";
import { getApiAdmin } from "@/lib/api/auth";
import { importCatalogWorkbook } from "@/lib/services/catalog-import.service";

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

  try {
    const result = await importCatalogWorkbook({ file, sourceType: sourceType as "FOREIGN" | "LOCAL", uploadedById: auth.user.id });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Catalog import failed" }, { status: 400 });
  }
}
