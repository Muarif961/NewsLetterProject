import { Response } from "express";
import { db } from "../db/index";
import {
  appsumo_codes,
  user_subscriptions,
  user_redeemed_codes,
  users,
} from "../db/schema";
import crypto from "crypto";
import { eq, inArray, and } from 'drizzle-orm';

// Utility to hash passwords
const hashPassword = async (password: string) => {
  return crypto
    .pbkdf2Sync(password, "salt", 100000, 64, "sha512")
    .toString("hex");
};

// Get tier based on number of codes
export function getTierForCode(code: string): string {
  // Each code maps to a specific tier
  return "starter"; // Default to starter, we'll enhance this later
}

// Validate AppSumo code
export async function validateAppSumoCode(codes: string[]) {
  try {
    console.log("[AppSumo] Validating code:", codes);

    const validCodes = await db
      .select()
      .from(appsumo_codes)
      .where(
        and(
          inArray(appsumo_codes.code, codes),
          eq(appsumo_codes.isRedeemed, false)
        )
      );

    return {
      success: validCodes.length > 0,
      message: validCodes.length > 0 ? "Valid code" : "Invalid or already redeemed code",
      results: codes.map(code => ({
        code,
        valid: validCodes.some(vc => vc.code === code)
      }))
    };
  } catch (error) {
    console.error("[AppSumo] Code validation error:", error);
    throw error;
  }
}

// Create user subscription
export async function createUserSubscription(
  client: any,
  userId: number,
  tier: string,
) {
  console.log(
    "[AppSumo] Creating subscription for user:",
    userId,
    "tier:",
    tier,
  );

  try {
    const result = await client.query(
      `INSERT INTO user_subscriptions 
       (user_id, subscription_type, tier, status, activated_at, updated_at)
       VALUES ($1, 'appsumo', $2, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userId, tier],
    );

    console.log("[AppSumo] Created subscription:", result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error("[AppSumo] Error creating subscription:", error);
    throw error;
  }
}

// Record redeemed code
export async function recordRedeemedCode(
  client: any,
  userId: number,
  codeId: number,
) {
  console.log(
    "[AppSumo] Recording redeemed code:",
    codeId,
    "for user:",
    userId,
  );

  try {
    console.log("[AppSumo] Starting transaction");
    await client.query("BEGIN");

    console.log(
      "[AppSumo] Recording redemption for user:",
      userId,
      "code:",
      codeId,
    );
    // First record the redemption
    await client.query(
      `INSERT INTO user_redeemed_codes 
       (user_id, code_id, redeemed_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      [userId, codeId],
    );

    // Then update the code status with explicit boolean
    const updateResult = await client.query(
      `UPDATE appsumo_codes 
       SET is_redeemed = TRUE, 
           redeemed_at = CURRENT_TIMESTAMP,
           redeemed_by = $2
       WHERE id = $1 AND is_redeemed = FALSE
       RETURNING *`,
      [codeId, userId],
    );

    console.log("[AppSumo] Updated code status:", updateResult.rows[0]);

    if (updateResult.rowCount === 0) {
      await client.query("ROLLBACK");
      throw new Error(`Failed to update code ${codeId} as redeemed`);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[AppSumo] Error recording code redemption:", error);
    throw error;
  }
}

// Handle registration with AppSumo code
export async function registerWithAppSumoCode(
  client: any,
  userData: {
    email: string;
    password: string;
    fullName: string;
  },
  appSumoCode: string,
) {
  console.log(
    "[AppSumo] Starting registration with code for user:",
    userData.email,
  );

  try {
    // Validate code
    const { isValid, code } = await validateAppSumoCode(appSumoCode);
    if (!isValid || !code) {
      throw new Error("Invalid or already redeemed AppSumo code");
    }

    // Create user
    const hashedPassword = await hashPassword(userData.password);
    const userResult = await client.query(
      `INSERT INTO users 
       (email, password, full_name, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userData.email, hashedPassword, userData.fullName],
    );

    const user = userResult.rows[0];
    console.log("[AppSumo] Created user:", user.id);

    // Determine tier
    const tier = getTierForCode(appSumoCode);

    // Create subscription
    const subscription = await createUserSubscription(client, user.id, tier);
    console.log("[AppSumo] Created subscription:", subscription.id);

    // Record code redemption
    await recordRedeemedCode(client, user.id, code.id);

    return {
      user,
      tier,
    };
  } catch (error) {
    console.error("[AppSumo] Registration error:", error);
    throw error;
  }
}

// Main registration endpoint
export async function handleAppSumoRegistration(
  req: any,
  res: Response,
  client: any,
) {
  try {
    const { email, password, fullName, appSumoCode } = req.body;

    if (!appSumoCode) {
      return res.status(400).json({
        message: "AppSumo code is required for registration",
      });
    }

    // Check for existing user
    const existingUser = await client.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );

    if (existingUser.rowCount > 0) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    const result = await registerWithAppSumoCode(
      client,
      { email, password, fullName },
      appSumoCode,
    );

    return res.status(201).json({
      message: "Registration successful",
      tier: result.tier,
    });
  } catch (error) {
    console.error("[AppSumo] Registration handler error:", error);
    throw error;
  }
}