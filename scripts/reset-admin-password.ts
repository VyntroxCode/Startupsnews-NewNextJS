/**
 * Reset/seed the admin login directly in the database (no .env credentials involved).
 * Creates the user if missing; updates password and role if existing.
 * Use when dashboard login fails (wrong password or no admin in DB).
 *
 * Usage: npx tsx scripts/reset-admin-password.ts
 */

import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '../src/shared/database/connection';
import bcrypt from 'bcryptjs';

loadEnvConfig(process.cwd());

const ADMIN_EMAIL = 'admin@startupnews.fyi';
const ADMIN_PASSWORD = 'Admin@StartupNews2026!';
const ADMIN_NAME = 'Admin User';

async function main() {
  const email = ADMIN_EMAIL;
  const password = ADMIN_PASSWORD;
  const name = ADMIN_NAME;

  console.log('\n🔐 Reset admin user for dashboard login\n');
  console.log('   Email:', email);

  const existing = (await query<{ id: number }>('SELECT id FROM users WHERE email = ?', [email])) as Array<{ id: number }>;
  const passwordHash = await bcrypt.hash(password, 10);

  if (existing.length > 0) {
    await query(
      'UPDATE users SET password_hash = ?, name = ?, role = ?, is_active = TRUE WHERE id = ?',
      [passwordHash, name, 'admin', existing[0].id]
    );
    console.log('   ✅ Admin user updated\n');
  } else {
    await query(
      `INSERT INTO users (email, password_hash, name, role, is_active) VALUES (?, ?, ?, 'admin', TRUE)`,
      [email, passwordHash, name]
    );
    console.log('   ✅ Admin user created\n');
  }

  console.log('   Use these credentials to log in at /admin/login');
  console.log('   Email:    ', email);
  console.log('   Password: ', password, '\n');
}

main()
  .then(() => closeDbConnection())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
