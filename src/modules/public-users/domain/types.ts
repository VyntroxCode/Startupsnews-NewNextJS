export interface PublicUserEntity {
  id: number;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  linkedin_url?: string;
  password_hash?: string;
  google_id?: string;
  linkedin_id?: string;
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
