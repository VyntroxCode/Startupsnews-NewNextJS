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

/**
 * How long the incoming step takes to travel in. Deliberately slow for a form transition — the
 * brief was that the new step should be clearly *seen* arriving from the right rather than
 * appearing to blink into place. Kept as one constant so the whole choreography (fade, field
 * stagger, outgoing step) retunes together if this is ever dialled back.
 */
export const STEP_SLIDE_SECONDS = 1;

/**
 * `x` is a PERCENTAGE, not the old fixed 32px: Framer resolves it against the element's own
 * width, so the travel scales with the form instead of being a barely-visible nudge on a wide
 * screen. The step's container clips horizontally (.ix-step-viewport) so this long travel never
 * pushes the page sideways.
 */
export const stepVariants = {
  enter: (dir: number) => ({ x: `${dir * 55}%`, opacity: 0 }),
  center: {
    x: "0%",
    opacity: 1,
    transition: {
      x: { duration: STEP_SLIDE_SECONDS, ease: EASE_OUT },
      // Fades in over the first half of the travel, so the step is legible while it is still
      // moving rather than arriving as a blank card that fills in on landing.
      opacity: { duration: STEP_SLIDE_SECONDS * 0.5, ease: EASE_OUT },
      staggerChildren: 0.05,
      delayChildren: STEP_SLIDE_SECONDS * 0.45,
    },
  },
  // Leaves faster than the new one arrives, and travels less far — it only has to clear the
  // frame, and matching the entrance duration would leave a long empty gap mid-transition.
  exit: (dir: number) => ({
    x: `${dir * -35}%`,
    opacity: 0,
    transition: { duration: STEP_SLIDE_SECONDS * 0.5, ease: EASE_IN },
  }),
};

export const fieldVariants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
};
