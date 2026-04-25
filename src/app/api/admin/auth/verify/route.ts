import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/shared/middleware/auth.middleware';

/**
 * GET /api/admin/auth/verify
 * Verify authentication token
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);

    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Allow admin, editor, and author (author can create posts)
    const allowed = ['admin', 'editor', 'author', 'administrator'];
    const role = (auth.user.role || '').toLowerCase().trim();
    const normalized = role === 'administrator' ? 'admin' : role;
    if (!allowed.includes(normalized)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: auth.user,
      },
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Verification failed',
      },
      { status: 500 }
    );
  }
}

