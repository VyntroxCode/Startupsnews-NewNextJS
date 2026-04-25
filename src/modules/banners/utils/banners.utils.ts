import { BannerEntity, Banner } from '../domain/types';

/**
 * Convert database entity to domain model
 */
export function entityToBanner(entity: BannerEntity): Banner {
  return {
    id: entity.id,
    title: entity.title,
    description: entity.description || undefined,
    imageUrl: entity.image_url,
    linkUrl: entity.link_url || undefined,
    linkText: entity.link_text || undefined,
    order: entity.display_order,
    isActive: Boolean(entity.is_active === 1 || entity.is_active === true),
    startDate: entity.start_date || undefined,
    endDate: entity.end_date || undefined,
  };
}

export function entitiesToBanners(entities: BannerEntity[]): Banner[] {
  return entities.map(entityToBanner);
}

