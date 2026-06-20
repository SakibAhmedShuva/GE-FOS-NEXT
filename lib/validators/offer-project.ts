import { z } from "zod";

const jsonRecord = z.record(z.unknown());

export const offerProjectItemSchema = z.object({
  sourceType: z.enum(["FOREIGN", "LOCAL", "CUSTOM"]).default("CUSTOM"),
  catalogItemId: z.string().nullable().optional(),
  itemCode: z.string().nullable().optional(),
  productType: z.string().nullable().optional(),
  make: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  approvals: z.string().nullable().optional(),
  descriptionHtml: z.string().nullable().optional(),
  descriptionPlain: z.string().nullable().optional(),
  qty: z.union([z.string(), z.number()]).nullable().optional(),
  unit: z.string().nullable().optional(),
  foreignPriceUsd: z.union([z.string(), z.number()]).nullable().optional(),
  foreignTotalUsd: z.union([z.string(), z.number()]).nullable().optional(),
  localSupplyPriceBdt: z.union([z.string(), z.number()]).nullable().optional(),
  localSupplyTotalBdt: z.union([z.string(), z.number()]).nullable().optional(),
  installationPriceBdt: z.union([z.string(), z.number()]).nullable().optional(),
  installationTotalBdt: z.union([z.string(), z.number()]).nullable().optional(),
  poPriceUsd: z.union([z.string(), z.number()]).nullable().optional(),
  poTotalUsd: z.union([z.string(), z.number()]).nullable().optional(),
  poPriceBdt: z.union([z.string(), z.number()]).nullable().optional(),
  isCustom: z.boolean().default(false),
  metadata: jsonRecord.nullable().optional(),
});

export const offerProjectSaveSchema = z.object({
  referenceNumber: z.string().min(1),
  status: z.enum(["PENDING", "DELIVERED", "ARCHIVED"]).default("PENDING"),
  clientSnapshot: jsonRecord.nullable().optional(),
  items: z.array(offerProjectItemSchema).default([]),
  financials: jsonRecord.nullable().optional(),
  financialLabels: jsonRecord.nullable().optional(),
  visibleColumns: z.record(z.boolean()).nullable().optional(),
  selectedCoverId: z.string().nullable().optional(),
  isSummaryPageEnabled: z.boolean().default(false),
  summaryScopeDescriptions: jsonRecord.nullable().optional(),
  tncState: jsonRecord.nullable().optional(),
  includeSignature: z.boolean().default(false),
  metadata: jsonRecord.nullable().optional(),
});

export type OfferProjectSaveInput = z.infer<typeof offerProjectSaveSchema>;
