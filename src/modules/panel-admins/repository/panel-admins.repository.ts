import { query, queryOne, getDbConnection } from '@/shared/database/connection';
import { PanelAdminEntity, PanelAdminRole } from '../domain/types';
import bcrypt from 'bcryptjs';

export class PanelAdminsRepository {
  async findAll(filters?: { role?: string; isActive?: boolean }): Promise<PanelAdminEntity[]> {
    let sql = 'SELECT * FROM panel_admins WHERE 1=1';
    const params: (string | number | boolean)[] = [];

    if (filters?.role) {
      sql += ' AND role = ?';
      params.push(filters.role);
    }

    if (filters?.isActive !== undefined) {
      sql += ' AND is_active = ?';
      params.push(filters.isActive ? 1 : 0);
    }

    sql += ' ORDER BY created_at DESC';

    return query<PanelAdminEntity>(sql, params);
  }

  async findById(id: number): Promise<PanelAdminEntity | null> {
    return queryOne<PanelAdminEntity>('SELECT * FROM panel_admins WHERE id = ?', [id]);
  }

  async findByEmail(email: string): Promise<PanelAdminEntity | null> {
    return queryOne<PanelAdminEntity>('SELECT * FROM panel_admins WHERE email = ?', [email]);
  }

  async create(data: {
    email: string;
    password: string;
    name: string;
    role: PanelAdminRole;
    createdBy?: string;
  }): Promise<PanelAdminEntity> {
    const passwordHash = await bcrypt.hash(data.password, 10);

    const sql = `
      INSERT INTO panel_admins (email, password_hash, name, role, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [data.email, passwordHash, data.name, data.role, data.createdBy || null, data.createdBy || null];

    const conn = await getDbConnection();
    const connection = await conn.getConnection();
    try {
      const result = await connection.query(sql, params) as { insertId?: number };
      const insertId = result.insertId;
      if (!insertId) {
        throw new Error('Failed to get insert ID');
      }
      return this.findById(insertId) as Promise<PanelAdminEntity>;
    } finally {
      connection.release();
    }
  }

  async update(id: number, data: Partial<PanelAdminEntity>): Promise<PanelAdminEntity> {
    const fields: string[] = [];
    const params: (string | number | boolean | null)[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'password_hash') {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = ?`);
        params.push(value as string | number | boolean | null);
      }
    });

    if (fields.length === 0) {
      return this.findById(id) as Promise<PanelAdminEntity>;
    }

    params.push(id);
    await query(`UPDATE panel_admins SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id) as Promise<PanelAdminEntity>;
  }

  async updatePassword(id: number, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE panel_admins SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  }

  async updateLastLogin(id: number): Promise<void> {
    await query('UPDATE panel_admins SET last_login = NOW() WHERE id = ?', [id]);
  }

  async delete(id: number): Promise<void> {
    await query('DELETE FROM panel_admins WHERE id = ?', [id]);
  }

  async emailExists(email: string, excludeId?: number): Promise<boolean> {
    let sql = 'SELECT COUNT(*) as count FROM panel_admins WHERE email = ?';
    const params: (string | number)[] = [email];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await queryOne<{ count: number | bigint }>(sql, params);
    const count = result?.count;
    return count ? Number(count) > 0 : false;
  }

  async verifyPassword(admin: PanelAdminEntity, password: string): Promise<boolean> {
    return bcrypt.compare(password, admin.password_hash);
  }
}
