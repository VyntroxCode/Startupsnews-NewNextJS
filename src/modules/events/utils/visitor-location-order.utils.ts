import type { StartupEvent } from "../domain/types";
import {
  OTHER_CITIES_SECTION,
  canonicalCountryName,
  parentCityForSubCity,
} from "@/modules/partnership-events/domain/country-city-data";

type EventsByCountry = Record<string, Record<string, StartupEvent[]>>;

/** Spellings geo-IP / reverse-geocoding providers return that differ from our section names.
 * Sub-cities (Gurugram, Noida, New Delhi…) are handled separately by parentCityForSubCity. */
const CITY_ALIASES: Record<string, string> = {
  bangalore: "Bengaluru",
  "bengaluru urban": "Bengaluru",
  bombay: "Mumbai",
  "navi mumbai": "Mumbai",
  thane: "Mumbai",
  secunderabad: "Hyderabad",
  madras: "Chennai",
  calcutta: "Kolkata",
  "greater noida": "Delhi NCR",
  "dubai city": "Dubai",
};

function normalizeCity(city: string): string {
  const raw = (city || "").trim();
  if (!raw) return "";
  const aliased = CITY_ALIASES[raw.toLowerCase()] || raw;
  return (parentCityForSubCity(aliased) || aliased).toLowerCase();
}

function eventMatchesCity(event: StartupEvent, city: string): boolean {
  return normalizeCity(event.city || event.location || "") === city;
}

/** Moves `key` to the front of an insertion-ordered record, keeping the rest in order. */
function toFront<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record;
  return { [key]: record[key], ...Object.fromEntries(Object.entries(record).filter(([k]) => k !== key)) };
}

/**
 * Reorders the grouped /events data so the visitor's own city (or, failing that, country) reads
 * first. Pure ordering — nothing is added or removed, so every event on the page is still listed.
 *
 * - The visitor's city section moves to the top of its country, and that country to the top.
 * - A city too small for its own section lives in "Other Cities": its events move to the front
 *   of that carousel and the carousel moves to the top of the country.
 * - The city is looked for across ALL countries, so a provider that returns an unexpected
 *   country spelling still finds the right section.
 * - No city match → just the visitor's country moves to the top.
 */
export function orderByVisitorLocation(
  eventsByCountry: EventsByCountry,
  location: { country: string; city: string } | null
): { eventsByCountry: EventsByCountry; matchedCity: string | null; matchedCountry: string | null } {
  if (!location) return { eventsByCountry, matchedCity: null, matchedCountry: null };
  const city = normalizeCity(location.city);
  const wantedCountry = canonicalCountryName(location.country).toLowerCase();

  if (city) {
    // 1. A city with its own section.
    for (const [country, sections] of Object.entries(eventsByCountry)) {
      const section = Object.keys(sections).find((name) => normalizeCity(name) === city);
      if (section) {
        const reordered = { ...eventsByCountry, [country]: toFront(sections, section) };
        return { eventsByCountry: toFront(reordered, country), matchedCity: section, matchedCountry: country };
      }
    }
    // 2. A city folded into a country's "Other Cities" carousel. Prefer the visitor's country
    // when several countries happen to have a same-named city.
    const countries = Object.keys(eventsByCountry).sort(
      (a, b) => Number(canonicalCountryName(b).toLowerCase() === wantedCountry) - Number(canonicalCountryName(a).toLowerCase() === wantedCountry)
    );
    for (const country of countries) {
      const others = eventsByCountry[country][OTHER_CITIES_SECTION];
      if (!others?.some((e) => eventMatchesCity(e, city))) continue;
      const mine = others.filter((e) => eventMatchesCity(e, city));
      const rest = others.filter((e) => !eventMatchesCity(e, city));
      const sections = toFront({ ...eventsByCountry[country], [OTHER_CITIES_SECTION]: [...mine, ...rest] }, OTHER_CITIES_SECTION);
      return {
        eventsByCountry: toFront({ ...eventsByCountry, [country]: sections }, country),
        matchedCity: mine[0].city || location.city,
        matchedCountry: country,
      };
    }
  }

  // 3. Country only.
  const country = Object.keys(eventsByCountry).find((c) => canonicalCountryName(c).toLowerCase() === wantedCountry);
  if (country) return { eventsByCountry: toFront(eventsByCountry, country), matchedCity: null, matchedCountry: country };
  return { eventsByCountry, matchedCity: null, matchedCountry: null };
}
