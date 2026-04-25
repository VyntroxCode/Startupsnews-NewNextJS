import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/middleware/auth.middleware';
import { query } from '@/shared/database/connection';
import { convertToCsv } from '@/shared/utils/csv-utils';

interface EventRow {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  description: string | null;
  location: string;
  event_date: string;
  event_time: string | null;
  image_url: string | null;
  external_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    // Fetch events with all details
    const events = await query<EventRow>(`
      SELECT 
        id,
        title,
        slug,
        excerpt,
        description,
        location,
        event_date,
        event_time,
        image_url,
        external_url,
        status,
        created_at,
        updated_at
      FROM events
      ORDER BY event_date DESC, event_time DESC
    `);

    const columns = [
      'id',
      'title',
      'slug',
      'excerpt',
      'description',
      'location',
      'event_date',
      'event_time',
      'image_url',
      'external_url',
      'status',
      'created_at',
      'updated_at',
    ] as (keyof EventRow)[];

    const csvContent = convertToCsv(events, columns);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="events-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting events:', error);
    return NextResponse.json(
      { error: 'Failed to export events' },
      { status: 500 }
    );
  }
}
