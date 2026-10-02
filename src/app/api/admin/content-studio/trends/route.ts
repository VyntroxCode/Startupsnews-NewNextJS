import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/shared/middleware/auth.middleware";
import { CONTENT_STUDIO_ROLES } from "@/shared/middleware/roles";
import {
  fetchTrends,
  TREND_HOURS,
  TRENDS_CATEGORY_TECH,
} from "@/modules/content-studio/lib/feeds/googleTrends";
import { TREND_CATEGORIES } from "@/modules/content-studio/lib/data/newsSources";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/content-studio/trends — Google Trends "Trending now" for the US.
 * Body: { hours: 4 | 24 | 48 | 168, category: a TREND_CATEGORIES id (0 = all) }.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, CONTENT_STUDIO_ROLES);
  if (auth instanceof NextResponse) return auth;

  let body: { hours?: number; category?: number };
  try {
    body = (await request.json()) as { hours?: number; category?: number };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const hours = (TREND_HOURS as readonly number[]).includes(Number(body?.hours))
    ? Number(body.hours)
    : 24;
  const category = TREND_CATEGORIES.some((c) => c.id === Number(body?.category))
    ? Number(body.category)
    : TRENDS_CATEGORY_TECH;

  try {
    return Response.json({ trends: await fetchTrends({ hours, category }) });
  } catch (e) {
    return Response.json(
      {
        trends: [],
        error: e instanceof Error ? e.message : "Could not load Google Trends",
      },
      { status: 502 },
    );
  }
}
