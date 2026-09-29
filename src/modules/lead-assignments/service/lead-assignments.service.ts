import { LeadAssignmentsRepository } from '../repository/lead-assignments.repository';
import {
  ASSIGNMENT_STATUS_OPTIONS,
  ASSIGNMENT_STATUS_PENDING,
  type AssignableEmployee,
  type AssignedLead,
  type Assignee,
  type AssignmentStatus,
  DEPARTMENT_NAME_MAX_LENGTH,
  type DepartmentOption,
  isLeadSource,
  type LeadAssigneeEntity,
  type LeadAssignment,
  type LeadDepartmentEntity,
  type LeadSource,
  MAX_DEPARTMENTS_PER_LEAD,
  statusFromEns,
  statusFromSalesLead,
} from '../domain/types';

export class LeadAssignmentValidationError extends Error {}

function toStatus(value: string): AssignmentStatus {
  return ASSIGNMENT_STATUS_OPTIONS.find((o) => o.value === value)?.value ?? ASSIGNMENT_STATUS_PENDING;
}

function entityToAssignee(e: LeadAssigneeEntity): Assignee {
  return {
    credentialId: Number(e.credential_id),
    employeeName: e.employee_name || '',
    employeeCode: e.employee_code || '',
    active: Number(e.is_active) === 1,
    viaDepartment: e.via_department || null,
    status: toStatus(e.status),
    assignedAt: String(e.assigned_at),
    assignedBy: e.assigned_by || '',
  };
}

/** Groups assignee and department rows into one LeadAssignment per lead. */
function groupByLead(assignees: LeadAssigneeEntity[], departments: LeadDepartmentEntity[]): LeadAssignment[] {
  const byKey = new Map<string, LeadAssignment>();
  const entry = (source: string, leadId: string): LeadAssignment | null => {
    if (!isLeadSource(source)) return null;
    const key = `${source}:${leadId}`;
    let a = byKey.get(key);
    if (!a) {
      a = { source, leadId, departments: [], assignees: [] };
      byKey.set(key, a);
    }
    return a;
  };
  for (const d of departments) entry(d.lead_source, d.lead_id)?.departments.push(d.department);
  for (const p of assignees) entry(p.lead_source, p.lead_id)?.assignees.push(entityToAssignee(p));
  return [...byKey.values()];
}

export class LeadAssignmentsService {
  constructor(private repository: LeadAssignmentsRepository) {}

  async getAssignableEmployees(): Promise<AssignableEmployee[]> {
    const rows = await this.repository.findAssignableEmployees();
    return rows.map((r) => ({
      credentialId: Number(r.id),
      employeeCode: r.employee_code,
      name: r.name,
      designation: r.designation || '',
      department: r.department || '',
    }));
  }

  /** HR departments that have at least one assignable employee, A–Z. Built from the same employee
   * list the dropdowns use, so a department's member count always equals what picking it adds. */
  async getDepartments(employees: AssignableEmployee[]): Promise<DepartmentOption[]> {
    const counts = new Map<string, number>();
    for (const e of employees) if (e.department) counts.set(e.department, (counts.get(e.department) ?? 0) + 1);
    const withoutLogin = new Map((await this.repository.countWithoutLoginByDepartment()).map((r) => [r.department, Number(r.n)]));
    return [...counts.entries()]
      .map(([name, memberCount]) => ({ name, memberCount, withoutLogin: withoutLogin.get(name) ?? 0 }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Every lead's departments and people, plus how many follow-ups its assignees have logged. A
   * lead whose assignees were all removed keeps no entry, so its (kept) follow-ups aren't counted
   * here — the lead window's Follow-ups panel still lists them. */
  async getAll(): Promise<LeadAssignment[]> {
    const [assignees, departments, followUps] = await Promise.all([
      this.repository.findAllAssignees(),
      this.repository.findAllDepartments(),
      this.repository.countFollowUpsByLead(),
    ]);
    const counts = new Map(followUps.map((r) => [`${r.lead_source}:${r.lead_id}`, Number(r.n)]));
    return groupByLead(assignees, departments).map((a) => ({ ...a, followUpCount: counts.get(`${a.source}:${a.leadId}`) ?? 0 }));
  }

  async getForLead(source: LeadSource, leadId: string): Promise<LeadAssignment> {
    const [assignees, departments] = await Promise.all([
      this.repository.findAssigneesForLead(source, leadId),
      this.repository.findDepartmentsForLead(source, leadId),
    ]);
    return groupByLead(assignees, departments)[0] ?? { source, leadId, departments: [], assignees: [] };
  }

  /** Sets a lead's departments and people to exactly what the lead window sent, and returns what's
   * stored. Throws LeadAssignmentValidationError with the message the admin should see.
   *
   * - Departments: trimmed, blanks and duplicates dropped, at most MAX_DEPARTMENTS_PER_LEAD. Any
   *   name is accepted, so a department HR has since renamed can stay on an older lead.
   * - People: duplicates dropped (first wins). A person already on the lead may stay even if they
   *   are no longer assignable (or have moved department); a newly added one must be assignable
   *   right now AND be picked from one of the lead's departments — their current HR department must
   *   be among `departments`, and that's what's stored as their viaDepartment.
   * - A kept person's viaDepartment must be one of the lead's departments, otherwise it becomes null
   *   (the "picked by hand" state older leads may have) — so removing a department never leaves
   *   people tagged to it. */
  async setForLead(body: Record<string, unknown>, by: string): Promise<LeadAssignment> {
    const { source, leadId } = body;
    if (!isLeadSource(source)) throw new LeadAssignmentValidationError('Unknown lead source.');
    if (typeof leadId !== 'string' || !leadId.trim()) throw new LeadAssignmentValidationError('Lead id is required.');
    if (!(await this.repository.leadExists(source, leadId))) throw new LeadAssignmentValidationError('That lead no longer exists.');

    const rawDepartments = Array.isArray(body.departments) ? body.departments : [];
    const departments: string[] = [];
    for (const d of rawDepartments) {
      if (typeof d !== 'string') continue;
      const name = d.trim();
      if (!name || departments.includes(name)) continue;
      if (name.length > DEPARTMENT_NAME_MAX_LENGTH) throw new LeadAssignmentValidationError('A department name is too long.');
      departments.push(name);
    }
    if (departments.length > MAX_DEPARTMENTS_PER_LEAD) {
      throw new LeadAssignmentValidationError(`Please pick at most ${MAX_DEPARTMENTS_PER_LEAD} departments.`);
    }

    const rawAssignees = Array.isArray(body.assignees) ? body.assignees : [];
    const assignees: { credentialId: number; viaDepartment: string | null }[] = [];
    for (const raw of rawAssignees) {
      const r = (raw ?? {}) as { credentialId?: unknown; viaDepartment?: unknown };
      const credentialId = Number(r.credentialId);
      if (!Number.isInteger(credentialId) || credentialId <= 0) throw new LeadAssignmentValidationError('Please pick one of the listed employees.');
      if (assignees.some((a) => a.credentialId === credentialId)) continue;
      const via = typeof r.viaDepartment === 'string' ? r.viaDepartment.trim() : '';
      assignees.push({ credentialId, viaDepartment: via && departments.includes(via) ? via : null });
    }

    const current = new Set((await this.repository.findAssigneesForLead(source, leadId)).map((e) => Number(e.credential_id)));
    const added = assignees.filter((a) => !current.has(a.credentialId));
    if (added.length) {
      const departmentOf = new Map((await this.getAssignableEmployees()).map((e) => [e.credentialId, e.department]));
      for (const a of added) {
        if (!departmentOf.has(a.credentialId)) {
          throw new LeadAssignmentValidationError('One of the picked employees is no longer active. Refresh the page and pick again.');
        }
        const department = departmentOf.get(a.credentialId) || '';
        if (!department || !departments.includes(department)) {
          throw new LeadAssignmentValidationError('Each new person must be picked from one of the selected departments.');
        }
        a.viaDepartment = department;
      }
    }

    await this.repository.replaceForLead(source, leadId, departments, assignees, ASSIGNMENT_STATUS_PENDING, by);
    return this.getForLead(source, leadId);
  }

  async countForEmployee(credentialId: number): Promise<{ total: number; lead: number; ens: number }> {
    const rows = await this.repository.countForCredential(credentialId);
    const of = (src: LeadSource) => Number(rows.find((r) => r.lead_source === src)?.n ?? 0);
    return { total: of('lead') + of('ens'), lead: of('lead'), ens: of('ens') };
  }

  /** Offboarding handover of every lead on `fromCredentialId` — see LeadAssignmentsRepository.handOverAll.
   * `to` must be assignable right now and have a department (the lead rules need one to come through). */
  async handOverAll(fromCredentialId: number, toCredentialId: number | null, by: string): Promise<{ moved: number; merged: number; removed: number }> {
    if (toCredentialId === null) return this.repository.handOverAll(fromCredentialId, null, ASSIGNMENT_STATUS_PENDING, by);
    if (toCredentialId === fromCredentialId) throw new LeadAssignmentValidationError('Pick someone other than the person leaving.');
    const target = (await this.getAssignableEmployees()).find((e) => e.credentialId === toCredentialId);
    if (!target) throw new LeadAssignmentValidationError('That person can no longer be assigned leads. Refresh and pick again.');
    if (!target.department) throw new LeadAssignmentValidationError(`${target.name} has no department in the Directory, so leads can't be handed to them. Set their department first.`);
    return this.repository.handOverAll(fromCredentialId, { credentialId: target.credentialId, department: target.department }, ASSIGNMENT_STATUS_PENDING, by);
  }

  async getForEmployee(credentialId: number): Promise<AssignedLead[]> {
    const rows = await this.repository.findForEmployee(credentialId);
    return rows
      .filter((r) => isLeadSource(r.lead_source))
      .map((r) => ({
        source: r.lead_source as AssignedLead['source'],
        leadId: r.lead_id,
        page: r.page || '',
        leadDate: r.lead_date ? String(r.lead_date).slice(0, 10) : '',
        name: r.name || '',
        company: r.company || '',
        contact: r.contact || '',
        email: r.email || '',
        city: r.city || '',
        country: r.country || '',
        query: r.query_text || '',
        status: r.lead_source === 'ens' ? statusFromEns(r.status) : statusFromSalesLead(r.status),
        assignedAt: String(r.assigned_at),
        assignedBy: r.assigned_by || '',
        followUpCount: Number(r.followup_count) || 0,
        lastFollowUpAt: r.last_followup_at ? String(r.last_followup_at) : '',
      }));
  }
}
