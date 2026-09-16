"use client";

import { motion } from "motion/react";
import { TOTAL_STEPS } from "./useSponsorEventForm";
import { useReducedMotion } from "./hooks";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Display labels for the wizard's real steps (validation.ts: event → poster & contact → review).
 * Named, not numbered. Must stay TOTAL_STEPS long. */
const LABELS = ["Event details", "Poster & contact", "Review"] as const;

/** The form's progress indicator. The rail fills to the current step, the active node carries a
 * halo that glides between steps (a shared `layoutId`), and completed nodes fill pink as a check
 * mark draws itself in. */
export function StepProgress({ currentStep }: { currentStep: number }) {
  const reducedMotion = useReducedMotion();
  const fill = (currentStep - 1) / (TOTAL_STEPS - 1);

  return (
    <nav className="sp-progress" aria-label="Submission progress">
      <div className="sp-progress-track">
        <div className="sp-progress-rail" aria-hidden="true">
          <motion.span
            className="sp-progress-rail-fill"
            initial={false}
            animate={{ scaleX: fill }}
            transition={{ duration: reducedMotion ? 0 : 0.7, ease: EASE }}
          />
        </div>
        <ol className="sp-progress-list">
          {LABELS.map((label, i) => {
            const n = i + 1;
            const state = n < currentStep ? "done" : n === currentStep ? "active" : "todo";
            return (
              <li
                key={label}
                className="sp-progress-step"
                data-state={state}
                aria-current={state === "active" ? "step" : undefined}
              >
                <span className="sp-progress-node" aria-hidden="true">
                  {state === "active" && (
                    <motion.span
                      layoutId="sp-progress-halo"
                      className="sp-progress-halo"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  {state === "done" ? (
                    <svg viewBox="0 0 24 24">
                      <motion.path
                        d="m5.5 12.5 4.2 4.2 8.8-9.2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={reducedMotion ? false : { pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.45, delay: 0.15, ease: "easeOut" }}
                      />
                    </svg>
                  ) : (
                    <span className="sp-progress-core" />
                  )}
                </span>
                <span className="sp-progress-label">
                  {label}
                  <span className="sp-sr-only">
                    {state === "done" ? " (completed)" : state === "active" ? " (current step)" : ""}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
