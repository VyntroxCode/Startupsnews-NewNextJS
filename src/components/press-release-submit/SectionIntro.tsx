"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";

/** The opening of every section below the hero: a small label, the section heading, and an
 * optional lede.
 *
 * It opened with a running-order number ("03 / THE PRESS DESK") and a short pink marker that drew
 * out beside it; both were removed on request, along with the `index` prop, so nothing has to be
 * renumbered when a section is added or dropped — and five sections were dropped in the same pass.
 *
 * Deliberately one component rather than three: the label and heading keep identical proportions
 * and identical timing everywhere they appear. The pieces still enter in sequence (label → heading
 * → lede) rather than together, which is what gives the page its rhythm. */
export function SectionIntro({
  label,
  heading,
  lede,
  headingId,
}: {
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
