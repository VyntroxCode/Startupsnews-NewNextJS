"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "./hooks";
import { PR_EASE } from "./motion";

/** A checkmark that draws itself the first time it scrolls into view — the circle sweeps round,
 * then the tick is stroked in. Used by the "Before You Submit" checklist, where a row of static
 * ticks would say nothing that the words next to them don't already say.
 *
 * Under reduced motion both paths render complete on the first frame (pathLength 1), so the
 * information is identical and only the drawing is dropped. */
export function AnimatedCheck({ delay = 0 }: { delay?: number }) {
  const reducedMotion = useReducedMotion();
  const draw = (d: number, duration: number) =>
    reducedMotion
      ? { initial: { pathLength: 1 } as const, animate: { pathLength: 1 } }
      : {
          initial: { pathLength: 0 } as const,
          whileInView: { pathLength: 1 },
          viewport: { once: true, amount: 0.8 },
          transition: { duration, delay: delay + d, ease: PR_EASE },
        };

  return (
    <span className="pr-check" aria-hidden="true">
      <svg viewBox="0 0 28 28" fill="none">
        <motion.circle
          cx="14"
          cy="14"
          r="12"
          className="pr-check-ring"
          transform="rotate(-90 14 14)"
          {...draw(0, 0.6)}
        />
        <motion.path d="M8.5 14.4 L12.4 18.2 L19.6 10.4" className="pr-check-tick" {...draw(0.35, 0.4)} />
      </svg>
    </span>
  );
}
