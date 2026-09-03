import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { ALL_ADMIN_ROLES } from '@/shared/middleware/roles';
import { PostsRepository } from '@/modules/posts/repository/posts.repository';
import { EventsRepository } from '@/modules/events/repository/events.repository';
import { CategoriesRepository } from '@/modules/categories/repository/categories.repository';
import { EventRegionsRepository } from '@/modules/events/repository/event-regions.repository';
import { UsersRepository } from '@/modules/users/repository/users.repository';
import { PanelAdminsRepository } from '@/modules/panel-admins/repository/panel-admins.repository';
import { PartnershipEventsRepository } from '@/modules/partnership-events/repository/partnership-events.repository';
import { entityToPartnershipEvent, countActivePartnershipEvents } from '@/modules/partnership-events/utils/partnership-events.utils';

export const maxDuration = 30;

// Initialize repositories
const postsRepository = new PostsRepository();
const eventsRepository = new EventsRepository();
const categoriesRepository = new CategoriesRepository();
const eventRegionsRepository = new EventRegionsRepository();
const usersRepository = new UsersRepository();
const panelAdminsRepository = new PanelAdminsRepository();
const partnershipEventsRepository = new PartnershipEventsRepository();

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
      partnershipEventEntities,
    ] = await Promise.all([
      postsRepository.count({}),
      eventsRepository.count({}),
      categoriesRepository.count({}),
      eventRegionsRepository.findAll(),
      usersRepository.findAll(),
      panelAdminsRepository.findAll(),
      partnershipEventsRepository.findAll(),
    ]);

    const realUsers = allUsers.filter((u) => !u.email.toLowerCase().endsWith(SYNTHETIC_AUTHOR_EMAIL_SUFFIX));
    const authorsCount = allUsers.filter((u) => u.role === 'author').length;

    // The dashboard's "Events" card reports the Partnership Tracker's "All Active events" total,
    // not `events` — partnership_events is the direct public source for /events and
    // /startup-events now, and the legacy `events` table is no longer what the site reads.
    // Counted with the tracker's own classifier (shared, not re-implemented) so the dashboard
    // number and the tracker's headline card always agree. "Today" is the server's midnight
    // here vs the browser's on the tracker screen — at most a one-day boundary difference on an
    // event expiring overnight.
    const todayMs = new Date().setHours(0, 0, 0, 0);
    const partnershipEventsActive = countActivePartnershipEvents(
      partnershipEventEntities.map(entityToPartnershipEvent),
      todayMs,
    );

    return NextResponse.json({
      success: true,
      data: {
        posts: postsCount,
        events: eventsCount,
        partnershipEventsActive,
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
