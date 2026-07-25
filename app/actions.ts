"use server";

import { requireAuth } from "@/lib/auth/rbac";
import { reverseGeocode } from "@/services/logistics/geocoding.service";

/**
 * Shared across the buyer address book, the onboarding location prompt,
 * and seller store-location forms — not tied to one route group, so it
 * lives at the app root rather than duplicated per route's actions.ts.
 * Auth-gated only to keep this from being an open, unauthenticated proxy
 * to a third-party API — the place name itself isn't sensitive.
 */
export async function reverseGeocodeAction(latitude: number, longitude: number): Promise<string | null> {
  await requireAuth();
  return reverseGeocode(latitude, longitude);
}
