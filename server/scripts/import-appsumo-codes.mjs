import XLSX from 'xlsx';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function importAppSumoCodes() {
  try {
    // Read the Excel file
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile(path.join(__dirname, '../../attached_assets/AppSumo_Codes.xlsx'));
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get the data as an array of rows
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      blankrows: false,
      raw: true
    });

    // Remove header row and filter out any empty rows
    const codes = rows
      .slice(1) // Skip header row
      .filter(row => row.length > 0 && row[0]) // Filter out empty rows
      .map(row => {
        // Convert number to padded string
        const code = row[0].toString().padStart(5, '0');
        return { code, tier: 'starter' }; // All codes are starter by default
      });

    console.log(`Found ${codes.length} valid codes to import`);
    console.log('Sample codes:', codes.slice(0, 5));

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert codes in batches of 100
      const batchSize = 100;
      let insertedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < codes.length; i += batchSize) {
        const batch = codes.slice(i, i + batchSize);

        // Create individual insert statements for better error handling
        for (const { code, tier } of batch) {
          try {
            const result = await client.query(
              `INSERT INTO appsumo_codes (code, tier, is_redeemed, created_at)
               VALUES ($1, $2, false, CURRENT_TIMESTAMP)
               ON CONFLICT (code) DO NOTHING
               RETURNING id;`,
              [code, tier]
            );

            if (result.rowCount > 0) {
              insertedCount++;
              if (insertedCount % 100 === 0) {
                console.log(`Progress: Imported ${insertedCount} codes...`);
              }
            } else {
              skippedCount++;
            }
          } catch (err) {
            console.error(`Error inserting code ${code}:`, err);
            throw err;
          }
        }

        // Log progress
        console.log(`Processed ${i + batch.length} of ${codes.length} codes...`);
      }

      await client.query('COMMIT');

      console.log(`
Import completed successfully:
- Total codes found: ${codes.length}
- Successfully imported: ${insertedCount}
- Skipped (duplicates): ${skippedCount}
      `);

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Transaction error:', err);
      throw err;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error importing AppSumo codes:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the import
importAppSumoCodes();