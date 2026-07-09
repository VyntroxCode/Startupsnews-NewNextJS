import { PanelAdminEntity, PanelAdmin } from '../domain/types';

export function entityToPanelAdmin(entity: PanelAdminEntity): PanelAdmin {
  return {
    id: entity.id,
    email: entity.email,
    name: entity.name,
    role: entity.role,
    isActive: entity.is_active,
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
    lastLogin: entity.last_login || undefined,
  };
}
