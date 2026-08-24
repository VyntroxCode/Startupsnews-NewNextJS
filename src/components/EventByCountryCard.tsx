"use client";

import { useState } from "react";
import Image from "next/image";
import type { StartupEvent } from "@/lib/data-adapter";
import { getStartupEventDetailPath } from "@/lib/event-utils";

interface EventByCountryCardProps {
  event: StartupEvent;
  imageUrl: string;
}

/**
 * Shared event card for /events and /events/[slug].
 * Layout: image, content (date, title, excerpt).
 */
export function EventByCountryCard({ event, imageUrl }: EventByCountryCardProps) {
  const detailUrl = getStartupEventDetailPath(event);
  const isInternal = detailUrl.startsWith("/");
  const rawSummary = event.excerpt || event.description || "";
  const summaryText = rawSummary
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const displaySummary = summaryText || "Discover event details, agenda, and registration information.";
  const [loaded, setLoaded] = useState(false);

  return (
    <li className="event-by-country-card">
      <a
        href={detailUrl}
        {...(isInternal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
        className="event-by-country-card-link"
        aria-label={`View event: ${event.title}`}
      >
        <div className={`event-by-country-card-img${loaded ? "" : " event-by-country-card-img-loading"}`}>
          <Image
            src={imageUrl}
            alt={event.title}
            fill
            // These are ~380-475px on screen (3-per-row desktop carousel), never a full-bleed
            // hero/LCP image — quality 60 is visually indistinguishable at that size and cuts
            // payload noticeably vs. the site-wide default of 90 (see next.config.ts qualities).
            quality={60}
            sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw"
            style={{ objectFit: "contain" }}
            className="event-by-country-card-img-main"
            onLoad={() => setLoaded(true)}
          />
        </div>
        <div className="event-by-country-card-content">
          <span className="event-by-country-date">{event.dateRange}</span>
          {event.location && (
            <span className="event-by-country-venue">{event.location}</span>
          )}
          <h3 className="event-by-country-card-title">{event.title}</h3>
          <p className="event-by-country-excerpt">{displaySummary}</p>
        </div>
      </a>
    </li>
  );
}
