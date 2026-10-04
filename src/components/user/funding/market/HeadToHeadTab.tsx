'use client';

import { useState } from 'react';
import type { MarketHeadToHead, MarketMeta } from '@/modules/funding-deals/domain/types';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import HeadToHeadChart from '../charts/HeadToHeadChart';
import { noteCls } from '../ui';
import { CountrySelect, Loading, MaCard, useMarketView } from './shared';

export default function HeadToHeadTab({ onMeta, countries }: { onMeta: (m: MarketMeta) => void; countries: string[] }) {
  // Empty until chosen: the server defaults to India vs USA when both exist.
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const { data, error } = useMarketView<MarketHeadToHead>('h2h', { a, b }, onMeta);
  const label = 'text-[10px] font-bold uppercase tracking-[0.04em] text-fi-ink-faint';
  const stat = 'rounded-[10px] border border-solid border-fi-line bg-fi-bg px-3.5 py-3';
  const row = 'mt-1.5 flex justify-between gap-2 text-[12.5px] sm:text-[13px]';
  return (
    <MaCard title="Compare any two ecosystems" desc="Line up two locations side by side.">
      <div className="mb-[18px] grid grid-cols-1 items-end gap-2.5 sm:grid-cols-[1fr_auto_1fr] sm:gap-3.5">
        <div className="flex flex-col gap-[5px]"><span className={label}>Location A</span><CountrySelect includeAll={false} value={a || data?.a.name || ''} countries={countries} onChange={setA} /></div>
        <div className="text-center font-(family-name:--font-fi-space) text-[13px] font-bold text-fi-ink-faint sm:pb-2 sm:text-[16px]">vs</div>
        <div className="flex flex-col gap-[5px]"><span className={label}>Location B</span><CountrySelect includeAll={false} value={b || data?.b.name || ''} countries={countries} onChange={setB} /></div>
      </div>
      {data && (countries.length < 2 || data.a.name === data.b.name) && (
        <div className={noteCls}>
          <span aria-hidden>ℹ️</span>
          <div>
            {countries.length < 2
              ? 'All deals so far are from one country. Upload deals from another country to compare two ecosystems.'
              : 'Pick two different locations to compare them.'}
          </div>
        </div>
      )}
      {data ? (
        <>
          <HeadToHeadChart data={data} />
          <div className="mt-[18px] grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className={stat}>
              <div className={`${label} text-[10.5px] font-semibold`}>Capital invested</div>
              <div className={row}><span>{data.a.name}</span><b className="font-(family-name:--font-fi-plex)">{formatUsdMn(data.a.stats.total)}</b></div>
              <div className={row}><span>{data.b.name}</span><b className="font-(family-name:--font-fi-plex)">{formatUsdMn(data.b.stats.total)}</b></div>
            </div>
            <div className={stat}>
              <div className={`${label} text-[10.5px] font-semibold`}>Rounds</div>
              <div className={row}><span>{data.a.name}</span><b className="font-(family-name:--font-fi-plex)">{data.a.stats.rounds.toLocaleString()}</b></div>
              <div className={row}><span>{data.b.name}</span><b className="font-(family-name:--font-fi-plex)">{data.b.stats.rounds.toLocaleString()}</b></div>
            </div>
            <div className={stat}>
              <div className={`${label} text-[10.5px] font-semibold`}>Peak year · CAGR</div>
              {[data.a, data.b].map((s) => (
                <div key={s.name} className={row}><span>{s.name}</span><b className="font-(family-name:--font-fi-plex)">{s.stats.peakYear} · {s.stats.cagr >= 0 ? '+' : ''}{s.stats.cagr}%/yr</b></div>
              ))}
            </div>
          </div>
        </>
      ) : <Loading error={error} />}
    </MaCard>
  );
}
