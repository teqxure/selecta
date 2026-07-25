"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * A single explicit `getCurrentPosition` call on tap — never a background
 * `watchPosition`. Shared by the buyer address book and seller store-location
 * forms; parent owns the resulting coordinates via `onLocated`.
 */
export function UseMyLocationButton({ onLocated, label = "Use my current location" }: { onLocated: (coords: { lat: number; lng: number }) => void; label?: string }) {
  const [status, setStatus] = useState<"idle" | "locating" | "done" | "error">("idle");

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          if (!navigator.geolocation) {
            setStatus("error");
            return;
          }
          setStatus("locating");
          navigator.geolocation.getCurrentPosition(
            (position) => {
              onLocated({ lat: position.coords.latitude, lng: position.coords.longitude });
              setStatus("done");
            },
            () => setStatus("error"),
            { enableHighAccuracy: true, timeout: 10_000 },
          );
        }}
      >
        <LocateFixed className="h-4 w-4" strokeWidth={2} />
        {status === "locating" ? "Locating…" : label}
      </Button>
      {status === "done" && <span className="text-xs text-[color:var(--color-olive-sage)]">Location added</span>}
      {status === "error" && <span className="text-xs text-red-600">Couldn&rsquo;t get your location</span>}
    </div>
  );
}
