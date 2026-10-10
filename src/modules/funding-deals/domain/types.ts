/**
 * Funding deals — the funding-round dataset behind the reader dashboard's Funding page
 * (/dashboard/funding). Managed from /admin/funding-data by the Financial Analyst role and the
 * super admin, by manual entry or Excel/CSV upload.
 */

export interface FundingDealEntity {
  id: number;
  deal_date: string; // YYYY-MM-DD (pool uses dateStrings)
  startup_name: string;
  sector: string | null;
  business_model: string | null;
  round_stage: string | null;
  amount_usd_mn: string | number | null; // DECIMAL comes back as a string
  amount_raw: string | null;
  city: string | null;
  country: string | null;
  lead_investor: string | null;
  investors: string | null;
  source_url: string | null;
  batch_id: number | null;
  dedupe_key: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FundingDeal {
  id: number;
  date: string;
  startupName: string;
  sector: string;
  businessModel: string;
  roundStage: string;
  /** USD millions; null when undisclosed. */
  amount: number | null;
  amountRaw: string;
  city: string;
  country: string;
  leadInvestor: string;
  investors: string;
  sourceUrl: string;
  batchId: number | null;
  createdBy: string;
  createdAt: string;
}

/** The editable fields — what manual entry, edit and an upload row all provide. */
export interface FundingDealInput {
  date: string;
  startupName: string;
  sector?: string;
  businessModel?: string;
  roundStage?: string;
  /** Free text as typed/uploaded ("$93 Mn", "₹50 Cr", "Undisclosed"); parsed to USD Mn server-side. */
  amountRaw?: string;
  city?: string;
  country?: string;
  leadInvestor?: string;
  investors?: string;
  sourceUrl?: string;
}

export interface FundingFilters {
  search?: string;
  sector?: string;
  stage?: string;
  city?: string;
  country?: string;
  investor?: string;
  /** Exact match on the Lead Investor column (dropdown); `investor` is the free-text match on the full list. */
  leadInvestor?: string;
  from?: string;
  to?: string;
}

export interface FundingUploadBatch {
  id: number;
  fileName: string;
  rowsTotal: number;
  rowsInserted: number;
  rowsSkipped: number;
  rowsInvalid: number;
  uploadedBy: string;
  uploadedByRole: string;
  createdAt: string;
  /** Deals still in the table from this batch (edits/deletes since upload lower it). */
  dealsRemaining: number;
}

export interface AggRow {
  key: string;
  total: number;
  count: number;
}

export interface TimeBucket extends AggRow {
  label: string;
}

export type TrendRange = 'week' | 'month' | 'year';

export interface FundingKpis {
  totalFunding: number;
  totalDeals: number;
  disclosedDeals: number;
  avgRound: number;
  activeSectors: number;
  leadingSector: AggRow | null;
  topInvestor: AggRow | null;
}

/** An investor's participation. `total` credits the full round to every investor on it, so these
 * overlap and must never be summed. `leads` = deals where they are (one of) the lead investors. */
export interface InvestorRow extends AggRow {
  leads: number;
}

/** One round-stage × sector cell; each deal has exactly one of each, so cells sum to the totals. */
export interface StageSectorCell {
  stage: string;
  sector: string;
  total: number;
  count: number;
}

export interface StageSectorMatrix {
  /** Top stages by $, then "Other" when more exist. */
  stages: string[];
  /** Top sectors by $, then "Other" when more exist. */
  sectors: string[];
  cells: StageSectorCell[];
}

/** A round-size band (ROUND_BANDS) with its deal count and $. */
export interface SizeBandRow extends AggRow {
  label: string;
  range: string;
}

export interface FundingOverview {
  pinned: {
    year: number;
    country: string;
    range: TrendRange;
    total: number;
    deals: number;
    trend: TimeBucket[];
  };
  kpis: FundingKpis;
  /** Same window one year earlier (same country); null when no date window is set. */
  previousKpis: FundingKpis | null;
  /** Every sector / stage / city, sorted by $ (largest first). */
  bySector: AggRow[];
  byStage: AggRow[];
  byCity: AggRow[];
  topInvestors: InvestorRow[];
  stageSector: StageSectorMatrix;
  bySizeBand: SizeBandRow[];
  byBusinessModel: AggRow[];
  topCompanies: AggRow[];
  forecast: FundingForecast;
  signals: FundingSignal[];
}

export interface FundingFilterOptions {
  sectors: string[];
  stages: string[];
  cities: string[];
  countries: string[];
  leadInvestors: string[];
}

// ── Forecast + signals (Dashboard "12-month outlook") ──

export interface FundingForecast {
  historyLabels: string[];
  historyValues: number[];
  forecastLabels: string[];
  forecastValues: number[];
  /** Plain-language note on how it was computed, or why there is no forecast. */
  method: string;
}

export type SignalDirection = 'up' | 'down' | 'flat';

/** One read-out; `parts` render as text runs, bold where `bold` is set (no HTML strings). */
export interface FundingSignal {
  dir: SignalDirection;
  parts: { text: string; bold?: boolean }[];
}

// ── Market Analysis ──

export type MarketView = 'overview' | 'timeseries' | 'location' | 'growth' | 'cumulative' | 'h2h';

export interface MarketKpis {
  capital: number;
  rounds: number;
  meanCheck: number;
}

export interface SankeyFlow {
  from: string;
  to: string;
  amount: number;
}

export interface MarketOverview {
  monthly: TimeBucket[];
  stages: AggRow[];
  sectors: AggRow[];
  flows: SankeyFlow[];
}

export interface MarketTimeSeries {
  labels: string[];
  bands: { key: string; label: string; range: string; values: number[] }[];
}

export interface MarketLocation {
  countries: AggRow[];
  marimekko: {
    key: string;
    label: string;
    range: string;
    total: number;
    byCountry: { country: string; total: number }[];
  }[];
}

export interface MarketGrowthRow {
  country: string;
  fromTotal: number;
  toTotal: number;
  pct: number;
}

export interface MarketCumulative {
  months: string[];
  currentYear: string;
  series: { year: string; values: (number | null)[] }[];
}

export interface HeadToHeadStats {
  total: number;
  rounds: number;
  peakYear: string;
  cagr: number;
}

export interface MarketHeadToHead {
  years: string[];
  a: { name: string; totals: number[]; stats: HeadToHeadStats };
  b: { name: string; totals: number[]; stats: HeadToHeadStats };
}

/** Lists every Market Analysis dropdown needs, sent with each view. */
export interface MarketMeta {
  countries: string[];
  years: string[];
  kpis: MarketKpis;
}
