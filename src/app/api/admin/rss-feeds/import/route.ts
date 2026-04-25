import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { RssFeedsRepository } from '@/modules/rss-feeds/repository/rss-feeds.repository';
import { queryOne } from '@/shared/database/connection';
import * as fs from 'fs';

/** WP Automatic campaign row from export JSON */
interface WpAutomaticCampaign {
  camp_id?: string;
  camp_name?: string;
  camp_type?: string;
  camp_post_category?: string;
  feeds?: string;
}

const DEFAULT_EXPORT_PATH = '/home/ubuntu/wp_automatic_export.json';

/**
 * POST /api/admin/rss-feeds/import
 * Import RSS feeds from WP Automatic export JSON.
 * Body: optional { json?: WpAutomaticCampaign[], categoryMapping?: Record<string, number>, defaultCategoryId?: number, defaultAuthorId?: number }
 * If json is not provided, reads from process.env.WP_AUTOMATIC_EXPORT_PATH or /home/ubuntu/wp_automatic_export.json
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const repo = new RssFeedsRepository();
  const result = { imported: 0, skipped: 0, errors: [] as string[] };

  try {
    let campaigns: WpAutomaticCampaign[] = [];
    const body = await request.json().catch(() => ({}));

    if (Array.isArray(body.json)) {
      campaigns = body.json;
    } else {
      const filePath = process.env.WP_AUTOMATIC_EXPORT_PATH || DEFAULT_EXPORT_PATH;
      if (!fs.existsSync(filePath)) {
        return NextResponse.json(
          { success: false, error: `File not found: ${filePath}. Set WP_AUTOMATIC_EXPORT_PATH or place export at ${DEFAULT_EXPORT_PATH}.` },
          { status: 400 }
        );
      }
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      campaigns = Array.isArray(parsed) ? parsed : [];
    }

    const defaultCategory = await queryOne<{ id: number }>('SELECT id FROM categories ORDER BY id LIMIT 1');
    const defaultAuthor = await queryOne<{ id: number }>("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1");
    const defaultCategoryId = body.defaultCategoryId ?? defaultCategory?.id ?? 1;
    const defaultAuthorId = body.defaultAuthorId ?? defaultAuthor?.id ?? 1;
    const categoryMapping: Record<string, number> = body.categoryMapping ?? {};

    const feedCampaigns = campaigns.filter(
      (c) => (c.camp_type || '').toLowerCase() === 'feeds' && (c.feeds || '').trim().length > 0
    );

    for (const camp of feedCampaigns) {
      const name = (camp.camp_name || camp.camp_id || 'Feed').trim().slice(0, 255);
      const wpCategoryId = (camp.camp_post_category || '').toString().trim();
      const categoryId = wpCategoryId && categoryMapping[wpCategoryId] != null
        ? categoryMapping[wpCategoryId]
        : defaultCategoryId;

      const urls = (camp.feeds || '')
        .trim()
        .split(/\s+/)
        .filter((u: string) => u.startsWith('http://') || u.startsWith('https://'));

      for (const url of urls) {
        const urlTrim = url.slice(0, 500);
        try {
          const existing = await queryOne<{ id: number }>('SELECT id FROM rss_feeds WHERE url = ?', [urlTrim]);
          if (existing) {
            result.skipped++;
            continue;
          }
          await repo.create({
            name: name || urlTrim.slice(0, 100),
            url: urlTrim,
            category_id: categoryId,
            author_id: defaultAuthorId,
            enabled: 1,
            fetch_interval_minutes: 10,
            max_items_per_fetch: 10,
            auto_publish: 1,
          });
          result.imported++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          result.errors.push(`${name || urlTrim}: ${msg}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors,
        campaignsProcessed: feedCampaigns.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('RSS import error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
