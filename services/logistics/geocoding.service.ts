import "server-only";
import { env } from "@/lib/env";

interface NominatimResponse {
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
}

/**
 * OpenStreetMap Nominatim reverse geocoding — free, no API key. Its usage
 * policy (operations.osmfoundation.org/policies/nominatim) asks for a real
 * identifying User-Agent, which only a server request can set (browsers
 * block overriding it from client JS) — the reason this runs behind a
 * server action rather than being called directly from the client that
 * captured the coordinates. Fine for on-demand, one-tap-at-a-time lookups
 * like this; heavy automated volume would need caching or a self-hosted/
 * paid instance per that policy.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("zoom", "16");
  url.searchParams.set("addressdetails", "1");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": `Selecta/1.0 (+${env.NEXT_PUBLIC_APP_URL})` },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;

  let data: NominatimResponse;
  try {
    data = await response.json();
  } catch {
    return null;
  }

  const address = data.address ?? {};
  const area = address.suburb || address.neighbourhood || address.city_district || address.quarter;
  const city = address.city || address.town || address.village || address.county;
  const label = [area, city].filter((part): part is string => Boolean(part));

  if (label.length > 0) return label.join(", ");
  if (data.name) return data.name;
  if (data.display_name) return data.display_name.split(",").slice(0, 2).join(",").trim();
  return null;
}
