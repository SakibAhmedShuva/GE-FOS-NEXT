import { z } from "zod";

const jsonRecord = z.record(z.unknown());

export const challanProjectItemSchema = z.object({
  sourceType: z.enum(["FOREIGN", "LOCAL", "CUSTOM"]).default("CUSTOM"),
  catalogItemId: z.string().nullable().optional(),
  itemCode: z.string().nullable().optional(),
  productType: z.string().nullable().optional(),
  descriptionPlain: z.string().nullable().optional(),
  descriptionHtml: z.string().nullable().optional(),
  qty: z.union([z.string(), z.number()]).nullable().optional(),
  unit: z.string().nullable().optional(),
  metadata: jsonRecord.nullable().optional(),
});

export const challanProjectSaveSchema = z.object({
  referenceNumber: z.string().min(1),
  status: z.enum(["PENDING", "DELIVERED", "ARCHIVED"]).default("PENDING"),
  clientSnapshot: jsonRecord.nullable().optional(),
  items: z.array(challanProjectItemSchema).default([]),
  includeSignature: z.boolean().default(false),
  challanDate: z.string().nullable().optional(),
  signedCopyReceived: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  challanCarrier: z.string().nullable().optional(),
  metadata: jsonRecord.nullable().optional(),
});

export type ChallanProjectSaveInput = z.infer<typeof challanProjectSaveSchema>;
