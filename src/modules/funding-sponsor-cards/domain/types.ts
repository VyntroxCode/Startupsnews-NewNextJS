/** Sponsor cards at the top of the reader Funding Dashboard, edited in Admin › User Management. */

export const MAX_SPONSOR_CARDS = 5;
export const MAX_ACTIVE_SPONSOR_CARDS = 3;
export const TITLE_MAX_WORDS = 5;
export const SUBTITLE_MAX_WORDS = 15;

export interface SponsorCard {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  linkUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** What a logged-in reader receives: no ids of inactive cards, no audit fields. */
export type ReaderSponsorCard = Pick<SponsorCard, 'id' | 'title' | 'subtitle' | 'imageUrl' | 'linkUrl'>;

export interface SponsorCardInput {
  title: string;
  subtitle: string;
  imageUrl: string | null;
  linkUrl: string;
  isActive: boolean;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** http(s) only: the link opens in a new tab and the image is loaded by every reader's browser. */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Shared by the admin form (before submit) and the API (always). Returns the cleaned input or the
 * first problem, worded for the admin. */
export function validateSponsorCardInput(body: unknown): { input: SponsorCardInput } | { error: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const title = String(b.title ?? '').trim().replace(/\s+/g, ' ');
  const subtitle = String(b.subtitle ?? '').trim().replace(/\s+/g, ' ');
  const imageUrl = String(b.imageUrl ?? '').trim();
  const linkUrl = String(b.linkUrl ?? '').trim();

  if (!title) return { error: 'Title is required.' };
  if (countWords(title) > TITLE_MAX_WORDS) return { error: `Title can be at most ${TITLE_MAX_WORDS} words.` };
  if (title.length > 150) return { error: 'Title is too long.' };
  if (countWords(subtitle) > SUBTITLE_MAX_WORDS) return { error: `Sub title can be at most ${SUBTITLE_MAX_WORDS} words.` };
  if (subtitle.length > 400) return { error: 'Sub title is too long.' };
  if (!linkUrl) return { error: 'Link is required.' };
  if (linkUrl.length > 1000 || !isHttpUrl(linkUrl)) return { error: 'Link must be a full web address starting with https:// or http://.' };
  if (imageUrl && (imageUrl.length > 1000 || !isHttpUrl(imageUrl))) return { error: 'Image must be an uploaded file or a web address starting with https:// or http://.' };

  return { input: { title, subtitle, imageUrl: imageUrl || null, linkUrl, isActive: b.isActive === true } };
}
