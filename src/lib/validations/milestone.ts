import { z } from "zod";

export const createMilestoneSchema = z.object({
  title: z.string().trim().min(3).max(160),
  order: z.number().int().min(1).max(1000).optional(),
});

export const updateMilestoneSchema = z
  .object({
    title: z.string().trim().min(3).max(160).optional(),
    order: z.number().int().min(1).max(1000).optional(),
    completed: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.order !== undefined ||
      value.completed !== undefined,
    {
      message: "Поне едно поле трябва да бъде подадено.",
    },
  );
