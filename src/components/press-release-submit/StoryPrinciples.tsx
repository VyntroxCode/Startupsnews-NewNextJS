"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { SectionIntro } from "./SectionIntro";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";

const PRINCIPLES = [
  { n: "01", title: "News", body: "What actually happened?" },
  { n: "02", title: "Relevance", body: "Why should the startup ecosystem care?" },
  { n: "03", title: "Context", body: "What does the announcement mean?" },
  { n: "04", title: "People", body: "Who is behind it?" },
  { n: "05", title: "Evidence", body: "What can be verified?" },
] as const;

/** One principle. Its four parts arrive in sequence rather than together — number, then heading,
 * then the pink rule growing out from the left, then the description — which is what gives the
 * section its deliberate, one-at-a-time cadence as the reader scrolls. */
function Principle({ principle, index }: { principle: (typeof PRINCIPLES)[number]; index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reducedMotion = useReducedMotion();

  const at = (delay: number) => ({
    initial: reducedMotion ? false : { opacity: 0, y: 20 },
    animate: inView ? { opacity: 1, y: 0 } : undefined,
    transition: { duration: 0.55, delay, ease: PR_EASE },
  });

  return (
    <li className="pr-principle" ref={ref}>
      <motion.span className="pr-principle-n" {...at(0)}>
        {principle.n}
      </motion.span>
      <div className="pr-principle-main">
        <motion.h3 className="pr-principle-title" {...at(0.1)}>
          {principle.title}
        </motion.h3>
        <motion.span
          className="pr-principle-rule"
          aria-hidden="true"
          initial={reducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : undefined}
          transition={{ duration: 0.6, delay: 0.22, ease: PR_EASE }}
        />
        <motion.p className="pr-principle-body" {...at(0.34)}>
          {principle.body}
        </motion.p>
      </div>
      <span className="pr-principle-index" aria-hidden="true">
        {String(index + 1).padStart(2, "0")} / 05
      </span>
    </li>
  );
}

/** Section 02 — the five things an editor is actually reading for, set as large editorial type on
 * white. Deliberately the quietest section on the page: no photographs, no cards, just the
 * questions themselves, one after another. */
export function StoryPrinciples() {
  return (
    <section className="pr-section pr-principles" aria-labelledby="pr-principles-title">
      <SectionIntro
        index="02"
        label="Editorial Standards"
        heading="What makes a story worth reading?"
        headingId="pr-principles-title"
        lede="Five questions our desk asks of every submission. A release that answers them is already most of the way to being a story."
      />
      <ol className="pr-principles-list">
        {PRINCIPLES.map((principle, i) => (
          <Principle key={principle.n} principle={principle} index={i} />
        ))}
      </ol>
    </section>
  );
}
