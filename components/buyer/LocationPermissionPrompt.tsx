"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";
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
  const [pending, setPending] = useState(false);

  const dismiss = () => setOpen(false);

  const handleAllow = () => {
    if (!navigator.geolocation) {
      dismiss();
      void denyLocationPermissionAction();
      return;
    }
    setPending(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void grantLocationPermissionAction(position.coords.latitude, position.coords.longitude).then(dismiss);
      },
      () => {
        setPending(false);
        void denyLocationPermissionAction().then(dismiss);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
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
      <div className="mt-6 flex flex-col gap-2">
        <Button type="button" variant="accent" onClick={handleAllow} disabled={pending}>
          {pending ? "Locating…" : "Allow location"}
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
