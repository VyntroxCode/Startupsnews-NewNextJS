"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import type { LeadFormController } from "@/components/lead-forms/shared/useLeadForm";
import { useReducedMotion } from "./hooks";
import { FR_EASE } from "./motion";

/** Six sparks that lift away from the graph once the check lands. Positions are fixed rather than
 * random so the animation is identical on every render — a confirmation that looks slightly
 * different each time reads as a glitch. */
const SPARKS = [
  { x: -74, y: -42, d: 0 },
  { x: -30, y: -66, d: 0.08 },
  { x: 18, y: -72, d: 0.16 },
  { x: 62, y: -54, d: 0.24 },
  { x: 92, y: -26, d: 0.32 },
  { x: -104, y: -14, d: 0.4 },
];

/** Replaces the whole form once `ctrl.submitted` is true.
 *
 * Motion language: *arrival*. The funding line draws upward first, the ring closes behind it, the
 * check strikes, and only then does a handful of sparks lift away — the same instruments the page
 * has been using all the way down, resolving. The copy deliberately promises a review and a
 * follow-up, never publication.
 *
 * Reads `prefers-reduced-motion` through this folder's own hook rather than Motion's, so the value
 * is held at false until hydration and the server's HTML and the first client render agree. */
export function SubmissionSuccess({ ctrl }: { ctrl: LeadFormController }) {
  const { data, reset } = ctrl;
  const reducedMotion = useReducedMotion();
  const firstName = data.name.trim().split(" ")[0] || "there";

  const rise = (delay: number) => ({
    initial: reducedMotion ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay: reducedMotion ? 0 : delay, ease: FR_EASE },
  });

  return (
    <section className="fr-confirm" id="fr-confirm">
      <div className="fr-container">
        <div className="fr-confirm-inner">
          <div className="fr-confirm-art">
            <svg viewBox="0 0 220 150" aria-hidden="true" focusable="false">
              <defs>
                <linearGradient id="fr-confirm-line" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--fr-accent-soft)" />
                  <stop offset="100%" stopColor="var(--fr-accent)" />
                </linearGradient>
              </defs>
              <motion.path
                d="M12 132 L58 112 L100 118 L142 80 L182 62 L208 24"
                fill="none"
                stroke="url(#fr-confirm-line)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reducedMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1, ease: FR_EASE }}
              />
              <motion.circle
                cx="110"
                cy="75"
                r="34"
                className="fr-confirm-ring-track"
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: reducedMotion ? 0 : 0.9 }}
              />
              <motion.circle
                cx="110"
                cy="75"
                r="34"
                className="fr-confirm-ring"
                transform="rotate(-90 110 75)"
                initial={reducedMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.85, delay: reducedMotion ? 0 : 0.95, ease: FR_EASE }}
              />
              <motion.path
                d="M96 76 L106 87 L126 63"
                className="fr-confirm-check"
                fill="none"
                initial={reducedMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.45, delay: reducedMotion ? 0 : 1.6, ease: FR_EASE }}
              />
              {!reducedMotion &&
                SPARKS.map((spark) => (
                  <motion.circle
                    key={`${spark.x}-${spark.y}`}
                    cx="110"
                    cy="75"
                    r="2.6"
                    className="fr-confirm-spark"
                    initial={{ opacity: 0, x: 0, y: 0 }}
                    animate={{ opacity: [0, 1, 0], x: spark.x, y: spark.y }}
                    transition={{ duration: 1.4, delay: 1.95 + spark.d, ease: "easeOut" }}
                  />
                ))}
            </svg>
          </div>

          <motion.p className="fr-confirm-kicker" {...rise(0.1)}>
            Submission received
          </motion.p>

          <motion.h2 className="fr-confirm-title" {...rise(1.75)}>
            Your funding story is on its way.
          </motion.h2>

          <motion.p className="fr-confirm-body" {...rise(1.85)}>
            Thanks for sharing {data.companyName || "your company"}&apos;s round, {firstName}. Our
            editorial team reads every submission and will follow up at{" "}
            <strong>{data.email || "the email you shared"}</strong> if there is a story to tell. A
            submission is not a guarantee of coverage. What happens next is an editorial decision.
          </motion.p>

          <motion.div className="fr-confirm-actions" {...rise(1.95)}>
            <Button variant="ghost" onClick={reset}>
              Submit another round
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
