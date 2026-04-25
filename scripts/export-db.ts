/**
 * Database Export Script
 * 
 * Exports the entire database to a SQL dump file.
 * This can be used to backup or transfer data to a new PC.
 * 
 * Usage: tsx scripts/export-db.ts [output-file]
 * Example: tsx scripts/export-db.ts database-backup.sql
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

async function exportDatabase() {
  const outputFile = process.argv[2] || 'database-backup.sql';
  const outputPath = path.resolve(process.cwd(), outputFile);

  console.log('📦 Starting database export...\n');

  try {
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

    console.log(`📊 Exporting database: ${dbName}`);
    console.log(`📁 Output file: ${outputPath}\n`);

    // Export database using mysqldump
    const command = `docker exec zox-mariadb mysqldump -u ${dbUser} -p${dbPassword} ${dbName}`;

    const { stdout } = await execAsync(command);
    
    // Write output to file
    fs.writeFileSync(outputPath, stdout);

    // Check if file was created
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log('✅ Database exported successfully!');
      console.log(`📦 File: ${outputPath}`);
      console.log(`📏 Size: ${fileSizeMB} MB\n`);
      console.log('💡 To import on another PC:');
      console.log(`   docker exec -i zox-mariadb mysql -u ${dbUser} -p${dbPassword} ${dbName} < ${outputFile}\n`);
    } else {
      console.error('❌ Error: Export file was not created.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error exporting database:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

exportDatabase();

