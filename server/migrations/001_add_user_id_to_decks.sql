-- Migration: Add user_id column to decks table for user-scoped data
-- Run this on existing databases to add user scoping

-- Add user_id column (nullable initially for migration)
ALTER TABLE decks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create index for user-scoped queries
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id);

-- Optional: Assign existing decks to the first user (uncomment if needed)
-- UPDATE decks SET user_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1) WHERE user_id IS NULL;
