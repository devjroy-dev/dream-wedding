// backend/agentic/wedding/vendor/toolHandlers/deleteInvoice.js
//
// Tool handler for wedding_delete_invoice (Session 7, 2026-05-12).
// Updated Session 8.5b (2026-05-13): converted to soft-delete (deleted_at).
//
// Soft-delete — sets deleted_at = now() instead of hard DELETE.
// Matches deleted_at TIMESTAMPTZ column added in S8.5b migration.
//
// Resolution: prefer invoice_id; fall back to client_name single-match (refuse
// on ambiguity). Vendor-ownership guard on the delete itself.

const engine = require('../engine');

async function deleteInvoice(vendorId, { invoice_id, client_name }) {
  const { supabase } = engine.deps();

  let target = null;
  if (invoice_id) {
    const { data } = await supabase
      .from('vendor_invoices')
      .select('id, vendor_id, client_name, amount, status')
      .eq('id', invoice_id)
      .is('deleted_at', null)
      .maybeSingle();
    if (!data) return 'Invoice not found.';
    if (data.vendor_id !== vendorId) return 'Invoice does not belong to this vendor.';
    target = data;
  } else if (client_name) {
    const { data } = await supabase
      .from('vendor_invoices')
      .select('id, vendor_id, client_name, amount, status')
      .eq('vendor_id', vendorId)
      .ilike('client_name', '%' + client_name + '%')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(2);
    if (!data || data.length === 0) return 'No invoice found for ' + client_name + '.';
    if (data.length > 1) return 'More than one invoice for ' + client_name + '. Specify the invoice_id.';
    target = data[0];
  } else {
    return 'invoice_id or client_name required.';
  }

  const { error } = await supabase
    .from('vendor_invoices')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', target.id)
    .eq('vendor_id', vendorId);
  if (error) throw error;

  return 'Deleted invoice for ' + target.client_name + ' — Rs ' + Number(target.amount || 0).toLocaleString('en-IN') + '.';
}

module.exports = { deleteInvoice };
