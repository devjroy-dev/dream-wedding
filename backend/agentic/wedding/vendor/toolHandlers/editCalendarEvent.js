// backend/agentic/wedding/vendor/toolHandlers/editCalendarEvent.js
//
// Tool handler for wedding_edit_calendar_event (Session 8.5e, 2026-05-13).
//
// Behavior:
//   1. Resolve target event: prefer event_id; otherwise use title_match to find
//      a single event for this vendor (refuse on zero or ambiguous match).
//   2. Apply allow-listed updates: title, event_date, event_time, type,
//      client_name, notes, amount.
//   3. Return a short vendor-voice status string.
//
// Schema reference: vendor_calendar_events(id, vendor_id, title, event_date,
//   event_time, client_id, client_name, notes, type, created_at,
//   source_type, source_id, amount).
// Note: DB column is 'type' not 'event_type' — the create handler has a
//   pre-existing mismatch (writes 'event_type' which is silently discarded).
//   This handler writes the correct column name 'type'.

const engine = require('../engine');

async function editCalendarEvent(vendorId, { event_id, title_match, title, event_date, event_time, type, client_name, notes, amount }) {
  const { supabase } = engine.deps();

  let target = null;
  if (event_id) {
    const { data } = await supabase
      .from('vendor_calendar_events')
      .select('id, vendor_id, title')
      .eq('id', event_id)
      .is('deleted_at', null)
      .maybeSingle();
    if (!data) return 'Calendar event not found.';
    if (data.vendor_id !== vendorId) return 'Event does not belong to this vendor.';
    target = data;
  } else if (title_match) {
    const { data } = await supabase
      .from('vendor_calendar_events')
      .select('id, vendor_id, title')
      .eq('vendor_id', vendorId)
      .ilike('title', '%' + title_match + '%')
      .is('deleted_at', null)
      .limit(2);
    if (!data || data.length === 0) return 'No calendar event matching "' + title_match + '" found.';
    if (data.length > 1) return 'More than one event matches "' + title_match + '". Specify the event_id.';
    target = data[0];
  } else {
    return 'event_id or title_match required.';
  }

  const patch = {};
  if (title !== undefined && title !== null) patch.title = title;
  if (event_date !== undefined) patch.event_date = event_date || null;
  if (event_time !== undefined) patch.event_time = event_time || null;
  if (type !== undefined && type !== null) patch.type = type;
  if (client_name !== undefined) patch.client_name = client_name || null;
  if (notes !== undefined) patch.notes = notes || null;
  if (amount !== undefined && amount !== null) {
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum < 0) return 'amount must be a non-negative number.';
    patch.amount = amountNum;
  }

  if (Object.keys(patch).length === 0) return 'Nothing to update.';

  const { error } = await supabase
    .from('vendor_calendar_events')
    .update(patch)
    .eq('id', target.id)
    .eq('vendor_id', vendorId);
  if (error) throw error;

  const parts = [];
  if (patch.title) parts.push('title → ' + patch.title);
  if (patch.event_date !== undefined) parts.push('date ' + (patch.event_date || 'cleared'));
  if (patch.event_time !== undefined) parts.push('time ' + (patch.event_time || 'cleared'));
  if (patch.type) parts.push('type ' + patch.type);
  if (patch.client_name !== undefined) parts.push('client ' + (patch.client_name || 'cleared'));
  if (patch.notes !== undefined) parts.push('notes updated');
  if (patch.amount !== undefined) parts.push('amount Rs ' + patch.amount.toLocaleString('en-IN'));
  return 'Updated event "' + target.title + '" — ' + parts.join(', ') + '.';
}

module.exports = { editCalendarEvent };
