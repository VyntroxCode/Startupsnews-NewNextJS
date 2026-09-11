import type { Variants } from "motion/react";

/** Shared easing across this page — a smooth, controlled decelerate (no bounce/spring), matching
 * the "power3.out"-style cinematic pacing the redesign calls for. */
export const FR_EASE = [0.22, 1, 0.36, 1] as const;

/** Reusable viewport config for a reveal that should only ever play once, forward, as the section
 * is first approached — the redesign's brief explicitly asks for restrained, one-directional
 * scroll reveals here (unlike Feature Your Startup's deliberately reversible ones). */
export const FR_VIEWPORT = { once: true, amount: 0.4 } as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: FR_EASE } },
};

export const fadeUpSmall: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: FR_EASE } },
};

export const imageReveal: Variants = {
  hidden: { opacity: 0, scale: 1.08 },
  show: { opacity: 1, scale: 1, transition: { duration: 1.1, ease: FR_EASE } },
};

export const staggerChildren = (stagger = 0.12, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});
