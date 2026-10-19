/** Reader Reports "Pro plan" lock: the first `freePages` pages of each report section are open to
 * every reader, everything after them is shown greyed and cannot be opened. Set by the super admin
 * in Admin › User Management › Reports; stored in `site_settings` under REPORTS_FREE_PAGES_KEY. */

/** Reports per page on /dashboard/reports. The lock is counted in these pages, so the page and the
 * API must use the same number. */
export const REPORTS_PAGE_SIZE = 12;

/** Master switch for the whole feature. Off since the reader Reports page dropped pagination (it
 * now lists every report of a section in one grid), which the page-based lock depends on. While off:
 * /api/reports locks nothing, the Reports tab is hidden in Admin › User Management, and the admin
 * reports-lock API answers 403. The stored setting is left untouched for when this is turned back on. */
export const REPORTS_LOCK_ENABLED = false;

/** Highest "lock starts from page" the admin can pick. */
export const MAX_LOCK_START_PAGE = 10;

/** Open pages until the admin saves a choice: pages 1 and 2 open, locked from page 3. */
export const DEFAULT_FREE_PAGES = 2;

export const REPORTS_FREE_PAGES_KEY = 'reports_free_pages';

/** Stored value meaning "no lock". */
export const NO_LOCK_VALUE = 'none';

/** Number of open pages, or null when nothing is locked. 0 = locked from page 1. */
export type FreePages = number | null;

/** Stored setting → FreePages; anything missing or malformed gives the default. */
export function parseFreePages(value: string | null | undefined): FreePages {
  if (value === NO_LOCK_VALUE) return null;
  const n = Number(value);
  if (value == null || value.trim() === '' || !Number.isInteger(n) || n < 0 || n >= MAX_LOCK_START_PAGE) return DEFAULT_FREE_PAGES;
  return n;
}

/** Request body `{ freePages }` → FreePages, or an error message. */
export function validateFreePages(input: unknown): { freePages: FreePages } | { error: string } {
  const v = (input as { freePages?: unknown } | null)?.freePages;
  if (v === null) return { freePages: null };
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v >= MAX_LOCK_START_PAGE) {
    return { error: `Pick a page from 1 to ${MAX_LOCK_START_PAGE}, or no lock.` };
  }
  return { freePages: v };
}

/** Marks each report past the open pages of its own section as locked and removes its file link, so
 * a locked report cannot be opened from the response. `reports` must already be in display order
 * (newest first), the order the reader page pages them in. */
export function applyReportsLock<T extends { section_id: number | null; file_url: string; file_name: string | null }>(
  reports: T[],
  freePages: FreePages,
): (T & { locked: boolean })[] {
  if (freePages === null) return reports.map((r) => ({ ...r, locked: false }));
  const open = freePages * REPORTS_PAGE_SIZE;
  const seen = new Map<number | null, number>();
  return reports.map((r) => {
    const index = seen.get(r.section_id) ?? 0;
    seen.set(r.section_id, index + 1);
    return index < open ? { ...r, locked: false } : { ...r, file_url: '', file_name: null, locked: true };
  });
}
