export const STORAGE_BUCKETS = {
  avatars: "avatars",
  portfolios: "portfolios",
  documents: "documents",
  attachments: "attachments",
  reviews: "reviews",
  chat: "chat",
} as const;

export type StorageBucket =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024;

const publicBuckets = new Set<StorageBucket>([
  STORAGE_BUCKETS.avatars,
  STORAGE_BUCKETS.portfolios,
  STORAGE_BUCKETS.reviews,
]);

const imageBuckets = new Set<StorageBucket>([
  STORAGE_BUCKETS.avatars,
  STORAGE_BUCKETS.portfolios,
  STORAGE_BUCKETS.reviews,
  STORAGE_BUCKETS.chat,
]);

const documentBuckets = new Set<StorageBucket>([
  STORAGE_BUCKETS.documents,
  STORAGE_BUCKETS.attachments,
]);

const allowedMimeMatchers: Record<StorageBucket, RegExp[]> = {
  avatars: [/^image\/(png|jpeg|jpg|webp|gif)$/],
  portfolios: [/^image\/(png|jpeg|jpg|webp|gif)$/],
  documents: [
    /^application\/pdf$/,
    /^image\/(png|jpeg|jpg|webp)$/,
  ],
  attachments: [
    /^application\/pdf$/,
    /^image\/(png|jpeg|jpg|webp)$/,
    /^application\/zip$/,
  ],
  reviews: [/^image\/(png|jpeg|jpg|webp|gif)$/],
  chat: [/^image\/(png|jpeg|jpg|webp|gif)$/],
};

export function isPublicBucket(bucket: StorageBucket): boolean {
  return publicBuckets.has(bucket);
}

export function getMaxUploadSizeBytes(bucket: StorageBucket) {
  return imageBuckets.has(bucket)
    ? MAX_IMAGE_UPLOAD_BYTES
    : documentBuckets.has(bucket)
      ? MAX_DOCUMENT_UPLOAD_BYTES
      : MAX_DOCUMENT_UPLOAD_BYTES;
}

export function isMimeTypeAllowed(bucket: StorageBucket, fileType: string) {
  return allowedMimeMatchers[bucket].some((pattern) => pattern.test(fileType));
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${bytes} B`;
}

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

export function buildStoragePath(
  bucket: StorageBucket,
  userId: string,
  fileName: string,
): string {
  const safeName = sanitizeFileName(fileName);
  const stamp = Date.now();
  return `${bucket}/${userId}/${stamp}-${safeName}`;
}
