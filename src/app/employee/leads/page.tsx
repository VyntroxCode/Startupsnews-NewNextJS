'use client';

import MyLeadsPage from '@/components/employee/my-leads/MyLeadsPage';
import { getEmployeeAuthHeaders } from '@/lib/employee-auth';

/** /employee/leads — the Sales Tracker leads an admin has assigned to the logged-in employee. */
export default function EmployeeLeadsPage() {
  return <MyLeadsPage endpoint="/api/employee/leads" getHeaders={getEmployeeAuthHeaders} />;
}
