"use client";

import { useRef } from "react";
import { motion, useInView, useScroll, useSpring } from "motion/react";
import { SectionHead } from "./SectionHead";
import { useReducedMotion } from "./hooks";

/** The actual process behind the form on this page: the visitor fills in the four steps below, the
 * submission reaches the events desk, and someone reads it. Written to match that exactly — no
 * invented SLA, no review board, and no suggestion that submitting means being accepted. */
const STEPS = [
  { n: "01", title: "Share your event", body: "Tell us what you're organising, when and where it happens, and who it's for." },
  { n: "02", title: "Tell us about the opportunity", body: "Your goals, your timing, and what kind of partnership you're hoping to explore." },
  { n: "03", title: "Our team reviews it", body: "A member of the team reads the submission properly. Not every event is a fit, and we'll tell you either way." },
  { n: "04", title: "Explore the fit", body: "If it looks right, we talk through the best way to work together on it." },
  { n: "05", title: "Bring the event to life", body: "Move forward with whatever was agreed — and get the event in front of the people it was built for." },
] as const;

function ProcessStep({ step, index }: { step: (typeof STEPS)[number]; index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  // Live, not once-only: the node should light as it reaches the middle of the viewport and dim
  // again on the way back up, so the rail reads as a position indicator rather than a reveal.
  const active = useInView(ref, { amount: 0.7, margin: "-25% 0px -25% 0px" });
  const reducedMotion = useReducedMotion();

  return (
    <li ref={ref} className={"sp-process-step" + (active ? " is-active" : "")}>
      <span className="sp-process-node" aria-hidden="true">
        <span className="sp-process-node-n">{step.n}</span>
      </span>
      <motion.div
        className="sp-process-card"
        initial={reducedMotion ? false : { opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.55, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      >
        <h3>{step.title}</h3>
        <p>{step.body}</p>
      </motion.div>
    </li>
  );
}

/** 12 — how a partnership starts. Motion language: *a scroll-linked rail with activating nodes* —
 * the same idea as the journey section's line, but vertical and node-driven, so the page's two
 * progress moments read as a pair rather than a repeat. */
export function PartnershipProcess() {
  const reducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start 75%", "end 60%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });

  return (
    <section className="sp-process" id="sp-process" aria-labelledby="sp-process-title">
      <div className="sp-wrap">
        <SectionHead
          index="12"
          kicker="Process"
          title={<span id="sp-process-title">How a partnership starts.</span>}
        />

        <div className="sp-process-track" ref={trackRef}>
          <div className="sp-process-rail" aria-hidden="true">
            <motion.span
              className="sp-process-rail-fill"
              style={reducedMotion ? { scaleY: 1 } : { scaleY: fill }}
            />
          </div>
          <ol className="sp-process-list">
            {STEPS.map((step, i) => (
              <ProcessStep key={step.n} step={step} index={i} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
