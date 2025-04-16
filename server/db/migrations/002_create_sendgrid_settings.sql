-- First, drop the old smtp_settings table
DROP TABLE IF EXISTS smtp_settings;

-- Create new sendgrid_settings table
CREATE TABLE IF NOT EXISTS sendgrid_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    api_key TEXT NOT NULL,
    from_email TEXT NOT NULL,
    from_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
