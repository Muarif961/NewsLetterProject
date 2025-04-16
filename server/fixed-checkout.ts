import { Request, Response } from "express";
import Stripe from "stripe";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Hash password function
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  return salt + ":" + derivedKey.toString("hex");
}

export async function createCheckoutSession(req: Request, res: Response, stripe: Stripe, SUBSCRIPTION_PLANS: any) {
  const { username, email, password, planId } = req.body;

  if (!username || !email || !password || !planId) {
    return res.status(400).json({
      message: "Missing required fields: username, email, password, planId",
    });
  }

  // Check if plan exists
  if (!SUBSCRIPTION_PLANS[planId]) {
    return res.status(400).json({ message: "Invalid plan ID" });
  }

  try {
    const plan = SUBSCRIPTION_PLANS[planId];
    const priceId = plan.priceId;

    if (!priceId) {
      console.error(`Missing Stripe price ID for plan: ${planId}`);
      return res.status(500).json({ message: "Plan not properly configured" });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Store user data and hashed password in metadata for later use
    const metadata = {
      username,
      email,
      password: hashedPassword,
      planId,
    };

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.origin}/api/subscription/complete-registration?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/signup?canceled=true`,
      metadata: metadata,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({
      message: error.message || "Failed to create checkout session",
    });
  }
}
