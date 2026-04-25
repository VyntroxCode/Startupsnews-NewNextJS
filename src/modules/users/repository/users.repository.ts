import { query, queryOne, getDbConnection } from '@/shared/database/connection';
import { UserEntity } from '../domain/types';
import bcrypt from 'bcryptjs';

export class UsersRepository {
  /**
   * Find all users
   */
  async findAll(filters?: {
    role?: string;
    isActive?: boolean;
  }): Promise<UserEntity[]> {
    let sql = 'SELECT * FROM users WHERE 1=1';
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

    return query<UserEntity>(sql, params);
  }

  /**
   * Find user by ID
   */
  async findById(id: number): Promise<UserEntity | null> {
    return queryOne<UserEntity>('SELECT * FROM users WHERE id = ?', [id]);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    return queryOne<UserEntity>('SELECT * FROM users WHERE email = ?', [email]);
  }

  /**
   * Create new user
   */
  async create(data: {
    email: string;
    password: string;
    name: string;
    role?: 'admin' | 'editor' | 'author';
    avatarUrl?: string;
    authorDescription?: string;
  }): Promise<UserEntity> {
    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    const sql = `
      INSERT INTO users (
        email, password_hash, name, role, avatar_url, author_description
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.email,
      passwordHash,
      data.name,
      data.role || 'author',
      data.avatarUrl || null,
      data.authorDescription || null,
    ];

    const conn = await getDbConnection();
    const connection = await conn.getConnection();
    try {
      const result = await connection.query(sql, params) as { insertId?: number };
      const insertId = result.insertId;
      if (!insertId) {
        throw new Error('Failed to get insert ID');
      }
      return this.findById(insertId) as Promise<UserEntity>;
    } finally {
      connection.release();
    }
  }

  /**
   * Update user
   */
  async update(id: number, data: Partial<UserEntity>): Promise<UserEntity> {
    const fields: string[] = [];
    const params: (string | number | boolean | null)[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'password_hash') {
        // Convert camelCase to snake_case for database
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = ?`);
        params.push(value as string | number | boolean | null);
      }
    });

    if (fields.length === 0) {
      return this.findById(id) as Promise<UserEntity>;
    }

    params.push(id);
    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id) as Promise<UserEntity>;
  }

  /**
   * Update password
   */
  async updatePassword(id: number, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  }

  /**
   * Update last login
   */
  async updateLastLogin(id: number): Promise<void> {
    await query('UPDATE users SET last_login = NOW() WHERE id = ?', [id]);
  }

  /**
   * Delete user
   */
  async delete(id: number): Promise<void> {
    await query('DELETE FROM users WHERE id = ?', [id]);
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeId?: number): Promise<boolean> {
    let sql = 'SELECT COUNT(*) as count FROM users WHERE email = ?';
    const params: (string | number)[] = [email];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await queryOne<{ count: number | bigint }>(sql, params);
    // Convert BigInt to Number (MariaDB COUNT() returns BigInt)
    const count = result?.count;
    return count ? Number(count) > 0 : false;
  }

  /**
   * Verify password
   */
  async verifyPassword(user: UserEntity, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }
}

