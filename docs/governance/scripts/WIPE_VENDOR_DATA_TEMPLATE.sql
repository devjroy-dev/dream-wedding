-- ============================================================
-- WIPE VENDOR DATA — integration test clean slate
-- ============================================================
-- REPLACE ALL OCCURRENCES OF <SWATI_VENDOR_UUID> with the
-- vendor's actual UUID before running.
--
-- Get it with:
--   SELECT id, name FROM vendors WHERE name ILIKE '%swati%';
-- ============================================================
--
-- ─────────────────────────────────────────────────────────
-- STEP 0: VERIFY TABLE EXISTENCE (run this first, separately)
-- ─────────────────────────────────────────────────────────
-- Run this query in the Supabase SQL editor BEFORE the wipe
-- to confirm every table in this script exists in the schema.
--
--   SELECT table_name
--   FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name IN (
--       'vendor_tds_ledger',
--       'vendor_payment_schedules',
--       'vendor_team_payments',
--       'vendor_team_broadcasts',
--       'vendor_team_members',
--       'vendor_enquiry_messages',
--       'vendor_enquiries',
--       'vendor_reminders',
--       'vendor_broadcasts',
--       'vendor_invoices',
--       'vendor_expenses',
--       'vendor_todos',
--       'vendor_calendar_events',
--       'vendor_availability_blocks',
--       'vendor_leads',
--       'vendor_packages',
--       'vendor_clients',
--       'vendor_dreamai_messages'
--     )
--   ORDER BY table_name;
--
-- Expected: 18 rows. If fewer, identify the missing table
-- and either confirm it doesn't exist (remove from script)
-- or check spelling before proceeding.
-- ─────────────────────────────────────────────────────────
--
-- FK CASCADE AUDIT (2026-05-13):
-- No child tables found referencing vendor_packages,
-- vendor_leads, vendor_team_members, vendor_reminders,
-- vendor_broadcasts, vendor_payment_schedules,
-- vendor_team_payments, or vendor_team_broadcasts.
-- team_member_id is only used within vendor_team_payments
-- and vendor_team_broadcasts — no further dependants.
-- Re-audit if new tables are added in future sessions.
-- ============================================================

BEGIN;

DO $$
DECLARE
  target_vendor_id UUID := '<SWATI_VENDOR_UUID>';
BEGIN

  -- ──────────────────────────────────────────────────────
  -- Delete in dependency order: children first, parents last
  -- ──────────────────────────────────────────────────────

  -- TDS ledger (references invoices)
  DELETE FROM vendor_tds_ledger WHERE vendor_id = target_vendor_id;

  -- Payment schedules (references invoices + clients)
  DELETE FROM vendor_payment_schedules WHERE vendor_id = target_vendor_id;

  -- Team payments (references team_members + invoices)
  DELETE FROM vendor_team_payments WHERE vendor_id = target_vendor_id;

  -- Team broadcasts (references team_members)
  DELETE FROM vendor_team_broadcasts WHERE vendor_id = target_vendor_id;

  -- Team members (parent for team_payments + team_broadcasts)
  DELETE FROM vendor_team_members WHERE vendor_id = target_vendor_id;

  -- Enquiry messages (references enquiries)
  DELETE FROM vendor_enquiry_messages WHERE vendor_id = target_vendor_id;

  -- Enquiries
  DELETE FROM vendor_enquiries WHERE vendor_id = target_vendor_id;

  -- Reminders
  DELETE FROM vendor_reminders WHERE vendor_id = target_vendor_id;

  -- Broadcast log
  DELETE FROM vendor_broadcasts WHERE vendor_id = target_vendor_id;

  -- Invoices (parent for payment_schedules, tds_ledger)
  DELETE FROM vendor_invoices WHERE vendor_id = target_vendor_id;

  -- Expenses
  DELETE FROM vendor_expenses WHERE vendor_id = target_vendor_id;

  -- Todos / tasks
  DELETE FROM vendor_todos WHERE vendor_id = target_vendor_id;

  -- Calendar events
  DELETE FROM vendor_calendar_events WHERE vendor_id = target_vendor_id;

  -- Availability blocks
  DELETE FROM vendor_availability_blocks WHERE vendor_id = target_vendor_id;

  -- Leads
  DELETE FROM vendor_leads WHERE vendor_id = target_vendor_id;

  -- Packages
  DELETE FROM vendor_packages WHERE vendor_id = target_vendor_id;

  -- Clients (parent for invoices, expenses)
  DELETE FROM vendor_clients WHERE vendor_id = target_vendor_id;

  -- DreamAI conversation history
  DELETE FROM vendor_dreamai_messages WHERE vendor_id = target_vendor_id;

  RAISE NOTICE 'Wipe complete for vendor: %', target_vendor_id;
END $$;

-- ============================================================
-- STEP 2: Verify the wipe before committing
-- ============================================================
-- All counts must be 0. If any row > 0: ROLLBACK and investigate.

SELECT 'vendor_tds_ledger'          AS table_name, COUNT(*) AS remaining FROM vendor_tds_ledger          WHERE vendor_id = '<SWATI_VENDOR_UUID>'
UNION ALL
SELECT 'vendor_payment_schedules',  COUNT(*) FROM vendor_payment_schedules  WHERE vendor_id = '<SWATI_VENDOR_UUID>'
UNION ALL
SELECT 'vendor_team_payments',      COUNT(*) FROM vendor_team_payments      WHERE vendor_id = '<SWATI_VENDOR_UUID>'
UNION ALL
SELECT 'vendor_team_broadcasts',    COUNT(*) FROM vendor_team_broadcasts    WHERE vendor_id = '<SWATI_VENDOR_UUID>'
UNION ALL
SELECT 'vendor_team_members',       COUNT(*) FROM vendor_team_members       WHERE vendor_id = '<SWATI_VENDOR_UUID>'
UNION ALL
SELECT 'vendor_enquiry_messages',   COUNT(*) FROM vendor_enquiry_messages   WHERE vendor_id = '<SWATI_VENDOR_UUID>'
UNION ALL
SELECT 'vendor_enquiries',          COUNT(*) FROM vendor_enquiries          WHERE vendor_id = '<SWATI_VENDOR_UUID>'
UNION ALL
SELECT 'vendor_reminders',          COUNT(*) FROM vendor_reminders          WHERE vendor_id = '<SWATI_VENDOR_UUID>'
UNION ALL
SELECT 'vendor_broadcasts',         COUNT(*) FROM vendor_broadcasts         WHERE vendor_id = '<SWATI_VENDOR_UUID>'
UNION ALL
SELECT 'vendor_invoices',           COUNT(*) FROM vendor_invoices           WHERE vendor_id = '<SWATI_VENDOR_UUID>'
UNION ALL
SELECT 'vendor_expenses',           COUNT(*) FROM vendor_expenses           WHERE vendor_id = '<SWATI_VENDOR_UUID>'
UNION ALL
SELECT 'vendor_todos',              COUNT(*) FROM vendor_todos              WHERE vendor_id = '<SWATI_VENDOR_UUID>'
UNION ALL
SELECT 'vendor_calendar_events',    COUNT(*) FROM vendor_calendar_events    WHERE vendor_id = '<SWATI_VENDOR_UUID>'
UNION ALL
SELECT 'vendor_availability_blocks',COUNT(*) FROM vendor_availability_blocks WHERE vendor_id = '<SWATI_VENDOR_UUID>'
UNION ALL
SELECT 'vendor_leads',              COUNT(*) FROM vendor_leads              WHERE vendor_id = '<SWATI_VENDOR_UUID>'
UNION ALL
SELECT 'vendor_packages',           COUNT(*) FROM vendor_packages           WHERE vendor_id = '<SWATI_VENDOR_UUID>'
UNION ALL
SELECT 'vendor_clients',            COUNT(*) FROM vendor_clients            WHERE vendor_id = '<SWATI_VENDOR_UUID>'
UNION ALL
SELECT 'vendor_dreamai_messages',   COUNT(*) FROM vendor_dreamai_messages   WHERE vendor_id = '<SWATI_VENDOR_UUID>';

-- ============================================================
-- ⚠️  DO NOT COMMIT BLINDLY ⚠️
--
-- If all 18 rows above show 0  →  COMMIT;
-- If anything looks wrong       →  ROLLBACK;
-- ============================================================

-- COMMIT;
-- ROLLBACK;
