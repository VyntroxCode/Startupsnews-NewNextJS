"use client";

import { motion, useReducedMotion } from "motion/react";
import { fadeUpSmall, FR_VIEWPORT } from "./motion";

/** Shared editorial header used by every chapter section — small uppercase eyebrow, serif title,
 * supporting copy. Each piece reveals on its own slight delay as the chapter scrolls into view,
 * rather than all at once.
 *
 * It opened with a big ghost-outline number ("01", "02") until all numbering was removed from this
 * page on request; `numberReveal` in motion.ts went unused with it. */
export function ChapterHeader({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede: string;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <div className="fr-chapter-head">
      <motion.p
        className="fr-eyebrow fr-chapter-eyebrow"
        initial={reducedMotion ? false : "hidden"}
        whileInView="show"
        viewport={FR_VIEWPORT}
        variants={fadeUpSmall}
        transition={{ delay: 0.1 }}
      >
        {eyebrow}
      </motion.p>
      <motion.h2
        className="fr-chapter-title"
        initial={reducedMotion ? false : "hidden"}
        whileInView="show"
        viewport={FR_VIEWPORT}
        variants={fadeUpSmall}
        transition={{ delay: 0.18 }}
      >
        {title}
      </motion.h2>
      <motion.p
        className="fr-chapter-lede"
        initial={reducedMotion ? false : "hidden"}
        whileInView="show"
        viewport={FR_VIEWPORT}
        variants={fadeUpSmall}
        transition={{ delay: 0.26 }}
      >
        {lede}
      </motion.p>
    </div>
  );
}
