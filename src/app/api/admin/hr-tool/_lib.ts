import { HrToolRepository } from '@/modules/hr-tool/repository/hr-tool.repository';
import { HrToolService } from '@/modules/hr-tool/service/hr-tool.service';
import { HrCredentialsRepository } from '@/modules/hr-credentials/repository/hr-credentials.repository';
import { HrCredentialsService } from '@/modules/hr-credentials/service/hr-credentials.service';
import { PanelAdminsRepository } from '@/modules/panel-admins/repository/panel-admins.repository';
import type { PayrollRosterEntry } from '@/modules/hr-tool/service/hr-tool.service';

export const hrToolService = new HrToolService(new HrToolRepository());

export const hrCredentialsService = new HrCredentialsService(
  new HrCredentialsRepository(),
  new PanelAdminsRepository()
);

/** The real payroll roster — every active Employee ID, regardless of whether hr_employees has
 * a matching record yet (see PayrollRosterEntry's own doc comment for why). */
export async function getPayrollRoster(): Promise<PayrollRosterEntry[]> {
  const credentials = await hrCredentialsService.getAll();
  return credentials
    .filter((c) => c.isActive)
    .map((c) => ({ credentialId: c.id, name: c.name, doj: new Date(c.createdAt).toISOString().slice(0, 10) }));
}

/** After a leave or regularization decision: brings any already-run, unlocked payroll cycle
 * covering these dates up to date (HrToolService.refreshRunsForDates). A failure here is logged,
 * never surfaced — the decision itself is saved, and the Payroll page re-checks on load anyway. */
export async function refreshPayrollForDates(dates: string[]): Promise<void> {
  try {
    await hrToolService.refreshRunsForDates(dates, await getPayrollRoster());
  } catch (error) {
    console.error('Payroll auto-update after a decision failed:', error);
  }
}
