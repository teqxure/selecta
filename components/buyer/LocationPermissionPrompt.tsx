"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";
import { getCurrentPositionWithFallback } from "@/lib/geolocation";
import { reverseGeocodeAction } from "@/app/actions";
import { grantLocationPermissionAction, denyLocationPermissionAction } from "@/app/(buyer)/actions";

const BENEFITS = [
  "Discover fashion near you",
  "Accurate delivery pricing",
  "Same-day delivery where available",
  "Easy store pickup",
  "Better recommendations",
];

/**
 * Shown once for a buyer whose `User.locationPermission` is still
 * NOT_ASKED — any of the three choices below flips it to GRANTED/DENIED
 * server-side, so it never nags again. Coordinates are only ever written
 * on this explicit tap or a later manual refresh — never a background
 * `watchPosition`.
 */
export function LocationPermissionPrompt() {
  const [open, setOpen] = useState(true);
  const [status, setStatus] = useState<"idle" | "locating" | "found" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [found, setFound] = useState<{ lat: number; lng: number; placeName: string | null } | null>(null);

  const dismiss = () => setOpen(false);

  const handleAllow = async () => {
    setStatus("locating");
    setErrorMessage(null);
    try {
      const { lat, lng } = await getCurrentPositionWithFallback();
      setFound({ lat, lng, placeName: null });
      setStatus("found");
      // Coordinates are saved immediately — the place name is a best-effort
      // display nicety layered on top and never blocks/invalidates them.
      await grantLocationPermissionAction(lat, lng);
      const placeName = await reverseGeocodeAction(lat, lng).catch(() => null);
      if (placeName) setFound({ lat, lng, placeName });
      setTimeout(dismiss, 1200);
    } catch (error) {
      // A failed/timed-out fix isn't the same as the user declining — keep
      // the prompt open so they can retry instead of silently recording
      // DENIED and never asking again.
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Couldn't get your location.");
    }
  };

  const handleNotNow = () => {
    dismiss();
    void denyLocationPermissionAction();
  };

  return (
    <Modal open={open} onClose={handleNotNow} title="Allow Selecta to access your location">
      <p className="text-sm text-muted-foreground">Benefits:</p>
      <ul className="mt-2 flex flex-col gap-2 text-sm text-foreground">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
            {benefit}
          </li>
        ))}
      </ul>
      {status === "found" && found && (
        <p className="mt-3 text-xs text-[color:var(--color-olive-sage)]">
          Location found: {found.placeName ?? `${found.lat.toFixed(5)}, ${found.lng.toFixed(5)}`}
        </p>
      )}
      {status === "error" && errorMessage && <p className="mt-3 text-xs text-red-600">{errorMessage}</p>}
      <div className="mt-6 flex flex-col gap-2">
        <Button type="button" variant="accent" onClick={() => void handleAllow()} disabled={status === "locating"}>
          {status === "locating" ? "Locating…" : status === "error" ? "Try again" : "Allow location"}
        </Button>
        <Button type="button" variant="outline" onClick={handleNotNow}>
          Not now
        </Button>
        <Link href={ROUTES.profile} onClick={handleNotNow} className="text-center text-sm text-muted-foreground hover:underline">
          Manually select city
        </Link>
      </div>
    </Modal>
  );
}
