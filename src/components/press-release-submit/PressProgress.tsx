"use client";

import { motion } from "motion/react";
import { PR_EASE } from "./motion";

const STEPS = [
  { n: "01", label: "Story" },
  { n: "02", label: "Source" },
  { n: "03", label: "Review" },
] as const;

/** The form's progress indicator: a rule-led masthead treatment rather than a pill bar
 * ("STORY ──── SOURCE ──── REVIEW"). The connecting rule between two steps fills left→right once
 * the reader has passed the first of them, the current step reads in black, completed steps show a
 * pink check, and steps still ahead stay muted gray.
 *
 * It printed "01"/"02"/"03" ahead of each label until all numbering was removed from this page.
 * The check for a completed step stays — it is a state, not a number — and it now sits where the
 * number was, so the row keeps its rhythm rather than collapsing to three bare words.
 *
 * Presentational only — `currentStep` is owned by the form controller. The rule fill is a scaleX
 * transition rather than a width change so it never triggers layout. */
export function PressProgress({ currentStep }: { currentStep: number }) {
  return (
    <ol
      className="pr-progress"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={STEPS.length}
      aria-valuenow={currentStep}
      aria-label={`Step ${currentStep} of ${STEPS.length}`}
    >
      {STEPS.map((step, i) => {
        const n = i + 1;
        const state = n < currentStep ? "done" : n === currentStep ? "active" : "pending";
        return (
          <li key={step.n} className="pr-progress-step" data-state={state}>
            <span className="pr-progress-head">
              <span className="pr-progress-n">
                {state === "done" ? (
                  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="pr-progress-check">
                    <path d="M3.5 8.4 L6.6 11.4 L12.5 4.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </span>
              {i < STEPS.length - 1 && (
                <span className="pr-progress-rule" aria-hidden="true">
                  <motion.span
                    className="pr-progress-rule-fill"
                    initial={false}
                    animate={{ scaleX: currentStep > n ? 1 : 0 }}
                    transition={{ duration: 0.55, ease: PR_EASE }}
                  />
                </span>
              )}
            </span>
            <span className="pr-progress-label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
