import { CategoriesRepository } from '../repository/categories.repository';
import { CategoryEntity, Category, CategoryWithChildren } from '../domain/types';
import { getCache, setCache, deleteCache, deleteCacheByPrefix } from '@/shared/cache/redis.client';
import { entityToCategory } from '../utils/categories.utils';

export class CategoriesService {
  constructor(private repository: CategoriesRepository) {}

  /**
   * Get all categories
   */
  async getAllCategories(filters?: {
    parentId?: number | null;
    includeChildren?: boolean;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<Category[]> {
    const cacheKey = `categories:all:${JSON.stringify(filters)}`;
    
    // Try cache first
    const cached = await getCache<Category[]>(cacheKey);
    if (cached) return cached;

    const entities = await this.repository.findAll(filters);
    const categories = entities.map(entityToCategory);

    // Cache for 10 minutes
    await setCache(cacheKey, categories, 600);
    return categories;
  }

  /**
   * Count categories with optional filters
   */
  async countCategories(filters?: {
    parentId?: number | null;
    search?: string;
  }): Promise<number> {
    return this.repository.count(filters);
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: number): Promise<Category | null> {
    const cacheKey = `category:id:${id}`;
    
    const cached = await getCache<Category>(cacheKey);
    if (cached) return cached;

    const entity = await this.repository.findById(id);
    if (!entity) return null;

    const category = entityToCategory(entity);
    await setCache(cacheKey, category, 600); // Cache for 10 minutes
    return category;
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const cacheKey = `category:slug:${slug}`;
    
    const cached = await getCache<Category>(cacheKey);
    if (cached) return cached;

    const entity = await this.repository.findBySlug(slug);
    if (!entity) return null;

    const category = entityToCategory(entity);
    await setCache(cacheKey, category, 600); // Cache for 10 minutes
    return category;
  }

  /**
   * Get category ID by slug (for internal use)
   */
  async getCategoryIdBySlug(slug: string): Promise<number | null> {
    const entity = await this.repository.findBySlug(slug);
    return entity?.id || null;
  }

  /**
   * Get categories with children (hierarchical)
   */
  async getCategoriesWithChildren(): Promise<CategoryWithChildren[]> {
    const cacheKey = 'categories:with-children';
    
    const cached = await getCache<CategoryWithChildren[]>(cacheKey);
    if (cached) return cached;

    const rootCategories = await this.repository.findRootCategories();
    const categoriesWithChildren: CategoryWithChildren[] = [];

    for (const rootEntity of rootCategories) {
      const root = entityToCategory(rootEntity) as CategoryWithChildren;
      const children = await this.repository.findByParentId(root.id);
      root.children = children.map(entityToCategory);
      categoriesWithChildren.push(root);
    }

    // Cache for 10 minutes
    await setCache(cacheKey, categoriesWithChildren, 600);
    return categoriesWithChildren;
  }

  /**
   * Get root categories
   */
  async getRootCategories(): Promise<Category[]> {
    const entities = await this.repository.findRootCategories();
    return entities.map(entityToCategory);
  }

  /**
   * Get child categories
   */
  async getChildCategories(parentId: number): Promise<Category[]> {
    const entities = await this.repository.findByParentId(parentId);
    return entities.map(entityToCategory);
  }

  /**
   * Create category
   */
  async createCategory(data: {
    name: string;
    slug: string;
    description?: string;
    imageUrl?: string;
    parentId?: number;
    sortOrder?: number;
  }): Promise<Category> {
    // Check if slug exists
    const slugExists = await this.repository.slugExists(data.slug);
    if (slugExists) {
      throw new Error(`Category with slug "${data.slug}" already exists`);
    }

    const entity = await this.repository.create(data);
    
    // Invalidate cache
    await this.invalidateCache();
    
    return entityToCategory(entity);
  }

  /**
   * Update category
   */
  async updateCategory(id: number, data: Partial<CategoryEntity>): Promise<Category> {
    // If slug is being updated, check if it exists
    if (data.slug) {
      const slugExists = await this.repository.slugExists(data.slug, id);
      if (slugExists) {
        throw new Error(`Category with slug "${data.slug}" already exists`);
      }
    }

    const entity = await this.repository.update(id, data);
    
    // Invalidate cache
    await this.invalidateCache();
    
    return entityToCategory(entity);
  }

  /**
   * Delete category
   */
  async deleteCategory(id: number): Promise<void> {
    await this.repository.delete(id);
    
    // Invalidate cache
    await this.invalidateCache();
  }

  /**
   * Invalidate all category caches
   */
  private async invalidateCache(): Promise<void> {
    await Promise.all([
      deleteCacheByPrefix('categories:all:'),
      deleteCacheByPrefix('category:id:'),
      deleteCacheByPrefix('category:slug:'),
      deleteCache('categories:with-children'),
    ]);
  }
}

