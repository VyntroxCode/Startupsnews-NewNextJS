"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "./hooks";
import { FR_EASE } from "./motion";

/** The page's last words, between the form and the site's own footer — a full stop rather than a
 * second call to action, so nothing competes with the form directly above it. */
export function FundingClosing() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="fr-closing">
      <div className="fr-container">
        <motion.span
          className="fr-closing-rule"
          aria-hidden="true"
          initial={reducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.9, ease: FR_EASE }}
        />
        <motion.blockquote
          className="fr-closing-quote"
          initial={reducedMotion ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.8, ease: FR_EASE }}
        >
          Capital changes the story. <em>Telling it is still up to you.</em>
        </motion.blockquote>
      </div>
    </section>
  );
}
