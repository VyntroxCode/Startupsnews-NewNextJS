import { NextResponse } from 'next/server';
import { LeadFollowUpNotFoundError, LeadFollowUpValidationError } from './lead-followups.service';

/** The one error → response mapping every follow-up route uses: bad input 400, not found / not
 * assigned 404, anything else logged and 500 with `fallback`. */
export function followUpErrorResponse(error: unknown, fallback: string): NextResponse {
  if (error instanceof LeadFollowUpValidationError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
  if (error instanceof LeadFollowUpNotFoundError) {
    return NextResponse.json({ success: false, error: 'This lead is not assigned to you (or no longer exists).' }, { status: 404 });
  }
  console.error(`${fallback}:`, error);
  return NextResponse.json({ success: false, error: fallback }, { status: 500 });
}
