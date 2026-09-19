import { getAuthHeaders } from '@/lib/admin-auth';
import type { EnsTravelEnquiry, EnsTravelEnquiryAdminInput } from '@/modules/ens-travel-enquiries/domain/types';

export async function fetchEnsEnquiries(): Promise<EnsTravelEnquiry[]> {
  const res = await fetch('/api/admin/sales-tracker/ens-enquiries', { headers: getAuthHeaders() });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load Expand North Star enquiries');
  return json.data || [];
}

/** Saves an admin edit — the visitor's fields plus lead status / conversation note — and returns
 * the stored enquiry, with its new `updatedAt` / `updatedBy`. */
export async function updateEnsEnquiry(id: string, input: EnsTravelEnquiryAdminInput): Promise<EnsTravelEnquiry> {
  const res = await fetch(`/api/admin/sales-tracker/ens-enquiries/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: getAuthHeaders(), // already carries Content-Type: application/json
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || "Couldn't save the changes");
  return json.data;
}
