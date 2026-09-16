import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { ticketErrorResponse } from '@/app/api/_shared/it-tickets-http';
import { employeeActor, itTicketsService } from '@/app/api/employee/it-tickets/_lib';

interface RouteParams {
  params: Promise<{ id: string; attachmentId: string }>;
}

/** DELETE /api/employee/it-tickets/[id]/attachments/[attachmentId] — only the employee's own uploads.
 * Removes the DB record; the S3 object is left in place (consistent with the rest of the app). */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id, attachmentId } = await params;
  try {
    await itTicketsService.deleteAttachment(employeeActor(auth.credential), id, attachmentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return ticketErrorResponse(error, 'employee delete attachment');
  }
}
