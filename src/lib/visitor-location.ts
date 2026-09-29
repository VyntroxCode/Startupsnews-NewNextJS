import { cookies } from "next/headers";

/**
 * Where the current visitor is, for ordering /events so their own city/country reads first.
 *
 * The ONLY source is `VISITOR_LOCATION_COOKIE`, written by the browser after the visitor allows
 * the location prompt on /events (EventsLocationBar: browser geolocation → reverse geocode).
 * There is deliberately no IP lookup — the location must come from the visitor. No cookie (not
 * asked yet, declined, or cleared) → null, and /events falls back to plain A–Z order.
 */

export interface VisitorLocation {
  country: string;
  city: string;
}

export const VISITOR_LOCATION_COOKIE = "sn_event_loc";

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function getVisitorLocation(): Promise<VisitorLocation | null> {
  try {
    const raw = (await cookies()).get(VISITOR_LOCATION_COOKIE)?.value;
    if (!raw) return null;
    const parsed = JSON.parse(decodeURIComponent(raw)) as { country?: unknown; city?: unknown };
    const country = clean(parsed.country, 60);
    return country ? { country, city: clean(parsed.city, 80) } : null;
  } catch {
    // Malformed cookie — treat as no location.
    return null;
  }
}
