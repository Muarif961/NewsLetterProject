-- Drop the old smtp_settings table
DROP TABLE IF EXISTS smtp_settings;

-- Create new verified_emails table
CREATE TABLE IF NOT EXISTS verified_emails (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    email TEXT NOT NULL,
    verification_token TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'pending',
    is_domain BOOLEAN NOT NULL DEFAULT false,
    dns_records JSONB,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, email)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_verified_emails_user_id ON verified_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_verified_emails_status ON verified_emails(verification_status);

-- Add constraint for verification_status values
ALTER TABLE verified_emails 
ADD CONSTRAINT verified_emails_status_check 
CHECK (verification_status IN ('pending', 'verified', 'failed'));
