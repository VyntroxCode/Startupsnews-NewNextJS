import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/middleware/auth.middleware';
import { BannersService } from '@/modules/banners/service/banners.service';
import { BannersRepository } from '@/modules/banners/repository/banners.repository';
import { entityToBanner } from '@/modules/banners/utils/banners.utils';

export const maxDuration = 60;

// Initialize services
const bannersRepository = new BannersRepository();
const bannersService = new BannersService(bannersRepository);

/**
 * GET /api/admin/banners
 * Get all banners (admin view) with pagination
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const filters: {
      isActive?: boolean;
      limit?: number;
      offset?: number;
    } = {
      limit: Math.min(limit, 100), // Max 100 items per page
      offset,
    };

    if (isActive !== null) {
      filters.isActive = isActive === 'true';
    }

    // Get total count for pagination
    const countFilters: { isActive?: boolean } = {};
    if (isActive !== null) {
      countFilters.isActive = isActive === 'true';
    }

    const [total, entities] = await Promise.all([
      bannersService.countBanners(countFilters),
      bannersService.getAllBanners(filters),
    ]);
    const banners = entities.map(entityToBanner);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: banners,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
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

/**
 * POST /api/admin/banners
 * Create new banner
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    
    // Validation
    if (!body.title || !body.imageUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title and image URL are required',
        },
        { status: 400 }
      );
    }

    const banner = await bannersService.createBanner({
      title: body.title,
      description: body.description,
      imageUrl: body.imageUrl,
      linkUrl: body.linkUrl,
      linkText: body.linkText,
      order: body.order ?? 0,
      isActive: body.isActive !== undefined ? body.isActive : true,
      startDate: body.startDate,
      endDate: body.endDate,
    });

    return NextResponse.json({
      success: true,
      data: entityToBanner(banner),
    });
  } catch (error) {
    console.error('Error creating banner:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create banner',
      },
      { status: 500 }
    );
  }
}

