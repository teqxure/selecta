import "server-only";
import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import { ALLOWED_IMAGE_CONTENT_TYPES } from "@/lib/constants/storage";
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

const UPLOAD_URL_TTL_SECONDS = 60 * 5;

/**
 * Returns a presigned PUT URL so the browser can upload directly to
 * object storage — files never pass through our server. The public URL
 * is built from `R2_PUBLIC_URL` (a custom domain or the bucket's r2.dev
 * URL), never from the private S3 API endpoint, which doesn't serve
 * public reads.
 */
export async function createUploadUrl(folder: string, contentType: string) {
  if (!ALLOWED_IMAGE_CONTENT_TYPES.includes(contentType as (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number])) {
    throw new ValidationError(`Unsupported file type: ${contentType}`);
  }
  if (!env.R2_PUBLIC_URL) {
    throw new ConflictError("Object storage public URL is not configured — set R2_PUBLIC_URL");
  }

  const key = `${folder}/${randomUUID()}`;

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
  const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;

  return { uploadUrl, publicUrl, key };
}

export async function deleteObject(key: string) {
  await client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
}
