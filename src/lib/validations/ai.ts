import { z } from "zod";

export const parseRequestInputSchema = z.object({
  description: z.string().trim().min(10).max(4000),
});

export const matchProfessionalsSchema = z.object({
  description: z.string().trim().min(10).max(4000),
  category: z.string().trim().min(1).max(120),
  budget: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
});

export const suggestPriceSchema = z.object({
  category: z.string().trim().min(1).max(120),
  area: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  scope: z.string().trim().min(10).max(4000),
  similarOffers: z
    .array(
      z.object({
        price: z.number().positive(),
        timeline: z.number().int().positive(),
      }),
    )
    .max(20)
    .optional(),
});

export const embedInputSchema = z.object({
  text: z.string().trim().min(1).max(8000),
});

export const moderateInputSchema = z.object({
  text: z.string().trim().min(1).max(8000),
});

export const analyzeImageSchema = z.object({
  imageUrl: z.string().url(),
  prompt: z.string().trim().min(5).max(2000),
  jsonMode: z.boolean().optional(),
});

export const translateSchema = z.object({
  text: z.string().trim().min(1).max(8000),
  from: z.enum(["bg", "en"]),
  to: z.enum(["bg", "en"]),
});

export const summarizeProjectSchema = z.object({
  title: z.string().trim().min(1).max(160),
  messages: z.array(
    z.object({
      text: z.string().trim().min(1).max(4000),
      createdAt: z.string(),
    }),
  ),
  milestones: z.array(
    z.object({
      title: z.string().trim().min(1).max(160),
      completed: z.boolean(),
    }),
  ),
});
