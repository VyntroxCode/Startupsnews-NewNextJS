import { query, queryOne, getDbConnection } from '@/shared/database/connection';
import bcrypt from 'bcryptjs';
import type { PublicUserEntity } from '../domain/types';

async function ensureTable() {
  const pool = await getDbConnection();
  const conn = await pool.getConnection();
  await conn.query(`
    CREATE TABLE IF NOT EXISTS public_registrations (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      name          VARCHAR(255) NOT NULL,
      email         VARCHAR(255) NOT NULL UNIQUE,
      phone         VARCHAR(50),
      country       VARCHAR(100),
      city          VARCHAR(100),
      linkedin_url  VARCHAR(500),
      password_hash VARCHAR(255),
      google_id     VARCHAR(255),
      linkedin_id   VARCHAR(255),
      auth_provider ENUM('email','google','linkedin') NOT NULL DEFAULT 'email',
      is_active     TINYINT(1) NOT NULL DEFAULT 1,
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_login    DATETIME,
      INDEX idx_email (email),
      INDEX idx_google_id (google_id),
      INDEX idx_linkedin_id (linkedin_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  // Add new columns to existing tables (safe no-op if already present)
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS city VARCHAR(100)`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500)`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS linkedin_id VARCHAR(255)`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS newsletter_category_slugs VARCHAR(500) NULL DEFAULT NULL`);
  
  // Safe way to modify ENUM if not already updated (try-catch because syntax can be tricky if it exists, but MODIFY is usually fine)
  try {
    await conn.query(`ALTER TABLE public_registrations MODIFY COLUMN auth_provider ENUM('email', 'google', 'linkedin') NOT NULL DEFAULT 'email'`);
  } catch (err) {
    // Ignore enum update error if it already has the values
  }
  
  conn.release();
}

export async function findAll(page = 1, limit = 20): Promise<{ rows: PublicUserEntity[]; total: number }> {
  await ensureTable();
  const offset = (page - 1) * limit;
  const rows = await query<PublicUserEntity>(
    'SELECT * FROM public_registrations ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  const countRow = await queryOne<{ total: bigint | number }>('SELECT COUNT(*) as total FROM public_registrations');
  return { rows, total: Number(countRow?.total ?? 0) };
}

export async function findByEmail(email: string): Promise<PublicUserEntity | null> {
  await ensureTable();
  return queryOne<PublicUserEntity>('SELECT * FROM public_registrations WHERE email = ? LIMIT 1', [email]);
}

export async function findByGoogleId(googleId: string): Promise<PublicUserEntity | null> {
  await ensureTable();
  return queryOne<PublicUserEntity>('SELECT * FROM public_registrations WHERE google_id = ? LIMIT 1', [googleId]);
}

export async function findByLinkedinId(linkedinId: string): Promise<PublicUserEntity | null> {
  await ensureTable();
  return queryOne<PublicUserEntity>('SELECT * FROM public_registrations WHERE linkedin_id = ? LIMIT 1', [linkedinId]);
}

export async function emailExists(email: string): Promise<boolean> {
  const user = await findByEmail(email);
  return user !== null;
}

export async function create(data: { name: string; email: string; phone?: string; country?: string; password: string }): Promise<void> {
  await ensureTable();
  const hash = await bcrypt.hash(data.password, 12);
  await query(
    'INSERT INTO public_registrations (name, email, phone, country, password_hash, auth_provider) VALUES (?, ?, ?, ?, ?, ?)',
    [data.name, data.email, data.phone || null, data.country || null, hash, 'email']
  );
}

export async function upsertGoogleUser(data: { googleId: string; name: string; email: string; country?: string; city?: string }): Promise<{ user: PublicUserEntity; isNew: boolean }> {
  await ensureTable();

  // Check by Google ID first
  let user = await findByGoogleId(data.googleId);
  if (user) {
    await query(
      'UPDATE public_registrations SET last_login = NOW(), country = COALESCE(NULLIF(country, ""), ?), city = COALESCE(NULLIF(city, ""), ?) WHERE id = ?',
      [data.country || null, data.city || null, user.id]
    );
    return { user: { ...user, country: user.country || data.country, city: user.city || data.city }, isNew: false };
  }

  // Check if email exists — link it
  user = await findByEmail(data.email);
  if (user) {
    await query(
      'UPDATE public_registrations SET google_id = ?, last_login = NOW(), country = COALESCE(NULLIF(country, ""), ?), city = COALESCE(NULLIF(city, ""), ?) WHERE id = ?',
      [data.googleId, data.country || null, data.city || null, user.id]
    );
    return { user: { ...user, google_id: data.googleId, country: user.country || data.country, city: user.city || data.city }, isNew: false };
  }

  // Create new
  await query(
    'INSERT INTO public_registrations (name, email, google_id, country, city, auth_provider) VALUES (?, ?, ?, ?, ?, ?)',
    [data.name, data.email, data.googleId, data.country || null, data.city || null, 'google']
  );
  return { user: (await findByEmail(data.email))!, isNew: true };
}

export async function upsertLinkedinUser(data: { linkedinId: string; name: string; email: string; linkedinUrl?: string; country?: string; city?: string }): Promise<{ user: PublicUserEntity; isNew: boolean }> {
  await ensureTable();

  // Check by LinkedIn ID first
  let user = await findByLinkedinId(data.linkedinId);
  if (user) {
    await query(
      'UPDATE public_registrations SET last_login = NOW(), country = COALESCE(NULLIF(country, ""), ?), city = COALESCE(NULLIF(city, ""), ?) WHERE id = ?',
      [data.country || null, data.city || null, user.id]
    );
    return { user: { ...user, country: user.country || data.country, city: user.city || data.city }, isNew: false };
  }

  // Check if email exists — link it
  user = await findByEmail(data.email);
  if (user) {
    await query(
      'UPDATE public_registrations SET linkedin_id = ?, last_login = NOW(), country = COALESCE(NULLIF(country, ""), ?), city = COALESCE(NULLIF(city, ""), ?) WHERE id = ?',
      [data.linkedinId, data.country || null, data.city || null, user.id]
    );
    if (data.linkedinUrl && !user.linkedin_url) {
      await updateProfile(user.id, { linkedin_url: data.linkedinUrl });
    }
    return { user: { ...user, linkedin_id: data.linkedinId, linkedin_url: user.linkedin_url || data.linkedinUrl, country: user.country || data.country, city: user.city || data.city }, isNew: false };
  }

  // Create new
  await query(
    'INSERT INTO public_registrations (name, email, linkedin_id, linkedin_url, country, city, auth_provider) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.name, data.email, data.linkedinId, data.linkedinUrl || null, data.country || null, data.city || null, 'linkedin']
  );
  return { user: (await findByEmail(data.email))!, isNew: true };
}

export async function verifyPassword(user: PublicUserEntity, password: string): Promise<boolean> {
  if (!user.password_hash) return false;
  return bcrypt.compare(password, user.password_hash);
}

export async function updateLastLogin(id: number): Promise<void> {
  await query('UPDATE public_registrations SET last_login = NOW() WHERE id = ?', [id]);
}

export async function updateNewsletterCategories(id: number, slugs: string[]): Promise<void> {
  const value = slugs.filter(Boolean).slice(0, 3).join(',') || null;
  await query('UPDATE public_registrations SET newsletter_category_slugs = ? WHERE id = ?', [value, id]);
}

export async function updateProfile(id: number, data: { phone?: string; country?: string; city?: string; linkedin_url?: string }): Promise<void> {
  const fields: string[] = [];
  const params: (string | number | boolean | null | Date)[] = [];

  if (data.phone !== undefined) {
    fields.push('phone = ?');
    params.push(data.phone || null);
  }
  if (data.country !== undefined) {
    fields.push('country = ?');
    params.push(data.country || null);
  }
  if (data.city !== undefined) {
    fields.push('city = ?');
    params.push(data.city || null);
  }
  if (data.linkedin_url !== undefined) {
    fields.push('linkedin_url = ?');
    params.push(data.linkedin_url || null);
  }

  if (fields.length === 0) return;

  params.push(id);
  await query(
    `UPDATE public_registrations SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
}
