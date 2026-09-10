"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";

/** The opening of nearly every section below the hero: a small numbered running-order label
 * ("03 / THE PRESS DESK"), the section heading, and an optional lede.
 *
 * Deliberately one component rather than three: the brief asks for a magazine running order the
 * reader can follow down the page, which only works if the label, its pink marker and the heading
 * keep identical proportions and identical timing everywhere they appear. The pieces still enter
 * in sequence (label → marker draw → heading → lede) rather than together, which is what gives the
 * page its rhythm. */
export function SectionIntro({
  index,
  label,
  heading,
  lede,
  headingId,
}: {
  index: string;
  label: string;
  heading: ReactNode;
  lede?: ReactNode;
  headingId?: string;
}) {
  const reducedMotion = useReducedMotion();
  const rise = (delay: number) => ({
    initial: reducedMotion ? false : { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.5 },
    transition: { duration: 0.7, delay, ease: PR_EASE },
  });

  return (
    <div className="pr-intro">
      <motion.p className="pr-eyebrow" {...rise(0)}>
        <span className="pr-eyebrow-n">{index}</span>
        <motion.span
          className="pr-eyebrow-rule"
          aria-hidden="true"
          initial={reducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55, delay: 0.18, ease: PR_EASE }}
        />
        <span className="pr-eyebrow-text">{label}</span>
      </motion.p>
      <motion.h2 className="pr-h2" id={headingId} {...rise(0.14)}>
        {heading}
      </motion.h2>
      {lede ? (
        <motion.p className="pr-lede" {...rise(0.26)}>
          {lede}
        </motion.p>
      ) : null}
    </div>
  );
}
