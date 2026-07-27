"use client";

import { useEffect, useState } from "react";
import { Truck, MapPin } from "lucide-react";
import { getDeliveryTrackingAction } from "@/services/logistics/delivery.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const POLL_INTERVAL_MS = 8000;

type Tracking = Awaited<ReturnType<typeof getDeliveryTrackingAction>>;

/**
 * Polling-based live tracking — no WebSocket/push infra (Vercel hosting has
 * no persistent socket server). Re-fetches on an interval; the data shape
 * (rider lat/lng, status, events) is deliberately push-service-ready, so
 * swapping this for a real subscription later is a component change, not a
 * data-model rewrite.
 */
export function DeliveryTrackingPanel({ orderId }: { orderId: string }) {
  const [tracking, setTracking] = useState<Tracking | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTracking() {
      try {
        const result = await getDeliveryTrackingAction(orderId);
        if (!cancelled) setTracking(result);
      } catch {
        // Best-effort — a transient failure just means this poll cycle shows stale data.
      }
    }

    fetchTracking();
    const interval = setInterval(fetchTracking, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId]);

  if (!tracking || (!tracking.rider && tracking.events.length === 0)) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Live tracking</CardTitle>
          <Badge tone="neutral">{tracking.status.replaceAll("_", " ")}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {tracking.rider && (
          <div className="flex items-center gap-2 text-sm">
            <Truck className="h-4 w-4 text-accent" strokeWidth={2} />
            <span className="text-foreground">{tracking.rider.name}</span>
            {tracking.rider.latitude != null && tracking.rider.longitude != null && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" strokeWidth={2} />
                {tracking.rider.latitude.toFixed(4)}, {tracking.rider.longitude.toFixed(4)}
              </span>
            )}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          {tracking.events.map((event, index) => (
            <div key={index} className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{event.status.replaceAll("_", " ")}</span>
              {event.note && ` — ${event.note}`} · {new Date(event.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
