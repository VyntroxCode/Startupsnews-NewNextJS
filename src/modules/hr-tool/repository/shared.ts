import { getDbConnection, query } from '@/shared/database/connection';

export type SqlParam = string | number | null;

export async function findAllRows<T>(table: string, orderBy?: string): Promise<T[]> {
  return query<T>(`SELECT * FROM ${table}${orderBy ? ' ORDER BY ' + orderBy : ''}`);
}

/** Replaces every row in `table` with `rows`, inside a transaction. Used for the small,
 * fully-authoritative lists the HR tool keeps as JS arrays (teams, employees, onboarding,
 * regularizations, ...) — the frontend always sends its complete in-memory list, so a
 * delete-all-then-reinsert is simpler than diffing and safe at this data scale. */
export async function replaceAllRows<T>(table: string, columns: string[], rows: T[], toValues: (item: T) => SqlParam[]): Promise<void> {
  const pool = await getDbConnection();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`DELETE FROM ${table}`);
    for (const item of rows) {
      const values = toValues(item);
      await connection.query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`, values);
    }
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}

/** Defensive JSON-column parse: the mariadb driver may hand back an already-parsed
 * value, a raw string, a Buffer, or null/undefined depending on column contents. */
export function parseJsonColumn<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  const text = Buffer.isBuffer(value) ? value.toString('utf8') : typeof value === 'string' ? value : null;
  if (!text) return fallback;
  try { return JSON.parse(text) as T; } catch { return fallback; }
}
