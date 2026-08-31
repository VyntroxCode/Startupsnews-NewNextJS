/**
 * Backfills the document checklist for HR Tool employees created before the document-upload
 * feature existed. Those rows have an empty `documents` array, which makes Directory show
 * "No checklist" and hides them from the admin Document Review screen entirely — even though
 * the employee-facing upload endpoint already accepts uploads for them. This makes their
 * record match what a newly-hired employee gets today: one checklist entry per name currently
 * in hr_required_documents, plus a documents_deadline if they don't already have one.
 *
 * Only touches employees whose `documents` is NULL or an empty array. Never overwrites an
 * existing non-empty checklist or an existing documents_deadline.
 *
 * Usage:
 *   npx tsx scripts/backfill-hr-employee-documents.ts --dry-run
 *   npx tsx scripts/backfill-hr-employee-documents.ts --apply
 */
import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '../src/shared/database/connection';
import { parseJsonColumn } from '../src/modules/hr-tool/repository/shared';
import { addDaysUTC } from '../src/modules/hr-tool/utils/time';
import type { HrDocRef } from '../src/modules/hr-tool/domain/types';

loadEnvConfig(process.cwd());

/** Matches DOCUMENTS_WINDOW_DAYS in Directory.tsx / HireEmployeeButton.tsx — how many days a
 * new hire gets to submit their checklist, counted from doj. */
const DOCUMENTS_WINDOW_DAYS = 5;

type EmployeeRow = { id: string; name: string; doj: string; documents: unknown; documents_deadline: string | null };

function buildChecklist(requiredDocuments: string[]): HrDocRef[] {
  return requiredDocuments.map((name) => ({ name, status: 'not_uploaded', url: null, uploadedAt: null, remarks: null }));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || !args.includes('--apply');

  const requiredDocuments = (await query<{ name: string }>('SELECT name FROM hr_required_documents ORDER BY name ASC')).map((r) => r.name);
  if (requiredDocuments.length === 0) {
    console.log('hr_required_documents is empty — nothing to backfill against. Configure it in HR Management > Rules & Org Structure first.');
    await closeDbConnection();
    return;
  }

  const employees = await query<EmployeeRow>('SELECT id, name, doj, documents, documents_deadline FROM hr_employees');
  const candidates = employees.filter((e) => parseJsonColumn<HrDocRef[]>(e.documents, []).length === 0);

  console.log(JSON.stringify({ dryRun, requiredDocuments, totalEmployees: employees.length, candidates: candidates.length }, null, 2));

  let updated = 0;
  for (const e of candidates) {
    const documents = buildChecklist(requiredDocuments);
    const deadline = e.documents_deadline || addDaysUTC(e.doj, DOCUMENTS_WINDOW_DAYS);
    console.log(`${dryRun ? '[dry-run] would update' : 'updating'} ${e.id} ${e.name} -> ${documents.length} doc(s), deadline ${deadline}`);
    if (!dryRun) {
      await query('UPDATE hr_employees SET documents = ?, documents_deadline = COALESCE(documents_deadline, ?) WHERE id = ?', [
        JSON.stringify(documents), deadline, e.id,
      ]);
    }
    updated++;
  }

  console.log(dryRun
    ? `Dry run only — ${updated} employee(s) would be updated. Re-run with --apply to write changes.`
    : `Done — updated ${updated} employee(s).`);
  await closeDbConnection();
}

main().catch(async (error) => {
  console.error('Backfill failed:', error);
  await closeDbConnection();
  process.exit(1);
});
