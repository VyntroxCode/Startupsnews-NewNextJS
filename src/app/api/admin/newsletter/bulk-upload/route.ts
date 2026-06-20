import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { query, queryOne } from '@/shared/database/connection';

interface UploadRow { email: string; name?: string; categories?: string; }

/** POST /api/admin/newsletter/bulk-upload */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json() as { rows: UploadRow[]; defaultCategories?: string };

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No rows provided' }, { status: 400 });
    }

    const results = { inserted: 0, updated: 0, skipped: 0, errors: [] as string[] };

    for (const row of body.rows) {
      const email = (row.email || '').trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.errors.push(`Invalid email: "${row.email}"`);
        continue;
      }

      const name = (row.name || '').trim() || email.split('@')[0];
      const cats = row.categories?.trim() || body.defaultCategories?.trim() || null;

      try {
        const existing = await queryOne<{ id: number; newsletter_category_slugs: string | null }>(
          'SELECT id, newsletter_category_slugs FROM public_registrations WHERE email = ? LIMIT 1',
          [email]
        );

        if (existing) {
          // Update categories if not already set and we have something to assign
          if (!existing.newsletter_category_slugs && cats) {
            await query(
              'UPDATE public_registrations SET newsletter_category_slugs = ?, is_active = 1 WHERE id = ?',
              [cats, existing.id]
            );
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          await query(
            'INSERT INTO public_registrations (name, email, auth_provider, newsletter_category_slugs, is_active) VALUES (?, ?, ?, ?, 1)',
            [name, email, 'email', cats]
          );
          results.inserted++;
        }
      } catch (rowErr) {
        results.errors.push(`${email}: ${rowErr instanceof Error ? rowErr.message : String(rowErr)}`);
      }
    }

    return NextResponse.json({ success: true, ...results, total: body.rows.length });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
