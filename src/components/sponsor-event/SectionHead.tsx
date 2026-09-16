"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "./hooks";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Kicker + heading + optional lede that opens most sections.
 *
 * No running-order numbers ("01 / 02 / 03") anywhere — the kicker word opens each section on its
 * own, so nothing has to be renumbered when a section moves. The three lines arrive one after
 * another, each lifting out of a light blur. `ground` swaps the palette for dark sections. */
export function SectionHead({
  kicker,
  title,
  lede,
  id,
  align = "center",
  ground = "light",
}: {
  kicker: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  /** Put on the <h2> so the section's `aria-labelledby` can point at it. */
  id?: string;
  align?: "center" | "left";
  ground?: "light" | "dark";
}) {
  const reducedMotion = useReducedMotion();
  const rise = (delay: number) =>
    reducedMotion
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 26, filter: "blur(6px)" },
          whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
          viewport: { once: true, amount: 0.5 },
          transition: { duration: 0.85, delay, ease: EASE },
        };

  return (
    <header className={`sp-head sp-head-${align} sp-head-${ground}`}>
      <motion.p className="sp-head-kicker" {...rise(0)}>
        {kicker}
      </motion.p>
      <motion.h2 id={id} className="sp-head-title" {...rise(0.12)}>
        {title}
      </motion.h2>
      {lede ? (
        <motion.p className="sp-head-lede" {...rise(0.24)}>
          {lede}
        </motion.p>
      ) : null}
    </header>
  );
}
