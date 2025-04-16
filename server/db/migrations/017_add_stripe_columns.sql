
-- Add Stripe-specific columns to user_subscriptions
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription ON user_subscriptions(stripe_subscription_id);

-- Migrate existing data from metadata
UPDATE user_subscriptions 
SET stripe_customer_id = (metadata->>'stripeCustomerId')::TEXT,
    stripe_subscription_id = (metadata->>'stripeSubscriptionId')::TEXT
WHERE provider = 'stripe' AND metadata IS NOT NULL;
