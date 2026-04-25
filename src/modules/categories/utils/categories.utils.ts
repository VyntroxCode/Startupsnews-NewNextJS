import { CategoryEntity, Category } from '../domain/types';

/**
 * Convert CategoryEntity (database) to Category (domain/API)
 */
export function entityToCategory(entity: CategoryEntity): Category {
  return {
    id: entity.id,
    name: entity.name,
    slug: entity.slug,
    description: entity.description,
    imageUrl: entity.image_url,
    parentId: entity.parent_id || undefined,
    sortOrder: entity.sort_order,
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
  };
}

/**
 * Convert array of entities to categories
 */
export function entitiesToCategories(entities: CategoryEntity[]): Category[] {
  return entities.map(entityToCategory);
}

