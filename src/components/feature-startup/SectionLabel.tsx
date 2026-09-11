"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "./hooks";

/** Small editorial label ("SPOTLIGHT") that opens most sections below the hero. Deliberately quiet — it exists to mark where a section starts, not to compete with the
 * heading underneath it. `tone` picks the palette for dark-background sections.
 *
 * It used to lead with a section number ("03 / SPOTLIGHT") and then, after that went, with a short
 * pink rule. Both were removed on request, and the `index` prop with them — so nothing has to be
 * renumbered when a section is added or dropped. The label is now the word alone. */
export function SectionLabel({
  children,
  align = "center",
  tone = "light",
}: {
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
      <span className="fys-label-text">{children}</span>
    </motion.p>
  );
}
