/**
 * Category domain types
 */

/**
 * Category entity (database representation)
 */
export interface CategoryEntity {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: number;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Category DTO (domain/API representation)
 */
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Category with children (for hierarchical display)
 */
export interface CategoryWithChildren extends Category {
  children?: Category[];
}

/**
 * DTOs for API
 */
export interface CreateCategoryDto {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: number;
  sortOrder?: number;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {
  id: number;
}

