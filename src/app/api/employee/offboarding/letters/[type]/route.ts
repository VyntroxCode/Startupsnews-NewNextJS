import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { NO_DIRECTORY_RECORD_ERROR } from '@/modules/hr-tool/service/hr-tool.service';
import { hrOffboardingService } from '../../_lib';

interface RouteParams { params: Promise<{ type: string }>; }

/** GET /api/employee/offboarding/letters/[type] — the caller's own issued relieving/experience letter
 * as a PDF. Open to alumni: after the last working day this (with My Exit) is what they keep. */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireEmployeeAuth(request, { allowAlumni: true });
  if (auth instanceof NextResponse) return auth;
  const { type } = await params;

  try {
    const employee = await hrOffboardingService.employeeForCredential(auth.credential.id, auth.credential.name);
    if (!employee) return NextResponse.json({ success: false, error: NO_DIRECTORY_RECORD_ERROR }, { status: 400 });
    const result = await hrOffboardingService.myLetterPdf(employee, type);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status || 400 });
    return new NextResponse(Buffer.from(result.data), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${type}-letter.pdf"`, 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error building employee letter:', error);
    return NextResponse.json({ success: false, error: 'Failed to build the letter' }, { status: 500 });
  }
}
