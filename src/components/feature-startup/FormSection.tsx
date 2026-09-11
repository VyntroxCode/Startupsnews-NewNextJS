"use client";

import { AnimatePresence, motion } from "motion/react";
import { SectionLabel } from "./SectionLabel";
import { ImagePanel } from "./ImagePanel";
import { FormPanel } from "./FormPanel";
import { SubmissionSuccess } from "./SubmissionSuccess";
import type { FeatureStartupFormController } from "./useFeatureStartupForm";
import { useReducedMotion } from "./hooks";

/** Section 11 — the actual submission, and the last thing on the page. The reader has been
 * through the whole story by the time they reach it, which is the point of the ordering.
 *
 * The card keeps the original split-screen composition (captioned step photo on the left, wizard
 * on the right) because the left panel is admin-configurable — an editor can swap either photo
 * from /admin without a deploy, via the feature-startup-images site setting — and that capability
 * has to survive the redesign. On success the whole card is replaced by SubmissionSuccess rather
 * than only the right column, so the confirmation gets the full width it deserves. */
export function FormSection({
  ctrl,
  promotedCities,
}: {
  ctrl: FeatureStartupFormController;
  promotedCities?: Record<string, string[]>;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <section className="fys-form-section" id="fys-form" aria-labelledby="fys-form-title">
      <SectionLabel>Submit</SectionLabel>
      <motion.h2
        id="fys-form-title"
        className="fys-h2"
        initial={reducedMotion ? false : { opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        Let&apos;s get your startup featured.
      </motion.h2>
      <motion.p
        className="fys-form-lede"
        initial={reducedMotion ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.55, delay: 0.1 }}
      >
        One short form. Tell us who you are, what you&apos;re building and how to reach you —
        our editorial team takes it from there.
      </motion.p>

      <motion.div
        className={"fys-shell" + (ctrl.submitted ? " is-done" : "")}
        initial={reducedMotion ? false : { opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {ctrl.submitted ? (
            <SubmissionSuccess key="success" ctrl={ctrl} />
          ) : (
            <motion.div
              key="wizard"
              className="fys-shell-split"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
            >
              <ImagePanel />
              <FormPanel ctrl={ctrl} promotedCities={promotedCities} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
