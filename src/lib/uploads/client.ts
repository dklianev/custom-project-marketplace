"use client";

import { createOptionalClient } from "@/lib/supabase/client";
import type { StorageBucket } from "@/lib/storage";

type ErrorResponse = {
  error?: string;
};

type PresignResponse = {
  path?: string;
  token?: string;
  publicUrl?: string | null;
  error?: string;
};

async function readJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json()) as T;
}

export async function uploadFileWithPresign(
  bucket: StorageBucket,
  file: File,
  options?: { fileName?: string },
) {
  const supabase = createOptionalClient();
  if (!supabase) {
    throw new Error("Липсва клиентска Supabase конфигурация за upload.");
  }

  const response = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bucket,
      fileName: options?.fileName ?? file.name,
      fileType: file.type || "application/octet-stream",
      fileSizeBytes: file.size,
    }),
  });
  const payload = await readJson<PresignResponse & ErrorResponse>(response);

  if (!response.ok || !payload?.path || !payload.token) {
    throw new Error(payload?.error ?? "Не успяхме да подготвим upload-а.");
  }

  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(payload.path, payload.token, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    path: payload.path,
    publicUrl: payload.publicUrl ?? null,
  };
}
