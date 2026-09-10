"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "./hooks";

const EASE = [0.22, 1, 0.36, 1] as const;

/** The numbered kicker + heading + optional lede that opens most sections.
 *
 * One component rather than repeated markup so the page's running order (01 … 12) and the heading
 * rhythm stay consistent across fourteen sections; `tone` swaps the palette for the light
 * sections in the middle of the page. */
export function SectionHead({
  index,
  kicker,
  title,
  lede,
  align = "center",
  tone = "dark",
}: {
  index: string;
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
          initial: { opacity: 0, y: 22 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.5 },
          transition: { duration: 0.6, delay, ease: EASE },
        };

  return (
    <header className={`sp-head sp-head-${align} sp-head-${tone}`}>
      <motion.p className="sp-head-kicker" {...rise(0)}>
        <span className="sp-head-n">{index}</span>
        <span className="sp-head-rule" aria-hidden="true" />
        {kicker}
      </motion.p>
      <motion.h2 className="sp-head-title" {...rise(0.08)}>
        {title}
      </motion.h2>
      {lede ? (
        <motion.p className="sp-head-lede" {...rise(0.16)}>
          {lede}
        </motion.p>
      ) : null}
    </header>
  );
}
