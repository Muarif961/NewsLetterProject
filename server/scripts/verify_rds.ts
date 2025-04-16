import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { downloadCertificate, CA_CERT_PATH } from './download_rds_cert.js';

dotenv.config();

async function verifyRDSConnection() {
  let client;
  try {
    // Ensure we have the CA certificate
    await downloadCertificate();

    // Read the CA certificate
    const ca = await fs.readFile(CA_CERT_PATH, 'utf-8');

    client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        ca,
        rejectUnauthorized: true // Enable proper certificate validation
      }
    });

    console.log('Attempting to connect to database...');
    await client.connect();
    console.log('Successfully connected to database!\n');

    // Check table counts
    const tables = ['users', 'newsletters', 'subscribers', 'templates'];
    console.log('Checking table record counts:');
    console.log('-----------------------------');

    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table}: ${result.rows[0].count} records`);
    }

    // Test basic operations
    console.log('\nTesting basic database operations:');
    console.log('-----------------------------');

    // Sample query to check user data
    const userResult = await client.query('SELECT id, email FROM users LIMIT 1');
    if (userResult.rows.length > 0) {
      console.log('✓ Can query user data');
    }

    // Check indexes
    console.log('\nVerifying database indexes:');
    console.log('-----------------------------');
    const indexResult = await client.query(`
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    indexResult.rows.forEach(row => {
      console.log(`${row.tablename}: ${row.indexname}`);
    });

  } catch (error: any) {
    console.error('Error during verification:', error.message);
    throw error;
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Run verification if this script is executed directly
if (import.meta.url.endsWith(process.argv[1])) {
  verifyRDSConnection().catch(console.error);
}