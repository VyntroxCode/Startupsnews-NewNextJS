export interface ReportEntity {
  id: number;
  title: string;
  description: string;
  file_url: string;
  thumbnail_url: string | null;
  file_name: string | null;
  file_size: number | null;
  page_count: number | null;
  mime_type: string | null;
  is_active: number;
  publish_at: string | null;
  section_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ReportInput {
  title: string;
  description: string;
  fileUrl: string;
  thumbnailUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  pageCount?: number | null;
  mimeType?: string | null;
  isActive?: boolean;
  publishAt?: string | null;
  sectionId?: number | null;
}
