"use client";

import { motion, useReducedMotion } from "motion/react";
import { fadeUpSmall, numberReveal, FR_VIEWPORT } from "./motion";

/** Shared "01 — Chapter Name" editorial header used by every chapter section — big ghost-outline
 * number, small uppercase eyebrow, serif title, supporting copy. Each piece reveals on its own
 * slight delay as the chapter scrolls into view, rather than all at once. */
export function ChapterHeader({
  n,
  eyebrow,
  title,
  lede,
}: {
  n: string;
  eyebrow: string;
  title: string;
  lede: string;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <div className="fr-chapter-head">
      <motion.div
        className="fr-chapter-number"
        initial={reducedMotion ? false : "hidden"}
        whileInView="show"
        viewport={FR_VIEWPORT}
        variants={numberReveal}
      >
        {n}
      </motion.div>
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
