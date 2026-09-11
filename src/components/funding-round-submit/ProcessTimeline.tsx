"use client";

import { useRef } from "react";
import { motion, useInView, useScroll, useSpring } from "motion/react";
import { SectionHead } from "./SectionHead";
import { useReducedMotion } from "./hooks";
import { FR_EASE } from "./motion";

/** Written against what this page actually does today: the form below collects who you are and how
 * to reach you, and the editorial team follows up on that email or phone for the round itself.
 * There is no automated pipeline, no publication SLA and no guarantee of coverage — so none is
 * described. Note the hedged wording in steps 04 and 05; keep it if this copy is ever edited. */
const STEPS = [
  {
    n: "01",
    title: "Tell us about the round",
    body: "Start with your company, who you are, and how our desk can reach you, using the form at the end of this page.",
  },
  {
    n: "02",
    title: "Share the details",
    body: "The team follows up for the parts a story needs: the stage, the amount you are willing to disclose, the backers, the plan.",
  },
  {
    n: "03",
    title: "Investors and milestones",
    body: "Who led, who joined, and what the round is meant to buy: the context that turns a number into an announcement.",
  },
  {
    n: "04",
    title: "Editorial review",
    body: "A person on our editorial team reads it and weighs it for relevance, accuracy and whether there is a story for a reader.",
  },
  {
    n: "05",
    title: "The story goes live",
    body: "If it is accepted, the round moves into the appropriate editorial workflow and is published from there.",
  },
];

function Step({ step }: { step: (typeof STEPS)[number] }) {
  const ref = useRef<HTMLLIElement>(null);
  // Live, not once-only: the node should light on the way down and dim on the way back up, so the
  // rail reads as a position indicator rather than a set of one-shot reveals.
  const active = useInView(ref, { amount: 0.7, margin: "-25% 0px -25% 0px" });
  const reducedMotion = useReducedMotion();

  return (
    <li ref={ref} className={"fr-step" + (active ? " is-active" : "")}>
      {/* The node printed the step number until all numbering was removed from this page; it is a
          plain marker now, and still the thing that lights as the rail fills past it. `n` is kept
          on the data as the React key and as the reading order for whoever edits this copy. */}
      <span className="fr-step-node" aria-hidden="true" />
      <motion.div
        className="fr-step-card"
        initial={reducedMotion ? false : { opacity: 0, x: 26 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: FR_EASE }}
      >
        <h3>{step.title}</h3>
        <p>{step.body}</p>
      </motion.div>
    </li>
  );
}

/** Section 09 — from a closed round to a published story.
 *
 * Motion language: *scroll-linked progress*. The rail fills in direct proportion to scroll position
 * (a spring takes the jitter out) rather than animating once on entry, so the reader can always see
 * where they are in the process; the cards themselves come in from the right, against the rail. */
export function ProcessTimeline() {
  const reducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start 78%", "end 62%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });

  return (
    <section className="fr-section fr-process" id="fr-process" aria-labelledby="fr-process-title">
      <div className="fr-container">
        <SectionHead
          label="How it works"
          heading={
            <>
              From funding round to <em>published story</em>.
            </>
          }
          headingId="fr-process-title"
          lede={
            <>
              Submissions are <em>read by people, on their own schedule</em>. Here is the path yours
              takes.
            </>
          }
        />

        <div className="fr-track" ref={trackRef}>
          <div className="fr-track-rail" aria-hidden="true">
            <motion.span className="fr-track-rail-fill" style={reducedMotion ? { scaleY: 1 } : { scaleY: fill }} />
          </div>
          <ol className="fr-step-list">
            {STEPS.map((step) => (
              <Step key={step.n} step={step} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
