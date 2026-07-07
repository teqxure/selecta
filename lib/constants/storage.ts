/**
 * Shared between the server (validating presigned-URL requests) and the
 * browser (rejecting a bad file before ever requesting a presigned URL) —
 * plain constants only, safe to import from client components.
 */
export const ALLOWED_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

export const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

export const MAX_UPLOAD_SIZE_LABEL = "8MB";
