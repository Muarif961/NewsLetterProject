/**
 * Enhanced Stripe portal handler that correctly retrieves customer ID from metadata
 */
import { Request, Response } from "express";
import Stripe from "stripe";
import { db } from "./db";
import { user_subscriptions } from "./db/schema";
import { eq } from "drizzle-orm";

export async function createPortalSession(
  req: Request,
  res: Response,
  stripe: Stripe,
) {
  try {
    console.log("[STRIPE_PORTAL] Portal request received with body:", req.body);
    console.log("[STRIPE_PORTAL] Session data:", req.session);

    // Get the user's subscription
    const userSubscription = await db
      .select()
      .from(user_subscriptions)
      .where(eq(user_subscriptions.userId, req.session.userId))
      .limit(1);

    console.log(`[STRIPE_PORTAL] Subscription query result:`, userSubscription);

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

    // Get Stripe Customer ID from dedicated column
    const stripeCustomerId = userSubscription[0].stripeCustomerId;

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
        return_url: returnUrl,
        // Add configuration for better customer portal experience
        configuration: {
          features: {
            payment_method_update: {
              enabled: true,
            },
            subscription_cancel: {
              enabled: true,
              mode: "at_period_end",
              proration_behavior: "none",
            },
            subscription_update: {
              enabled: true,
              proration_behavior: "create_prorations",
              default_allowed_updates: ["price"],
            },
          },
        },
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
}
