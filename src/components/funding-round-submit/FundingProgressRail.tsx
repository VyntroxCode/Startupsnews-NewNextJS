"use client";

import { CHAPTERS } from "./chapters";

/** Sticky chapter navigator — a vertical rail on desktop, a horizontal sticky bar on mobile (pure
 * CSS breakpoint swap, see `.fr-rail` in globals.css). Purely presentational: `activeId` is driven
 * by FundingRoundPage's scroll-spy IntersectionObserver, `onSelect` smooth-scrolls to a chapter.
 * Deliberately built as a plain nav list rather than a numbered wizard — no "step 2 of 4" text,
 * just which chapter is current/done/upcoming, so it reads as editorial rather than administrative.
 * It did print a small "01"/"02" beside each label; that went with the rest of the page's numbering. */
export function FundingProgressRail({
  activeId,
  submitted,
  onSelect,
}: {
  activeId: string;
  submitted: boolean;
  onSelect: (id: string) => void;
}) {
  const activeIndex = CHAPTERS.findIndex((c) => c.id === activeId);

  return (
    <nav className="fr-rail" aria-label="Submission progress">
      <ol className="fr-rail-list">
        {CHAPTERS.map((chapter, i) => {
          const isActive = !submitted && chapter.id === activeId;
          const isDone = submitted || i < activeIndex;
          return (
            <li key={chapter.id}>
              <button
                type="button"
                className={"fr-rail-item" + (isActive ? " active" : "") + (isDone ? " done" : "")}
                onClick={() => onSelect(chapter.id)}
                aria-current={isActive ? "step" : undefined}
              >
                <span className="fr-rail-label">{chapter.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
