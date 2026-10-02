import type { CustomNewsSource, NewsJob, NewsSource, TimeRange } from "@/modules/content-studio/types";

// ── TRENDING NEWS ──
// Fixed company sources + GN topic/section feeds + user custom sources.
// Ported verbatim from content-studio-v17.html:1262-1298.

export const NEWS_SOURCES: NewsSource[] = [
  { id: "meta", label: "Meta", query: "Meta", color: "#0668E1" },
  { id: "instagram", label: "Instagram", query: "Instagram", color: "#E1306C" },
  { id: "elonmusk", label: "Elon Musk", query: '"Elon Musk"', color: "#000000" },
  { id: "microsoft", label: "Microsoft", query: "Microsoft", color: "#00A4EF" },
  {
    id: "twitterx",
    label: "Twitter (X)",
    query: '"Twitter" OR "X platform"',
    color: "#14171A",
  },
  { id: "spacex", label: "SpaceX", query: "SpaceX", color: "#005288" },
  { id: "whatsapp", label: "WhatsApp", query: "WhatsApp", color: "#25D366" },
  { id: "facebook", label: "Facebook", query: "Facebook", color: "#1877F2" },
];

// Google News' own Technology topic and its sub-section tabs (same topic id, different
// section id per tab). These are fixed feed URLs — they cannot take a "when:" time
// qualifier, so they're marked timeScoped:false and rely on date filtering after the fetch.
// fullFeed:true keeps every story in the section (each returns ~40-100) instead of the
// 12-per-source cap used for the company searches. fallbackQuery is searched instead when
// Google serves the section empty (it does, intermittently) or it has nothing in the window.
export const NEWS_GN_SECTIONS: NewsJob[] = [
  {
    id: "gn_latest",
    label: "GN Technology",
    url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en",
    color: "#EA4335",
    timeScoped: false,
    fullFeed: true,
    fallbackQuery: 'technology',
  },
  {
    id: "gn_mobile",
    label: "GN Mobile",
    url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB/sections/CAQiYkNCQVNRd29JTDIwdk1EZGpNWFlTQW1WdUdnSlZVeUlPQ0FRYUNnb0lMMjB2TURVd2F6Z3FId29kQ2hsTlQwSkpURVZmVUVoUFRrVmZVMFZEVkVsUFRsOU9RVTFGSUFFb0FBKioIAComCAoiIENCQVNFZ29JTDIwdk1EZGpNWFlTQW1WdUdnSlZVeWdBUAFQAQ?hl=en-US&gl=US&ceid=US:en",
    color: "#4285F4",
    timeScoped: false,
    fullFeed: true,
    fallbackQuery: 'smartphone OR "mobile phone"',
  },
  {
    id: "gn_gadgets",
    label: "GN Gadgets",
    url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB/sections/CAQiW0NCQVNQZ29JTDIwdk1EZGpNWFlTQW1WdUdnSlZVeUlQQ0FRYUN3b0pMMjB2TURKdFpqRnVLaGtLRndvVFIwRkVSMFZVWDFORlExUkpUMDVmVGtGTlJTQUJLQUEqKggAKiYICiIgQ0JBU0Vnb0lMMjB2TURkak1YWVNBbVZ1R2dKVlV5Z0FQAVAB?hl=en-US&gl=US&ceid=US:en",
    color: "#FBBC05",
    timeScoped: false,
    fullFeed: true,
    fallbackQuery: 'gadgets OR "consumer electronics"',
  },
  {
    id: "gn_ai",
    label: "GN AI",
    url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB/sections/CAQiQ0NCQVNMQW9JTDIwdk1EZGpNWFlTQW1WdUdnSlZVeUlOQ0FRYUNRb0hMMjB2TUcxcmVpb0pFZ2N2YlM4d2JXdDZLQUEqKggAKiYICiIgQ0JBU0Vnb0lMMjB2TURkak1YWVNBbVZ1R2dKVlV5Z0FQAVAB?hl=en-US&gl=US&ceid=US:en",
    color: "#EA4335",
    timeScoped: false,
    fullFeed: true,
    fallbackQuery: '"artificial intelligence" OR "AI model"',
  },
  {
    id: "gn_computing",
    label: "GN Semiconductors",
    url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB/sections/CAQiRkNCQVNMZ29JTDIwdk1EZGpNWFlTQW1WdUdnSlZVeUlPQ0FRYUNnb0lMMjB2TURGc2NITXFDaElJTDIwdk1ERnNjSE1vQUEqKggAKiYICiIgQ0JBU0Vnb0lMMjB2TURkak1YWVNBbVZ1R2dKVlV5Z0FQAVAB?hl=en-US&gl=US&ceid=US:en",
    color: "#4285F4",
    timeScoped: false,
    fullFeed: true,
    fallbackQuery: 'semiconductor OR chipmaker OR "chip maker"',
  },
];

// Google Trends is no longer a news job: its RSS feed ignores the Tech category and every
// item shares one link. It has its own section — see lib/feeds/googleTrends.ts.

export const CUSTOM_SOURCE_PALETTE = [
  "#7c3aed",
  "#059669",
  "#dc2626",
  "#0891b2",
  "#c026d3",
  "#0d9488",
  "#d97706",
  "#e8186d",
];

// Common feed paths tried, in order, when a bare website is added as a custom source —
// lets the app pull directly from the site's own feed instead of only searching Google
// News for mentions of it. First one that returns real items wins and is cached on the
// source so it isn't re-discovered on every fetch.
export const COMMON_FEED_PATHS = [
  "/feed/",
  "/feed",
  "/rss/",
  "/rss",
  "/rss.xml",
  "/atom.xml",
  "/feed.xml",
  "/index.xml",
  "/feeds/posts/default",
];

// ── TIME RANGE FILTER ── content-studio-v17.html:1400-1409
export const TIME_RANGES: TimeRange[] = [
  { id: "all", label: "All time", hours: null },
  { id: "1h", label: "Last 1 hour", hours: 1 },
  { id: "2h", label: "Last 2 hours", hours: 2 },
  { id: "4h", label: "Last 4 hours", hours: 4 },
  { id: "12h", label: "Last 12 hours", hours: 12 },
  { id: "24h", label: "Last 24 hours", hours: 24 },
  { id: "2d", label: "Last 2 days", hours: 48 },
  { id: "7d", label: "Last 7 days", hours: 168 },
];

export function googleNewsSearchURL(query: string): string {
  return (
    "https://news.google.com/rss/search?q=" +
    encodeURIComponent(query) +
    "&hl=en-US&gl=US&ceid=US:en"
  );
}

/**
 * Turn a Google News *web* link (news.google.com/topics/…, /search?q=…, /stories/…) into
 * its RSS equivalent (news.google.com/rss/topics/… etc.). The web pages are ~1.5 MB of
 * JavaScript with no parseable items; the /rss/ form of the same path is a normal feed.
 * Returns null when the URL isn't a Google News listing page.
 */
export function googleNewsFeedUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.hostname !== "news.google.com") return null;

  // Only listings — /articles/… and /read/… are single-story stubs.
  const path = u.pathname.replace(/^\/rss(?=\/|$)/, "") || "/";
  if (!/^\/(topics|search|stories|home)?(\/|$)/.test(path)) return null;

  u.pathname = "/rss" + (path === "/home" || path === "/" ? "" : path);
  if (!u.searchParams.get("hl")) u.searchParams.set("hl", "en-US");
  if (!u.searchParams.get("gl")) u.searchParams.set("gl", "US");
  if (!u.searchParams.get("ceid")) u.searchParams.set("ceid", "US:en");
  return u.toString();
}

/**
 * Sources saved before Google News web links were recognised were classified as a single
 * "article" (or as a feed pointing at the HTML page). Rewrite them to the RSS feed so
 * existing saved sources start working without being re-added.
 */
export function normalizeCustomSource(s: CustomNewsSource): CustomNewsSource {
  if (s.type !== "article" && s.type !== "feed") return s;
  const feed = googleNewsFeedUrl(s.url ?? "");
  if (!feed) return s;
  return {
    ...s,
    type: "feed",
    url: feed,
    label: s.label === "news.google.com" ? "Google News" : s.label,
  };
}

/**
 * Google News search supports a "when:" qualifier (when:1h, when:24h, when:7d, etc.) —
 * bake it into search-based queries so the fetch itself is narrower, not just the display.
 * content-studio-v17.html:1435-1440
 */
export function whenQualifier(rangeId: string): string {
  const t = TIME_RANGES.find((r) => r.id === rangeId);
  if (!t || !t.hours) return "";
  if (t.hours % 24 === 0) return " when:" + t.hours / 24 + "d";
  return " when:" + t.hours + "h";
}

/**
 * Builds the fetch job list: company searches + GN topic/section feeds +
 * every custom source. Search-based jobs (company queries, custom site/topic searches) get
 * the active time window baked into the query itself via "when:Nh" (server-side narrowing,
 * timeScoped:true). Fixed feed URLs (GN sections, direct RSS feeds, discovered
 * site feeds) can't take a query qualifier, so they're timeScoped:false and rely on the
 * pubDate filter instead. Article-type custom sources are NOT included here — they're
 * fetched directly and merged in separately, since they aren't RSS at all.
 *
 * Ported from content-studio-v17.html:1460-1478.
 */
export function buildNewsJobs(
  customSources: CustomNewsSource[],
  rangeId: string,
): NewsJob[] {
  const suffix = whenQualifier(rangeId);

  return [
    ...NEWS_SOURCES.map((s) => ({
      id: s.id,
      label: s.label,
      color: s.color,
      url: googleNewsSearchURL((s.query ?? "") + suffix),
      timeScoped: true,
    })),
    ...NEWS_GN_SECTIONS,
    ...customSources
      .filter((s) => s.type !== "article")
      .map((s): NewsJob => {
        if (s.type === "feed")
          return {
            id: s.id,
            label: s.label,
            color: s.color,
            url: s.url ?? "",
            timeScoped: false,
            fullFeed: true,
          };
        if (s.type === "site") {
          // Use the discovered direct feed if we found one; otherwise fall back to a
          // Google News site: search, which CAN take the time-window suffix.
          if (s.discoveredFeedUrl)
            return {
              id: s.id,
              label: s.label,
              color: s.color,
              url: s.discoveredFeedUrl,
              timeScoped: false,
            fullFeed: true,
            };
          return {
            id: s.id,
            label: s.label,
            color: s.color,
            url: googleNewsSearchURL("site:" + s.host + suffix),
            timeScoped: true,
            fullFeed: true,
          };
        }
        return {
          id: s.id,
          label: s.label,
          color: s.color,
          url: googleNewsSearchURL((s.query ?? "") + suffix),
          timeScoped: true,
          fullFeed: true,
        };
      }),
  ];
}

/** content-studio-v17.html:1441-1448 */
export function withinTimeRange(pubDate: string | undefined, rangeId: string): boolean {
  const t = TIME_RANGES.find((r) => r.id === rangeId);
  if (!t || !t.hours) return true;
  if (!pubDate) return false;
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() <= t.hours * 3600 * 1000;
}

// ── GOOGLE TRENDS CATEGORIES ──
// The category menu on trends.google.com/trending, ids and order as the page lists them
// (?category=<id>). 0 is "All categories".
export const TREND_CATEGORIES: { id: number; label: string }[] = [
  { id: 0, label: "All categories" },
  { id: 1, label: "Autos and Vehicles" },
  { id: 2, label: "Beauty and Fashion" },
  { id: 3, label: "Business and Finance" },
  { id: 20, label: "Climate" },
  { id: 4, label: "Entertainment" },
  { id: 5, label: "Food and Drink" },
  { id: 6, label: "Games" },
  { id: 7, label: "Health" },
  { id: 8, label: "Hobbies and Leisure" },
  { id: 9, label: "Jobs and Education" },
  { id: 10, label: "Law and Government" },
  { id: 11, label: "Other" },
  { id: 13, label: "Pets and Animals" },
  { id: 14, label: "Politics" },
  { id: 15, label: "Science" },
  { id: 16, label: "Shopping" },
  { id: 17, label: "Sports" },
  { id: 18, label: "Technology" },
  { id: 19, label: "Travel and Transportation" },
];
