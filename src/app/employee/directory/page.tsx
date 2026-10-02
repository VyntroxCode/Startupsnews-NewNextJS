'use client';

import { getEmployeeAuthHeaders, getEmployeeUser } from '@/lib/employee-auth';
import { canEmployeeUseDirectory } from '@/modules/contacts/domain/directory-access';
import ContactsDirectory from '@/components/admin/contacts/ContactsDirectory';

/** Directory for allow-listed employees (DIRECTORY_EMPLOYEE_CODES), with full access. The API
 * re-checks the allow-list, so this guard only keeps others from seeing an empty shell. */
export default function EmployeeDirectoryPage() {
  if (!canEmployeeUseDirectory(getEmployeeUser()?.employeeCode)) {
    return <div className="rounded-xl border border-solid border-slate-200 bg-white p-6 text-sm text-slate-600">You do not have access to the Directory.</div>;
  }
  return <ContactsDirectory apiBase="/api/employee/directory" getHeaders={getEmployeeAuthHeaders} />;
}
