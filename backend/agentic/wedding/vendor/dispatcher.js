// backend/agentic/wedding/vendor/dispatcher.js
//
// Routes a tool_use block's tool name + input to the correct handler.
// Lifted from server.js _vendorChatDispatchTool (Session 1, unchanged since).
//
// Two routing categories:
//   1. Tools handled by the shared executeToolCall (server.js line ~3405),
//      which is the legacy dispatcher that the v2 path also uses. These
//      tools share their write paths with the v2 endpoint surface.
//   2. Tools whose logic was extracted into ./toolHandlers/*.js because
//      their inline definitions in server.js predated executeToolCall.
//
// The block_date tool has a name mismatch: the schema calls it `block_date`
// (per the vendor-facing spec) but executeToolCall's case is `block_calendar_dates`.
// The mapping happens here.

const engine = require('./engine');
const { sendPaymentReminder } = require('./toolHandlers/sendPaymentReminder');
const { logExpense } = require('./toolHandlers/logExpense');
const { replyToEnquiry } = require('./toolHandlers/replyToEnquiry');
const { recordPayment } = require('./toolHandlers/recordPayment');

async function dispatchTool(toolName, toolInput, vendor) {
  const { helpers } = engine.deps();
  const { executeToolCall } = helpers;

  switch (toolName) {
    // Covered by the existing executeToolCall (server.js ~3405) — reuse directly.
    case 'create_invoice':
    case 'add_client':
    case 'create_task':
    case 'send_client_reminder':
      return await executeToolCall(toolName, toolInput, vendor);

    // Spec name → existing executor case name.
    case 'block_date':
      return await executeToolCall('block_calendar_dates', toolInput, vendor);

    // Logic extracted from /api/v2/dreamai/vendor-action/* HTTP handlers.
    case 'send_payment_reminder':
      return await sendPaymentReminder(vendor.id, toolInput);
    case 'log_expense':
      return await logExpense(vendor.id, toolInput);
    case 'reply_to_enquiry':
      return await replyToEnquiry(vendor.id, toolInput);
    case 'record_payment':
      return await recordPayment(vendor.id, toolInput);

    default:
      return 'Unknown tool: ' + toolName;
  }
}

module.exports = { dispatchTool };
