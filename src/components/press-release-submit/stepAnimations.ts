/** Shared motion variants for the Press Release page's step fields — each field fades/slides in
 * one after another (staggerChildren) instead of the whole step block moving as one unit, so this
 * page's step transitions read differently from Feature Your Startup's single-block slide. */
export const fieldGroupVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

export const fieldItemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
};
