-- Remove description column from subscriber_groups table
ALTER TABLE subscriber_groups DROP COLUMN IF EXISTS description;
