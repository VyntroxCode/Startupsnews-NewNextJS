/** Every photograph used on /submit-press-release, in one place.
 *
 * These are DUMMY placeholders (Unsplash, each URL verified resolving with `curl -I` before it was
 * added). Swapping in real StartupNews.fyi assets should mean editing this file and nothing else —
 * no component imports an image URL directly, and the scroll-story sequence below is built from
 * these same entries. When the real assets land, revisit the `alt` strings with them: the copy
 * here describes the editorial ROLE each slot plays, which is the most that can honestly be said
 * about a placeholder — and one of them has already proved wrong once the page was seen in a
 * browser: the `evidence` slot is a photograph of banknotes, which is a poor match for a chapter
 * about sources and documentation. Treat every `alt` and every subject here as unverified until
 * someone has actually looked at the rendered page.
 *
 * `w=1600` on the full-bleed/hero slots and `w=1000` on the inset ones keeps the payload sane —
 * next/image re-encodes and serves the right width per breakpoint anyway (see next.config.ts,
 * which already allow-lists images.unsplash.com). */
export interface PressImage {
  src: string;
  alt: string;
}

export const pressReleaseImages = {
  hero: {
    src: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1600&q=80&auto=format&fit=crop",
    alt: "Printed newspapers stacked on a press desk",
  },
  news: {
    src: "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=1200&q=80&auto=format&fit=crop",
    alt: "A stack of freshly printed newspapers",
  },
  context: {
    src: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&q=80&auto=format&fit=crop",
    alt: "A team talking through a plan around a table",
  },
  people: {
    src: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=1200&q=80&auto=format&fit=crop",
    alt: "A founder photographed for an editorial profile",
  },
  evidence: {
    src: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1200&q=80&auto=format&fit=crop",
    alt: "Banknotes scattered across a surface",
  },
  story: {
    src: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80&auto=format&fit=crop",
    alt: "A team reviewing notes around a table",
  },
  newsroom: {
    src: "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=1600&q=80&auto=format&fit=crop",
    alt: "Microphones set up ahead of a press briefing",
  },
  pressKit: {
    src: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1000&q=80&auto=format&fit=crop",
    alt: "Notes being written out longhand",
  },
  finalCta: {
    src: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1400&q=80&auto=format&fit=crop",
    alt: "A team in discussion before an announcement",
  },
} as const satisfies Record<string, PressImage>;

/** The five chapters of the sticky scroll story (section 10 of the page). Text and image travel
 * together so a chapter can never drift out of sync with its photograph. */
export interface StoryChapter {
  n: string;
  title: string;
  description: string;
  image: PressImage;
}

export const PRESS_STORY_CHAPTERS: StoryChapter[] = [
  {
    n: "01",
    title: "The News",
    description:
      "Start with what actually happened. One clear sentence — the launch, the raise, the milestone, the partnership — before any of the framing around it.",
    image: pressReleaseImages.news,
  },
  {
    n: "02",
    title: "The Context",
    description:
      "Explain why the announcement matters. What changed because of it, who it affects, and what the situation looked like before.",
    image: pressReleaseImages.context,
  },
  {
    n: "03",
    title: "The People",
    description:
      "Tell us who is involved. Founders, teams, partners, investors — the names our desk should attribute the story to and can follow up with.",
    image: pressReleaseImages.people,
  },
  {
    n: "04",
    title: "The Evidence",
    description:
      "Give us the sources and supporting material. Links, official pages, data, documentation — anything that lets an editor verify what you have told us.",
    image: pressReleaseImages.evidence,
  },
  {
    n: "05",
    title: "The Story",
    description:
      "Help us understand the bigger picture. Where this sits in your journey, and why it is worth the reader's attention today rather than at some other time.",
    image: pressReleaseImages.story,
  },
];
