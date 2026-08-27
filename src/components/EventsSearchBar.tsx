"use client";

import { useMemo, useState } from "react";
import type { StartupEvent } from "@/lib/data-adapter";
import { getEventImage } from "@/lib/event-utils";
import { EventByCountryCard } from "@/components/EventByCountryCard";

interface EventsSearchBarProps {
  /** Every event on the page, flattened and deduped — searched regardless of which
   * country/city carousel it normally lives under, so a match always surfaces directly
   * instead of requiring the visitor to find the right region section first. */
  allEvents: StartupEvent[];
  /** The normal region-grouped carousels — shown as-is while the search box is empty. */
  children: React.ReactNode;
}

/** Collapses internal whitespace and trims — so "  Startup   Summit " and "Startup Summit"
 * are treated identically, and a stray extra space (typed by mistake, or pasted in) never
 * hides an otherwise-matching event. */
function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function EventsSearchBar({ allEvents, children }: EventsSearchBarProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalize(query);

  const results = useMemo(() => {
    if (!normalizedQuery) return null;
    return allEvents.filter((event) => normalize(event.title).includes(normalizedQuery));
  }, [allEvents, normalizedQuery]);

  return (
    <div className="event-search">
      <div className="event-search-bar">
        <svg className="event-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events by name…"
          aria-label="Search events by name"
          className="event-search-input"
        />
        {query && (
          <button
            type="button"
            className="event-search-clear"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {results === null ? (
        children
      ) : results.length === 0 ? (
        <div className="event-search-empty">
          No events match &ldquo;{query.trim()}&rdquo;. Try a different name.
        </div>
      ) : (
        <section className="event-by-country-section">
          <h2 className="event-by-country-region">
            {results.length} event{results.length === 1 ? "" : "s"} found
          </h2>
          <ul className="event-by-country-list">
            {results.map((event, index) => (
              <EventByCountryCard
                key={String(event.id ?? event.slug ?? `${event.url}-${index}`)}
                event={event}
                imageUrl={getEventImage(event)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
