-- Add password reset fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_password_token TEXT,
ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP WITH TIME ZONE;

-- Make email and full_name required
ALTER TABLE users 
ALTER COLUMN email SET NOT NULL,
ALTER COLUMN full_name SET NOT NULL;

-- Add unique constraint to email
ALTER TABLE users 
ADD CONSTRAINT users_email_unique UNIQUE (email);
