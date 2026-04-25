"use client";

import type { StartupEvent } from "@/lib/data-adapter";

interface EventCardProps {
  event: StartupEvent;
}

export function EventCard({ event }: EventCardProps) {
  const detailUrl = event.slug ? `/startup-events/${event.slug}` : event.url;
  const isInternal = Boolean(event.slug);

  const handleBookClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Always open booking URL in new tab (external URL)
    window.open(event.url, '_blank');
  };

  return (
    <li className="startupnews-event-card">
      <a 
        href={detailUrl} 
        {...(isInternal ? {} : { rel: "noopener noreferrer", target: "_blank" })}
        className="startupnews-event-link"
      >
        <div className="startupnews-event-content-wrapper">
          <div className="startupnews-event-header">
            <span className="startupnews-event-location">{event.location.toUpperCase()}</span>
            <button 
              className="startupnews-event-book-btn" 
              type="button" 
              onClick={handleBookClick}
            >
              <span className="startupnews-event-book-icon">+</span>
              <span>Book</span>
            </button>
          </div>
          <h3 className="startupnews-event-title-text">{event.title}</h3>
        </div>
      </a>
    </li>
  );
}

