import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { USER_MANAGEMENT_ROLES } from '@/shared/middleware/roles';
import { FundingSponsorCardsRepository } from '@/modules/funding-sponsor-cards/repository/funding-sponsor-cards.repository';
import { MAX_ACTIVE_SPONSOR_CARDS, validateSponsorCardInput } from '@/modules/funding-sponsor-cards/domain/types';

export const dynamic = 'force-dynamic';

const repo = new FundingSponsorCardsRepository();

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** PUT /api/admin/user-management/funding-cards/:id — replace a card's fields, including the
 * show/hide switch. Switching on is refused while 3 other cards are already showing. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(req, USER_MANAGEMENT_ROLES);
  if (auth instanceof NextResponse) return auth;

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ success: false, error: 'Invalid id.' }, { status: 400 });

  const parsed = validateSponsorCardInput(await req.json().catch(() => null));
  if ('error' in parsed) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });

  try {
    if (!(await repo.findById(id))) return NextResponse.json({ success: false, error: 'Card not found.' }, { status: 404 });
    if (parsed.input.isActive && (await repo.countActive(id)) >= MAX_ACTIVE_SPONSOR_CARDS) {
      return NextResponse.json({ success: false, error: `Only ${MAX_ACTIVE_SPONSOR_CARDS} cards can show at once. Switch one off first.` }, { status: 409 });
    }
    return NextResponse.json({ success: true, data: await repo.update(id, parsed.input) });
  } catch (err) {
    console.error('[admin/user-management/funding-cards/:id]', err);
    return NextResponse.json({ success: false, error: 'Failed to save the card.' }, { status: 500 });
  }
}

/** DELETE /api/admin/user-management/funding-cards/:id */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(req, USER_MANAGEMENT_ROLES);
  if (auth instanceof NextResponse) return auth;

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ success: false, error: 'Invalid id.' }, { status: 400 });

  try {
    await repo.delete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/user-management/funding-cards/:id]', err);
    return NextResponse.json({ success: false, error: 'Failed to delete the card.' }, { status: 500 });
  }
}
