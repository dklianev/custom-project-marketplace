import { z } from "zod";

export const requestStatusSchema = z.enum([
  "DRAFT",
  "PENDING",
  "MATCHING",
  "OFFERS_RECEIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const urgencySchema = z.enum(["URGENT", "STANDARD", "PLANNED"]);

export const attachmentInputSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileUrl: z.string().url(),
  fileSize: z.string().max(50).optional(),
  fileType: z.string().max(120).optional(),
});

export const createRequestSchema = z.object({
  title: z.string().trim().min(3).max(140).optional(),
  description: z.string().trim().min(10).max(4000),
  category: z.string().trim().max(80).optional(),
  subCategory: z.string().trim().max(80).optional(),
  urgency: urgencySchema.optional(),
  area: z.string().trim().max(80).optional(),
  priorities: z.array(z.string().trim().min(1).max(80)).max(10).optional(),
  specificNotes: z.string().trim().max(2000).optional(),
  budget: z.string().trim().max(120).optional(),
  timeline: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  attachments: z.array(attachmentInputSchema).max(10).optional(),
});

export const updateRequestSchema = createRequestSchema.partial();

export const aiParseRequestSchema = z.object({
  description: z.string().trim().min(10).max(4000).optional(),
});
