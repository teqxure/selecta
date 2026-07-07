import "server-only";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { Role } from "@/lib/constants/roles";
import type { RegisterInput } from "@/lib/validators/auth";

export async function createUser(input: RegisterInput) {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError("An account with this email already exists");

  const passwordHash = await hashPassword(input.password);

  return db.user.create({
    data: {
      email: input.email,
      phone: input.phone,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: Role.BUYER,
    },
  });
}

export async function getUserById(id: string) {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError("User");
  return user;
}

export function getUserByEmail(email: string) {
  return db.user.findUnique({ where: { email } });
}
