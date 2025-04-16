import express, { Router, Request, Response } from "express";
import { db } from "../db";
import { 
  credit_purchases, 
  credit_transactions, 
  user_credits,
  users
} from "../db/schema";
import { stripe, CREDIT_PACKAGES, getPackageDetails } from "../lib/stripe";
import { eq, and, desc, sql } from "drizzle-orm";
import { 
  getCreditUsageAnalytics, 
  validateCredits, 
  CREDIT_COSTS 
} from "../lib/subscription-tracker";
import { NotificationService } from "../lib/notifications";
import Stripe from "stripe";

const router = Router();

/**
 * Get user's credit balance and recent transactions
 * 
 * GET /api/credits/balance
 */
router.get("/balance", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        details: "User must be logged in to view credits"
      });
    }

    // Get user's credit balance
    const [userCredit] = await db
      .select()
      .from(user_credits)
      .where(eq(user_credits.userId, userId))
      .limit(1);

    if (!userCredit) {
      return res.status(404).json({
        error: "No credits found",
        details: "User does not have any credits allocated"
      });
    }

    // Get recent transactions
    const recentTransactions = await db
      .select()
      .from(credit_transactions)
      .where(eq(credit_transactions.userId, userId))
      .orderBy(desc(credit_transactions.createdAt))
      .limit(10);

    // Return credit balance and recent transactions
    res.json({
      credits: {
        total: userCredit.totalCreditsAllocated,
        remaining: userCredit.creditsRemaining,
        used: userCredit.totalCreditsAllocated - userCredit.creditsRemaining
      },
      recentTransactions
    });
  } catch (error: any) {
    console.error("Error getting credit balance:", error);
    res.status(500).json({
      error: "Failed to retrieve credit balance",
      details: error.message
    });
  }
});

/**
 * Get credit usage analytics for the user
 * 
 * GET /api/credits/analytics
 */
router.get("/analytics", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        details: "User must be logged in to view credit analytics"
      });
    }

    // Get credit usage analytics
    const analytics = await getCreditUsageAnalytics(userId);

    // Return credit usage analytics
    res.json(analytics);
  } catch (error: any) {
    console.error("Error getting credit analytics:", error);
    res.status(500).json({
      error: "Failed to retrieve credit analytics",
      details: error.message
    });
  }
});

/**
 * List available credit packages
 * 
 * GET /api/credits/packages
 */
router.get("/packages", (req: Request, res: Response) => {
  // Convert CREDIT_PACKAGES object to array for response
  const packages = Object.values(CREDIT_PACKAGES).map(pkg => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    credits: pkg.credits,
    price: pkg.price / 100, // Convert cents to dollars for display
    currency: pkg.currency,
    features: pkg.features || []
  }));

  res.json(packages);
});

/**
 * Create a checkout session to purchase credits
 * 
 * POST /api/credits/checkout
 * Body: { packageId: string }
 */
router.post("/checkout", async (req: Request, res: Response) => {
  try {
    const { packageId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        details: "User must be logged in to purchase credits"
      });
    }

    if (!packageId) {
      return res.status(400).json({
        error: "Missing package ID",
        details: "A package ID is required to create a checkout session"
      });
    }

    // Validate package ID
    const packageDetails = getPackageDetails(packageId);
    if (!packageDetails) {
      return res.status(400).json({
        error: "Invalid package ID",
        details: "The specified package ID does not exist"
      });
    }

    // Get user information for the checkout session
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        details: "User account not found"
      });
    }

    // Create a checkout session for credit purchase
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: packageDetails.currency,
            product_data: {
              name: packageDetails.name,
              description: `${packageDetails.credits} AI credits for your newsletter platform`,
              metadata: {
                credits: packageDetails.credits.toString(),
                package_id: packageId
              }
            },
            unit_amount: packageDetails.price // Already in cents
          },
          quantity: 1
        }
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL || "http://localhost:5000"}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || "http://localhost:5000"}/credits/canceled`,
      customer_email: user.email,
      metadata: {
        user_id: userId.toString(),
        package_id: packageId,
        credits: packageDetails.credits.toString(),
        type: "credit_purchase"
      }
    });

    // Record the pending purchase in the database
    await db.insert(credit_purchases).values({
      userId,
      packageId,
      creditsAmount: packageDetails.credits,
      pricePaid: packageDetails.price,
      currency: packageDetails.currency,
      stripeSessionId: session.id,
      status: "pending"
    });

    // Return the checkout session URL
    res.json({
      url: session.url,
      sessionId: session.id
    });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({
      error: "Failed to create checkout session",
      details: error.message
    });
  }
});

/**
 * Check the status of a credit purchase
 * 
 * GET /api/credits/purchase-status
 * Query: { sessionId: string }
 */
router.get("/purchase-status", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        details: "User must be logged in to check purchase status"
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        error: "Missing session ID",
        details: "A Stripe session ID is required to check purchase status"
      });
    }

    // Get the purchase status from the database
    const [purchase] = await db
      .select()
      .from(credit_purchases)
      .where(
        and(
          eq(credit_purchases.stripeSessionId, sessionId as string),
          eq(credit_purchases.userId, userId)
        )
      );

    if (!purchase) {
      return res.status(404).json({
        error: "Purchase not found",
        details: "The specified purchase could not be found"
      });
    }

    // Return the purchase status
    res.json({
      status: purchase.status,
      credits: purchase.creditsAmount,
      date: purchase.createdAt,
      completedAt: purchase.completedAt
    });
  } catch (error: any) {
    console.error("Error checking purchase status:", error);
    res.status(500).json({
      error: "Failed to check purchase status",
      details: error.message
    });
  }
});

/**
 * Handle Stripe webhook events for credit purchases
 * This route is registered in routes.ts with raw body parsing
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!endpointSecret) {
    console.error("Stripe webhook secret not set");
    return res.status(500).json({ 
      received: false, 
      error: "Webhook secret not configured" 
    });
  }

  let event: Stripe.Event;

  try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ 
      received: false, 
      error: `Webhook signature verification failed: ${err.message}` 
    });
  }

  try {
    // Handle specific webhook events
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Verify this is a credit purchase
      if (session.metadata?.type !== "credit_purchase") {
        return res.status(200).json({ received: true, action: "ignored" });
      }
      
      console.log("Processing credit purchase webhook:", session.id);
      
      // Get the purchase from the database
      const [purchase] = await db
        .select()
        .from(credit_purchases)
        .where(eq(credit_purchases.stripeSessionId, session.id));
      
      if (!purchase) {
        console.error("Purchase not found for session:", session.id);
        return res.status(404).json({ 
          received: true, 
          error: "Purchase not found" 
        });
      }
      
      // Get payment intent ID
      const paymentIntentId = session.payment_intent as string;
      
      // Update purchase status
      await db
        .update(credit_purchases)
        .set({
          status: "completed",
          stripePaymentIntentId: paymentIntentId,
          completedAt: new Date()
        })
        .where(eq(credit_purchases.id, purchase.id));
      
      // Add the credits to the user's account
      await addCreditsToUser(
        purchase.userId,
        purchase.creditsAmount,
        `Credit purchase: ${purchase.creditsAmount} credits`,
        purchase.id.toString()
      );
      
      // Send notification to user
      try {
        await NotificationService.createNotification(
          purchase.userId,
          "credit_purchase",
          "Credit Purchase Successful",
          `Your purchase of ${purchase.creditsAmount} credits has been completed successfully.`
        );
      } catch (notifError) {
        console.error("Error sending notification:", notifError);
      }
    }
    
    // Return a success response
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ 
      received: true, 
      error: `Error processing webhook: ${error.message}` 
    });
  }
}

/**
 * Add credits to a user's account and log the transaction
 */
async function addCreditsToUser(
  userId: number,
  creditsAmount: number,
  description: string,
  referenceId?: string
) {
  return await db.transaction(async (tx) => {
    // Get current credit balance
    const [userCredit] = await tx
      .select()
      .from(user_credits)
      .where(eq(user_credits.userId, userId))
      .limit(1);
    
    if (!userCredit) {
      throw new Error("User credits not found");
    }
    
    // Calculate new balance
    const currentCredits = userCredit.creditsRemaining;
    const newCredits = currentCredits + creditsAmount;
    const newTotalAllocated = userCredit.totalCreditsAllocated + creditsAmount;
    
    // Update user's credit balance
    await tx
      .update(user_credits)
      .set({ 
        creditsRemaining: newCredits,
        totalCreditsAllocated: newTotalAllocated,
        lastUpdated: new Date()
      })
      .where(eq(user_credits.id, userCredit.id));
    
    // Log the transaction
    await tx
      .insert(credit_transactions)
      .values({
        userId,
        amount: creditsAmount,
        creditsBefore: currentCredits,
        creditsAfter: newCredits,
        type: "add",
        action: "purchase",
        description
      });
    
    return {
      previousBalance: currentCredits,
      newBalance: newCredits,
      added: creditsAmount
    };
  });
}

/**
 * Check if user has enough credits for a specific operation
 * 
 * GET /api/credits/validate
 * Query: { operation: string, quantity: number }
 */
router.get("/validate", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        details: "User must be logged in to validate credits"
      });
    }
    
    const { operation, quantity = 1 } = req.query;
    
    if (!operation || typeof operation !== 'string') {
      return res.status(400).json({
        error: "Missing operation type",
        details: "An operation type is required to validate credits"
      });
    }
    
    // Convert operation to uppercase for matching with CREDIT_COSTS
    const operationType = operation.toUpperCase() as keyof typeof CREDIT_COSTS;
    
    // Check if operation type is valid
    if (!Object.keys(CREDIT_COSTS).includes(operationType)) {
      return res.status(400).json({
        error: "Invalid operation type",
        details: "The specified operation type is not recognized"
      });
    }
    
    // Parse quantity (default to 1 if not provided)
    const parsedQuantity = quantity ? Number(quantity) : 1;
    
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({
        error: "Invalid quantity",
        details: "Quantity must be a positive number"
      });
    }
    
    // Check if user has enough credits
    const validation = await validateCredits(userId, operationType, parsedQuantity);
    
    // Return validation result
    res.json({
      hasEnoughCredits: validation.hasEnoughCredits,
      creditsRemaining: validation.creditsRemaining,
      creditCost: validation.creditCost,
      creditsAfterOperation: validation.creditsAfterOperation
    });
  } catch (error: any) {
    console.error("Error validating credits:", error);
    res.status(500).json({
      error: "Failed to validate credits",
      details: error.message
    });
  }
});

export default router;