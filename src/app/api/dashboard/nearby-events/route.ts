import { NextRequest, NextResponse } from 'next/server';
import { EventsRepository } from '@/modules/events/repository/events.repository';
import { EventsService } from '@/modules/events/service/events.service';
import { entityToEvent } from '@/modules/events/utils/events.utils';
import type { EventEntity } from '@/modules/events/domain/types';

/**
 * GET /api/dashboard/nearby-events?city=<city>
 *
 * Powers the member dashboard's "Founder events near you" section. Selection rule, per the
 * user's own spec (confirmed before building this):
 *   - If `city` is supplied and has 1+ upcoming events: return those, soonest first, capped at 3.
 *     Never padded with unrelated events — 1 real match means 1 card, not 1 real + 2 filler.
 *   - Otherwise (no city supplied, or the given city has zero upcoming events): fall back to 3
 *     random events from 3 different cities, one event per city — `usedFallback: true` so the
 *     client can adjust its copy ("no events in X yet" vs "events in X").
 * No auth required — same aggregate-only, non-personal shape as /api/dashboard/weekly-highlights.
 *
 * Returns full `StartupEvent` objects via the *same* `entityToEvent` transform the public /events
 * page uses — not a hand-rolled subset — so the dashboard's cards can render with the real
 * poster image, excerpt and formatted date range via the real `EventByCountryCard` component
 * (see DashboardHome.tsx) instead of a lookalike with different fields.
 */

const eventsRepository = new EventsRepository();
const eventsService = new EventsService(eventsRepository);

function eventDateMs(e: EventEntity): number {
  const t = new Date(String(e.event_date)).getTime();
  return Number.isNaN(t) ? Infinity : t;
}

/** Fisher–Yates, used for the random-fallback draw. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET(req: NextRequest) {
  try {
    const city = req.nextUrl.searchParams.get('city')?.trim() || '';
    const events = await eventsService.getUpcomingForPublic();

    if (city) {
      const cityLower = city.toLowerCase();
      const matches = events
        .filter((e) => e.location?.toLowerCase().includes(cityLower))
        .sort((a, b) => eventDateMs(a) - eventDateMs(b))
        .slice(0, 3);

      if (matches.length > 0) {
        return NextResponse.json({
          success: true,
          data: { events: matches.map(entityToEvent), usedFallback: false },
        });
      }
    }

    // Fallback: 3 random events from 3 different cities (grouped case/whitespace-insensitively
    // so "Bengaluru" and " bengaluru " don't count as two different cities).
    const byCity = new Map<string, EventEntity[]>();
    for (const e of events) {
      const key = (e.location || '').trim().toLowerCase();
      if (!key) continue;
      if (!byCity.has(key)) byCity.set(key, []);
      byCity.get(key)!.push(e);
    }
    const pickedCities = shuffle([...byCity.keys()]).slice(0, 3);
    const picked = pickedCities.map((key) => {
      const group = byCity.get(key)!;
      return group[Math.floor(Math.random() * group.length)];
    });

    return NextResponse.json({
      success: true,
      data: { events: picked.map(entityToEvent), usedFallback: true },
    });
  } catch (error) {
    console.error('GET /api/dashboard/nearby-events error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load nearby events' },
      { status: 500 }
    );
  }
}
