import { NextRequest, NextResponse } from 'next/server';
import { BannersService } from '@/modules/banners/service/banners.service';
import { BannersRepository } from '@/modules/banners/repository/banners.repository';
import { entityToBanner } from '@/modules/banners/utils/banners.utils';
import { toCdnUrl } from '@/shared/utils/image-cdn';

// Initialize services
const bannersRepository = new BannersRepository();
const bannersService = new BannersService(bannersRepository);

/**
 * GET /api/banners
 * Get active banners for frontend display
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit');
    const limitNum = limit ? parseInt(limit, 10) : undefined;

    const entities = await bannersService.getActiveBanners(limitNum);
    // CDN rewrite only on this public display path — never in the admin routes, where the
    // raw S3 URL must stay intact for the edit form (see shared/utils/image-cdn.ts).
    const banners = entities.map((e) => ({ ...entityToBanner(e), imageUrl: toCdnUrl(e.image_url) }));

    return NextResponse.json({
      success: true,
      data: banners,
    });
  } catch (error) {
    console.error('Error fetching banners:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch banners',
      },
      { status: 500 }
    );
  }
}

