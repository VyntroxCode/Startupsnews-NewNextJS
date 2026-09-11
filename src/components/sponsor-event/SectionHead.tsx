"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "./hooks";

const EASE = [0.22, 1, 0.36, 1] as const;

/** The kicker + heading + optional lede that opens most sections.
 *
 * It carried a running-order number ("01 … 12") and a short rule beside it; both were removed on
 * request along with the `index` prop, so nothing has to be renumbered when a section is added or
 * dropped — and four sections were dropped in the same pass. One component rather than repeated
 * markup so the heading rhythm stays consistent across the page; `tone` swaps the palette for the
 * sections that sit on a different ground. */
export function SectionHead({
  kicker,
  title,
  lede,
  align = "center",
  tone = "dark",
}: {
  kicker: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  align?: "center" | "left";
  tone?: "dark" | "light";
}) {
  const reducedMotion = useReducedMotion();
  const rise = (delay: number) =>
    reducedMotion
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 26 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.5 },
          // Slowed from 0.6s and spaced further apart on request — the kicker, heading and lede
          // should arrive one after another slowly enough to be watched, not land together.
          transition: { duration: 0.95, delay, ease: EASE },
        };

  return (
    <header className={`sp-head sp-head-${align} sp-head-${tone}`}>
      <motion.p className="sp-head-kicker" {...rise(0)}>
        {kicker}
      </motion.p>
      <motion.h2 className="sp-head-title" {...rise(0.18)}>
        {title}
      </motion.h2>
      {lede ? (
        <motion.p className="sp-head-lede" {...rise(0.36)}>
          {lede}
        </motion.p>
      ) : null}
    </header>
  );
}
