"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { EventsCarousel } from "@/components/EventsCarousel";
import { getCurrentBrowserLocation } from "@/lib/browser-geolocation";
import type { StartupEvent } from "@/modules/events/domain/types";
import { OTHER_CITIES_SECTION } from "@/modules/partnership-events/domain/country-city-data";
import { COHORT_PARTNERSHIP_TYPE } from "@/modules/partnership-events/domain/types";
import { NON_GEOGRAPHIC_REGIONS, countrySectionId } from "@/modules/events/utils/region-country.utils";
import { orderByVisitorLocation } from "@/modules/events/utils/visitor-location-order.utils";

const COOKIE = "sn_event_loc";
const GPS_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
// An IP-based guess is rechecked daily — networks, VPNs and travel move it around.
const IP_COOKIE_MAX_AGE = 60 * 60 * 24;
const IP_LOOKUP_TIMEOUT_MS = 4000;

/** `gps` = the visitor allowed browser location; `ip` = guessed from their network. */
type LocationSource = "gps" | "ip";
type VisitorLocation = { country: string; city: string; source: LocationSource };
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
    const parsed = JSON.parse(decodeURIComponent(raw)) as { country?: unknown; city?: unknown; source?: unknown };
    const country = clean(parsed.country, 60);
    // Cookies written before the IP fallback existed carry no source — they all came from GPS.
    return country ? { country, city: clean(parsed.city, 80), source: parsed.source === "ip" ? "ip" : "gps" } : null;
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

function saveLocation(location: VisitorLocation) {
  const maxAge = location.source === "gps" ? GPS_COOKIE_MAX_AGE : IP_COOKIE_MAX_AGE;
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(location))}; path=/; max-age=${maxAge}; samesite=lax`;
  cookieListeners.forEach((listener) => listener());
}

async function fetchJson(url: string, timeoutMs?: number): Promise<Record<string, unknown> | null> {
  const res = await fetch(url, timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : undefined);
  return res.ok ? ((await res.json()) as Record<string, unknown>) : null;
}

/** The precise route: browser Allow/Block prompt → coordinates → BigDataCloud reverse geocode. */
async function askBrowserLocation(): Promise<void> {
  // Skip if the visitor has already blocked location for this site — the browser would fail
  // instantly without showing a prompt anyway.
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    if (status?.state === "denied") return;
  } catch {
    // Permissions API unavailable — just ask.
  }
  const { lat, lng } = await getCurrentBrowserLocation({ timeoutMs: 15000 });
  const geo = await fetchJson(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
  );
  const country = clean(geo?.countryName, 60);
  if (!country) return;
  saveLocation({ country, city: clean(geo?.city, 80) || clean(geo?.locality, 80), source: "gps" });
}

/**
 * The no-prompt route: where the visitor's network (IP) is. Called from the browser, so the
 * provider sees the visitor's own IP and the page stays ISR-cached. BigDataCloud's key-less
 * endpoint answers by IP when it gets no coordinates; ipwho.is is the backup. Good for the
 * country, rough for the city.
 */
async function lookupIpLocation(): Promise<void> {
  const providers: Array<() => Promise<{ country: string; city: string }>> = [
    async () => {
      const geo = await fetchJson("https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en", IP_LOOKUP_TIMEOUT_MS);
      return { country: clean(geo?.countryName, 60), city: clean(geo?.city, 80) || clean(geo?.locality, 80) };
    },
    async () => {
      const geo = await fetchJson("https://ipwho.is/?fields=success,country,city", IP_LOOKUP_TIMEOUT_MS);
      return { country: clean(geo?.country, 60), city: clean(geo?.city, 80) };
    },
  ];
  for (const provider of providers) {
    const found = await provider().catch(() => null);
    if (!found?.country) continue;
    // The visitor may have allowed browser location while this was in flight — that one wins.
    if (parseLocation(readCookieValue())?.source !== "gps") saveLocation({ ...found, source: "ip" });
    return;
  }
}

/** How many cards of a city row rise in one after another — the rest sit off-screen to the right. */
const STAGGERED_CARDS = 5;

/**
 * Scroll reveals for the list, so a new country reads as a new chapter instead of one more static
 * heading: the pink rule draws across, the country name slides up out of a mask and its flag spins
 * in; each city row then brings its title in from the left and its first cards up in a stagger.
 * GSAP is loaded on demand and things are only hidden once it has arrived, so a failed import (or
 * a reduced-motion visitor) just gets the plain, fully visible list. An IntersectionObserver
 * starts each reveal rather than ScrollTrigger: the lazy poster images keep changing the page
 * height, which would leave ScrollTrigger's cached positions stale.
 */
function useCountryReveals(rootRef: React.RefObject<HTMLDivElement | null>, rerunKey: unknown) {
  // Survives the re-order after the location cookie lands: sections keep their DOM nodes, so
  // anything already revealed must not be hidden and replayed.
  const seen = useRef(new WeakSet<Element>());

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    let observer: IntersectionObserver | undefined;

    import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      const parts = (el: Element) => ({
        line: el.querySelector("[data-ec-line]"),
        name: el.querySelector("[data-ec-name]"),
        flag: el.querySelector("[data-ec-flag]"),
        title: el.querySelector(".events-carousel-title"),
        cards: Array.from(el.querySelectorAll(".events-carousel-list > *")).slice(0, STAGGERED_CARDS),
      });

      const targets = Array.from(root.querySelectorAll("[data-ec-head], [data-ec-city]")).filter(
        (el) => !seen.current.has(el)
      );
      for (const el of targets) {
        const { line, name, flag, title, cards } = parts(el);
        if (line) gsap.set(line, { scaleX: 0 });
        if (name) gsap.set(name, { yPercent: 110 });
        if (flag) gsap.set(flag, { scale: 0, rotate: -90, opacity: 0 });
        if (title) gsap.set(title, { x: -24, opacity: 0 });
        if (cards.length) gsap.set(cards, { y: 36, opacity: 0 });
      }

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const el = entry.target;
            observer?.unobserve(el);
            seen.current.add(el);
            const { line, name, flag, title, cards } = parts(el);
            if (line) gsap.to(line, { scaleX: 1, duration: 0.9, ease: "power3.out" });
            if (name) gsap.to(name, { yPercent: 0, duration: 0.7, delay: 0.05, ease: "power3.out" });
            if (flag) gsap.to(flag, { scale: 1, rotate: 0, opacity: 1, duration: 0.6, delay: 0.15, ease: "back.out(1.8)" });
            if (title) gsap.to(title, { x: 0, opacity: 1, duration: 0.5, ease: "power2.out", clearProps: "transform,opacity" });
            // clearProps hands the cards back to the stylesheet, so their hover lift still works.
            if (cards.length) {
              gsap.to(cards, { y: 0, opacity: 1, duration: 0.6, delay: 0.1, stagger: 0.08, ease: "power3.out", clearProps: "transform,opacity" });
            }
          }
        },
        { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
      );
      targets.forEach((el) => observer?.observe(el));
    }).catch(() => {});

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [rootRef, rerunKey]);
}

/**
 * The /events country → city carousels. The server renders them in plain A–Z order so the page
 * stays ISR-cached (reading the location cookie on the server made every request dynamic). After
 * hydration the visitor's own city and country move to the top, from the `sn_event_loc` cookie.
 * Two routes fill that cookie, both started on load:
 *   1. IP — no prompt, lands first (lookupIpLocation), kept 1 day.
 *   2. Browser location — Allow/Block prompt (askBrowserLocation), replaces the IP guess when
 *      allowed and is kept 30 days.
 * Blocked or dismissed prompt → the IP order stays. Both routes fail → stays A–Z.
 */
export function EventsByCountryList({
  eventsByCountry,
  flags = {},
}: {
  eventsByCountry: EventsByCountry;
  /** Round flag SVG per country name (same files as the Explore by Country strip). */
  flags?: Record<string, string>;
}) {
  const rawCookie = useSyncExternalStore(subscribeCookie, readCookieValue, getServerCookie);
  const location = useMemo(() => parseLocation(rawCookie), [rawCookie]);

  useEffect(() => {
    const saved = parseLocation(readCookieValue());
    // A location the visitor shared themselves is final until its cookie expires.
    if (saved?.source === "gps") return;
    // Every failure below is quiet: the page keeps whatever order it already has.
    if (!saved) lookupIpLocation().catch(() => {});
    askBrowserLocation().catch(() => {});
  }, []);

  const ordered = useMemo(
    () => orderByVisitorLocation(eventsByCountry, location).eventsByCountry,
    [eventsByCountry, location]
  );

  const rootRef = useRef<HTMLDivElement>(null);
  useCountryReveals(rootRef, ordered);

  return (
    <div ref={rootRef} className="contents">
      {Object.entries(ordered).map(([country, cities]) => {
        const isCohort = country === COHORT_PARTNERSHIP_TYPE;
        // "Other Cities" only means something beside a country's own city sections — when
        // it's the country's sole section, the heading adds nothing, so drop it.
        const onlyOtherCities = Object.keys(cities).length === 1 && OTHER_CITIES_SECTION in cities;
        return (
          // The id is the scroll target of this country's EventsCountryStrip circle; scroll-mt
          // keeps the heading clear of the sticky site header when it lands.
          <section key={country} id={countrySectionId(country)} className="event-by-country-section scroll-mt-28">
            <div data-ec-head className="mb-4">
              <h2 className="event-by-country-region flex items-center gap-3">
                {flags[country] && (
                  // eslint-disable-next-line @next/next/no-img-element -- tiny SVG from S3; next/image refuses SVG without dangerouslyAllowSVG
                  <img
                    data-ec-flag
                    src={flags[country]}
                    alt=""
                    loading="lazy"
                    className="size-8 shrink-0 rounded-full object-cover ring-1 ring-black/10 sm:size-10"
                    onError={(e) => { e.currentTarget.hidden = true; }}
                  />
                )}
                {/* The mask the name slides up out of; the padding keeps descenders (g, y, p) unclipped. */}
                <span className="overflow-hidden pb-1">
                  <span data-ec-name className="block">{country}</span>
                </span>
              </h2>
              <span data-ec-line aria-hidden="true" className="block h-[3px] origin-left rounded-full bg-gradient-to-r from-[#E62E69] via-[#E62E69]/40 to-transparent" />
            </div>
            {Object.entries(cities).map(([city, events]) => (
              <div key={city} data-ec-city className="event-by-country-city-group">
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
    </div>
  );
}
