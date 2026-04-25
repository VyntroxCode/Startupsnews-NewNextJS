import { query, queryOne, closeDbConnection } from '@/shared/database/connection';
import bcrypt from 'bcryptjs';

async function migrateUsersTable() {
  console.log('Starting database migration for author features...\n');

  try {
    // Check if author_description column exists
    const columnCheck = await queryOne<{ COLUMN_NAME?: string }>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'users' 
       AND COLUMN_NAME = 'author_description' 
       AND TABLE_SCHEMA = DATABASE()`
    );

    if (columnCheck?.COLUMN_NAME === 'author_description') {
      console.log('✓ author_description column already exists');
    } else {
      console.log('Adding author_description column to users table...');
      try {
        await query(
          `ALTER TABLE users ADD COLUMN author_description LONGTEXT NULL DEFAULT NULL AFTER avatar_url`
        );
        console.log('✓ author_description column added successfully\n');
      } catch (err: any) {
        if (err.message?.includes('Duplicate column')) {
          console.log('✓ author_description column already exists\n');
        } else {
          throw err;
        }
      }
    }

    const defaultColumnCheck = await queryOne<{ COLUMN_NAME?: string }>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'users' 
       AND COLUMN_NAME = 'is_default_author' 
       AND TABLE_SCHEMA = DATABASE()`
    );

    if (defaultColumnCheck?.COLUMN_NAME === 'is_default_author') {
      console.log('✓ is_default_author column already exists');
    } else {
      console.log('Adding is_default_author column to users table...');
      try {
        await query(
          `ALTER TABLE users ADD COLUMN is_default_author TINYINT(1) NOT NULL DEFAULT 0 AFTER author_description`
        );
        console.log('✓ is_default_author column added successfully\n');
      } catch (err: any) {
        if (err.message?.includes('Duplicate column')) {
          console.log('✓ is_default_author column already exists\n');
        } else {
          throw err;
        }
      }
    }

    // Check if Team StartupNews.fyi exists
    const teamAuthor = await queryOne<{ id: number }>(
      `SELECT id FROM users WHERE email = 'team@startupnews.fyi'`
    );

    if (teamAuthor) {
      console.log('✓ Team StartupNews.fyi author already exists (ID:', teamAuthor.id, ')\n');
      await query('UPDATE users SET is_default_author = 0 WHERE role = ?', ['author']);
      await query('UPDATE users SET is_default_author = 1 WHERE id = ?', [teamAuthor.id]);
      console.log('✓ Team StartupNews.fyi set as default author\n');
    } else {
      console.log('Creating Team StartupNews.fyi default author...');
      
      const passwordHash = await bcrypt.hash('TeamStartupNews@2024!', 10);

      await query(
        `INSERT INTO users (
          email, password_hash, name, role, avatar_url, author_description, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          'team@startupnews.fyi',
          passwordHash,
          'Team StartupNews.fyi',
          'author',
          'https://startupnews.fyi/images/team-logo.svg',
          'Global startup and technology media platform covering venture funding, innovation, and emerging technologies.',
          true
        ]
      );

      const created = await queryOne<{ id: number }>(
        `SELECT id FROM users WHERE email = 'team@startupnews.fyi'`
      );
      await query('UPDATE users SET is_default_author = 0 WHERE role = ?', ['author']);
      if (created?.id) {
        await query('UPDATE users SET is_default_author = 1 WHERE id = ?', [created.id]);
      }
      console.log('✓ Team StartupNews.fyi author created successfully (ID:', created?.id, ')\n');
    }

    console.log('✓ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. The backend is now ready to support author descriptions');
    console.log('2. Visit /admin/authors to create and manage authors');
    console.log('3. When creating new posts, select an author (defaults to Team StartupNews.fyi)');
    console.log('4. Each author can have a name, profile photo (avatar), and description\n');
    
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await closeDbConnection();
  }
}

migrateUsersTable();
