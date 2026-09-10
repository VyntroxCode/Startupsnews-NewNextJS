"use client";

import { useRef } from "react";
import { motion, useInView, useScroll, useSpring } from "motion/react";
import { SectionIntro } from "./SectionIntro";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";

/** Written against what this page actually does today: the form below collects the submission and
 * the editorial team reads it and follows up on the email or phone number given. There is no
 * automated queue, no publication SLA and no guarantee of coverage — so none is described. Note
 * the hedged language in steps 04 and 05; keep it if this copy is ever edited. */
const STEPS = [
  {
    n: "01",
    title: "Submission",
    body: "You provide the announcement and the supporting details, using the form at the end of this page.",
  },
  {
    n: "02",
    title: "Editorial review",
    body: "A person on our editorial team reads it and weighs it for relevance, context and completeness.",
  },
  {
    n: "03",
    title: "Follow-up",
    body: "The team may come back to you for clarification, sources, or additional information.",
  },
  {
    n: "04",
    title: "Editorial decision",
    body: "The team determines whether, and how, the story may be considered for coverage.",
  },
  {
    n: "05",
    title: "Story",
    body: "If accepted, the information moves into the appropriate editorial workflow.",
  },
] as const;

function ProcessStep({ step }: { step: (typeof STEPS)[number] }) {
  const ref = useRef<HTMLLIElement>(null);
  // Live, not once-only: the node should light on the way down and dim on the way back up, so the
  // rail reads as a position indicator rather than a set of one-shot reveals.
  const active = useInView(ref, { amount: 0.7, margin: "-25% 0px -25% 0px" });
  const reducedMotion = useReducedMotion();

  return (
    <li ref={ref} className={"pr-process-step" + (active ? " is-active" : "")}>
      <span className="pr-process-node" aria-hidden="true">
        <span className="pr-process-node-n">{step.n}</span>
      </span>
      <motion.div
        className="pr-process-card"
        initial={reducedMotion ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: PR_EASE }}
      >
        <h3>{step.title}</h3>
        <p>{step.body}</p>
      </motion.div>
    </li>
  );
}

/** Section 06 — what happens after the send button. Motion language: *scroll-linked progress*.
 * The rail fills in direct proportion to scroll position (a spring takes the jitter out) rather
 * than animating once on entry, so the reader can always see where they are in the process. */
export function EditorialProcess() {
  const reducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start 76%", "end 60%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });

  return (
    <section className="pr-section pr-process" id="pr-process" aria-labelledby="pr-process-title">
      <SectionIntro
        index="06"
        label="The Process"
        heading="After you hit send."
        headingId="pr-process-title"
        lede="Submissions are read by people, on their own schedule. Here is the path yours takes."
      />

      <div className="pr-process-track" ref={trackRef}>
        <div className="pr-process-rail" aria-hidden="true">
          <motion.span className="pr-process-rail-fill" style={reducedMotion ? { scaleY: 1 } : { scaleY: fill }} />
        </div>
        <ol className="pr-process-list">
          {STEPS.map((step) => (
            <ProcessStep key={step.n} step={step} />
          ))}
        </ol>
      </div>
    </section>
  );
}
