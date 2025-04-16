import { Request, Response } from "express";
import Stripe from "stripe";
import { db } from "./db";
import { users, user_subscriptions } from "./db/schema";
import { eq } from "drizzle-orm";
import { AI_CREDITS } from "./lib/subscription-limits";
import { initializeUserCredits } from "./lib/subscription-tracker";

export async function completeRegistration(
  req: Request,
  res: Response,
  stripe: Stripe,
  SUBSCRIPTION_PLANS: any
) {
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ message: "Missing session_id parameter" });
  }

  try {
    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id as string, {
      expand: ["customer", "line_items.data.price.product"],
    });

    // Check if session is complete
    if (session.status !== "complete") {
      console.log(`Checkout session is not complete: ${session.status}`);
      return res.redirect("/signup?error=session_incomplete");
    }

    // Extract user data from metadata
    const metadata = session.metadata || {};
    const username = metadata.username || "";
    const email = metadata.email || "";
    const password = metadata.password || "";

    if (!username || !email || !password) {
      console.error("Missing user data in session metadata");
      return res.redirect("/signup?error=missing_user_data");
    }

    // Extract plan info from line items
    const lineItems = session.line_items?.data || [];
    if (lineItems.length === 0) {
      console.error("No line items found in checkout session");
      return res.status(400).json({ message: "No products found in checkout" });
    }

    // Get the price ID from the first line item
    const priceId = lineItems[0].price?.id || "";
    
    // Find the matching plan
    let planType: string | null = null;
    for (const [key, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
      if (plan.priceId === priceId) {
        planType = key;
        break;
      }
    }

    if (!planType) {
      console.error(`No matching plan found for price ID: ${priceId}`);
      return res.status(400).json({ message: "Invalid subscription plan" });
    }

    console.log(`Found plan: ${planType} for price ID: ${priceId}`);
    const plan = SUBSCRIPTION_PLANS[planType];

    // Create the user
    const result = await db.insert(users).values({
      username,
      email,
      password,
      displayName: username,
      role: "user",
    }).returning({ id: users.id });

    if (!result || result.length === 0) {
      console.error("Failed to create user");
      return res.status(500).json({ message: "Failed to create user" });
    }

    const userId = result[0].id;
    console.log(`Created user with ID: ${userId}`);

    // Setup trial period if applicable
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + (plan.trialDays || 14));

    // Create the subscription - storing Stripe IDs in metadata
    await db.insert(user_subscriptions).values({
      userId: userId,
      tier: planType,
      status: "active",
      initialAiCredits: plan.initialAiCredits || 100,
      provider: "stripe",
      activatedAt: new Date(),
      metadata: {
        trialEndsAt: trialEndDate.toISOString(),
        isTrialActive: true,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        trialPeriodDays: plan.trialDays || 14
      },
    });

    // Initialize the user's credits
    await initializeUserCredits(userId, planType as keyof typeof AI_CREDITS);

    // Log the user in by setting session data
    req.session.userId = userId;
    req.session.isAuthenticated = true;
    req.session.username = username;
    req.session.role = "user";

    // Redirect to the dashboard
    return res.redirect("/dashboard");
  } catch (error) {
    console.error("Error completing registration:", error);
    return res.status(500).json({
      message: "An error occurred while completing registration",
      error: error.message,
    });
  }
}
