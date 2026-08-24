// Simplified from four bespoke categories to two — International always renders first on
// /our-partners, each split into two counter-scrolling marquee rows (see PartnerLogosMarquee).
export const PARTNER_LOGO_SECTIONS = [
  'International',
  'National',
] as const;
export type PartnerLogoSection = typeof PARTNER_LOGO_SECTIONS[number];

export interface PartnerLogoEntity {
  id: number;
  section: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface PartnerLogo {
  id: number;
  section: string;
  imageUrl: string;
  linkUrl: string | null;
  sortOrder: number;
}

export interface PartnerLogoInput {
  section: string;
  imageUrl: string;
  linkUrl?: string | null;
}

export interface InnerPageContentEntity {
  page_key: string;
  content_html: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface InnerPageContent {
  pageKey: string;
  contentHtml: string;
}

export function toPartnerLogo(e: PartnerLogoEntity): PartnerLogo {
  return { id: e.id, section: e.section, imageUrl: e.image_url, linkUrl: e.link_url, sortOrder: e.sort_order };
}

export function toInnerPageContent(e: InnerPageContentEntity | null, pageKey: string): InnerPageContent {
  return { pageKey, contentHtml: e?.content_html || '' };
}
