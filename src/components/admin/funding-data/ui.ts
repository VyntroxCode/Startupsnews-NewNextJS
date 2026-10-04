/** Shared Tailwind class literals for Admin › Funding Data. Literal strings so the scoped sheet
 * (staff-panel-tailwind.css → @source "./funding-data") picks them up. No Preflight on the admin
 * shell, so every padded full-width control carries `box-border`. */

export const inputCls =
  'box-border h-10 w-full rounded-lg border border-solid border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#E01552] focus:outline-none focus:ring-2 focus:ring-[#FDEBF1]';

export const labelCls = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500';

export const btnPrimary =
  'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-[#E01552] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#A80F3E] disabled:cursor-not-allowed disabled:opacity-50';

export const btnSecondary =
  'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-solid border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

export const btnGhostDanger =
  'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600';

export const btnGhost =
  'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700';

export const cardCls = 'rounded-xl border border-solid border-slate-200 bg-white';

export const stagePill = 'inline-block whitespace-nowrap rounded-full bg-[#FDEBF1] px-2.5 py-0.5 text-[11px] font-semibold text-[#A80F3E]';
