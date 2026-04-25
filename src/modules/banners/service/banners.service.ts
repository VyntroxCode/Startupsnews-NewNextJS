import { BannersRepository } from '../repository/banners.repository';
import { BannerEntity, CreateBannerDto, UpdateBannerDto } from '../domain/types';
import { getCache, setCache, deleteCache } from '@/shared/cache/redis.client';

export class BannersService {
  constructor(private repository: BannersRepository) {}

  async getAllBanners(filters?: {
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<BannerEntity[]> {
    const cacheKey = `banners:all:${JSON.stringify(filters)}`;
    
    // Try cache first
    const cached = await getCache<BannerEntity[]>(cacheKey);
    if (cached) return cached;

    // Admin queries should not filter by date
    const banners = await this.repository.findAll({
      ...filters,
      filterByDate: false,
    });

    // Cache for 5 minutes
    await setCache(cacheKey, banners, 300);
    return banners;
  }

  /**
   * Get active banners for frontend display
   */
  async getActiveBanners(limit?: number): Promise<BannerEntity[]> {
    const cacheKey = `banners:active:${limit || 'all'}`;
    
    const cached = await getCache<BannerEntity[]>(cacheKey);
    if (cached) return cached;

    // Frontend queries should filter by date to show only currently active banners
    const banners = await this.repository.findAll({
      isActive: true,
      limit,
      filterByDate: true, // Apply date filtering for frontend
    });

    await setCache(cacheKey, banners, 300);
    return banners;
  }

  async countBanners(filters?: {
    isActive?: boolean;
  }): Promise<number> {
    return this.repository.count(filters);
  }

  async getBannerById(id: number): Promise<BannerEntity | null> {
    const cacheKey = `banner:id:${id}`;
    
    const cached = await getCache<BannerEntity>(cacheKey);
    if (cached) return cached;

    const entity = await this.repository.findById(id);
    if (entity) {
      await setCache(cacheKey, entity, 600); // Cache for 10 minutes
    }
    return entity;
  }

  /**
   * Create banner
   */
  async createBanner(data: CreateBannerDto): Promise<BannerEntity> {
    const entity = await this.repository.create({
      ...data,
      startDate: data.startDate ? (typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate) : undefined,
      endDate: data.endDate ? (typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate) : undefined,
    });
    
    // Invalidate cache
    await this.invalidateBannersCache();
    
    return entity;
  }

  /**
   * Update banner
   */
  async updateBanner(data: UpdateBannerDto): Promise<BannerEntity> {
    const { id, ...updateData } = data;
    
    const entity = await this.repository.update(id, {
      ...updateData,
      startDate: updateData.startDate ? (typeof updateData.startDate === 'string' ? new Date(updateData.startDate) : updateData.startDate) : undefined,
      endDate: updateData.endDate ? (typeof updateData.endDate === 'string' ? new Date(updateData.endDate) : updateData.endDate) : undefined,
    });
    
    // Invalidate cache
    await this.invalidateBannersCache();
    
    return entity;
  }

  /**
   * Delete banner
   */
  async deleteBanner(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    
    // Invalidate cache
    await this.invalidateBannersCache();
    
    return result;
  }

  /**
   * Invalidate all banner-related cache
   */
  private async invalidateBannersCache(): Promise<void> {
    // Delete all banner cache keys using pattern matching
    const { deleteCacheByPrefix } = await import('@/shared/cache/redis.client');
    await Promise.all([
      deleteCacheByPrefix('banners:all:'),
      deleteCacheByPrefix('banners:active:'),
      deleteCacheByPrefix('banner:id:'),
    ]);
  }
}

