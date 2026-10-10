'use client';

import { useState } from 'react';
import type { MarketGrowthRow, MarketMeta } from '@/modules/funding-deals/domain/types';
import GrowthChart from '../charts/GrowthChart';
import { inputCls } from '../ui';
import { Control, Controls, Loading, MaCard, useMarketView } from './shared';

export default function GrowthTab({ onMeta, years }: { onMeta: (m: MarketMeta) => void; years: string[] }) {
  // Empty until chosen: the server defaults to the last two years in the data.
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, error } = useMarketView<{ from: string; to: string; rows: MarketGrowthRow[] }>('growth', { from, to }, onMeta);
  const yearSelect = (value: string, onChange: (v: string) => void) => (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      {years.map((y) => <option key={y} value={y}>{y}</option>)}
    </select>
  );
  return (
    <MaCard
      title="Who's Accelerating The Fastest"
      desc="Same breakdown as By location, ranked by percentage change in capital raised between two full years. Tiny bases are excluded so a jump from near-zero never tops the chart."
    >
      <Controls>
        <Control label="From Year">{yearSelect(from || data?.from || '', setFrom)}</Control>
        <Control label="To Year">{yearSelect(to || data?.to || '', setTo)}</Control>
      </Controls>
      {data ? <GrowthChart rows={data.rows} /> : <Loading error={error} />}
    </MaCard>
  );
}
