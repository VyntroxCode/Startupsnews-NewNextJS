"use client";

import { motion } from "motion/react";
import { ParallaxImage } from "./ParallaxImage";
import { eventImages } from "./eventImages";
import { useReducedMotion } from "./hooks";

const EASE = [0.22, 1, 0.36, 1] as const;

/** 13 — the last push before the form. A full-bleed photograph with a parallax drift behind a
 * short, direct ask. The primary button scrolls to the form rather than navigating: the form is on
 * this page, and sending someone elsewhere at the point of highest intent would be the wrong call. */
export function EventCTA({ onStart, onBack }: { onStart: () => void; onBack: () => void }) {
  const reducedMotion = useReducedMotion();
  const rise = (delay: number) =>
    reducedMotion
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 28 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.4 },
          transition: { duration: 0.6, delay, ease: EASE },
        };

  return (
    <section className="sp-cta-section" aria-labelledby="sp-cta-title">
      <ParallaxImage image={eventImages.cta} strength={14} sizes="100vw" />
      <span className="sp-cta-scrim" aria-hidden="true" />

      <div className="sp-cta-inner">
        <motion.h2 id="sp-cta-title" className="sp-cta-title" {...rise(0)}>
          Have an event worth bringing to the ecosystem?
        </motion.h2>
        <motion.p className="sp-cta-lede" {...rise(0.1)}>
          Tell us about it. We&apos;ll review the opportunity and explore whether there&apos;s a
          meaningful way to work together.
        </motion.p>
        <motion.div className="sp-cta-actions" {...rise(0.2)}>
          <button type="button" className="sp-btn sp-btn-primary" onClick={onStart}>
            Start Your Submission
            <span className="sp-btn-arrow" aria-hidden="true">→</span>
          </button>
          <button type="button" className="sp-btn sp-btn-ghost" onClick={onBack}>
            Back to the story
          </button>
        </motion.div>
      </div>
    </section>
  );
}
