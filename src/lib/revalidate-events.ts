import { revalidatePath } from 'next/cache';

/**
 * Bust the ISR cache for every public page that lists or shows events. Called after any admin
 * write to `events` / `partnership_events` so edits appear on the next request instead of
 * waiting out each page's `revalidate` window (up to 1h on /events/[slug]).
 */
export function revalidateEventPages() {
  revalidatePath('/events');
  revalidatePath('/events/[slug]', 'page');
  revalidatePath('/startup-events/[slug]', 'page');
}
