"use client";

import { motion } from "motion/react";
import { SectionIntro } from "./SectionIntro";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";

const EXPANDED = [
  { label: "Headline", body: "Company X launches an AI platform for support teams." },
  { label: "Context", body: "What it solves, and what teams were doing instead until now." },
  { label: "People", body: "Who built it, and who is accountable for it." },
  { label: "Impact", body: "Who it helps, and what measurably changes for them." },
  { label: "Evidence", body: "What supports the announcement — sources, data, documentation." },
  { label: "Next", body: "What happens now, and what to watch for after launch." },
] as const;

/** Section 09 — the same announcement written twice, to make the abstract argument of the page
 * concrete: a bare line on the left, the same news with its context on the right.
 *
 * Motion language: *card transformation*. The thin "before" card holds alone, then the expanded
 * rows deal out one at a time beside it, so the reader watches the second version being built out
 * of the first. Every value is invented — hence the label above the whole block, which is
 * deliberately part of the composition rather than a footnote under it. */
export function StoryTransformation() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="pr-section pr-transform" aria-labelledby="pr-transform-title">
      <SectionIntro
        index="09"
        label="Illustrative Example"
        heading="One announcement, told two ways."
        headingId="pr-transform-title"
        lede="The difference between a line our desk cannot do anything with and a submission an editor can start working from."
      />

      <p className="pr-transform-flag" aria-hidden="true">
        Illustrative example — fictional company, no real story
      </p>

      <div className="pr-transform-grid">
        <motion.div
          className="pr-transform-before"
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: PR_EASE }}
        >
          <p className="pr-transform-tag">From</p>
          <p className="pr-transform-thin">“Company X launches new product.”</p>
          <p className="pr-transform-note">Accurate, but there is no story here yet.</p>
        </motion.div>

        <motion.span
          className="pr-transform-arrow"
          aria-hidden="true"
          initial={reducedMotion ? false : { opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.25, ease: PR_EASE }}
        >
          {/* The glyph carries its own element so the stacked-layout rotation can stay in CSS —
              Motion owns `transform` on the span around it. */}
          <span className="pr-transform-arrow-glyph">→</span>
        </motion.span>

        <div className="pr-transform-after">
          <motion.p
            className="pr-transform-tag"
            initial={reducedMotion ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            To
          </motion.p>
          <dl className="pr-transform-rows">
            {EXPANDED.map((row, i) => (
              <motion.div
                key={row.label}
                className="pr-transform-row"
                initial={reducedMotion ? false : { opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: 0.35 + i * 0.09, ease: PR_EASE }}
              >
                <dt>{row.label}</dt>
                <dd>{row.body}</dd>
              </motion.div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
