'use client';

import ExitWidget from '@/components/offboarding/ExitWidget';
import { useState } from 'react';
import { getEmployeeAuthHeaders, getEmployeeUser } from '@/lib/employee-auth';

export default function EmployeeExitPage() {
  // Read once on mount (sessionStorage is client-only; this page is client-rendered behind the layout's session check).
  const [user] = useState(getEmployeeUser);
  return (
    <div>
      <h2 className="m-0 text-3xl font-bold tracking-tight text-slate-900">My Exit</h2>
      <p className="mb-0 mt-2 text-base text-slate-500">Submit your resignation and follow it through to your last day.</p>
      <ExitWidget apiBase="/api/employee/offboarding" getHeaders={getEmployeeAuthHeaders} user={user} />
    </div>
  );
}
