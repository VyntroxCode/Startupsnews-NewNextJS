"use client";

import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import { FR_EASE } from "./motion";

/** Replaces the entire chapter/rail experience once `ctrl.submitted` is true — a premium
 * confirmation rather than a bare "Success!" toast: a self-drawing ring + checkmark, a serif
 * headline, and a way to submit another round. */
export function SubmissionSuccess({ ctrl }: { ctrl: LeadFormController }) {
  const { data, reset } = ctrl;
  const reducedMotion = useReducedMotion();
  const firstName = data.name.trim().split(" ")[0] || "there";

  return (
    <section className="fr-confirm">
      <div className="fr-container">
        <div className="fr-confirm-inner">
          <svg className="fr-confirm-ring" viewBox="0 0 74 74" fill="none" aria-hidden="true">
            <circle className="fr-ring-track" cx="37" cy="37" r="32" />
            <motion.circle
              className="fr-ring-draw"
              cx="37"
              cy="37"
              r="32"
              initial={reducedMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: FR_EASE }}
              transform="rotate(-90 37 37)"
            />
            <motion.path
              d="M24 38 L33 47 L51 27"
              initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: FR_EASE, delay: reducedMotion ? 0 : 0.85 }}
            />
          </svg>

          <motion.p
            className="fr-eyebrow"
            style={{ justifyContent: "center" }}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            Submission Received
          </motion.p>

          <motion.h2
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            Your milestone is now in motion.
          </motion.h2>

          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
          >
            Thanks for sharing {data.companyName || "your company"}&apos;s funding round, {firstName}.
            Our editorial team reviews every submission and will follow up at{" "}
            {data.email || "the email you shared"} if it&apos;s a fit.
          </motion.p>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            <Button variant="ghost" onClick={reset}>
              Submit Another Round
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
