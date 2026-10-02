"use client";

import { useEffect } from "react";
import { ArrowUp, RefreshCw, TrendingUp, Zap } from "lucide-react";

import { Button, EmptyState, Spinner } from "@/modules/content-studio/components/ui";
import { useSource, useSourceDispatch } from "@/modules/content-studio/lib/state/StudioProvider";
import { useFetchTrends } from "@/modules/content-studio/lib/hooks/useFetchers";
import { useGenerate } from "@/modules/content-studio/lib/hooks/useGenerate";
import { TREND_CATEGORIES } from "@/modules/content-studio/lib/data/newsSources";
import type { Article, TrendItem } from "@/modules/content-studio/types";

// ── GOOGLE TRENDS SECTION ──
// Mirrors trends.google.com/trending?geo=US&category=<id>: searches trending in the US,
// with the page's own category menu and 4h / 24h / 48h / 7-day windows.

const TREND_COLOR = "#673AB7";

const WINDOWS = [
  { hours: 4, label: "Past 4 hours" },
  { hours: 24, label: "Past 24 hours" },
  { hours: 48, label: "Past 48 hours" },
  { hours: 168, label: "Past 7 days" },
];

/** 10000 → "10K+", matching the Trends page. */
function formatVolume(n: number): string {
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M+`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K+`;
  return `${n}+`;
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/**
 * A bare search term is too thin to write from, so generate from the top headline
 * (the pipeline scrapes its full text) and carry the trend context in the description.
 * Falls back to a topic brief when Google News had nothing for the term.
 */
function trendToArticle(t: TrendItem): Article {
  const context =
    `Trending on Google in the US (${formatVolume(t.volume)} searches, ` +
    `+${t.increasePct}%): "${t.term}".` +
    (t.related.length ? ` Related searches: ${t.related.join(", ")}.` : "");
  const top = t.articles[0];

  if (!top)
    return {
      title: t.term,
      link: "#",
      pubDate: t.started,
      desc: context,
      fullText: null,
      feedName: "Google Trends",
      feedUrl: "gtrends",
      feedColor: TREND_COLOR,
      source: "trends.google.com",
      isTopicMode: true,
    };

  return {
    title: top.title,
    link: top.link,
    pubDate: top.pubDate || t.started,
    desc: context,
    feedName: "Google Trends",
    feedUrl: "gtrends",
    feedColor: TREND_COLOR,
    source: top.source,
  };
}

export function TrendsSection({ onGenerate }: { onGenerate: () => void }) {
  const {
    trends,
    trendsHours,
    trendsCategory,
    trendsFetching,
    trendsError,
    trendsLoaded,
  } = useSource();
  const dispatch = useSourceDispatch();
  const fetchTrends = useFetchTrends();
  const generate = useGenerate();

  // Load once when the section is first opened.
  useEffect(() => {
    if (!trendsLoaded && !trendsFetching)
      void fetchTrends(trendsHours, trendsCategory);
  }, [trendsLoaded, trendsFetching, trendsHours, trendsCategory, fetchTrends]);

  const categoryLabel =
    TREND_CATEGORIES.find((c) => c.id === trendsCategory)?.label ??
    "Technology";

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-cs-edge bg-cs-s2 px-6 py-[9px]">
        <span className="flex-1 text-cs-ui text-cs-t2">
          {trendsFetching
            ? "Loading Google Trends…"
            : trendsError
              ? `Could not load Google Trends — ${trendsError}`
              : `${trends.length} trending · ${categoryLabel} · United States` +
                (trends.length >= 50 ? " (top 50)" : "")}
        </span>
        <select
          value={trendsCategory}
          disabled={trendsFetching}
          onChange={(e) =>
            void fetchTrends(trendsHours, Number(e.target.value))
          }
          className="rounded-cs-card border-[1.5px] border-cs-edge2 bg-cs-surface px-[9px] py-1.5 font-cs-sans text-cs-ui text-cs-ink outline-none focus:border-cs-accent"
        >
          {TREND_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={trendsHours}
          disabled={trendsFetching}
          onChange={(e) =>
            void fetchTrends(Number(e.target.value), trendsCategory)
          }
          className="rounded-cs-card border-[1.5px] border-cs-edge2 bg-cs-surface px-[9px] py-1.5 font-cs-sans text-cs-ui text-cs-ink outline-none focus:border-cs-accent"
        >
          {WINDOWS.map((w) => (
            <option key={w.hours} value={w.hours}>
              {w.label}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          disabled={trendsFetching}
          onClick={() => void fetchTrends(trendsHours, trendsCategory)}
        >
          {trendsFetching ? (
            <Spinner size="sm" />
          ) : (
            <RefreshCw aria-hidden className="size-3 shrink-0" />
          )}
          Refresh
        </Button>
      </div>

      <div className="[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-cs-edge2 grid flex-1 content-start gap-4 overflow-y-auto px-6 pt-[18px] pb-[60px] sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {trendsFetching && !trends.length ? (
          <EmptyState icon={TrendingUp} className="col-span-full">
            Loading trending searches…
          </EmptyState>
        ) : !trends.length ? (
          <EmptyState icon={TrendingUp} className="col-span-full">
            {trendsLoaded
              ? `Nothing in ${categoryLabel} is trending in this window — try a longer one.`
              : "Loading trending searches…"}
          </EmptyState>
        ) : (
          trends.map((t) => (
            <div
              key={t.term}
              className="flex flex-col rounded-cs-panel border-[1.5px] border-cs-edge bg-cs-surface px-[18px] py-4 shadow-cs-soft transition-all duration-150 hover:-translate-y-px hover:border-cs-accent hover:shadow-cs-card"
            >
              <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold tracking-[.04em] text-cs-t2 uppercase">
                <span
                  className="size-[7px] shrink-0 rounded-full"
                  style={{
                    background: t.ended ? "var(--color-cs-t3)" : "#34A853",
                  }}
                />
                {t.ended ? "Ended" : "Active"} · started {timeAgo(t.started)}
              </div>

              <a
                href={`https://trends.google.com/explore?q=${encodeURIComponent(t.term)}&geo=US&date=now%207-d`}
                target="_blank"
                rel="noreferrer"
                className="mb-1 font-cs-serif text-[17px] leading-[1.3] font-bold text-cs-ink capitalize hover:text-cs-accent"
              >
                {t.term}
              </a>
              <div className="mb-2.5 text-cs-meta text-cs-t2">
                <strong className="text-cs-ink">{formatVolume(t.volume)}</strong>{" "}
                searches
                {t.increasePct ? (
                  <>
                    {" · "}
                    <ArrowUp aria-label="up" className="inline-block size-3 align-[-2px]" />
                    {` ${t.increasePct}%`}
                  </>
                ) : null}
              </div>

              {t.related.length ? (
                <div className="mb-2.5 flex flex-wrap gap-1">
                  {t.related.map((q) => (
                    <span
                      key={q}
                      className="rounded-full border border-cs-edge bg-cs-s2 px-2 py-px text-[11px] text-cs-t2"
                    >
                      {q}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mb-3 flex flex-1 flex-col gap-1.5">
                {t.articles.length ? (
                  t.articles.map((a) => (
                    <a
                      key={a.link}
                      href={a.link}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-2 text-[12.5px] leading-[1.45] text-cs-t3 hover:text-cs-accent"
                    >
                      <span className="font-semibold text-cs-t2">{a.source}</span>{" "}
                      — {a.title}
                    </a>
                  ))
                ) : (
                  <span className="text-[12.5px] text-cs-t3">
                    No news coverage found — Generate will write from the search
                    term.
                  </span>
                )}
              </div>

              <Button
                variant="primary"
                size="sm"
                className="w-full justify-center"
                onClick={() => {
                  const article = trendToArticle(t);
                  dispatch({ type: "selectArticle", article });
                  onGenerate();
                  void generate(article);
                }}
              >
                <Zap aria-hidden className="size-3 shrink-0 fill-current" />
                Generate
              </Button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
