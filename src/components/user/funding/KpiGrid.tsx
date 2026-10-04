import type { FundingKpis } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';

/** Preview .kpi-grid — six cards, the first is the pink accent card. */
export default function KpiGrid({ kpis }: { kpis: FundingKpis }) {
  const cards = [
    { lbl: 'Funding in view', val: formatUsdMn(kpis.totalFunding), sub: `${kpis.totalDeals} deals match filters` },
    { lbl: 'Total deals', val: kpis.totalDeals.toLocaleString(), sub: `${kpis.disclosedDeals} with disclosed amount` },
    { lbl: 'Avg. round size', val: formatUsdMn(kpis.avgRound), sub: 'across disclosed deals' },
    { lbl: 'Active sectors', val: String(kpis.activeSectors), sub: 'in current filter' },
    { lbl: 'Leading sector', val: kpis.leadingSector?.key ?? '—', sub: kpis.leadingSector ? formatUsdMn(kpis.leadingSector.total) : '' },
    { lbl: 'Most active investor', val: kpis.topInvestor?.key ?? '—', sub: kpis.topInvestor ? `${kpis.topInvestor.count} deals` : '' },
  ];
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((c, i) => {
        const accent = i === 0;
        return (
          <div
            key={c.lbl}
            className={`min-w-0 rounded-[14px] border border-solid p-4 shadow-fi ${accent ? 'border-transparent bg-linear-160 from-fi-primary to-fi-primary-dark text-white' : 'border-fi-line bg-fi-surface'}`}
          >
            <div className={`text-[11px] font-semibold uppercase tracking-[0.03em] ${accent ? 'text-white/75' : 'text-fi-ink-faint'}`}>{c.lbl}</div>
            <div className="mt-1.5 truncate font-(family-name:--font-fi-space) text-[21px] font-bold tracking-[-0.01em]" title={c.val}>{c.val}</div>
            <div className={`mt-[3px] truncate text-[11.5px] ${accent ? 'text-white/75' : 'text-fi-ink-faint'}`}>{c.sub || ' '}</div>
          </div>
        );
      })}
    </div>
  );
}
