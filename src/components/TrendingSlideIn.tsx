"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "./feature-startup/hooks";

const DURATION_S = 2;
/** easeOutQuint — quick off the left edge, then a long gentle settle, so two seconds reads as
 * smooth rather than slow. */
const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, amount: 0.15 } as const;

/** The home hero's Trending column entrance: everything arrives from the left over two seconds.
 *
 * Motion with inline styles rather than classes because the homepage loads neither Tailwind sheet
 * (see `isolated-tailwind.css`), and rather than a wrapper element because the theme's CSS
 * addresses these nodes structurally (`.mvp-feat1-pop-wrap a:first-child .mvp-feat1-pop-cont`,
 * the `mvp-trend` counter on each `a`) — so each piece below REPLACES the theme element and keeps
 * its class names instead of nesting a new one around it.
 *
 * Under reduced motion the same elements render with a zero-length transition: nothing travels,
 * nothing is left hidden. */
function useSlideTransition(delay: number) {
  const reduced = useReducedMotion();
  return reduced ? { duration: 0 } : { duration: DURATION_S, delay, ease: EASE };
}

/** The pink "TRENDING" label. The theme skews this span with a CSS transform, which Motion's own
 * inline transform would replace — so the skew is carried through both keyframes here. */
export function TrendingHeadWord({ children }: { children: React.ReactNode }) {
  const transition = useSlideTransition(0);
  return (
    <motion.span
      className="mvp-feat1-pop-head"
      initial={{ opacity: 0, x: -90, skewX: -15 }}
      whileInView={{ opacity: 1, x: 0, skewX: -15 }}
      viewport={VIEWPORT}
      transition={transition}
    >
      {children}
    </motion.span>
  );
}

/** One Trending story card (image + text). `index` staggers the cards so they follow each other
 * in rather than moving as a single block. */
export function TrendingCard({ index, children }: { index: number; children: React.ReactNode }) {
  const transition = useSlideTransition(Math.min(index, 4) * 0.15);
  return (
    <motion.div
      className="mvp-feat1-pop-cont left relative"
      initial={{ opacity: 0, x: -70 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={VIEWPORT}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

/** The card's category/date line and headline. Travels a little further than the card it sits
 * in, so the words visibly trail the image in from the left and settle at the same moment. */
export function TrendingCardText({ index, children }: { index: number; children: React.ReactNode }) {
  const transition = useSlideTransition(Math.min(index, 4) * 0.15);
  return (
    <motion.div
      className="mvp-feat1-pop-text left relative"
      initial={{ opacity: 0, x: -50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={VIEWPORT}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

/** "Startup Events" label in the hero's right column — the Trending label's mirror image, arriving
 * from the right. Same skew carry-through as `TrendingHeadWord`. */
export function EventsHeadWord({ children }: { children: React.ReactNode }) {
  const transition = useSlideTransition(0);
  return (
    <motion.span
      className="mvp-feat1-pop-head"
      initial={{ opacity: 0, x: 90, skewX: -15 }}
      whileInView={{ opacity: 1, x: 0, skewX: -15 }}
      viewport={VIEWPORT}
      transition={transition}
    >
      {children}
    </motion.span>
  );
}

/** One Startup Events row, arriving from the right. This is the row's inner block, not the `<a>`:
 * the link carries the timeline dot (`::before`) and `overflow: hidden`, so the dot and the dashed
 * line stay put while the text slides in clipped to its own row. */
export function EventsItem({ index, children }: { index: number; children: React.ReactNode }) {
  const transition = useSlideTransition(Math.min(index, 6) * 0.12);
  return (
    <motion.div
      className="mvp-feat1-list-cont left relative"
      initial={{ opacity: 0, x: 70 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={VIEWPORT}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}
