// backend/agentic/wedding/vendor/pending.js
//
// Session 4 (2026-05-12) — CRUD helpers for the pending_vendor_tool_calls table.
//
// When Just Do It is OFF, the loop pauses at the first tool_use, persists a row
// here, and returns a pendingTool envelope to the frontend. Confirm loads the
// row, executes the held tool, and continues the loop. Cancel deletes the row
// and returns an acknowledgement.
//
// Schema (see sql/session4_pending_vendor_tool_calls.sql):
//   id                    uuid PK
//   vendor_id             uuid
//   pending_token         text UNIQUE — 32-char hex, what the frontend sees
//   tool_name             text
//   tool_input            jsonb
//   tool_preview          text
//   tool_use_id           text — Anthropic block id, needed for resume
//   conversation_messages jsonb — full messages[] at pause point
//   surface               text — 'native' | 'web' | 'whatsapp'
//   created_at            timestamptz
//   expires_at            timestamptz default now() + 1 hour
//
// Access control: server-side vendor_id match. No RLS — matches every existing
// vendor table in the codebase.

const crypto = require('crypto');
const engine = require('./engine');

// Generate a 32-char hex token. Consistent with the Circle invite-token pattern
// (server.js:16316 uses randomBytes(32) for a 64-char token; we use randomBytes(16)
// for a shorter handle since these tokens are transient and never user-visible).
function newPendingToken() {
  return crypto.randomBytes(16).toString('hex');
}

// Insert a paused tool-call row. Returns { pending_token } on success.
// Throws on DB error so the loop can surface a clean 500.
async function createPending({
  vendor_id,
  tool_name,
  tool_input,
  tool_preview,
  tool_use_id,
  conversation_messages,
  surface,
}) {
  const { supabase } = engine.deps();
  const pending_token = newPendingToken();

  const { data, error } = await supabase
    .from('pending_vendor_tool_calls')
    .insert([{
      vendor_id,
      pending_token,
      tool_name,
      tool_input,
      tool_preview,
      tool_use_id,
      conversation_messages,
      surface: surface || 'native',
    }])
    .select('pending_token')
    .single();

  if (error) {
    console.error('[vendor-engine pending.createPending]', error.message);
    throw error;
  }
  return { pending_token: data.pending_token };
}

// Look up a pending row by token. Validates vendor_id ownership.
// Returns the row on match, null if not found, expired, or owned by another vendor.
async function readPending(pendingToken, vendorId) {
  const { supabase } = engine.deps();

  const { data, error } = await supabase
    .from('pending_vendor_tool_calls')
    .select('id, vendor_id, pending_token, tool_name, tool_input, tool_preview, tool_use_id, conversation_messages, surface, created_at, expires_at')
    .eq('pending_token', pendingToken)
    .maybeSingle();

  if (error) {
    console.error('[vendor-engine pending.readPending]', error.message);
    throw error;
  }
  if (!data) return null;

  // Ownership check — must match the requesting vendor.
  if (data.vendor_id !== vendorId) {
    console.warn('[vendor-engine pending.readPending] vendor_id mismatch on token', pendingToken);
    return null;
  }

  // Expiry check.
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }

  return data;
}

// Delete by token + vendor_id (defense in depth: don't let one vendor cancel another's row).
// Returns true if a row was deleted, false otherwise.
async function deletePending(pendingToken, vendorId) {
  const { supabase } = engine.deps();

  const { data, error } = await supabase
    .from('pending_vendor_tool_calls')
    .delete()
    .eq('pending_token', pendingToken)
    .eq('vendor_id', vendorId)
    .select('id');

  if (error) {
    console.error('[vendor-engine pending.deletePending]', error.message);
    throw error;
  }
  return Array.isArray(data) && data.length > 0;
}

module.exports = { createPending, readPending, deletePending, newPendingToken };
