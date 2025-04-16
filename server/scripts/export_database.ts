import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

// Convert import.meta.url to directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TABLES = [
  'users',
  'newsletters',
  'templates',
  'subscribers',
  'notifications',
  'sent_newsletters',
  'api_keys',
  'verified_emails',
  'user_feedback',
  'appsumo_codes',
  'user_subscriptions',
  'user_credits',
  'credit_transactions',
  'credit_purchases'
];

async function exportDatabase() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '..', 'db_backups');

    // Create backup directory if it doesn't exist
    await fs.mkdir(backupDir, { recursive: true });

    const schemaFile = path.join(backupDir, `schema_${timestamp}.sql`);
    const dataFile = path.join(backupDir, `data_${timestamp}.sql`);

    console.log('Starting RDS database export...');
    console.log('Backup directory:', backupDir);

    // Export schema (without data)
    console.log('Exporting schema from RDS...');
    await execAsync(`pg_dump --schema-only --no-owner --no-privileges "${process.env.DATABASE_URL}" > "${schemaFile}"`);

    // Export data for specific tables
    console.log('Exporting table data from RDS...');
    const tableArgs = TABLES.map(table => `-t ${table}`).join(' ');
    await execAsync(`pg_dump --data-only --no-owner --no-privileges ${tableArgs} "${process.env.DATABASE_URL}" > "${dataFile}"`);

    console.log('\nRDS Database export completed successfully!');
    console.log('Files created:');
    console.log(`Schema: ${schemaFile}`);
    console.log(`Data: ${dataFile}`);

    // Verify file sizes
    const schemaStats = await fs.stat(schemaFile);
    const dataStats = await fs.stat(dataFile);

    console.log('\nFile sizes:');
    console.log(`Schema: ${(schemaStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Data: ${(dataStats.size / 1024 / 1024).toFixed(2)} MB`);

    return {
      schemaFile,
      dataFile,
      timestamp
    };
  } catch (error: any) {
    console.error('Error exporting RDS database:', error.message);
    throw error;
  }
}

async function importToRDS(connectionString: string, schemaFile: string, dataFile: string) {
  try {
    console.log('Starting database import to RDS...');

    // Import schema
    console.log('Importing schema to RDS...');
    await execAsync(`psql "${connectionString}" < "${schemaFile}"`);

    // Import data
    console.log('Importing data to RDS...');
    await execAsync(`psql "${connectionString}" < "${dataFile}"`);

    console.log('Database import to RDS completed successfully!');
  } catch (error: any) {
    console.error('Error importing database to RDS:', error.message);
    throw error;
  }
}

export { exportDatabase, importToRDS };

// If this file is being run directly
if (import.meta.url.endsWith(process.argv[1])) {
  exportDatabase().catch(console.error);
}