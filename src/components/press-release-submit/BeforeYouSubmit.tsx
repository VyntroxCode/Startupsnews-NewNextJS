"use client";

import { motion } from "motion/react";
import { SectionIntro } from "./SectionIntro";
import { AnimatedCheck } from "./AnimatedCheck";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";

const CHECKLIST = [
  "What happened?",
  "Why does it matter?",
  "Who is involved?",
  "When did it happen?",
  "Where can we verify it?",
  "Who can we contact?",
  "What supporting material is available?",
] as const;

/** Section 04 — the checklist, immediately before the process section. Each row's tick draws
 * itself as it reaches the viewport (see AnimatedCheck), which is the only place on the page that
 * uses SVG path drawing — it is saved for the one moment where the reader is meant to mentally
 * tick items off. */
export function BeforeYouSubmit() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="pr-section pr-checklist-section" aria-labelledby="pr-checklist-title">
      <SectionIntro
        index="04"
        label="Preparation"
        heading="Before you submit."
        headingId="pr-checklist-title"
        lede="You do not need a finished press release to write to us. You do need answers to these — they are what turns a notification into something an editor can act on."
      />
      <ul className="pr-checklist">
        {CHECKLIST.map((item, i) => (
          <motion.li
            key={item}
            className="pr-checklist-item"
            initial={reducedMotion ? false : { opacity: 0, x: -18 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 0.5, delay: 0.05, ease: PR_EASE }}
          >
            <AnimatedCheck delay={0.1} />
            <span>{item}</span>
            <span className="pr-checklist-n" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
