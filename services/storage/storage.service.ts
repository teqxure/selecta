import "server-only";
import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  ALLOWED_VIDEO_CONTENT_TYPES,
  MAX_VIDEO_SIZE_BYTES,
  ALLOWED_DOCUMENT_CONTENT_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
} from "@/lib/constants/storage";
import { ConflictError, ValidationError } from "@/lib/errors";

/**
 * Cloudflare R2 is S3-compatible, so the AWS SDK works as-is pointed at the
 * account's R2 endpoint. Two R2-specific requirements vs a generic S3
 * client: `region` must be the literal "auto" (R2 has no real regions),
 * and `forcePathStyle` must be true (R2 doesn't support virtual-hosted
 * style bucket addressing the way AWS S3 does).
 */
const endpoint = env.R2_ENDPOINT ?? (env.R2_ACCOUNT_ID ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

const client = new S3Client({
  region: "auto",
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

/**
 * Per-`kind` upload limits. Video gets a longer presign TTL than images —
 * a 30MB upload on a slow connection can genuinely take longer than the
 * 5 minutes that's plenty for an 8MB image, and an expired presigned URL
 * fails the upload with no useful error for the seller.
 */
const UPLOAD_LIMITS = {
  image: { allowedTypes: ALLOWED_IMAGE_CONTENT_TYPES as readonly string[], maxSizeBytes: MAX_UPLOAD_SIZE_BYTES, ttlSeconds: 60 * 5 },
  video: { allowedTypes: ALLOWED_VIDEO_CONTENT_TYPES as readonly string[], maxSizeBytes: MAX_VIDEO_SIZE_BYTES, ttlSeconds: 60 * 15 },
  document: { allowedTypes: ALLOWED_DOCUMENT_CONTENT_TYPES as readonly string[], maxSizeBytes: MAX_DOCUMENT_SIZE_BYTES, ttlSeconds: 60 * 10 },
} as const;

/**
 * Returns a presigned PUT URL so the browser can upload directly to
 * object storage — files never pass through our server. The public URL
 * is built from `R2_PUBLIC_URL` (a custom domain or the bucket's r2.dev
 * URL), never from the private S3 API endpoint, which doesn't serve
 * public reads.
 *
 * `sizeBytes` is signed as the request's `Content-Length` — R2 (like S3)
 * rejects a PUT whose actual Content-Length doesn't match what was signed,
 * so this is real server-side size enforcement, not just the client-side
 * check in the upload components (which a caller invoking this action
 * directly could otherwise skip entirely).
 */
export async function createUploadUrl(folder: string, contentType: string, sizeBytes: number, kind: "image" | "video" | "document" = "image") {
  const limits = UPLOAD_LIMITS[kind];

  if (!limits.allowedTypes.includes(contentType)) {
    throw new ValidationError(`Unsupported file type: ${contentType}`);
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > limits.maxSizeBytes) {
    throw new ValidationError(`File is too large — max size is ${(limits.maxSizeBytes / (1024 * 1024)).toFixed(0)}MB`);
  }
  if (!env.R2_PUBLIC_URL) {
    throw new ConflictError("Object storage public URL is not configured — set R2_PUBLIC_URL");
  }

  const key = `${folder}/${randomUUID()}`;

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ContentLength: sizeBytes,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: limits.ttlSeconds });
  const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;

  return { uploadUrl, publicUrl, key };
}

export async function deleteObject(key: string) {
  await client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
}
