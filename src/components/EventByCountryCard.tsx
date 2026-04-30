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

  return (
    <li className="event-by-country-card">
      <a
        href={detailUrl}
        {...(isInternal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
        className="event-by-country-card-link"
        aria-label={`View event: ${event.title}`}
      >
        <div className="event-by-country-card-img">
          <div
            className="event-by-country-card-img-bg"
            style={{ backgroundImage: `url(${imageUrl})` }}
            aria-hidden
          />
          <Image
            src={imageUrl}
            alt={event.title}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw"
            style={{ objectFit: "contain" }}
            className="event-by-country-card-img-main"
          />
        </div>
        <div className="event-by-country-card-content">
          <span className="event-by-country-date">
            {event.date}
            {event.eventTime ? ` - ${event.eventTime}` : ""}
            {event.eventEndDate ? ` to ${event.eventEndDate}` : ""}
            {event.eventEndTime ? ` - ${event.eventEndTime}` : ""}
          </span>
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
