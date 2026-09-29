import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { sendOfferLetterEmail } from '@/lib/hr-mailer';
import { letterheadLogo } from '@/lib/letterhead-logo';
import { generateJoiningLetterPdf, generatePlainLetterPdf } from '@/components/admin/hr-tool/joiningLetterPdf';
import type { OfferLetterData } from '@/components/admin/hr-tool/utils';

interface SendOfferLetterBody {
  to?: string; employeeName?: string; subject?: string; textBody?: string;
  /** Present when the default (structured) letter was used — rendered as that layout. Otherwise
   * (HR's custom template) the approved text is paginated as-is. */
  letterData?: OfferLetterData;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isLetterData(v: unknown): v is OfferLetterData {
  const d = v as Partial<OfferLetterData> | null;
  return !!d && typeof d.employeeName === 'string' && typeof d.employeeCode === 'string' && typeof d.password === 'string'
    && typeof d.designation === 'string' && typeof d.doj === 'string' && typeof d.ctc === 'number' && Array.isArray(d.requiredDocuments);
}

/**
 * POST /api/admin/hr-tool/onboarding/send-offer-letter — emails a new hire their offer letter: the
 * approved text as the body and the same letter as a PDF (built here, with letterhead) attached.
 * Answers `{ sent: true }` or `{ sent: false, error }` — the hire itself is already saved, so a
 * failed email is reported, not thrown, and the caller logs what really happened.
 */
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
    if (!EMAIL_RE.test(to)) return NextResponse.json({ success: true, data: { sent: false, error: `"${to}" is not a valid email address.` } });

    const logoBytes = await letterheadLogo();
    let pdf: Uint8Array;
    try {
      pdf = isLetterData(body?.letterData)
        ? await generateJoiningLetterPdf(body.letterData, { logoBytes })
        : await generatePlainLetterPdf(textBody, { logoBytes, letterhead: true });
    } catch (e) {
      console.error('Offer letter PDF failed, falling back to plain text:', e);
      pdf = await generatePlainLetterPdf(textBody, { logoBytes, letterhead: true });
    }
    const safeName = employeeName.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'Employee';
    const result = await sendOfferLetterEmail({ to, employeeName, subject, textBody, pdf, pdfFilename: `Offer-Letter-${safeName}.pdf` });
    return NextResponse.json({ success: true, data: result.ok ? { sent: true, dryRun: !!result.dryRun } : { sent: false, error: result.error } });
  } catch (error) {
    console.error('Error sending offer letter email:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send offer letter email' },
      { status: 500 }
    );
  }
}
