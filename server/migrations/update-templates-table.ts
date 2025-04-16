import { sql } from "drizzle-orm";
import { db } from "../db";

/**
 * This migration adds the necessary columns to the templates table to support user association and block data
 */
export async function updateTemplatesTable() {
  console.log("Starting template table migration...");
  
  try {
    // Check if columns already exist to avoid errors
    const columnsResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'templates'
    `);
    
    const columns = columnsResult.rows.map((row: any) => row.column_name);
    console.log("Existing template columns:", columns);

    // Add user_id column if it doesn't exist
    if (!columns.includes('user_id')) {
      console.log("Adding user_id column to templates table");
      await db.execute(sql`
        ALTER TABLE templates 
        ADD COLUMN user_id INTEGER REFERENCES users(id)
      `);
    }

    // Add preview_image column if it doesn't exist
    if (!columns.includes('preview_image')) {
      console.log("Adding preview_image column to templates table");
      await db.execute(sql`
        ALTER TABLE templates 
        ADD COLUMN preview TEXT
      `);
    }

    // Add block_data column if it doesn't exist
    if (!columns.includes('block_data')) {
      console.log("Adding block_data column to templates table");
      await db.execute(sql`
        ALTER TABLE templates 
        ADD COLUMN block_data JSONB
      `);
    }

    // Add structure column if it doesn't exist
    if (!columns.includes('structure')) {
      console.log("Adding structure column to templates table");
      await db.execute(sql`
        ALTER TABLE templates 
        ADD COLUMN structure JSONB
      `);
    }

    // Add updated_at column if it doesn't exist
    if (!columns.includes('updated_at')) {
      console.log("Adding updated_at column to templates table");
      await db.execute(sql`
        ALTER TABLE templates 
        ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()
      `);
    }

    console.log("Template table migration completed successfully");
    return true;
  } catch (error) {
    console.error("Error during template table migration:", error);
    throw error;
  }
}