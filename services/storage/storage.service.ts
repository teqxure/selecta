import "server-only";
import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

/**
 * Scaleway Object Storage is S3-compatible, so the AWS SDK works as-is
 * pointed at the Scaleway endpoint/region.
 */
const client = new S3Client({
  region: env.SCALEWAY_REGION,
  endpoint: env.SCALEWAY_ENDPOINT,
  credentials: {
    accessKeyId: env.SCALEWAY_ACCESS_KEY_ID ?? "",
    secretAccessKey: env.SCALEWAY_SECRET_ACCESS_KEY ?? "",
  },
});

const UPLOAD_URL_TTL_SECONDS = 60 * 5;

/**
 * Returns a presigned PUT URL so the browser can upload directly to
 * object storage — files never pass through our server.
 */
export async function createUploadUrl(folder: string, contentType: string) {
  const key = `${folder}/${randomUUID()}`;

  const command = new PutObjectCommand({
    Bucket: env.SCALEWAY_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
  const publicUrl = `${env.SCALEWAY_ENDPOINT}/${env.SCALEWAY_BUCKET_NAME}/${key}`;

  return { uploadUrl, publicUrl, key };
}

export async function deleteObject(key: string) {
  await client.send(new DeleteObjectCommand({ Bucket: env.SCALEWAY_BUCKET_NAME, Key: key }));
}
