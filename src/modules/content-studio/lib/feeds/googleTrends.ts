import "server-only";

import { BROWSER_UA } from "./safeFetch";
import { fetchFeedItems } from "./rss";
import { domainOf } from "./extract";
import { googleNewsSearchURL } from "@/modules/content-studio/lib/data/newsSources";
import type { TrendItem } from "@/modules/content-studio/types";

// ══════════════════════════════════════════════════════════════════
// Google Trends "Trending now" (trends.google.com/trending?geo=US&category=18).
//
// The public RSS feed (trends.google.com/trending/rss) ignores `category` — it
// returns the same general top-10 whatever category is asked for — and every
// item shares one <link>, so the news route's link de-dupe collapsed it to a
// single story. The Trending Now page itself loads its list from the `i0OFE`
// batchexecute RPC; this calls the same RPC and filters by category, which is
// exactly what the page does client-side.
//
// Row layout, verified against the live response:
//   [0] term  [3] [startEpochSec]  [4] [endEpochSec] | null while still active
//   [6] search volume  [8] % increase  [9] related queries  [10] category ids
// ══════════════════════════════════════════════════════════════════

const RPC_URL =
  "https://trends.google.com/_/TrendsUi/data/batchexecute?rpcids=i0OFE";
const TIMEOUT_MS = 15000;

export const TRENDS_GEO = "US";
export const TRENDS_CATEGORY_TECH = 18;
/** 0 = every category, as on trends.google.com/trending?geo=US. */
export const TRENDS_CATEGORY_ALL = 0;

// All categories returns a few hundred trends a day; each one costs a Google News lookup
// for its headlines, so keep the top of the list (it is sorted the way the page sorts it).
const MAX_TRENDS = 50;
const HEADLINE_CONCURRENCY = 10;

/** The windows the Trending Now page offers. */
export const TREND_HOURS = [4, 24, 48, 168] as const;

type Row = unknown[];

async function fetchTrendRows(geo: string, hours: number): Promise<Row[]> {
  const req = JSON.stringify([null, null, geo, 0, "en-US", hours, 1]);
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: {
      "User-Agent": BROWSER_UA,
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: new URLSearchParams({
      "f.req": JSON.stringify([[["i0OFE", req, null, "generic"]]]),
    }).toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Google Trends HTTP ${res.status}`);

  // Response is `)]}'` then length-prefixed JSON chunks; the payload is in the wrb.fr line.
  const line = (await res.text())
    .split("\n")
    .find((l) => l.includes('"wrb.fr"'));
  if (!line) throw new Error("Unexpected Google Trends response");
  const payload = (JSON.parse(line) as unknown[][])[0]?.[2];
  if (typeof payload !== "string")
    throw new Error("Google Trends returned no data");
  const rows = (JSON.parse(payload) as unknown[])[1];
  return Array.isArray(rows) ? (rows as Row[]) : [];
}

const num = (v: unknown): number => (typeof v === "number" ? v : 0);
const epoch = (v: unknown): number => (Array.isArray(v) ? num(v[0]) : 0);

/** Top Google News headlines for a trend, so Generate has a real article to work from. */
async function headlinesFor(term: string): Promise<TrendItem["articles"]> {
  try {
    const items = await fetchFeedItems(googleNewsSearchURL(term + " when:7d"));
    return items.slice(0, 3).map((it) => {
      // Google News titles end in " - Publisher".
      const cut = it.title.lastIndexOf(" - ");
      return {
        title: cut > 0 ? it.title.slice(0, cut) : it.title,
        source: cut > 0 ? it.title.slice(cut + 3) : domainOf(it.link),
        link: it.link,
        pubDate: it.pubDate,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchTrends(opts: {
  hours: number;
  category?: number;
  geo?: string;
}): Promise<TrendItem[]> {
  const geo = opts.geo ?? TRENDS_GEO;
  const category = opts.category ?? TRENDS_CATEGORY_TECH;
  const rows = await fetchTrendRows(geo, opts.hours);

  // A term that spiked more than once in the window appears once per spike; keep the latest.
  const byTerm = new Map<string, TrendItem>();
  for (const r of rows) {
    const term = typeof r[0] === "string" ? r[0] : "";
    const categories = Array.isArray(r[10]) ? (r[10] as number[]) : [];
    if (!term) continue;
    if (category !== TRENDS_CATEGORY_ALL && !categories.includes(category))
      continue;

    const started = epoch(r[3]);
    const prev = byTerm.get(term);
    if (prev && new Date(prev.started).getTime() >= started * 1000) continue;

    const ended = epoch(r[4]);
    byTerm.set(term, {
      term,
      started: new Date(started * 1000).toISOString(),
      ended: ended ? new Date(ended * 1000).toISOString() : null,
      volume: num(r[6]),
      increasePct: num(r[8]),
      related: (Array.isArray(r[9]) ? (r[9] as string[]) : [])
        .filter((q) => q !== term)
        .slice(0, 6),
      articles: [],
    });
  }

  // Active trends first, then by search volume — the page's default ordering.
  const trends = [...byTerm.values()]
    .sort(
      (a, b) => Number(!!a.ended) - Number(!!b.ended) || b.volume - a.volume,
    )
    .slice(0, MAX_TRENDS);

  // In batches, so 50 trends don't fire 50 Google News requests at once.
  for (let i = 0; i < trends.length; i += HEADLINE_CONCURRENCY) {
    await Promise.all(
      trends.slice(i, i + HEADLINE_CONCURRENCY).map(async (t) => {
        t.articles = await headlinesFor(t.term);
      }),
    );
  }

  return trends;
}
