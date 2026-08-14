import bcrypt from 'bcryptjs';
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

    // Once an Employee ID is assigned via HR Management, the original email/password
    // login for this account is retired in favour of Employee ID + password.
    const hasEmployeeCredential = await this.repository.hasActiveEmployeeCredential(entity.id);
    if (hasEmployeeCredential) {
      throw new Error('This account now signs in with an Employee ID. Contact your admin for your Employee ID and password.');
    }

    const isValidPassword = await this.repository.verifyPassword(entity, credentials.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    await this.repository.updateLastLogin(entity.id);

    const admin = entityToPanelAdmin(entity);
    return { admin, entity };
  }

  /** Alternate login for accounts assigned an Employee ID via HR Management's Assigning IDs. */
  async loginWithEmployeeId(employeeCode: string, password: string): Promise<{ admin: PanelAdmin; entity: PanelAdminEntity }> {
    const linked = await this.repository.findLinkedByEmployeeCode(employeeCode.trim().toUpperCase());
    if (!linked) {
      throw new Error('Invalid Employee ID or password');
    }

    const isValidPassword = await bcrypt.compare(password, linked.credentialPasswordHash);
    if (!isValidPassword) {
      throw new Error('Invalid Employee ID or password');
    }

    await this.repository.updateLastLogin(linked.panelAdmin.id);

    const admin = entityToPanelAdmin(linked.panelAdmin);
    return { admin, entity: linked.panelAdmin };
  }
}
