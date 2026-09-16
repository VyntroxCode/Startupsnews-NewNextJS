/** Shared Tailwind class strings for the IT Tickets feature's form controls, buttons and cards.
 *
 * LOOK: sized and coloured to match the rest of the admin panel — the values mirror
 * `.sales-tracker-page` in sales-tracker/SalesTrackerStyles.tsx (Inter, 40px inputs with 8px radius,
 * 38px buttons, white bordered secondary buttons, #6366F1 primary, 14px-radius cards, 3px focus ring).
 * The Jira part is the layout (board, lozenges, issue-type/priority icons, two-column issue view),
 * not a separate visual language.
 *
 * Every accent utility lives in THIS file. Tailwind's scanner only sees literal class strings, so
 * never build class names by interpolation. Fonts and box-sizing come from `.it-tickets-scope`
 * in it-tickets-tailwind.css — don't add font-family utilities here. */

export const FOCUS_RING = 'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[#6366F1]/20';

/** White panel — same radius/border/shadow as the Sales Tracker `.card`. */
export const CARD =
  'rounded-[14px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)]';

export const FIELD_LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-slate-600';
export const FIELD_OPTIONAL = 'font-normal text-slate-400';

const FIELD_BASE =
  'block w-full min-w-0 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 transition-[border-color,box-shadow] ' +
  'hover:border-slate-400 focus:border-[#6366F1] focus:outline-none focus:ring-[3px] focus:ring-[#6366F1]/20 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

export const FIELD_INPUT = `${FIELD_BASE} h-10 px-3`;

/** Textareas: same box, natural height, comfortable line height. Add a min-h-* at the call site. */
export const FIELD_TEXTAREA = `${FIELD_BASE} resize-y px-3 py-2.5 leading-normal`;

/** Toolbar filters (search, status/priority/type selects). */
export const COMPACT_INPUT =
  'h-9 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-[13.5px] text-slate-700 transition-[border-color,box-shadow] ' +
  'hover:border-slate-400 focus:border-[#6366F1] focus:outline-none focus:ring-[3px] focus:ring-[#6366F1]/20';

/** Borderless-until-hover controls for the issue view's Details sidebar. */
export const FIELD_INPUT_COMPACT =
  'block h-9 w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 text-sm text-slate-900 transition-[border-color,background-color,box-shadow] ' +
  'hover:border-slate-300 hover:bg-white focus:border-[#6366F1] focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-[#6366F1]/20 ' +
  'disabled:cursor-not-allowed disabled:text-slate-500 disabled:hover:border-transparent disabled:hover:bg-transparent';

export const META_LABEL = 'block text-[11px] font-bold uppercase tracking-wide text-slate-500';

const BTN_BASE =
  'inline-flex h-[38px] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-4 text-[13.5px] font-semibold ' +
  'transition-colors focus:outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-60';

export const BTN_PRIMARY =
  `${BTN_BASE} border-[#6366F1] bg-[#6366F1] text-white hover:border-[#4F46E5] hover:bg-[#4F46E5] focus-visible:ring-[#6366F1]/30`;

export const BTN_SECONDARY =
  `${BTN_BASE} border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-[#6366F1]/20`;

export const BTN_DANGER =
  `${BTN_BASE} border-red-200 bg-white text-red-600 hover:border-red-600 hover:bg-red-50 focus-visible:ring-red-500/20`;

/** Square icon-only button (close ×, copy link, trash) — same as the Sales Tracker modal close. */
export const BTN_ICON =
  'inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border-0 bg-transparent p-0 text-slate-400 transition-colors ' +
  'hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[#6366F1]/20 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

/** Borderless text button used inside board columns ("+ Create"). */
export const BTN_GHOST =
  'inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border-0 bg-transparent px-2 text-[13px] font-medium text-slate-500 transition-colors ' +
  'hover:bg-white hover:text-slate-900 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[#6366F1]/20';

export const LINK =
  'border-0 bg-transparent p-0 text-[12.5px] font-semibold text-[#4F46E5] hover:underline focus:outline-none focus-visible:underline';

/** Toggle chips in the filter bar (assignee avatars, "Only my tickets"). */
export const CHIP =
  'inline-flex h-8 max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-300 bg-white pl-1 pr-3 text-[12.5px] font-semibold text-slate-700 transition-colors ' +
  'hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[#6366F1]/20';
export const CHIP_ACTIVE =
  'inline-flex h-8 max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border border-[#6366F1] bg-[#EEF2FF] pl-1 pr-3 text-[12.5px] font-semibold text-[#4F46E5] transition-colors ' +
  'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[#6366F1]/20';

export const SEGMENT =
  'inline-flex h-7 items-center rounded-md border-0 bg-transparent px-3 text-[13px] font-semibold text-slate-500 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[#6366F1]/20';
export const SEGMENT_ACTIVE =
  'inline-flex h-7 items-center rounded-md border-0 bg-white px-3 text-[13px] font-semibold text-slate-900 shadow-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[#6366F1]/20';

export const TH =
  'sticky top-0 z-[1] whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500';
export const TH_SORTABLE = `${TH} cursor-pointer select-none hover:bg-slate-100 hover:text-slate-700`;
export const TD = 'border-b border-slate-100 px-3 py-2.5 align-middle text-[13.5px] text-slate-700';

/** Small pill marking a person who came from the employee portal (role 'employee'), admin view only. */
export const EMPLOYEE_TAG =
  'inline-flex h-[18px] shrink-0 items-center rounded-full bg-amber-50 px-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200';

export const ERROR_BANNER = 'rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700 [overflow-wrap:anywhere]';
