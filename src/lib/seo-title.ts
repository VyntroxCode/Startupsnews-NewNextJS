import type { Metadata } from "next";

export const MAX_TITLE_LENGTH = 70;
const BRAND = "StartupNews.fyi";
const SEPARATOR = " | ";

/** Builds a <title> of at most MAX_TITLE_LENGTH characters. `parts` are joined with " | " and the
 * brand is appended last; while the result is too long, suffixes are dropped from the end — the
 * brand first, then any section label like "Startup Events" — so the headline itself is kept. A
 * headline that is still too long on its own is cut at a word boundary with an ellipsis.
 * Returned as `absolute` so the root layout's "%s | StartupNews.fyi" template can't re-append it. */
export function seoTitle(...parts: string[]): Metadata["title"] {
  const segments = [...parts.map((p) => p.trim()).filter(Boolean), BRAND];
  while (segments.length > 1 && segments.join(SEPARATOR).length > MAX_TITLE_LENGTH) segments.pop();
  return { absolute: truncate(segments.join(SEPARATOR), MAX_TITLE_LENGTH) };
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s|,:;–-]+$/, "")}…`;
}
