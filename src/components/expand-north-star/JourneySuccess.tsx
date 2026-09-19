"use client";

import { motion, type Variants } from "motion/react";
import { EASE, useReducedMotion } from "./hooks";

/** The heading, the message and the closing line arrive one after another, after the tick has
 * finished drawing. */
const lineVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.5 + index * 0.12, ease: EASE },
  }),
};

/** Just the given name, so the confirmation reads as a reply to a person rather than a receipt.
 * Falls back to no name at all rather than guessing at a blank. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "";
}

/** What replaces the form once the enquiry is in: the ring draws round, the tick follows, then the
 * copy rises. Nothing reloads — the card keeps its place on the page, so the scroll position the
 * visitor was reading at doesn't jump under them. */
export function JourneySuccess({ name }: { name: string }) {
  const reducedMotion = useReducedMotion();
  const given = firstName(name);

  const reveal = reducedMotion
    ? ({ initial: false, animate: "show" } as const)
    : ({ initial: "hidden", animate: "show" } as const);

  return (
    <motion.div
      className="ens-jf-success"
      initial={reducedMotion ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      // The form it replaced was not an alert; this is, so the result is announced without the
      // reader having to go looking for it.
      role="status"
    >
      <div className="ens-jf-check" aria-hidden="true">
        <span className="ens-jf-check-glow" />
        <svg viewBox="0 0 88 88" fill="none">
          <motion.circle
            cx="44"
            cy="44"
            r="40"
            stroke="var(--ens-pink)"
            strokeWidth="2"
            initial={reducedMotion ? false : { pathLength: 0, opacity: 0.2 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: EASE }}
            style={{ rotate: -90, transformOrigin: "50% 50%" }}
          />
          <motion.path
            d="M28 45.5 39.5 57 61 33"
            stroke="var(--ens-pink)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reducedMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.55, delay: reducedMotion ? 0 : 0.45, ease: EASE }}
          />
        </svg>
      </div>

      <motion.h3 className="ens-jf-success-title" variants={lineVariants} custom={0} {...reveal}>
        Registration Received{given ? `, ${given}` : ""}
      </motion.h3>

      <motion.p className="ens-jf-success-body" variants={lineVariants} custom={1} {...reveal}>
        Thank you for sharing your details. Our team will get in touch with you shortly about your Expand North
        Star journey — travel, passes and the delegation programme.
      </motion.p>

      <motion.p className="ens-jf-success-note" variants={lineVariants} custom={2} {...reveal}>
        We usually reply within two working days.
      </motion.p>
    </motion.div>
  );
}
