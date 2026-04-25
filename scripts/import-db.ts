/**
 * Database Import Script
 * 
 * Imports a SQL dump file into the database.
 * This can be used to restore data from a backup or transfer from another PC.
 * 
 * Usage: tsx scripts/import-db.ts [input-file]
 * Example: tsx scripts/import-db.ts database-backup.sql
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

async function importDatabase() {
  const inputFile = process.argv[2];

  if (!inputFile) {
    console.error('❌ Error: Please provide a SQL file to import.');
    console.error('   Usage: tsx scripts/import-db.ts <database-backup.sql>\n');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), inputFile);

  console.log('📥 Starting database import...\n');

  try {
    // Check if file exists
    if (!fs.existsSync(inputPath)) {
      console.error(`❌ Error: File not found: ${inputPath}\n`);
      process.exit(1);
    }

    // Check if Docker container is running
    try {
      await execAsync('docker ps --filter name=zox-mariadb --format "{{.Names}}"');
    } catch {
      console.error('❌ Error: MariaDB container (zox-mariadb) is not running.');
      console.error('   Please start Docker services first: npm run docker:up\n');
      process.exit(1);
    }

    const dbUser = process.env.DB_USER || 'zox_user';
    const dbPassword = process.env.DB_PASSWORD || 'zox_password';
    const dbName = process.env.DB_NAME || 'zox_db';

    const stats = fs.statSync(inputPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`📊 Importing to database: ${dbName}`);
    console.log(`📁 Input file: ${inputPath}`);
    console.log(`📏 File size: ${fileSizeMB} MB\n`);

    // Confirm before proceeding
    console.log('⚠️  WARNING: This will overwrite existing data in the database!');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Import database using mysql
    // Use spawn to pipe the SQL file content to mysql
    console.log('📥 Importing data...');
    
    await new Promise<void>((resolve, reject) => {
      const mysqlProcess = spawn('docker', [
        'exec', '-i',
        'zox-mariadb',
        'mysql',
        '-u', dbUser,
        `-p${dbPassword}`,
        dbName
      ]);

      const fileStream = fs.createReadStream(inputPath);
      fileStream.pipe(mysqlProcess.stdin);

      let errorOutput = '';
      mysqlProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      mysqlProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`MySQL import failed with code ${code}: ${errorOutput}`));
        }
      });

      mysqlProcess.on('error', (error) => {
        reject(error);
      });
    });

    console.log('\n✅ Database imported successfully!\n');
    console.log('💡 You may need to restart the application to see the changes.\n');
  } catch (error) {
    console.error('❌ Error importing database:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

importDatabase();

