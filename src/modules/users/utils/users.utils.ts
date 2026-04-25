import { UserEntity, User } from '../domain/types';

/**
 * Convert UserEntity (database) to User (domain/API)
 */
export function entityToUser(entity: UserEntity): User {
  return {
    id: entity.id,
    email: entity.email,
    name: entity.name,
    role: entity.role,
    avatarUrl: entity.avatar_url,
    authorDescription: entity.author_description,
    isDefaultAuthor: entity.is_default_author,
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
    lastLogin: entity.last_login || undefined,
    isActive: entity.is_active,
  };
}

/**
 * Convert array of entities to users
 */
export function entitiesToUsers(entities: UserEntity[]): User[] {
  return entities.map(entityToUser);
}

