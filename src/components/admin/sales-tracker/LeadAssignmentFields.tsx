'use client';

import { X } from 'lucide-react';
import type {
  AssignableEmployee,
  DepartmentOption,
  LeadAssignment,
  LeadAssignmentDraft,
} from '@/modules/lead-assignments/domain/types';

/** Departments + Assigned to, as one controlled pair of fields for the lead window (LeadFormModal
 * and EnsEnquiryDetailModal's edit mode). The value is a LeadAssignmentDraft; nothing is saved
 * until the window's own Save.
 *
 * - Departments lists the HR teams that have assignable people. Picking one only makes its people
 *   available in Assigned to — nobody is assigned until they're picked there.
 * - Assigned to is locked until a department is picked, and lists only the people in the picked
 *   departments (grouped by department). Anyone already on the lead is disabled. A picked person is
 *   stored with their department (`viaDepartment`).
 * - Removing a department chip removes it and the people picked from it. Any people chip can be
 *   removed on its own; its department chip stays.
 * - Older leads may still have people saved without a department (picked by hand before this rule);
 *   they keep their chip and can be removed.
 *
 * `assignment` is what's stored for the lead now. It supplies names for people who are no longer
 * active (they're kept, marked, and can be removed but not re-added) and marks departments that no
 * longer have assignable members. Chips reuse the page's `.team-chip` style. */
export default function LeadAssignmentFields({ employees, departments, assignment, value, onChange, idPrefix }: {
  employees: AssignableEmployee[];
  departments: DepartmentOption[];
  assignment?: LeadAssignment;
  value: LeadAssignmentDraft;
  onChange: (next: LeadAssignmentDraft) => void;
  /** Keeps label/control ids unique when two of these could be on the page. */
  idPrefix: string;
}) {
  const employeeById = new Map(employees.map((e) => [e.credentialId, e]));
  const storedById = new Map((assignment?.assignees ?? []).map((a) => [a.credentialId, a]));
  const departmentByName = new Map(departments.map((d) => [d.name, d]));
  const onLead = new Set(value.assignees.map((a) => a.credentialId));

  function addDepartment(name: string) {
    if (!name || value.departments.includes(name)) return;
    onChange({ ...value, departments: [...value.departments, name] });
  }

  function removeDepartment(name: string) {
    onChange({
      departments: value.departments.filter((d) => d !== name),
      assignees: value.assignees.filter((a) => a.viaDepartment !== name),
    });
  }

  function addEmployee(credentialId: number) {
    const employee = employeeById.get(credentialId);
    if (!employee || onLead.has(credentialId) || !value.departments.includes(employee.department)) return;
    onChange({ ...value, assignees: [...value.assignees, { credentialId, viaDepartment: employee.department }] });
  }

  function removeEmployee(credentialId: number) {
    onChange({ ...value, assignees: value.assignees.filter((a) => a.credentialId !== credentialId) });
  }

  // Assigned to options: only the people in the picked departments, one group per department.
  const pickable = value.departments
    .map((d) => ({ name: d, people: employees.filter((e) => e.department === d) }))
    .filter((g) => g.people.length > 0);
  const locked = value.departments.length === 0;

  const noLogin = value.departments
    .map((d) => departmentByName.get(d))
    .filter((d): d is DepartmentOption => !!d && d.withoutLogin > 0);

  return (
    <div className="row">
      <div className="field">
        <label htmlFor={`${idPrefix}-departments`}>Departments</label>
        <select id={`${idPrefix}-departments`} value="" onChange={(e) => addDepartment(e.target.value)}>
          <option value="">{departments.length ? 'Add a department…' : 'No departments with employees yet'}</option>
          {departments.map((d) => (
            <option key={d.name} value={d.name} disabled={value.departments.includes(d.name)}>
              {d.name} ({d.memberCount} {d.memberCount === 1 ? 'person' : 'people'})
            </option>
          ))}
        </select>
        <div>
          {value.departments.map((d) => (
            <span className="team-chip" key={d}>
              {d}
              {!departmentByName.has(d) && <span className="hint">(no active members now)</span>}
              <button type="button" title={`Remove ${d} and the people it added`} aria-label={`Remove ${d}`} onClick={() => removeDepartment(d)}><X size={14} aria-hidden /></button>
            </span>
          ))}
        </div>
        {noLogin.map((d) => (
          <div className="hint" key={d.name}>
            {d.withoutLogin} {d.withoutLogin === 1 ? 'person' : 'people'} in {d.name} {d.withoutLogin === 1 ? 'has' : 'have'} no HR login, so can&apos;t be assigned.
          </div>
        ))}
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-assignees`}>Assigned to</label>
        <select id={`${idPrefix}-assignees`} value="" disabled={locked} onChange={(e) => addEmployee(Number(e.target.value))}>
          <option value="">
            {locked ? 'Pick a department first' : pickable.length ? 'Add an employee…' : 'No active people in these departments'}
          </option>
          {pickable.map((g) => (
            <optgroup key={g.name} label={g.name}>
              {g.people.map((e) => (
                <option key={e.credentialId} value={e.credentialId} disabled={onLead.has(e.credentialId)}>{e.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <div>
          {value.assignees.length === 0 && (
            <span className="hint">{locked ? 'Pick a department, then choose people from it' : 'Nobody assigned yet'}</span>
          )}
          {value.assignees.map((a) => {
            const current = employeeById.get(a.credentialId);
            const name = current?.name || storedById.get(a.credentialId)?.employeeName || 'Former employee';
            return (
              <span className="team-chip" key={a.credentialId}>
                {name}
                {!current && <span className="hint">(no longer active)</span>}
                {a.viaDepartment && <span className="hint">· {a.viaDepartment}</span>}
                <button type="button" title={`Remove ${name}`} aria-label={`Remove ${name}`} onClick={() => removeEmployee(a.credentialId)}><X size={14} aria-hidden /></button>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
