import type { DossierStatus } from '@/modules/incubatx-dossier/domain/types';

/** How each dossier status reads in the Grants section. `pending` is shown as "New" — it is the
 * state every submission lands in until someone opens and reviews it. Class names stay literal
 * strings so the scoped Tailwind sheet (staff-panel-tailwind.css) can see them. */
export const GRANT_STATUS_META: Record<DossierStatus, { label: string; chip: string; dot: string; text: string }> = {
  pending: { label: 'New', chip: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', text: 'text-amber-700' },
  reviewed: { label: 'Reviewed', chip: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500', text: 'text-sky-700' },
  accepted: { label: 'Accepted', chip: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  rejected: { label: 'Rejected', chip: 'bg-red-50 text-red-700', dot: 'bg-red-500', text: 'text-red-700' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The DB hands back "YYYY-MM-DD HH:mm:ss" already in IST (dateStrings + timezone +05:30), so it is
 * split rather than passed to Date — Date would read it in the viewer's own zone. */
export function formatSubmitted(value: string, withTime = false): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(value || '');
  if (!m) return value || '—';
  const day = `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
  if (!withTime || !m[4]) return day;
  const h = Number(m[4]);
  return `${day}, ${h % 12 || 12}:${m[5]} ${h < 12 ? 'AM' : 'PM'}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
