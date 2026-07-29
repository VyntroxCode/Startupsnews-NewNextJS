export interface RegistrationProfileFields {
  category?: string | null;
  other_category?: string | null;
  website?: string | null;
  // startup
  s_name?: string | null;
  s_founded?: number | null;
  s_entity?: string | null;
  s_stage?: string | null;
  s_dpiit?: 'yes' | 'no' | null;
  s_dpiit_number?: string | null;
  s_team_size?: string | null;
  s_revenue_status?: string | null;
  s_pitch?: string | null;
  s_raising?: 'yes' | 'planning' | 'no' | null;
  s_amount_seeking?: string | null;
  s_crunchbase?: string | null;
  s_tracxn?: string | null;
  // investor / vc / pe / familyoffice
  i_firm?: string | null;
  i_type?: string | null;
  i_check_size?: string | null;
  i_stage_focus?: string | null;
  i_sector_focus?: string | null;
  i_geo_focus?: string | null;
  // accelerator / incubator
  a_program_name?: string | null;
  a_duration?: string | null;
  a_sector_focus?: string | null;
  a_equity_taken?: number | null;
  // creator / media
  c_platforms?: string | null;
  c_niche?: string | null;
  c_mediakit?: string | null;
  // lawyer
  l_firm?: string | null;
  l_practice_areas?: string | null;
  l_jurisdiction?: string | null;
  l_years_experience?: number | null;
  // CA/CS
  cs_firm?: string | null;
  cs_membership_number?: string | null;
  cs_services?: string | null;
  cs_years_experience?: number | null;
  // investment banker
  ib_firm?: string | null;
  ib_years_experience?: number | null;
  ib_deal_types?: string | null;
  // banker
  bk_bank_name?: string | null;
  bk_years_experience?: number | null;
  bk_vertical?: string | null;
  // generic
  g_organization?: string | null;
  g_role?: string | null;
}

export interface PublicUserEntity extends RegistrationProfileFields {
  id: number;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  linkedin_url?: string;
  bio?: string | null;
  password_hash?: string;
  google_id?: string;
  linkedin_id?: string;
  newsletter_category_slugs?: string | null;
  timezone?: string | null;
  last_newsletter_sent_date?: string | null;
  auth_provider: 'email' | 'google' | 'linkedin';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  linkedin_url?: string;
  authProvider: 'email' | 'google' | 'linkedin';
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export interface Founder {
  name?: string;
  role?: string;
  linkedin_url?: string;
}

export interface FundingRound {
  round_type?: string;
  amount?: string;
  lead_investor?: string;
  round_date?: string;
}
