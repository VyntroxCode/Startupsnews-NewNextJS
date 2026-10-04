import type { AggRow } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { cardCls } from './ui';

const th = 'border-0 border-b border-solid border-fi-line px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.03em] text-fi-ink-faint';
const td = 'border-0 border-b border-solid border-fi-line px-2.5 py-[9px]';

/** Preview .investor-table: top investors by $ (a deal counts for each investor on it). */
export default function InvestorTable({ rows }: { rows: AggRow[] }) {
  return (
    <div className={`${cardCls} flex flex-col p-4`}>
      <h3 className="m-0 mb-3 font-(family-name:--font-fi-space) text-[13.5px] font-semibold text-fi-ink">Top investors</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr><th className={th}>Investor</th><th className={th}>Amount</th><th className={th}>Deals</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={3} className="px-2.5 py-5 text-center text-fi-ink-faint">No data</td></tr>
            )}
            {rows.map((r, i) => {
              const last = i === rows.length - 1 ? 'border-b-0' : '';
              return (
                <tr key={r.key}>
                  <td className={`${td} ${last}`}><b>{r.key}</b></td>
                  <td className={`${td} ${last} font-(family-name:--font-fi-plex) font-semibold text-fi-ink`}>{formatUsdMn(r.total)}</td>
                  <td className={`${td} ${last}`}>{r.count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
