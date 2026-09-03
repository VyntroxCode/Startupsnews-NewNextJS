import Link from "next/link";
import { getEventsByRegion } from "@/lib/data-adapter";
import { EventsCarousel } from "@/components/EventsCarousel";
import { EventsSearchBar } from "@/components/EventsSearchBar";
import type { StartupEvent } from "@/modules/events/domain/types";
import { OTHER_CITIES_SECTION, canonicalCountryName, isOwnSectionCity } from "@/modules/partnership-events/domain/country-city-data";
import { eventDateSortKey } from "@/modules/partnership-events/utils/public-event.utils";

import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

// event_regions is a flat list mixing cities, countries, and a few non-geographic labels (e.g.
// "Online", "Cohort") with no country field of its own — this maps the city-level ones to the
// country they belong under for the page's country-name headings. A region NOT listed
// here (already a country name, e.g. "Australia", or unrecognized) falls back to using its own
// name as the country bucket, so it still renders sensibly as its own top-level section.
const REGION_COUNTRY: Record<string, string> = {
  Bengaluru: "India", "Delhi NCR": "India", Mumbai: "India", Hyderabad: "India",
  Chennai: "India", Ahmedabad: "India", Pune: "India", Jaipur: "India",
  Nalgonda: "India", "West Bengal": "India", Alibhag: "India",
  Dubai: "UAE", "Abu Dhabi": "UAE",
  Amsterdam: "Netherlands", Berlin: "Germany", Madrid: "Spain", Riyadh: "Saudi Arabia",
};
// Labels that aren't a place at all. Two jobs: they keep their own sub-heading rather than being
// swept into "Other Cities" with the one-off city names, and the sub-heading is suppressed when
// it would only repeat the country heading directly above it.
// "Other Cities" is deliberately NOT in this set any more — it is now a real heading the page
// renders (see groupByCountry). The `city !== country` test below already covers the case it was
// added for, where a region with no country of its own becomes both the country and city label.
const NON_GEOGRAPHIC_REGIONS = new Set(["Cohort", "Online", "International Events"]);

/**
 * The country a whole region belongs to, decided by MAJORITY of its events rather than by the
 * first one that happens to carry a country.
 *
 * A region is one city, so its events should all agree — but one mistyped row used to decide for
 * every event in that city. Real case: of the 8 upcoming Dubai events, 6 said UAE, 1 said India
 * and 1 was blank; the India one was earliest by date, and since the list arrives date-ascending
 * the old `events.find(e => e.country)` handed the whole Dubai carousel to India. A majority
 * cannot be flipped by a single bad row.
 *
 * Names are canonicalised before tallying, so "uae" and "UAE " count as the same country instead
 * of splitting the vote — and so the heading itself comes out in one consistent spelling.
 * Ties go to whichever country appears first, i.e. on the earliest event, matching the old rule.
 */
function resolveCountry(region: string, events: StartupEvent[]): string {
  const tally = new Map<string, number>();
  for (const event of events) {
    const name = canonicalCountryName(event.country || "");
    if (name) tally.set(name, (tally.get(name) ?? 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  for (const [name, count] of tally) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  // No event in this region carries a country at all — fall back to the old city->country guess,
  // then to the region's own name, exactly as before.
  return best || REGION_COUNTRY[region] || region;
}

/** Regroups the flat region -> events map into country -> city -> events. Countries come out
 * India-first, then alphabetically — regions are keyed alphabetically by city/region name at
 * the source (event_regions ORDER BY name ASC), which otherwise puts whichever city happens to
 * sort first (e.g. "Abu Dhabi") ahead of India regardless of it being the primary market.
 * Events within each city are already ascending by date from the query that builds
 * eventsByRegion (events.repository's ORDER BY event_date ASC), so that part needs no sorting
 * here — only the country-level order needs fixing. */
function groupByCountry(eventsByRegion: Record<string, StartupEvent[]>): Record<string, Record<string, StartupEvent[]>> {
  const grouped: Record<string, Record<string, StartupEvent[]>> = {};
  for (const [region, events] of Object.entries(eventsByRegion)) {
    if (!events || events.length === 0) continue;
    // Prefer the events' own real `country` (set from the partnership tracker's Region/Country
    // field — see syncLinkedEvent) over guessing from the city name via REGION_COUNTRY, which
    // only recognizes a small hardcoded list of cities: any city not on that list (e.g.
    // "Mathura") used to silently become its own top-level section instead of nesting under
    // India. Falls back to the old guess only for events created before `country` existed.
    const country = resolveCountry(region, events);
    // Cities we don't curate a list entry for share one "Other Cities" carousel per country
    // instead of each getting a section of its own — the common case being a country where we
    // list a single event in a single city, which used to render as a one-card row with a
    // heading. Each card still names its own city, so nothing is lost by merging them.
    // A region that IS the country ("India" with no city set) or a non-place label ("Online")
    // keeps its own section.
    const section =
      region === country || NON_GEOGRAPHIC_REGIONS.has(region) || isOwnSectionCity(country, region)
        ? region
        : OTHER_CITIES_SECTION;
    if (!grouped[country]) grouped[country] = {};
    // Merge rather than assign — several regions now collapse onto the same section key.
    grouped[country][section] = [...(grouped[country][section] || []), ...events];
  }
  for (const country of Object.keys(grouped)) {
    const others = grouped[country][OTHER_CITIES_SECTION];
    if (!others) continue;
    // Each source region arrived date-ascending, but concatenating several of them interleaves
    // them wrongly — this is the one section built from more than one region, so it's the one
    // that has to be re-sorted. Every other section keeps the order the query gave it.
    others.sort((a, b) => eventDateSortKey(a) - eventDateSortKey(b));
    // And "Other Cities" is the catch-all, so it reads last under its country regardless of
    // where its constituent regions happened to sort.
    const sections = Object.entries(grouped[country]);
    if (sections.length > 1) {
      grouped[country] = Object.fromEntries([
        ...sections.filter(([name]) => name !== OTHER_CITIES_SECTION),
        [OTHER_CITIES_SECTION, others],
      ]);
    }
  }
  const orderedEntries = Object.entries(grouped).sort(([a], [b]) => {
    if (a === "India") return -1;
    if (b === "India") return 1;
    return a.localeCompare(b);
  });
  return Object.fromEntries(orderedEntries);
}

export const revalidate = 60;
// Prevent build-time DB access; render at request time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Startup Events by Region",
  description: "Discover upcoming startup and technology events across Dubai, Delhi NCR, Bengaluru, Hyderabad, Mumbai, and more.",
  alternates: { canonical: `${SITE_URL}/events` },
  openGraph: {
    title: "Startup Events by Region – StartupNews.fyi",
    description: "Discover upcoming startup and technology events across global regions.",
    url: `${SITE_URL}/events`,
    siteName: "StartupNews.fyi",
    type: "website",
  },
};


export default async function EventsPage() {
  const eventsByRegion = await getEventsByRegion();
  const eventsByCountry = groupByCountry(eventsByRegion);
  // Deduped by slug (falling back to id) — a handful of legacy/duplicate rows can otherwise
  // appear twice in the flat region map, which would show the same card twice in search results.
  const allEvents = Array.from(
    new Map(
      Object.values(eventsByRegion).flat().map((event) => [event.slug || event.id || event.url, event])
    ).values()
  );

  return (
    <div className="mvp-main-blog-wrap left relative mvp-main-blog-marg event-by-country-page">
      <div className="mvp-main-box event-by-country-container">
        <div className="mvp-main-blog-cont left relative">
          <nav className="event-by-country-breadcrumb" aria-label="Breadcrumb">
            <Link href="/" className="event-by-country-breadcrumb-link">
              Home
            </Link>
            <span className="event-by-country-breadcrumb-separator" aria-hidden="true">
              /
            </span>
            <span className="event-by-country-breadcrumb-current" aria-current="page">
              Events
            </span>
          </nav>
          <div className="mvp-main-blog-out left relative event-by-country-out">
            <div className="mvp-main-blog-in event-by-country-in">
              <div className="mvp-main-blog-body left relative event-by-country-body">
                <EventsSearchBar
                  allEvents={allEvents}
                  title="Events"
                  subtitle="Discover startup and technology events by region."
                >
                  {Object.entries(eventsByCountry).map(([country, cities]) => (
                    <section key={country} className="event-by-country-section">
                      <h2 className="event-by-country-region">{country}</h2>
                      {Object.entries(cities).map(([city, events]) => (
                        <div key={city} className="event-by-country-city-group">
                          <EventsCarousel
                            events={events}
                            maxEvents={events.length}
                            title={city !== country && !NON_GEOGRAPHIC_REGIONS.has(city) ? city : null}
                            className="event-country-carousel"
                          />
                        </div>
                      ))}
                    </section>
                  ))}
                </EventsSearchBar>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
