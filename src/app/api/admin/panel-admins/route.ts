import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { PanelAdminsRepository } from '@/modules/panel-admins/repository/panel-admins.repository';
import { PanelAdminsService } from '@/modules/panel-admins/service/panel-admins.service';
import { entityToPanelAdmin } from '@/modules/panel-admins/utils/panel-admins.utils';
import { PanelAdminRole } from '@/modules/panel-admins/domain/types';

const repo = new PanelAdminsRepository();
const panelAdminsService = new PanelAdminsService(repo);

const ALLOWED_ROLES: PanelAdminRole[] = ['event_admin', 'publisher_admin'];

/** GET /api/admin/panel-admins?full=1 — paginated list for the admin Users management page. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20);

    const entities = await repo.findAll();
    let admins = entities.map(entityToPanelAdmin);

    if (search) {
      admins = admins.filter(
        (a) => a.name.toLowerCase().includes(search) || a.email.toLowerCase().includes(search)
      );
    }

    const total = admins.length;
    const start = (page - 1) * limit;
    const pageItems = admins.slice(start, start + limit).map((a) => ({
      id: a.id,
      email: a.email,
      name: a.name,
      role: a.role,
      isActive: a.isActive,
      createdAt: a.createdAt,
      lastLogin: a.lastLogin ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: pageItems,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error('Error fetching panel admins:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch panel admins' },
      { status: 500 }
    );
  }
}

/** POST /api/admin/panel-admins - create an Event Admin / Publisher Admin account. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json() as {
      email?: string;
      password?: string;
      name?: string;
      role?: string;
    };

    const email = body.email?.trim();
    const password = body.password;
    const name = body.name?.trim();
    const role = body.role;

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }
    if (!role || !ALLOWED_ROLES.includes(role as PanelAdminRole)) {
      return NextResponse.json(
        { success: false, error: `Role must be one of: ${ALLOWED_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    const admin = await panelAdminsService.createPanelAdmin({
      email,
      password,
      name,
      role: role as PanelAdminRole,
      createdBy: auth.user.email,
    });
    return NextResponse.json({ success: true, data: admin });
  } catch (error) {
    console.error('Error creating panel admin:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create panel admin' },
      { status: 500 }
    );
  }
}
