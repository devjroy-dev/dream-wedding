import os

path = 'backend/agentic/wedding/vendor/toolHandlers/deleteInvoice.js'
assert not os.path.exists(path), f"File already exists: {path}"

content = """// backend/agentic/wedding/vendor/toolHandlers/deleteInvoice.js
//
// Tool handler for wedding_delete_invoice (Session 7, 2026-05-12).
//
// Hard delete — matches the existing DELETE /api/invoices/:id endpoint pattern
// in server.js line 5231. Soft-delete deferred to a dedicated schema-migration
// session (likely Session 8.5) per SESSION_BOUNDARIES §125 — no deleted_at
// column exists today.
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
    .delete()
    .eq('id', target.id)
    .eq('vendor_id', vendorId);
  if (error) throw error;

  return 'Deleted invoice for ' + target.client_name + ' — Rs ' + Number(target.amount || 0).toLocaleString('en-IN') + '.';
}

module.exports = { deleteInvoice };
"""

os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, 'w') as f:
    f.write(content)
print("Written:", path)
