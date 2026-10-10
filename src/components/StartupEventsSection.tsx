import Link from "next/link";
import type { StartupEvent } from "@/lib/data-adapter";
import { getStartupEventDetailPath } from "@/lib/event-utils";
import { EventsHeadWord, EventsItem } from "@/components/TrendingSlideIn";
import { EventsTimelineList } from "@/components/EventsTimelineList";

interface StartupEventsSectionProps {
  events: StartupEvent[];
  showLocationTag?: boolean;
  /** Homepage only: slide the heading and rows in from the right, and grow the red timeline with
   * the scroll (each dot blinks as the line reaches it). Off elsewhere, where this block sits in
   * a sidebar beside an article and should not move. */
  animated?: boolean;
}

export function StartupEventsSection({ events, showLocationTag = true, animated = false }: StartupEventsSectionProps) {
  const list = Array.isArray(events) ? events : [];
  const List = animated ? EventsTimelineList : "div";
  return (
    <div className="mvp-feat1-list-wrap left relative startup-events-wrap">
      <h3 className="mvp-feat1-pop-head">
        <Link href="/events" className="sn-external-events-link">
          {animated ? (
            <EventsHeadWord>Startup Events</EventsHeadWord>
          ) : (
            <span className="mvp-feat1-pop-head">Startup Events</span>
          )}
        </Link>
      </h3>
      <List id="mvp-feat-tab-col1" className="mvp-feat1-list left relative mvp-tab-col-cont startup-events-list" style={{ display: "block" }}>
        {list.slice(0, 13).map((event, index) => {
          const detailUrl = getStartupEventDetailPath(event);
          const isInternal = detailUrl.startsWith("/");
          const text = (
            <div className="mvp-feat1-list-text">
              <div className="mvp-cat-date-wrap left relative">
                {showLocationTag && (
                  <>
                    <span className="mvp-cd-cat left relative">{event.location}</span>
                    <span className="mvp-cd-sep"> / </span>
                  </>
                )}
                <span className="mvp-cd-date left relative">{event.date}</span>
              </div>
              <h2 title={event.title}>{event.title}</h2>
            </div>
          );

          return (
            <a
              key={event.url || event.id}
              href={detailUrl}
              {...(isInternal ? {} : { rel: "noopener noreferrer bookmark", target: "_blank" })}
              className="startup-events-item"
            >
              {animated ? (
                <EventsItem index={index}>{text}</EventsItem>
              ) : (
                <div className="mvp-feat1-list-cont left relative">{text}</div>
              )}
            </a>
          );
        })}
      </List>
    </div>
  );
}
