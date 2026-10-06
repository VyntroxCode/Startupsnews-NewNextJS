/** Dev-only: puts every backed-up HR table back exactly as backup.ts found it, then drops the backups. */
import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '@/shared/database/connection';
import { TABLES, BACKUP_PREFIX, assertDevDb } from './_shared';

loadEnvConfig(process.cwd());

async function main() {
  assertDevDb();
  for (const t of TABLES) {
    const exists = await query(`SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`, [`${BACKUP_PREFIX}${t}`]);
    if (exists.length === 0) throw new Error(`No backup for ${t} — nothing restored.`);
  }
  // No foreign keys or triggers reference these tables (checked 2026-10-01), so a plain
  // delete + copy-back restores them exactly, ids included.
  for (const t of TABLES) {
    // Copy the backup's own columns by name: a table can gain columns after the backup was taken
    // (hr-payroll-freeze-reverse.sql added frozen_*/reversed_* and payslip_json), and those keep
    // their defaults.
    const cols = (await query<{ c: string }>(
      `SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
      [`${BACKUP_PREFIX}${t}`]
    )).map((r) => `\`${r.c}\``).join(', ');
    await query(`DELETE FROM ${t}`);
    await query(`INSERT INTO ${t} (${cols}) SELECT ${cols} FROM ${BACKUP_PREFIX}${t}`);
    const [a] = await query<{ n: number | bigint }>(`SELECT COUNT(*) AS n FROM ${t}`);
    const [b] = await query<{ n: number | bigint }>(`SELECT COUNT(*) AS n FROM ${BACKUP_PREFIX}${t}`);
    if (Number(a.n) !== Number(b.n)) throw new Error(`${t}: restored ${a.n} rows but backup has ${b.n} — backup tables kept.`);
    console.log(`restored ${t}: ${Number(a.n)} rows`);
  }
  // Runs restored from a pre-freeze backup have frozen_at NULL — they were final (locked/run)
  // before Freeze existed, so mark them frozen exactly as the migration does.
  await query(
    "UPDATE hr_payroll_runs SET frozen_at = COALESCE(locked_at, NOW()), frozen_by = COALESCE(run_by, 'migration') WHERE status = 'run' AND frozen_at IS NULL AND reversed_at IS NULL"
  );
  for (const t of TABLES) await query(`DROP TABLE ${BACKUP_PREFIX}${t}`);
  console.log('Backup tables dropped. Remember: remove NEXT_PUBLIC_HR_TEST_TODAY from .env and rebuild dev.');
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => closeDbConnection());
