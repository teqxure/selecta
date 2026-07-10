"use server";

import { requireAuth } from "@/lib/auth/rbac";
import { createUploadUrl } from "@/services/storage/storage.service";

/**
 * Thin auth boundary around `createUploadUrl` — anyone could otherwise mint
 * a presigned PUT URL into our bucket. Scoping the key under the caller's
 * own user id also keeps uploads attributable without extra bookkeeping.
 */
export async function getUploadUrlAction(folder: string, contentType: string, sizeBytes: number) {
  const session = await requireAuth();
  return createUploadUrl(`${session.userId}/${folder}`, contentType, sizeBytes);
}
