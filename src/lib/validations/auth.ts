import { z } from "zod";

export const roleSchema = z.enum(["CLIENT", "PROFESSIONAL"]);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: roleSchema,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  avatarUrl: z.string().url().optional(),
  phone: z.string().trim().min(6).max(30).optional(),
  bio: z.string().trim().max(500).optional(),
  location: z.string().trim().max(120).optional(),
  skills: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  experience: z.number().int().min(0).max(60).optional(),
  certificates: z.array(z.string().trim().min(1).max(500)).max(10).optional(),
  portfolioImages: z.array(z.string().url()).max(20).optional(),
});
