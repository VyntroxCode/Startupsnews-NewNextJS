"use client";

import { motion, type Variants } from "motion/react";
import { EASE } from "./hooks";

/** Each field lifts in behind the one before it — 80ms apart, run by the form container's
 * `whileInView`, not by six separate in-view watchers, so the order is the reading order and not
 * whatever happens to cross the fold first. */
export const fieldVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.1 + index * 0.08, ease: EASE },
  }),
};

/** Wraps one row of the form in that reveal. It holds no field markup of its own: every control
 * on this form is a shared site component (`FormField`, `PhoneField`, `CountryCityFields`) that
 * brings its own label, error row and ids, so this only carries the motion — the same division
 * `FieldReveal` makes on /feature-your-startup. */
export function JourneyField({
  index,
  wide,
  children,
}: {
  index: number;
  /** Spans both grid columns — for `CountryCityFields`, which is itself a two-field row. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={"ens-jf-cell" + (wide ? " is-wide" : "")}
      variants={fieldVariants}
      custom={index}
    >
      {children}
    </motion.div>
  );
}
