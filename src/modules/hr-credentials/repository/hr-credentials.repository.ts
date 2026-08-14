import { query, queryOne, getDbConnection } from '@/shared/database/connection';
import bcrypt from 'bcryptjs';
import { encryptPassword, decryptPassword } from '../utils/credential-crypto';
import {
  HrEmployeeCredentialEntity, CreateHrEmployeeCredentialDto, UpdateHrEmployeeCredentialDto,
} from '../domain/types';

export class HrCredentialsRepository {
  async findAll(): Promise<HrEmployeeCredentialEntity[]> {
    return query<HrEmployeeCredentialEntity>('SELECT * FROM hr_employee_credentials ORDER BY created_at DESC');
  }

  async findById(id: number): Promise<HrEmployeeCredentialEntity | null> {
    return queryOne<HrEmployeeCredentialEntity>('SELECT * FROM hr_employee_credentials WHERE id = ?', [id]);
  }

  async findByEmployeeCode(employeeCode: string): Promise<HrEmployeeCredentialEntity | null> {
    return queryOne<HrEmployeeCredentialEntity>('SELECT * FROM hr_employee_credentials WHERE employee_code = ?', [employeeCode]);
  }

  /** Reverse lookup: given a panel_admins.id (from the JWT), find their linked HR identity, if any. */
  async findByLinkedPanelAdminId(panelAdminId: number): Promise<HrEmployeeCredentialEntity | null> {
    return queryOne<HrEmployeeCredentialEntity>(
      'SELECT * FROM hr_employee_credentials WHERE linked_panel_admin_id = ? AND is_active = 1',
      [panelAdminId]
    );
  }

  async employeeCodeExists(employeeCode: string, excludeId?: number): Promise<boolean> {
    let sql = 'SELECT COUNT(*) as count FROM hr_employee_credentials WHERE employee_code = ?';
    const params: (string | number)[] = [employeeCode];
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const result = await queryOne<{ count: number | bigint }>(sql, params);
    return result?.count ? Number(result.count) > 0 : false;
  }

  async create(data: CreateHrEmployeeCredentialDto): Promise<HrEmployeeCredentialEntity> {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const { ciphertext, iv, tag } = encryptPassword(data.password);

    const sql = `
      INSERT INTO hr_employee_credentials
        (employee_code, name, designation, email, avatar_url, password_hash, password_display, password_iv, password_tag, panel_role, linked_panel_admin_id, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.employeeCode, data.name, data.designation, data.email || null, data.avatarUrl || null,
      passwordHash, ciphertext, iv, tag,
      data.panelRole || null, data.linkedPanelAdminId || null,
      data.createdBy || null, data.createdBy || null,
    ];

    const conn = await getDbConnection();
    const connection = await conn.getConnection();
    try {
      const result = await connection.query(sql, params) as { insertId?: number };
      const insertId = result.insertId;
      if (!insertId) throw new Error('Failed to get insert ID');
      return this.findById(insertId) as Promise<HrEmployeeCredentialEntity>;
    } finally {
      connection.release();
    }
  }

  async update(id: number, data: UpdateHrEmployeeCredentialDto): Promise<HrEmployeeCredentialEntity> {
    const fields: string[] = [];
    const params: (string | number | boolean | null)[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
    if (data.designation !== undefined) { fields.push('designation = ?'); params.push(data.designation); }
    if (data.email !== undefined) { fields.push('email = ?'); params.push(data.email); }
    if (data.avatarUrl !== undefined) { fields.push('avatar_url = ?'); params.push(data.avatarUrl); }
    if (data.panelRole !== undefined) { fields.push('panel_role = ?'); params.push(data.panelRole); }
    if (data.linkedPanelAdminId !== undefined) { fields.push('linked_panel_admin_id = ?'); params.push(data.linkedPanelAdminId); }
    if (data.isActive !== undefined) { fields.push('is_active = ?'); params.push(data.isActive); }
    if (data.updatedBy !== undefined) { fields.push('updated_by = ?'); params.push(data.updatedBy); }

    if (data.password) {
      const passwordHash = await bcrypt.hash(data.password, 10);
      const { ciphertext, iv, tag } = encryptPassword(data.password);
      fields.push('password_hash = ?', 'password_display = ?', 'password_iv = ?', 'password_tag = ?');
      params.push(passwordHash, ciphertext, iv, tag);
    }

    if (fields.length === 0) return this.findById(id) as Promise<HrEmployeeCredentialEntity>;

    params.push(id);
    await query(`UPDATE hr_employee_credentials SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id) as Promise<HrEmployeeCredentialEntity>;
  }

  async delete(id: number): Promise<void> {
    await query('DELETE FROM hr_employee_credentials WHERE id = ?', [id]);
  }

  /** Decrypts the display copy of the password. Never used for authentication. */
  getDisplayPassword(entity: HrEmployeeCredentialEntity): string | null {
    if (!entity.password_display || !entity.password_iv || !entity.password_tag) return null;
    try {
      return decryptPassword(entity.password_display, entity.password_iv, entity.password_tag);
    } catch {
      return null;
    }
  }

  async verifyPassword(entity: HrEmployeeCredentialEntity, password: string): Promise<boolean> {
    return bcrypt.compare(password, entity.password_hash);
  }
}
