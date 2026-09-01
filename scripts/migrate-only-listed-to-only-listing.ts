import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '@/shared/database/connection';

loadEnvConfig(process.cwd());

/**
 * One-off data migration: retire the legacy 'Only Listed (No Partnership)' partnership_status
 * text in favour of the modern 'Only Listing' option.
 *
 * The two mean the same thing — 'Only Listed (No Partnership)' is the pre-STATUS_EDIT_ORDER
 * wording (see PARTNERSHIP_STATUS_OPTIONS in the partnership-events domain types). The tracker UI
 * already buckets both to the same "Only Listing" column (classifyStatus), so this only rewrites
 * the stored text so the underlying data matches what the admin sees and edits.
 */

const LEGACY_STATUS = 'Only Listed (No Partnership)';
const TARGET_STATUS = 'Only Listing';

async function main() {
  const before = await query<{ id: number; event_name: string }>(
    'SELECT id, event_name FROM partnership_events WHERE partnership_status = ? ORDER BY id',
    [LEGACY_STATUS]
  );

  if (before.length === 0) {
    console.log(`Nothing to do — no rows with partnership_status = '${LEGACY_STATUS}'.`);
    return;
  }

  console.log(`Found ${before.length} row(s) to migrate to '${TARGET_STATUS}':`);
  for (const row of before) console.log(`  #${row.id} — ${row.event_name}`);

  await query('UPDATE partnership_events SET partnership_status = ? WHERE partnership_status = ?', [
    TARGET_STATUS,
    LEGACY_STATUS,
  ]);

  const remaining = await query<{ c: number | bigint }>(
    'SELECT COUNT(*) AS c FROM partnership_events WHERE partnership_status = ?',
    [LEGACY_STATUS]
  );
  console.log(`Done. Rows still on the legacy status: ${Number(remaining[0]?.c ?? 0)}`);
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(() => closeDbConnection());
