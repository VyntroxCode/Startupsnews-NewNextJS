"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { EventsCarousel } from "@/components/EventsCarousel";
import { getCurrentBrowserLocation } from "@/lib/browser-geolocation";
import type { StartupEvent } from "@/modules/events/domain/types";
import { OTHER_CITIES_SECTION } from "@/modules/partnership-events/domain/country-city-data";
import { COHORT_PARTNERSHIP_TYPE } from "@/modules/partnership-events/domain/types";
import { NON_GEOGRAPHIC_REGIONS } from "@/modules/events/utils/region-country.utils";
import { orderByVisitorLocation } from "@/modules/events/utils/visitor-location-order.utils";

const COOKIE = "sn_event_loc";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

type VisitorLocation = { country: string; city: string };
type EventsByCountry = Record<string, Record<string, StartupEvent[]>>;

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function readCookieValue(): string {
  return document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? "";
}

function parseLocation(raw: string): VisitorLocation | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as { country?: unknown; city?: unknown };
    const country = clean(parsed.country, 60);
    return country ? { country, city: clean(parsed.city, 80) } : null;
  } catch {
    return null;
  }
}

// The cookie as an external store: the server snapshot is "" (no location → A–Z, matching the
// cached HTML), and the client re-renders with the real cookie right after hydration.
const cookieListeners = new Set<() => void>();
function subscribeCookie(listener: () => void) {
  cookieListeners.add(listener);
  return () => { cookieListeners.delete(listener); };
}
const getServerCookie = () => "";

async function askBrowserLocation(): Promise<VisitorLocation | null> {
  // Skip if the visitor has already blocked location for this site — the browser would fail
  // instantly without showing a prompt anyway.
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    if (status?.state === "denied") return null;
  } catch {
    // Permissions API unavailable — just ask.
  }
  const { lat, lng } = await getCurrentBrowserLocation({ timeoutMs: 15000 });
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
  );
  if (!res.ok) return null;
  const geo = (await res.json()) as { city?: string; locality?: string; countryName?: string };
  const country = (geo.countryName || "").trim();
  if (!country) return null;
  const location = { country, city: (geo.city || geo.locality || "").trim() };
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(location))}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  cookieListeners.forEach((listener) => listener());
  return location;
}

/**
 * The /events country → city carousels. The server renders them in plain A–Z order so the page
 * stays ISR-cached (reading the location cookie on the server made every request dynamic). After
 * hydration the visitor's own city and country move to the top: from the `sn_event_loc` cookie
 * when it exists, otherwise by asking the browser for its location (browser Allow/Block prompt →
 * BigDataCloud key-less reverse geocode → cookie). Declined/blocked/timed out → stays A–Z.
 */
export function EventsByCountryList({ eventsByCountry }: { eventsByCountry: EventsByCountry }) {
  const rawCookie = useSyncExternalStore(subscribeCookie, readCookieValue, getServerCookie);
  const location = useMemo(() => parseLocation(rawCookie), [rawCookie]);

  useEffect(() => {
    if (readCookieValue()) return;
    // Declined, blocked or timed out → fail quietly; the page stays A–Z.
    askBrowserLocation().catch(() => {});
  }, []);

  const ordered = useMemo(
    () => orderByVisitorLocation(eventsByCountry, location).eventsByCountry,
    [eventsByCountry, location]
  );

  return (
    <>
      {Object.entries(ordered).map(([country, cities]) => {
        const isCohort = country === COHORT_PARTNERSHIP_TYPE;
        // "Other Cities" only means something beside a country's own city sections — when
        // it's the country's sole section, the heading adds nothing, so drop it.
        const onlyOtherCities = Object.keys(cities).length === 1 && OTHER_CITIES_SECTION in cities;
        return (
          <section key={country} className="event-by-country-section">
            <h2 className="event-by-country-region">{country}</h2>
            {Object.entries(cities).map(([city, events]) => (
              <div key={city} className="event-by-country-city-group">
                <EventsCarousel
                  events={events}
                  maxEvents={events.length}
                  title={
                    city !== country &&
                    !NON_GEOGRAPHIC_REGIONS.has(city) &&
                    !(onlyOtherCities && city === OTHER_CITIES_SECTION)
                      ? city
                      : null
                  }
                  className="event-country-carousel"
                  showCountry={isCohort}
                />
              </div>
            ))}
          </section>
        );
      })}
    </>
  );
}
