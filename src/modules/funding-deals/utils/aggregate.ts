/**
 * Pure aggregation over funding deals, used server-side by the Funding overview API.
 * Every breakdown carries both $ total (USD Mn, undisclosed counted as 0) and deal count.
 */

import type { AggRow, FundingKpis, TimeBucket } from '../domain/types';

/** Bucket sizes: the pinned card uses week/month/year; Market Analysis also uses quarter. */
export type Granularity = 'week' | 'month' | 'quarter' | 'year';

export interface AggDeal {
  date: string;
  sector: string;
  roundStage: string;
  city: string;
  country: string;
  amount: number | null;
  investors: string;
}

export function sumBy<T extends { amount: number | null }>(rows: T[], keyFn: (r: T) => string): AggRow[] {
  const map = new Map<string, AggRow>();
  for (const r of rows) {
    const key = keyFn(r) || 'Unspecified';
    const e = map.get(key) ?? { key, total: 0, count: 0 };
    e.total += r.amount ?? 0;
    e.count += 1;
    map.set(key, e);
  }
  return [...map.values()].map(roundRow).sort((a, b) => b.total - a.total || b.count - a.count);
}

/** Splits the comma-separated investor list; a deal counts once for each investor on it. */
export function investorAgg(rows: AggDeal[]): AggRow[] {
  const map = new Map<string, AggRow>();
  for (const r of rows) {
    const names = new Set(
      r.investors.split(',').map((s) => s.trim()).filter(Boolean),
    );
    for (const key of names) {
      const e = map.get(key) ?? { key, total: 0, count: 0 };
      e.total += r.amount ?? 0;
      e.count += 1;
      map.set(key, e);
    }
  }
  return [...map.values()].map(roundRow);
}

function roundRow(r: AggRow): AggRow {
  return { ...r, total: Math.round(r.total * 10) / 10 };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** YYYY-MM-DD → bucket key/label. Weeks start on Monday. Dates are parsed as UTC to avoid TZ drift. */
export function bucketOf(iso: string, range: Granularity): { key: string; label: string } {
  const [y, m, d] = iso.split('-').map(Number);
  if (range === 'year') return { key: String(y), label: String(y) };
  if (range === 'quarter') {
    const q = Math.floor((m - 1) / 3) + 1;
    return { key: `${y}-Q${q}`, label: `Q${q} '${String(y).slice(2)}` };
  }
  if (range === 'month') return { key: `${y}-${pad2(m)}`, label: `${MONTH_SHORT[m - 1]} ${y}` };
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  const end = new Date(date);
  end.setUTCDate(date.getUTCDate() + 6);
  const fmt = (x: Date) => `${MONTH_SHORT[x.getUTCMonth()]} ${x.getUTCDate()}`;
  return {
    key: `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`,
    label: `${fmt(date)}–${fmt(end)}`,
  };
}

export function timeBuckets(rows: { date: string; amount: number | null }[], range: Granularity): TimeBucket[] {
  const map = new Map<string, TimeBucket>();
  for (const r of rows) {
    if (!r.date) continue;
    const { key, label } = bucketOf(r.date, range);
    const e = map.get(key) ?? { key, label, total: 0, count: 0 };
    e.total += r.amount ?? 0;
    e.count += 1;
    map.set(key, e);
  }
  return [...map.values()]
    .map((b) => ({ ...b, total: Math.round(b.total * 10) / 10 }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));
}

export function computeKpis(rows: AggDeal[]): FundingKpis {
  const disclosed = rows.filter((r) => r.amount !== null);
  const totalFunding = disclosed.reduce((a, r) => a + (r.amount ?? 0), 0);
  const bySector = sumBy(rows, (r) => r.sector);
  const investors = investorAgg(rows).sort((a, b) => b.count - a.count || b.total - a.total);
  return {
    totalFunding: Math.round(totalFunding * 10) / 10,
    totalDeals: rows.length,
    disclosedDeals: disclosed.length,
    avgRound: disclosed.length ? Math.round((totalFunding / disclosed.length) * 10) / 10 : 0,
    activeSectors: new Set(rows.map((r) => r.sector).filter(Boolean)).size,
    leadingSector: bySector[0] ?? null,
    topInvestor: investors[0] ?? null,
  };
}

/** Round-size bands by actual $ amount (Dealroom-style), as in the preview's Market Analysis. */
export const ROUND_BANDS = [
  { key: 'startup', label: 'Startup capital', range: '$0–15M', min: 0, max: 15 },
  { key: 'breakout', label: 'Breakout capital', range: '$15–100M', min: 15, max: 100 },
  { key: 'scaleup', label: 'Scaleup capital', range: '$100–250M', min: 100, max: 250 },
  { key: 'mega', label: 'Mega capital', range: '$250M–1B', min: 250, max: 1000 },
  { key: 'giga', label: 'Giga capital', range: '$1B+', min: 1000, max: Infinity },
] as const;

export type RoundBand = (typeof ROUND_BANDS)[number];

/** Band for a USD Mn amount; null for undisclosed. Lower bound inclusive (15 → breakout). */
export function bandFor(amount: number | null): RoundBand | null {
  if (amount === null || amount === undefined) return null;
  return ROUND_BANDS.find((b) => amount >= b.min && amount < b.max) ?? ROUND_BANDS[ROUND_BANDS.length - 1];
}
