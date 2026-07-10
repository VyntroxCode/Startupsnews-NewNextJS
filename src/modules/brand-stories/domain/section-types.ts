export interface BrandStorySectionEntity {
  id: number;
  title: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface BrandStorySectionInput {
  title: string;
  sortOrder?: number;
  createdBy?: string;
  updatedBy?: string;
}
