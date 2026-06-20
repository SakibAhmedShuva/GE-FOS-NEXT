import { prisma } from "@/lib/db/prisma";
import type { OfferConfig } from "@/lib/calculations/offer";

const DEFAULT_OFFER_CONFIG: OfferConfig = {
  bdt_conversion_rate: 125,
  customs_duty_percentage: 16,
};

function numberSetting(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  if (value && typeof value === "object" && "value" in value) {
    return numberSetting((value as { value: unknown }).value, fallback);
  }
  return fallback;
}

export async function getOfferConfig(): Promise<OfferConfig> {
  const settings = await prisma.appSetting.findMany({
    where: { key: { in: ["offer.bdt_conversion_rate", "offer.customs_duty_percentage"] } },
  });

  const byKey = new Map(settings.map((setting) => [setting.key, setting.value]));
  return {
    bdt_conversion_rate: numberSetting(byKey.get("offer.bdt_conversion_rate"), DEFAULT_OFFER_CONFIG.bdt_conversion_rate),
    customs_duty_percentage: numberSetting(byKey.get("offer.customs_duty_percentage"), DEFAULT_OFFER_CONFIG.customs_duty_percentage),
  };
}

export async function upsertOfferConfig(config: Partial<OfferConfig>) {
  const writes = [];
  if (config.bdt_conversion_rate !== undefined) {
    writes.push(prisma.appSetting.upsert({
      where: { key: "offer.bdt_conversion_rate" },
      update: { value: { value: config.bdt_conversion_rate } },
      create: { key: "offer.bdt_conversion_rate", value: { value: config.bdt_conversion_rate } },
    }));
  }
  if (config.customs_duty_percentage !== undefined) {
    writes.push(prisma.appSetting.upsert({
      where: { key: "offer.customs_duty_percentage" },
      update: { value: { value: config.customs_duty_percentage } },
      create: { key: "offer.customs_duty_percentage", value: { value: config.customs_duty_percentage } },
    }));
  }
  await Promise.all(writes);
  return getOfferConfig();
}
