import { requireAuth } from "@/lib/auth";
import { AppError, created, handleRouteError, parseRequestBody } from "@/lib/http";
import {
  buildStoragePath,
  formatBytes,
  getMaxUploadSizeBytes,
  isMimeTypeAllowed,
  isPublicBucket,
} from "@/lib/storage";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { presignUploadSchema } from "@/lib/validations/upload";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    const body = await parseRequestBody(request, presignUploadSchema);
    const supabase = createServiceRoleClient();

    if (!isMimeTypeAllowed(body.bucket, body.fileType)) {
      throw new AppError(400, "Неподдържан файлов формат за избраната категория.");
    }

    const maxSizeBytes = getMaxUploadSizeBytes(body.bucket);
    if (body.fileSizeBytes > maxSizeBytes) {
      throw new AppError(
        400,
        `Файлът е твърде голям. Максималният размер е ${formatBytes(maxSizeBytes)}.`,
      );
    }

    const path = buildStoragePath(body.bucket, auth.profile.id, body.fileName);

    const { data, error } = await supabase.storage
      .from(body.bucket)
      .createSignedUploadUrl(path);

    if (error || !data) {
      throw new AppError(
        400,
        error?.message ?? "Не успяхме да подготвим защитен URL за качване.",
      );
    }

    const publicUrl = isPublicBucket(body.bucket)
      ? supabase.storage.from(body.bucket).getPublicUrl(path).data.publicUrl
      : null;

    return created({
      bucket: body.bucket,
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl,
      fileType: body.fileType,
      fileSizeBytes: body.fileSizeBytes,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
