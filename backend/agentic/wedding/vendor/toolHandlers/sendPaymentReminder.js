// backend/agentic/wedding/vendor/toolHandlers/sendPaymentReminder.js
//
// Tool handler for wedding_send_payment_reminder (renamed S3, 2026-05-12). Lifted verbatim from server.js
// _vendorChatSendPaymentReminder (Session 1.1, commit a42157b — schema-correct).
//
// Behavior: looks up the named client, composes a WhatsApp message (custom or
// default template with optional amount), normalizes the phone, sends via Twilio.
// Returns a status string for the agentic loop's tool_result block.

const engine = require('../engine');

async function sendPaymentReminder(vendorId, { client_name, amount, custom_message }) {
  const { supabase, helpers } = engine.deps();
  const { sendWhatsApp, normalizePhone } = helpers;

  if (!client_name) return 'client_name required.';
  const { data: clients } = await supabase
    .from('vendor_clients')
    .select('name, phone')
    .eq('vendor_id', vendorId)
    .ilike('name', '%' + client_name + '%')
    .limit(1);
  if (!clients || clients.length === 0) return 'Client not found: ' + client_name;
  const c = clients[0];
  if (!c.phone) return c.name + ' has no phone number saved.';

  const { data: v } = await supabase.from('vendors').select('name').eq('id', vendorId).maybeSingle();
  const vendorName = v ? v.name : 'Your vendor';
  const amountStr = amount ? 'Rs ' + Number(amount).toLocaleString('en-IN') : null;
  const msg = custom_message || (amountStr
    ? 'Hi ' + c.name + ', gentle reminder that ' + amountStr + ' is due. Please let us know when you would like to settle. Thanks! - ' + vendorName
    : 'Hi ' + c.name + ', gentle reminder about your pending payment. Thanks! - ' + vendorName);
  const phone = '+91' + normalizePhone(c.phone);
  const sent = await sendWhatsApp(phone, msg);
  return sent
    ? 'Reminder sent to ' + c.name + '.'
    : 'Could not send to ' + c.name + '. They may not be on WhatsApp.';
}

module.exports = { sendPaymentReminder };
