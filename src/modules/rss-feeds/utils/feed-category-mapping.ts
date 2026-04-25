/**
 * Maps RSS feed name/URL to category slug.
 * Used by: scripts (batch update), admin (suggest category on create/edit).
 * Covers all frontend/site categories so no category is left without a mapping path.
 */

/** Category slugs that exist in the app (HOME_WIDGET + common DB slugs). */
export const CATEGORY_SLUGS = [
  'ai-deeptech',
  'gaming',
  'fintech',
  'social-media',
  'robotics',
  'healthtech',
  'ev-mobility',
  'ecommerce',
  'agritech',
  'web-3',
  'cyber-security',
  'space-tech',
  'foodtech',
  'edtech',
  'world',
  'funding',
  'technology',
  'news',
  'startups',
] as const;

/** Default slug when no pattern matches (e.g. general tech). */
export const DEFAULT_CATEGORY_SLUG = 'ai-deeptech';

/**
 * Map feed name and URL to a category slug.
 * Order matters: more specific patterns first.
 */
export function mapFeedToCategorySlug(feedName: string, feedUrl: string): string {
  const name = feedName.toLowerCase();
  const url = feedUrl.toLowerCase();

  // Web 3 / Blockchain / Crypto
  if (
    name.includes('blockchain') || name.includes('crypto') || name.includes('cryptocurrency') ||
    url.includes('/crypto/') || url.includes('/blockchain/') || url.includes('/cryptocurrency/') ||
    name.includes('tech in asia – blockchain') || name.includes('gadget360 - blockchain')
  ) {
    return 'web-3';
  }

  // Artificial Intelligence / AI
  if (
    name.includes('artificial intelligence') || name.includes('artificial-intelligence') ||
    name.includes(' ai ') || name.endsWith(' ai') || name.startsWith('ai ') ||
    url.includes('/artificial-intelligence/') || url.includes('/ai/') ||
    name.includes('techcrunch - ai') || name.includes('telecomtalk - artificialintelligence') ||
    name.includes('indiatimes (et) - artificialintelligence') || name.includes('gadget360 – ai') ||
    name.includes('nytimes') && url.includes('/technology/')
  ) {
    return 'artificial-intelligence';
  }

  // Fintech / Funding
  if (
    name.includes('fintech') || name.includes('fin tech') || name.includes('finance') ||
    name.includes('funding') || url.includes('/funding/') || url.includes('/fintech/') || url.includes('/finance/') ||
    name.includes('techcrunch – fintech') || name.includes('startupstorymedia – fintech') ||
    name.includes('indiatimes (et) - fintech') || name.includes('inc42 - fintech') ||
    name.includes('pnn - finance') || name.includes('thestartuplab - funding') ||
    name.includes('techcrunch - funding') || name.includes('startupstorymedia – funding')
  ) {
    return 'fintech';
  }

  // Social Media
  if (
    name.includes('social media') || name.includes('social-media') || name.includes('socialmedia') ||
    url.includes('/social/') || url.includes('/social-media/') ||
    name.includes('techcrunch – socialmedia') || name.includes('wabetainfo - socialmedia') ||
    name.includes('startupstorymedia - socialmedia')
  ) {
    return 'social-media';
  }

  // Robotics / Automation
  if (
    name.includes('robotics') || name.includes('automation') || name.includes('robot') ||
    url.includes('/robotics/') || url.includes('/automation/')
  ) {
    return 'robotics';
  }

  // Gaming / Esports
  if (
    name.includes('gaming') || name.includes('esports') || name.includes('e-sports') ||
    name.includes('game') || url.includes('/gaming/') || url.includes('/esports/')
  ) {
    return 'gaming';
  }

  // Mobility / EV / Travel / Logistics
  if (
    name.includes('mobility') || name.includes('transport') || name.includes('travel') ||
    name.includes('electric vehicle') || name.includes('electric-vehicle') || name.includes(' ev ') ||
    url.includes('/mobility/') || url.includes('/transport/') || url.includes('/travel/') ||
    url.includes('/ev/') || url.includes('/electric-vehicle/') ||
    name.includes('techcrunch – mobility') || name.includes('inc42 - mobility') ||
    name.includes('inc42 - traveltech') || name.includes('inc42 - logisticstech') ||
    name.includes('logisticstech') || name.includes('logistics tech')
  ) {
    return 'ev-mobility';
  }

  // Agritech
  if (
    name.includes('agritech') || name.includes('agri tech') || name.includes('agriculture') ||
    url.includes('/agritech/') || url.includes('/agriculture/') ||
    name.includes('inc42 - agritech')
  ) {
    return 'agritech';
  }

  // Ecommerce / Retail / Consumer
  if (
    name.includes('ecommerce') || name.includes('e-commerce') || name.includes('retail') ||
    url.includes('/ecommerce/') || url.includes('/e-commerce/') || url.includes('/retail/') ||
    name.includes('techcrunch – ecommerce') || name.includes('inc42 - ecommerce') ||
    name.includes('inc42 - retail') || name.includes('tech in asia – ecommerce') ||
    name.includes('consumerservices') || name.includes('consumer services')
  ) {
    return 'ecommerce';
  }

  // HealthTech
  if (
    name.includes('healthtech') || name.includes('health tech') || name.includes('health') ||
    name.includes('healthcare') || name.includes('biotech') ||
    url.includes('/health/') || url.includes('/healthtech/') || url.includes('/healthcare/') ||
    name.includes('techcrunch – healthtech') || name.includes('inc42 - healthtech') ||
    name.includes('startupstorymedia - healthtech') || name.includes('pnn - health')
  ) {
    return 'healthtech';
  }

  // EdTech
  if (
    name.includes('edtech') || name.includes('ed tech') || name.includes('education') ||
    url.includes('/edtech/') || url.includes('/education/') ||
    name.includes('inc42 - edtech') || name.includes('pnn - education')
  ) {
    return 'edtech';
  }

  // Cyber Security
  if (
    name.includes('cyber') || name.includes('security') || name.includes('cybersecurity') ||
    url.includes('/cyber/') || url.includes('/security/')
  ) {
    return 'cyber-security';
  }

  // SpaceTech
  if (
    name.includes('space') || name.includes('aerospace') ||
    url.includes('/space/') || url.includes('/aerospace/')
  ) {
    return 'space-tech';
  }

  // FoodTech
  if (
    name.includes('foodtech') || name.includes('food tech') || name.includes('food') ||
    url.includes('/foodtech/') || url.includes('/food/')
  ) {
    return 'foodtech';
  }

  // CleanTech / Energy → AI (closest)
  if (
    name.includes('cleantech') || name.includes('clean tech') || name.includes('energy') ||
    url.includes('/cleantech/') || url.includes('/energy/') ||
    name.includes('inc42 – cleantech') || name.includes('indiatimes (et) - cleantech')
  ) {
    return 'artificial-intelligence';
  }

  // Enterprise / RealEstate / PropTech → AI
  if (
    name.includes('enterprisetech') || name.includes('enterprise tech') ||
    name.includes('realestatetech') || name.includes('real estate') ||
    name.includes('inc42 - enterprisetech') || name.includes('inc42 – realestatetech')
  ) {
    return 'artificial-intelligence';
  }

  // General tech / technology
  if (
    name.includes('tech') || name.includes('technology') ||
    url.includes('/tech/') || url.includes('/technology/')
  ) {
    return 'artificial-intelligence';
  }

  return DEFAULT_CATEGORY_SLUG;
}
