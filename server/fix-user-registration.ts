import { db } from "./db";
import dotenv from "dotenv";
import { sql } from "drizzle-orm";

dotenv.config();

async function testUserRegistration() {
  try {
    console.log("=== USER REGISTRATION FIX ===");
    
    // 1. Get table column names for reference
    const columnsResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    const columnNames = columnsResult.rows.map((row: any) => row.column_name);
    console.log("Available columns:", columnNames);
    
    // 2. Create a test user with a safe query using sql template tag
    const testUser = {
      username: "test_user_" + Date.now(),
      email: `test${Date.now()}@example.com`,
      full_name: "Test User",
      password: "hashed_password_example"
    };
    
    // Use parameterized query with sql template tag
    console.log("Creating test user with parameterized sql template tag...");
    const insertResult = await db.execute(sql`
      INSERT INTO users (username, email, full_name, password, created_at, updated_at)
      VALUES (${testUser.username}, ${testUser.email}, ${testUser.full_name}, ${testUser.password}, NOW(), NOW())
      RETURNING id, username, email
    `);
    
    if (insertResult.rows && insertResult.rows.length > 0) {
      const userId = insertResult.rows[0].id;
      console.log("Test user created successfully:", insertResult.rows[0]);
      
      // Delete the test user with sql template tag
      await db.execute(sql`DELETE FROM users WHERE id = ${userId}`);
      console.log("Test user deleted to keep database clean");
    } else {
      console.log("No rows returned from insertion, this is unusual");
    }
    
    // Now try with positional parameter query to see if it works
    console.log("\nTrying with positional parameter query...");
    const testUser2 = {
      username: "test_user_param_" + Date.now(),
      email: `test_param_${Date.now()}@example.com`,
      full_name: "Test User Parameterized",
      password: "hashed_password_example"
    };
    
    try {
      const paramResult = await db.execute(
        "INSERT INTO users (username, email, full_name, password, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, username, email",
        [testUser2.username, testUser2.email, testUser2.full_name, testUser2.password]
      );
      console.log("Positional parameter query successful:", paramResult.rows[0]);
      
      // Clean up with positional parameter
      await db.execute("DELETE FROM users WHERE id = $1", [paramResult.rows[0].id]);
    } catch (paramError) {
      console.error("Positional parameter query error:", paramError);
      console.log("The db.execute function might not be handling positional parameter queries correctly");
    }
    
    console.log("\n=== RECOMMENDED FIX FOR SUBSCRIPTIONS ROUTE ===");
    console.log(`
    In subscriptions.ts, you should modify the query to use drizzle-orm's sql template tag:
    
    // First import the sql template tag
    import { sql } from "drizzle-orm";
    
    // Then use it in your queries
    const result = await db.execute(sql\`
      INSERT INTO users (username, email, full_name, password, created_at, updated_at)
      VALUES (\${username}, \${email}, \${fullName}, \${userPassword}, NOW(), NOW())
      RETURNING id, username, email
    \`);
    
    // The database driver will handle proper escaping and parameter binding
    `);
    
    console.log("=== END OF FIX ===");
  } catch (error) {
    console.error("Error during test:", error);
  }
}

if (import.meta.url.endsWith(process.argv[1])) {
  testUserRegistration().catch(console.error).finally(() => process.exit(0));
}

export { testUserRegistration };
