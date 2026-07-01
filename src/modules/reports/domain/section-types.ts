export interface ReportSectionEntity {
  id: number;
  title: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ReportSectionInput {
  title: string;
  sortOrder?: number;
}
