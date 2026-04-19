-- Session 11 Discovery Mega migration (Apr 20 2026)
-- Adds: trending pin columns + flex_leads toggle

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS trending_pinned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trending_pinned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS flex_leads_enabled BOOLEAN DEFAULT FALSE;

-- Index for trending lookups (small table so not critical, but good hygiene)
CREATE INDEX IF NOT EXISTS idx_vendors_trending_pinned
  ON vendors (trending_pinned) WHERE trending_pinned = TRUE;

-- Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
