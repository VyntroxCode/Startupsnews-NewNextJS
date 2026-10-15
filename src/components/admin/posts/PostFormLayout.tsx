import type { ReactNode } from 'react';

/** Shared layout for the admin Create / Edit Post forms: titled section cards with a responsive
 * grid (1 col on phones, 2 from md, up to 3 from lg) so related fields sit side by side, the same
 * way the Add Event and Sales Tracker lead forms group theirs.
 * The staff Tailwind sheet has no Preflight, so every padded full-width control needs `box-border`
 * (otherwise it overflows its column and runs into the next field). */

export const POST_INPUT =
  'box-border block w-full rounded-lg border border-solid border-slate-200 bg-white px-3 py-2.5 text-[15px] text-slate-800 ' +
  'placeholder:text-slate-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';

export const POST_HINT = 'mt-1.5 mb-0 text-[13px] leading-snug text-slate-500';

const GRID_COLS = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-2 lg:grid-cols-3',
} as const;

/** `action` renders on the right of the section heading (e.g. the Featured Post checkbox). */
export function PostFormSection({ title, description, cols = 3, action, children }: {
  title: string;
  description?: string;
  cols?: 2 | 3;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-6 border-0 border-b border-solid border-slate-100 pb-6 last:mb-0 last:border-b-0 last:pb-0">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 mb-0 text-[13px] text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      <div className={`grid grid-cols-1 items-start gap-x-6 gap-y-5 ${GRID_COLS[cols]}`}>
        {children}
      </div>
    </section>
  );
}

/** One labelled field. `span`: 1 = one column, 2 = two columns (from md), 'full' = the whole row. */
export function PostField({ label, required, span = 1, extra, children }: {
  label: ReactNode;
  required?: boolean;
  span?: 1 | 2 | 'full';
  extra?: ReactNode;
  children: ReactNode;
}) {
  const spanClass = span === 'full' ? 'col-span-full' : span === 2 ? 'md:col-span-2' : '';
  return (
    <div className={`min-w-0 ${spanClass}`}>
      <label className="mb-1.5 flex flex-wrap items-center gap-x-1.5 text-sm font-medium text-slate-600">
        {label}{required && <span className="text-rose-500">*</span>}
        {extra}
      </label>
      {children}
    </div>
  );
}
