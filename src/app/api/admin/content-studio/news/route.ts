import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/shared/middleware/auth.middleware";
import { CONTENT_STUDIO_ROLES } from "@/shared/middleware/roles";
import { fetchFeedItems, type RssItem } from "@/modules/content-studio/lib/feeds/rss";
import { fetchArticlePage, domainOf } from "@/modules/content-studio/lib/feeds/extract";
import {
  buildNewsJobs,
  googleNewsSearchURL,
  normalizeCustomSource,
  whenQualifier,
  withinTimeRange,
} from "@/modules/content-studio/lib/data/newsSources";
import type { Article, CustomNewsSource, NewsSourceInfo } from "@/modules/content-studio/types";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

interface NewsRequest {
  customSources: CustomNewsSource[];
  timeRange: string;
}

/**
 * POST /api/admin/content-studio/news — fan out across every trending news source.
 *
 * Ported from `fetchTrendingNews` (content-studio-v17.html:1480-1520). The
 * per-source cap, link dedupe, timeScoped filtering and pubDate sort all match
 * the original; only the transport changed (direct fetch, no CORS proxies).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, CONTENT_STUDIO_ROLES);
  if (auth instanceof NextResponse) return auth;

  let body: NewsRequest;
  try {
    body = (await request.json()) as NewsRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const customSources = (Array.isArray(body?.customSources) ? body.customSources : []).map(
    normalizeCustomSource,
  );
  const timeRange = body?.timeRange || "all";

  const jobs = buildNewsJobs(customSources, timeRange);

  // Narrower time windows have fewer candidates to filter from, so pull more items per
  // source when a window is active (was capped at 12 regardless of window, which starved
  // 4h/12h filtering of enough raw items to find matches). fullFeed sources (Google News
  // sections and anything the user added) skip the cap and return the whole feed.
  const perSourceCap = timeRange === "all" ? 12 : 24;

  // Results are collected per job and merged in job order, not arrival order, so the
  // link de-dupe below is deterministic instead of depending on which fetch won the race.
  const perJob: Article[][] = jobs.map(() => []);
  const errors: string[] = [];

  await Promise.all(
    jobs.map(async (src, i) => {
      let items: RssItem[] = [];
      let timeScoped = src.timeScoped;
      let failure = "";
      try {
        items = await fetchFeedItems(src.url);
      } catch (e) {
        failure = e instanceof Error ? e.message : "no results";
      }

      // Google News section feeds intermittently come back as an empty channel (seen
      // live on the Semiconductors/Computing section), and a quiet section can have
      // nothing inside a short time window. Either way, fall back to a Google News
      // search for the same topic, which can take the "when:" window.
      const inWindow = timeScoped
        ? items
        : items.filter((it) => withinTimeRange(it.pubDate, timeRange));
      if (!inWindow.length && src.fallbackQuery) {
        try {
          items = await fetchFeedItems(
            googleNewsSearchURL(src.fallbackQuery + whenQualifier(timeRange)),
          );
          timeScoped = true;
          failure = "";
        } catch (e) {
          failure ||= e instanceof Error ? e.message : "no results";
        }
      }

      if (failure) {
        errors.push(`${src.label} (${failure})`);
        return;
      }

      for (const it of src.fullFeed ? items : items.slice(0, perSourceCap)) {
        perJob[i].push({
          ...it,
          feedName: src.label,
          feedUrl: src.id,
          feedColor: src.color,
          source: domainOf(it.link) || "news.google.com",
          timeScoped,
        });
      }
    }),
  );

  // fullFeed sources (the GN sections and user-added sources) claim shared stories first,
  // so a section chip is never emptied by the same story also appearing in a search.
  let articles: Article[] = [
    ...perJob.filter((_, i) => jobs[i].fullFeed).flat(),
    ...perJob.filter((_, i) => !jobs[i].fullFeed).flat(),
  ];

  // Also pull in any direct-article custom sources.
  await Promise.all(
    customSources
      .filter((s) => s.type === "article")
      .map(async (s) => {
        try {
          const page = await fetchArticlePage(s.url ?? "");
          articles.push({
            title: page.title,
            link: s.url ?? "#",
            pubDate: new Date().toISOString(),
            desc: page.excerpt,
            fullText: page.text.slice(0, 100000),
            feedName: s.label,
            feedUrl: s.id,
            feedColor: s.color,
            source: domainOf(s.url ?? ""),
            timeScoped: false,
          });
        } catch (e) {
          errors.push(
            `${s.label} (${e instanceof Error ? e.message : "fetch failed"})`,
          );
        }
      }),
  );

  // De-dupe by link. Only re-apply the pubDate filter to items that were NOT already
  // narrowed server-side (timeScoped:false) — re-filtering already-narrowed search
  // results against a raw pubDate was silently zeroing out valid 4h/12h results, since
  // Google's "when:" freshness window and an article's own listed pubDate don't always
  // line up exactly. Trust the query-level narrowing for timeScoped sources instead.
  const seen = new Set<string>();
  articles = articles.filter((a) => {
    if (seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });

  if (timeRange !== "all") {
    articles = articles.filter(
      (a) => a.timeScoped || withinTimeRange(a.pubDate, timeRange),
    );
  }

  articles.sort(
    (a, b) =>
      new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime(),
  );

  // Every source, including ones that returned nothing, so the UI can show a chip for each.
  const sources: NewsSourceInfo[] = [
    ...jobs,
    ...customSources.filter((s) => s.type === "article"),
  ].map((s) => ({ id: s.id, label: s.label, color: s.color }));

  return Response.json({ articles, errors, sources });
}
