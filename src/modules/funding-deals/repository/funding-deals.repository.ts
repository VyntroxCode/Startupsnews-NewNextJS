import { getDbConnection, query, queryOne } from '@/shared/database/connection';
import type {
  FundingDeal,
  FundingDealEntity,
  FundingDealInput,
  FundingFilterOptions,
  FundingFilters,
  FundingUploadBatch,
} from '../domain/types';
import type { AggDeal } from '../utils/aggregate';

type SqlParam = string | number | null;
type DbRow = Record<string, unknown>;

interface WriteResult {
  insertId?: number | bigint;
  affectedRows?: number | bigint;
}

/** A row ready to write: the tidied input plus its parsed amount and dedupe key. */
export interface FundingDealWrite extends FundingDealInput {
  amount: number | null;
  dedupeKey: string;
}

/** COUNT(*) / BIGINT come back as BigInt and DECIMAL as a string — every numeric read goes through this. */
function num(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  return Number(value);
}

function str(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

export function entityToDeal(row: FundingDealEntity | DbRow): FundingDeal {
  const r = row as DbRow;
  return {
    id: num(r.id),
    date: str(r.deal_date).slice(0, 10),
    startupName: str(r.startup_name),
    sector: str(r.sector),
    businessModel: str(r.business_model),
    roundStage: str(r.round_stage),
    amount: r.amount_usd_mn === null || r.amount_usd_mn === undefined ? null : num(r.amount_usd_mn),
    amountRaw: str(r.amount_raw),
    city: str(r.city),
    country: str(r.country),
    leadInvestor: str(r.lead_investor),
    investors: str(r.investors),
    sourceUrl: str(r.source_url),
    batchId: r.batch_id === null || r.batch_id === undefined ? null : num(r.batch_id),
    createdBy: str(r.created_by),
    createdAt: str(r.created_at),
  };
}

function nullable(value: string | undefined): string | null {
  return value ? value : null;
}

/** WHERE clause for the shared filter set. Exact match for dropdown filters, LIKE for free text. */
function buildWhere(filters: FundingFilters): { where: string; params: SqlParam[] } {
  const clauses: string[] = [];
  const params: SqlParam[] = [];
  const like = (s: string) => `%${s.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;

  if (filters.search) {
    clauses.push('(startup_name LIKE ? OR sector LIKE ? OR investors LIKE ?)');
    const s = like(filters.search);
    params.push(s, s, s);
  }
  if (filters.sector) { clauses.push('sector = ?'); params.push(filters.sector); }
  if (filters.stage) { clauses.push('round_stage = ?'); params.push(filters.stage); }
  if (filters.city) { clauses.push('city = ?'); params.push(filters.city); }
  if (filters.country) { clauses.push('country = ?'); params.push(filters.country); }
  if (filters.investor) { clauses.push('investors LIKE ?'); params.push(like(filters.investor)); }
  if (filters.from) { clauses.push('deal_date >= ?'); params.push(filters.from); }
  if (filters.to) { clauses.push('deal_date <= ?'); params.push(filters.to); }

  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

const INSERT_COLUMNS =
  'deal_date, startup_name, sector, business_model, round_stage, amount_usd_mn, amount_raw, city, country, lead_investor, investors, source_url, batch_id, dedupe_key, created_by';

function insertValues(row: FundingDealWrite, batchId: number | null, createdBy: string | null): SqlParam[] {
  return [
    row.date,
    row.startupName,
    nullable(row.sector),
    nullable(row.businessModel),
    nullable(row.roundStage),
    row.amount,
    nullable(row.amountRaw),
    nullable(row.city),
    nullable(row.country),
    nullable(row.leadInvestor),
    nullable(row.investors),
    nullable(row.sourceUrl),
    batchId,
    row.dedupeKey,
    createdBy,
  ];
}

async function write(sql: string, params: SqlParam[]): Promise<WriteResult> {
  const pool = await getDbConnection();
  const connection = await pool.getConnection();
  try {
    return (await connection.query(sql, params)) as WriteResult;
  } finally {
    connection.release();
  }
}

/** MariaDB duplicate-key error (the dedupe_key unique index). */
export function isDuplicateKeyError(error: unknown): boolean {
  const e = error as { errno?: number; code?: string };
  return e?.errno === 1062 || e?.code === 'ER_DUP_ENTRY';
}

export class FundingDealsRepository {
  async findPage(filters: FundingFilters, page: number, pageSize: number): Promise<{ deals: FundingDeal[]; total: number }> {
    const { where, params } = buildWhere(filters);
    const offset = Math.max(0, (page - 1) * pageSize);
    const [rows, countRow] = await Promise.all([
      query<DbRow>(
        `SELECT * FROM funding_deals ${where} ORDER BY deal_date DESC, id DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
      queryOne<{ total: unknown }>(`SELECT COUNT(*) AS total FROM funding_deals ${where}`, params),
    ]);
    return { deals: rows.map(entityToDeal), total: num(countRow?.total) };
  }

  /** Every matching deal (newest first), capped — used for .xlsx exports. */
  async findAll(filters: FundingFilters, cap = 50000): Promise<FundingDeal[]> {
    const { where, params } = buildWhere(filters);
    const rows = await query<DbRow>(
      `SELECT * FROM funding_deals ${where} ORDER BY deal_date DESC, id DESC LIMIT ?`,
      [...params, cap],
    );
    return rows.map(entityToDeal);
  }

  /** Only the columns the overview aggregates need — keeps the payload small. */
  async findForAggregation(filters: FundingFilters): Promise<AggDeal[]> {
    const { where, params } = buildWhere(filters);
    const rows = await query<DbRow>(
      `SELECT deal_date, sector, round_stage, city, country, amount_usd_mn, investors FROM funding_deals ${where}`,
      params,
    );
    return rows.map((r) => ({
      date: str(r.deal_date).slice(0, 10),
      sector: str(r.sector),
      roundStage: str(r.round_stage),
      city: str(r.city),
      country: str(r.country),
      amount: r.amount_usd_mn === null || r.amount_usd_mn === undefined ? null : num(r.amount_usd_mn),
      investors: str(r.investors),
    }));
  }

  async findById(id: number): Promise<FundingDeal | null> {
    const row = await queryOne<DbRow>('SELECT * FROM funding_deals WHERE id = ?', [id]);
    return row ? entityToDeal(row) : null;
  }

  /** Throws a duplicate-key error (see isDuplicateKeyError) when the deal already exists. */
  async create(row: FundingDealWrite, createdBy: string | null): Promise<number> {
    const result = await write(
      `INSERT INTO funding_deals (${INSERT_COLUMNS}) VALUES (${INSERT_COLUMNS.split(',').map(() => '?').join(', ')})`,
      insertValues(row, null, createdBy),
    );
    return num(result.insertId);
  }

  async update(id: number, row: FundingDealWrite): Promise<boolean> {
    const result = await write(
      `UPDATE funding_deals SET deal_date = ?, startup_name = ?, sector = ?, business_model = ?, round_stage = ?,
         amount_usd_mn = ?, amount_raw = ?, city = ?, country = ?, lead_investor = ?, investors = ?, source_url = ?,
         dedupe_key = ?
       WHERE id = ?`,
      [
        row.date, row.startupName, nullable(row.sector), nullable(row.businessModel), nullable(row.roundStage),
        row.amount, nullable(row.amountRaw), nullable(row.city), nullable(row.country), nullable(row.leadInvestor),
        nullable(row.investors), nullable(row.sourceUrl), row.dedupeKey, id,
      ],
    );
    return num(result.affectedRows) > 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await write('DELETE FROM funding_deals WHERE id = ?', [id]);
    return num(result.affectedRows) > 0;
  }

  /** INSERT IGNORE in chunks: rows whose dedupe_key already exists are skipped. Returns rows inserted. */
  async bulkInsert(rows: FundingDealWrite[], batchId: number, createdBy: string | null, chunkSize = 500): Promise<number> {
    let inserted = 0;
    const placeholders = `(${INSERT_COLUMNS.split(',').map(() => '?').join(', ')})`;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const params = chunk.flatMap((r) => insertValues(r, batchId, createdBy));
      const result = await write(
        `INSERT IGNORE INTO funding_deals (${INSERT_COLUMNS}) VALUES ${chunk.map(() => placeholders).join(', ')}`,
        params,
      );
      inserted += num(result.affectedRows);
    }
    return inserted;
  }

  async createBatch(fileName: string, rowsTotal: number, uploadedBy: string | null, uploadedByRole: string | null): Promise<number> {
    const result = await write(
      'INSERT INTO funding_upload_batches (file_name, rows_total, uploaded_by, uploaded_by_role) VALUES (?, ?, ?, ?)',
      [fileName.slice(0, 255), rowsTotal, uploadedBy, uploadedByRole],
    );
    return num(result.insertId);
  }

  async finishBatch(id: number, counts: { inserted: number; skipped: number; invalid: number }): Promise<void> {
    await write(
      'UPDATE funding_upload_batches SET rows_inserted = ?, rows_skipped = ?, rows_invalid = ? WHERE id = ?',
      [counts.inserted, counts.skipped, counts.invalid, id],
    );
  }

  async listBatches(limit = 100): Promise<FundingUploadBatch[]> {
    const rows = await query<DbRow>(
      `SELECT b.*, (SELECT COUNT(*) FROM funding_deals d WHERE d.batch_id = b.id) AS deals_remaining
       FROM funding_upload_batches b ORDER BY b.created_at DESC, b.id DESC LIMIT ?`,
      [limit],
    );
    return rows.map((r) => ({
      id: num(r.id),
      fileName: str(r.file_name),
      rowsTotal: num(r.rows_total),
      rowsInserted: num(r.rows_inserted),
      rowsSkipped: num(r.rows_skipped),
      rowsInvalid: num(r.rows_invalid),
      uploadedBy: str(r.uploaded_by),
      uploadedByRole: str(r.uploaded_by_role),
      createdAt: str(r.created_at),
      dealsRemaining: num(r.deals_remaining),
    }));
  }

  /** Deletes the batch; its deals go with it (FK ON DELETE CASCADE). Returns deals removed. */
  async deleteBatch(id: number): Promise<{ found: boolean; dealsRemoved: number }> {
    const countRow = await queryOne<{ total: unknown }>('SELECT COUNT(*) AS total FROM funding_deals WHERE batch_id = ?', [id]);
    const result = await write('DELETE FROM funding_upload_batches WHERE id = ?', [id]);
    return { found: num(result.affectedRows) > 0, dealsRemoved: num(countRow?.total) };
  }

  async filterOptions(): Promise<FundingFilterOptions> {
    const distinct = async (col: 'sector' | 'round_stage' | 'city' | 'country') => {
      const rows = await query<DbRow>(
        `SELECT ${col} AS v, COUNT(*) AS c FROM funding_deals WHERE ${col} IS NOT NULL AND ${col} <> '' GROUP BY ${col} ORDER BY c DESC, ${col} ASC`,
      );
      return rows.map((r) => str(r.v));
    };
    const [sectors, stages, cities, countries] = await Promise.all([
      distinct('sector'), distinct('round_stage'), distinct('city'), distinct('country'),
    ]);
    return { sectors, stages, cities, countries };
  }

  /** Admin dashboard card numbers. */
  async summary(): Promise<{ deals: number; capital: number; lastUploadAt: string | null }> {
    const [totals, lastBatch] = await Promise.all([
      queryOne<{ deals: unknown; capital: unknown }>('SELECT COUNT(*) AS deals, COALESCE(SUM(amount_usd_mn), 0) AS capital FROM funding_deals'),
      queryOne<{ created_at: unknown }>('SELECT created_at FROM funding_upload_batches ORDER BY created_at DESC LIMIT 1'),
    ]);
    return {
      deals: num(totals?.deals),
      capital: Math.round(num(totals?.capital) * 10) / 10,
      lastUploadAt: lastBatch?.created_at ? str(lastBatch.created_at) : null,
    };
  }
}
