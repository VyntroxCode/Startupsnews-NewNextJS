"use client";

import { getAuthHeaders } from "@/lib/admin-auth";
import { useCallback } from "react";

import {
  useSettings,
  useSourceDispatch,
} from "@/modules/content-studio/lib/state/StudioProvider";
import { useToast } from "@/modules/content-studio/lib/state/toast";
import { CUSTOM_SOURCE_PALETTE, googleNewsFeedUrl } from "@/modules/content-studio/lib/data/newsSources";
import type { Article, CustomNewsSource, NewsSourceInfo, TrendItem } from "@/modules/content-studio/types";

/** Fetch the trending news fan-out. Replaces `fetchTrendingNews` (1480). */
export function useFetchTrending() {
  const dispatch = useSourceDispatch();
  const { customSources, timeRange } = useSettings();
  const toast = useToast();

  // `range` lets a caller that just changed the window fetch with the new value — the
  // settings update hasn't re-rendered yet, so this closure's `timeRange` is still the old one.
  return useCallback(async (range?: string) => {
    dispatch({ type: "newsFetching" });
    try {
      const res = await fetch("/api/admin/content-studio/news", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ customSources, timeRange: range ?? timeRange }),
      });
      const data = (await res.json()) as {
        articles: Article[];
        errors: string[];
        sources?: NewsSourceInfo[];
      };
      const articles = data.articles ?? [];
      const errors = data.errors ?? [];
      dispatch({ type: "newsLoaded", articles, errors, sources: data.sources });

      if (articles.length) {
        toast(
          `${articles.length} stories loaded` +
            (errors.length ? ` · ${errors.length} source(s) failed` : ""),
          errors.length ? "warning" : "success",
        );
      } else {
        toast("Could not fetch trending news — " + (errors[0] ?? "unknown error"), "error");
      }
    } catch {
      dispatch({ type: "newsLoaded", articles: [], errors: ["Network error"] });
      toast("Fetch failed", "error");
    }
  }, [customSources, timeRange, dispatch, toast]);
}

/** Fetch Google Trends "Trending now" (US) for one window and category (18 = Tech, 0 = all). */
export function useFetchTrends() {
  const dispatch = useSourceDispatch();

  return useCallback(
    async (hours: number, category: number) => {
      dispatch({ type: "trendsFetching", hours, category });
      try {
        const res = await fetch("/api/admin/content-studio/trends", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ hours, category }),
        });
        const data = (await res.json()) as { trends?: TrendItem[]; error?: string };
        dispatch({
          type: "trendsLoaded",
          trends: data.trends ?? [],
          error: data.error ?? null,
        });
      } catch {
        dispatch({ type: "trendsLoaded", trends: [], error: "Network error" });
      }
    },
    [dispatch],
  );
}

/** Import one article by URL. Replaces `fetchURL` (1131). */
export function useImportUrl() {
  const dispatch = useSourceDispatch();
  const toast = useToast();

  return useCallback(
    async (url: string) => {
      const trimmed = url.trim();
      if (!trimmed) {
        toast("Paste a URL first", "warning");
        return;
      }
      dispatch({ type: "urlFetching" });
      try {
        const res = await fetch("/api/admin/content-studio/extract", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ url: trimmed }),
        });
        const data = await res.json();

        if (!res.ok) {
          dispatch({ type: "urlFailed", error: data.error ?? "Could not fetch" });
          return;
        }

        const host = (() => {
          try {
            return new URL(trimmed).hostname.replace(/^www\./, "");
          } catch {
            return trimmed;
          }
        })();

        dispatch({
          type: "urlLoaded",
          article: {
            title: data.title,
            link: trimmed,
            pubDate: new Date().toISOString(),
            desc: data.excerpt,
            fullText: data.text,
            feedName: host,
            feedUrl: "",
            feedColor: "#e8186d",
            source: host,
            isURLImport: true,
          },
        });

        if (data.isHomepage) {
          toast("That looks like a homepage, not an article — check the result", "warning");
        }
      } catch {
        dispatch({ type: "urlFailed", error: "Network error" });
      }
    },
    [dispatch, toast],
  );
}

/**
 * Classify and add a custom news source.
 * Replaces `addCustomNewsSource` / `classifyCustomSource` (1312-1388).
 */
export function useAddCustomSource() {
  const { customSources, setCustomSources } = useSettings();
  const toast = useToast();

  return useCallback(
    async (raw: string) => {
      const value = raw.trim();
      if (!value) return;

      const color =
        CUSTOM_SOURCE_PALETTE[customSources.length % CUSTOM_SOURCE_PALETTE.length];
      const id = "cs_" + Math.random().toString(36).slice(2, 9);

      let entry: CustomNewsSource;
      const looksLikeUrl = /^https?:\/\//i.test(value);
      const looksLikeHost = /^[\w-]+(\.[\w-]+)+$/.test(value);

      const gnFeed = looksLikeUrl ? googleNewsFeedUrl(value) : null;

      if (gnFeed) {
        entry = { id, label: "Google News", color, type: "feed", url: gnFeed };
      } else if (looksLikeUrl) {
        const u = new URL(value);
        const isFeed = /(\.xml|\/feed\/?|\/rss\/?|atom)/i.test(u.pathname);
        const isArticle = u.pathname.split("/").filter(Boolean).length > 0 && !isFeed;
        entry = isFeed
          ? { id, label: u.hostname.replace(/^www\./, ""), color, type: "feed", url: value }
          : isArticle
            ? {
                id,
                label: u.hostname.replace(/^www\./, ""),
                color,
                type: "article",
                url: value,
              }
            : {
                id,
                label: u.hostname.replace(/^www\./, ""),
                color,
                type: "site",
                host: u.hostname,
              };
      } else if (looksLikeHost) {
        entry = { id, label: value, color, type: "site", host: value };
      } else {
        entry = { id, label: value, color, type: "topic", query: value };
      }

      // For bare sites, try to find the site's own feed once and cache it.
      if (entry.type === "site" && entry.host) {
        try {
          const res = await fetch("/api/admin/content-studio/discover", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ host: entry.host }),
          });
          const { feedUrl } = (await res.json()) as { feedUrl: string | null };
          if (feedUrl) entry.discoveredFeedUrl = feedUrl;
        } catch {
          /* fall back to a Google News site: search */
        }
      }

      setCustomSources([...customSources, entry]);
      toast(`Added ${entry.label}`, "success");
    },
    [customSources, setCustomSources, toast],
  );
}
