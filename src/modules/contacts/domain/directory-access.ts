/** Employee-portal logins (by Employee ID) that get full access to the Directory (contacts) at
 * /employee/directory — view, add/edit/delete, bulk, import/export and config, same as the super admin.
 * Shared by the portal nav and /api/employee/directory, so adding or removing someone here is the
 * whole change. Admin-panel roles are gated separately (CONTACTS_ROLES). */
export const DIRECTORY_EMPLOYEE_CODES: readonly string[] = ['SNFYI-0029'];

export function canEmployeeUseDirectory(employeeCode: string | null | undefined): boolean {
  return !!employeeCode && DIRECTORY_EMPLOYEE_CODES.includes(employeeCode.trim().toUpperCase());
}
