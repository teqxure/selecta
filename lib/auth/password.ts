import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function hashPassword(plainText: string) {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

export function verifyPassword(plainText: string, hash: string) {
  return bcrypt.compare(plainText, hash);
}

/**
 * A precomputed hash of an arbitrary constant string. Compare against this
 * when a login's email doesn't match any user, so the response takes the
 * same bcrypt-bound time whether the account exists or not — otherwise a
 * missing user short-circuits instantly and an attacker can enumerate
 * emails by timing alone.
 */
export const DUMMY_PASSWORD_HASH = "$2b$12$6Z./9lgkIx6nGB1YveXJJOCMeTZ.aJQb89awscCCIK9Z2qxaamF12";
