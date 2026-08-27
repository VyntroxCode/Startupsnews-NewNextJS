import Link from "next/link";
import { getEventsByRegion } from "@/lib/data-adapter";
import { EventsCarousel } from "@/components/EventsCarousel";
import { EventsSearchBar } from "@/components/EventsSearchBar";
import type { StartupEvent } from "@/modules/events/domain/types";

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
// Labels that aren't a place at all — used here only to suppress the redundant city sub-heading
// EventsCarousel would otherwise render underneath a section already named after that same label.
const NON_GEOGRAPHIC_REGIONS = new Set(["Cohort", "Online", "Other Cities", "International Events"]);

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
    // Prefer the event's own real `country` (set from the partnership tracker's Region/Country
    // field — see syncLinkedEvent) over guessing from the city name via REGION_COUNTRY, which
    // only recognizes a small hardcoded list of cities: any city not on that list (e.g.
    // "Mathura") used to silently become its own top-level section instead of nesting under
    // India. Falls back to the old guess only for events created before `country` existed.
    const country = events.find((e) => e.country?.trim())?.country?.trim() || REGION_COUNTRY[region] || region;
    if (!grouped[country]) grouped[country] = {};
    grouped[country][region] = events;
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
          <header className="event-by-country-header">
            <h2 className="event-by-country-title">Events</h2>
            <p className="event-by-country-subtitle">Discover startup and technology events by region.</p>
          </header>
          <div className="mvp-main-blog-out left relative event-by-country-out">
            <div className="mvp-main-blog-in event-by-country-in">
              <div className="mvp-main-blog-body left relative event-by-country-body">
                <EventsSearchBar allEvents={allEvents}>
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
