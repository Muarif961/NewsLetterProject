-- First, drop the redundant column
ALTER TABLE appsumo_codes DROP COLUMN IF EXISTS redeemed;

-- Ensure consistent timestamp types
ALTER TABLE appsumo_codes 
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
  ALTER COLUMN redeemed_at TYPE TIMESTAMP WITH TIME ZONE;

-- Add tier column if it doesn't exist
ALTER TABLE appsumo_codes 
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'tier1';

-- Fix the timestamps in user_subscriptions
ALTER TABLE user_subscriptions
  ALTER COLUMN activated_at TYPE TIMESTAMP WITH TIME ZONE,
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_appsumo_codes_is_redeemed ON appsumo_codes(is_redeemed);
CREATE INDEX IF NOT EXISTS idx_appsumo_codes_tier ON appsumo_codes(tier);
