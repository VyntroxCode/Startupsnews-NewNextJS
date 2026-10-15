/**
 * Shared Tailwind class literals for the Pro plan page (/dashboard/pro). One card radius (20px),
 * one inner-tile radius (12px) and pills, so the page reads as one set. No Preflight on this sheet,
 * so padded full-width boxes carry `box-border`.
 */

/**
 * Page palette, set on the page root (ProPlanPage) and read below it as `bg-(--pro-primary)` etc.
 * Scoped to this page so the shared `fi-*` tokens of the Funding section stay as they are.
 * Neutral first, one indigo primary; brand crimson (`--pro-brand`) only on the tiny hero eyebrow.
 */
export const proTokens = [
  '[--pro-bg:#F8FAFC]', // page
  '[--pro-surface:#FFFFFF]', // cards
  '[--pro-line:#E2E8F0]', // borders
  '[--pro-heading:#0F172A]',
  '[--pro-body:#475569]',
  '[--pro-muted:#64748B]',
  '[--pro-primary:#4338CA]', // CTA, headline accent, eyebrows
  '[--pro-primary-hover:#3730A3]',
  '[--pro-primary-soft:#EEF2FF]', // icon tiles, pills
  '[--pro-tint:#F5F6FF]', // hero surface
  '[--pro-neutral-soft:#F1F5F9]', // second tile family
  '[--pro-teal:#0F766E]',
  '[--pro-teal-soft:#F0FDFA]',
  '[--pro-amber:#B45309]',
  '[--pro-amber-soft:#FFFBEB]',
  '[--pro-amber-line:#FDE68A]',
  '[--pro-deep:#1E1B4B]', // Total Payable panel, PRO card art (to --pro-deep-2)
  '[--pro-deep-2:#312E81]',
  '[--pro-navy:#0F172A]', // Inside Funding banner (to --pro-navy-2)
  '[--pro-navy-2:#1E293B]',
  '[--pro-brand:#E11D48]', // tiny accents only, never a surface
  '[--pro-shadow:0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)]',
  '[--pro-shadow-lift:0_14px_34px_rgba(15,23,42,0.09)]',
].join(' ');

/** Card surface. */
export const proCard = 'box-border rounded-[20px] border border-solid border-(--pro-line) bg-(--pro-surface) shadow-(--pro-shadow)';

/** Card padding. */
export const proPad = 'p-5 sm:p-7';

/** Small indigo label above a card heading. */
export const proEyebrow = 'text-[12px] font-bold tracking-[0.04em] text-(--pro-primary)';

/** Card heading. */
export const proTitle = 'm-0 text-[21px] font-bold leading-tight tracking-[-0.01em] text-(--pro-heading) sm:text-[23px]';

/** Icon tile; add the colour classes at the call site. */
export const proIconTile = 'flex size-10 shrink-0 items-center justify-center rounded-[12px]';

/** Hover lift for the smaller cards. */
export const proLift = 'transition-[translate,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-(--pro-primary)/40 hover:shadow-(--pro-shadow-lift) motion-reduce:hover:translate-y-0';

/** Keyboard focus ring for links and buttons. */
export const proFocus = 'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--pro-primary)';

/** "Coming Soon" tag: the Funding section's amber `tagCls`, a shade softer. */
export const proSoonCls = 'inline-flex items-center gap-[5px] rounded-[20px] border border-solid border-(--pro-amber-line) bg-(--pro-amber-soft) px-[9px] py-[3px] text-[10px] font-bold tracking-[0.03em] text-(--pro-amber)';

export const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const inrWhole = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
