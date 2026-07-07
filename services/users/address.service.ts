import "server-only";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { sanitizeOptionalText, sanitizeText } from "@/lib/security/sanitize";
import type { AddressInput } from "@/lib/validators/profile";

export function listAddresses(userId: string) {
  return db.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
}

export async function createAddress(userId: string, input: AddressInput) {
  if (input.isDefault) {
    await db.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }

  return db.address.create({
    data: {
      userId,
      label: sanitizeOptionalText(input.label),
      line1: sanitizeText(input.line1),
      line2: sanitizeOptionalText(input.line2),
      city: sanitizeText(input.city),
      state: sanitizeText(input.state),
      phone: input.phone || undefined,
      isDefault: input.isDefault,
    },
  });
}

/**
 * Scoping every mutation to `{ id, userId }` (rather than just `{ id }`) is
 * the ownership check — it makes editing/deleting another user's address by
 * guessing an id a no-op (0 rows affected) instead of a successful IDOR.
 */
export async function deleteAddress(userId: string, addressId: string) {
  const { count } = await db.address.deleteMany({ where: { id: addressId, userId } });
  if (count === 0) throw new NotFoundError("Address");
}

export async function setDefaultAddress(userId: string, addressId: string) {
  const existing = await db.address.findFirst({ where: { id: addressId, userId } });
  if (!existing) throw new NotFoundError("Address");

  return db.$transaction([
    db.address.updateMany({ where: { userId }, data: { isDefault: false } }),
    db.address.update({ where: { id: addressId }, data: { isDefault: true } }),
  ]);
}
