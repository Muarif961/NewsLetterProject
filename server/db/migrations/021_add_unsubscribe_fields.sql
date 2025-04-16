
-- Add unsubscribe related fields to subscribers table
ALTER TABLE subscribers 
ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT,
ADD COLUMN IF NOT EXISTS unsubscribe_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS unsubscribe_reason TEXT;

-- Create index for faster token lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_subscriber_unsubscribe_token ON subscribers(unsubscribe_token);
