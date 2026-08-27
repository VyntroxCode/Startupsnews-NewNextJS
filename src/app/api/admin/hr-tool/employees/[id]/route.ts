import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { hrToolService } from '../../_lib';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/admin/hr-tool/employees/[id] — permanently removes one employee.
 *
 * Deliberately not part of the PUT /employees whole-list save: that save only rewrites
 * hr_employees, so a removed employee kept their Employee ID credential, and the Directory's
 * orphan auto-heal immediately recreated the row. This deletes the credential and every
 * attendance / approval / payroll record of theirs too, in one transaction.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id) return NextResponse.json({ success: false, error: 'Employee id is required' }, { status: 400 });

  try {
    const deleted = await hrToolService.deleteEmployee(id);
    if (!deleted) return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting HR employee:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete employee' },
      { status: 500 }
    );
  }
}
