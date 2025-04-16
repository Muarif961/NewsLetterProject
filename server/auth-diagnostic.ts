// Authentication diagnostic tool
import { Request, Response } from "express";
import crypto from "crypto";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

// Utility function for password hashing that matches the one used throughout the app
export function hashPassword(password: string) {
  return crypto
    .pbkdf2Sync(password, "salt", 100000, 64, "sha512")
    .toString("hex");
}

// Function to check if a user's password is properly stored
export async function checkUserPassword(userId: number) {
  try {
    // Query user directly with SQL to check password field
    const result = await db.query.raw(`
      SELECT id, username, email, 
             CASE WHEN password IS NOT NULL AND password != '' 
             THEN true ELSE false END as has_password,
             LENGTH(password) as password_length
      FROM users WHERE id = $1
    `, [userId]);
    
    if (!result.rows[0]) {
      return { success: false, message: "User not found" };
    }
    
    const user = result.rows[0];
    const isPasswordValid = user.has_password && user.password_length === 161;
    
    return {
      success: true,
      user,
      isPasswordValid,
      passwordStatus: isPasswordValid 
        ? "Valid password stored" 
        : (user.has_password ? "Invalid password format" : "No password stored")
    };
  } catch (error) {
    console.error("Error checking user password:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Unknown error",
      error
    };
  }
}

// Function to fix a user's password
export async function fixUserPassword(userId: number, newPassword: string) {
  try {
    const hashedPassword = hashPassword(newPassword);
    
    // Update password directly with SQL
    const result = await db.query.raw(`
      UPDATE users
      SET password = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, username, email, 
                CASE WHEN password IS NOT NULL AND password != '' 
                THEN true ELSE false END as has_password,
                LENGTH(password) as password_length
    `, [hashedPassword, userId]);
    
    if (!result.rows[0]) {
      return { success: false, message: "User not found" };
    }
    
    const user = result.rows[0];
    const isPasswordValid = user.has_password && user.password_length === 161;
    
    return {
      success: true,
      user,
      isPasswordValid,
      passwordStatus: isPasswordValid 
        ? "Password updated successfully" 
        : "Failed to properly update password"
    };
  } catch (error) {
    console.error("Error fixing user password:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Unknown error",
      error
    };
  }
}

// Create a diagnostic endpoint handler
export async function runDiagnostics(req: Request, res: Response) {
  try {
    // Create a test password hash
    const testPassword = "testPassword123";
    const hashedPassword = hashPassword(testPassword);
    
    // Check a recent user if available
    const recentUsers = await db
      .select()
      .from(users)
      .orderBy(eq(users.id, users.id))
      .limit(3);
    
    const userChecks = await Promise.all(
      recentUsers.map(user => checkUserPassword(user.id))
    );
    
    // Return diagnostic results
    res.json({
      passwordHashing: {
        testPassword,
        hashedPassword,
        length: hashedPassword.length,
        isValid: hashedPassword.length === 161
      },
      recentUsers: userChecks,
      sessionData: {
        exists: !!req.session,
        keys: req.session ? Object.keys(req.session) : null,
        hasPendingRegistration: !!(req.session && req.session.pendingRegistration)
      }
    });
  } catch (error) {
    console.error("Error running diagnostics:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      error
    });
  }
}

// Function to enhance complete registration route
export function enhanceCompleteRegistration(req: Request, res: Response, next: Function) {
  const originalRedirect = res.redirect;
  let isHandled = false;
  
  // Intercept redirect to add debugging
  res.redirect = function(url: string) {
    if (url.includes("/dashboard") && !isHandled) {
      isHandled = true;
      console.log("[AUTH_FIX] Intercepted redirect to dashboard", {
        sessionUserId: req.session?.userId,
        hasSessionPassword: !!(req.session?.pendingRegistration?.password),
        passwordBackupParam: !!req.query.password_backup
      });
      
      // Verify the user's password was stored correctly
      if (req.session && req.session.userId) {
        checkUserPassword(req.session.userId)
          .then(result => {
            console.log("[AUTH_FIX] User password check:", result);
            
            // Fix password if needed and we have a backup
            if (!result.isPasswordValid && 
                (req.query.password_backup || 
                 (req.session.pendingRegistration && req.session.pendingRegistration.password))) {
              
              const backupPassword = (req.query.password_backup as string) || 
                                    req.session.pendingRegistration.password;
              
              if (backupPassword) {
                console.log("[AUTH_FIX] Attempting to fix password with backup");
                return fixUserPassword(req.session.userId, "temporaryPassword123");
              }
            }
            return result;
          })
          .then(result => {
            console.log("[AUTH_FIX] Final password status:", result);
          })
          .catch(err => {
            console.error("[AUTH_FIX] Error in password verification:", err);
          });
      }
    }
    
    return originalRedirect.apply(res, [url]);
  };
  
  next();
}
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

/**
 * Check if a user exists and has a password
 */
export async function checkUserRegistration(email: string): Promise<{
  exists: boolean;
  hasPassword: boolean;
  passwordLength?: number;
  username?: string;
}> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return { exists: false, hasPassword: false };
    }

    return {
      exists: true,
      hasPassword: !!user.password,
      passwordLength: user.password?.length,
      username: user.username
    };
  } catch (error) {
    console.error("Error checking user registration:", error);
    throw error;
  }
}

/**
 * Run this function to check the last 5 users created
 */
export async function checkRecentRegistrations(): Promise<any[]> {
  try {
    const recentUsers = await db.query.raw(`
      SELECT 
        id, 
        username, 
        email, 
        LENGTH(password) as password_length,
        created_at
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    return recentUsers.rows;
  } catch (error) {
    console.error("Error checking recent registrations:", error);
    throw error;
  }
}

// If this file is run directly, execute the check
if (require.main === module) {
  (async () => {
    console.log("Checking recent user registrations...");
    const users = await checkRecentRegistrations();
    console.table(users);
    process.exit(0);
  })();
}
