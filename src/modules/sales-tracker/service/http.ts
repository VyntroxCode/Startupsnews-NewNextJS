import { NextResponse } from 'next/server';
import { LeadAssignmentValidationError } from '@/modules/lead-assignments/service/lead-assignments.service';
import { getPromotedCityOptions } from '@/lib/data-adapter';
import { SalesTrackerRepository } from '../repository/sales-tracker.repository';
import { EmployeeLeadNotFoundError, EmployeeLeadValidationError, SalesTrackerService } from './sales-tracker.service';

/** The one service instance the My Leads add / edit routes share (employee panel and
 * /api/admin/my-leads alike). */
export const employeeLeadsService = new SalesTrackerService(new SalesTrackerRepository());

/** The one error → response mapping those routes use: bad input 400 with its message, not found /
 * not the creator 404, anything else logged and 500 with `fallback`. */
export function employeeLeadErrorResponse(error: unknown, fallback: string): NextResponse {
  if (error instanceof EmployeeLeadValidationError || error instanceof LeadAssignmentValidationError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
  if (error instanceof EmployeeLeadNotFoundError) {
    return NextResponse.json({ success: false, error: 'You can only edit leads you created.' }, { status: 404 });
  }
  console.error(`${fallback}:`, error);
  return NextResponse.json({ success: false, error: fallback }, { status: 500 });
}

/** What the Add / Edit lead window on My Leads offers: who a lead can be assigned to, and the City
 * suggestions the public forms use. */
export async function employeeLeadFormOptions() {
  const [options, promotedCities] = await Promise.all([employeeLeadsService.getAssignmentOptions(), getPromotedCityOptions()]);
  return { ...options, promotedCities };
}
