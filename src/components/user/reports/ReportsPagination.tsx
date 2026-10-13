'use client';

import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';

/** First, last, and two either side of the current page, with gaps collapsed to an ellipsis. */
function pageList(cur: number, total: number): (number | '…')[] {
  const pages = [...new Set([1, total, cur, cur - 1, cur + 1, cur - 2, cur + 2])].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  pages.forEach((p, i) => {
    if (i && p - pages[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

const btnCls = 'inline-flex h-9 min-w-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-solid px-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40';
const idleCls = 'border-gray-200 bg-white text-gray-700 hover:border-[#ee1761] hover:text-[#ee1761] disabled:hover:border-gray-200 disabled:hover:text-gray-700';

interface ReportsPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  /** First page that needs the Pro plan; its number and later ones carry a small lock. */
  lockedFromPage?: number | null;
  onPage: (page: number) => void;
}

/** Pager under the /dashboard/reports grid: "Showing 1–12 of 57" + Previous / numbers / Next. */
export default function ReportsPagination({ page, pageSize, total, lockedFromPage, onPage }: ReportsPaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-solid border-gray-200 bg-white px-4 py-3 md:flex-row">
      <p className="m-0 text-sm text-gray-500">
        Showing <b className="font-semibold text-gray-900">{from}–{to}</b> of <b className="font-semibold text-gray-900">{total}</b> reports
      </p>
      <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Reports pages">
        <button type="button" className={`${btnCls} ${idleCls}`} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft size={16} aria-hidden /> <span className="hidden md:inline">Previous</span>
        </button>
        {pageList(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-1 text-sm text-gray-400">…</span>
          ) : (
            <button key={p} type="button" onClick={() => onPage(p)} aria-current={p === page ? 'page' : undefined} className={`${btnCls} ${p === page ? 'border-[#ee1761] bg-[#ee1761] text-white' : idleCls}`}>
              {lockedFromPage != null && p >= lockedFromPage && <Lock size={12} aria-label="Pro plan" />}
              {p}
            </button>
          ),
        )}
        <button type="button" className={`${btnCls} ${idleCls}`} disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <span className="hidden md:inline">Next</span> <ChevronRight size={16} aria-hidden />
        </button>
      </nav>
    </div>
  );
}
