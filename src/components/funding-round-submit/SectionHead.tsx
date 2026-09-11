"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "./hooks";
import { FR_EASE } from "./motion";

/** The opening of every section below the hero: a label, a rule that draws out from it, the
 * heading, and an optional lede.
 *
 * It carried a running-order number ("01", "02"…) ahead of the label, then a short accent rule in
 * its place; both were removed on request, so the label now opens the section on its own and the
 * component has nothing left that animates independently of the three lines below.
 *
 * One component rather than three so the running order the reader follows down the page keeps
 * identical proportions and identical timing everywhere it appears. The parts still arrive in
 * sequence — label, rule, heading, lede — which is what gives the page its cadence; the sections
 * below then each animate their *content* in their own language. */
export function SectionHead({
  label,
  heading,
  lede,
  headingId,
  align = "left",
}: {
  label: string;
  heading: ReactNode;
  lede?: ReactNode;
  headingId?: string;
  align?: "left" | "center";
}) {
  const reducedMotion = useReducedMotion();
  const rise = (delay: number) => ({
    initial: reducedMotion ? false : { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.5 },
    transition: { duration: 0.7, delay, ease: FR_EASE },
  });

  return (
    <div className={`fr-head fr-head-${align}`}>
      <motion.p className="fr-eyebrow" {...rise(0)}>
        <span className="fr-eyebrow-label">{label}</span>
      </motion.p>
      <motion.h2 className="fr-h2" id={headingId} {...rise(0.12)}>
        {heading}
      </motion.h2>
      {lede ? (
        <motion.p className="fr-lede" {...rise(0.22)}>
          {lede}
        </motion.p>
      ) : null}
    </div>
  );
}
