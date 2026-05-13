-- ============================================================
-- 2026-05-13  DreamAI v3 schema fixes
-- Run once in the Supabase SQL editor.
-- Every statement is idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- ============================================================

-- 1. Soft-delete: add deleted_at to tables the agentic engine filters
--    context.js, editInvoice, deleteInvoice, editClient, deleteClient,
--    editExpense, deleteExpense, editCalendarEvent, editTask all do
--    .is('deleted_at', null). If the column is missing, every query errors.

ALTER TABLE vendor_invoices         ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE vendor_clients          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE vendor_expenses         ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE vendor_todos            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE vendor_calendar_events  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. vendor_todos: columns written by agentic create_task / editTask
--    priority: editTask writes this. Default 'med' keeps existing rows consistent.
--    client_name: create_task writes resolved_client_name here.
--    notes: REST POST /api/todos allows it; add so both paths agree.

ALTER TABLE vendor_todos ADD COLUMN IF NOT EXISTS priority    TEXT DEFAULT 'med';
ALTER TABLE vendor_todos ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE vendor_todos ADD COLUMN IF NOT EXISTS notes       TEXT;

-- 3. vendor_calendar_events: columns written by block_calendar_dates and editCalendarEvent
--    amount:      payment-schedule auto-events and editCalendarEvent write this.
--    notes:       block_calendar_dates and editCalendarEvent use this.
--    client_name: block_calendar_dates and editCalendarEvent write this.
--    source_type: payment-schedule route writes 'payment_schedule'.
--    source_id:   payment-schedule route writes the schedule UUID.

ALTER TABLE vendor_calendar_events ADD COLUMN IF NOT EXISTS amount      NUMERIC   DEFAULT 0;
ALTER TABLE vendor_calendar_events ADD COLUMN IF NOT EXISTS notes       TEXT;
ALTER TABLE vendor_calendar_events ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE vendor_calendar_events ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE vendor_calendar_events ADD COLUMN IF NOT EXISTS source_id   UUID;

-- 4. vendor_availability_blocks
--    block_calendar_dates (used by wedding_block_date tool) upserts here
--    with ON CONFLICT on (vendor_id, blocked_date). Without this table the
--    tool errors. The REST /api/availability routes use vendor_availability
--    (different name, same shape) and are unaffected.

CREATE TABLE IF NOT EXISTS vendor_availability_blocks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id    UUID        NOT NULL,
  blocked_date DATE        NOT NULL,
  reason       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (vendor_id, blocked_date)
);

-- 5. vendor_dreamai_messages
--    Chat-history persistence for all surfaces (native / web / whatsapp).
--    history.js reads and writes this table on every agentic turn.
--    Without it every turn fails at writeHistory.

CREATE TABLE IF NOT EXISTS vendor_dreamai_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  UUID        NOT NULL,
  surface    TEXT        NOT NULL DEFAULT 'native',
  role       TEXT        NOT NULL,
  content    TEXT,
  tool_calls JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vendor_dreamai_messages_vendor_created
  ON vendor_dreamai_messages (vendor_id, created_at DESC);

-- 6. pending_vendor_tool_calls
--    Pause-and-resume state for justDoIt=false turns.
--    pending.js createPending / readPending / deletePending use this table.
--    Without it the /vendor-confirm endpoint crashes on every call.

CREATE TABLE IF NOT EXISTS pending_vendor_tool_calls (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id             UUID        NOT NULL,
  pending_token         TEXT        UNIQUE NOT NULL,
  tool_name             TEXT        NOT NULL,
  tool_input            JSONB,
  tool_preview          TEXT,
  tool_use_id           TEXT,
  conversation_messages JSONB,
  surface               TEXT        DEFAULT 'native',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  expires_at            TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
);

-- 7. dreamai_usage
--    Per-turn telemetry. Best-effort — errors are logged but don't break replies.

CREATE TABLE IF NOT EXISTS dreamai_usage (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   UUID         NOT NULL,
  surface     TEXT,
  iterations  INT          DEFAULT 0,
  tokens_in   INT          DEFAULT 0,
  tokens_out  INT          DEFAULT 0,
  usd_cost    NUMERIC(10,6) DEFAULT 0,
  tools_used  JSONB,
  stop_reason TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- 8. hot_dates
--    Vivah Muhurat / auspicious wedding dates. Read by wedding_hot_dates_context.
--    Populate manually or via a seed script after creating the table.

CREATE TABLE IF NOT EXISTS hot_dates (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  date       DATE        NOT NULL,
  tradition  TEXT,
  region     TEXT        DEFAULT 'All India',
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hot_dates_date_idx ON hot_dates (date);
