import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/middleware/auth.middleware';
import { BannersService } from '@/modules/banners/service/banners.service';
import { BannersRepository } from '@/modules/banners/repository/banners.repository';
import { entityToBanner } from '@/modules/banners/utils/banners.utils';

// Initialize services
const bannersRepository = new BannersRepository();
const bannersService = new BannersService(bannersRepository);

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/banners/[id]
 * Get banner by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const bannerId = parseInt(id);
    if (isNaN(bannerId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid banner ID',
        },
        { status: 400 }
      );
    }

    const entity = await bannersService.getBannerById(bannerId);
    if (!entity) {
      return NextResponse.json(
        {
          success: false,
          error: 'Banner not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: entityToBanner(entity),
    });
  } catch (error) {
    console.error('Error fetching banner:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch banner',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/banners/[id]
 * Update banner
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const bannerId = parseInt(id);
    if (isNaN(bannerId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid banner ID',
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const banner = await bannersService.updateBanner({
      id: bannerId,
      title: body.title,
      description: body.description,
      imageUrl: body.imageUrl,
      linkUrl: body.linkUrl,
      linkText: body.linkText,
      order: body.order,
      isActive: body.isActive,
      startDate: body.startDate,
      endDate: body.endDate,
    });

    return NextResponse.json({
      success: true,
      data: entityToBanner(banner),
    });
  } catch (error) {
    console.error('Error updating banner:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update banner',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/banners/[id]
 * Delete banner
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const bannerId = parseInt(id);
    if (isNaN(bannerId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid banner ID',
        },
        { status: 400 }
      );
    }

    const result = await bannersService.deleteBanner(bannerId);
    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: 'Banner not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Banner deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting banner:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete banner',
      },
      { status: 500 }
    );
  }
}

