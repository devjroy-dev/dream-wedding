// backend/agentic/wedding/vendor/dispatcher.js
//
// Routes a tool_use block's tool name + input to the correct handler.
// Session 3 (2026-05-12) renamed all 9 tools to wedding_* prefix and added
// the ALIASES map for backwards-compat with any pre-S3 stored tool_use blocks
// and stale clients.
//
// Two routing categories:
//   1. Tools handled by the shared executeToolCall (server.js line ~3405),
//      which is the legacy dispatcher that the v2 path also uses. executeToolCall's
//      case names stay unprefixed (SESSION_BOUNDARIES — shared cross-product surface).
//      Each case here translates wedding_* → canonical unprefixed name before delegating.
//   2. Tools whose logic was extracted into ./toolHandlers/*.js because
//      their inline definitions in server.js predated executeToolCall.
//
// ALIASES map: deprecated unprefixed names (pre-S3) → current wedding_* names.
// Removal criterion: zero deprecation warnings in Railway logs for 14 consecutive
// days post-S3 ship. Slated for Session 8.5 cleanup.

const engine = require('./engine');
const { sendPaymentReminder } = require('./toolHandlers/sendPaymentReminder');
const { logExpense } = require('./toolHandlers/logExpense');
const { replyToEnquiry } = require('./toolHandlers/replyToEnquiry');
const { recordPayment } = require('./toolHandlers/recordPayment');

// Deprecated unprefixed tool names (pre-Session-3) → current wedding_* names.
// Any stored tool_use block from before 2026-05-12 references unprefixed names;
// route them transparently and log a warning so we can confirm zero usage before
// removing this map in Session 8.5.
const ALIASES = {
  create_invoice: 'wedding_create_invoice',
  add_client: 'wedding_add_client',
  create_task: 'wedding_create_task',
  block_date: 'wedding_block_date',
  send_payment_reminder: 'wedding_send_payment_reminder',
  send_client_reminder: 'wedding_send_client_reminder',
  log_expense: 'wedding_log_expense',
  reply_to_enquiry: 'wedding_reply_to_enquiry',
  record_payment: 'wedding_record_payment',
};

async function dispatchTool(toolName, toolInput, vendor) {
  const { helpers } = engine.deps();
  const { executeToolCall } = helpers;

  // Canonicalize deprecated unprefixed names.
  if (ALIASES[toolName]) {
    console.warn(`[vendor-engine] deprecated tool name "${toolName}", routing to "${ALIASES[toolName]}"`);
    toolName = ALIASES[toolName];
  }

  switch (toolName) {
    // Covered by the shared executeToolCall (server.js ~3405). Its case names
    // stay unprefixed — they're cross-product (bride + vendor + legacy couple).
    // Translate wedding_* → canonical here before delegating.
    case 'wedding_create_invoice':
      return await executeToolCall('create_invoice', toolInput, vendor);
    case 'wedding_add_client':
      return await executeToolCall('add_client', toolInput, vendor);
    case 'wedding_create_task':
      return await executeToolCall('create_task', toolInput, vendor);
    case 'wedding_send_client_reminder':
      return await executeToolCall('send_client_reminder', toolInput, vendor);

    // Spec name → existing executor case name (executor uses block_calendar_dates).
    case 'wedding_block_date':
      return await executeToolCall('block_calendar_dates', toolInput, vendor);

    // Logic extracted from /api/v2/dreamai/vendor-action/* HTTP handlers.
    case 'wedding_send_payment_reminder':
      return await sendPaymentReminder(vendor.id, toolInput);
    case 'wedding_log_expense':
      return await logExpense(vendor.id, toolInput);
    case 'wedding_reply_to_enquiry':
      return await replyToEnquiry(vendor.id, toolInput);
    case 'wedding_record_payment':
      return await recordPayment(vendor.id, toolInput);

    default:
      return 'Unknown tool: ' + toolName;
  }
}

module.exports = { dispatchTool };
