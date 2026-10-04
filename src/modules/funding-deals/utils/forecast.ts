/**
 * Dashboard "12-month outlook": a least-squares straight line over the filtered monthly totals,
 * projected 12 months ahead, plus four plain read-outs. Ported from the preview's
 * computeForecast / generateInsights. Not AI — the UI labels it "Trend-based".
 */

import type { FundingForecast, FundingSignal } from '../domain/types';
import { investorAgg, sumBy, timeBuckets, type AggDeal } from './aggregate';
import { formatUsdMn } from './format';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function linreg(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = points.length;
  if (!n) return { slope: 0, intercept: 0 };
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumXX = points.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  return { slope, intercept: (sumY - slope * sumX) / n };
}

/** "2026-03" + n months → { key, label } */
function addMonths(monthKey: string, n: number): { key: string; label: string } {
  const [y, m] = monthKey.split('-').map(Number);
  const idx = y * 12 + (m - 1) + n;
  const ny = Math.floor(idx / 12);
  const nm = idx % 12;
  return { key: `${ny}-${String(nm + 1).padStart(2, '0')}`, label: `${MONTHS[nm]} ${ny}` };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeForecast(rows: AggDeal[]): FundingForecast {
  const monthly = timeBuckets(rows, 'month');
  const result: FundingForecast = { historyLabels: [], historyValues: [], forecastLabels: [], forecastValues: [], method: '' };
  if (monthly.length < 3) {
    result.method = 'Not enough monthly history in the current filter to fit a trend — widen the date range.';
    return result;
  }
  const { slope, intercept } = linreg(monthly.map((m, i) => ({ x: i, y: m.total })));
  result.historyLabels = monthly.map((m) => m.label);
  result.historyValues = monthly.map((m) => round1(m.total));
  const lastKey = monthly[monthly.length - 1].key;
  for (let i = 1; i <= 12; i++) {
    const next = addMonths(lastKey, i);
    result.forecastLabels.push(next.label);
    result.forecastValues.push(round1(Math.max(0, slope * (monthly.length - 1 + i) + intercept)));
  }
  result.method = `Straight-line trend fitted across ${monthly.length} months of the filtered data (slope ${slope >= 0 ? '+' : ''}${slope.toFixed(1)} $Mn/month), projected 12 months ahead.`;
  return result;
}

export function generateSignals(rows: AggDeal[]): FundingSignal[] {
  const signals: FundingSignal[] = [];
  const monthly = timeBuckets(rows, 'month');
  const total = rows.reduce((a, r) => a + (r.amount ?? 0), 0);

  if (monthly.length >= 2) {
    const prev = monthly[monthly.length - 2];
    const cur = monthly[monthly.length - 1];
    const pct = prev.total > 0 ? ((cur.total - prev.total) / prev.total) * 100 : cur.total > 0 ? 100 : 0;
    signals.push({
      dir: pct >= 3 ? 'up' : pct <= -3 ? 'down' : 'flat',
      parts: [
        { text: 'Monthly funding moved from ' },
        { text: formatUsdMn(prev.total), bold: true },
        { text: ` (${prev.label}) to ` },
        { text: formatUsdMn(cur.total), bold: true },
        { text: ` (${cur.label}) — a ${pct >= 0 ? '+' : ''}${pct.toFixed(0)}% swing.` },
      ],
    });
  }

  const bySector = sumBy(rows, (r) => r.sector);
  if (bySector.length) {
    const top = bySector[0];
    const share = total > 0 ? (top.total / total) * 100 : 0;
    signals.push({
      dir: share > 40 ? 'flat' : 'up',
      parts: [
        { text: top.key, bold: true },
        { text: ` leads with ${formatUsdMn(top.total)} across ${top.count} deals — ${share.toFixed(0)}% of tracked capital.` },
      ],
    });
  }

  const investors = investorAgg(rows).sort((a, b) => b.count - a.count || b.total - a.total);
  if (investors.length) {
    signals.push({
      dir: 'up',
      parts: [
        { text: investors[0].key, bold: true },
        { text: ` is the most active investor in view, participating in ${investors[0].count} deals.` },
      ],
    });
  }

  const disclosed = rows.filter((r) => r.amount !== null);
  if (disclosed.length) {
    const avg = disclosed.reduce((a, r) => a + (r.amount ?? 0), 0) / disclosed.length;
    signals.push({
      dir: 'flat',
      parts: [{ text: 'Average round size across the current view is ' }, { text: formatUsdMn(avg), bold: true }, { text: '.' }],
    });
  }

  if (!signals.length) signals.push({ dir: 'flat', parts: [{ text: 'Not enough data to generate signals yet.' }] });
  return signals;
}
