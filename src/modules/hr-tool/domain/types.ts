import type { HrEmployeeCredential } from '@/modules/hr-credentials/domain/types';

export interface HrTeam { name: string; manager: string | null; }

export interface HrHoliday { date: string; name: string; }

export interface HrOrgStructure {
  designations: string[];
  expenseCategories: string[];
  requiredDocuments: string[];
  holidays: HrHoliday[];
}

export interface HrDocRef { name: string; status: string; }
export interface HrSignedDoc { type: string; content: string; signedDate: string; }
export interface HrCtcSplit { basic: number; hra: number; allowances: number; }

export interface HrEmployee {
  id: string;
  name: string;
  email: string;
  designation: string;
  team: string;
  manager: string | null;
  status: string;
  doj: string;
  sysRole: string;
  ctc: number;
  leaveBalance: Record<string, number>;
  documents: HrDocRef[];
  signedDocs: HrSignedDoc[];
  ctcSplitOverride?: HrCtcSplit | null;
  probationExtendedBy?: number | null;
}

export interface HrOnboardingAssets { laptop: boolean; idCard: boolean; accessCard: boolean; }

export interface HrOnboarding {
  id: string;
  name: string;
  personalEmail: string;
  designation: string;
  team: string;
  ctc: number;
  stage: string;
  offerSentDate: string | null;
  signedDate: string | null;
  uploadDeadline: string | null;
  employeeId: string | null;
  agreementStage: string;
  docs: HrDocRef[];
  assets?: HrOnboardingAssets | null;
}

export interface HrAttendanceRecord { emp: string; date: string; status: string; inTime: string; outTime: string; inMinutes?: number | null; }
export interface HrAttendanceOverride { emp: string; date: string; status: string; }
export interface HrPunch { emp: string; date: string; inTime: string | null; inMinutes: number | null; outTime: string | null; }

export interface HrApprovalBase {
  id: string;
  emp: string;
  stage: string;
  status: string;
  rmRemarks: string;
  hrRemarks: string;
}
export interface HrRegularization extends HrApprovalBase { date: string; reason: string; }
export interface HrLeaveRequest extends HrApprovalBase { type: string; from: string; to: string; remarks: string; }
export interface HrExpense extends HrApprovalBase { category: string; amount: number; }

export interface HrTicket { id: string; emp: string; category: string; status: string; note: string; }

export interface HrComplianceTask { task: string; due: string; status: string; }

export interface HrPayrollRun { month: string; status: string; }

export interface HrTemplate { name: string; content: string; }

export interface HrRules {
  workingDaysPattern: string;
  shiftStartTime: string;
  shiftEndTime: string;
  shiftGraceMinutes: number;
  halfDayThresholdHours: number;
  regularizationWindowDays: number;
  regularizationOverride: boolean;
  /** How many regularization requests an employee may submit per calendar month — separate
   * from regularizationWindowDays (which governs how many days after the attendance date a
   * request may still be filed at all). */
  regularizationMonthlyQuota: number;
  /** Max hours absent for it to count as a Short Leave rather than a half/full day. */
  shortLeaveMaxHours: number;
  /** How many Short Leaves an employee may take per calendar month. */
  shortLeaveMonthlyQuota: number;
  salaryPeriodFrom: number;
  salaryPeriodTo: string;
  ctcSplit: HrCtcSplit;
  leaveTypes: Record<string, boolean>;
  twoLevelApproval: { leave: boolean; attendance: boolean; expense: boolean };
  lateMarkPenalty: boolean;
  geoFencing: boolean;
  selfieCheckin: boolean;
  pfEsi: boolean;
  optionalHolidayChoice: boolean;
  assetChecklist: boolean;
}

export interface HrAuditLogEntry { ts: string; who: string; change: string; }

export interface HrBootstrap {
  teams: HrTeam[];
  orgStructure: HrOrgStructure;
  employees: HrEmployee[];
  onboarding: HrOnboarding[];
  attendance: HrAttendanceRecord[];
  attendanceOverrides: HrAttendanceOverride[];
  punchLog: HrPunch[];
  regularizations: HrRegularization[];
  leaveRequests: HrLeaveRequest[];
  expenses: HrExpense[];
  tickets: HrTicket[];
  compliance: HrComplianceTask[];
  payrollRuns: HrPayrollRun[];
  templates: HrTemplate[];
  rules: HrRules;
  auditLog: HrAuditLogEntry[];
  /** Assigning-IDs credentials — used to show Employee ID/Role alongside attendance rows for Publisher/Event Admin punches. */
  employeeCredentials: HrEmployeeCredential[];
}
