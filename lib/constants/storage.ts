/**
 * Shared between the server (validating presigned-URL requests) and the
 * browser (rejecting a bad file before ever requesting a presigned URL) —
 * plain constants only, safe to import from client components.
 */
export const ALLOWED_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

export const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

export const MAX_UPLOAD_SIZE_LABEL = "8MB";

/** "video/quicktime" matters — iPhones export .mov natively. */
export const ALLOWED_VIDEO_CONTENT_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;

export const MAX_VIDEO_SIZE_BYTES = 30 * 1024 * 1024; // 30MB — a useful 15-25s phone clip

export const MAX_VIDEO_SIZE_LABEL = "30MB";

/** Compliance-document uploads (business registration, ID scans, etc.) — PDF or a photo of the document. */
export const ALLOWED_DOCUMENT_CONTENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;

export const MAX_DOCUMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15MB — comfortably covers a scanned multi-page PDF

export const MAX_DOCUMENT_SIZE_LABEL = "15MB";
