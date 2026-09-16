import { getAuthHeaders } from '@/lib/admin-auth';
import type { SponsorEventSubmission } from '@/modules/sponsor-event-submissions/domain/types';

export async function fetchSponsorEventSubmissions(): Promise<SponsorEventSubmission[]> {
  const res = await fetch('/api/admin/sales-tracker/sponsor-events', { headers: getAuthHeaders() });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load sponsor event submissions');
  return json.data || [];
}
