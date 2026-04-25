import { NextRequest, NextResponse } from 'next/server';
import { CategoriesService } from '@/modules/categories/service/categories.service';
import { CategoriesRepository } from '@/modules/categories/repository/categories.repository';

// Initialize services
const categoriesRepository = new CategoriesRepository();
const categoriesService = new CategoriesService(categoriesRepository);

/**
 * GET /api/categories
 * Get all categories
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parentId = searchParams.get('parentId');
    const includeChildren = searchParams.get('includeChildren') === 'true';

    const filters: {
      parentId?: number | null;
      includeChildren?: boolean;
    } = {};

    if (parentId === 'null' || parentId === null) {
      filters.parentId = null;
    } else if (parentId) {
      const parsed = parseInt(parentId);
      if (!isNaN(parsed)) {
        filters.parentId = parsed;
      }
    }

    if (includeChildren) {
      filters.includeChildren = true;
    }

    const categories = includeChildren
      ? await categoriesService.getCategoriesWithChildren()
      : await categoriesService.getAllCategories(filters);

    return NextResponse.json({
      success: true,
      data: categories,
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

