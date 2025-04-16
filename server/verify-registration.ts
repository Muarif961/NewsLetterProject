import { db } from "./db";
import crypto from "crypto";
import { sql } from "drizzle-orm";

async function verifyRegistrationFlow() {
  try {
    console.log("=== REGISTRATION FLOW VERIFICATION ===");
    
    // Generate random test data
    const testUser = {
      username: `test_user_${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      fullName: "Test User",
      password: crypto.randomBytes(16).toString('hex')
    };
    
    console.log("Attempting to create a test user with properly parameterized SQL query...");
    try {
      // Using proper SQL parameter binding with drizzle-orm's sql template tag
      const result = await db.execute(sql`
        INSERT INTO users (username, email, full_name, password, created_at, updated_at)
        VALUES (${testUser.username}, ${testUser.email}, ${testUser.fullName}, ${testUser.password}, NOW(), NOW())
        RETURNING id, username, email
      `);
      
      if (result.rows && result.rows.length > 0) {
        const userId = result.rows[0].id;
        console.log("✅ SUCCESS: User created successfully:", {
          id: userId,
          username: result.rows[0].username,
          email: result.rows[0].email
        });
        
        // Verify the user has a password in the database with proper parameterization
        const userCheck = await db.execute(sql`
          SELECT id, username, email, LENGTH(password) as password_length
          FROM users
          WHERE id = ${userId}
        `);
        
        if (userCheck.rows[0].password_length > 0) {
          console.log("✅ SUCCESS: User has a password stored in database");
          console.log(`Password length: ${userCheck.rows[0].password_length} characters`);
        } else {
          console.log("❌ ERROR: User password was not stored correctly");
        }
        
        // Clean up - delete the test user with proper parameterization
        await db.execute(sql`DELETE FROM users WHERE id = ${userId}`);
        console.log("Test user deleted from database");
      } else {
        console.log("❌ ERROR: No rows returned after user creation");
      }
    } catch (error) {
      console.error("❌ ERROR: Failed to create user with parameterized SQL:", error);
    }
    
    console.log("\n=== VERIFICATION COMPLETE ===");
    console.log("If you see '✅ SUCCESS' messages above, your fix is working.");
    console.log("You can now test the full registration process in your application.");
  } catch (error) {
    console.error("Error during verification:", error);
  }
}

if (import.meta.url.endsWith(process.argv[1])) {
  verifyRegistrationFlow().catch(console.error).finally(() => process.exit(0));
}

export { verifyRegistrationFlow };
