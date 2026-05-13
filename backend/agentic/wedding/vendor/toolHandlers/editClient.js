// backend/agentic/wedding/vendor/toolHandlers/editClient.js
//
// Tool handler for wedding_edit_client (Session 7, 2026-05-12).
//
// Resolution: prefer client_id; fall back to client_name single-match
// (refuse on ambiguity). Vendor-ownership guard on the update itself.
//
// Schema reference: vendor_clients(id, vendor_id, name, phone, email,
//   event_type, event_date, venue, budget, status, notes, profile_incomplete).

const engine = require('../engine');

async function editClient(vendorId, { client_id, client_name, name, phone, event_date, event_type, status, budget, venue, notes }) {
  const { supabase } = engine.deps();

  let target = null;
  if (client_id) {
    const { data } = await supabase
      .from('vendor_clients')
      .select('id, vendor_id, name')
      .eq('id', client_id)
      .is('deleted_at', null)
      .maybeSingle();
    if (!data) return 'Client not found.';
    if (data.vendor_id !== vendorId) return 'Client does not belong to this vendor.';
    target = data;
  } else if (client_name) {
    const { data } = await supabase
      .from('vendor_clients')
      .select('id, vendor_id, name')
      .eq('vendor_id', vendorId)
      .ilike('name', '%' + client_name + '%')
      .is('deleted_at', null)
      .limit(2);
    if (!data || data.length === 0) return 'No client matching "' + client_name + '" found.';
    if (data.length > 1) return 'More than one client matches "' + client_name + '". Specify the client_id.';
    target = data[0];
  } else {
    return 'client_id or client_name required.';
  }

  const patch = {};
  if (name !== undefined) patch.name = name;
  if (phone !== undefined) patch.phone = phone || null;
  if (event_date !== undefined) patch.event_date = event_date || null;
  if (event_type !== undefined) patch.event_type = event_type;
  if (status !== undefined) patch.status = status;
  if (budget !== undefined && budget !== null) {
    const budgetNum = Number(budget);
    if (isNaN(budgetNum) || budgetNum < 0) return 'budget must be a non-negative number.';
    patch.budget = budgetNum;
  }
  if (venue !== undefined) patch.venue = venue;
  if (notes !== undefined) patch.notes = notes;

  if (Object.keys(patch).length === 0) return 'Nothing to update.';

  const { error } = await supabase
    .from('vendor_clients')
    .update(patch)
    .eq('id', target.id)
    .eq('vendor_id', vendorId);
  if (error) throw error;

  const parts = [];
  if (patch.name) parts.push('name → ' + patch.name);
  if (patch.phone !== undefined) parts.push('phone updated');
  if (patch.event_date !== undefined) parts.push('event date ' + (patch.event_date || 'cleared'));
  if (patch.event_type) parts.push('event type ' + patch.event_type);
  if (patch.status) parts.push('status ' + patch.status);
  if (patch.budget !== undefined) parts.push('budget Rs ' + patch.budget.toLocaleString('en-IN'));
  if (patch.venue !== undefined) parts.push('venue updated');
  if (patch.notes !== undefined) parts.push('notes updated');
  return 'Updated ' + target.name + ' — ' + parts.join(', ') + '.';
}

module.exports = { editClient };
