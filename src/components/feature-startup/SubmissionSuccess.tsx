"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import type { FeatureStartupFormController } from "./useFeatureStartupForm";
import { useReducedMotion } from "./hooks";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Section 12 — the state after a successful submission. Rendered only once the controller flips
 * `submitted`, i.e. after the submit call has actually resolved (see useLeadForm — today that is
 * this site's shared front-end-only flow, unchanged by the redesign), never optimistically.
 *
 * Motion language: *the checkmark draws itself*. A stroked path animates its own length inside a
 * ring that scales up, then the copy ladders in behind it — the one place on the page where the
 * animation is the message. */
export function SubmissionSuccess({ ctrl }: { ctrl: FeatureStartupFormController }) {
  const reducedMotion = useReducedMotion();
  const { data } = ctrl;
  const firstName = data.name.trim().split(" ")[0];
  const company = data.companyName.trim();

  const line = (delay: number) =>
    reducedMotion
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: EASE },
        };

  return (
    <motion.div
      className="fys-success"
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      role="status"
      aria-live="polite"
    >
      <motion.span
        className="fys-success-ring"
        initial={reducedMotion ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        <svg viewBox="0 0 52 52" aria-hidden="true">
          <motion.path
            d="M15 26.5 22.5 34 37 19"
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reducedMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          />
        </svg>
      </motion.span>

      <motion.h2 {...line(0.45)}>Your startup is on its way.</motion.h2>

      <motion.p className="fys-success-body" {...line(0.55)}>
        Thanks{firstName ? `, ${firstName}` : ""} — we&apos;ve received{" "}
        {company || "your startup"}&apos;s details. Our editorial team reads every submission and
        will get in touch at {data.email.trim() || "the email you shared"} if it&apos;s a fit.
      </motion.p>

      <motion.ul className="fys-success-list" {...line(0.65)}>
        <li>Submission received</li>
        <li>Queued for editorial review</li>
      </motion.ul>

      <motion.div className="fys-success-actions" {...line(0.75)}>
        <Button variant="ghost" onClick={ctrl.reset}>
          Submit another startup
        </Button>
        <Link href="/" className="fys-success-link">
          Back to StartupNews.fyi
        </Link>
      </motion.div>
    </motion.div>
  );
}
