import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { 
  user_subscriptions, 
  credit_transactions, 
  user_credits 
} from "../db/schema";

// Define tier limits for subscribers
export const SUBSCRIBER_LIMITS = {
  starter: 5000,
  growth: 10000,
  professional: 20000
} as const;

// Define AI credit allocation by tier
export const AI_CREDITS = {
  starter: 100,
  growth: 250,
  professional: 500
} as const;

/**
 * Initialize AI credits for a new user
 * Creates user_credits entry with the appropriate number of credits based on tier
 */
export async function initializeUserCredits(userId: number, tier: string = 'starter') {
  try {
    // Check if user already has credits
    const existingCredits = await db
      .select()
      .from(user_credits)
      .where(eq(user_credits.userId, userId));
    
    if (existingCredits.length > 0) {
      console.log(`User ${userId} already has credits initialized`);
      return existingCredits[0];
    }
    
    // Determine credit amount based on tier
    const creditAmount = AI_CREDITS[tier as keyof typeof AI_CREDITS] || AI_CREDITS.starter;
    
    // Insert new credits record
    const [newCredits] = await db
      .insert(user_credits)
      .values({
        userId,
        totalCreditsAllocated: creditAmount,
        creditsRemaining: creditAmount,
        lastUpdated: new Date(),
        createdAt: new Date()
      })
      .returning();
    
    // Log the credit initialization transaction
    await db
      .insert(credit_transactions)
      .values({
        userId,
        amount: creditAmount,
        creditsBefore: 0,
        creditsAfter: creditAmount,
        type: 'initialize',
        action: 'subscription_activation',
        description: `Initial ${creditAmount} AI credits for ${tier} tier`
      });
    
    console.log(`Initialized ${creditAmount} credits for user ${userId} (${tier} tier)`);
    return newCredits;
  } catch (error) {
    console.error("Error initializing user credits:", error);
    throw error;
  }
}

// Define credit costs for different operations
export const CREDIT_COSTS = {
  // Text operations cost per 1000 tokens
  TEXT_GENERATION: 1,
  TEXT_ENHANCEMENT: 1,
  
  // Image operations cost per image
  IMAGE_GENERATION: 5,
  IMAGE_VARIATION: 3,
  IMAGE_EDIT: 4
} as const;

// Main subscription details retrieval function
export async function getSubscriptionDetails(userId: number) {
  try {
    const [subscription] = await db
      .select()
      .from(user_subscriptions)
      .where(eq(user_subscriptions.userId, userId))
      .limit(1);

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    // Get current AI credits from user_credits table
    const [userCredits] = await db
      .select()
      .from(user_credits)
      .where(eq(user_credits.userId, userId))
      .limit(1);

    if (!userCredits) {
      throw new Error("No credits found for user");
    }

    // Get recent credit usage history
    const recentTransactions = await db
      .select()
      .from(credit_transactions)
      .where(eq(credit_transactions.userId, userId))
      .orderBy(sql`${credit_transactions.createdAt} DESC`)
      .limit(10);

    // Return comprehensive subscription info
    return {
      tier: subscription.tier,
      status: subscription.status,
      renewalDate: subscription.currentPeriodEnd,
      subscriberLimit: SUBSCRIBER_LIMITS[subscription.tier as keyof typeof SUBSCRIBER_LIMITS] || 0,
      aiCreditsTotal: userCredits.totalCreditsAllocated,
      aiCreditsRemaining: userCredits.creditsRemaining,
      aiCreditsUsed: userCredits.totalCreditsAllocated - userCredits.creditsRemaining,
      recentTransactions
    };
  } catch (error) {
    console.error("Error getting subscription details:", error);
    throw error;
  }
}

// Check if subscriber limit has been reached
export async function checkSubscriberLimit(userId: number) {
  try {
    const [subscription] = await db
      .select()
      .from(user_subscriptions)
      .where(eq(user_subscriptions.userId, userId))
      .limit(1);

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    const tierLimit = SUBSCRIBER_LIMITS[subscription.tier as keyof typeof SUBSCRIBER_LIMITS] || 0;
    return {
      limit: tierLimit,
      current: subscription.subscriberCount || 0,
      canAddMore: (subscription.subscriberCount || 0) < tierLimit
    };
  } catch (error) {
    console.error("Error checking subscriber limit:", error);
    throw error;
  }
}

/**
 * Credit Validation and Deduction Functions
 */

// Check if user has enough credits for an operation
export async function validateCredits(userId: number, operationType: keyof typeof CREDIT_COSTS, quantity: number = 1) {
  try {
    // Get the user's current credit balance
    const [userCredit] = await db
      .select()
      .from(user_credits)
      .where(eq(user_credits.userId, userId))
      .limit(1);

    if (!userCredit) {
      throw new Error("No credits found for user");
    }

    // Calculate cost based on operation type and quantity
    // For text operations, quantity is number of tokens / 1000
    // For image operations, quantity is number of images
    const creditCost = CREDIT_COSTS[operationType] * quantity;

    // Check if user has enough credits
    const hasEnoughCredits = userCredit.creditsRemaining >= creditCost;

    return {
      hasEnoughCredits,
      creditsRemaining: userCredit.creditsRemaining,
      creditCost,
      creditsAfterOperation: userCredit.creditsRemaining - creditCost
    };
  } catch (error) {
    console.error(`Error validating credits for ${operationType}:`, error);
    throw error;
  }
}

// Reserve credits before an operation (temporary deduction)
export async function reserveCredits(
  userId: number, 
  operationType: keyof typeof CREDIT_COSTS, 
  quantity: number = 1,
  tokenCount?: number
) {
  try {
    // Begin transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // Get user's current credits
      const [userCredit] = await tx
        .select()
        .from(user_credits)
        .where(eq(user_credits.userId, userId))
        .limit(1);

      if (!userCredit) {
        throw new Error("No credits found for user");
      }

      // Calculate credit cost
      const creditCost = CREDIT_COSTS[operationType] * quantity;
      
      // Additional metadata for logging
      const description = tokenCount 
        ? `Reserved ${creditCost} credits for ${operationType} (${tokenCount} tokens)`
        : `Reserved ${creditCost} credits for ${operationType}`;

      // Check if user has enough credits
      if (userCredit.creditsRemaining < creditCost) {
        throw new Error("Insufficient credits for this operation");
      }

      // Deduct credits temporarily (reserve them)
      const creditsRemaining = userCredit.creditsRemaining - creditCost;
      
      // Update user's credit balance
      await tx
        .update(user_credits)
        .set({ 
          creditsRemaining,
          lastUpdated: new Date()
        })
        .where(eq(user_credits.userId, userId));

      // Log transaction
      const [transaction] = await tx
        .insert(credit_transactions)
        .values({
          userId,
          amount: -creditCost,
          creditsBefore: userCredit.creditsRemaining,
          creditsAfter: creditsRemaining,
          type: 'reserve',
          action: operationType.toLowerCase(),
          description
        })
        .returning();

      return {
        success: true,
        creditCost,
        creditsRemaining,
        transactionId: transaction.id
      };
    });
  } catch (error) {
    console.error(`Error reserving credits for ${operationType}:`, error);
    throw error;
  }
}

// Finalize credit deduction after successful operation
export async function finalizeCredits(
  userId: number,
  transactionId: number,
  success: boolean,
  metadata?: {
    tokenCount?: number;
    detail?: string;
  }
) {
  try {
    return await db.transaction(async (tx) => {
      // Get the reservation transaction
      const [reservationTx] = await tx
        .select()
        .from(credit_transactions)
        .where(and(
          eq(credit_transactions.id, transactionId),
          eq(credit_transactions.userId, userId),
          eq(credit_transactions.type, 'reserve')
        ))
        .limit(1);

      if (!reservationTx) {
        throw new Error("Reservation transaction not found");
      }

      if (success) {
        // If operation was successful, update transaction type to 'use'
        await tx
          .update(credit_transactions)
          .set({ 
            type: 'use',
            description: metadata?.detail || 
              `${reservationTx.description?.replace('Reserved', 'Used')}`
          })
          .where(eq(credit_transactions.id, transactionId));

        return { success: true, creditsDeducted: Math.abs(reservationTx.amount) };
      } else {
        // If operation failed, restore credits to user
        const [userCredit] = await tx
          .select()
          .from(user_credits)
          .where(eq(user_credits.userId, userId))
          .limit(1);

        if (!userCredit) {
          throw new Error("User credits not found");
        }

        // Calculate credits to be restored
        const creditsToRestore = Math.abs(reservationTx.amount);
        const newCreditsRemaining = userCredit.creditsRemaining + creditsToRestore;

        // Update user credits
        await tx
          .update(user_credits)
          .set({ 
            creditsRemaining: newCreditsRemaining,
            lastUpdated: new Date()
          })
          .where(eq(user_credits.userId, userId));

        // Update transaction to 'rollback'
        await tx
          .update(credit_transactions)
          .set({ 
            type: 'rollback',
            description: `Rollback: ${reservationTx.description?.replace('Reserved', 'Attempted to use')}`
          })
          .where(eq(credit_transactions.id, transactionId));

        // Log refund transaction
        await tx
          .insert(credit_transactions)
          .values({
            userId,
            amount: creditsToRestore,
            creditsBefore: userCredit.creditsRemaining,
            creditsAfter: newCreditsRemaining,
            type: 'add',
            action: 'refund',
            description: `Refunded ${creditsToRestore} credits for failed ${reservationTx.action} operation`
          });

        return { success: true, creditsRefunded: creditsToRestore };
      }
    });
  } catch (error) {
    console.error("Error finalizing credits transaction:", error);
    throw error;
  }
}

// Get credit usage analytics
export async function getCreditUsageAnalytics(userId: number) {
  try {
    // Get total credit usage by category
    const usageByCategory = await db
      .select({
        action: credit_transactions.action,
        totalUsed: sql`SUM(ABS(${credit_transactions.amount}))`.mapWith(Number),
        count: sql`COUNT(*)`.mapWith(Number)
      })
      .from(credit_transactions)
      .where(and(
        eq(credit_transactions.userId, userId),
        eq(credit_transactions.type, 'use')
      ))
      .groupBy(credit_transactions.action);

    // Get usage over time (last 30 days, daily)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usageOverTime = await db
      .select({
        date: sql`DATE_TRUNC('day', ${credit_transactions.createdAt})`.as('date'),
        totalUsed: sql`SUM(ABS(${credit_transactions.amount}))`.mapWith(Number)
      })
      .from(credit_transactions)
      .where(and(
        eq(credit_transactions.userId, userId),
        eq(credit_transactions.type, 'use'),
        sql`${credit_transactions.createdAt} >= ${thirtyDaysAgo}`
      ))
      .groupBy(sql`DATE_TRUNC('day', ${credit_transactions.createdAt})`)
      .orderBy(sql`DATE_TRUNC('day', ${credit_transactions.createdAt})`);

    // Return compiled analytics
    return {
      usageByCategory,
      usageOverTime,
      totalUsed: usageByCategory.reduce((sum, category) => sum + category.totalUsed, 0)
    };
  } catch (error) {
    console.error("Error getting credit usage analytics:", error);
    throw error;
  }
}

// Calculate token usage for text-based operations
export function calculateTokenCost(tokenCount: number): number {
  // 1 credit per 1000 tokens, rounded up
  return Math.ceil(tokenCount / 1000);
}

/**
 * Check if user has enough AI credits for an operation
 * This is a convenience function that returns a boolean directly
 */
export async function checkAICredits(userId: number, operationType: keyof typeof CREDIT_COSTS, quantity: number = 1): Promise<boolean> {
  try {
    const validationResult = await validateCredits(userId, operationType, quantity);
    return validationResult.hasEnoughCredits;
  } catch (error) {
    console.error(`Error checking AI credits for ${operationType}:`, error);
    return false;
  }
}

/**
 * Update AI credits usage after an operation
 * This is a simplified function that deducts credits directly without reservation
 */
export async function updateAICreditsUsage(
  userId: number, 
  operationType: keyof typeof CREDIT_COSTS, 
  quantity: number = 1,
  detail?: string
): Promise<boolean> {
  try {
    // Get user's current credits
    const [userCredit] = await db
      .select()
      .from(user_credits)
      .where(eq(user_credits.userId, userId))
      .limit(1);

    if (!userCredit) {
      throw new Error("No credits found for user");
    }

    // Calculate credit cost
    const creditCost = CREDIT_COSTS[operationType] * quantity;
    
    // Check if user has enough credits
    if (userCredit.creditsRemaining < creditCost) {
      throw new Error("Insufficient credits for this operation");
    }

    // Deduct credits directly
    const creditsRemaining = userCredit.creditsRemaining - creditCost;
    
    // Log transaction with full details
    await db.transaction(async (tx) => {
      // Update user's credit balance
      await tx
        .update(user_credits)
        .set({ 
          creditsRemaining,
          lastUpdated: new Date()
        })
        .where(eq(user_credits.userId, userId));

      // Log transaction
      await tx
        .insert(credit_transactions)
        .values({
          userId,
          amount: -creditCost,
          creditsBefore: userCredit.creditsRemaining,
          creditsAfter: creditsRemaining,
          type: 'use',
          action: operationType.toLowerCase(),
          description: detail || `Used ${creditCost} credits for ${operationType}`
        });
    });
    
    return true;
  } catch (error) {
    console.error(`Error updating AI credits for ${operationType}:`, error);
    return false;
  }
}