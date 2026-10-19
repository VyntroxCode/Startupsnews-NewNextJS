/**
 * How dollar amounts are written across the admin and reader Funding UIs. Set once per page/request
 * from the admin's saved choice (`funding_number_system` in site_settings):
 *   indian        → "$9.3 Cr" / "$50 L"      (lakh = 1e5, crore = 1e7 dollars)
 *   international → "$93 Mn" / "$1.25 Bn"
 * Amounts stay stored in USD millions either way — this only changes how they are written.
 */
export type NumberSystem = 'indian' | 'international';

export const NUMBER_SYSTEM_OPTIONS: { value: NumberSystem; label: string; units: string }[] = [
  { value: 'indian', label: 'Indian', units: 'Lakh / Crore' },
  { value: 'international', label: 'International', units: 'Million / Billion' },
];

export function isNumberSystem(value: unknown): value is NumberSystem {
  return value === 'indian' || value === 'international';
}

let currentSystem: NumberSystem = 'international';

/** Called by the page shell (browser) or the service (server) before anything is formatted. */
export function setNumberSystem(system: NumberSystem): void {
  currentSystem = system;
}

export function getNumberSystem(): NumberSystem {
  return currentSystem;
}

/** Units the admin can type a round size in, biggest first, as whole dollars. */
export const AMOUNT_UNITS: Record<NumberSystem, { key: string; label: string; dollars: number }[]> = {
  indian: [
    { key: 'cr', label: 'Crore', dollars: 1e7 },
    { key: 'l', label: 'Lakh', dollars: 1e5 },
  ],
  international: [
    { key: 'bn', label: 'Billion', dollars: 1e9 },
    { key: 'mn', label: 'Million', dollars: 1e6 },
  ],
};

/** 1234.5 → "1,234.5" in the system's grouping, at most `digits` decimals. */
function num(value: number, digits: number, system: NumberSystem): string {
  return value.toLocaleString(system === 'indian' ? 'en-IN' : 'en-US', { maximumFractionDigits: digits });
}

/** USD millions → "$93 Mn" / "$1.25 Bn" / "$500K" (international) or "$9.3 Cr" / "$50 L" (indian); "—" when missing. */
export function formatUsdMn(mn: number | null | undefined, system: NumberSystem = currentSystem): string {
  if (mn === null || mn === undefined || Number.isNaN(mn)) return '—';
  if (mn === 0) return '$0';
  if (system === 'indian') {
    if (mn >= 10) return `$${num(mn / 10, 2, system)} Cr`;
    if (mn >= 0.1) return `$${num(mn * 10, 2, system)} L`;
    return `$${Math.round(mn * 1000)}K`;
  }
  if (mn >= 1000) {
    const bn = mn / 1000;
    return `$${bn % 1 === 0 ? bn.toFixed(0) : bn.toFixed(2)} Bn`;
  }
  if (mn < 1) return `$${Math.round(mn * 1000)}K`;
  return `$${mn % 1 === 0 ? mn.toFixed(0) : mn.toFixed(1)} Mn`;
}

/** Round-size band label from its USD Mn bounds: "$15–100M" / "$1B+" or "$1.5–10 Cr" / "$100 Cr+". */
export function formatBandRange(minMn: number, maxMn: number, system: NumberSystem = currentSystem): string {
  if (system === 'indian') {
    const cr = (mn: number) => num(mn / 10, 2, system);
    return maxMn === Infinity ? `$${cr(minMn)} Cr+` : `$${cr(minMn)}–${cr(maxMn)} Cr`;
  }
  const short = (mn: number) => (mn >= 1000 ? `${num(mn / 1000, 2, system)}B` : `${num(mn, 2, system)}M`);
  if (maxMn === Infinity) return `$${short(minMn)}+`;
  // "$0–15M", "$250M–1B": the unit is written once when both ends share it.
  const lo = short(minMn);
  const hi = short(maxMn);
  return lo.slice(-1) === hi.slice(-1) || minMn === 0 ? `$${lo.slice(0, -1)}–${hi}` : `$${lo}–${hi}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** YYYY-MM-DD → "12 Mar 2026" without timezone drift. */
export function formatDealDate(iso: string): string {
  const [y, m, d] = (iso || '').split('-').map(Number);
  if (!y || !m || !d) return iso || '—';
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
}
