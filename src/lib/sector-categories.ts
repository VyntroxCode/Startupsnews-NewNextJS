/**
 * Sector categories - Only these categories should be shown in admin panel dropdowns
 * These match the categories in the Sectors toggle panel (flyMenu) in config
 */
export const SECTOR_CATEGORY_SLUGS = [
  'tech',
  'business',
  'gaming',
  'ai-deeptech',
  'funding',
  'fintech',
  'social-media',
  'robotics',
  'healthtech',
  'ev-mobility',
  'ecommerce',
  'saas-enterprise',
  'consumer-d2c',
  'web3-blockchain',
  'cybersecurity',
  'climate-energy',
  // Also include cyber-security (existing DB slug) which maps to cybersecurity
  'cyber-security',
] as const;

/**
 * Filter categories to only include sector categories
 */
export function filterSectorCategories<T extends { slug: string }>(categories: T[]): T[] {
  return categories.filter(cat => 
    SECTOR_CATEGORY_SLUGS.includes(cat.slug as typeof SECTOR_CATEGORY_SLUGS[number])
  );
}
