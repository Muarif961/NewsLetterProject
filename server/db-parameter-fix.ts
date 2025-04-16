
import { db } from "./db";

// Test different query methods to identify where the issue is
async function testParameterizedQueries() {
  console.log("=== DB PARAMETER TEST ===");
  
  // Generate test data
  const testUser = {
    username: `test_user_${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    fullName: "Test User",
    password: "test_password_hash_would_be_here"
  };

  console.log("Test 1: Direct string interpolation (no parameters)");
  try {
    const result1 = await db.execute(`
      INSERT INTO users (username, email, full_name, password, created_at, updated_at)
      VALUES ('${testUser.username}', '${testUser.email}', '${testUser.fullName}', '${testUser.password}', NOW(), NOW())
      RETURNING id, username, email
    `);
    
    console.log("✅ Success with direct string interpolation:", result1.rows[0]);
    
    // Clean up
    await db.execute(`DELETE FROM users WHERE id = ${result1.rows[0].id}`);
  } catch (error) {
    console.error("❌ Error with direct string interpolation:", error);
  }

  console.log("\nTest 2: Positional parameters ($1, $2, etc.)");
  try {
    const result2 = await db.execute(`
      INSERT INTO users (username, email, full_name, password, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, username, email
    `, [testUser.username, testUser.email, testUser.fullName, testUser.password]);
    
    console.log("✅ Success with positional parameters:", result2.rows[0]);
    
    // Clean up
    await db.execute(`DELETE FROM users WHERE id = ${result2.rows[0].id}`);
  } catch (error) {
    console.error("❌ Error with positional parameters:", error);
  }

  console.log("\nTest 3: Named parameters (:name, :email, etc.)");
  try {
    const result3 = await db.execute(`
      INSERT INTO users (username, email, full_name, password, created_at, updated_at)
      VALUES (:username, :email, :fullName, :password, NOW(), NOW())
      RETURNING id, username, email
    `, {
      username: testUser.username,
      email: testUser.email,
      fullName: testUser.fullName,
      password: testUser.password
    });
    
    console.log("✅ Success with named parameters:", result3.rows[0]);
    
    // Clean up
    await db.execute(`DELETE FROM users WHERE id = ${result3.rows[0].id}`);
  } catch (error) {
    console.error("❌ Error with named parameters:", error);
  }

  console.log("\nTest 4: Query builder (if available)");
  try {
    const result4 = await db.insert("users").values({
      username: testUser.username,
      email: testUser.email,
      full_name: testUser.fullName,
      password: testUser.password,
      created_at: new Date(),
      updated_at: new Date()
    }).returning(["id", "username", "email"]);
    
    console.log("✅ Success with query builder:", result4[0]);
    
    // Clean up
    await db.execute(`DELETE FROM users WHERE id = ${result4[0].id}`);
  } catch (error) {
    console.error("❌ Error with query builder:", error);
  }

  console.log("\n=== CONCLUSION ===");
  console.log("Based on the tests above, use the method that worked successfully to fix your registration process.");
  console.log("If direct string interpolation worked, update the code to use that method consistently.");
}

// Run the test if executed directly
if (import.meta.url.endsWith(process.argv[1])) {
  testParameterizedQueries().catch(console.error).finally(() => process.exit(0));
}
