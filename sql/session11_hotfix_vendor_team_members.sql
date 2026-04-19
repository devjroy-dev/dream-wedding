-- Session 11 hotfix: add missing columns to vendor_team_members
-- Backend POST /api/ds/team and PATCH /api/ds/team/:id reference 'email' and 'rate'
-- but the table only has name/phone/role/status/permissions.
-- This migration adds email + rate + rate_unit columns. All optional.

ALTER TABLE vendor_team_members
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS rate INTEGER,
  ADD COLUMN IF NOT EXISTS rate_unit TEXT DEFAULT 'per_event';

-- Refresh PostgREST schema cache (Supabase) so new columns are immediately available.
NOTIFY pgrst, 'reload schema';
