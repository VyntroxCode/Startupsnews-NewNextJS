import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { INNER_PAGES_ROLES } from '@/shared/middleware/roles';
import { PartnerLogosRepository } from '@/modules/inner-pages/repository/inner-pages.repository';
import { toPartnerLogo, PARTNER_LOGO_SECTIONS } from '@/modules/inner-pages/domain/types';
import { deleteCache } from '@/shared/cache/redis.client';

const repo = new PartnerLogosRepository();

export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, INNER_PAGES_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const entities = await repo.findAll();
    return NextResponse.json({ success: true, data: entities.map(toPartnerLogo) });
  } catch (err) {
    console.error('GET /api/admin/partner-logos error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch partner logos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, INNER_PAGES_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const section = String(body.section || '').trim();
    const imageUrl = String(body.imageUrl || '').trim();
    const linkUrl = body.linkUrl ? String(body.linkUrl).trim() : null;

    if (!(PARTNER_LOGO_SECTIONS as readonly string[]).includes(section)) {
      return NextResponse.json({ success: false, error: 'Choose a valid section.' }, { status: 400 });
    }
    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'Logo image is required.' }, { status: 400 });
    }

    const entity = await repo.create({ section, imageUrl, linkUrl }, auth.user.email);
    await deleteCache('partner-logos:by-section');
    return NextResponse.json({ success: true, data: toPartnerLogo(entity) }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/partner-logos error:', err);
    return NextResponse.json({ success: false, error: 'Failed to add partner logo' }, { status: 500 });
  }
}
