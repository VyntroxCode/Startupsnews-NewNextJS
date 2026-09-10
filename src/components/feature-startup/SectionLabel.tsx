"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "./hooks";

/** Small numbered editorial label ("03 / SPOTLIGHT") that opens most sections below the hero.
 * Deliberately quiet — it exists to give the page a magazine-like running order, not to compete
 * with the section heading underneath it. `tone` picks the palette for dark-background sections. */
export function SectionLabel({
  index,
  children,
  align = "center",
  tone = "light",
}: {
  index: string;
  children: React.ReactNode;
  align?: "center" | "left";
  tone?: "light" | "dark";
}) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.p
      className={`fys-label fys-label-${align} fys-label-${tone}`}
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="fys-label-n">{index}</span>
      <span className="fys-label-rule" aria-hidden="true" />
      <span className="fys-label-text">{children}</span>
    </motion.p>
  );
}
