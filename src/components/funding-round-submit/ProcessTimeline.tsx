"use client";

import { motion } from "motion/react";
import { STEPS } from "./stepMeta";

const DESCRIPTIONS: Record<number, string> = {
  1: "Your name, company, and the best number to reach you on.",
  2: "Your official email and where your startup is based.",
  3: "One PDF with the round size, stage, and investors.",
};

/** Horizontal "what we'll need" timeline — an SVG line that draws itself across the three steps
 * on scroll (via `pathLength`), read from the same STEPS metadata the fan hero below uses. A
 * distinct scroll-triggered effect from both this page's own fan-card hero and Advertise With
 * Us's fade+count-up sections. */
export function ProcessTimeline() {
  return (
    <section className="fr-process">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.5 }}
      >
        What we&apos;ll need from you
      </motion.h2>

      <div className="fr-process-track">
        <svg className="fr-process-line" viewBox="0 0 100 1" preserveAspectRatio="none" aria-hidden="true">
          <motion.line
            x1="0"
            y1="0.5"
            x2="100"
            y2="0.5"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
          />
        </svg>

        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.n}
              className="fr-process-step"
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.2 }}
            >
              <span className="fr-process-icon">
                <Icon width={18} height={18} />
              </span>
              <h3>{step.label}</h3>
              <p>{DESCRIPTIONS[step.n]}</p>
            </motion.div>
          );
        })}
      </div>

      <motion.a
        href="#fr-form"
        className="fr-process-cta"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ delay: 1, duration: 0.4 }}
      >
        Start your submission ↓
      </motion.a>
    </section>
  );
}
