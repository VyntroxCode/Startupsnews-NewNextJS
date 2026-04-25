import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/middleware/auth.middleware';
import { query } from '@/shared/database/connection';
import { convertToCsv } from '@/shared/utils/csv-utils';

interface PostRow {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  meta_description: string | null;
  category: string;
  author: string;
  featured_image_url: string | null;
  featured_image_small_url: string | null;
  format: string;
  status: string;
  featured: boolean;
  is_gone_410: boolean;
  trending_score: number;
  view_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    // Fetch posts with all details
    const posts = await query<PostRow>(`
      SELECT 
        p.id,
        p.title,
        p.slug,
        p.excerpt,
        p.meta_description,
        COALESCE(c.name, 'Uncategorized') as category,
        COALESCE(u.name, 'Unknown') as author,
        p.featured_image_url,
        p.featured_image_small_url,
        p.format,
        p.status,
        p.featured,
        p.is_gone_410,
        p.trending_score,
        p.view_count,
        p.published_at,
        p.created_at,
        p.updated_at
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.author_id = u.id
      ORDER BY p.id DESC
    `);

    const columns = [
      'id',
      'title',
      'slug',
      'excerpt',
      'meta_description',
      'category',
      'author',
      'featured_image_url',
      'featured_image_small_url',
      'format',
      'status',
      'featured',
      'is_gone_410',
      'trending_score',
      'view_count',
      'published_at',
      'created_at',
      'updated_at',
    ] as (keyof PostRow)[];

    const csvContent = convertToCsv(posts, columns);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="posts-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting posts:', error);
    return NextResponse.json(
      { error: 'Failed to export posts' },
      { status: 500 }
    );
  }
}
