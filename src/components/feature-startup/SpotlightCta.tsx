"use client";

import { motion } from "motion/react";
import { ArrowDownIcon } from "./icons";
import { useReducedMotion } from "./hooks";

/** Section 10 — the last push before the form. Motion language: *glow + scale*. The panel's two
 * light sources drift on a long, slow loop while the heading rises and the button scales up from
 * 0.95, so this reads as the loudest moment on the page without adding another reveal pattern.
 * The button scrolls to the form rather than navigating — the form is on this page, and sending
 * the reader somewhere else at the point of highest intent would be the wrong call. */
export function SpotlightCta({ onFeature }: { onFeature: () => void }) {
  const reducedMotion = useReducedMotion();
  return (
    <section className="fys-cta" aria-labelledby="fys-cta-title">
      <motion.div
        className="fys-cta-panel"
        initial={reducedMotion ? false : { opacity: 0, y: 34 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="fys-cta-glows" aria-hidden="true">
          <motion.span
            className="fys-cta-glow fys-cta-glow-a"
            animate={reducedMotion ? {} : { x: [0, 26, 0], y: [0, -18, 0] }}
            transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="fys-cta-glow fys-cta-glow-b"
            animate={reducedMotion ? {} : { x: [0, -22, 0], y: [0, 20, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.h2
          id="fys-cta-title"
          initial={reducedMotion ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          Ready to put your startup in the spotlight?
        </motion.h2>

        <motion.p
          initial={reducedMotion ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55, delay: 0.18 }}
        >
          Tell us what you&apos;re building and give your startup the visibility it deserves. It
          takes a couple of minutes.
        </motion.p>

        <motion.button
          type="button"
          className="fys-btn fys-btn-light"
          onClick={onFeature}
          initial={reducedMotion ? false : { opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
        >
          Feature My Startup
          <ArrowDownIcon className="fys-btn-icon" />
        </motion.button>
      </motion.div>
    </section>
  );
}
