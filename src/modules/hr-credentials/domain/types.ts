import { PanelAdminRole } from '@/modules/panel-admins/domain/types';

/** Free text now — driven by the admin-managed Designations list in Rules & Org Structure (hr_designations), not a fixed set. */
export type HrCredentialDesignation = string;

export interface HrEmployeeCredentialEntity {
  id: number;
  employee_code: string;
  name: string;
  designation: HrCredentialDesignation;
  email: string | null;
  avatar_url: string | null;
  password_hash: string;
  password_display: string | null;
  password_iv: string | null;
  password_tag: string | null;
  panel_role: PanelAdminRole | null;
  linked_panel_admin_id: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
}

export interface LinkedPanelAdminSummary {
  id: number;
  name: string;
  email: string;
  role: PanelAdminRole;
}

export interface HrEmployeeCredential {
  id: number;
  employeeCode: string;
  name: string;
  designation: HrCredentialDesignation;
  email: string | null;
  avatarUrl: string | null;
  /** Decrypted password, for the founder to view/copy. Never used for auth. */
  password: string | null;
  panelRole: PanelAdminRole | null;
  linkedPanelAdmin: LinkedPanelAdminSummary | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHrEmployeeCredentialDto {
  employeeCode: string;
  name: string;
  designation: HrCredentialDesignation;
  email?: string | null;
  avatarUrl?: string | null;
  password: string;
  panelRole?: PanelAdminRole | null;
  linkedPanelAdminId?: number | null;
  createdBy?: string;
}

export interface UpdateHrEmployeeCredentialDto {
  name?: string;
  designation?: HrCredentialDesignation;
  email?: string | null;
  avatarUrl?: string | null;
  /** Omit/undefined = keep existing password. */
  password?: string;
  panelRole?: PanelAdminRole | null;
  linkedPanelAdminId?: number | null;
  isActive?: boolean;
  updatedBy?: string;
}
