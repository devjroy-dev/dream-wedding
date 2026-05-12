// backend/agentic/wedding/vendor/preview.js
//
// Session 4 (2026-05-12) — Build a short, vendor-voice preview string for a
// pending tool call. The string flows from the loop to the pending_vendor_tool_calls
// row, into the API response's pendingTool.preview field, and onto the
// ActionCard in the native app.
//
// Constraints (per WORKING_PROTOCOL Rule V7 and the no-markdown system prompt):
//   - Plain prose, no markdown
//   - Currency: "Rs" always, never "₹"
//   - Direct, brisk, action-oriented
//   - Under ~80 chars where possible (mobile card width)
//
// Each tool gets a tailored preview. Unknown tools fall through to a generic
// "Run <tool_name>" line so the system stays operational if a new tool ships
// without a preview update.

// Indian number formatting (matches systemPrompt.js convention).
function fmtRs(n) {
  if (n == null || isNaN(n)) return null;
  return 'Rs ' + Math.round(Number(n)).toLocaleString('en-IN');
}

function safe(s, max = 60) {
  if (!s) return '';
  const str = String(s).trim();
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

function buildToolPreview(toolName, toolInput) {
  const input = toolInput || {};
  switch (toolName) {
    case 'wedding_create_invoice': {
      const amt = fmtRs(input.amount);
      const client = safe(input.client_name);
      if (amt && client) return `Create invoice — ${client} · ${amt}`;
      if (client)        return `Create invoice — ${client}`;
      return 'Create invoice';
    }
    case 'wedding_add_client': {
      const name = safe(input.client_name);
      const date = input.event_date ? ` (${input.event_date})` : '';
      return name ? `Add client — ${name}${date}` : 'Add client';
    }
    case 'wedding_create_task': {
      const task = safe(input.task, 60);
      const who  = input.assignee ? ` · for ${safe(input.assignee, 20)}` : '';
      const due  = input.due_date ? ` · due ${input.due_date}` : '';
      return task ? `Create task — ${task}${who}${due}` : 'Create task';
    }
    case 'wedding_block_date': {
      const client = safe(input.client_name);
      const dates  = Array.isArray(input.dates) ? input.dates : [];
      if (dates.length === 0) return client ? `Block dates — ${client}` : 'Block dates';
      if (dates.length === 1) return `Block ${dates[0]}${client ? ' — ' + client : ''}`;
      if (dates.length <= 3)  return `Block ${dates.join(', ')}${client ? ' — ' + client : ''}`;
      return `Block ${dates.length} dates${client ? ' — ' + client : ''}`;
    }
    case 'wedding_send_payment_reminder': {
      const client = safe(input.client_name);
      const amt    = fmtRs(input.amount);
      if (amt && client) return `WhatsApp payment reminder to ${client} (${amt} due)`;
      if (client)        return `WhatsApp payment reminder to ${client}`;
      return 'WhatsApp payment reminder';
    }
    case 'wedding_send_client_reminder': {
      const client = safe(input.client_name);
      const type   = safe(input.reminder_type, 20);
      if (client && type) return `WhatsApp ${type} reminder to ${client}`;
      if (client)         return `WhatsApp reminder to ${client}`;
      return 'WhatsApp client reminder';
    }
    case 'wedding_log_expense': {
      const desc = safe(input.description, 50);
      const amt  = fmtRs(input.amount);
      if (amt && desc) return `Log expense — ${desc} · ${amt}`;
      if (desc)        return `Log expense — ${desc}`;
      return 'Log expense';
    }
    case 'wedding_reply_to_enquiry': {
      const msg = safe(input.message, 70);
      return msg ? `Reply to enquiry — "${msg}"` : 'Reply to enquiry';
    }
    case 'wedding_record_payment': {
      const client = safe(input.client_name);
      const amt    = fmtRs(input.amount);
      const invref = input.invoice_id ? ` (invoice ${safe(input.invoice_id, 12)})` : '';
      if (amt && client) return `Record payment — ${client} · ${amt}${invref}`;
      if (client)        return `Record payment — ${client}${invref}`;
      if (input.invoice_id) return `Record payment${invref}`;
      return 'Record payment';
    }
    default:
      return 'Run ' + toolName;
  }
}

module.exports = { buildToolPreview };
