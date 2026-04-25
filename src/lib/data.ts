/**
 * Stub for seed script compatibility.
 * Real content comes from DB (WordPress migration / admin). Export empty arrays so seed runs.
 */

export const mockPosts: Array<{
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  categorySlug: string;
  date: string;
  image?: string;
  imageSmall?: string;
  format?: string;
  featured?: boolean;
  tags?: string[];
}> = [];

export const startupEvents: Array<{
  title: string;
  location: string;
  date: string;
  excerpt?: string;
  description?: string;
  image?: string;
  url?: string;
}> = [];
