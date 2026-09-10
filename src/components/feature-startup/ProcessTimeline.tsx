"use client";

import { useRef } from "react";
import { motion, useInView, useScroll, useSpring } from "motion/react";
import { SectionLabel } from "./SectionLabel";
import { useReducedMotion } from "./hooks";

/** The workflow this page actually runs today: the visitor fills in the two-step form below (name,
 * company, phone, email, optional website/location, plus a PDF), the news desk reads it, and if
 * it's a fit they get in touch on the email or phone number given. Written to match that exactly —
 * no invented review board, SLA, or automatic publication step. */
const STEPS = [
  {
    n: "01",
    title: "Share your startup",
    body: "One short form at the bottom of this page — who you are, what you're building, and the best way to reach you. It takes a couple of minutes.",
  },
  {
    n: "02",
    title: "Our editorial team reviews it",
    body: "A real editor reads every submission and weighs it against what we're covering. No bots, no automatic queue.",
  },
  {
    n: "03",
    title: "We get in touch",
    body: "If it's a fit, we reach out on the email or number you shared to fill in the gaps and agree what the feature covers.",
  },
  {
    n: "04",
    title: "Your startup gets discovered",
    body: "Your story is published on StartupNews.fyi and can be shaped for the channels where our readers already follow startups.",
  },
] as const;

function TimelineStep({ step, index }: { step: (typeof STEPS)[number]; index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  // A live (not once-only) check so the node lights up on the way down and dims on the way back
  // up — the rail is meant to read as a position indicator, not a set of one-shot reveals.
  const active = useInView(ref, { amount: 0.6, margin: "-20% 0px -20% 0px" });
  const reducedMotion = useReducedMotion();
  return (
    <li ref={ref} className={"fys-tl-step" + (active ? " is-active" : "")}>
      <span className="fys-tl-node" aria-hidden="true">
        <span className="fys-tl-node-n">{step.n}</span>
      </span>
      <motion.div
        className="fys-tl-card"
        initial={reducedMotion ? false : { opacity: 0, x: index % 2 === 0 ? -28 : 28, y: 14 }}
        whileInView={{ opacity: 1, x: 0, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <h3>{step.title}</h3>
        <p>{step.body}</p>
      </motion.div>
    </li>
  );
}

/** Section 07 — how it works. Motion language: *scroll-driven progress*. The rail fills in direct
 * proportion to scroll position (a spring smooths the jitter) rather than animating once on
 * entry, and each node lights as it reaches the middle of the viewport, so the reader is always
 * looking at where they are in the process rather than at a finished graphic. */
export function ProcessTimeline() {
  const reducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start 78%", "end 62%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });

  return (
    <section className="fys-timeline" id="fys-process" aria-labelledby="fys-timeline-title">
      <SectionLabel index="04">Process</SectionLabel>
      <motion.h2
        id="fys-timeline-title"
        className="fys-h2"
        initial={reducedMotion ? false : { opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        From submission to published feature.
      </motion.h2>

      <div className="fys-tl-track" ref={trackRef}>
        <div className="fys-tl-rail" aria-hidden="true">
          <motion.span
            className="fys-tl-rail-fill"
            style={reducedMotion ? { scaleY: 1 } : { scaleY: fill }}
          />
        </div>
        <ol className="fys-tl-list">
          {STEPS.map((step, i) => (
            <TimelineStep key={step.n} step={step} index={i} />
          ))}
        </ol>
      </div>
    </section>
  );
}
