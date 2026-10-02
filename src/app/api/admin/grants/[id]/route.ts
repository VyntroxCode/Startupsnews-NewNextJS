import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { GRANTS_ROLES } from '@/shared/middleware/roles';
import { IncubatxDossierRepository } from '@/modules/incubatx-dossier/repository/incubatx-dossier.repository';
import { isDossierStatus } from '@/modules/incubatx-dossier/domain/types';

const repo = new IncubatxDossierRepository();

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** GET /api/admin/grants/:id — one dossier in full, for the Grants detail drawer. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(req, GRANTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ success: false, error: 'Invalid id.' }, { status: 400 });

  try {
    const detail = await repo.findDetailById(id);
    if (!detail) return NextResponse.json({ success: false, error: 'Submission not found.' }, { status: 404 });
    return NextResponse.json({ success: true, data: detail });
  } catch (err) {
    console.error('[admin/grants/:id]', err);
    return NextResponse.json({ success: false, error: 'Failed to load the submission.' }, { status: 500 });
  }
}

/** PATCH /api/admin/grants/:id — body { status }: move a dossier through
 * pending → reviewed → accepted / rejected. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(req, GRANTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ success: false, error: 'Invalid id.' }, { status: 400 });

  const body = await req.json().catch(() => null);
  const status = body?.status;
  if (!isDossierStatus(status)) {
    return NextResponse.json({ success: false, error: 'Invalid status.' }, { status: 400 });
  }

  try {
    const updated = await repo.updateStatus(id, status);
    if (!updated) return NextResponse.json({ success: false, error: 'Submission not found.' }, { status: 404 });
    const detail = await repo.findDetailById(id);
    return NextResponse.json({ success: true, data: detail });
  } catch (err) {
    console.error('[admin/grants/:id PATCH]', err);
    return NextResponse.json({ success: false, error: 'Failed to update the status.' }, { status: 500 });
  }
}
