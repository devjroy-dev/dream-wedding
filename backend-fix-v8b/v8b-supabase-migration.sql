-- V8 SQL MIGRATION — couple_budget_categories table
-- Run in Supabase SQL Editor for project nqcdfzbvlrcrjineoudp
-- Run BEFORE deploying backend-fix-v8b-endpoints

CREATE TABLE IF NOT EXISTS couple_budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_key TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  pct INTEGER NOT NULL DEFAULT 0,
  allocated_amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_couple_budget_categories_couple_id ON couple_budget_categories(couple_id);

-- Verify table exists:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'couple_budget_categories'
ORDER BY ordinal_position;
