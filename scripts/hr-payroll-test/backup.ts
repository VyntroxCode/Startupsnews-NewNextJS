/** Dev-only: copies every HR table the payroll test can change into zz_hrtest_bak_* (see _shared.ts). */
import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '@/shared/database/connection';
import { TABLES, BACKUP_PREFIX, assertDevDb } from './_shared';

loadEnvConfig(process.cwd());

async function main() {
  assertDevDb();
  const existing = await query<{ n: number | bigint }>(
    `SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE '${BACKUP_PREFIX}%'`
  );
  if (Number(existing[0]?.n || 0) > 0) {
    throw new Error('A backup already exists — run restore.ts first (or drop the zz_hrtest_bak_* tables) so it is never overwritten.');
  }
  for (const t of TABLES) {
    await query(`CREATE TABLE ${BACKUP_PREFIX}${t} LIKE ${t}`);
    await query(`INSERT INTO ${BACKUP_PREFIX}${t} SELECT * FROM ${t}`);
    const [row] = await query<{ n: number | bigint }>(`SELECT COUNT(*) AS n FROM ${BACKUP_PREFIX}${t}`);
    console.log(`backed up ${t}: ${Number(row.n)} rows`);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => closeDbConnection());
