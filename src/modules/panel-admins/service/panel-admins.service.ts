import { PanelAdminsRepository } from '../repository/panel-admins.repository';
import { PanelAdminEntity, PanelAdmin, CreatePanelAdminDto, UpdatePanelAdminDto, PanelAdminLoginDto } from '../domain/types';
import { entityToPanelAdmin } from '../utils/panel-admins.utils';

export class PanelAdminsService {
  constructor(private repository: PanelAdminsRepository) {}

  async getAllPanelAdmins(filters?: { role?: string; isActive?: boolean }): Promise<PanelAdmin[]> {
    const entities = await this.repository.findAll(filters);
    return entities.map(entityToPanelAdmin);
  }

  async getById(id: number): Promise<PanelAdmin | null> {
    const entity = await this.repository.findById(id);
    if (!entity) return null;
    return entityToPanelAdmin(entity);
  }

  async getByEmail(email: string): Promise<PanelAdmin | null> {
    const entity = await this.repository.findByEmail(email);
    if (!entity) return null;
    return entityToPanelAdmin(entity);
  }

  async createPanelAdmin(data: CreatePanelAdminDto): Promise<PanelAdmin> {
    const emailExists = await this.repository.emailExists(data.email);
    if (emailExists) {
      throw new Error(`Panel admin with email "${data.email}" already exists`);
    }

    const entity = await this.repository.create(data);
    return entityToPanelAdmin(entity);
  }

  async updatePanelAdmin(id: number, data: UpdatePanelAdminDto): Promise<PanelAdmin> {
    if (data.email) {
      const emailExists = await this.repository.emailExists(data.email, id);
      if (emailExists) {
        throw new Error(`Panel admin with email "${data.email}" already exists`);
      }
    }

    const entity = await this.repository.update(id, data);
    return entityToPanelAdmin(entity);
  }

  async updatePassword(id: number, newPassword: string): Promise<void> {
    await this.repository.updatePassword(id, newPassword);
  }

  async deletePanelAdmin(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  async login(credentials: PanelAdminLoginDto): Promise<{ admin: PanelAdmin; entity: PanelAdminEntity }> {
    const entity = await this.repository.findByEmail(credentials.email);

    if (!entity) {
      throw new Error('Invalid email or password');
    }

    if (!entity.is_active) {
      throw new Error('Account is inactive');
    }

    const isValidPassword = await this.repository.verifyPassword(entity, credentials.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    await this.repository.updateLastLogin(entity.id);

    const admin = entityToPanelAdmin(entity);
    return { admin, entity };
  }
}
