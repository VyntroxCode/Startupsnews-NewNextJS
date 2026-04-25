import Link from "next/link";
import type { StartupEvent } from "@/lib/data-adapter";
import { getStartupEventDetailPath } from "@/lib/event-utils";

interface StartupEventsSectionProps {
  events: StartupEvent[];
  showLocationTag?: boolean;
}

export function StartupEventsSection({ events, showLocationTag = true }: StartupEventsSectionProps) {
  const list = Array.isArray(events) ? events : [];
  return (
    <div className="mvp-feat1-list-wrap left relative startup-events-wrap">
      <h3 className="mvp-feat1-pop-head">
        <Link href="/events" className="sn-external-events-link">
          <span className="mvp-feat1-pop-head">Startup Events</span>
        </Link>
      </h3>
      <div id="mvp-feat-tab-col1" className="mvp-feat1-list left relative mvp-tab-col-cont startup-events-list" style={{ display: "block" }}>
        {list.slice(0, 13).map((event) => {
          const detailUrl = getStartupEventDetailPath(event);
          const isInternal = detailUrl.startsWith("/");

          return (
            <a 
              key={event.url || event.id} 
              href={detailUrl} 
              {...(isInternal ? {} : { rel: "noopener noreferrer bookmark", target: "_blank" })}
              className="startup-events-item"
            >
              <div className="mvp-feat1-list-cont left relative">
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
                  <h2>{event.title}</h2>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
