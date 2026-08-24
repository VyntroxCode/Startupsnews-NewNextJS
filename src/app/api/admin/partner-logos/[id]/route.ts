import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { INNER_PAGES_ROLES } from '@/shared/middleware/roles';
import { PartnerLogosRepository } from '@/modules/inner-pages/repository/inner-pages.repository';
import { toPartnerLogo, PARTNER_LOGO_SECTIONS } from '@/modules/inner-pages/domain/types';
import { deleteCache } from '@/shared/cache/redis.client';

const repo = new PartnerLogosRepository();

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(request, INNER_PAGES_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const logoId = Number(id);
  if (Number.isNaN(logoId)) {
    return NextResponse.json({ success: false, error: 'Invalid partner logo ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const update: { section?: string; imageUrl?: string; linkUrl?: string | null } = {};
    if (body.section !== undefined) {
      const section = String(body.section).trim();
      if (!(PARTNER_LOGO_SECTIONS as readonly string[]).includes(section)) {
        return NextResponse.json({ success: false, error: 'Choose a valid section.' }, { status: 400 });
      }
      update.section = section;
    }
    if (body.imageUrl !== undefined) {
      const imageUrl = String(body.imageUrl).trim();
      if (!imageUrl) return NextResponse.json({ success: false, error: 'Logo image is required.' }, { status: 400 });
      update.imageUrl = imageUrl;
    }
    if (body.linkUrl !== undefined) {
      update.linkUrl = body.linkUrl ? String(body.linkUrl).trim() : null;
    }

    const existing = await repo.findById(logoId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Partner logo not found' }, { status: 404 });
    }

    const entity = await repo.update(logoId, update, auth.user.email);
    await deleteCache('partner-logos:by-section');
    return NextResponse.json({ success: true, data: entity ? toPartnerLogo(entity) : null });
  } catch (err) {
    console.error('PUT /api/admin/partner-logos/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update partner logo' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(request, INNER_PAGES_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const logoId = Number(id);
  if (Number.isNaN(logoId)) {
    return NextResponse.json({ success: false, error: 'Invalid partner logo ID' }, { status: 400 });
  }

  try {
    const existing = await repo.findById(logoId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Partner logo not found' }, { status: 404 });
    }
    await repo.delete(logoId);
    await deleteCache('partner-logos:by-section');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/partner-logos/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete partner logo' }, { status: 500 });
  }
}
