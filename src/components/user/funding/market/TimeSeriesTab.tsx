'use client';

import { useState } from 'react';
import type { MarketMeta, MarketTimeSeries } from '@/modules/funding-deals/domain/types';
import TimeSeriesChart from '../charts/TimeSeriesChart';
import { Control, Controls, CountrySelect, Loading, MaCard, MiniSeg, useMarketView } from './shared';

type G = 'month' | 'quarter' | 'year';

export default function TimeSeriesTab({ onMeta, countries }: { onMeta: (m: MarketMeta) => void; countries: string[] }) {
  const [location, setLocation] = useState('all');
  const [granularity, setGranularity] = useState<G>('quarter');
  const { data, error } = useMarketView<MarketTimeSeries>('timeseries', { location, granularity }, onMeta);
  return (
    <MaCard
      title="When The Capital Landed"
      desc="Funding over time, stacked by round-size band. Startup capital (<$15M) covers pre-seed → Series A; breakout ($15–100M) is Series B → C; scaleup+ ($100M+) is the late-stage and growth rounds that drive the headlines."
    >
      <Controls>
        <Control label="Location"><CountrySelect value={location} countries={countries} onChange={setLocation} /></Control>
        <Control label="Granularity">
          <MiniSeg value={granularity} onChange={setGranularity} options={[{ value: 'month', label: 'Monthly' }, { value: 'quarter', label: 'Quarterly' }, { value: 'year', label: 'Yearly' }]} />
        </Control>
      </Controls>
      {data ? <TimeSeriesChart series={data} /> : <Loading error={error} />}
    </MaCard>
  );
}
