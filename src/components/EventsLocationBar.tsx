"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getCurrentBrowserLocation } from "@/lib/browser-geolocation";

// Must match VISITOR_LOCATION_COOKIE in src/lib/visitor-location.ts (that module imports
// next/headers, so it can't be imported into a client component).
const COOKIE = "sn_event_loc";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

interface EventsLocationBarProps {
  /** Whether the visitor has shared a location (the cookie exists). */
  hasLocation: boolean;
}

/**
 * Headless location prompt on /events — renders nothing. With no location cookie yet, it asks
 * the browser for the visitor's location on every page load (the browser's own Allow/Block
 * prompt; a visitor who blocked it isn't prompted by the browser again). The position is
 * reverse-geocoded to a city/country (BigDataCloud's key-less client endpoint), stored in a
 * cookie the server reads, and the page refreshes with that city and country on top. Without a
 * location the page stays in plain A–Z order. There is no visible bar — removed 2026-09-25 at
 * the user's request.
 */
export function EventsLocationBar({ hasLocation }: EventsLocationBarProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const asked = useRef(false);

  useEffect(() => {
    if (hasLocation || asked.current) return;
    asked.current = true;

    const ask = async () => {
      try {
        const { lat, lng } = await getCurrentBrowserLocation({ timeoutMs: 15000 });
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );
        if (!res.ok) return;
        const geo = (await res.json()) as { city?: string; locality?: string; countryName?: string };
        const country = (geo.countryName || "").trim();
        if (!country) return;
        const value = encodeURIComponent(JSON.stringify({ country, city: (geo.city || geo.locality || "").trim() }));
        document.cookie = `${COOKIE}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
        startTransition(() => router.refresh());
      } catch {
        // Declined, blocked or timed out — fail quietly; the page stays A–Z.
      }
    };

    // Skip if the visitor has already blocked location for this site — the browser would fail
    // instantly without showing a prompt anyway.
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((status) => { if (status.state !== "denied") void ask(); })
        .catch(() => void ask());
    } else {
      void ask();
    }
  }, [hasLocation, router]);

  return null;
}
