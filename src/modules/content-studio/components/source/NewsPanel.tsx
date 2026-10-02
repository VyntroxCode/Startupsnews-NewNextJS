"use client";

import { useMemo, useState } from "react";
import { Maximize2, Newspaper, Plus, Search } from "lucide-react";

import { Button, EmptyState, SourcePill, Spinner, TextInput } from "@/modules/content-studio/components/ui";
import { useSettings, useSource, useSourceDispatch } from "@/modules/content-studio/lib/state/StudioProvider";
import { useAddCustomSource, useFetchTrending } from "@/modules/content-studio/lib/hooks/useFetchers";
import { TIME_RANGES } from "@/modules/content-studio/lib/data/newsSources";
import { ArticleRow } from "./ArticleRow";
import { NewsWorkspaceModal } from "./NewsWorkspaceModal";

// ── NEWS PANEL (content-studio-v17.html:570-599) ──

export function TimeRangeSelect() {
  const { timeRange, setTimeRange } = useSettings();
  const { trendingArticles, trendingErrors } = useSource();
  const fetchTrending = useFetchTrending();

  return (
    <select
      value={timeRange}
      onChange={(e) => {
        setTimeRange(e.target.value);
        // The window is baked into the fetch, so stale data is the wrong shape.
        // Only refetch if something was already loaded — an unconditional
        // effect here would fire a 15-request burst on first mount
        // (content-studio-v17.html:1427).
        if (trendingArticles.length || trendingErrors.length) {
          void fetchTrending(e.target.value);
        }
      }}
      className="rounded-cs-card border-[1.5px] border-cs-edge2 bg-cs-surface px-[9px] py-2 font-cs-sans text-cs-ui text-cs-ink outline-none focus:border-cs-accent"
    >
      {TIME_RANGES.map((t) => (
        <option key={t.id} value={t.id}>
          {t.label}
        </option>
      ))}
    </select>
  );
}

export function NewsSourceBar() {
  const { trendingArticles, trendingSources, activeNewsSource } = useSource();
  const dispatch = useSourceDispatch();

  // Start from the full source list so a source with no stories in the current window
  // still gets a chip (showing 0) instead of silently vanishing from the bar.
  const sources = useMemo(() => {
    const seen = new Map<
      string,
      { id: string; label: string; color: string; count: number }
    >();
    for (const s of trendingSources) seen.set(s.id, { ...s, count: 0 });
    for (const a of trendingArticles) {
      const s = seen.get(a.feedUrl);
      if (s) s.count++;
      else
        seen.set(a.feedUrl, {
          id: a.feedUrl,
          label: a.feedName,
          color: a.feedColor,
          count: 1,
        });
    }
    return [...seen.values()];
  }, [trendingArticles, trendingSources]);

  if (!sources.length)
    return (
      <div className="flex min-h-[38px] shrink-0 items-center border-b border-cs-edge bg-cs-s2 px-3 py-[7px]">
        <span className="text-cs-meta text-cs-t2">
          Click &quot;Fetch now&quot; to load trending news
        </span>
      </div>
    );

  return (
    <div className="flex min-h-[38px] shrink-0 flex-wrap items-center gap-[5px] border-b border-cs-edge bg-cs-s2 px-3 py-[7px]">
      <SourcePill
        label="All"
        on={activeNewsSource === "all"}
        onSelect={() => dispatch({ type: "setActiveNewsSource", id: "all" })}
      />
      {sources.map((s) => (
        <SourcePill
          key={s.id}
          label={s.label}
          color={s.color}
          count={s.count}
          on={activeNewsSource === s.id}
          onSelect={() => dispatch({ type: "setActiveNewsSource", id: s.id })}
        />
      ))}
    </div>
  );
}

/** content-studio-v17.html:1535-1539 */
export function useShownTrending() {
  const { trendingArticles, activeNewsSource } = useSource();
  return useMemo(
    () =>
      activeNewsSource === "all"
        ? trendingArticles
        : trendingArticles.filter((a) => a.feedUrl === activeNewsSource),
    [trendingArticles, activeNewsSource],
  );
}

export function NewsPanel({ hidden }: { hidden: boolean }) {
  const { customSources, setCustomSources } = useSettings();
  const { newsFetching, selectedArticle, newsFullscreenOpen } = useSource();
  const dispatch = useSourceDispatch();
  const fetchTrending = useFetchTrending();
  const addCustom = useAddCustomSource();
  const shown = useShownTrending();
  const [custom, setCustom] = useState("");

  return (
    <div
      hidden={hidden}
      className={`min-h-0 flex-1 flex-col overflow-hidden ${hidden ? "hidden" : "flex"}`}
    >
      <div className="shrink-0 border-b border-cs-edge px-3.5 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            className="flex-1 justify-center"
            disabled={newsFetching}
            onClick={() => fetchTrending()}
          >
            {newsFetching ? (
              <>
                <Spinner size="sm" /> Fetching…
              </>
            ) : (
              <>
                <Search aria-hidden className="size-3.5 shrink-0" />
                Fetch now
              </>
            )}
          </Button>
          <TimeRangeSelect />
        </div>

        <Button
          size="sm"
          className="mt-[7px] w-full justify-center"
          onClick={() => dispatch({ type: "setNewsFullscreen", open: true })}
        >
          <Maximize2 aria-hidden className="size-3 shrink-0" />
          Open full-screen view (3 columns)
        </Button>

        <div className="mt-[7px] text-[10.5px] leading-[1.5] text-cs-t3">
          Searches Google News for: Meta, Instagram, Elon Musk, Microsoft, Twitter
          (X), SpaceX, WhatsApp, Facebook — plus Google News technology tabs (
          <strong>GN Technology, AI, Semiconductors, Gadgets,
          Mobile</strong>). Trending tech searches from Google Trends are in the
          full-screen view. Pick a time window above and it re-fetches scoped to that
          window.
        </div>

        <div className="mt-2.5 border-t border-cs-edge pt-2.5">
          <label className="text-cs-label font-bold tracking-[.08em] text-cs-t2 uppercase">
            Add a topic, website, article link, or feed
          </label>
          <div className="mt-[5px] flex gap-1.5">
            <TextInput
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addCustom(custom);
                  setCustom("");
                }
              }}
              placeholder='e.g. "AI regulation", techcrunch.com, a feed URL, or a specific article link'
              className="bg-cs-surface"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                void addCustom(custom);
                setCustom("");
              }}
            >
              <Plus aria-hidden className="size-3 shrink-0" />
              Add
            </Button>
          </div>

          {customSources.length ? (
            <div className="mt-2 flex flex-wrap gap-[5px]">
              {customSources.map((s) => (
                <SourcePill
                  key={s.id}
                  label={s.label}
                  color={s.color}
                  onSelect={() => {}}
                  onRemove={() =>
                    setCustomSources(customSources.filter((x) => x.id !== s.id))
                  }
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <NewsSourceBar />

      <div className="flex shrink-0 items-center gap-2 border-b border-cs-edge bg-cs-surface px-3.5 py-1.5">
        <span className="flex-1 text-cs-meta font-medium text-cs-t2">
          {shown.length
            ? `${shown.length} article${shown.length === 1 ? "" : "s"}`
            : "No articles loaded yet"}
        </span>
      </div>

      <div className="[&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:rounded-[3px] [&::-webkit-scrollbar-thumb]:bg-cs-edge2 flex-1 overflow-y-auto">
        {shown.length === 0 ? (
          <EmptyState icon={Newspaper}>
            Click <strong>Fetch now</strong> above to pull the latest news for
            Meta, Instagram, Elon Musk, Microsoft, X, SpaceX, WhatsApp, Facebook,
            and the <strong>GN Technology/AI/Semiconductors/Gadgets/Mobile</strong>
            tabs — then pick a story to
            generate.
          </EmptyState>
        ) : (
          shown.map((a) => (
            <ArticleRow
              key={a.link}
              article={a}
              selected={selectedArticle?.link === a.link}
              onSelect={() => dispatch({ type: "selectArticle", article: a })}
            />
          ))
        )}
      </div>

      {newsFullscreenOpen ? <NewsWorkspaceModal /> : null}
    </div>
  );
}
