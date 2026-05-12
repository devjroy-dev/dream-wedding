// backend/agentic/wedding/vendor/usage.js
//
// Writes a per-turn telemetry row to dreamai_usage. Captures iterations,
// token counts, USD cost, tools used, and the stop_reason that ended the
// agentic loop.
//
// Per WORKING_PROTOCOL Rule V3 (Dev decision: option c), telemetry is
// per-turn rather than per-tool. Per-tool apportionment can be added later
// without schema change — Anthropic's usage field is response-level, so
// per-tool attribution would need synthetic apportionment regardless.

const engine = require('./engine');

// Best-effort write. Caller wraps in try/catch so a missing table doesn't
// break the user-visible reply.
async function recordUsage(vendorId, surface, row) {
  const { supabase } = engine.deps();

  const insertRow = {
    vendor_id: vendorId,
    surface,
    iterations: row.iterations || 0,
    tokens_in: row.tokens_in || 0,
    tokens_out: row.tokens_out || 0,
    usd_cost: row.usd_cost || 0,
    tools_used: (row.tools_used && row.tools_used.length) ? row.tools_used : null,
    stop_reason: row.stop_reason || null,
  };

  const { error } = await supabase.from('dreamai_usage').insert([insertRow]);
  if (error) {
    console.error('[vendor-engine usage.recordUsage]', error.message);
    throw error;
  }
}

module.exports = { recordUsage };
