'use client';

import { Download, ExternalLink, Loader2 } from 'lucide-react';
import type { FundingDeal } from '@/modules/funding-deals/domain/types';
import { formatDealDate, formatUsdMn } from '@/modules/funding-deals/utils/format';
import { btnCls, cardCls, pillCls, tdCls, thCls } from './ui';

export type ReaderDeal = Omit<FundingDeal, 'batchId' | 'createdBy' | 'createdAt'>;

function pageList(cur: number, total: number): (number | '…')[] {
  const pages = [...new Set([1, total, cur, cur - 1, cur + 1, cur - 2, cur + 2])].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  pages.forEach((p, i) => {
    if (i && p - pages[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

const pageBtn = 'h-[30px] min-w-[30px] cursor-pointer rounded-[7px] border border-solid px-2 text-[12px] font-semibold font-(family-name:--font-db-inter) disabled:cursor-not-allowed disabled:opacity-40';

interface DealsTableProps {
  deals: ReaderDeal[] | null;
  total: number;
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  onDownload: () => void;
  downloading: boolean;
}

/** Preview .table-card on All Deals: count + download toolbar, 9-column table, ellipsis pagination. */
export default function DealsTable({ deals, total, page, totalPages, onPage, onDownload, downloading }: DealsTableProps) {
  return (
    <div className={`${cardCls} mt-4 overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-0 border-b border-solid border-fi-line px-4 py-3.5">
        <span className="text-[12px] text-fi-ink-faint">
          {deals ? `${total.toLocaleString()} deal${total === 1 ? '' : 's'} match your filters` : 'Loading deals…'}
        </span>
        <button type="button" className={btnCls} onClick={onDownload} disabled={downloading || !total}>
          {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Download filtered deals (.xlsx)
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-[12.5px]">
          <thead>
            <tr>{['Date', 'Startup', 'Sector', 'Model', 'Amount', 'Stage', 'City', 'Country', 'Lead investor'].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {deals && deals.length === 0 && (
              <tr><td colSpan={9} className="px-3.5 py-[30px] text-center text-fi-ink-faint">No deals match the current filters</td></tr>
            )}
            {deals?.map((d) => (
              <tr key={d.id} className="hover:bg-fi-bg">
                <td className={`${tdCls} whitespace-nowrap font-(family-name:--font-fi-plex)`}>{formatDealDate(d.date)}</td>
                <td className={tdCls}>
                  {d.sourceUrl ? (
                    <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-bold text-fi-ink no-underline visited:text-fi-ink hover:text-fi-primary">
                      {d.startupName} <ExternalLink size={11} className="text-fi-ink-faint" />
                    </a>
                  ) : <b>{d.startupName}</b>}
                </td>
                <td className={tdCls}>{d.sector || '—'}</td>
                <td className={tdCls}>{d.businessModel || '—'}</td>
                <td className={`${tdCls} whitespace-nowrap font-(family-name:--font-fi-plex) font-medium`}>{formatUsdMn(d.amount)}</td>
                <td className={tdCls}>{d.roundStage ? <span className={pillCls}>{d.roundStage}</span> : '—'}</td>
                <td className={tdCls}>{d.city || '—'}</td>
                <td className={tdCls}>{d.country || '—'}</td>
                <td className={tdCls}>{d.leadInvestor || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <nav className="flex flex-wrap items-center justify-center gap-1 border-0 border-t border-solid border-fi-line px-4 py-3.5" aria-label="Deals pages">
          <button type="button" className={`${pageBtn} border-fi-line bg-fi-surface text-fi-ink-soft`} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">‹</button>
          {pageList(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="px-0.5 text-[12px] text-fi-ink-faint">…</span>
            ) : (
              <button key={p} type="button" onClick={() => onPage(p)} aria-current={p === page ? 'page' : undefined} className={`${pageBtn} ${p === page ? 'border-fi-ink bg-fi-ink text-white' : 'border-fi-line bg-fi-surface text-fi-ink-soft'}`}>
                {p}
              </button>
            ),
          )}
          <button type="button" className={`${pageBtn} border-fi-line bg-fi-surface text-fi-ink-soft`} disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">›</button>
        </nav>
      )}
    </div>
  );
}
