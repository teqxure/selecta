"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getCurrentPositionWithFallback } from "@/lib/geolocation";
import { reverseGeocodeAction } from "@/app/actions";

type LocationState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "done"; lat: number; lng: number; accuracy: number; placeName: string | null }
  | { status: "error"; message: string };

/**
 * A single explicit `getCurrentPosition` call on tap — never a background
 * `watchPosition`. Shared by the buyer address book and seller store-location
 * forms; parent owns the resulting coordinates via `onLocated`.
 */
export function UseMyLocationButton({ onLocated, label = "Use my current location" }: { onLocated: (coords: { lat: number; lng: number }) => void; label?: string }) {
  const [state, setState] = useState<LocationState>({ status: "idle" });

  const handleClick = async () => {
    setState({ status: "locating" });
    try {
      const { lat, lng, accuracy } = await getCurrentPositionWithFallback();
      onLocated({ lat, lng });
      setState({ status: "done", lat, lng, accuracy, placeName: null });
      // Reverse-geocoding is best-effort on top of the already-captured
      // coordinates — a failed/slow lookup never blocks or invalidates them.
      const placeName = await reverseGeocodeAction(lat, lng).catch(() => null);
      if (placeName) setState({ status: "done", lat, lng, accuracy, placeName });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Couldn't get your location." });
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void handleClick()} disabled={state.status === "locating"}>
          <LocateFixed className="h-4 w-4" strokeWidth={2} />
          {state.status === "locating" ? "Locating…" : label}
        </Button>
      </div>
      {state.status === "done" && (
        <span className="text-xs text-[color:var(--color-olive-sage)]">
          {state.placeName ? `Location found: ${state.placeName}` : `Location found (${state.lat.toFixed(5)}, ${state.lng.toFixed(5)})`}
          {" · "}accurate to ~{Math.round(state.accuracy)}m
        </span>
      )}
      {state.status === "error" && <span className="text-xs text-red-600">{state.message}</span>}
    </div>
  );
}
