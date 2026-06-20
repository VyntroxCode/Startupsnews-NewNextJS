import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { updateNewsletterCategories } from '@/modules/public-users/repository/public-users.repository';
import { queryOne } from '@/shared/database/connection';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme-secret';

function extractUserId(req: NextRequest): number | null {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const p = jwt.verify(token, JWT_SECRET) as { pubUserId?: number };
    return p.pubUserId ?? null;
  } catch { return null; }
}

/** GET /api/public-auth/newsletter-preferences — return current slugs for the user */
export async function GET(req: NextRequest) {
  const userId = extractUserId(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const row = await queryOne<{ newsletter_category_slugs: string | null }>(
      'SELECT newsletter_category_slugs FROM public_registrations WHERE id = ?', [userId]
    );
    const slugs = row?.newsletter_category_slugs
      ? row.newsletter_category_slugs.split(',').filter(Boolean)
      : [];
    return NextResponse.json({ success: true, data: slugs });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let payload: { pubUserId?: number };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { pubUserId?: number };
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    if (!payload.pubUserId) {
      return NextResponse.json({ success: false, error: 'Invalid token payload' }, { status: 401 });
    }

    const body = await req.json() as { categories?: string[] };
    const categories = Array.isArray(body.categories) ? body.categories : [];

    if (categories.length < 1 || categories.length > 3) {
      return NextResponse.json({ success: false, error: 'Select between 1 and 3 categories' }, { status: 400 });
    }

    await updateNewsletterCategories(payload.pubUserId, categories);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[newsletter-preferences]', err);
    return NextResponse.json({ success: false, error: 'Failed to save preferences' }, { status: 500 });
  }
}
