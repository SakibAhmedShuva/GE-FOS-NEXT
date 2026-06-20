import { z } from "zod";

const jsonRecord = z.record(z.unknown());

export const reviewRequestCreateSchema = z.object({
  projectId: z.string().nullable().optional(),
  requestType: z.string().min(1),
  itemCode: z.string().nullable().optional(),
  details: jsonRecord.nullable().optional(),
  remarks: z.string().nullable().optional(),
});

export const reviewRequestUpdateSchema = z.object({
  details: jsonRecord.nullable().optional(),
  remarks: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "PENDING"]).optional(),
});

export const adminReviewProcessSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  remarks: z.string().nullable().optional(),
});

export type ReviewRequestCreateInput = z.infer<typeof reviewRequestCreateSchema>;
