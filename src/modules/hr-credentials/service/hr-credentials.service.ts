import { randomBytes } from 'crypto';
import { HrCredentialsRepository } from '../repository/hr-credentials.repository';
import { PanelAdminsRepository } from '@/modules/panel-admins/repository/panel-admins.repository';
import { PanelAdminRole } from '@/modules/panel-admins/domain/types';
import {
  HrEmployeeCredential, HrEmployeeCredentialEntity, CreateHrEmployeeCredentialDto, UpdateHrEmployeeCredentialDto,
  LinkedPanelAdminSummary,
} from '../domain/types';

/** The panel roles HR can hand out from the role picker. */
export const ASSIGNABLE_PANEL_ROLES: PanelAdminRole[] = ['event_admin', 'publisher_admin'];

/** Non-deliverable domain for auto-provisioned accounts whose employee has no usable work email. */
const PROVISIONED_EMAIL_DOMAIN = 'employee.startupnews.invalid';

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

    // Picking a role is all HR does — the panel account behind it is provisioned here.
    const account = data.panelRole
      ? await this.provisionPanelAdmin({ employeeCode, name: data.name, email: data.email ?? null, role: data.panelRole, actor: data.createdBy })
      : null;

    try {
      const entity = await this.repository.create({ ...data, employeeCode, linkedPanelAdminId: account?.id ?? null });
      return this.toDto(entity);
    } catch (error) {
      // Don't leave a live panel account behind for an Employee ID that never got created.
      if (account?.created) await this.panelAdminsRepository.delete(account.id);
      else if (account) await this.panelAdminsRepository.update(account.id, { is_active: false });
      throw error;
    }
  }

  /**
   * The role picker drives the linked panel_admins account — the caller never names an account:
   *  - role granted (none before)  -> the person gets their own account, created or switched back on
   *  - role changed                -> the same account moves to the new role
   *  - role removed                -> the account is switched off (never deleted) and unlinked, so the
   *                                   Employee ID falls back to the plain employee portal
   * An unchanged role is left strictly alone, so saving an exited employee's record can't switch
   * back on an account offboarding turned off.
   */
  async update(id: number, data: UpdateHrEmployeeCredentialDto): Promise<HrEmployeeCredential> {
    const patch: UpdateHrEmployeeCredentialDto = { ...data, linkedPanelAdminId: undefined };

    if (data.panelRole !== undefined) {
      const current = await this.repository.findById(id);
      if (!current) throw new Error('Employee credential not found');

      const linked = current.linked_panel_admin_id
        ? await this.panelAdminsRepository.findById(current.linked_panel_admin_id)
        : null;

      if (!data.panelRole) {
        if (linked) await this.panelAdminsRepository.update(linked.id, { is_active: false, updated_by: data.updatedBy });
        patch.linkedPanelAdminId = null;
      } else if (!linked) {
        const account = await this.provisionPanelAdmin({
          employeeCode: current.employee_code,
          name: data.name ?? current.name,
          email: data.email !== undefined ? data.email : current.email,
          role: data.panelRole,
          actor: data.updatedBy,
          credentialId: id,
        });
        patch.linkedPanelAdminId = account.id;
      } else if (linked.role !== data.panelRole) {
        await this.panelAdminsRepository.update(linked.id, { role: data.panelRole, updated_by: data.updatedBy });
      }
    }

    const entity = await this.repository.update(id, patch);
    return this.toDto(entity);
  }

  /** Deleting the Employee ID also switches off the panel account it signed into — otherwise that
   * account's original email login would silently reopen. The account row and its history stay. */
  async delete(id: number): Promise<void> {
    const current = await this.repository.findById(id);
    if (current?.linked_panel_admin_id) {
      await this.panelAdminsRepository.update(current.linked_panel_admin_id, { is_active: false });
    }
    await this.repository.delete(id);
  }

  /**
   * Finds or creates this employee's own panel_admins account for `role`. Prefers their work
   * email; falls back to an address derived from the Employee ID when there is no email or it
   * belongs to an account we must not take over. An earlier Publisher/Event Admin account under
   * the same email (role removed, then granted again) is switched back on instead of duplicated,
   * so their history stays under one account. The account's own password is random and never
   * shown — sign-in is by Employee ID + the credential's password only.
   */
  private async provisionPanelAdmin(input: {
    employeeCode: string; name: string; email: string | null; role: PanelAdminRole; actor?: string; credentialId?: number;
  }): Promise<{ id: number; created: boolean }> {
    const fallbackEmail = `${input.employeeCode.toLowerCase()}@${PROVISIONED_EMAIL_DOMAIN}`;
    const workEmail = input.email?.trim().toLowerCase();
    const candidates = workEmail ? [workEmail, fallbackEmail] : [fallbackEmail];

    const credentials = await this.repository.findAll();
    const takenIds = new Set(
      credentials.filter((c) => c.linked_panel_admin_id && c.id !== input.credentialId).map((c) => c.linked_panel_admin_id)
    );

    for (const email of candidates) {
      const existing = await this.panelAdminsRepository.findByEmail(email);
      if (!existing) {
        const created = await this.panelAdminsRepository.create({
          email, password: randomBytes(24).toString('base64url'), name: input.name, role: input.role, createdBy: input.actor,
        });
        return { id: created.id, created: true };
      }
      if (ASSIGNABLE_PANEL_ROLES.includes(existing.role) && !takenIds.has(existing.id)) {
        await this.panelAdminsRepository.update(existing.id, { role: input.role, is_active: true, name: input.name, updated_by: input.actor });
        return { id: existing.id, created: false };
      }
    }
    throw new Error('Could not set up admin panel access for this Employee ID — an account with this email is already in use by someone else.');
  }
}
