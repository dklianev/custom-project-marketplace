import { z } from "zod";

export const createReviewSchema = z.object({
  projectId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(20).max(2000),
  images: z.array(z.string().url()).max(5).optional(),
});

export const updateReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().trim().min(20).max(2000).optional(),
    images: z.array(z.string().url()).max(5).optional(),
  })
  .refine(
    (value) =>
      value.rating !== undefined ||
      value.comment !== undefined ||
      value.images !== undefined,
    {
      message: "Поне едно поле трябва да бъде подадено.",
    },
  );
