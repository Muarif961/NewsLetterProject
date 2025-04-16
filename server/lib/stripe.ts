import Stripe from 'stripe';
import { z } from 'zod';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

// Initialize Stripe with the latest API version
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Define credit package schema for validation
const creditPackageSchema = z.object({
  id: z.string(),
  credits: z.number().int().positive(),
  price: z.number().int().positive(),
  currency: z.string(),
  name: z.string(),
  description: z.string(),
  features: z.array(z.string()).optional(),
});

export type CreditPackage = z.infer<typeof creditPackageSchema>;

// Credit package configurations
export const CREDIT_PACKAGES = {
  'credits-100': {
    id: 'credits-100',
    credits: 100,
    price: 1000, // $10.00
    currency: 'usd',
    name: 'Starter Pack',
    description: 'Perfect for small projects and testing',
    features: ['100 AI-powered content generations', 'Basic analytics', 'Email support']
  },
  'credits-300': {
    id: 'credits-300',
    credits: 300,
    price: 2500, // $25.00
    currency: 'usd',
    name: 'Growth Pack',
    description: 'Ideal for regular content creation',
    features: ['300 AI-powered content generations', 'Advanced analytics', 'Priority support']
  },
  'credits-1000': {
    id: 'credits-1000',
    credits: 1000,
    price: 7500, // $75.00
    currency: 'usd',
    name: 'Professional Pack',
    description: 'Best value for power users',
    features: ['1000 AI-powered content generations', 'Premium analytics', '24/7 priority support']
  }
} as const;

// Helper function to convert package ID to details with validation
export function getPackageDetails(packageId: string): CreditPackage {
  const pkg = CREDIT_PACKAGES[packageId as keyof typeof CREDIT_PACKAGES];
  if (!pkg) throw new Error(`Invalid package ID: ${packageId}`);

  // Validate package structure
  const result = creditPackageSchema.safeParse(pkg);
  if (!result.success) {
    throw new Error(`Invalid package configuration: ${result.error.message}`);
  }

  return pkg;
}

// Helper to format price for display
export function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toLowerCase(),
  }).format(price / 100);
}

// Helper to validate Stripe webhook signature
export async function validateStripeWebhook(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Promise<Stripe.Event> {
  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
  } catch (err) {
    const error = err as Error;
    throw new Error(`Webhook verification failed: ${error.message}`);
  }
}