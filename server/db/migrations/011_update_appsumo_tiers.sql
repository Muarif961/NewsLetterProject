-- Remove tier column from appsumo_codes as it's determined by code count
ALTER TABLE appsumo_codes DROP COLUMN IF EXISTS tier;

-- Add check constraint to user_subscriptions to ensure valid tier values
ALTER TABLE user_subscriptions 
  DROP CONSTRAINT IF EXISTS valid_tier_check,
  ADD CONSTRAINT valid_tier_check 
  CHECK (tier IN ('starter', 'growth', 'professional'));

-- Add index for faster tier lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier ON user_subscriptions(tier);
