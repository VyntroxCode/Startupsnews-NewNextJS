"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "./hooks";

/** Wraps one field (or one row of fields) in the form's staggered entrance. `index` is its
 * position within its step, and drives the delay ramp — 60ms apart, fade + a short lift, no
 * overshoot: a form field that bounces reads as unstable, not playful.
 *
 * `whileInView` rather than a plain `animate` so it also plays correctly when the second step
 * mounts already inside the viewport after "Next". Under reduced motion it renders inert. */
export function FieldReveal({ index, children }: { index: number; children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
