/**
 * User domain types
 */

export type UserRole = 'admin' | 'editor' | 'author';

/**
 * User entity (database representation)
 */
export interface UserEntity {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  author_description?: string;
  is_default_author?: boolean;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  is_active: boolean;
  created_by?: string;
  updated_by?: string;
}

/**
 * User DTO (domain/API representation - without password)
 */
export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  authorDescription?: string;
  isDefaultAuthor?: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

/**
 * DTOs for API
 */
export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  avatarUrl?: string;
  authorDescription?: string;
  isDefaultAuthor?: boolean;
  createdBy?: string;
}

export interface UpdateUserDto {
  id: number;
  email?: string;
  name?: string;
  role?: UserRole;
  avatarUrl?: string;
  authorDescription?: string;
  isDefaultAuthor?: boolean;
  isActive?: boolean;
  updatedBy?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

