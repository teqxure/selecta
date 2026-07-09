"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { initiateSubscriptionCheckout, cancelSubscription } from "@/services/monetization/subscription.service";
import { ROUTES } from "@/lib/constants/routes";
import { isAppError } from "@/lib/errors";

export interface SubscribeActionState {
  error?: string;
}

export async function subscribeToPlanAction(_prevState: SubscribeActionState, formData: FormData): Promise<SubscribeActionState> {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const planId = String(formData.get("planId") || "");

  let outcome;
  try {
    outcome = await initiateSubscriptionCheckout(profile.id, planId);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  if (outcome.activatedImmediately) {
    revalidatePath(ROUTES.seller.growth);
    return {};
  }

  redirect(outcome.checkoutUrl);
}

export async function cancelSubscriptionAction() {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  await cancelSubscription(profile.id);
  revalidatePath(ROUTES.seller.growth);
}
