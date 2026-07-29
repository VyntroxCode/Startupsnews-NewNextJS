import { query, queryOne, getDbConnection } from '@/shared/database/connection';
import bcrypt from 'bcryptjs';
import type { PublicUserEntity, RegistrationProfileFields, Founder, FundingRound } from '../domain/types';

const PROFILE_FIELD_KEYS: (keyof RegistrationProfileFields)[] = [
  'category', 'other_category', 'website',
  's_name', 's_founded', 's_entity', 's_stage', 's_dpiit', 's_dpiit_number',
  's_team_size', 's_revenue_status', 's_pitch', 's_raising', 's_amount_seeking', 's_crunchbase', 's_tracxn',
  'i_firm', 'i_type', 'i_check_size', 'i_stage_focus', 'i_sector_focus', 'i_geo_focus',
  'a_program_name', 'a_duration', 'a_sector_focus', 'a_equity_taken',
  'c_platforms', 'c_niche', 'c_mediakit',
  'l_firm', 'l_practice_areas', 'l_jurisdiction', 'l_years_experience',
  'cs_firm', 'cs_membership_number', 'cs_services', 'cs_years_experience',
  'ib_firm', 'ib_years_experience', 'ib_deal_types',
  'bk_bank_name', 'bk_years_experience', 'bk_vertical',
  'g_organization', 'g_role',
];

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
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS last_newsletter_sent_date DATE NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS newsletter_unsubscribed TINYINT(1) NOT NULL DEFAULT 0`);

  // Registration-profile columns (category + per-category detail)
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS category VARCHAR(32) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS other_category VARCHAR(255) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS website VARCHAR(500) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS bio VARCHAR(300) NULL DEFAULT NULL`);
  // startup
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS s_name VARCHAR(255) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS s_founded INT NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS s_entity VARCHAR(32) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS s_stage VARCHAR(32) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS s_dpiit ENUM('yes','no') NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS s_dpiit_number VARCHAR(100) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS s_team_size VARCHAR(16) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS s_revenue_status VARCHAR(32) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS s_pitch VARCHAR(140) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS s_raising ENUM('yes','planning','no') NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS s_amount_seeking VARCHAR(100) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS s_crunchbase VARCHAR(500) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS s_tracxn VARCHAR(500) NULL DEFAULT NULL`);
  // investor / vc / pe / familyoffice
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS i_firm VARCHAR(255) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS i_type VARCHAR(64) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS i_check_size VARCHAR(32) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS i_stage_focus VARCHAR(32) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS i_sector_focus VARCHAR(255) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS i_geo_focus VARCHAR(255) NULL DEFAULT NULL`);
  // accelerator / incubator
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS a_program_name VARCHAR(255) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS a_duration VARCHAR(100) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS a_sector_focus VARCHAR(255) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS a_equity_taken DECIMAL(5,2) NULL DEFAULT NULL`);
  // creator / media
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS c_platforms VARCHAR(255) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS c_niche VARCHAR(255) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS c_mediakit VARCHAR(500) NULL DEFAULT NULL`);
  // lawyer
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS l_firm VARCHAR(255) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS l_practice_areas VARCHAR(255) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS l_jurisdiction VARCHAR(255) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS l_years_experience INT NULL DEFAULT NULL`);
  // CA/CS
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS cs_firm VARCHAR(255) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS cs_membership_number VARCHAR(100) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS cs_services VARCHAR(255) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS cs_years_experience INT NULL DEFAULT NULL`);
  // investment banker
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS ib_firm VARCHAR(255) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS ib_years_experience INT NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS ib_deal_types VARCHAR(255) NULL DEFAULT NULL`);
  // banker
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS bk_bank_name VARCHAR(255) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS bk_years_experience INT NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS bk_vertical VARCHAR(32) NULL DEFAULT NULL`);
  // generic (govt / consultant / coworking / university / student / other)
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS g_organization VARCHAR(255) NULL DEFAULT NULL`);
  await conn.query(`ALTER TABLE public_registrations ADD COLUMN IF NOT EXISTS g_role VARCHAR(255) NULL DEFAULT NULL`);

  // Safe way to modify ENUM if not already updated (try-catch because syntax can be tricky if it exists, but MODIFY is usually fine)
  try {
    await conn.query(`ALTER TABLE public_registrations MODIFY COLUMN auth_provider ENUM('email', 'google', 'linkedin') NOT NULL DEFAULT 'email'`);
  } catch (err) {
    // Ignore enum update error if it already has the values
  }

  await conn.query(`
    CREATE TABLE IF NOT EXISTS public_registration_founders (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      pub_user_id   INT NOT NULL,
      name          VARCHAR(255),
      role          VARCHAR(255),
      linkedin_url  VARCHAR(500),
      sort_order    INT NOT NULL DEFAULT 0,
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pub_user_id (pub_user_id),
      CONSTRAINT fk_founders_pub_user FOREIGN KEY (pub_user_id) REFERENCES public_registrations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS public_registration_funding_rounds (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      pub_user_id   INT NOT NULL,
      round_type    VARCHAR(32),
      amount        VARCHAR(100),
      lead_investor VARCHAR(255),
      round_date    VARCHAR(7),
      sort_order    INT NOT NULL DEFAULT 0,
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pub_user_id (pub_user_id),
      CONSTRAINT fk_rounds_pub_user FOREIGN KEY (pub_user_id) REFERENCES public_registrations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

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

export async function getStats(): Promise<{ total: number; emailCount: number; googleCount: number; activeToday: number }> {
  await ensureTable();
  const row = await queryOne<{ total: bigint | number; emailCount: bigint | number; googleCount: bigint | number; activeToday: bigint | number }>(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN auth_provider = 'email' THEN 1 ELSE 0 END) as emailCount,
      SUM(CASE WHEN auth_provider = 'google' THEN 1 ELSE 0 END) as googleCount,
      SUM(CASE WHEN last_login >= NOW() - INTERVAL 1 DAY THEN 1 ELSE 0 END) as activeToday
    FROM public_registrations`
  );
  return {
    total: Number(row?.total ?? 0),
    emailCount: Number(row?.emailCount ?? 0),
    googleCount: Number(row?.googleCount ?? 0),
    activeToday: Number(row?.activeToday ?? 0),
  };
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

export async function upsertGoogleUser(data: { googleId: string; name: string; email: string; country?: string; city?: string; timezone?: string }): Promise<{ user: PublicUserEntity; isNew: boolean }> {
  await ensureTable();

  // Check by Google ID first
  let user = await findByGoogleId(data.googleId);
  if (user) {
    await query(
      'UPDATE public_registrations SET last_login = NOW(), country = COALESCE(NULLIF(country, ""), ?), city = COALESCE(NULLIF(city, ""), ?), timezone = COALESCE(NULLIF(timezone, ""), ?) WHERE id = ?',
      [data.country || null, data.city || null, data.timezone || null, user.id]
    );
    return { user: { ...user, country: user.country || data.country, city: user.city || data.city }, isNew: false };
  }

  // Check if email exists — link it
  user = await findByEmail(data.email);
  if (user) {
    await query(
      'UPDATE public_registrations SET google_id = ?, last_login = NOW(), country = COALESCE(NULLIF(country, ""), ?), city = COALESCE(NULLIF(city, ""), ?), timezone = COALESCE(NULLIF(timezone, ""), ?) WHERE id = ?',
      [data.googleId, data.country || null, data.city || null, data.timezone || null, user.id]
    );
    return { user: { ...user, google_id: data.googleId, country: user.country || data.country, city: user.city || data.city }, isNew: false };
  }

  // Create new
  await query(
    'INSERT INTO public_registrations (name, email, google_id, country, city, timezone, auth_provider) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.name, data.email, data.googleId, data.country || null, data.city || null, data.timezone || null, 'google']
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

export async function markNewsletterSent(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await query(
    `UPDATE public_registrations SET last_newsletter_sent_date = CURDATE() WHERE id IN (${placeholders})`,
    ids
  );
}

export async function unsubscribeByEmail(email: string): Promise<{ found: boolean }> {
  await ensureTable();
  const user = await findByEmail(email);
  if (!user) return { found: false };
  await query('UPDATE public_registrations SET newsletter_unsubscribed = 1 WHERE email = ?', [email]);
  return { found: true };
}

export async function updateProfile(
  id: number,
  data: { phone?: string; country?: string; city?: string; linkedin_url?: string; bio?: string } & Partial<RegistrationProfileFields>
): Promise<void> {
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
  if (data.bio !== undefined) {
    fields.push('bio = ?');
    params.push(data.bio || null);
  }
  for (const key of PROFILE_FIELD_KEYS) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push((data[key] as string | number | null) ?? null);
    }
  }

  if (fields.length === 0) return;

  await ensureTable();
  params.push(id);
  await query(
    `UPDATE public_registrations SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
}

export async function replaceFounders(pubUserId: number, founders: Founder[]): Promise<void> {
  await ensureTable();
  await query('DELETE FROM public_registration_founders WHERE pub_user_id = ?', [pubUserId]);
  const rows = founders.filter((f) => f.name || f.role || f.linkedin_url);
  for (let i = 0; i < rows.length; i++) {
    const f = rows[i];
    await query(
      'INSERT INTO public_registration_founders (pub_user_id, name, role, linkedin_url, sort_order) VALUES (?, ?, ?, ?, ?)',
      [pubUserId, f.name || null, f.role || null, f.linkedin_url || null, i]
    );
  }
}

export async function replaceFundingRounds(pubUserId: number, rounds: FundingRound[]): Promise<void> {
  await ensureTable();
  await query('DELETE FROM public_registration_funding_rounds WHERE pub_user_id = ?', [pubUserId]);
  const rows = rounds.filter((r) => r.round_type || r.amount || r.lead_investor || r.round_date);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    await query(
      'INSERT INTO public_registration_funding_rounds (pub_user_id, round_type, amount, lead_investor, round_date, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [pubUserId, r.round_type || null, r.amount || null, r.lead_investor || null, r.round_date || null, i]
    );
  }
}

export async function getFounders(pubUserId: number): Promise<Founder[]> {
  await ensureTable();
  return query<Founder>('SELECT name, role, linkedin_url FROM public_registration_founders WHERE pub_user_id = ? ORDER BY sort_order ASC', [pubUserId]);
}

export async function getFundingRounds(pubUserId: number): Promise<FundingRound[]> {
  await ensureTable();
  return query<FundingRound>('SELECT round_type, amount, lead_investor, round_date FROM public_registration_funding_rounds WHERE pub_user_id = ? ORDER BY sort_order ASC', [pubUserId]);
}

export async function getProfileDetail(pubUserId: number): Promise<{ user: PublicUserEntity | null; founders: Founder[]; fundingRounds: FundingRound[] }> {
  await ensureTable();
  const user = await queryOne<PublicUserEntity>('SELECT * FROM public_registrations WHERE id = ? LIMIT 1', [pubUserId]);
  const founders = user?.category === 'startup' ? await getFounders(pubUserId) : [];
  const fundingRounds = user?.category === 'startup' ? await getFundingRounds(pubUserId) : [];
  return { user, founders, fundingRounds };
}
