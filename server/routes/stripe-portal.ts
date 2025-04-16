import express, { Request, Response } from "express";
import { db } from "../db";
import { user_subscriptions } from "../db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

// Initialize Stripe with API key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

/**
 * Function to integrate the fixed portal handler into an existing Express app
 */
export function integrateFixedPortalHandler(app: express.Express) {
  // Override the existing /api/subscription/portal route
  app.post("/api/subscription/portal", async (req: Request, res: Response) => {
    try {
      console.log(
        "[STRIPE_PORTAL] Portal request received with body:",
        req.body,
      );
      console.log("[STRIPE_PORTAL] Session data:", req.session);

      // Check if user is authenticated
      const userId = req.session?.passport?.user;
      if (!userId) {
        console.log(
          "[STRIPE_PORTAL] Authentication failed - no userId in session",
        );
        return res.status(401).json({ message: "Authentication required" });
      }

      console.log(`[STRIPE_PORTAL] User authenticated: ${userId}`);

      // Get the user's subscription
      const userSubscription = await db
        .select()
        .from(user_subscriptions)
        .where(eq(user_subscriptions.userId, userId))
        .limit(1);

      console.log(
        `[STRIPE_PORTAL] Subscription query result:`,
        userSubscription,
      );

      if (!userSubscription.length) {
        console.log("[STRIPE_PORTAL] No subscription found for user");
        return res.status(404).json({ message: "No subscription found" });
      }

      // Check if this is a Stripe subscription
      if (userSubscription[0].provider !== "stripe") {
        console.log(
          `[STRIPE_PORTAL] Invalid provider: ${userSubscription[0].provider}`,
        );
        return res.status(400).json({
          message: "Stripe portal is only available for Stripe subscribers",
        });
      }

      // Get Stripe Customer ID from metadata
      const metadata = userSubscription[0].metadata || {};
      const stripeCustomerId = metadata.stripeCustomerId;

      console.log(`[STRIPE_PORTAL] Subscription info:`, {
        provider: userSubscription[0].provider,
        customerId: stripeCustomerId,
        tier: userSubscription[0].tier,
        hasMetadata: !!metadata,
        metadataKeys: metadata ? Object.keys(metadata) : [],
      });

      // Check if we have a valid Stripe customer ID
      if (!stripeCustomerId) {
        console.error(
          "[STRIPE_PORTAL] No Stripe customer ID found in subscription metadata",
        );
        return res.status(400).json({
          message: "No Stripe customer ID found for this subscription",
        });
      }

      // Determine the return URL based on request body or default to billing settings
      const returnPath = req.body.returnPath || "/settings/billing";
      const returnUrl = `${req.headers.origin}${returnPath}`;

      console.log(
        `[STRIPE_PORTAL] Creating portal session for user ${userId} with return URL: ${returnUrl}`,
      );

      // Create the Stripe customer portal session with enhanced configuration
      console.log(
        `[STRIPE_PORTAL] Attempting to create portal session with customer ID: ${stripeCustomerId}`,
      );

      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: stripeCustomerId as string,
          return_url: returnUrl
        });

        console.log(
          `[STRIPE_PORTAL] Successfully created portal session: ${session.url}`,
        );

        return res.json({ url: session.url });
      } catch (stripeError: any) {
        console.error("[STRIPE_PORTAL] Stripe API error:", stripeError);

        // Enhanced error handling for different Stripe error types
        if (stripeError.type === "StripeInvalidRequestError") {
          console.error("[STRIPE_PORTAL] Invalid customer ID or configuration");
          return res.status(400).json({
            message: "Unable to create portal session: " + stripeError.message,
          });
        }

        throw stripeError; // Re-throw to be caught by outer catch block
      }
    } catch (error: any) {
      console.error("Error creating portal session:", error);
      res.status(500).json({
        message: error.message || "Failed to create portal session",
      });
    }
  });

  console.log("[STRIPE_PORTAL] Fixed portal handler integrated!");
}
