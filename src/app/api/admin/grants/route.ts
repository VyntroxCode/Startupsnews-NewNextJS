import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { GRANTS_ROLES } from '@/shared/middleware/roles';
import { IncubatxDossierRepository } from '@/modules/incubatx-dossier/repository/incubatx-dossier.repository';
import { isDossierStatus } from '@/modules/incubatx-dossier/domain/types';

const repo = new IncubatxDossierRepository();

/** GET /api/admin/grants — the IncubatX dossier list for the admin Grants section, with the
 * per-status counts for the summary cards. */
export async function GET(req: NextRequest) {
  const auth = await requireAnyRole(req, GRANTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
  const search = (searchParams.get('search') || '').trim().slice(0, 100);
  const statusParam = searchParams.get('status') || '';
  const status = isDossierStatus(statusParam) ? statusParam : '';

  try {
    const [{ rows, total }, counts] = await Promise.all([
      repo.list({ page, limit, search, status }),
      repo.statusCounts(),
    ]);
    return NextResponse.json({
      success: true,
      data: rows,
      counts,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) {
    console.error('[admin/grants]', err);
    return NextResponse.json({ success: false, error: 'Failed to load grant submissions.' }, { status: 500 });
  }
}
