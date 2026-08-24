import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { INNER_PAGES_ROLES } from '@/shared/middleware/roles';
import { InnerPageContentRepository } from '@/modules/inner-pages/repository/inner-pages.repository';
import { toInnerPageContent } from '@/modules/inner-pages/domain/types';
import { deleteCache } from '@/shared/cache/redis.client';

const repo = new InnerPageContentRepository();

export async function GET(request: NextRequest, { params }: { params: Promise<{ pageKey: string }> }) {
  const auth = await requireAnyRole(request, INNER_PAGES_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { pageKey } = await params;
  try {
    const entity = await repo.find(pageKey);
    return NextResponse.json({ success: true, data: toInnerPageContent(entity, pageKey) });
  } catch (err) {
    console.error('GET /api/admin/inner-pages/[pageKey] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch page content' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ pageKey: string }> }) {
  const auth = await requireAnyRole(request, INNER_PAGES_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { pageKey } = await params;
  try {
    const body = await request.json();
    const contentHtml = String(body.contentHtml ?? '');
    const entity = await repo.upsert(pageKey, contentHtml, auth.user.email);
    await deleteCache(`inner-page-content:${pageKey}`);
    return NextResponse.json({ success: true, data: toInnerPageContent(entity, pageKey) });
  } catch (err) {
    console.error('PUT /api/admin/inner-pages/[pageKey] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to save page content' }, { status: 500 });
  }
}
