"use client";

import { useState } from "react";

import { cn } from "@/modules/content-studio/lib/cn";
import type { Article } from "@/modules/content-studio/types";

// ── .ni list row (content-studio-v17.html:173-182, 1624-1632) ──
// Shared by the RSS list and the trending list.

/** The original used inline onerror= (lines 1565, 1625), which React ignores. */
function Favicon({ article }: { article: Article }) {
  const [failed, setFailed] = useState(false);
  const letter = (article.feedName || "?").charAt(0).toUpperCase();

  const host = (() => {
    try {
      return new URL(article.link).hostname;
    } catch {
      return "";
    }
  })();

  return (
    <div className="mt-px flex size-[22px] shrink-0 items-center justify-center overflow-hidden rounded-md border border-cs-edge bg-cs-s2 text-[9px] font-bold text-cs-t2">
      {failed || !host ? (
        letter
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://www.google.com/s2/favicons?sz=32&domain=${host}`}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

/** content-studio-v17.html:1634 — locale formatting runs client-side only. */
export function formatDate(d: string): string {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ArticleRow({
  article,
  selected,
  onSelect,
}: {
  article: Article;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "flex cursor-pointer items-start gap-[9px] border-b border-cs-edge px-3.5 py-[11px] transition-colors",
        selected
          ? "border-l-[3px] border-l-cs-accent bg-cs-abg pl-[11px]"
          : "hover:bg-cs-s2",
      )}
    >
      <Favicon article={article} />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-1.5 text-cs-label font-semibold text-cs-t2">
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ background: article.feedColor }}
          />
          {article.feedName}
          {article.pubDate ? ` · ${formatDate(article.pubDate)}` : ""}
        </div>
        <div className="text-cs-ui leading-[1.35] font-semibold text-cs-ink">
          {article.title}
        </div>
        {article.desc ? (
          <div className="line-clamp-2 mt-0.5 text-cs-meta leading-[1.3] text-cs-t3">
            {article.desc}
          </div>
        ) : null}
      </div>
    </div>
  );
}
