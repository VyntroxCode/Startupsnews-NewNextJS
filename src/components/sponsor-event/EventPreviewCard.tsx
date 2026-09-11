"use client";

import type { SponsorEventFormData } from "./types";

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }).toUpperCase();
}

/** Live event-identity preview beside the form — updates from the real fields as the visitor
 * types (title, location, date, poster), so the submission reads as "building an event profile"
 * rather than filling boxes. Purely a read-out of `data`; nothing here is invented or persisted
 * separately from the actual form state. Hidden entirely once nothing has been entered yet, so an
 * empty preview card never sits there looking broken before the visitor starts. */
export function EventPreviewCard({ data }: { data: SponsorEventFormData }) {
  const hasContent = Boolean(data.title || data.location || data.date || data.posterUrl);
  if (!hasContent) return null;

  const dateLabel = formatDate(data.date);

  return (
    <div className="sp-preview-card">
      <p className="sp-preview-kicker">EVENT PREVIEW</p>
      <div
        className="sp-preview-poster"
        style={data.posterUrl ? { backgroundImage: `url('${data.posterUrl}')` } : undefined}
      >
        {!data.posterUrl && <span className="sp-preview-poster-placeholder">POSTER</span>}
      </div>
      <div className="sp-preview-body">
        <p className="sp-preview-title">{data.title || "Your Event Title"}</p>
        {data.location && (
          <p className="sp-preview-location">
            <span className="sp-preview-pulse" aria-hidden="true" />
            {data.location}
          </p>
        )}
        {dateLabel && <p className="sp-preview-date">{dateLabel}</p>}
      </div>
      <p className="sp-preview-footer">STARTUPNEWS.FYI</p>
    </div>
  );
}
