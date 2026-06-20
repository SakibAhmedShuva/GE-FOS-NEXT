import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/api/auth";
import { calculateOfferTotals } from "@/lib/calculations/offer";
import { getOfferConfig } from "@/lib/settings/offer-config";

const payloadSchema = z.object({
  items: z.array(z.record(z.unknown())).default([]),
  financials: z.record(z.unknown()).optional(),
  visibleColumns: z.record(z.boolean()).optional(),
  config: z.object({
    bdt_conversion_rate: z.number().positive().optional(),
    customs_duty_percentage: z.number().min(0).optional(),
  }).optional(),
});

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid calculation payload" }, { status: 400 });

  const settingsConfig = await getOfferConfig();
  const result = calculateOfferTotals({
    items: parsed.data.items as never,
    financials: parsed.data.financials as never,
    visibleColumns: parsed.data.visibleColumns as never,
    config: { ...settingsConfig, ...(parsed.data.config || {}) },
  });

  return NextResponse.json({ ...result, config: { ...settingsConfig, ...(parsed.data.config || {}) } });
}
