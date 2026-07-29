export interface RegistrationCategory {
  value: string;
  label: string;
  icon: string;
}

export const REGISTRATION_CATEGORIES: RegistrationCategory[] = [
  { value: 'startup', label: 'Startup', icon: '🚀' },
  { value: 'investor', label: 'Investor', icon: '💰' },
  { value: 'accelerator', label: 'Accelerator', icon: '⚡' },
  { value: 'incubator', label: 'Incubator', icon: '🏛️' },
  { value: 'creator', label: 'Content Creator', icon: '🎥' },
  { value: 'lawyer', label: 'Lawyer', icon: '⚖️' },
  { value: 'cacs', label: 'CA / CS', icon: '📊' },
  { value: 'ibanker', label: 'Investment Banker', icon: '🏦' },
  { value: 'banker', label: 'Banker', icon: '🏧' },
  { value: 'vc', label: 'VC Firm', icon: '🏙' },
  { value: 'pe', label: 'PE Firm', icon: '🏢' },
  { value: 'familyoffice', label: 'Family Office', icon: '🏪' },
  { value: 'govt', label: 'Govt / Policy', icon: '🏛️' },
  { value: 'media', label: 'Media / Journalist', icon: '📰' },
  { value: 'consultant', label: 'Consultant / Advisor', icon: '🧭' },
  { value: 'coworking', label: 'Co-working Space', icon: '🏗️' },
  { value: 'university', label: 'University', icon: '🎓' },
  { value: 'student', label: 'Student', icon: '🧑‍🎓' },
  { value: 'other', label: 'Other', icon: '✳️' },
];

export const INVESTOR_TYPES = ['Angel', 'VC Fund', 'Corporate VC', 'Family Office', 'PE Fund', 'Syndicate / AIF'];
export const CHECK_SIZES = ['<$50K', '$50K–$250K', '$250K–$1M', '$1M–$5M', '$5M+'];
export const STAGE_FOCUS = ['Pre-seed', 'Seed', 'Series A', 'Series B+', 'Growth'];
export const ENTITY_TYPES = ['Pvt Ltd', 'LLP', 'C-Corp', 'LLC', 'Partnership', 'Other'];
export const STARTUP_STAGES = ['Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Bootstrapped/Profitable'];
export const TEAM_SIZES = ['1–10', '11–50', '51–200', '200+'];
export const REVENUE_STATUSES = ['Pre-revenue', 'Early revenue', 'Revenue-generating', 'Profitable'];
export const ROUND_TYPES = ['Pre-seed', 'Seed', 'Bridge', 'Series A', 'Series B', 'Series C+', 'Debt', 'Grant'];
export const BANKING_VERTICALS = ['Retail', 'Corporate/Commercial', 'SME', 'Trade Finance', 'Treasury', 'Private/Wealth'];
