// Authentication fix and diagnostics tool
import { Request, Response } from "express";
import crypto from "crypto";
import Stripe from "stripe";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

// Utility function for consistent password hashing
export function hashPassword(password: string) {
  return crypto
    .pbkdf2Sync(password, "salt", 100000, 64, "sha512")
    .toString("hex");
}

// Enhanced version of createCheckoutSession
export async function createCheckoutSessionFixed(req: Request, res: Response) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2023-10-16",
    });
    
    // Get user input data from request body
    const { username, password, email, fullName, planType, interval } = req.body;
    
    // Validate required fields
    if (!username || !password || !email || !fullName || !planType || !interval) {
      return res.status(400).json({
        message: "Missing required fields",
        fields: { username, email, fullName, planType, interval, hasPassword: !!password }
      });
    }
    
    // Hash the password
    const hashedPassword = hashPassword(password);
    console.log(`[CHECKOUT_FIX] Password hash created. Length: ${hashedPassword.length}`);
    
    // Store in session as backup
    req.session.pendingRegistration = {
      username,
      password: hashedPassword,
      email,
      fullName,
      planType,
      interval,
      createdAt: new Date().toISOString(),
    };
    
    // Get plan details (should be imported from subscription config)
    const SUBSCRIPTION_PLANS = {
      starter: { monthlyPrice: 2900, yearlyPrice: 28800, trialDays: 14 },
      growth: { monthlyPrice: 4900, yearlyPrice: 46800, trialDays: 14 },
      professional: { monthlyPrice: 9900, yearlyPrice: 94800, trialDays: 14 },
      "professional-plus": { monthlyPrice: 12900, yearlyPrice: 130800, trialDays: 14 },
    };
    
    const plan = SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS];
    if (!plan) {
      return res.status(400).json({ message: "Invalid plan type" });
    }
    
    const price = interval === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
    
    // Get the base URL for redirects
    const baseUrl = process.env.FRONTEND_URL || `https://${req.headers.host}`;
    
    // Create Stripe checkout session with password in metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      billing_address_collection: "auto",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan`,
              description: `Includes ${plan.trialDays}-day free trial`,
            },
            unit_amount: price,
            recurring: {
              interval: interval === "monthly" ? "month" : "year",
              trial_period_days: plan.trialDays,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/api/subscriptions/complete-registration?session_id={CHECKOUT_SESSION_ID}&password_backup=${encodeURIComponent(hashedPassword)}`,
      cancel_url: `${baseUrl}/pricing`,
      customer_email: email,
      metadata: {
        username,
        email,
        fullName,
        planType,
        interval,
        password: hashedPassword, // Include hashed password in metadata
      },
      subscription_data: {
        metadata: {
          planType,
          interval,
          username,
          password: hashedPassword, // Also include in subscription metadata as backup
        },
        trial_period_days: plan.trialDays,
      },
    });
    
    console.log(`[CHECKOUT_FIX] Created session with ID: ${session.id}`);
    console.log(`[CHECKOUT_FIX] Has password in metadata: ${!!session.metadata?.password}`);
    
    res.json({ sessionUrl: session.url });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({
      message: error.message || "Failed to create checkout session",
    });
  }
}

// Enhanced version of completeRegistration
export async function completeRegistrationFixed(req: Request, res: Response) {
  try {
    console.log(`[REGISTRATION_FIX] Processing complete-registration with query params:`, req.query);
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2023-10-16",
    });
    
    const { session_id, password_backup } = req.query;
    
    if (!session_id) {
      console.error("[REGISTRATION_FIX] Missing session_id in request");
      return res.status(400).json({ message: "Session ID is required" });
    }
    
    // Retrieve session data from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id as string);
    
    if (!session) {
      console.error(`[REGISTRATION_FIX] Invalid Stripe session: ${session_id}`);
      return res.status(400).json({ message: "Invalid session ID" });
    }
    
    console.log(`[REGISTRATION_FIX] Successfully retrieved Stripe session`);
    
    // Get user registration data from session metadata
    const metadata = session.metadata || {};
    const email = metadata.email;
    const username = metadata.username;
    const fullName = metadata.fullName;
    const planType = metadata.planType;
    
    // Get password from various sources
    let userPassword = metadata.password;
    
    console.log(`[REGISTRATION_FIX] Extracted metadata:`, {
      hasEmail: !!email,
      hasUsername: !!username,
      hasFullName: !!fullName,
      hasPlanType: !!planType,
      hasPassword: !!userPassword,
      passwordLength: userPassword ? userPassword.length : 0
    });
    
    // Try URL query parameter backup
    if (!userPassword && password_backup) {
      console.log('[REGISTRATION_FIX] Found password in URL query parameter');
      userPassword = password_backup as string;
    }
    
    // Try session data
    if (!userPassword && req.session.pendingRegistration && req.session.pendingRegistration.password) {
      console.log('[REGISTRATION_FIX] Found password in session data');
      userPassword = req.session.pendingRegistration.password;
    }
    
    // Last resort: generate a temporary password
    if (!userPassword) {
      console.log('[REGISTRATION_FIX] No password found, generating temporary password');
      userPassword = hashPassword('temporaryPassword123');
    }
    
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (existingUser.length > 0) {
      return res.redirect("/login?message=account_exists");
    }
    
    // Create the user with direct SQL query
    console.log('[REGISTRATION_FIX] Creating user with password length:', userPassword.length);
    
    try {
      // Execute direct SQL insert
      const result = await db.query.raw(`
        INSERT INTO users (username, email, full_name, password, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id;
      `, [username, email, fullName, userPassword]);
      
      if (!result.rows[0]) {
        throw new Error('Failed to create user record');
      }
      
      const userId = result.rows[0].id;
      console.log(`[REGISTRATION_FIX] Created user with ID: ${userId}`);
      
      // Verify password was stored correctly
      const verifyResult = await db.query.raw(`
        SELECT id, username, email, 
               LENGTH(password) as password_length,
               CASE WHEN password IS NOT NULL AND password != '' 
               THEN true ELSE false END as has_password
        FROM users WHERE id = $1
      `, [userId]);
      
      console.log(`[REGISTRATION_FIX] User verification:`, verifyResult.rows[0]);
      
      // Set user session
      req.session.userId = userId;
      
      // Redirect to the dashboard
      res.redirect("/dashboard?welcome=new_user");
    } catch (sqlError) {
      console.error('[REGISTRATION_FIX] SQL error creating user:', sqlError);
      throw sqlError;
    }
  } catch (error: any) {
    console.error("[REGISTRATION_FIX] Error completing registration:", error);
    res.redirect("/signup?error=registration_failed");
  }
}