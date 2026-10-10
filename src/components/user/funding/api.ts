'use client';

import { getPublicToken } from '@/lib/public-auth';
import type { ReaderFilters } from './FilterBar';

/** Bearer header for the reader Funding APIs (token from the reader login). */
export function readerAuthHeaders(): HeadersInit {
  const token = getPublicToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** GET a reader Funding API; throws with a readable message on 401 / failure. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fundingGet<T = any>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { headers: readerAuthHeaders(), signal });
  const json = await res.json().catch(() => null);
  if (res.status === 401) throw new Error('Your session has expired. Please log in again.');
  if (!json?.success) throw new Error(json?.error || 'Could not load funding data.');
  return json as T;
}

export function toQuery(params: Record<string, string | number | undefined | null>): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') qs.set(k, String(v).trim());
  });
  return qs.toString();
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Jan 1 → today of the current year, as YYYY-MM-DD. */
export function thisYearRange(): { from: string; to: string } {
  const now = new Date();
  return {
    from: `${now.getFullYear()}-01-01`,
    to: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`,
  };
}

/** Filter-bar defaults: this calendar year, everything else open. */
export function emptyFilters(country = ''): ReaderFilters {
  return { search: '', sector: '', stage: '', city: '', country, investor: '', leadInvestor: '', ...thisYearRange() };
}
