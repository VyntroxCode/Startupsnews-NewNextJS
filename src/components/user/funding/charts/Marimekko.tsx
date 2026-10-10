import type { MarketLocation } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { emptyCls, PALETTE } from '../ui';

/**
 * Market › By location "by round size": each column is a round-size band, its width the band's
 * share of all capital, its height split by country. Port of the preview's renderMarimekko().
 */
export default function Marimekko({ data, countries }: { data: MarketLocation['marimekko']; countries: string[] }) {
  if (!data.length) return <div className={emptyCls}>No disclosed amounts yet</div>;
  const grand = data.reduce((a, b) => a + b.total, 0) || 1;
  const colorOf = new Map(countries.map((c, i) => [c, PALETTE[i % PALETTE.length]]));
  const width = (total: number) => `${Math.max(6, (total / grand) * 100)}%`;

  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <div className="flex h-[340px] min-w-[600px] items-end gap-[3px] [&:has([data-seg]:hover)_[data-seg]:not(:hover)]:opacity-35">
        {data.map((band) => (
          <div key={band.key} className="relative flex h-full flex-col justify-end overflow-hidden rounded-t" style={{ width: width(band.total) }}>
            {band.byCountry.map((c) => (
              <div
                key={c.country}
                data-seg
                className="flex w-full items-center justify-center overflow-hidden text-[10px] font-semibold text-white transition-[opacity,filter] duration-150 hover:brightness-90 motion-reduce:transition-none"
                style={{ height: `${Math.max(3, (c.total / band.total) * 100)}%`, background: colorOf.get(c.country) ?? '#9C99A6' }}
                title={`${c.country}: ${formatUsdMn(c.total)}`}
              >
                {c.total / band.total > 0.12 ? c.country : ''}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex min-w-[600px] gap-[3px]">
        {data.map((band) => (
          <div key={band.key} className="text-center text-[11px]" style={{ width: width(band.total) }}>
            <div className="font-bold text-fi-ink">{band.label}</div>
            <div className="text-[10px] text-fi-ink-faint">{band.range} · {formatUsdMn(band.total)}</div>
          </div>
        ))}
      </div>
      <div className="mt-3.5 flex flex-wrap gap-y-1.5">
        {countries.map((c) => (
          <span key={c} className="mr-3.5 inline-flex items-center gap-[5px] text-[11px]">
            <span className="inline-block h-[9px] w-[9px] rounded-[2px]" style={{ background: colorOf.get(c) }} />
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
