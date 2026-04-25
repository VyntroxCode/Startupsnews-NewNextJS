/**
 * Client-safe event utilities
 * These functions don't import server-side code (database, Redis, etc.)
 */

import type { StartupEvent } from '@/modules/events/domain/types';

// Default event image
const DEFAULT_EVENT_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80";

/**
 * Get event image URL (client-safe version)
 * Returns the event's image or a default placeholder
 */
export function getEventImage(event: StartupEvent): string {
  return event.image || DEFAULT_EVENT_IMAGE;
}

/**
 * On-site event detail URL path (`/startup-events/{slug}`).
 * Falls back to parsing `event.url` when it already points at `/startup-events/...`.
 */
export function getStartupEventDetailPath(event: Pick<StartupEvent, "slug" | "url">): string {
  const slug = (event.slug || "").trim();
  if (slug) {
    return `/startup-events/${slug}`;
  }
  const raw = (event.url || "").trim();
  if (!raw) return "/events";
  try {
    const u = new URL(raw);
    const path = (u.pathname || "/").replace(/\/+$/, "") || "/";
    if (path.startsWith("/startup-events/")) {
      return `${path}${u.search || ""}`;
    }
  } catch {
    if (raw.startsWith("/startup-events/")) {
      return raw.split("#")[0] || "/events";
    }
  }
  return raw;
}
