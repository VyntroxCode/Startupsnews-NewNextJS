import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/middleware/auth.middleware';
import { query, queryOne } from '@/shared/database/connection';

type SelectionMode = 'selected' | 'byStatus';
type StatusScope = 'published' | 'draft' | 'archived' | 'unpublished';
type TargetHttpStatus = 200 | 404 | 410;

interface BulkBody {
  selectionMode: SelectionMode;
  targetHttpStatus?: TargetHttpStatus;
  postIds?: number[];
  statusScope?: StatusScope;
  source?: 'manual' | 'rss' | null;
  categoryId?: number | null;
  search?: string;
}

async function ensureGone410Column(): Promise<void> {
  const col = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'posts'
       AND COLUMN_NAME = 'is_gone_410'`
  );

  if (Number(col?.cnt || 0) === 0) {
    await query('ALTER TABLE posts ADD COLUMN is_gone_410 TINYINT(1) NOT NULL DEFAULT 0 AFTER status');
    await query('CREATE INDEX idx_posts_is_gone_410 ON posts(is_gone_410)');
  }
}

function buildWhere(body: BulkBody, params: Array<string | number>): string {
  if (body.selectionMode === 'selected') {
    const ids = (body.postIds || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0);
    if (ids.length === 0) return '';
    params.push(...ids);
    return `p.id IN (${ids.map(() => '?').join(',')})`;
  }

  if (!body.statusScope) return '';

  const clauses: string[] = [];
  if (body.statusScope === 'published') {
    clauses.push("p.status = 'published'");
  } else if (body.statusScope === 'draft') {
    clauses.push("p.status = 'draft'");
  } else if (body.statusScope === 'archived') {
    clauses.push("p.status = 'archived'");
  } else {
    clauses.push("p.status IN ('draft','archived')");
  }

  if (body.source === 'rss') {
    clauses.push('EXISTS (SELECT 1 FROM rss_feed_items i WHERE i.post_id = p.id)');
  } else if (body.source === 'manual') {
    clauses.push('NOT EXISTS (SELECT 1 FROM rss_feed_items i WHERE i.post_id = p.id)');
  }

  if (body.categoryId && Number.isFinite(Number(body.categoryId))) {
    clauses.push('p.category_id = ?');
    params.push(Number(body.categoryId));
  }

  if (body.search && body.search.trim()) {
    const term = `%${body.search.trim()}%`;
    clauses.push('(p.title LIKE ? OR p.excerpt LIKE ? OR p.slug LIKE ?)');
    params.push(term, term, term);
  }

  return clauses.join(' AND ');
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureGone410Column();

    const body = (await request.json()) as BulkBody;
    if (!body || !body.selectionMode) {
      return NextResponse.json({ success: false, error: 'selectionMode is required' }, { status: 400 });
    }

    const targetStatus = Number(body.targetHttpStatus);
    if (![200, 404, 410].includes(targetStatus)) {
      return NextResponse.json({ success: false, error: 'targetHttpStatus must be 200, 404, or 410' }, { status: 400 });
    }

    const params: Array<string | number> = [];
    const where = buildWhere(body, params);
    if (!where) {
      return NextResponse.json({ success: false, error: 'No posts matched for update' }, { status: 400 });
    }

    const countRow = await queryOne<{ total: number | bigint }>(
      `SELECT COUNT(*) AS total FROM posts p WHERE ${where}`,
      params
    );
    const total = Number(countRow?.total || 0);

    if (total === 0) {
      return NextResponse.json({ success: true, data: { updated: 0 } });
    }

    if (targetStatus === 410) {
      await query(`UPDATE posts p SET p.is_gone_410 = 1 WHERE ${where}`, params);
    } else if (targetStatus === 200) {
      await query(
        `UPDATE posts p
         SET p.is_gone_410 = 0,
             p.status = 'published',
             p.published_at = COALESCE(p.published_at, NOW())
         WHERE ${where}`,
        params
      );
    } else {
      await query(
        `UPDATE posts p
         SET p.is_gone_410 = 0,
             p.status = 'archived'
         WHERE ${where}`,
        params
      );
    }

    return NextResponse.json({
      success: true,
      data: { updated: total },
      message: `Updated ${total} post(s) to HTTP ${targetStatus}`,
    });
  } catch (error) {
    console.error('Bulk 410 update failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Bulk update failed' },
      { status: 500 }
    );
  }
}
