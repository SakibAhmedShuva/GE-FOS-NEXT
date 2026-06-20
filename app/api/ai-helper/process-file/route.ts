import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { processAiHelperWorkbook } from "@/lib/services/ai-helper.service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const auth = await getApiUser(); if (auth.response) return auth.response;
  const form = await request.formData(); const file = form.get("file"); const source = String(form.get("source") || "both");
  if (!(file instanceof File)) return NextResponse.json({ error: "Spreadsheet file is required" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".xlsx")) return NextResponse.json({ error: "Only .xlsx files are supported in this stage" }, { status: 400 });
  try { return NextResponse.json(await processAiHelperWorkbook(file, source)); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "File processing failed" }, { status: 400 }); }
}
