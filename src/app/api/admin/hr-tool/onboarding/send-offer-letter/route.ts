import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { sendOfferLetterEmail } from '@/lib/hr-mailer';

interface SendOfferLetterBody { to?: string; employeeName?: string; subject?: string; textBody?: string; }

/** POST /api/admin/hr-tool/onboarding/send-offer-letter — emails the generated offer letter to
 * a new hire. Currently a dummy send (see src/lib/hr-mailer.ts) — the pipeline is fully wired so
 * a real dispatch can be dropped in later without touching the call site. */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<SendOfferLetterBody>(request);
    if (errorResponse) return errorResponse;

    const to = body?.to?.trim();
    const employeeName = body?.employeeName?.trim();
    const subject = body?.subject?.trim();
    const textBody = body?.textBody;
    if (!to || !employeeName || !subject || !textBody) {
      return NextResponse.json({ success: false, error: 'to, employeeName, subject, and textBody are required' }, { status: 400 });
    }

    const result = await sendOfferLetterEmail({ to, employeeName, subject, textBody });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error sending offer letter email:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send offer letter email' },
      { status: 500 }
    );
  }
}
