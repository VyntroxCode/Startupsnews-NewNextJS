import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/shared/middleware/auth.middleware";
import { CONTENT_STUDIO_ROLES } from "@/shared/middleware/roles";
import { fetchFeedItems } from "@/modules/content-studio/lib/feeds/rss";
import { COMMON_FEED_PATHS } from "@/modules/content-studio/lib/data/newsSources";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/content-studio/discover — find a site's own RSS feed.
 *
 * Tries the common feed paths in order; the first that returns real items wins.
 * Ported from `discoverSiteFeed` (content-studio-v17.html:1299-1308). The
 * caller caches the result on the source so it isn't re-discovered every fetch.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, CONTENT_STUDIO_ROLES);
  if (auth instanceof NextResponse) return auth;

  let body: { host?: string };
  try {
    body = (await request.json()) as { host?: string };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const host = (body?.host || "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!host) return Response.json({ error: "No host provided" }, { status: 400 });

  for (const path of COMMON_FEED_PATHS) {
    const url = "https://" + host + path;
    try {
      const items = await fetchFeedItems(url);
      if (items.length) return Response.json({ feedUrl: url });
    } catch {
      /* try next path */
    }
  }

  return Response.json({ feedUrl: null });
}
