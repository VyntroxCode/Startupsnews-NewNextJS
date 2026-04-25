/**
 * Data Adapter Layer
 * 
 * This adapter provides data access functions that use the database.
 * All static/mock data has been removed - database is now required.
 */

import { PostsService } from '@/modules/posts/service/posts.service';
import { PostsRepository } from '@/modules/posts/repository/posts.repository';
import { RssFeedsRepository } from '@/modules/rss-feeds/repository/rss-feeds.repository';
import { EventsService } from '@/modules/events/service/events.service';
import { EventsRepository } from '@/modules/events/repository/events.repository';
import { CategoriesService } from '@/modules/categories/service/categories.service';
import { CategoriesRepository } from '@/modules/categories/repository/categories.repository';
import { UsersRepository } from '@/modules/users/repository/users.repository';
import { entityToPost, entitiesToPosts } from '@/modules/posts/utils/posts.utils';
import { entityToEvent } from '@/modules/events/utils/events.utils';
import type { StartupEvent } from '@/modules/events/domain/types';
import { slugify } from '@/shared/utils/string.utils';

// Post interface (backward compatible)
export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  metaDescription?: string;
  content: string;
  category: string;
  categorySlug: string;
  date: string;
  timeAgo: string;
  /** ISO date string for sorting (latest first) */
  publishedAt?: string;
  image: string;
  imageSmall?: string;
  format?: "standard" | "video" | "gallery";
  featured?: boolean;
  tags?: string[];
  /** Original article URL (e.g. from RSS); shown on single post page as source link */
  sourceUrl?: string;
  /** RSS source attribution (only for posts from RSS): feed name, logo, original author */
  sourceName?: string;
  sourceLogoUrl?: string | null;
  sourceAuthor?: string | null;
  /** Unified author info used for author page/linking */
  authorName?: string;
  authorSlug?: string;
  authorType?: 'staff' | 'source';
  authorId?: number;
  authorAvatarUrl?: string | null;
}

// Initialize services
const categoriesRepository = new CategoriesRepository();
const categoriesService = new CategoriesService(categoriesRepository);
const postsRepository = new PostsRepository();
const postsService = new PostsService(postsRepository, categoriesService);
const rssFeedsRepository = new RssFeedsRepository();
const usersRepository = new UsersRepository();
const eventsRepository = new EventsRepository();
const eventsService = new EventsService(eventsRepository);

import { EVENTS_REGION_ORDER, normalizeEventLocation } from './events-constants';
export { EVENTS_REGION_ORDER };

// Default event image
const DEFAULT_EVENT_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80";

export function getEventImage(event: StartupEvent): string {
  return event.image || DEFAULT_EVENT_IMAGE;
}

/** Placeholder when a post has no featured/image-in-content URL so cards always show a thumbnail. */
export const DEFAULT_POST_IMAGE =
  '/images/banner-fallback.svg';

/** No fallback to small image; only the big (featured) image is used site-wide. Returns placeholder when empty so thumbnails always display. */
export function getPostImage(post: Post): string {
  const url = (post.image || '').trim();
  return url || DEFAULT_POST_IMAGE;
}

import { hasThumbnail as hasThumbnailCheck } from '@/lib/post-utils';

/** True only when post has a displayable thumbnail (single source of truth). Re-exported for server use. */
export const hasThumbnail = (post: Post): boolean => hasThumbnailCheck(post);

/** Strip heavy article body for list/card contexts to reduce HTML/RSC payload size. */
function toListPost(post: Post): Post {
  if (!post.content) return post;
  return { ...post, content: '' };
}

function toListPosts(posts: Post[]): Post[] {
  return posts.map(toListPost);
}

/** Only posts that have a displayable image (avoids black box / blank posts). */
export function onlyPostsWithImage(posts: Post[]): Post[] {
  return posts.filter(hasThumbnail);
}

/**
 * Home widget sections: category slug → default heading.
 * Section headings are resolved from DB (category name) when the category exists; otherwise this fallback is used.
 * Change a slug here to point that section at a different news category.
 */
/** Only these 7 categories appear as home page widget sections, in this order. */
export const HOME_WIDGET_CATEGORY_MAP: Record<string, string> = {
  'ai-deeptech': 'AI & Deeptech',
  'ev-mobility': 'EV & Mobility',
  'social-media': 'Social Media',
  'ecommerce': 'eCommerce',
  'gaming': 'Gaming',
  'web3-blockchain': 'Web3 & Blockchain',
  'fintech': 'Fintech',
};

/**
 * Display name for a category by slug (from DB). Use for home widget section headings
 * so they match the news category. Returns fallback if category not found.
 */
export async function getCategoryDisplayName(slug: string, fallback: string): Promise<string> {
  const cat = await categoriesService.getCategoryBySlug(slug);
  return (cat?.name?.trim()) || fallback;
}

/** Sort posts latest first (by publishedAt, then id) for section display */
function sortByLatest(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    const at = a.publishedAt || '';
    const bt = b.publishedAt || '';
    if (at !== bt) return bt.localeCompare(at);
    return parseInt(b.id, 10) - parseInt(a.id, 10);
  });
}

/**
 * Posts Functions - Database Only
 */

import { getCache, setCache } from '@/shared/cache/redis.client';

const SEARCH_PAGE_LIMIT = 60;

/** Search results for the public search page (capped + Redis-cached). */
export async function getSearchPagePosts(query: string): Promise<Post[]> {
  const q = query.trim().replace(/^"+|"+$/g, '');
  if (!q) return [];
  const cacheKey = `search:posts:${q.toLowerCase().slice(0, 160)}`;
  const cached = await getCache<Post[]>(cacheKey);
  if (cached) return cached;
  try {
    const entities = await postsService.searchPosts(q, SEARCH_PAGE_LIMIT);
    const posts = toListPosts(onlyPostsWithImage(await entitiesToPosts(entities)));
    await setCache(cacheKey, posts, 90);
    return posts;
  } catch (error) {
    console.error('Error in getSearchPagePosts:', error);
    return [];
  }
}

/**
 * Posts Functions - Database Only
 */
export async function getFeaturedPosts(): Promise<Post[]> {
  const cacheKey = 'posts:all:featured:limit:5';
  const cached = await getCache<Post[]>(cacheKey);
  if (cached) return cached;

  try {
    const entities = await postsService.getFeaturedPosts(10);
    const posts = toListPosts(onlyPostsWithImage(await entitiesToPosts(entities)).slice(0, 5));
    await setCache(cacheKey, posts, 300); // 5 min cache
    return posts;
  } catch (error) {
    console.error('Error fetching featured posts:', error);
    throw new Error('Failed to fetch featured posts from database');
  }
}

export async function getFeat1LeftPosts(): Promise<{ main: Post; sub: [Post, Post] }> {
  const cacheKey = 'posts:all:feat1:left';
  const cached = await getCache<{ main: Post; sub: [Post, Post] }>(cacheKey);
  if (cached) return cached;

  try {
    const entities = await postsService.getFeaturedPosts(10);
    const posts = toListPosts(onlyPostsWithImage(await entitiesToPosts(entities)));
    if (posts.length < 3) {
      throw new Error('Not enough featured posts with images in database (need at least 3)');
    }
    const result = { main: posts[0], sub: [posts[1], posts[2]] as [Post, Post] };
    await setCache(cacheKey, result, 300);
    return result;
  } catch (error) {
    console.error('Error fetching feat1 left posts:', error);
    throw error;
  }
}

export async function getTrendingPosts(): Promise<Post[]> {
  const cacheKey = 'posts:all:trending:limit:5';
  const cached = await getCache<Post[]>(cacheKey);
  if (cached) return cached;

  try {
    const featured = await postsService.getFeaturedPosts(3);
    const excludeIds = featured.map((p) => p.id.toString());
    const entities = await postsService.getTrendingPosts(10, excludeIds);
    const posts = toListPosts(onlyPostsWithImage(await entitiesToPosts(entities)).slice(0, 5));
    await setCache(cacheKey, posts, 300);
    return posts;
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    throw new Error('Failed to fetch trending posts from database');
  }
}

export async function getFeat1ListPosts(excludeIds: string[] = []): Promise<Post[]> {
  // Caching with excludeIds is tricky, skipping for now or using short TTL if ids are stable?
  // Using short TTL of 1 min to avoid staleness with excludes
  const cacheKey = `posts:all:feat1:list:${excludeIds.sort().join(',')}`;
  const cached = await getCache<Post[]>(cacheKey);
  if (cached) return cached;

  try {
    const excludeNums = excludeIds.map((id) => parseInt(id)).filter((id) => !isNaN(id));
    const entities = await postsService.getAllPosts({
      status: 'published',
      limit: 30,
    });
    const filtered = entities.filter((e) => !excludeNums.includes(e.id));
    const posts = toListPosts(onlyPostsWithImage(await entitiesToPosts(filtered)).slice(0, 13));
    await setCache(cacheKey, posts, 60);
    return posts;
  } catch (error) {
    console.error('Error fetching feat1 list posts:', error);
    throw new Error('Failed to fetch feat1 list posts from database');
  }
}

const MORE_NEWS_LIMIT = 200;

/** Latest News listing: includes posts with image from content (not only S3 featured_image) so thumbnails show. */
export async function getLatestNewsPosts(limit = 25): Promise<Post[]> {
  const cacheKey = `posts:all:latest:limit:${limit}`;
  const cached = await getCache<Post[]>(cacheKey);
  if (cached) return cached;

  try {
    const entities = await postsService.getLatestPostsForListing(limit);
    const posts = toListPosts(onlyPostsWithImage(await entitiesToPosts(entities)));
    await setCache(cacheKey, posts, 120); // 2 min
    return posts;
  } catch (error) {
    console.error('Error fetching latest news for listing:', error);
    return [];
  }
}

export async function getMoreNewsPosts(excludeIds: string[] = [], limit = MORE_NEWS_LIMIT): Promise<Post[]> {
  // Sort excludeIds to ensure consistent cache key
  const cacheKey = `posts:all:more:${limit}:${excludeIds.sort().join(',')}`;
  const cached = await getCache<Post[]>(cacheKey);
  if (cached) return cached;

  try {
    const entities = await postsService.getLatestPostsExcluding(limit, excludeIds);
    const posts = toListPosts(onlyPostsWithImage(await entitiesToPosts(entities)));
    await setCache(cacheKey, posts, 120);
    return posts;
  } catch (error) {
    console.error('Error fetching more news posts:', error);
    throw new Error('Failed to fetch more news posts from database');
  }
}

export async function getMoreNewsSlugs(excludeIds: string[] = []): Promise<string[]> {
  const cacheKey = `posts:all:more_slugs:${excludeIds.sort().join(',')}`;
  const cached = await getCache<string[]>(cacheKey);
  if (cached) return cached;

  try {
    const slugs = await postsService.getLatestPostSlugsExcluding(MORE_NEWS_LIMIT, excludeIds);
    await setCache(cacheKey, slugs, 120);
    return slugs;
  } catch (error) {
    console.error('Error fetching more news slugs:', error);
    return [];
  }
}

export async function getPostsByCategory(categorySlug: string, limit = 10): Promise<Post[]> {
  const cacheKey = `posts:category:${categorySlug}:${limit}`;
  const cached = await getCache<Post[]>(cacheKey);
  if (cached) return cached;

  try {
    const entities = await postsService.getPostsByCategory(categorySlug, limit * 2);
    const posts = toListPosts(onlyPostsWithImage(await entitiesToPosts(entities)).slice(0, limit));
    await setCache(cacheKey, posts, 300); // 5 min
    return posts;
  } catch (error) {
    console.error('Error fetching posts by category:', error);
    throw new Error(`Failed to fetch posts for category ${categorySlug} from database`);
  }
}


export async function getCategorySectionPosts(categorySlug: string): Promise<{
  featured: Post | null;
  right: [Post | null, Post | null];
  list: Post[];
}> {
  const cacheKey = `posts:all:category_section:${categorySlug}`;
  const cached = await getCache<{
    featured: Post | null;
    right: [Post | null, Post | null];
    list: Post[];
  }>(cacheKey);
  if (cached) return cached;

  try {
    // First, verify the category exists
    const category = await categoriesService.getCategoryBySlug(categorySlug);
    if (!category) {
      // Category doesn't exist - return empty section
      console.warn(`Category "${categorySlug}" not found in database`);
      const emptyResult = {
        featured: null,
        right: [null, null] as [Post | null, Post | null],
        list: [],
      };
      await setCache(cacheKey, emptyResult, 300);
      return emptyResult;
    }

    // Fetch more posts from the category to ensure we have enough after image filtering
    // Request 20 posts to account for posts that might not have images
    const posts = await getPostsByCategory(categorySlug, 20);
    const withImage = onlyPostsWithImage(posts);
    
    // Only use posts from the requested category - no fallback to other categories
    let featured: Post | null = withImage[0] || null;
    const rightPosts: Post[] = [];
    if (withImage[1]) rightPosts.push(withImage[1]);
    if (withImage[2]) rightPosts.push(withImage[2]);
    
    // Ensure right array has exactly 2 elements (use null if not enough posts)
    const rightArray: [Post | null, Post | null] = [
      rightPosts[0] || null,
      rightPosts[1] || null,
    ];
    
    let list = withImage.slice(3, 9);

    const result = {
      featured,
      right: rightArray,
      list: sortByLatest(list).filter(hasThumbnail),
    };
    await setCache(cacheKey, result, 300);
    return result;
  } catch (error) {
    console.error(`Error fetching category section posts for "${categorySlug}":`, error);
    // Return empty result instead of throwing to prevent page crashes
    const emptyResult = {
      featured: null,
      right: [null, null] as [Post | null, Post | null],
      list: [],
    };
    await setCache(cacheKey, emptyResult, 60); // Short cache for errors
    return emptyResult;
  }
}

export async function getDarkSectionPosts(categorySlug: string): Promise<{
  featured: Post | null;
  list: Post[];
}> {
  const cacheKey = `posts:all:dark_section:${categorySlug}`;
  const cached = await getCache<{ featured: Post | null; list: Post[] }>(cacheKey);
  if (cached) return cached;

  try {
    // First, verify the category exists
    const category = await categoriesService.getCategoryBySlug(categorySlug);
    if (!category) {
      // Category doesn't exist - return empty section
      console.warn(`Category "${categorySlug}" not found in database`);
      const emptyResult = { featured: null, list: [] };
      await setCache(cacheKey, emptyResult, 300);
      return emptyResult;
    }

    // Fetch more posts from the category to ensure we have enough after image filtering
    const posts = await getPostsByCategory(categorySlug, 10);
    const withImage = onlyPostsWithImage(posts);
    
    // Only use posts from the requested category - no fallback to other categories
    let featured: Post | null = withImage[0] || null;
    let list = withImage.slice(1, 5);

    const result = { featured, list: sortByLatest(list).filter(hasThumbnail) };
    await setCache(cacheKey, result, 300);
    return result;
  } catch (error) {
    console.error(`Error fetching dark section posts for "${categorySlug}":`, error);
    // Return empty result instead of throwing to prevent page crashes
    const emptyResult = { featured: null, list: [] };
    await setCache(cacheKey, emptyResult, 60); // Short cache for errors
    return emptyResult;
  }
}

export async function getFeat1SectionPosts(categorySlug: string): Promise<{
  top: [Post | null, Post | null];
  bottom: [Post | null, Post | null, Post | null, Post | null];
}> {
  const cacheKey = `posts:all:feat1_section:${categorySlug}`;
  const cached = await getCache<{ top: [Post | null, Post | null]; bottom: [Post | null, Post | null, Post | null, Post | null] }>(cacheKey);
  if (cached) return cached;

  try {
    // First, verify the category exists
    const category = await categoriesService.getCategoryBySlug(categorySlug);
    if (!category) {
      // Category doesn't exist - return empty section
      console.warn(`Category "${categorySlug}" not found in database`);
      const emptyResult = {
        top: [null, null] as [Post | null, Post | null],
        bottom: [null, null, null, null] as [Post | null, Post | null, Post | null, Post | null],
      };
      await setCache(cacheKey, emptyResult, 300);
      return emptyResult;
    }

    // Fetch more posts from the category to ensure we have enough after image filtering
    const posts = await getPostsByCategory(categorySlug, 12);
    const withImage = onlyPostsWithImage(posts);
    
    // Only use posts from the requested category - no fallback to other categories
    const top: [Post | null, Post | null] = [
      withImage[0] || null,
      withImage[1] || null,
    ];
    
    const bottom: [Post | null, Post | null, Post | null, Post | null] = [
      withImage[2] || null,
      withImage[3] || null,
      withImage[4] || null,
      withImage[5] || null,
    ];

    const result = {
      top,
      bottom,
    };
    await setCache(cacheKey, result, 300);
    return result;
  } catch (error) {
    console.error(`Error fetching feat1 section posts for "${categorySlug}":`, error);
    // Return empty result instead of throwing to prevent page crashes
    const emptyResult = {
      top: [null, null] as [Post | null, Post | null],
      bottom: [null, null, null, null] as [Post | null, Post | null, Post | null, Post | null],
    };
    await setCache(cacheKey, emptyResult, 60); // Short cache for errors
    return emptyResult;
  }
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  try {
    const entity = await postsService.getPostBySlug(slug);
    if (!entity) return undefined;
    if (Boolean(entity.is_gone_410)) return undefined;
    const post = await entityToPost(entity);
    const postId = Number(entity.id);

    const sourceUrl = await postsService.getSourceLinkByPostId(postId);
    if (sourceUrl) post.sourceUrl = sourceUrl;

    let authorName = 'Zox News Staff';
    let authorType: 'staff' | 'source' = 'staff';
    let authorId: number | undefined;
    let authorAvatarUrl: string | null | undefined;

    try {
      const rssSource = await rssFeedsRepository.getRssSourceByPostId(postId);
      if (rssSource && rssSource.sourceName !== 'StartupNews Direct Import') {
        post.sourceName = rssSource.sourceName;
        post.sourceLogoUrl = rssSource.sourceLogoUrl ?? undefined;
        post.sourceAuthor = rssSource.sourceAuthor ?? undefined;

        const sourceDisplayName = (rssSource.sourceAuthor || rssSource.sourceName || '').trim();
        if (sourceDisplayName) {
          authorName = sourceDisplayName;
          authorType = 'source';
        }
      }
    } catch (rssErr) {
      // RSS source columns (logo_url, author) may not exist if migration not run; skip source attribution
      if (process.env.NODE_ENV === 'development') {
        console.warn('getRssSourceByPostId failed (run add-rss-source-author-logo migration?):', rssErr);
      }
    }

    // For manually authored posts, use the internal user name/avatar.
    if (authorType === 'staff') {
      const user = await usersRepository.findById(entity.author_id);
      if (user?.name?.trim()) {
        authorName = user.name.trim();
        authorId = user.id;
        authorAvatarUrl = user.avatar_url ?? null;
      }
    }

    post.authorName = authorName;
    post.authorSlug = slugify(authorName);
    post.authorType = authorType;
    post.authorId = authorId;
    post.authorAvatarUrl = authorAvatarUrl ?? null;

    return post;
  } catch (error) {
    console.error('Error fetching post by slug:', error);
    throw new Error(`Failed to fetch post ${slug} from database`);
  }
}

export interface AuthorPostsPageData {
  name: string;
  slug: string;
  type: 'staff' | 'source';
  avatarUrl?: string | null;
  description?: string | null;
  posts: Post[];
}

/**
 * Resolve author page data from query-backed identifiers attached to byline links.
 */
export async function getAuthorPostsPageData(params: {
  slug: string;
  type?: string;
  id?: string;
  name?: string;
  limit?: number;
}): Promise<AuthorPostsPageData | null> {
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);

  try {
    if (params.type === 'staff' && params.id) {
      const authorId = Number(params.id);
      if (!Number.isFinite(authorId)) return null;

      const [user, entities] = await Promise.all([
        usersRepository.findById(authorId),
        postsRepository.findLatestByAuthorId(authorId, limit),
      ]);

      if (!user?.name?.trim()) return null;
      const posts = toListPosts(onlyPostsWithImage(await entitiesToPosts(entities)));

      return {
        name: user.name.trim(),
        slug: slugify(user.name),
        type: 'staff',
        avatarUrl: user.avatar_url ?? null,
        description: user.author_description ?? null,
        posts,
      };
    }

    if (params.type === 'source' && params.name) {
      const sourceName = params.name.trim();
      if (!sourceName) return null;

      const entitiesByAuthor = await postsRepository.findLatestByRssAuthor(sourceName, limit);
      const entities = entitiesByAuthor.length > 0
        ? entitiesByAuthor
        : await postsRepository.findLatestByRssSourceName(sourceName, limit);

      const posts = toListPosts(onlyPostsWithImage(await entitiesToPosts(entities)));

      return {
        name: sourceName,
        slug: slugify(sourceName),
        type: 'source',
        posts,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching author posts page data:', error);
    return null;
  }
}

export async function getAllPosts(limit = 200): Promise<Post[]> {
  try {
    const entities = await postsService.getAllPosts({ status: 'published', limit });
    return toListPosts(onlyPostsWithImage(await entitiesToPosts(entities)));
  } catch (error) {
    console.error('Error fetching all posts:', error);
    throw new Error('Failed to fetch posts from database');
  }
}

export async function getRelatedPosts(
  excludeSlug: string,
  categorySlug: string,
  limit = 6
): Promise<Post[]> {
  const cacheKey = `posts:related:${excludeSlug}:${categorySlug}:${limit}`;
  const cached = await getCache<Post[]>(cacheKey);
  if (cached) return cached;

  try {
    const entities = await postsService.getRelatedPosts(excludeSlug, categorySlug, limit * 2);
    const posts = toListPosts(
      onlyPostsWithImage(await entitiesToPosts(entities)).filter((p) => p.slug !== excludeSlug).slice(0, limit)
    );
    await setCache(cacheKey, posts, 300); // 5 min
    return posts;
  } catch (error) {
    console.error('Error fetching related posts:', error);
    throw new Error('Failed to fetch related posts from database');
  }
}

export async function getPrevNextPosts(currentSlug: string): Promise<{
  prev: Post | null;
  next: Post | null;
}> {
  const cacheKey = `posts:prevnext:${currentSlug}`;
  const cached = await getCache<{ prev: Post | null; next: Post | null }>(cacheKey);
  if (cached) return cached;

  try {
    const { prev, next } = await postsService.getPrevNextPosts(currentSlug);
    const prevPost = prev ? await entityToPost(prev) : null;
    const nextPost = next ? await entityToPost(next) : null;
    const result = {
      prev: prevPost && hasThumbnail(prevPost) ? toListPost(prevPost) : null,
      next: nextPost && hasThumbnail(nextPost) ? toListPost(nextPost) : null,
    };
    await setCache(cacheKey, result, 300); // 5 min
    return result;
  } catch (error) {
    console.error('Error fetching prev/next posts:', error);
    throw new Error('Failed to fetch prev/next posts from database');
  }
}

export async function getVideoPosts(limit = 10): Promise<Post[]> {
  try {
    const entities = await postsService.getAllPosts({
      status: 'published',
      limit: limit * 3,
    });
    const videoEntities = entities.filter((e) => e.format === 'video');
    return toListPosts(onlyPostsWithImage(await entitiesToPosts(videoEntities)).slice(0, limit));
  } catch (error) {
    console.error('Error fetching video posts:', error);
    throw new Error('Failed to fetch video posts from database');
  }
}

/**
 * Events by region from database only (no fallback).
 * Uses public upcoming query (event_date >= today, status upcoming/ongoing) so sidebar and /events match admin-visible events.
 * Groups by normalized location so DB variants (e.g. "Bangalore") still show under "Bengaluru".
 */
export async function getEventsByRegion(): Promise<Record<string, StartupEvent[]>> {
  const cacheKey = 'events:by-region:upcoming';
  const cached = await getCache<Record<string, StartupEvent[]>>(cacheKey);
  if (cached) return cached;

  try {
    const entities = await eventsService.getUpcomingForPublic();

    const eventsByRegion: Record<string, StartupEvent[]> = {};
    for (const region of EVENTS_REGION_ORDER) {
      eventsByRegion[region] = [];
    }
    for (const e of entities) {
      const region = normalizeEventLocation(e.location);
      if (!eventsByRegion[region]) eventsByRegion[region] = [];
      eventsByRegion[region].push(entityToEvent(e));
    }
    await setCache(cacheKey, eventsByRegion, 300);
    return eventsByRegion;
  } catch (error) {
    console.error('Error fetching events by region:', error);
    const empty = Object.fromEntries(EVENTS_REGION_ORDER.map((r) => [r, []]));
    await setCache(cacheKey, empty, 60);
    return empty;
  }
}

/**
 * Get all startup events for public (sidebar, etc.) from database only.
 * Uses same public upcoming query as /events page (event_date >= today, status upcoming/ongoing).
 */
export async function getStartupEvents(): Promise<StartupEvent[]> {
  const cacheKey = 'events:startup:public:list';
  const cached = await getCache<StartupEvent[]>(cacheKey);
  if (cached) return cached;

  try {
    const entities = await eventsService.getUpcomingForPublic();
    const events = entities.map((e) => entityToEvent(e));
    await setCache(cacheKey, events, 120);
    return events;
  } catch (error) {
    console.error('Error fetching startup events:', error);
    return [];
  }
}

/**
 * Get a single startup event by slug (for inner event detail page).
 * Returns null if not found.
 */
export async function getEventBySlug(slug: string): Promise<StartupEvent | null> {
  try {
    const entity = await eventsService.getEventBySlug(slug);
    if (!entity) return null;
    return entityToEvent(entity);
  } catch (error) {
    console.error('Error fetching event by slug:', error);
    return null;
  }
}

// Re-export types for backward compatibility
export type { StartupEvent } from '@/modules/events/domain/types';
