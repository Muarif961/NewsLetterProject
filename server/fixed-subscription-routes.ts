import express, { Router, Request, Response } from "express";
import Stripe from "stripe";
import { db } from "./db";
import { users, user_subscriptions } from "./db/schema";
import { eq } from "drizzle-orm";
import { createPortalSession } from "./fixed-portal-handler";
import { createCheckoutSession } from "./fixed-checkout";
import { completeRegistration } from "./fixed-complete-registration";
import { AI_CREDITS } from "./lib/subscription-limits";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

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
    price: 9.99,
    priceId: process.env.STRIPE_PRICE_ID_STARTER,
    features: [
      "Up to 500 subscribers",
      "Basic newsletter templates",
      "Email campaign analytics",
      "100 AI credits per month",
    ],
    subscriberLimit: 500,
    initialAiCredits: 100,
    aiCreditsPerMonth: 100,
    trialDays: 14,
  },
  // Other plans...
};

// Hash password function
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  return salt + ":" + derivedKey.toString("hex");
}

export function setupSubscriptionRoutes(app: express.Express) {
  const router = Router();

  // Create checkout session endpoint
  router.post("/create-checkout-session", async (req: Request, res: Response) => {
    createCheckoutSession(req, res, stripe, SUBSCRIPTION_PLANS);
  });

  // Complete registration endpoint
  router.get("/complete-registration", async (req: Request, res: Response) => {
    completeRegistration(req, res, stripe, SUBSCRIPTION_PLANS);
  });

  // Portal endpoint - using our fixed handler
  router.post("/portal", async (req: Request, res: Response) => {
    createPortalSession(req, res, stripe);
  });

  // Register routes
  app.use("/api/subscription", router);
}
