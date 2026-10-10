'use client';

import type { MarketMeta, MarketOverview } from '@/modules/funding-deals/domain/types';
import CapitalBarChart from '../charts/CapitalBarChart';
import SankeyFlow from '../charts/SankeyFlow';
import { Loading, MaCard, SwipeHint, useMarketView } from './shared';

export default function OverviewTab({ onMeta }: { onMeta: (m: MarketMeta) => void }) {
  const { data, error } = useMarketView<MarketOverview>('overview', {}, onMeta);
  return (
    <>
      <MaCard title="Capital Raised" desc="Last 12 months, monthly">
        {data ? <CapitalBarChart labels={data.monthly.map((m) => m.label)} data={data.monthly.map((m) => m.total)} /> : <Loading error={error} />}
      </MaCard>
      <MaCard title="Series → Sector Flow (By Capital Raised)" desc="How this window's capital flowed from each funding stage into sector buckets. Top sectors shown; small flows dropped.">
        {data ? (<><SwipeHint /><SankeyFlow overview={data} /></>) : <Loading error={error} />}
      </MaCard>
    </>
  );
}
