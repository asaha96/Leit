-- Enable UUID generation (Postgres >=13 can use gen_random_uuid via pgcrypto)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (Clerk handles auth, we store external_sub for linking)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_sub TEXT UNIQUE,  -- Clerk user ID
  email TEXT,
  display_name TEXT,
  password_hash TEXT,  -- Deprecated: kept for backwards compatibility
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for Clerk user lookups
CREATE INDEX IF NOT EXISTS idx_users_external_sub ON users(external_sub);

-- Decks table
CREATE TABLE IF NOT EXISTS decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user-scoped deck queries
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id);

-- Cards table
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES decks(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  hints TEXT[] NOT NULL DEFAULT '{}',
  answers TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  media_refs JSONB,
  -- Scheduling fields for spaced repetition
  due_at TIMESTAMPTZ,
  ease REAL NOT NULL DEFAULT 2.5,
  interval_days REAL NOT NULL DEFAULT 1,
  lapses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deck_id UUID REFERENCES decks(id) ON DELETE SET NULL,
  score NUMERIC,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

-- Session events table
CREATE TABLE IF NOT EXISTS session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
  response TEXT,
  correct BOOLEAN,
  ai_score NUMERIC,
  quality TEXT,
  next_due TIMESTAMPTZ,
  -- New fields for difficulty inference
  response_time_ms INTEGER,           -- Time from card shown to answer reveal
  hint_used BOOLEAN DEFAULT FALSE,    -- Whether user clicked "Show Hint"
  inferred_quality TEXT,              -- AI/algorithm inferred quality
  inference_confidence NUMERIC,       -- Confidence of the inference (0-1)
  user_overrode BOOLEAN DEFAULT FALSE, -- Whether user selected different quality than inferred
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
