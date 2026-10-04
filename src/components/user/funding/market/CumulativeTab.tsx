'use client';

import { useState } from 'react';
import type { MarketCumulative, MarketMeta } from '@/modules/funding-deals/domain/types';
import CumulativeChart from '../charts/CumulativeChart';
import { Control, Controls, CountrySelect, Loading, MaCard, useMarketView } from './shared';

export default function CumulativeTab({ onMeta, countries }: { onMeta: (m: MarketMeta) => void; countries: string[] }) {
  const [location, setLocation] = useState('all');
  const { data, error } = useMarketView<MarketCumulative>('cumulative', { location }, onMeta);
  return (
    <MaCard
      title="How fast does the year add up?"
      desc="Total capital raised since January 1 of each year, plotted month by month — so you can see how the current year is pacing against prior years."
    >
      <Controls>
        <Control label="Location"><CountrySelect value={location} countries={countries} onChange={setLocation} /></Control>
      </Controls>
      {data ? <CumulativeChart data={data} /> : <Loading error={error} />}
    </MaCard>
  );
}
