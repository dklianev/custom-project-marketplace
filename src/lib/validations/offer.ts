import { z } from "zod";

export const offerStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
]);

export const createOfferSchema = z.object({
  requestId: z.string().cuid(),
  price: z.number().positive(),
  timeline: z.number().int().positive(),
  scope: z.string().trim().min(20).max(5000),
  warranty: z.string().trim().max(200).optional(),
  revisions: z.string().trim().max(200).optional(),
  quote: z.string().trim().max(2000).optional(),
  featured: z.boolean().optional(),
  portfolioImages: z.array(z.string().url()).max(10).optional(),
  termsAccepted: z.literal(true),
});

export const updateOfferSchema = createOfferSchema
  .omit({
    requestId: true,
    termsAccepted: true,
  })
  .partial();
