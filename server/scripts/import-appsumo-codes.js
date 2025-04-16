const XLSX = require('xlsx');
const { Pool } = require('pg');
const path = require('path');

// Initialize PostgreSQL connection to RDS
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: require('fs').readFileSync(path.join(__dirname, '..', 'certs', 'rds-ca-bundle.pem')).toString(),
  }
});

async function importAppSumoCodes() {
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(path.join(__dirname, '../../attached_assets/AppSumo_Codes.xlsx'));
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Prepare batch insert query
      const insertQuery = `
        INSERT INTO appsumo_codes (code, plan_tier)
        VALUES ($1, $2)
        ON CONFLICT (code) DO NOTHING
      `;

      // Process each row
      for (const row of data) {
        // Assuming Excel columns are 'code' and 'plan_tier'
        const code = row.code || row.Code; // Handle different possible column names
        const planTier = row.plan_tier || row.Plan || row['Plan Tier']; // Handle different possible column names

        if (code && planTier) {
          await client.query(insertQuery, [code.toString().trim(), planTier.toString().trim()]);
        }
      }

      await client.query('COMMIT');
      console.log('Successfully imported AppSumo codes to RDS');

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error importing AppSumo codes to RDS:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importAppSumoCodes();