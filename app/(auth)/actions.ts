"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { loginSchema, registerSchema } from "@/lib/validators/auth";
import { createUser, getUserByEmail } from "@/services/users/user.service";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { isAppError } from "@/lib/errors";
import { ROUTES } from "@/lib/constants/routes";

export interface AuthActionState {
  error?: string;
}

export async function registerAction(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  try {
    const user = await createUser(parsed.data);
    await setSessionCookie({ userId: user.id, role: user.role });
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  redirect(ROUTES.home);
}

export async function loginAction(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const user = await getUserByEmail(parsed.data.email);
  if (!user?.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Invalid email or password" };
  }

  await setSessionCookie({ userId: user.id, role: user.role });
  redirect(ROUTES.home);
}
