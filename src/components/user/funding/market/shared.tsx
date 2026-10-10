'use client';

import { useEffect, useState } from 'react';
import type { MarketMeta, MarketView } from '@/modules/funding-deals/domain/types';
import { fundingGet, toQuery } from '../api';
import { cardCls, emptyCls, inputCls } from '../ui';

/** Preview .ma-card with h3 + .desc. */
export function MaCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className={`${cardCls} mb-4 min-w-0 p-4 sm:p-5`}>
      <h3 className="m-0 mb-1 text-[15px] font-semibold text-fi-ink sm:text-[16px]">{title}</h3>
      <div className="mb-3.5 text-[11.5px] leading-normal text-fi-ink-faint sm:text-[12px]">{desc}</div>
      {children}
    </div>
  );
}

/** Preview .ma-controls row. */
export function Controls({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-wrap gap-3 border-0 border-b border-solid border-fi-line pb-3.5 sm:gap-4">{children}</div>;
}

/** Preview .mc-group (label above a control). */
export function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-[140px] flex-1 flex-col gap-1 sm:flex-none">
      <span className="text-[11.5px] font-semibold tracking-[0.01em] text-fi-ink">{label}</span>
      {children}
    </div>
  );
}

/** Preview .mini-seg segmented buttons. */
export function MiniSeg<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="box-border flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-lg border border-solid border-fi-line bg-fi-bg p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`shrink-0 cursor-pointer whitespace-nowrap rounded-md border-0 px-3 py-1.5 text-[11.5px] font-semibold ${value === o.value ? 'bg-fi-surface text-fi-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'bg-transparent text-fi-ink-soft'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CountrySelect({ value, countries, onChange, includeAll = true }: { value: string; countries: string[]; onChange: (v: string) => void; includeAll?: boolean }) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      {includeAll && <option value="all">All countries</option>}
      {countries.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  );
}

/** Fetch one Market Analysis view; re-fetches when params change. Reports meta up for the KPI strip. */
export function useMarketView<T>(view: MarketView, params: Record<string, string>, onMeta: (m: MarketMeta) => void) {
  const [data, setData] = useState<T | null>(null);
  const [meta, setMeta] = useState<MarketMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(params);
  useEffect(() => {
    let cancelled = false;
    fundingGet<{ meta: MarketMeta; data: T }>(`/api/funding/market?${toQuery({ view, ...params })}`)
      .then((j) => {
        if (cancelled) return;
        setData(j.data);
        setMeta(j.meta);
        setError(null);
        onMeta(j.meta);
      })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- params compared by value via `key`
  }, [view, key]);
  return { data, meta, error };
}

export function Loading({ error }: { error: string | null }) {
  return error ? <div className={`${emptyCls} text-fi-red`}>{error}</div> : <div className="h-[280px] animate-pulse rounded-lg bg-fi-bg sm:h-[320px]" />;
}

/** Phone-only hint above charts that scroll sideways (Sankey, Marimekko). */
export function SwipeHint() {
  return <div className="mb-2 text-[11px] text-fi-ink-faint sm:hidden">Swipe sideways to see the full chart →</div>;
}
