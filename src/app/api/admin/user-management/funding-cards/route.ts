import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { USER_MANAGEMENT_ROLES } from '@/shared/middleware/roles';
import { FundingSponsorCardsRepository } from '@/modules/funding-sponsor-cards/repository/funding-sponsor-cards.repository';
import {
  MAX_ACTIVE_SPONSOR_CARDS,
  MAX_SPONSOR_CARDS,
  validateSponsorCardInput,
} from '@/modules/funding-sponsor-cards/domain/types';

export const dynamic = 'force-dynamic';

const repo = new FundingSponsorCardsRepository();

/** GET /api/admin/user-management/funding-cards — every sponsor card (max 5), oldest first. */
export async function GET(req: NextRequest) {
  const auth = await requireAnyRole(req, USER_MANAGEMENT_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    return NextResponse.json({ success: true, data: await repo.list() });
  } catch (err) {
    console.error('[admin/user-management/funding-cards]', err);
    return NextResponse.json({ success: false, error: 'Failed to load the cards.' }, { status: 500 });
  }
}

/** POST /api/admin/user-management/funding-cards — body { title, subtitle, imageUrl, linkUrl, isActive }.
 * Refused once 5 cards exist, or when isActive would make a 4th card show. */
export async function POST(req: NextRequest) {
  const auth = await requireAnyRole(req, USER_MANAGEMENT_ROLES);
  if (auth instanceof NextResponse) return auth;

  const parsed = validateSponsorCardInput(await req.json().catch(() => null));
  if ('error' in parsed) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });

  try {
    if ((await repo.count()) >= MAX_SPONSOR_CARDS) {
      return NextResponse.json({ success: false, error: `You can have at most ${MAX_SPONSOR_CARDS} cards. Delete one to add another.` }, { status: 409 });
    }
    if (parsed.input.isActive && (await repo.countActive()) >= MAX_ACTIVE_SPONSOR_CARDS) {
      return NextResponse.json({ success: false, error: `Only ${MAX_ACTIVE_SPONSOR_CARDS} cards can show at once. Switch one off first.` }, { status: 409 });
    }
    const card = await repo.create(parsed.input, auth.user.email);
    if (!card) throw new Error('Insert returned no id');
    return NextResponse.json({ success: true, data: card }, { status: 201 });
  } catch (err) {
    console.error('[admin/user-management/funding-cards]', err);
    return NextResponse.json({ success: false, error: 'Failed to save the card.' }, { status: 500 });
  }
}
