/**
 * Panel admin domain types — Event Admin / Publisher Admin accounts.
 * Separate table from `users` (which holds admin/editor/author real logins
 * and synthetic byline-author records).
 */

export type PanelAdminRole = 'event_admin' | 'publisher_admin';

export interface PanelAdminEntity {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: PanelAdminRole;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  created_by?: string;
  updated_by?: string;
}

export interface PanelAdmin {
  id: number;
  email: string;
  name: string;
  role: PanelAdminRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface CreatePanelAdminDto {
  email: string;
  password: string;
  name: string;
  role: PanelAdminRole;
  createdBy?: string;
}

export interface UpdatePanelAdminDto {
  id: number;
  email?: string;
  name?: string;
  role?: PanelAdminRole;
  isActive?: boolean;
  updatedBy?: string;
}

export interface PanelAdminLoginDto {
  email: string;
  password: string;
}
