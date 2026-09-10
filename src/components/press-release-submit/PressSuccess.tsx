"use client";

import { motion } from "motion/react";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";

/** The confirmation, shown in place of the form card.
 *
 * Reads as a filing receipt rather than a celebration: a pink check drawn onto a sheet of paper,
 * two sheets settling behind it, and a status that says SUBMITTED / UNDER REVIEW — never
 * "published", "approved" or anything that would imply an editorial decision has been made. The
 * body copy is hedged for the same reason.
 *
 * Under reduced motion the check and both rules render complete on the first frame; the
 * information is identical and only the drawing is dropped. */
export function PressSuccess({ ctrl }: { ctrl: LeadFormController }) {
  const { data, reset } = ctrl;
  const reducedMotion = useReducedMotion();
  const firstName = data.name.trim().split(" ")[0];

  const rise = (delay: number) => ({
    initial: reducedMotion ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: PR_EASE },
  });

  return (
    <div className="pr-success">
      <div className="pr-success-stack">
        <motion.span
          className="pr-success-sheet pr-success-sheet-b"
          aria-hidden="true"
          initial={reducedMotion ? false : { opacity: 0, y: 18, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: -2.5 }}
          transition={{ duration: 0.6, delay: 0.15, ease: PR_EASE }}
        />
        <motion.span
          className="pr-success-sheet pr-success-sheet-a"
          aria-hidden="true"
          initial={reducedMotion ? false : { opacity: 0, y: 14, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: 1.8 }}
          transition={{ duration: 0.6, delay: 0.08, ease: PR_EASE }}
        />
        <motion.div
          className="pr-success-slip"
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: PR_EASE }}
        >
          <svg viewBox="0 0 44 44" fill="none" className="pr-success-check" aria-hidden="true">
            <motion.circle
              cx="22"
              cy="22"
              r="18"
              className="pr-success-ring"
              transform="rotate(-90 22 22)"
              initial={reducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.25, ease: PR_EASE }}
            />
            <motion.path
              d="M14 22.6 L19.6 28 L30 16.8"
              className="pr-success-tick"
              initial={reducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.45, delay: 0.85, ease: PR_EASE }}
            />
          </svg>
          <p className="pr-success-status">
            <span className="pr-success-status-dot" aria-hidden="true" />
            Submitted · Under review
          </p>
        </motion.div>
      </div>

      <motion.p className="pr-success-kicker" {...rise(1.0)}>
        Press Desk
      </motion.p>
      <motion.h2 className="pr-success-title" {...rise(1.08)}>
        Your story has been submitted.
      </motion.h2>
      <motion.p className="pr-success-body" {...rise(1.18)}>
        Thanks for sharing {data.companyName.trim() || "your company"}&apos;s announcement
        {firstName ? `, ${firstName}` : ""}. Our editorial team will review the submission and take
        the next appropriate step — if we need more detail, we&apos;ll write to{" "}
        {data.email.trim() || "the email you shared"}.
      </motion.p>
      <motion.div {...rise(1.28)}>
        <button type="button" className="pr-btn pr-btn-ghost" onClick={reset}>
          Submit another story
        </button>
      </motion.div>
    </div>
  );
}
