"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { SectionIntro } from "./SectionIntro";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";

const CRITERIA = [
  { title: "Relevance", body: "Does this matter to the startup and technology ecosystem our readers come here for?" },
  { title: "Accuracy", body: "Is what is claimed supportable, and stated precisely enough to be checked?" },
  { title: "Context", body: "Is there enough around the announcement to explain what it changes?" },
  { title: "Verifiability", body: "Can an editor confirm the story independently of the submission itself?" },
  { title: "Editorial value", body: "Is there a story here for a reader, rather than an update for a customer?" },
] as const;

function Criterion({ criterion, index }: { criterion: (typeof CRITERIA)[number]; index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const active = useInView(ref, { amount: 0.8, margin: "-20% 0px -20% 0px" });
  const reducedMotion = useReducedMotion();

  return (
    <motion.li
      ref={ref}
      className={"pr-policy-row" + (active ? " is-active" : "")}
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.55, delay: index * 0.05, ease: PR_EASE }}
    >
      <span className="pr-policy-bar" aria-hidden="true" />
      <span className="pr-policy-title">{criterion.title}</span>
      <span className="pr-policy-body">{criterion.body}</span>
    </motion.li>
  );
}

/** Section 07 — the credibility section, and the most important piece of copy on the page: this
 * desk reviews submissions, it does not publish them on request. Saying so plainly is what makes
 * everything above it believable, so the section is given the same weight as the storytelling
 * rather than being buried as fine print near the form. */
export function EditorialPolicy() {
  return (
    <section className="pr-section pr-policy" aria-labelledby="pr-policy-title">
      <SectionIntro
        index="07"
        label="Editorial Policy"
        heading={
          <>
            Stories are reviewed.
            <br />
            <em>Not automatically published.</em>
          </>
        }
        headingId="pr-policy-title"
        lede="Submitting here does not mean publication. Every release is weighed against the same five criteria, and our editorial team decides what happens next."
      />
      <ol className="pr-policy-list">
        {CRITERIA.map((criterion, i) => (
          <Criterion key={criterion.title} criterion={criterion} index={i} />
        ))}
      </ol>
    </section>
  );
}
