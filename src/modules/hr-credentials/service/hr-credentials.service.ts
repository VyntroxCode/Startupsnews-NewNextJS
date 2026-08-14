import { HrCredentialsRepository } from '../repository/hr-credentials.repository';
import { PanelAdminsRepository } from '@/modules/panel-admins/repository/panel-admins.repository';
import { PanelAdminRole } from '@/modules/panel-admins/domain/types';
import {
  HrEmployeeCredential, HrEmployeeCredentialEntity, CreateHrEmployeeCredentialDto, UpdateHrEmployeeCredentialDto,
  LinkedPanelAdminSummary,
} from '../domain/types';

export class HrCredentialsService {
  constructor(
    private repository: HrCredentialsRepository,
    private panelAdminsRepository: PanelAdminsRepository
  ) {}

  private async toDto(entity: HrEmployeeCredentialEntity): Promise<HrEmployeeCredential> {
    let linkedPanelAdmin: LinkedPanelAdminSummary | null = null;
    if (entity.linked_panel_admin_id) {
      const admin = await this.panelAdminsRepository.findById(entity.linked_panel_admin_id);
      if (admin) linkedPanelAdmin = { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
    }
    return {
      id: entity.id,
      employeeCode: entity.employee_code,
      name: entity.name,
      designation: entity.designation,
      email: entity.email,
      avatarUrl: entity.avatar_url,
      password: this.repository.getDisplayPassword(entity),
      panelRole: entity.panel_role,
      linkedPanelAdmin,
      isActive: entity.is_active,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };
  }

  async getAll(): Promise<HrEmployeeCredential[]> {
    const entities = await this.repository.findAll();
    return Promise.all(entities.map((e) => this.toDto(e)));
  }

  async getByLinkedPanelAdminId(panelAdminId: number): Promise<HrEmployeeCredential | null> {
    const entity = await this.repository.findByLinkedPanelAdminId(panelAdminId);
    if (!entity) return null;
    return this.toDto(entity);
  }

  async getById(id: number): Promise<HrEmployeeCredential | null> {
    const entity = await this.repository.findById(id);
    if (!entity) return null;
    return this.toDto(entity);
  }

  async getByEmployeeCode(employeeCode: string): Promise<HrEmployeeCredential | null> {
    const entity = await this.repository.findByEmployeeCode(employeeCode.trim().toUpperCase());
    if (!entity) return null;
    return this.toDto(entity);
  }

  /** Plain-employee login (no linked panel_admins account) — verifies straight against this credential's own password. */
  async verifyEmployeePassword(employeeCode: string, password: string): Promise<HrEmployeeCredential | null> {
    const entity = await this.repository.findByEmployeeCode(employeeCode.trim().toUpperCase());
    if (!entity || !entity.is_active) return null;
    const valid = await this.repository.verifyPassword(entity, password);
    if (!valid) return null;
    return this.toDto(entity);
  }

  async create(data: CreateHrEmployeeCredentialDto): Promise<HrEmployeeCredential> {
    const employeeCode = data.employeeCode.trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,32}$/.test(employeeCode)) {
      throw new Error('Employee ID must be 3-32 characters: letters, numbers, and hyphens only');
    }
    if (await this.repository.employeeCodeExists(employeeCode)) {
      throw new Error(`Employee ID "${employeeCode}" is already in use`);
    }
    if (data.panelRole && !data.linkedPanelAdminId) {
      throw new Error('Select an existing Publisher Admin / Event Admin account to link for this role');
    }

    const entity = await this.repository.create({ ...data, employeeCode });
    return this.toDto(entity);
  }

  async update(id: number, data: UpdateHrEmployeeCredentialDto): Promise<HrEmployeeCredential> {
    if (data.panelRole && data.linkedPanelAdminId === null) {
      throw new Error('Select an existing Publisher Admin / Event Admin account to link for this role');
    }
    const entity = await this.repository.update(id, data);
    return this.toDto(entity);
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  /** Accounts of the given role not currently linked to any other (active) credential. */
  async getAvailablePanelAdmins(role: PanelAdminRole, excludeCredentialId?: number): Promise<LinkedPanelAdminSummary[]> {
    const [candidates, credentials] = await Promise.all([
      this.panelAdminsRepository.findAll({ role, isActive: true }),
      this.repository.findAll(),
    ]);
    const linkedIds = new Set(
      credentials
        .filter((c) => c.linked_panel_admin_id && c.is_active && c.id !== excludeCredentialId)
        .map((c) => c.linked_panel_admin_id)
    );
    return candidates
      .filter((a) => !linkedIds.has(a.id))
      .map((a) => ({ id: a.id, name: a.name, email: a.email, role: a.role }));
  }
}
