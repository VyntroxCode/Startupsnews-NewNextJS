"use client";

import { motion } from "motion/react";
import { EditorialRule } from "./EditorialRule";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";

/** The page's last words, between the form and the site footer — a full-stop rather than a second
 * call to action, so the form is not competing with anything below it. */
export function ClosingQuote() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="pr-closing">
      <EditorialRule />
      <motion.blockquote
        className="pr-closing-quote"
        initial={reducedMotion ? false : { opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.8, ease: PR_EASE }}
      >
        Every story begins with a detail worth telling.
      </motion.blockquote>
    </section>
  );
}
