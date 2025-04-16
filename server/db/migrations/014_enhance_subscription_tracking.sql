-- Add columns for initial limits to user_subscriptions
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS initial_ai_credits INTEGER,
ADD COLUMN IF NOT EXISTS subscriber_limit INTEGER;

-- Update existing rows with correct initial values
UPDATE user_subscriptions
SET 
  initial_ai_credits = CASE 
    WHEN tier = 'starter' THEN 100
    WHEN tier = 'growth' THEN 250
    WHEN tier = 'professional' THEN 500
  END,
  subscriber_limit = CASE 
    WHEN tier = 'starter' THEN 5000
    WHEN tier = 'growth' THEN 10000
    WHEN tier = 'professional' THEN 20000
  END
WHERE initial_ai_credits IS NULL OR subscriber_limit IS NULL;

-- Add constraints to ensure these values are always set
ALTER TABLE user_subscriptions
ALTER COLUMN initial_ai_credits SET NOT NULL,
ALTER COLUMN subscriber_limit SET NOT NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_limits 
ON user_subscriptions(user_id, initial_ai_credits, subscriber_limit);
