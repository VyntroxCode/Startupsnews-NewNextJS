import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { ticketErrorResponse } from '@/app/api/_shared/it-tickets-http';
import { employeeActor, itTicketsService } from '@/app/api/employee/it-tickets/_lib';

interface RouteParams {
  params: Promise<{ id: string; commentId: string }>;
}

/** DELETE /api/employee/it-tickets/[id]/comments/[commentId] — only the employee's own comments. */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id, commentId } = await params;
  try {
    await itTicketsService.deleteComment(employeeActor(auth.credential), id, commentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return ticketErrorResponse(error, 'employee delete comment');
  }
}
