import { PostsRepository } from '../repository/posts.repository';
import { PostEntity } from '../domain/types';
import { getCache, setCache, deleteCache, invalidatePostsListCache } from '@/shared/cache/redis.client';
import { CategoriesService } from '@/modules/categories/service/categories.service';

const UNSPLASH_PREFIX = 'https://images.unsplash.com/';

/** Post can be published only when it has body (content) and at least one real image (featured or <img> in content). No image or Unsplash placeholder => must stay draft. */
function canPublishPost(content: string | null | undefined, featuredImageUrl: string | null | undefined): boolean {
  const hasBody = typeof content === 'string' && content.trim().length > 0;
  const featuredUrl = typeof featuredImageUrl === 'string' ? featuredImageUrl.trim() : '';
  const hasFeatured = featuredUrl.length > 0 && !featuredUrl.startsWith(UNSPLASH_PREFIX);
  const hasImgInContent = hasBody && content!.includes('<img');
  return hasBody && (hasFeatured || hasImgInContent);
}

/** Allow posts with any real thumbnail: S3 or external (RSS). Exclude only empty and Unsplash placeholder so images show. */
function hasValidThumbnail(entity: PostEntity | Record<string, unknown>): boolean {
  const url =
    (entity as PostEntity).featured_image_url ??
    (entity as Record<string, unknown>)['featured_image_url'];
  if (url == null || typeof url !== 'string') return false;
  const s = String(url).trim();
  if (s === '') return false;
  if (s.startsWith(UNSPLASH_PREFIX)) return false;
  return true;
}

function filterValidThumbnails<T extends PostEntity | Record<string, unknown>>(entities: T[]): T[] {
  return entities.filter((e) => hasValidThumbnail(e));
}

export class PostsService {
  constructor(
    private repository: PostsRepository,
    private categoriesService?: CategoriesService
  ) { }

  /**
   * Get all posts with optional filters.
   * When forAdmin is true, returns all posts (no thumbnail restriction, no cache) for admin list.
   */
  async getAllPosts(filters?: {
    categorySlug?: string;
    status?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
    search?: string;
    source?: 'manual' | 'rss';
    orderByLatestDate?: boolean;
    forAdmin?: boolean;
  }): Promise<PostEntity[]> {
    const forAdmin = filters?.forAdmin === true;
    const cacheKey = forAdmin ? `posts:admin:${JSON.stringify(filters)}` : `posts:all:${JSON.stringify(filters)}`;

    if (!forAdmin) {
      const cached = await getCache<PostEntity[]>(cacheKey);
      if (cached) return cached;
    }

    // If category slug provided, need to resolve category ID
    let categoryId: number | undefined;
    if (filters?.categorySlug) {
      if (this.categoriesService) {
        const id = await this.categoriesService.getCategoryIdBySlug(filters.categorySlug);
        categoryId = id ?? undefined;
      } else {
        const { query } = await import('@/shared/database/connection');
        const category = await query<{ id: number }>('SELECT id FROM categories WHERE slug = ?', [filters.categorySlug]);
        categoryId = category[0]?.id;
      }
    }

    const posts = await this.repository.findAll({
      ...filters,
      categoryId,
      search: filters?.search,
      restrictThumbnail: !forAdmin,
    });

    if (forAdmin) {
      return posts;
    }
    await setCache(cacheKey, posts, 60);
    return posts;
  }

  /**
   * Get post by id (for admin validation).
   */
  async getPostById(id: number): Promise<PostEntity | null> {
    return this.repository.findById(id);
  }

  /**
   * Get post by slug
   */
  async getPostBySlug(slug: string): Promise<PostEntity | null> {
    const cacheKey = `post:slug:${slug}`;

    const cached = await getCache<PostEntity>(cacheKey);
    if (cached) return cached;

    const post = await this.repository.findBySlug(slug);
    if (post) {
      await setCache(cacheKey, post, 600); // Cache for 10 minutes
    }
    return post;
  }

  /**
   * Get original article URL for a post (from RSS feed item when applicable).
   */
  async getSourceLinkByPostId(postId: number): Promise<string | null> {
    return this.repository.getSourceLinkByPostId(postId);
  }

  /**
   * Get posts by category slug
   */
  async getPostsByCategory(categorySlug: string, limit: number = 10): Promise<PostEntity[]> {
    return this.repository.findByCategorySlug(categorySlug, limit);
  }

  /**
   * Get featured posts = latest from all categories (for "Latest News" section)
   */
  async getFeaturedPosts(limit: number = 5): Promise<PostEntity[]> {
    return this.repository.findLatest(limit);
  }

  /**
   * Get latest posts for listing without requiring S3 featured_image (for Latest News cards).
   * Caller should run entitiesToPosts then onlyPostsWithImage so thumbnails from content are included.
   */
  async getLatestPostsForListing(limit: number = 25): Promise<PostEntity[]> {
    return this.repository.findLatestForListing(limit);
  }

  /**
   * Get latest posts excluding given IDs (for "More News" after featured)
   */
  async getLatestPostsExcluding(limit: number, excludeIds: (number | string)[] = []): Promise<PostEntity[]> {
    const excludeNums = excludeIds.map((id) => (typeof id === 'string' ? parseInt(id, 10) : id)).filter((id) => !isNaN(id));
    return this.repository.findLatestExcluding(limit, excludeNums);
  }

  /**
   * Get latest post slugs excluding given IDs (optimized for infinite loader)
   */
  async getLatestPostSlugsExcluding(limit: number, excludeIds: (number | string)[] = []): Promise<string[]> {
    const excludeNums = excludeIds.map((id) => (typeof id === 'string' ? parseInt(id, 10) : id)).filter((id) => !isNaN(id));
    const result = await this.repository.findLatestSlugsExcluding(limit, excludeNums);
    return result.map((r) => r.slug);
  }

  /**
   * Get trending posts = next latest after featured (same as latest excluding featured IDs)
   */
  async getTrendingPosts(limit: number = 5, excludeIds: (number | string)[] = []): Promise<PostEntity[]> {
    return this.getLatestPostsExcluding(limit, excludeIds);
  }

  /**
   * Search posts
   */
  async searchPosts(queryText: string, limit: number = 20): Promise<PostEntity[]> {
    const capped = Math.min(Math.max(1, limit), 80);
    return this.repository.search(queryText, capped);
  }

  /**
   * Get related posts
   */
  async getRelatedPosts(
    excludeSlug: string,
    categorySlug: string,
    limit: number = 6
  ): Promise<PostEntity[]> {
    // First try same category
    const sameCategory = await this.repository.findByCategorySlug(categorySlug, limit * 2);
    const filtered = sameCategory.filter((p) => p.slug !== excludeSlug).slice(0, limit);

    if (filtered.length >= limit) {
      return filtered;
    }

    // Fill with other posts
    const allPosts = await this.repository.findAll({ status: 'published', limit: limit * 2 });
    const others = allPosts
      .filter((p) => p.slug !== excludeSlug && !filtered.find((f) => f.id === p.id))
      .slice(0, limit - filtered.length);

    return [...filtered, ...others];
  }

  /**
   * Get previous/next posts
   */
  async getPrevNextPosts(currentSlug: string): Promise<{ prev: PostEntity | null; next: PostEntity | null }> {
    return this.repository.findPrevNextBySlug(currentSlug);
  }

  /**
   * Increment view count
   */
  async incrementViewCount(slug: string): Promise<void> {
    const post = await this.repository.findBySlug(slug);
    if (post) {
      await this.repository.incrementViewCount(post.id);
      // Invalidate cache
      await deleteCache(`post:slug:${slug}`);
    }
  }

  /**
   * Create post
   */
  async createPost(data: {
    title: string;
    slug: string;
    excerpt: string;
    metaDescription?: string;
    content: string;
    categoryId: number;
    authorId: number;
    featuredImageUrl?: string;
    featuredImageSmallUrl?: string;
    format?: "standard" | "video" | "gallery";
    status?: "draft" | "published" | "archived";
    featured?: boolean;
  }): Promise<PostEntity> {
    // Check if slug exists
    const existingPost = await this.repository.findBySlug(data.slug);
    if (existingPost) {
      throw new Error(`Post with slug "${data.slug}" already exists`);
    }

    // Verify category exists
    if (this.categoriesService) {
      const category = await this.categoriesService.getCategoryById(data.categoryId);
      if (!category) {
        throw new Error(`Category with ID ${data.categoryId} not found`);
      }
    }

    // Do not publish if post has no body or no image; save as draft instead
    const createData = { ...data };
    if (createData.status === 'published' && !canPublishPost(createData.content, createData.featuredImageUrl)) {
      createData.status = 'draft';
    }

    const entity = await this.repository.create(createData);

    // Invalidate cache
    await this.invalidatePostCache();

    return entity;
  }

  /**
   * Update post
   */
  async updatePost(id: number, data: Partial<{
    title: string;
    slug: string;
    excerpt: string;
    metaDescription: string;
    content: string;
    categoryId: number;
    authorId: number;
    featuredImageUrl: string;
    featuredImageSmallUrl: string;
    format: "standard" | "video" | "gallery";
    status: "draft" | "published" | "archived";
    featured: boolean;
  }>): Promise<PostEntity> {
    const existingPost = await this.repository.findById(id);
    if (!existingPost) {
      throw new Error(`Post with ID ${id} not found`);
    }

    // If slug is being updated, check if it exists
    if (data.slug && data.slug !== existingPost.slug) {
      const slugExists = await this.repository.findBySlug(data.slug);
      if (slugExists) {
        throw new Error(`Post with slug "${data.slug}" already exists`);
      }
    }

    // If category is being updated, verify it exists
    if (data.categoryId && this.categoriesService) {
      const category = await this.categoriesService.getCategoryById(data.categoryId);
      if (!category) {
        throw new Error(`Category with ID ${data.categoryId} not found`);
      }
    }

    // Convert camelCase to snake_case for database
    const updateData: Partial<PostEntity> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
    if (data.metaDescription !== undefined) updateData.meta_description = data.metaDescription;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
    if (data.authorId !== undefined) updateData.author_id = data.authorId;
    if (data.featuredImageUrl !== undefined) updateData.featured_image_url = data.featuredImageUrl;
    if (data.featuredImageSmallUrl !== undefined) updateData.featured_image_small_url = data.featuredImageSmallUrl;
    if (data.format !== undefined) updateData.format = data.format;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.featured !== undefined) updateData.featured = data.featured;

    // Require image to publish; reject instead of forcing draft
    const effectiveContent = updateData.content !== undefined ? updateData.content : existingPost.content;
    const effectiveFeatured = updateData.featured_image_url !== undefined ? updateData.featured_image_url : existingPost.featured_image_url;
    const wantsPublish = data.status === 'published';
    if (wantsPublish && !canPublishPost(effectiveContent, effectiveFeatured)) {
      throw new Error('Featured image is required to publish. Add an image or save as draft.');
    }

    // Handle published_at based on status
    if (updateData.status === 'published' && existingPost.status !== 'published') {
      updateData.published_at = new Date();
    } else if (updateData.status && updateData.status !== 'published' && existingPost.published_at) {
      updateData.published_at = null as unknown as Date; // Allow null for unpublished posts
    }

    const entity = await this.repository.update(id, updateData);

    // Invalidate cache
    await this.invalidatePostCache();
    if (entity.slug) {
      await deleteCache(`post:slug:${entity.slug}`);
    }

    return entity;
  }

  /**
   * Delete post
   */
  async deletePost(id: number): Promise<void> {
    const post = await this.repository.findById(id);
    if (!post) {
      throw new Error(`Post with ID ${id} not found`);
    }

    await this.repository.delete(id);

    // Invalidate cache
    await this.invalidatePostCache();
    await deleteCache(`post:slug:${post.slug}`);
  }

  /**
   * Invalidate all post caches
   */
  private async invalidatePostCache(): Promise<void> {
    await invalidatePostsListCache();
  }
}

