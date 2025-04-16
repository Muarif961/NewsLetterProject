import { db } from "../db";
import { subscribers, user_subscriptions, user_credits } from "../db/schema";
import { eq, count } from "drizzle-orm";

// Define tier limits
export const TIER_LIMITS = {
  starter: 5000,
  growth: 10000,
  professional: 20000
} as const;

export const AI_CREDITS = {
  starter: 100,
  growth: 250,
  professional: 500
} as const;

export const CREDIT_CONSUMPTION = {
  content_generation: 1, // ~3000 tokens
  summarization: 1,     // ~2000 tokens
  style_variation: 1    // ~2000 tokens
} as const;

export type SubscriptionTier = keyof typeof TIER_LIMITS;

// Check if user has reached their subscriber limit
export async function checkSubscriberLimit(userId: number): Promise<{
  hasReachedLimit: boolean;
  currentCount: number;
  limit: number;
  tierName: string;
}> {
  try {
    // Get user's current tier
    const [subscription] = await db
      .select()
      .from(user_subscriptions)
      .where(eq(user_subscriptions.userId, userId))
      .limit(1);

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    // Get current subscriber count
    const [result] = await db
      .select({ count: count(subscribers.id) })
      .from(subscribers)
      .where(eq(subscribers.userId, userId));

    const currentCount = Number(result?.count || 0);
    const tierLimit = TIER_LIMITS[subscription.tier as keyof typeof TIER_LIMITS];

    return {
      hasReachedLimit: currentCount >= tierLimit,
      currentCount,
      limit: tierLimit,
      tierName: subscription.tier
    };
  } catch (error) {
    console.error("Error checking subscriber limit:", error);
    throw error;
  }
}

// Validate if user can add more subscribers
export async function canAddSubscribers(userId: number, count: number = 1): Promise<{
  canAdd: boolean;
  reason?: string;
  remaining: number;
}> {
  try {
    const { currentCount, limit } = await checkSubscriberLimit(userId);
    const remaining = limit - currentCount;

    return {
      canAdd: (currentCount + count) <= limit,
      reason: (currentCount + count) > limit ? 
        `Adding ${count} subscriber(s) would exceed your plan limit of ${limit}` : undefined,
      remaining
    };
  } catch (error) {
    console.error("Error validating subscriber addition:", error);
    throw error;
  }
}

// Check remaining AI credits
export async function checkRemainingAICredits(userId: number): Promise<{
  hasCredits: boolean;
  creditsRemaining: number;
}> {
  try {
    const [userCredits] = await db
      .select()
      .from(user_credits)
      .where(eq(user_credits.userId, userId))
      .limit(1);

    return {
      hasCredits: (userCredits?.credits || 0) > 0,
      creditsRemaining: userCredits?.credits || 0
    };
  } catch (error) {
    console.error("Error checking remaining AI credits:", error);
    throw error;
  }
}

// Get complete subscription details including limits and usage
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

    const { hasReachedLimit, currentCount, limit } = await checkSubscriberLimit(userId);
    const { creditsRemaining } = await checkRemainingAICredits(userId);

    return {
      tier: subscription.tier,
      subscriberLimit: limit,
      currentSubscribers: currentCount,
      hasReachedLimit,
      aiCreditsTotal: AI_CREDITS[subscription.tier as keyof typeof AI_CREDITS],
      aiCreditsRemaining: creditsRemaining,
      status: subscription.status,
      provider: subscription.provider,
      activatedAt: subscription.activatedAt
    };
  } catch (error) {
    console.error("Error getting subscription details:", error);
    throw error;
  }
}