"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "./hooks";

const WORDS = [
  "Press Release",
  "Startup News",
  "Founders",
  "Product Launches",
  "Innovation",
  "Company Stories",
  "Press Desk",
  "Funding & Investment",
  "Research & Reports",
];

/** Slow right→left marquee under the hero — a newsroom furniture element rather than a headline,
 * so it moves at a reading-adjacent pace (56 seconds for a full pass) instead of the frantic
 * scroll of a stock ticker.
 *
 * The word list is rendered twice inside one track and the track is animated by exactly -50%, so
 * the second copy is in the first copy's starting position at the moment the loop restarts and the
 * seam is invisible. `aria-hidden` on the duplicate keeps a screen reader from reading the list
 * twice. Under reduced motion the track simply sits still. */
export function EditorialTicker() {
  const reducedMotion = useReducedMotion();

  const row = (hidden: boolean) => (
    <ul className="pr-ticker-row" aria-hidden={hidden || undefined}>
      {WORDS.map((word) => (
        <li key={word}>
          {word}
          <span className="pr-ticker-dot" aria-hidden="true">
            •
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="pr-ticker">
      <motion.div
        className="pr-ticker-track"
        animate={reducedMotion ? {} : { x: ["0%", "-50%"] }}
        transition={{ duration: 56, repeat: Infinity, ease: "linear" }}
      >
        {row(false)}
        {row(true)}
      </motion.div>
    </div>
  );
}
