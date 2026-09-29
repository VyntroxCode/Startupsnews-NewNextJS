import { NextResponse } from 'next/server';
import { HrOffboardingService, type OffboardingResult } from '@/modules/hr-offboarding/service/hr-offboarding.service';

export const hrOffboardingService = new HrOffboardingService();

/** Same `{ success, data | error }` envelope every HR-tool route returns, keeping the service's status code. */
export function resultResponse<T>(result: OffboardingResult<T>): NextResponse {
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status || 400 });
  return NextResponse.json({ success: true, data: result.data });
}

export function errorResponse(error: unknown, fallback: string): NextResponse {
  console.error(fallback + ':', error);
  return NextResponse.json({ success: false, error: error instanceof Error ? error.message : fallback }, { status: 500 });
}
