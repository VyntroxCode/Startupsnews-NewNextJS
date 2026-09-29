'use client';

import KycDocumentsWidget from '@/components/admin/KycDocumentsWidget';
import { getEmployeeAuthHeaders } from '@/lib/employee-auth';

export default function EmployeeDocumentsPage() {
  return (
    <div>
      <div className="mb-1">
        <h2 className="m-0 hidden text-[2rem] font-bold tracking-tight text-slate-900 md:block">
          Documents
        </h2>
        <p className="m-0 text-sm text-slate-500 md:mt-2 md:text-base">
          Upload the documents your HR team has asked for. You can replace any of these anytime.
        </p>
      </div>

      <KycDocumentsWidget apiBase="/api/employee/kyc" getHeaders={getEmployeeAuthHeaders} presignEndpoint="/api/employee/documents/presign" />
    </div>
  );
}
