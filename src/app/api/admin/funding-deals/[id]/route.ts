import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { FUNDING_ROLES } from '@/shared/middleware/roles';
import {
  deleteDeal,
  getDeal,
  isDuplicateKeyError,
  prepareDeal,
  updateDeal,
} from '@/modules/funding-deals/service/funding-deals.service';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** PATCH /api/admin/funding-deals/:id — edit a deal. The body is the full editable field set. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(req, FUNDING_ROLES);
  if (auth instanceof NextResponse) return auth;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ success: false, error: 'Invalid id.' }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const prepared = prepareDeal(body);
  if ('error' in prepared) return NextResponse.json({ success: false, error: prepared.error }, { status: 400 });

  try {
    const updated = await updateDeal(id, prepared.row);
    if (!updated) return NextResponse.json({ success: false, error: 'Deal not found.' }, { status: 404 });
    return NextResponse.json({ success: true, data: await getDeal(id) });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return NextResponse.json(
        { success: false, error: 'Another deal already has the same date, startup and round stage.' },
        { status: 409 },
      );
    }
    console.error('[admin/funding-deals PATCH]', err);
    return NextResponse.json({ success: false, error: 'Failed to update the deal.' }, { status: 500 });
  }
}

/** DELETE /api/admin/funding-deals/:id */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(req, FUNDING_ROLES);
  if (auth instanceof NextResponse) return auth;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ success: false, error: 'Invalid id.' }, { status: 400 });

  try {
    const deleted = await deleteDeal(id);
    if (!deleted) return NextResponse.json({ success: false, error: 'Deal not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/funding-deals DELETE]', err);
    return NextResponse.json({ success: false, error: 'Failed to delete the deal.' }, { status: 500 });
  }
}
