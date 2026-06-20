import { z } from "zod";
const jsonRecord = z.record(z.unknown());
export const purchaseOrderItemSchema = z.object({
  sourceType: z.enum(["FOREIGN", "LOCAL", "CUSTOM"]).default("CUSTOM"),
  catalogItemId: z.string().nullable().optional(), itemCode: z.string().nullable().optional(), productType: z.string().nullable().optional(), make: z.string().nullable().optional(), model: z.string().nullable().optional(), approvals: z.string().nullable().optional(), descriptionPlain: z.string().nullable().optional(), descriptionHtml: z.string().nullable().optional(), qty: z.union([z.string(), z.number()]).nullable().optional(), unit: z.string().nullable().optional(), poPriceUsd: z.union([z.string(), z.number()]).nullable().optional(), poPriceBdt: z.union([z.string(), z.number()]).nullable().optional(), metadata: jsonRecord.nullable().optional(),
});
export const purchaseOrderSaveSchema = z.object({
  referenceNumber: z.string().min(1), status: z.enum(["PENDING", "DELIVERED", "ARCHIVED"]).default("PENDING"), clientSnapshot: jsonRecord.nullable().optional(), originalOfferProjectId: z.string().nullable().optional(), originalOfferReference: z.string().nullable().optional(), terms: z.string().nullable().optional(), items: z.array(purchaseOrderItemSchema).default([]), metadata: jsonRecord.nullable().optional(),
});
export type PurchaseOrderSaveInput = z.infer<typeof purchaseOrderSaveSchema>;
