import type { FundingForecast, FundingSignal } from '@/modules/funding-deals/domain/types';
import ForecastChart from './charts/ForecastChart';
import { cardCls } from './ui';

const ICON: Record<FundingSignal['dir'], { cls: string; glyph: string }> = {
  up: { cls: 'bg-fi-green-light text-fi-green', glyph: '↑' },
  down: { cls: 'bg-fi-red-light text-fi-red', glyph: '↓' },
  flat: { cls: 'bg-fi-gold-light text-fi-gold', glyph: '→' },
};

/** Preview .predict-grid: "Projected monthly funding" (forecast chart) + "Signals & read-outs". */
export default function OutlookCards({ forecast, signals }: { forecast: FundingForecast | null; signals: FundingSignal[] }) {
  return (
    <div className="mt-4 grid grid-cols-1 items-stretch gap-3.5 lg:grid-cols-[1.4fr_1fr]">
      <div className={`${cardCls} p-[18px]`}>
        <h3 className="m-0 mb-1 font-(family-name:--font-fi-space) text-[14px] font-bold text-fi-ink">
          Projected monthly funding
          <span className="ml-1.5 inline-flex items-center gap-[5px] rounded-[20px] bg-fi-ai-light px-2 py-[3px] align-middle text-[10px] font-bold text-fi-ai-dark">Trend-based</span>
        </h3>
        <div className="mb-3 text-[11.5px] text-fi-ink-faint">{forecast?.method ?? '—'}</div>
        {forecast ? <ForecastChart forecast={forecast} /> : <div className="h-[270px] animate-pulse rounded-lg bg-fi-bg" />}
      </div>
      <div className={`${cardCls} p-[18px]`}>
        <h3 className="m-0 mb-1 font-(family-name:--font-fi-space) text-[14px] font-bold text-fi-ink">Signals &amp; read-outs</h3>
        <div className="mb-3 text-[11.5px] text-fi-ink-faint">Generated from the current filtered dataset</div>
        <div className="flex flex-col gap-2.5">
          {signals.map((s, i) => (
            <div key={i} className="flex gap-2.5 rounded-[10px] border border-solid border-fi-line bg-fi-bg px-3 py-[11px]">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-(family-name:--font-fi-space) text-[13px] font-bold ${ICON[s.dir].cls}`}>{ICON[s.dir].glyph}</div>
              <div className="text-[12.6px] leading-normal text-fi-ink">
                {s.parts.map((p, j) => (p.bold ? <b key={j}>{p.text}</b> : <span key={j}>{p.text}</span>))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 border-0 border-t border-dashed border-fi-line pt-2.5 text-[10.5px] leading-normal text-fi-ink-faint">
          Straight-line trend over the filtered monthly totals, recalculated whenever the filters change. Directional only — not investment advice.
        </div>
      </div>
    </div>
  );
}
