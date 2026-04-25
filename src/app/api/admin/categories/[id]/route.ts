import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/middleware/auth.middleware';
import { CategoriesService } from '@/modules/categories/service/categories.service';
import { CategoriesRepository } from '@/modules/categories/repository/categories.repository';
import { CategoryEntity } from '@/modules/categories/domain/types';

// Initialize services
const categoriesRepository = new CategoriesRepository();
const categoriesService = new CategoriesService(categoriesRepository);

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/categories/[id]
 * Get category by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const categoryId = parseInt(id);

    if (isNaN(categoryId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid category ID',
        },
        { status: 400 }
      );
    }

    const category = await categoriesService.getCategoryById(categoryId);

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch category',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/categories/[id]
 * Update category
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const categoryId = parseInt(id);

    if (isNaN(categoryId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid category ID',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updateData: Partial<CategoryEntity> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.imageUrl !== undefined) updateData.image_url = body.imageUrl;
    if (body.parentId !== undefined) updateData.parent_id = body.parentId;
    if (body.sortOrder !== undefined) updateData.sort_order = body.sortOrder;

    const category = await categoriesService.updateCategory(categoryId, updateData);

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update category',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/categories/[id]
 * Delete category
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const categoryId = parseInt(id);

    if (isNaN(categoryId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid category ID',
        },
        { status: 400 }
      );
    }

    await categoriesService.deleteCategory(categoryId);

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete category',
      },
      { status: 500 }
    );
  }
}

