import type { AggRow } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { cardCls, emptyCls, PALETTE_BG } from './ui';

/** Preview .chart-card + renderBarList(): label · bar · "$X · N deals" (amount and count together). */
export default function BarList({ title, rows }: { title: string; rows: AggRow[] }) {
  const top = rows.slice(0, 8);
  const max = Math.max(1, ...top.map((r) => r.total));
  return (
    <div className={`${cardCls} flex flex-col p-4`}>
      <h3 className="m-0 mb-3 font-(family-name:--font-fi-space) text-[13.5px] font-semibold text-fi-ink">{title}</h3>
      {top.length === 0 ? (
        <div className={emptyCls}>No data for current filters</div>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-[9px]">
          {top.map((r, i) => (
            <div key={r.key} className="grid grid-cols-[110px_1fr_auto] items-center gap-2.5 text-[12px]">
              <div className="truncate font-semibold text-fi-ink" title={r.key}>{r.key}</div>
              <div className="relative h-5 overflow-hidden rounded-[5px] bg-fi-bg">
                <div className={`h-full rounded-[5px] ${PALETTE_BG[i % PALETTE_BG.length]}`} style={{ width: `${Math.max(4, (r.total / max) * 100)}%` }} />
              </div>
              <div className="whitespace-nowrap text-right font-(family-name:--font-fi-plex) text-[11px] text-fi-ink-soft">
                <b className="text-fi-ink">{formatUsdMn(r.total)}</b> · {r.count} deal{r.count === 1 ? '' : 's'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
