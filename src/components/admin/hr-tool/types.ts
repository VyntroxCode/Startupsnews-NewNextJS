export type {
  HrTeam, HrHoliday, HrOrgStructure, HrDocRef, HrSignedDoc, HrCtcSplit, HrCtcBreakdown, HrEmployee,
  HrOnboardingAssets, HrOnboarding, HrAttendanceRecord, HrAttendanceOverride, HrPunch,
  HrApprovalBase, HrRegularization, HrLeaveRequest, HrExpense, HrTicket, HrComplianceTask,
  HrPayrollRun, HrPayrollEntry, HrTemplate, HrRules, HrLeaveTypeConfig, HrAuditLogEntry, HrBootstrap, HrCompanyProfile,
} from '@/modules/hr-tool/domain/types';

export type { HrKycDocuments, KycSlotDef, KycSectionDef } from '@/modules/hr-tool/domain/kyc';
export { KYC_SECTIONS, KYC_SLOTS, emptyKycDocuments, computeKycProgress } from '@/modules/hr-tool/domain/kyc';

export type HrRole = 'HR Head' | 'Founder' | 'Reporting Manager' | 'Employee';

export type HrView =
  | 'dashboard' | 'directory' | 'offboarding' | 'attendance' | 'leave'
  | 'payroll' | 'expenses' | 'compliance' | 'posh' | 'helpdesk' | 'company' | 'rules';

export const VIEW_ACCESS: Record<HrView, HrRole[]> = {
  dashboard: ['HR Head', 'Founder', 'Reporting Manager', 'Employee'],
  directory: ['HR Head', 'Founder', 'Reporting Manager'],
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
};
