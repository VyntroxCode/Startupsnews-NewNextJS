import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/middleware/auth.middleware';
import { CategoriesService } from '@/modules/categories/service/categories.service';
import { CategoriesRepository } from '@/modules/categories/repository/categories.repository';
import { filterSectorCategories } from '@/lib/sector-categories';

export const maxDuration = 60;

// Initialize services
const categoriesRepository = new CategoriesRepository();
const categoriesService = new CategoriesService(categoriesRepository);

/**
 * GET /api/admin/categories
 * Get all categories with pagination
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const parentIdParam = searchParams.get('parentId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const filters: {
      limit?: number;
      offset?: number;
      search?: string;
      parentId?: number | null;
    } = {
      // Fetch enough rows first, then apply sector filter and paginate in-memory.
      limit: 500,
      offset: 0,
    };

    if (search) {
      filters.search = search;
    }

    if (parentIdParam !== null && parentIdParam !== undefined) {
      if (parentIdParam === 'top' || parentIdParam === '') {
        filters.parentId = null; // Top-level only
      } else {
        const parsed = parseInt(parentIdParam, 10);
        if (!isNaN(parsed)) filters.parentId = parsed;
      }
    }

    const categories = await categoriesService.getAllCategories(filters);

    // Filter to only sector categories for admin panel
    const filteredCategories = filterSectorCategories(categories);
    const pagedCategories = filteredCategories.slice(offset, offset + limit);
    const total = filteredCategories.length;

    return NextResponse.json({
      success: true,
      data: pagedCategories,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch categories',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/categories
 * Create new category
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';

    if (!name || !slug) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name and slug are required',
        },
        { status: 400 }
      );
    }

    const category = await categoriesService.createCategory(body);

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Error creating category:', error);

    const message = error instanceof Error ? error.message : 'Failed to create category';
    const status = /already exists/i.test(message) ? 409 : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}
