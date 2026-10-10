import type {
  FundingDeal,
  FundingFilterOptions,
  FundingFilters,
  FundingOverview,
  FundingUploadBatch,
  MarketMeta,
  MarketView,
  TrendRange,
} from '../domain/types';
import { FundingDealsRepository, isDuplicateKeyError, type FundingDealWrite } from '../repository/funding-deals.repository';
import { computeKpis, investorAgg, sizeBandAgg, stageSectorMatrix, sumBy, timeBuckets, type Granularity } from '../utils/aggregate';
import { computeForecast, generateSignals } from '../utils/forecast';
import {
  marketCumulative,
  marketGrowth,
  marketHeadToHead,
  marketLocation,
  marketMeta,
  marketOverview,
  marketTimeSeries,
} from '../utils/market';
import { buildDedupeKey, normalizeDealInput, validateDealInput, type FundingColumnKey } from '../utils/columns';
import { parseAmountToUsdMn } from '../utils/parse-amount';

export const MAX_IMPORT_ROWS = 20000;

const repo = new FundingDealsRepository();

type RawInput = Partial<Record<FundingColumnKey, unknown>>;

/** Tidy + validate one input. Returns the row to write, or the reason it can't be saved. */
export function prepareDeal(input: RawInput): { row: FundingDealWrite } | { error: string } {
  const clean = normalizeDealInput(input);
  const error = validateDealInput(clean);
  if (error) return { error };
  return {
    row: {
      ...clean,
      amount: parseAmountToUsdMn(clean.amountRaw),
      dedupeKey: buildDedupeKey(clean),
    },
  };
}

export interface ImportResult {
  batchId: number;
  total: number;
  inserted: number;
  skippedDuplicates: number;
  invalid: { row: number; reason: string }[];
}

/**
 * Import rows already parsed in the browser. `rowNumbers[i]` is the spreadsheet row of rows[i] so
 * invalid-row messages point at the right line. Duplicates — both within the file and against
 * deals already stored — are skipped, never overwritten.
 */
export async function importDeals(
  fileName: string,
  rows: RawInput[],
  rowNumbers: number[],
  user: { email: string | null; role: string | null },
): Promise<ImportResult> {
  const invalid: { row: number; reason: string }[] = [];
  const valid: FundingDealWrite[] = [];
  const seen = new Set<string>();
  let duplicatesInFile = 0;

  rows.forEach((raw, i) => {
    const prepared = prepareDeal(raw);
    if ('error' in prepared) {
      invalid.push({ row: rowNumbers[i] ?? i + 2, reason: prepared.error });
      return;
    }
    if (seen.has(prepared.row.dedupeKey)) {
      duplicatesInFile += 1;
      return;
    }
    seen.add(prepared.row.dedupeKey);
    valid.push(prepared.row);
  });

  const batchId = await repo.createBatch(fileName || 'upload.xlsx', rows.length, user.email, user.role);
  const inserted = valid.length ? await repo.bulkInsert(valid, batchId, user.email) : 0;
  const skippedDuplicates = duplicatesInFile + (valid.length - inserted);
  await repo.finishBatch(batchId, { inserted, skipped: skippedDuplicates, invalid: invalid.length });

  return { batchId, total: rows.length, inserted, skippedDuplicates, invalid };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function todayIso(): string {
  const d = new Date(); // process TZ is Asia/Kolkata (shared/database/connection.ts)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** YYYY-MM-DD moved by whole years; 29 Feb becomes 28 Feb in a non-leap year. */
function shiftYear(iso: string, years: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const ny = y + years;
  const last = new Date(Date.UTC(ny, m, 0)).getUTCDate();
  return `${ny}-${pad2(m)}-${pad2(Math.min(d, last))}`;
}

/**
 * Everything the reader Funding page shows above the deals table.
 * `pinned` is the "{year} Funding Overview" card — current calendar year, filtered only by the
 * country tab (All/India/USA), never by the filter bar. The rest follows the filter bar.
 */
export async function getFundingOverview(
  filters: FundingFilters,
  pinnedCountry: string,
  range: TrendRange,
): Promise<FundingOverview> {
  const today = todayIso();
  const year = Number(today.slice(0, 4));
  const yearStart = `${year}-01-01`;
  const countryFilter = pinnedCountry && pinnedCountry !== 'all' ? pinnedCountry : undefined;

  // Same window one year earlier, for the dashboard's year-on-year chips. Only when a window is set.
  const previousFilters = filters.from && filters.to
    ? { ...filters, from: shiftYear(filters.from, -1), to: shiftYear(filters.to, -1) }
    : null;

  const [filtered, pinnedYear, pinnedAllYears, previous] = await Promise.all([
    repo.findForAggregation(filters),
    repo.findForAggregation({ country: countryFilter, from: yearStart, to: today }),
    range === 'year' ? repo.findForAggregation({ country: countryFilter, to: today }) : Promise.resolve(null),
    previousFilters ? repo.findForAggregation(previousFilters) : Promise.resolve(null),
  ]);

  const trend = range === 'year'
    ? timeBuckets(pinnedAllYears ?? [], 'year').slice(-5)
    : timeBuckets(pinnedYear, range).slice(-16);

  return {
    pinned: {
      year,
      country: pinnedCountry || 'all',
      range,
      total: Math.round(pinnedYear.reduce((a, r) => a + (r.amount ?? 0), 0) * 10) / 10,
      deals: pinnedYear.length,
      trend,
    },
    kpis: computeKpis(filtered),
    previousKpis: previous ? computeKpis(previous) : null,
    bySector: sumBy(filtered, (r) => r.sector),
    byStage: sumBy(filtered, (r) => r.roundStage),
    byCity: sumBy(filtered, (r) => r.city),
    topInvestors: investorAgg(filtered).sort((a, b) => b.total - a.total || b.count - a.count).slice(0, 10),
    stageSector: stageSectorMatrix(filtered),
    bySizeBand: sizeBandAgg(filtered),
    byBusinessModel: sumBy(filtered, (r) => r.businessModel ?? ''),
    topCompanies: sumBy(filtered, (r) => r.startupName ?? '').slice(0, 10),
    forecast: computeForecast(filtered),
    signals: generateSignals(filtered),
  };
}

export const MARKET_VIEWS: MarketView[] = ['overview', 'timeseries', 'location', 'growth', 'cumulative', 'h2h'];

/**
 * One Market Analysis tab's data plus the shared meta (country/year lists, 12-month KPI strip).
 * Every tab reads the whole dataset (compact rows); params are the tab's own controls.
 */
export async function getMarketView(
  view: MarketView,
  params: URLSearchParams,
): Promise<{ meta: MarketMeta; data: unknown }> {
  const rows = await repo.findForAggregation({});
  const today = new Date(); // process TZ is Asia/Kolkata
  const meta = marketMeta(rows, today);
  const p = (k: string) => (params.get(k) ?? '').slice(0, 100);

  switch (view) {
    case 'overview':
      return { meta, data: marketOverview(rows, today) };
    case 'timeseries': {
      const g = p('granularity');
      const granularity: Granularity = g === 'month' || g === 'year' ? g : 'quarter';
      return { meta, data: marketTimeSeries(rows, p('location') || 'all', granularity) };
    }
    case 'location':
      return { meta, data: marketLocation(rows, p('metric') === 'count' ? 'count' : 'amount') };
    case 'growth': {
      const years = meta.years;
      const to = years.includes(p('to')) ? p('to') : years[years.length - 1] ?? '';
      const from = years.includes(p('from')) ? p('from') : years[Math.max(0, years.length - 2)] ?? '';
      return { meta, data: { from, to, rows: marketGrowth(rows, from, to) } };
    }
    case 'cumulative':
      return { meta, data: marketCumulative(rows, p('location') || 'all', today) };
    case 'h2h': {
      const countries = meta.countries;
      const a = countries.includes(p('a')) ? p('a') : countries.includes('India') ? 'India' : countries[0] ?? '';
      const b = countries.includes(p('b')) ? p('b') : countries.includes('USA') ? 'USA' : countries[1] ?? countries[0] ?? '';
      return { meta, data: marketHeadToHead(rows, a, b) };
    }
  }
}

/** Filter params shared by the admin and reader APIs. Empty / 'all' values are dropped. */
export function filtersFromSearchParams(sp: URLSearchParams): FundingFilters {
  const get = (k: string) => {
    const v = (sp.get(k) ?? '').trim();
    return v && v !== 'all' ? v.slice(0, 200) : undefined;
  };
  const date = (k: string) => {
    const v = get(k);
    return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
  };
  return {
    search: get('search'),
    sector: get('sector'),
    stage: get('stage'),
    city: get('city'),
    country: get('country'),
    investor: get('investor'),
    leadInvestor: get('leadInvestor'),
    from: date('from'),
    to: date('to'),
  };
}

// ── Thin pass-throughs so route handlers never touch the repository (arch.md §9 #1). ──

export { isDuplicateKeyError };

export function listDeals(filters: FundingFilters, page: number, pageSize: number): Promise<{ deals: FundingDeal[]; total: number }> {
  return repo.findPage(filters, page, pageSize);
}

/** Every matching deal for an .xlsx export (capped at 50,000). */
export function listDealsForExport(filters: FundingFilters): Promise<FundingDeal[]> {
  return repo.findAll(filters);
}

export function getDeal(id: number): Promise<FundingDeal | null> {
  return repo.findById(id);
}

/** Throws a duplicate-key error (isDuplicateKeyError) when the same date/startup/stage exists. */
export function createDeal(row: FundingDealWrite, createdBy: string | null): Promise<number> {
  return repo.create(row, createdBy);
}

export function updateDeal(id: number, row: FundingDealWrite): Promise<boolean> {
  return repo.update(id, row);
}

export function deleteDeal(id: number): Promise<boolean> {
  return repo.delete(id);
}

export function listUploadBatches(): Promise<FundingUploadBatch[]> {
  return repo.listBatches();
}

/** Undo an upload: deletes the batch and (FK cascade) every deal it added that is still there. */
export function undoUploadBatch(id: number): Promise<{ found: boolean; dealsRemoved: number }> {
  return repo.deleteBatch(id);
}

export function getFilterOptions(): Promise<FundingFilterOptions> {
  return repo.filterOptions();
}

/** Admin dashboard card numbers (Financial Analyst). */
export function getFundingSummary(): Promise<{ deals: number; capital: number; lastUploadAt: string | null }> {
  return repo.summary();
}
