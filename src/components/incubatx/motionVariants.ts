/**
 * Shared Framer Motion variants for the dossier form. Field-level entrance variants
 * (`fieldVariants`) rely on Framer Motion's variant propagation: a child `motion.div` with a
 * `variants` object sharing state names with an ancestor's `animate` prop picks up that same
 * state automatically — it doesn't need its own `initial`/`animate` props. That's what lets
 * `stepVariants`' `center` state stagger every field inside a step without each field file
 * wiring up its own animation trigger.
 */
const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

export const stepVariants = {
  enter: (dir: number) => ({ x: dir * 32, opacity: 0 }),
  center: {
    x: 0,
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.08, duration: 0.26, ease: EASE_OUT },
  },
  exit: (dir: number) => ({ x: dir * -32, opacity: 0, transition: { duration: 0.18, ease: EASE_IN } }),
};

export const fieldVariants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
};
