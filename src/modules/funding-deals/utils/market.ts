/**
 * Market Analysis aggregations (reader /dashboard/funding/market). One pure function per tab,
 * each a server-side port of the preview's render*Tab logic, so the client only draws.
 * Input is every deal (compact rows); `today` is passed in so tests can pin it.
 */

import type {
  HeadToHeadStats,
  MarketCumulative,
  MarketGrowthRow,
  MarketHeadToHead,
  MarketKpis,
  MarketLocation,
  MarketMeta,
  MarketOverview,
  MarketTimeSeries,
} from '../domain/types';
import { ROUND_BANDS, bandFor, bucketOf, sumBy, timeBuckets, type AggDeal, type Granularity } from './aggregate';

const round1 = (n: number) => Math.round(n * 10) / 10;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Same calendar day one year earlier, as YYYY-MM-DD. */
function yearAgoIso(today: Date): string {
  const d = new Date(today);
  d.setFullYear(d.getFullYear() - 1);
  return isoDay(d);
}

function lastTwelveMonths(rows: AggDeal[], today: Date): AggDeal[] {
  const from = yearAgoIso(today);
  return rows.filter((r) => r.date >= from);
}

const sumAmount = (rows: AggDeal[]) => rows.reduce((a, r) => a + (r.amount ?? 0), 0);

export function marketKpis(rows: AggDeal[], today: Date): MarketKpis {
  const recent = lastTwelveMonths(rows, today);
  const capital = sumAmount(recent);
  return {
    capital: round1(capital),
    rounds: recent.length,
    meanCheck: recent.length ? round1(capital / recent.length) : 0,
  };
}

export function marketMeta(rows: AggDeal[], today: Date): MarketMeta {
  return {
    countries: [...new Set(rows.map((r) => r.country).filter(Boolean))].sort(),
    years: [...new Set(rows.map((r) => r.date.slice(0, 4)))].sort(),
    kpis: marketKpis(rows, today),
  };
}

/** Overview: monthly capital (last 12 months) + stage → sector flows (top 7 sectors, top 8 stages). */
export function marketOverview(rows: AggDeal[], today: Date): MarketOverview {
  const recent = lastTwelveMonths(rows, today);
  const sectors = sumBy(recent, (r) => r.sector).slice(0, 7);
  const sectorSet = new Set(sectors.map((s) => s.key));
  const inTopSectors = recent.filter((r) => sectorSet.has(r.sector || 'Unspecified'));
  const stages = sumBy(inTopSectors, (r) => r.roundStage).slice(0, 8);
  const stageSet = new Set(stages.map((s) => s.key));

  const flowMap = new Map<string, number>();
  for (const r of inTopSectors) {
    const from = r.roundStage || 'Unspecified';
    const to = r.sector || 'Unspecified';
    if (!stageSet.has(from) || !r.amount) continue;
    const key = `${from}\u0000${to}`;
    flowMap.set(key, (flowMap.get(key) ?? 0) + r.amount);
  }
  const flows = [...flowMap.entries()]
    .map(([k, amount]) => {
      const [from, to] = k.split('\u0000');
      return { from, to, amount: round1(amount) };
    })
    .sort((a, b) => b.amount - a.amount);

  return { monthly: timeBuckets(recent, 'month').slice(-12), stages, sectors, flows };
}

/** Time series: funding per bucket, stacked by round-size band (last 24 buckets). */
export function marketTimeSeries(rows: AggDeal[], location: string, granularity: Granularity): MarketTimeSeries {
  const scoped = location && location !== 'all' ? rows.filter((r) => r.country === location) : rows;
  const buckets = timeBuckets(scoped, granularity).slice(-24);
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  const bands = ROUND_BANDS.map((b) => ({ key: b.key, label: b.label, range: b.range, values: buckets.map(() => 0) }));

  for (const r of scoped) {
    const band = bandFor(r.amount);
    if (!band) continue;
    const i = index.get(bucketOf(r.date, granularity).key);
    if (i === undefined) continue;
    bands[ROUND_BANDS.indexOf(band)].values[i] += r.amount ?? 0;
  }
  return {
    labels: buckets.map((b) => b.label),
    bands: bands.map((b) => ({ ...b, values: b.values.map(round1) })),
  };
}

/** By location: totals per country + the round-size × country marimekko. */
export function marketLocation(rows: AggDeal[], metric: 'amount' | 'count'): MarketLocation {
  const countries = sumBy(rows, (r) => r.country).sort((a, b) =>
    metric === 'count' ? b.count - a.count || b.total - a.total : b.total - a.total || b.count - a.count,
  );
  const marimekko = ROUND_BANDS.map((band) => {
    const inBand = rows.filter((r) => bandFor(r.amount) === band);
    const byCountry = sumBy(inBand, (r) => r.country)
      .filter((c) => c.total > 0)
      .map((c) => ({ country: c.key, total: c.total }));
    return { key: band.key, label: band.label, range: band.range, total: round1(sumAmount(inBand)), byCountry };
  }).filter((b) => b.total > 0);
  return { countries, marimekko };
}

/** By growth: % change in capital per country between two years. Bases under $1M are excluded
 * (as in the preview) so a jump from near-zero never tops the chart. */
export function marketGrowth(rows: AggDeal[], fromYear: string, toYear: string): MarketGrowthRow[] {
  const countries = [...new Set(rows.map((r) => r.country).filter(Boolean))];
  return countries
    .map((country) => {
      const fromTotal = sumAmount(rows.filter((r) => r.country === country && r.date.startsWith(fromYear)));
      const toTotal = sumAmount(rows.filter((r) => r.country === country && r.date.startsWith(toYear)));
      return { country, fromTotal: round1(fromTotal), toTotal: round1(toTotal), pct: fromTotal >= 1 ? Math.round(((toTotal - fromTotal) / fromTotal) * 100) : null };
    })
    .filter((r): r is MarketGrowthRow => r.pct !== null)
    .sort((a, b) => b.pct - a.pct);
}

/** Cumulative race: running total Jan → Dec for the last 5 years; this year's future months are null. */
export function marketCumulative(rows: AggDeal[], location: string, today: Date): MarketCumulative {
  const scoped = location && location !== 'all' ? rows.filter((r) => r.country === location) : rows;
  const years = [...new Set(scoped.map((r) => r.date.slice(0, 4)))].sort().slice(-5);
  const currentYear = String(today.getFullYear());
  const series = years.map((year) => {
    let running = 0;
    const values = MONTHS.map((_, mi) => {
      running += sumAmount(scoped.filter((r) => r.date.startsWith(`${year}-${pad2(mi + 1)}`)));
      return year === currentYear && mi > today.getMonth() ? null : round1(running);
    });
    return { year, values };
  });
  return { months: MONTHS, currentYear, series };
}

function headToHeadStats(rows: AggDeal[], years: string[], totals: number[]): HeadToHeadStats {
  const peakIdx = totals.reduce((best, v, i) => (v > totals[best] ? i : best), 0);
  const first = totals.find((v) => v > 0) ?? 0;
  const last = totals[totals.length - 1] ?? 0;
  const periods = Math.max(1, totals.filter((v) => v > 0).length - 1);
  const cagr = first > 0 ? (Math.pow(last / first, 1 / periods) - 1) * 100 : 0;
  return { total: round1(sumAmount(rows)), rounds: rows.length, peakYear: years[peakIdx] ?? '—', cagr: Math.round(cagr) };
}

/** Head to head: yearly totals for two countries + capital, rounds, peak year, CAGR (as the preview computes it). */
export function marketHeadToHead(rows: AggDeal[], a: string, b: string): MarketHeadToHead {
  const years = [...new Set(rows.map((r) => r.date.slice(0, 4)))].sort();
  const side = (name: string) => {
    const scoped = rows.filter((r) => r.country === name);
    const totals = years.map((y) => round1(sumAmount(scoped.filter((r) => r.date.startsWith(y)))));
    return { name, totals, stats: headToHeadStats(scoped, years, totals) };
  };
  return { years, a: side(a), b: side(b) };
}
