"use client";

import { motion } from "motion/react";
import { ParallaxImage } from "./ParallaxImage";
import { pressReleaseImages } from "./images";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";

/** Section 11 — the last beat before the form: a large white editorial card lifted off the gray
 * ground, with a photograph parallaxing inside it. Its only job is to convert the reading posture
 * the page has built into a scroll down to the fields. */
export function PressCTA({ onStart, onHowItWorks }: { onStart: () => void; onHowItWorks: () => void }) {
  const reducedMotion = useReducedMotion();

  return (
    <section className="pr-section pr-cta" aria-labelledby="pr-cta-title">
      <motion.div
        className="pr-cta-card"
        initial={reducedMotion ? false : { opacity: 0, y: 34 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: PR_EASE }}
      >
        <div className="pr-cta-copy">
          <p className="pr-folio" aria-hidden="true">
            11 / Submit
          </p>
          <h2 className="pr-cta-title" id="pr-cta-title">
            Ready to tell the story?
          </h2>
          <p className="pr-cta-sub">
            Give our editorial team the details behind your announcement. It takes a couple of
            minutes, and a person reads every one.
          </p>
          <div className="pr-cta-actions">
            <button type="button" className="pr-btn pr-btn-primary" onClick={onStart}>
              Start Your Submission
              <span className="pr-btn-arrow" aria-hidden="true">→</span>
            </button>
            <button type="button" className="pr-btn pr-btn-ghost" onClick={onHowItWorks}>
              Read How It Works
            </button>
          </div>
        </div>

        <ParallaxImage
          image={pressReleaseImages.finalCta}
          className="pr-cta-figure"
          strength={12}
          sizes="(max-width: 900px) 100vw, 34vw"
        />
      </motion.div>
    </section>
  );
}
