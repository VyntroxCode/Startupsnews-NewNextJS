import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { RssFeedsRepository } from '@/modules/rss-feeds/repository/rss-feeds.repository';
import { query } from '@/shared/database/connection'; // used by DELETE

const rssRepo = new RssFeedsRepository();

/** GET /api/admin/newsletter — newsletter items from rss_feed_items + newsletter feeds */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const [items, allFeeds] = await Promise.all([
      rssRepo.findNewsletterItems(500),
      rssRepo.findAll(),
    ]);
    const newsletterFeeds = allFeeds.filter((f) =>
      String(f.feed_for ?? '').split(',').map((v) => v.trim()).includes('newsletter')
    );
    return NextResponse.json({ success: true, data: { items, newsletterFeeds } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/** DELETE /api/admin/newsletter — delete all rss_feed_items for newsletter-tagged feeds */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const allFeeds = await rssRepo.findAll();
    const newsletterFeedIds = allFeeds
      .filter((f) => String(f.feed_for ?? '').split(',').map((v) => v.trim()).includes('newsletter'))
      .map((f) => f.id);

    if (newsletterFeedIds.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const placeholders = newsletterFeedIds.map(() => '?').join(',');
    await query(
      `DELETE FROM rss_feed_items WHERE rss_feed_id IN (${placeholders})`,
      newsletterFeedIds
    );

    return NextResponse.json({ success: true, deleted: newsletterFeedIds.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
