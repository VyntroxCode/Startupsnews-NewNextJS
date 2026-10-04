'use client';

import { useState } from 'react';
import type { MarketLocation, MarketMeta } from '@/modules/funding-deals/domain/types';
import LocationBarChart from '../charts/LocationBarChart';
import Marimekko from '../charts/Marimekko';
import { Control, Controls, Loading, MaCard, MiniSeg, SwipeHint, useMarketView } from './shared';

export default function LocationTab({ onMeta, countries }: { onMeta: (m: MarketMeta) => void; countries: string[] }) {
  const [metric, setMetric] = useState<'amount' | 'count'>('amount');
  const { data, error } = useMarketView<MarketLocation>('location', { metric }, onMeta);
  return (
    <>
      <MaCard title="Where the capital landed, geographically" desc="Top locations by total capital raised in the selected period.">
        <Controls>
          <Control label="Metric">
            <MiniSeg value={metric} onChange={setMetric} options={[{ value: 'amount', label: 'Amount raised' }, { value: 'count', label: 'Number of rounds' }]} />
          </Control>
        </Controls>
        {data ? <LocationBarChart rows={data.countries} metric={metric} /> : <Loading error={error} />}
      </MaCard>
      <MaCard title="Where the capital landed, by round size" desc="Each column is a round-size band, its width the band's share of all capital raised, its height split by destination country.">
        {data ? (<><SwipeHint /><Marimekko data={data.marimekko} countries={countries} /></>) : <Loading error={error} />}
      </MaCard>
    </>
  );
}
