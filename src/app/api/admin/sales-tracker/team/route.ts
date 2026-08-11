import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { SALES_TRACKER_ROLES } from '@/shared/middleware/roles';
import { SalesTrackerService } from '@/modules/sales-tracker/service/sales-tracker.service';
import { SalesTrackerRepository } from '@/modules/sales-tracker/repository/sales-tracker.repository';
import { parseJsonBody } from '@/shared/utils/parse-json-body';

const repository = new SalesTrackerRepository();
const service = new SalesTrackerService(repository);

export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, SALES_TRACKER_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const team = await service.getTeam();
    return NextResponse.json({ success: true, data: team });
  } catch (error) {
    console.error('Error fetching sales team:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch team' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, SALES_TRACKER_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<{ name: string }>(request);
    if (errorResponse) return errorResponse;
    if (!body?.name) return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });

    await service.addTeamMember(body.name);
    const team = await service.getTeam();
    return NextResponse.json({ success: true, data: team }, { status: 201 });
  } catch (error) {
    console.error('Error adding sales team member:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to add team member' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAnyRole(request, SALES_TRACKER_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const name = request.nextUrl.searchParams.get('name');
    if (!name) return NextResponse.json({ success: false, error: 'name query param is required' }, { status: 400 });

    await service.removeTeamMember(name);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing sales team member:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to remove team member' },
      { status: 500 }
    );
  }
}
