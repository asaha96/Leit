-- Migration: Add Clerk authentication support
-- This migration adds external_sub column for Clerk user IDs

-- Add external_sub column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS external_sub TEXT UNIQUE;

-- Create index for Clerk user lookups
CREATE INDEX IF NOT EXISTS idx_users_external_sub ON users(external_sub);

-- Make email nullable (Clerk handles email, we just store it for reference)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Make password_hash nullable (Clerk handles auth)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
