"use client";

import { ArrowDownIcon } from "./icons";

/** Thin "continue to the next chapter" link at the foot of each field chapter — a smooth-scroll
 * cue, not a validation gate. Every field on the page is already mounted and editable regardless
 * of scroll position; this just guides the reader downward the way the hero's own CTA does. */
export function ChapterContinue({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="fr-chapter-continue" onClick={onClick}>
      {label}
      <ArrowDownIcon width={13} height={13} />
    </button>
  );
}
