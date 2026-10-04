/** USD millions → "$93 Mn" / "$1.25 Bn" / "$500K" / "—". Shared by the admin and reader Funding UIs. */
export function formatUsdMn(mn: number | null | undefined): string {
  if (mn === null || mn === undefined || Number.isNaN(mn)) return '—';
  if (mn === 0) return '$0';
  if (mn >= 1000) {
    const bn = mn / 1000;
    return `$${bn % 1 === 0 ? bn.toFixed(0) : bn.toFixed(2)} Bn`;
  }
  if (mn < 1) return `$${Math.round(mn * 1000)}K`;
  return `$${mn % 1 === 0 ? mn.toFixed(0) : mn.toFixed(1)} Mn`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** YYYY-MM-DD → "12 Mar 2026" without timezone drift. */
export function formatDealDate(iso: string): string {
  const [y, m, d] = (iso || '').split('-').map(Number);
  if (!y || !m || !d) return iso || '—';
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
}
