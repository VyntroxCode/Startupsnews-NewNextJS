/** The page's shared easing curves and one shared reveal, so every section's timing comes from the
 * same vocabulary rather than each component inventing its own numbers.
 *
 * PR_EASE is the standard "fast out, long settle" curve used for essentially every entrance;
 * PR_EASE_IN is its mirror, used only by the form's step exits. Durations live at the call site because the brief's
 * rhythm (text → pause → image → pause → line) depends on per-element timing, but they all sit in
 * the 0.6–1.0s band for section reveals and 0.2–0.4s for micro-interactions. */
export const PR_EASE = [0.22, 1, 0.36, 1] as const;
export const PR_EASE_IN = [0.4, 0, 1, 1] as const;

/** Parent that walks its children in one after another. */
export const staggerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

export const staggerItemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: PR_EASE } },
};
