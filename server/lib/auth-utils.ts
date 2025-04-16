import crypto from 'crypto';
import { db } from '../db';
import { Session } from 'express-session';

// Length constants for consistent validation
const HASH_LENGTH = 128;
const SALT_LENGTH = 32;
const HASH_SALT_LENGTH = HASH_LENGTH + 1 + SALT_LENGTH; // 161 (128 + '.' + 32)

/**
 * Hash a password with a random salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
  return `${hash}.${salt}`;
}

/**
 * Compare a password against a stored hash
 */
export function comparePassword(
  providedPassword: string,
  storedPassword: string
): boolean {
  if (!storedPassword.includes('.')) {
    console.error('Invalid password format (missing salt separator)');
    return false;
  }

  const [hash, salt] = storedPassword.split('.');
  const providedHash = crypto
    .pbkdf2Sync(providedPassword, salt, 1000, 64, 'sha512')
    .toString('hex');
  return hash === providedHash;
}

/**
 * Extract or validate password from session
 */
export function extractPassword(session: Session): string | null {
  let userPassword: string | null = null;

  if (session.password) {
    userPassword = session.password;
  } else if (session.pendingRegistration?.password) {
    userPassword = session.pendingRegistration.password;
  }

  // Check if we're dealing with a plain text password or hash without salt (needs proper hashing)
  if (userPassword) {
    // If it's a plain text password
    if (userPassword.length < 100) {
      console.log('[REGISTRATION] Plain text password detected, hashing now');
      userPassword = hashPassword(userPassword);
      console.log(`[REGISTRATION] Password hashed, new length: ${userPassword.length}`);
    } 
    // If it's already a hash but missing salt separator
    else if (!userPassword.includes('.')) {
      console.log('[REGISTRATION] Hash without salt detected, generating proper hash');
      // Generate a random salt
      const salt = crypto.randomBytes(16).toString('hex');
      // Append salt to existing hash
      userPassword = `${userPassword}.${salt}`;
      console.log(`[REGISTRATION] Updated hash with salt, new length: ${userPassword.length}`);
    }
    // If hash length is not in expected range, regenerate it
    else if (userPassword.length < 160 || userPassword.length > 200) {
      console.log(`[REGISTRATION] Invalid password hash length: ${userPassword.length}, regenerating`);
      userPassword = hashPassword(`temporaryPassword${Math.random().toString(36).slice(2, 10)}`);
      console.log(`[REGISTRATION] Regenerated hash, new length: ${userPassword.length}`);
    }
  } else {
    // If no password provided, generate a temporary one
    console.log('[REGISTRATION] No password found, generating temporary password');
    userPassword = hashPassword(`temporaryPassword${Math.random().toString(36).slice(2, 10)}`);
  }

  console.log(`[REGISTRATION] Final password format check: length=${userPassword?.length}, has_salt=${userPassword?.includes('.')}`);

  return userPassword;
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): boolean {
  // Password should be at least 8 characters
  if (password.length < 8) {
    return false;
  }

  // Password should contain at least one number
  if (!/\d/.test(password)) {
    return false;
  }

  // Password should contain at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return false;
  }

  return true;
}

/**
 * Check if a user exists with the given email
 */
export async function userExistsByEmail(email: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, email),
  });
  return !!user;
}

/**
 * Check if a user exists with the given username
 */
export async function userExistsByUsername(username: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.username, username),
  });
  return !!user;
}

/**
 * Verify a user was created with the correct password format
 */
export async function verifyUserCreation(userId: number) {
  try {
    // Verify password was stored correctly using direct string interpolation
    // to avoid parameter binding issues
    const result = await db.query.raw(`
      SELECT id, username, email, 
             LENGTH(password) as password_length,
             CASE WHEN password IS NOT NULL AND password != '' 
             THEN true ELSE false END as has_password
      FROM users WHERE id = ${userId}
    `);

    if (!result.rows[0]) {
      return {
        success: false,
        message: "User verification failed: User not found",
        isPasswordValid: false
      };
    }

    const user = result.rows[0];
    // Check if password is stored and has expected length (typical for auth.ts hash method)
    const isPasswordValid = user.has_password && user.password_length > 100;

    console.log('[VERIFICATION] User verification result:', {
      id: user.id,
      username: user.username,
      passwordLength: user.password_length,
      hasPassword: user.has_password,
      passwordValid: isPasswordValid
    });

    return {
      success: true,
      user,
      isPasswordValid,
      passwordStatus: isPasswordValid 
        ? "Password stored correctly" 
        : `Password issue: length=${user.password_length}, has_password=${user.has_password}`
    };
  } catch (error: any) {
    console.error("User verification error:", error);
    return { 
      success: false, 
      message: error.message || "Unknown error during verification",
      isPasswordValid: false,
      error
    };
  }
}

/**
 * Securely stores password in metadata object for Stripe checkout
 * @param metadata Metadata object to store password in
 * @param password Raw password to hash and store
 */
export function storePasswordInMetadata(metadata: Record<string, string>, password: string): void {
  // Hash the password before storing in metadata
  const hashedPassword = hashPassword(password);

  // Store the hashed password in metadata
  metadata.password = hashedPassword;

  console.log(`[AUTH] Password stored in metadata with length: ${hashedPassword.length}`);
}