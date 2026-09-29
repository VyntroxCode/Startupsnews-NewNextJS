import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { errorResponse, hrOffboardingService } from '../../../_lib';

interface RouteParams { params: Promise<{ id: string; type: string }>; }

/** GET /api/admin/hr-tool/offboarding/[id]/letters/[type] — the issued letter as a PDF.
 * `?preview=1` renders what issuing it now would produce (current template), without saving anything. */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;
  const { id: rawId, type } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ success: false, error: 'Invalid case id' }, { status: 400 });

  try {
    const result = await hrOffboardingService.letterPdf(id, type, request.nextUrl.searchParams.get('preview') === '1');
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status || 400 });
    return new NextResponse(Buffer.from(result.data), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${type}-letter.pdf"`, 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return errorResponse(error, 'Failed to build the letter');
  }
}
