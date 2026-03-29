import { z } from "zod";
import { STORAGE_BUCKETS } from "@/lib/storage";

export const presignUploadSchema = z.object({
  bucket: z.enum([
    STORAGE_BUCKETS.avatars,
    STORAGE_BUCKETS.portfolios,
    STORAGE_BUCKETS.documents,
    STORAGE_BUCKETS.attachments,
    STORAGE_BUCKETS.reviews,
    STORAGE_BUCKETS.chat,
  ]),
  fileName: z.string().trim().min(1).max(255),
  fileType: z.string().trim().min(1).max(120),
  fileSizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
});
