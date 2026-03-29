import { z } from "zod";

export const createPaymentSessionSchema = z.object({
  offerId: z.string().cuid(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});
