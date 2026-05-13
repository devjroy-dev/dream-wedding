// backend/agentic/wedding/vendor/history.js
//
// Reads and writes the vendor_dreamai_messages table that persists agentic
// chat history across surfaces (native, web, whatsapp).
//
// Schema (see sql/session2_vendor_dreamai_messages.sql):
//   id          uuid PK
//   vendor_id   uuid
//   surface     text   — 'native' | 'web' | 'whatsapp'
//   role        text   — 'user' | 'assistant'
//   content     text
//   tool_calls  jsonb  — array of tool names used on assistant turns
//   created_at  timestamptz
//
// Read path returns Anthropic message-shaped objects ({role, content}) so the
// loop can splice them straight into the messages array without re-mapping.
// The route handler's existing history-shape contract is { role, text } — so
// readHistory translates DB rows to that shape so downstream logic doesn't
// have to special-case sources.

const engine = require('./engine');

const HISTORY_LIMIT_DEFAULT = 10;

// Returns up to `limit` most recent message rows for this vendor, oldest-first
// (so the array can be spread directly before the new user message).
// Rows are returned shaped to match the request-body { role, text } contract.
async function readHistory(vendorId, limit = HISTORY_LIMIT_DEFAULT) {
  const { supabase } = engine.deps();

  // We need the last N turns oldest-first. Fetch DESC with limit, then reverse.
  const { data, error } = await supabase
    .from('vendor_dreamai_messages')
    .select('role, content, created_at')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    // Surface but don't throw — caller decides whether to proceed without history.
    console.error('[vendor-engine history.readHistory]', error.message);
    return [];
  }
  if (!data || data.length === 0) return [];

  // Reverse to oldest-first, then map to the wire shape the loop expects.
  return data
    .slice()
    .reverse()
    .map(row => ({ role: row.role, text: row.content }));
}

// Writes one or more chat turns to the DB. Accepts an array of
// { role: 'user' | 'assistant', content: string, tool_calls?: string[] }
// objects so a turn's user+assistant pair lands in one batch insert.
//
// surface is required: 'native' | 'web' | 'whatsapp'.
// Best-effort — caller wraps in try/catch and logs failures without breaking
// the user-visible reply. We re-throw here so the caller's catch fires.
async function writeHistory(vendorId, surface, messages) {
  const { supabase } = engine.deps();

  if (!Array.isArray(messages) || messages.length === 0) return;

  const rows = messages.map(m => ({
    vendor_id: vendorId,
    surface,
    role: m.role,
    content: m.content,
    tool_calls: (m.tool_calls && m.tool_calls.length) ? m.tool_calls : null,
  }));

  const { error } = await supabase.from('vendor_dreamai_messages').insert(rows);
  if (error) {
    console.error('[vendor-engine history.writeHistory]', error.message);
    throw error;
  }
}

module.exports = { readHistory, writeHistory, HISTORY_LIMIT_DEFAULT };
