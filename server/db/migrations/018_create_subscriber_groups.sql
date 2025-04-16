
-- Create subscriber_groups table
CREATE TABLE IF NOT EXISTS subscriber_groups (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create subscriber_group_members table for many-to-many relationship
CREATE TABLE IF NOT EXISTS subscriber_group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES subscriber_groups(id) ON DELETE CASCADE,
    subscriber_id INTEGER NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscriber_groups_user_id ON subscriber_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriber_group_members_group_id ON subscriber_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_subscriber_group_members_subscriber_id ON subscriber_group_members(subscriber_id);

-- Add unique constraint to prevent duplicate memberships
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_group_member 
ON subscriber_group_members(group_id, subscriber_id);
