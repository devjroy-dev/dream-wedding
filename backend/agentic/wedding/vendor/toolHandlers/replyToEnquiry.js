// backend/agentic/wedding/vendor/toolHandlers/replyToEnquiry.js
//
// Tool handler for wedding_reply_to_enquiry (renamed S3, 2026-05-12). Lifted verbatim from server.js
// _vendorChatReplyToEnquiry (Session 1.1, commit a42157b — schema-correct).
//
// Behavior:
//   1. Validate inputs and look up the enquiry.
//   2. Verify the enquiry belongs to the calling vendor (defensive — the
//      LLM should never call this with a foreign enquiry_id, but guard anyway).
//   3. Look up the couple's name and phone from the users table.
//   4. Insert the vendor's message into vendor_enquiry_messages.
//   5. Update the enquiry row's last_message_* fields and bump unread counters.
//   6. Send a WhatsApp message to the couple if a phone is on file.
// Returns a status string.

const engine = require('../engine');

async function replyToEnquiry(vendorId, { enquiry_id, message }) {
  const { supabase, helpers } = engine.deps();
  const { sendWhatsApp, normalizePhone } = helpers;

  if (!enquiry_id) return 'enquiry_id required.';
  if (!message) return 'message required.';
  const { data: enquiry } = await supabase
    .from('vendor_enquiries')
    .select('id, couple_id, vendor_id')
    .eq('id', enquiry_id)
    .maybeSingle();
  if (!enquiry) return 'Enquiry not found.';
  if (enquiry.vendor_id && enquiry.vendor_id !== vendorId) return 'Enquiry does not belong to this vendor.';

  // Look up couple's name + phone from users table.
  let coupleName = 'couple';
  let couplePhone = null;
  if (enquiry.couple_id) {
    const { data: couple } = await supabase
      .from('users')
      .select('name, bride_name, groom_name, phone')
      .eq('id', enquiry.couple_id)
      .maybeSingle();
    if (couple) {
      coupleName = couple.name || couple.bride_name || couple.groom_name || 'couple';
      couplePhone = couple.phone || null;
    }
  }

  // Log message into the enquiry thread.
  await supabase.from('vendor_enquiry_messages').insert([{
    enquiry_id,
    from_role: 'vendor',
    content: message,
    read_by_other: false,
  }]);

  // Update enquiry metadata.
  await supabase.from('vendor_enquiries').update({
    status: 'replied',
    last_message_at: new Date().toISOString(),
    last_message_preview: message.slice(0, 200),
    last_message_from: 'vendor',
    couple_unread_count: 1,
    vendor_unread_count: 0,
  }).eq('id', enquiry_id);

  let sent = false;
  if (couplePhone) {
    const phone = '+91' + normalizePhone(couplePhone);
    sent = await sendWhatsApp(phone, message);
  }
  return sent
    ? 'Reply sent to ' + coupleName + '.'
    : 'Reply logged. ' + coupleName + (couplePhone ? ' may not be reachable on WhatsApp.' : ' has no phone on file.');
}

module.exports = { replyToEnquiry };
