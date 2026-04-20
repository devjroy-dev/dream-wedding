-- Session 11 — Discovery trial tracking columns on vendors table
-- These were referenced in code but never migrated. Mode-state endpoint
-- silently fails (404) when these columns don't exist, leaving the
-- Discovery Dash stuck on "Loading..." forever.

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS discovery_basics_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS discovery_trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS discovery_trial_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS discovery_trial_status TEXT DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS discover_completion_pct INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS response_time_commitment TEXT;

NOTIFY pgrst, 'reload schema';
