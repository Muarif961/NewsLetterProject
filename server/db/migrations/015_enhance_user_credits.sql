-- Drop existing user_credits and credit_transactions tables
DROP TABLE IF EXISTS credit_transactions;
DROP TABLE IF EXISTS user_credits;

-- Recreate user_credits with enhanced tracking
CREATE TABLE user_credits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL UNIQUE,
    total_credits_allocated INTEGER NOT NULL,
    credits_remaining INTEGER NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_credits CHECK (credits_remaining >= 0)
);

-- Enhanced credit transactions table
CREATE TABLE credit_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    amount INTEGER NOT NULL,
    credits_before INTEGER NOT NULL,
    credits_after INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'initialize', 'use', 'add'
    action TEXT NOT NULL, -- 'newsletter_edit', 'subscription_renewal', etc.
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initialize user_credits from user_subscriptions
INSERT INTO user_credits (user_id, total_credits_allocated, credits_remaining)
SELECT 
    user_id,
    initial_ai_credits,
    initial_ai_credits
FROM user_subscriptions
ON CONFLICT (user_id) DO UPDATE
SET 
    total_credits_allocated = EXCLUDED.total_credits_allocated,
    credits_remaining = EXCLUDED.total_credits_allocated;

-- Create indexes for performance
CREATE INDEX idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX idx_credit_transactions_user_id_created ON credit_transactions(user_id, created_at);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
