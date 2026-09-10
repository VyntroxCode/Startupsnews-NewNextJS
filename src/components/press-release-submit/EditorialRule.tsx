"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";

/** A hairline rule that draws itself left→right once when it enters the viewport. Reduced-motion
 * users get the fully-drawn rule immediately instead of the sweep. */
export function EditorialRule() {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className="pr-rule"
      initial={reducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.8, ease: PR_EASE }}
    />
  );
}
