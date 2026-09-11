/** Every photograph used on /submit-press-release, in one place.
 *
 * These are placeholders (Unsplash) until real StartupNews.fyi assets exist. Swapping them should
 * mean editing this file and nothing else — no component imports an image URL directly.
 *
 * Every photograph below has been DOWNLOADED AND LOOKED AT, and its `alt` describes what is
 * actually in the frame. That is not pedantry: the first pass at this file picked images by
 * guessing from URL slugs, and two of them were badly wrong — a slot meant to show research
 * documents was a photograph of banknotes, and the full-bleed "newsroom" was a phone screenshot of
 * a news app. If you add a slot here, fetch the image and look at it before you write its alt.
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
    alt: "Folded newspapers fanned out, open at the business pages",
  },
  // Replaced the original photo here (a phone screenshot of a news app — wrong subject, and far
  // too small-scale for a full-bleed section) with a broadcast desk that holds up at full width.
  newsroom: {
    src: "https://images.unsplash.com/photo-1589903308904-1010c2294adc?w=1600&q=80&auto=format&fit=crop",
    alt: "A studio microphone and headphones beside an audio editing screen",
  },
  pressKit: {
    src: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1000&q=80&auto=format&fit=crop",
    alt: "Notes being written out longhand",
  },
  finalCta: {
    src: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1400&q=80&auto=format&fit=crop",
    alt: "A team presenting to colleagues around a boardroom table",
  },
  // One per editorial-standards row — each picked to answer that row's question in a picture.
  standardNews: {
    src: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1000&q=80&auto=format&fit=crop",
    alt: "A typewriter with the word News typed on the sheet in its carriage",
  },
  standardRelevance: {
    src: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1000&q=80&auto=format&fit=crop",
    alt: "Someone on a bench reading a newspaper held open in front of them",
  },
  standardContext: {
    src: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1000&q=80&auto=format&fit=crop",
    alt: "People talking around a table, taking notes in open notebooks",
  },
  standardPeople: {
    src: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=1000&q=80&auto=format&fit=crop",
    alt: "An editorial portrait of a person in a jacket against a bright window",
  },
  // One per text-only section, so neither of the two longest reads on the page is a wall of type.
  process: {
    src: "https://images.unsplash.com/photo-1681949103006-70066fb25dfe?w=1000&q=80&auto=format&fit=crop",
    alt: "Two people pinning printed pages onto boards on a studio wall while colleagues work at the table below",
  },
  policy: {
    src: "https://images.unsplash.com/photo-1565688534245-05d6b5be184a?w=1000&q=80&auto=format&fit=crop",
    alt: "Two people going through a marked-up printed document across a pale wooden table, one holding a pen",
  },
  standardEvidence: {
    src: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1000&q=80&auto=format&fit=crop",
    alt: "Printed documents and statements spread across a desk beside a calculator",
  },
} as const satisfies Record<string, PressImage>;
