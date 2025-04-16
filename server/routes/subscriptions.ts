import express, { Router, Request, Response } from "express";
import Stripe from "stripe";
import { db } from "../db";
import { users, user_subscriptions } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

import { initializeUserCredits } from "../lib/subscription-tracker";
import { AI_CREDITS } from "../lib/subscription-limits";

// Enhanced password handler for Stripe checkout
async function ensureValidPassword(
  req: Request,
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  // Get password from all possible sources
  const metadata = session.metadata || {};
  const metadataPassword = metadata.password;
  const passwordBackup = req.query.password_backup as string | undefined;

  // Try all possible password sources in order
  let userPassword = metadataPassword;

  // Ensure password is properly hashed if it's not already
  if (userPassword && userPassword.length < 161) {
    // Check for plain password
    userPassword = hashPassword(userPassword);
  }

  return userPassword;
}

const router = Router();

// Initialize Stripe with API key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  starter: {
    id: "starter",
    name: "Starter Plan",
    description: "Perfect for beginners and small newsletters",
    monthlyPrice: 2900, // $29/month
    yearlyPrice: 28800, // $24/month billed annually
    features: [
      "5,000 Subscribers/Contacts",
      "Unlimited email sends",
      "Customizable newsletter templates",
      "50 Free credits for AI-powered Features",
      "24/7 support",
    ],
    subscriberLimit: 5000,
    initialAiCredits: 50,
    trialDays: 14, // 14-day free trial
  },
  growth: {
    id: "growth",
    name: "Growth Plan",
    description: "Ideal for growing newsletters",
    monthlyPrice: 4900, // $49/month
    yearlyPrice: 46800, // $39/month billed annually
    features: [
      "10,000 Subscribers/Contacts",
      "Unlimited email sends",
      "Customizable newsletter templates",
      "120 Free credits for AI-powered Features",
      "24/7 support",
    ],
    subscriberLimit: 10000,
    initialAiCredits: 120,
    recommended: true,
    trialDays: 14, // 14-day free trial
  },
  professional: {
    id: "professional",
    name: "Professional Plan",
    description: "For serious newsletter creators",
    monthlyPrice: 9900, // $99/month
    yearlyPrice: 94800, // $79/month billed annually
    features: [
      "20,000 Subscribers/Contacts",
      "Unlimited email sends",
      "Customizable newsletter templates",
      "150 Free credits for AI-powered Features",
      "24/7 support",
    ],
    subscriberLimit: 20000,
    initialAiCredits: 150,
    trialDays: 14, //  14-day free trial
  },
  "professional-plus": {
    id: "professional-plus",
    name: "Professional+ Plan",
    description: "Our most comprehensive option",
    monthlyPrice: 12900, // $129/month
    yearlyPrice: 130800, // $109/month billed annually
    features: [
      "25,000 Subscribers/Contacts",
      "Unlimited email sends",
      "Customizable newsletter templates",
      "200 Free credits for AI-powered Features",
      "24/7 support",
    ],
    subscriberLimit: 25000,
    initialAiCredits: 200,
    trialDays: 14, // Adding 14-day free trial to all plans
  },
};

// Helper to get plan details
export function getPlanDetails(planId: string) {
  const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
  if (!plan) throw new Error(`Invalid plan ID: ${planId}`);
  return plan;
}

// Validation schema for checkout request
const checkoutSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  email: z.string().email("Please provide a valid email address"),
  fullName: z.string().min(1, "Full name is required"),
  planType: z
    .string()
    .refine((val) => Object.keys(SUBSCRIPTION_PLANS).includes(val), {
      message: "Invalid plan type",
    }),
  interval: z.enum(["monthly", "yearly"]),
});

// Route to create a checkout session for subscription
router.post("/create-checkout-session", async (req: Request, res: Response) => {
  try {
    console.log("[CHECKOUT] Using enhanced checkout implementation");

    const { planType, interval, email, username, fullName } = req.body; // Extract planType, interval, etc. from request body
    const plan = getPlanDetails(planType); // Fetch the plan details
    const price = interval === "yearly" ? plan.yearlyPrice : plan.monthlyPrice; // Determine the price based on interval

    // Create the Stripe checkout session with trial period
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      billing_address_collection: "auto",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: plan.name,
              description: `${plan.description} - Includes ${plan.trialDays || 14}-day free trial`,
            },
            unit_amount: price,
            recurring: {
              interval: interval,
              trial_period_days: plan.trialDays || 14, // Add trial period here
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/api/complete-registration?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/pricing`,
      customer_email: email,
      metadata: {
        username,
        email,
        fullName,
        planType,
        interval,
        subscriberLimit: plan.subscriberLimit.toString(),
        initialAiCredits: plan.initialAiCredits.toString(),
      },
      subscription_data: {
        metadata: {
          planType,
          interval,
          username,
        },
        trial_period_days: plan.trialDays || 14, // Add trial period here too
      },
    });

    return res.json({ id: session.id });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({
      message: error.message || "Failed to create checkout session",
    });
  }
});

// Registration completion endpoint (after successful Stripe checkout)
router.get("/complete-registration", async (req: Request, res: Response) => {
  try {
    console.log(
      `[REGISTRATION] Processing complete-registration with query params:`,
      req.query,
    );

    const { session_id } = req.query;

    if (!session_id) {
      console.error("[REGISTRATION] Missing session_id in request");
      return res.status(400).json({ message: "Session ID is required" });
    }

    console.log(`[REGISTRATION] Retrieving Stripe session: ${session_id}`);

    // Retrieve session data from Stripe
    const session = await stripe.checkout.sessions.retrieve(
      session_id as string,
    );

    if (!session) {
      console.error(`[REGISTRATION] Invalid Stripe session: ${session_id}`);
      return res.status(400).json({ message: "Invalid session ID" });
    }

    console.log(`[REGISTRATION] Successfully retrieved Stripe session:`, {
      customer: session.customer,
      payment_status: session.payment_status,
      subscription: session.subscription,
    });

    // Log metadata for debugging
    console.log(`[REGISTRATION] Complete session metadata:`, session.metadata);

    // Get user registration data from session metadata
    const metadata = session.metadata || {};
    const email = metadata.email;
    const username = metadata.username;
    const fullName = metadata.fullName;
    const planType = metadata.planType;

    const userPassword = await ensureValidPassword(req, session);
    console.log(`[REGISTRATION] Password handler result:`, {
      hasPassword: !!userPassword,
      passwordLength: userPassword ? userPassword.length : 0,
    });
    const passwordBackup = (req.query.password_backup as string) || "";

    console.log(`[REGISTRATION] Extracted metadata fields:`, {
      hasEmail: !!email,
      hasUsername: !!username,
      hasFullName: !!fullName,
      hasPassword: !!userPassword,
      passwordLength: userPassword ? userPassword.length : 0,
      hasPasswordBackup: !!passwordBackup,
      passwordBackupLength: passwordBackup ? passwordBackup.length : 0,
    });

    // Validate minimum required fields
    if (!email || !username || userPassword === null) {
      return res
        .status(400)
        .json({ message: "Missing required user information" });
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

    // Get plan details
    const plan = getPlanDetails(planType);

    try {
      // Add additional debug logging
      console.log("[REGISTRATION] Executing user creation with values:", {
        username,
        email,
        fullName,
        passwordLength: userPassword ? userPassword.length : 0,
      });

      const result = await db.execute(sql`
        INSERT INTO users (username, email, full_name, password, created_at, updated_at)
        VALUES (${username}, ${email}, ${fullName}, ${userPassword}, NOW(), NOW())
        RETURNING id, username, email`);

      console.log("[REGISTRATION] Query execution result:", {
        rowCount: result.rowCount,
        hasRows: result.rows && result.rows.length > 0,
      });

      if (!result || !result.rows || result.rows.length === 0) {
        console.error("[REGISTRATION] SQL query returned no rows");
        throw new Error("Failed to create user record");
      }

      const userId = result.rows[0].id;
      console.log(`[REGISTRATION] Created user with ID: ${userId}`);

      // Verify the user was created with password (Added for enhanced diagnostics)
      const verification = await db.execute(sql`
        SELECT id, username, email, CASE WHEN password IS NOT NULL AND password != '' 
                                     THEN true ELSE false END as has_password
        FROM users WHERE id = ${userId}
      `);

      console.log("[REGISTRATION] User verification:", verification.rows[0]);

      // Calculate trial end date based on plan's trial period
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + (plan.trialDays || 14));

      // Create the subscription with trial data
      await db.insert(user_subscriptions).values({
        userId: userId,
        tier: planType,
        status: "active",
        subscriberLimit: plan.subscriberLimit,
        initialAiCredits: plan.initialAiCredits,
        provider: "stripe",
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        activatedAt: new Date(),
        metadata: {
          trialEndsAt: trialEndDate.toISOString(),
          isTrialActive: true,
          trialPeriodDays: plan.trialDays || 14,
        },
      });

      // Initialize the user's credits
      await initializeUserCredits(userId, planType as keyof typeof AI_CREDITS);

      // Log in the user by creating a session
      req.session.userId = userId;

      // Redirect to the dashboard
      res.redirect("/dashboard?welcome=trial");
    } catch (sqlError) {
      console.error("[REGISTRATION] SQL error creating user:", sqlError);
      return res.status(500).json({
        message: "Failed to create user",
        error: sqlError instanceof Error ? sqlError.message : String(sqlError),
      });
    }
  } catch (error: any) {
    console.error("[REGISTRATION] Error completing registration:", error);

    // Send detailed error in development
    if (process.env.NODE_ENV === "development") {
      return res.status(500).json({
        message: "Registration failed",
        error: error.message,
        stack: error.stack,
      });
    }

    // Redirect with error in production
    res.redirect("/signup?error=registration_failed");
  }
});

// Webhook to handle Stripe events
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res
        .status(400)
        .json({ message: "Missing signature or webhook secret" });
    }

    try {
      // Verify webhook signature
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
      );

      // Log all webhook events in development for testing
      console.log(`[WEBHOOK] Received event: ${event.type}`, event.data.object);

      // Handle specific trial related events
      switch (event.type) {
        case "customer.subscription.trial_will_end":
          // Process trial ending soon (3 days before end)
          const subscription = event.data.object;
          console.log(
            `[TRIAL] Trial will end soon for subscription: ${subscription.id}`,
          );

          // Find the associated user
          const userSub = await db
            .select()
            .from(user_subscriptions)
            .where(eq(user_subscriptions.stripeSubscriptionId, subscription.id))
            .limit(1);

          if (userSub.length > 0) {
            // Update subscription metadata
            await db
              .update(user_subscriptions)
              .set({
                metadata: {
                  ...userSub[0].metadata,
                  trialEndingNotificationSent: true,
                },
              })
              .where(eq(user_subscriptions.id, userSub[0].id));

            // Here you would also send an email notification
            // sendTrialEndingEmail(userSub[0].userId);
          }
          break;

        case "customer.subscription.updated":
          // This event fires when a trial ends and converts to paid
          const updatedSub = event.data.object;

          if (
            updatedSub.status === "active" &&
            updatedSub.trial_end &&
            updatedSub.trial_end * 1000 < Date.now()
          ) {
            console.log(
              `[TRIAL] Trial ended and converted to paid for: ${updatedSub.id}`,
            );

            // Update subscription record
            const convertedSub = await db
              .select()
              .from(user_subscriptions)
              .where(eq(user_subscriptions.stripeSubscriptionId, updatedSub.id))
              .limit(1);

            if (convertedSub.length > 0) {
              await db
                .update(user_subscriptions)
                .set({
                  metadata: {
                    ...convertedSub[0].metadata,
                    isTrialActive: false,
                    trialEnded: new Date().toISOString(),
                  },
                })
                .where(eq(user_subscriptions.id, convertedSub[0].id));

              // Here you would also send a "trial ended" email notification
              // sendTrialEndedEmail(convertedSub[0].userId);
            }
          }
          break;
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error("Webhook error:", err.message);
      return res.status(400).json({ message: err.message });
    }
  },
);

//HashPassword
const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64,
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
  generateToken: () => randomBytes(32).toString("hex"),
};

async function hashPassword(password: string): Promise<string> {
  return crypto.hash(password); // Using the hash function from the crypto object
}

export default router;
