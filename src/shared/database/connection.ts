/**
 * Database connection for zox_db (MariaDB).
 * Uses env: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD,
 * DB_CONNECTION_LIMIT, DB_ACQUIRE_TIMEOUT, DB_IDLE_TIMEOUT, DB_KEEP_ALIVE, DB_SSL.
 */

import mariadb from 'mariadb';

// Reduce connection limit during build to prevent database exhaustion
// Build process runs multiple workers in parallel, so we need to limit connections
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
  (process.env.NODE_ENV === 'production' && process.env.npm_lifecycle_event === 'build');
const connectionLimit = isBuildTime 
  ? Math.min(parseInt(process.env.DB_CONNECTION_LIMIT || '18', 10), 5) // Max 5 during build
  : parseInt(process.env.DB_CONNECTION_LIMIT || '18', 10);
// In development use shorter acquire timeout so we fail fast if DB is down (avoid long hang before client timeout)
const defaultAcquireTimeout = process.env.NODE_ENV === 'development' ? 8000 : 30000;
const acquireTimeout = parseInt(process.env.DB_ACQUIRE_TIMEOUT || String(defaultAcquireTimeout), 10);
const idleTimeout = parseInt(process.env.DB_IDLE_TIMEOUT || '60000', 10);

let pool: mariadb.Pool | null = null;

function getPool(): mariadb.Pool {
  if (!pool) {
    pool = mariadb.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectionLimit,
      acquireTimeout,
      idleTimeout,
      ssl: process.env.DB_SSL === 'true' ? true : undefined,
    });
  }
  return pool;
}

/**
 * Get the DB pool (has getConnection() for raw connection).
 */
export async function getDbConnection(): Promise<mariadb.Pool> {
  return getPool();
}

/**
 * Run a query and return all rows.
 */
export async function query<T = unknown>(sql: string, params?: (string | number | boolean | null | Date)[]): Promise<T[]> {
  const p = getPool();
  const rows = await p.query(sql, params);
  return Array.isArray(rows) ? (rows as T[]) : [rows as T];
}

/**
 * Run a query and return the first row or null.
 */
export async function queryOne<T = unknown>(sql: string, params?: (string | number | boolean | null | Date)[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/**
 * Close the pool (e.g. in scripts after migration).
 */
export async function closeDbConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
