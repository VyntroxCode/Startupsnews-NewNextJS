/**
 * Banner domain types
 */

export interface Banner {
  id?: string | number;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  linkText?: string;
  order: number;
  isActive: boolean;
  startDate?: Date | string;
  endDate?: Date | string;
  /** The banner links to an event that is over, so the site hides it whatever its own dates say. */
  linkedEventEnded?: boolean;
}

/**
 * Database entity
 */
export interface BannerEntity {
  id: number;
  title: string;
  description?: string;
  image_url: string;
  link_url?: string;
  link_text?: string;
  display_order: number;
  is_active: boolean | number; // MariaDB returns 0/1 as number, but we also support boolean
  start_date?: Date | string;
  end_date?: Date | string;
  /** Computed by BannersRepository.findAll (not a column) — absent on single-row reads. */
  linked_event_ended?: boolean | number | bigint;
  created_at: Date | string;
  updated_at: Date | string;
  created_by?: string;
  updated_by?: string;
}

/**
 * DTOs for API
 */
export interface CreateBannerDto {
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  linkText?: string;
  order: number;
  isActive: boolean;
  startDate?: Date | string;
  endDate?: Date | string;
  createdBy?: string;
  updatedBy?: string;
}

export interface UpdateBannerDto extends Partial<CreateBannerDto> {
  id: number;
}

