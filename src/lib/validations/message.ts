import { z } from "zod";

export const sendMessageSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  imageUrl: z.string().url().optional(),
});
