"use client";

import type { SponsorEventFormData } from "./types";
import { CalendarIcon, PinIcon } from "./icons";

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(value: string): string {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** Live preview beside the form — a pure read-out of the real form state (title, location, date,
 * time, poster), so filling the form reads as building an event listing. Nothing here is persisted
 * separately. It now shows from the start with muted placeholders, so the column never pops in. */
export function EventPreviewCard({ data }: { data: SponsorEventFormData }) {
  const date = formatDate(data.date);
  const time = formatTime(data.time);
  const when = [date, time].filter(Boolean).join(" · ");

  return (
    <div className="sp-preview-card">
      <div className="sp-preview-top">
        <span className="sp-preview-kicker">
          <span className="sp-preview-pulse" aria-hidden="true" />
          Live preview
        </span>
        <span className="sp-preview-brand">StartupNews.fyi</span>
      </div>
      <div
        className={"sp-preview-poster" + (data.posterUrl ? " has-image" : "")}
        style={data.posterUrl ? { backgroundImage: `url('${data.posterUrl}')` } : undefined}
      >
        {!data.posterUrl && <span className="sp-preview-poster-placeholder">Your poster</span>}
      </div>
      <div className="sp-preview-body">
        <p className={"sp-preview-title" + (data.title ? "" : " is-empty")}>{data.title || "Your event title"}</p>
        <p className={"sp-preview-row" + (data.location ? "" : " is-empty")}>
          <PinIcon />
          {data.location || "City, Country"}
        </p>
        <p className={"sp-preview-row" + (when ? "" : " is-empty")}>
          <CalendarIcon />
          {when || "Date · Time"}
        </p>
      </div>
      <p className="sp-preview-footer">Fills in as you type</p>
    </div>
  );
}
