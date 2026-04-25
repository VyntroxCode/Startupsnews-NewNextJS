/**
 * Database Migration Script
 * 
 * This script runs the database initialization SQL file
 * Usage: npm run db:migrate
 */

import { getDbConnection, closeDbConnection } from '../src/shared/database/connection';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { loadEnvConfig } from '@next/env';

// Load environment variables from .env.local
loadEnvConfig(process.cwd());

async function migrateDatabase() {
  console.log('🔄 Running database migrations...\n');

  try {
    const conn = await getDbConnection();
    const connection = await conn.getConnection();

    try {
      // Read the init SQL file
      const sqlPath = join(process.cwd(), 'scripts', 'init-db.sql');
      const sql = await readFile(sqlPath, 'utf-8');

      // Remove valid comments (lines starting with --)
      const cleanSql = sql
        .split('\n')
        .filter(line => !line.trim().startsWith('--')) // Remove comment lines
        .join('\n');

      // Split by semicolons and execute each statement
      const statements = cleanSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      console.log(`📄 Found ${statements.length} SQL statements to execute\n`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        console.log(`Debug Statement ${i + 1}: ${statement.substring(0, 50)}...`);
        if (statement.trim()) {
          try {
            await connection.query(statement);
            console.log(`   ✅ Statement ${i + 1}/${statements.length} executed`);
          } catch (error) {
            // Ignore "table already exists" errors
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (errorMessage.includes('already exists') || errorMessage.includes('Duplicate')) {
              console.log(`   ⏭️  Statement ${i + 1}/${statements.length} skipped (already exists)`);
            } else {
              console.error(`   ❌ Error in statement ${i + 1}:`, errorMessage);
            }
          }
        }
      }

      console.log('\n✅ Database migration completed successfully!\n');
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('\n❌ Error running migrations:', error);
    process.exit(1);
  } finally {
    await closeDbConnection();
  }
}

// Run migration
migrateDatabase().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

