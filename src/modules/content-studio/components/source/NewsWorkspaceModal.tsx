"use client";

import { Newspaper, Search, TrendingUp, X, Zap, type LucideIcon } from "lucide-react";

import { Button, EmptyState, Spinner } from "@/modules/content-studio/components/ui";
import { Modal } from "@/modules/content-studio/components/ui/Modal";
import { useSource, useSourceDispatch } from "@/modules/content-studio/lib/state/StudioProvider";
import { useFetchTrending } from "@/modules/content-studio/lib/hooks/useFetchers";
import { useGenerate } from "@/modules/content-studio/lib/hooks/useGenerate";
import { NewsSourceBar, TimeRangeSelect, useShownTrending } from "./NewsPanel";
import { formatDate } from "./ArticleRow";
import { TrendsSection } from "./TrendsSection";

// ── FULL-SCREEN NEWS WORKSPACE (content-studio-v17.html:440-458, 1575-1616) ──
// Shares NewsSourceBar and TimeRangeSelect with the sidebar panel — both read
// the same context, which removes the original's hand-synced
// [el1, el2].forEach DOM poking (lines 1413, 1422, 1481, 1551).

export function NewsWorkspaceModal() {
  const { newsFetching, newsTab } = useSource();
  const dispatch = useSourceDispatch();
  const fetchTrending = useFetchTrending();
  const generate = useGenerate();
  const shown = useShownTrending();

  const close = () => dispatch({ type: "setNewsFullscreen", open: false });

  return (
    <Modal
      open
      onClose={close}
      z={9990}
      backdrop={false}
      className="flex min-h-0 w-full flex-1 flex-col"
    >
      <div className="flex shrink-0 items-center gap-3.5 border-b border-cs-edge bg-cs-surface px-6 py-3 shadow-cs-soft">
        <div className="flex items-center gap-2 font-cs-serif text-lg font-semibold">
          <Newspaper aria-hidden className="size-[18px] shrink-0 text-cs-accent" />
          News workspace
        </div>
        <div className="ml-3 flex rounded-full border-[1.5px] border-cs-edge bg-cs-s2 p-0.5">
          {(
            [
              ["news", "News", Newspaper],
              ["trends", "Google Trends", TrendingUp],
            ] as const satisfies readonly (readonly [string, string, LucideIcon])[]
          ).map(([tab, label, Icon]) => (
            <button
              key={tab}
              type="button"
              onClick={() => dispatch({ type: "setNewsTab", tab })}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-cs-ui font-semibold transition-colors ${
                newsTab === tab
                  ? "bg-cs-accent text-white"
                  : "text-cs-t2 hover:text-cs-accent"
              }`}
            >
              <Icon aria-hidden className="size-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {newsTab === "news" ? (
          <>
            <TimeRangeSelect />
            <Button
              variant="primary"
              size="sm"
              disabled={newsFetching}
              onClick={() => fetchTrending()}
            >
              {newsFetching ? (
                <>
                  <Spinner size="sm" /> Fetching…
                </>
              ) : (
                <>
                  <Search aria-hidden className="size-3 shrink-0" />
                  Fetch now
                </>
              )}
            </Button>
          </>
        ) : null}
        <Button size="sm" onClick={close}>
          <X aria-hidden className="size-3 shrink-0" />
          Close
        </Button>
      </div>

      {newsTab === "trends" ? (
        <TrendsSection onGenerate={close} />
      ) : (
        <>
          <NewsSourceBar />

          <div className="shrink-0 border-b border-cs-edge bg-cs-s2 px-6 py-[9px] text-cs-ui text-cs-t2">
            {shown.length
              ? `${shown.length} article${shown.length === 1 ? "" : "s"}`
              : "No articles loaded yet"}
          </div>

          <div className="[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-cs-edge2 grid flex-1 content-start gap-4 overflow-y-auto px-6 pt-[18px] pb-[60px] sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {shown.length === 0 ? (
              <EmptyState icon={Newspaper} className="col-span-full">
                Click <strong>Fetch now</strong> above to pull the latest news
                for Meta, Instagram, Elon Musk, Microsoft, X, SpaceX, WhatsApp,
                Facebook, and the{" "}
                <strong>GN Technology/AI/Semiconductors/Gadgets/Mobile</strong>
                tabs. Trending tech searches are in the{" "}
                <strong>
                  <TrendingUp aria-hidden className="mr-1 inline-block size-3.5 align-[-2px]" />
                  Google Trends
                </strong>{" "}
                tab.
              </EmptyState>
            ) : (
              shown.map((a) => (
                <div
                  key={a.link}
                  className="flex flex-col rounded-cs-panel border-[1.5px] border-cs-edge bg-cs-surface px-[18px] py-4 shadow-cs-soft transition-all duration-150 hover:-translate-y-px hover:border-cs-accent hover:shadow-cs-card"
                >
                  <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold tracking-[.04em] text-cs-t2 uppercase">
                    <span
                      className="size-[7px] shrink-0 rounded-full"
                      style={{ background: a.feedColor }}
                    />
                    {a.feedName}
                    {a.pubDate ? ` · ${formatDate(a.pubDate)}` : ""}
                  </div>
                  <div className="mb-2 font-cs-serif text-[15px] leading-[1.4] font-bold text-cs-ink">
                    {a.title}
                  </div>
                  {a.desc ? (
                    <div className="line-clamp-3 mb-3 flex-1 text-[12.5px] leading-[1.6] text-cs-t3">
                      {a.desc}
                    </div>
                  ) : (
                    <div className="flex-1" />
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => {
                      dispatch({ type: "selectArticle", article: a });
                      close();
                      void generate(a);
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
      )}
    </Modal>
  );
}
