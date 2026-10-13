/**
 * Shared Tailwind class literals for the Pro plan page (/dashboard/pro). One card radius (20px),
 * one inner-tile radius (12px) and pills, so the page reads as one set. No Preflight on this sheet,
 * so padded full-width boxes carry `box-border`.
 */

/** Card surface. */
export const proCard = 'box-border rounded-[20px] border border-solid border-fi-line bg-fi-surface shadow-fi';

/** Card padding. */
export const proPad = 'p-5 sm:p-7';

/** Small pink label above a card heading. */
export const proEyebrow = 'text-[12px] font-bold tracking-[0.04em] text-fi-primary';

/** Card heading. */
export const proTitle = 'm-0 text-[21px] font-bold leading-tight tracking-[-0.01em] text-fi-ink sm:text-[23px]';

/** Icon tile; add the colour classes at the call site. */
export const proIconTile = 'flex size-10 shrink-0 items-center justify-center rounded-[12px]';

/** Hover lift for the smaller cards. */
export const proLift = 'transition-[translate,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-fi-primary/40 hover:shadow-[0_14px_34px_rgba(21,19,26,0.09)] motion-reduce:hover:translate-y-0';

/** Keyboard focus ring for links and buttons. */
export const proFocus = 'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fi-ink';

export const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const inrWhole = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
