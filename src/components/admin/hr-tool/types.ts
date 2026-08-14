export type {
  HrTeam, HrHoliday, HrOrgStructure, HrDocRef, HrSignedDoc, HrCtcSplit, HrEmployee,
  HrOnboardingAssets, HrOnboarding, HrAttendanceRecord, HrAttendanceOverride, HrPunch,
  HrApprovalBase, HrRegularization, HrLeaveRequest, HrExpense, HrTicket, HrComplianceTask,
  HrPayrollRun, HrTemplate, HrRules, HrAuditLogEntry, HrBootstrap,
} from '@/modules/hr-tool/domain/types';

export type HrRole = 'HR Head' | 'Founder' | 'Reporting Manager' | 'Employee';

export type HrView =
  | 'dashboard' | 'directory' | 'assigning-ids' | 'onboarding' | 'offboarding' | 'attendance' | 'leave'
  | 'payroll' | 'expenses' | 'compliance' | 'posh' | 'helpdesk' | 'company' | 'rules' | 'documents';

export const VIEW_ACCESS: Record<HrView, HrRole[]> = {
  dashboard: ['HR Head', 'Founder', 'Reporting Manager', 'Employee'],
  directory: ['HR Head', 'Founder', 'Reporting Manager'],
  'assigning-ids': ['Founder'],
  onboarding: ['HR Head', 'Founder'],
  offboarding: ['HR Head', 'Founder'],
  attendance: ['HR Head', 'Founder', 'Reporting Manager', 'Employee'],
  leave: ['HR Head', 'Founder', 'Reporting Manager', 'Employee'],
  payroll: ['HR Head', 'Founder', 'Employee'],
  expenses: ['HR Head', 'Founder', 'Reporting Manager', 'Employee'],
  compliance: ['HR Head', 'Founder'],
  posh: ['HR Head', 'Founder'],
  helpdesk: ['HR Head', 'Founder', 'Reporting Manager', 'Employee'],
  company: ['HR Head', 'Founder'],
  rules: ['HR Head', 'Founder'],
  documents: ['HR Head', 'Founder', 'Reporting Manager', 'Employee'],
};
