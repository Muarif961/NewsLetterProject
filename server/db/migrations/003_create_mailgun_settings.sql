-- First, drop the old sendgrid_settings table
DROP TABLE IF EXISTS sendgrid_settings;

-- Create new mailgun_settings table
CREATE TABLE IF NOT EXISTS mailgun_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    api_key TEXT NOT NULL,
    domain TEXT NOT NULL,
    from_email TEXT NOT NULL,
    from_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
