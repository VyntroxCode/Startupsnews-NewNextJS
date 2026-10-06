import type { StartupEvent } from "../domain/types";
import { canonicalCountryName } from "@/modules/partnership-events/domain/country-city-data";
import { eventDateSortKey } from "@/modules/partnership-events/utils/public-event.utils";
import { resolveCountry } from "./region-country.utils";

/** How many "Similar Events" cards the event detail page shows. */
export const SIMILAR_EVENTS_COUNT = 3;

function eventKey(event: StartupEvent): string {
  return String(event.slug || event.id || event.url);
}

function norm(value: string | undefined | null): string {
  return (value || "").trim().toLowerCase();
}

/**
 * "Similar Events" for /startup-events/[slug]. Filled in three tiers until there are
 * SIMILAR_EVENTS_COUNT cards: (1) other events in the same city, (2) other events in the same
 * country, from other cities, (3) any other upcoming event. Each tier is soonest-first, and the
 * page's own event is never included.
 *
 * Works off the same upcoming-only region map as /events (getEventsByRegion), so "city" means the
 * /events city bucket (a Gurugram event counts as Delhi NCR) and "country" is the one that event's
 * section sits under (resolveCountry). An event that isn't in that map (already ended, unlisted)
 * falls back to its own city/location and country fields.
 */
export function pickSimilarEvents(
  current: StartupEvent,
  eventsByRegion: Record<string, StartupEvent[]>,
  count = SIMILAR_EVENTS_COUNT,
): StartupEvent[] {
  const currentKey = eventKey(current);
  const tagged: { event: StartupEvent; region: string; country: string }[] = [];
  let currentRegion = "";
  let currentCountry = "";
  for (const [region, events] of Object.entries(eventsByRegion)) {
    if (!events || events.length === 0) continue;
    const country = resolveCountry(region, events);
    for (const event of events) {
      if (eventKey(event) === currentKey) {
        currentRegion = region;
        currentCountry = country;
      } else {
        tagged.push({ event, region, country });
      }
    }
  }
  if (!currentRegion) {
    currentRegion = current.city || current.location || "";
    currentCountry = canonicalCountryName(current.country || "");
  }

  const seen = new Set<string>([currentKey]);
  const picked: StartupEvent[] = [];
  const take = (matches: (t: (typeof tagged)[number]) => boolean) => {
    const tier = tagged
      .filter((t) => !seen.has(eventKey(t.event)) && matches(t))
      .sort((a, b) => eventDateSortKey(a.event) - eventDateSortKey(b.event));
    for (const { event } of tier) {
      if (picked.length >= count) return;
      // An event can sit in more than one region bucket (legacy duplicates) — show it once.
      if (seen.has(eventKey(event))) continue;
      seen.add(eventKey(event));
      picked.push(event);
    }
  };

  if (currentRegion) take((t) => norm(t.region) === norm(currentRegion));
  if (currentCountry) take((t) => norm(t.country) === norm(currentCountry));
  take(() => true);
  return picked;
}
