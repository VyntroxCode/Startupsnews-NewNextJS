import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { ALL_ADMIN_ROLES } from '@/shared/middleware/roles';
import { PostsRepository } from '@/modules/posts/repository/posts.repository';
import { EventsRepository } from '@/modules/events/repository/events.repository';
import { CategoriesRepository } from '@/modules/categories/repository/categories.repository';
import { EventRegionsRepository } from '@/modules/events/repository/event-regions.repository';
import { UsersRepository } from '@/modules/users/repository/users.repository';
import { PanelAdminsRepository } from '@/modules/panel-admins/repository/panel-admins.repository';

export const maxDuration = 30;

// Initialize repositories
const postsRepository = new PostsRepository();
const eventsRepository = new EventsRepository();
const categoriesRepository = new CategoriesRepository();
const eventRegionsRepository = new EventRegionsRepository();
const usersRepository = new UsersRepository();
const panelAdminsRepository = new PanelAdminsRepository();

// Byline-author records created via /admin/authors use synthetic emails on this
// domain and aren't real admin-panel logins — exclude them from the "Users" count.
const SYNTHETIC_AUTHOR_EMAIL_SUFFIX = '@authors.startupnews.fyi';

/**
 * GET /api/admin/stats
 * Get dashboard statistics (batch endpoint)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, ALL_ADMIN_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [
      postsCount,
      eventsCount,
      categoriesCount,
      eventRegions,
      allUsers,
      panelAdmins,
    ] = await Promise.all([
      postsRepository.count({}),
      eventsRepository.count({}),
      categoriesRepository.count({}),
      eventRegionsRepository.findAll(),
      usersRepository.findAll(),
      panelAdminsRepository.findAll(),
    ]);

    const realUsers = allUsers.filter((u) => !u.email.toLowerCase().endsWith(SYNTHETIC_AUTHOR_EMAIL_SUFFIX));
    const authorsCount = allUsers.filter((u) => u.role === 'author').length;

    return NextResponse.json({
      success: true,
      data: {
        posts: postsCount,
        events: eventsCount,
        categories: categoriesCount,
        users: realUsers.length + panelAdmins.length,
        eventRegions: eventRegions.length,
        authors: authorsCount,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
      },
      { status: 500 }
    );
  }
}
