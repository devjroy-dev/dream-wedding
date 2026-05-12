// backend/agentic/wedding/vendor/toolHandlers/recordPayment.js
//
// Tool handler for record_payment. Lifted verbatim from server.js
// _vendorChatRecordPayment (Session 1.1, commit d1d7f24 — schema-correct
// with the query_revenue stale-column fix).
//
// Behavior:
//   - If invoice_id is provided, look it up directly and verify vendor ownership.
//   - Otherwise, find the most recent unpaid invoice matching client_name.
//   - Mark it paid (status='paid', paid_date=today).
//   - Return a status string with the amount paid (resolved from the input
//     or from total_amount / amount fallback).

const engine = require('../engine');

async function recordPayment(vendorId, { client_name, amount, invoice_id }) {
  const { supabase } = engine.deps();

  if (!client_name && !invoice_id) return 'client_name or invoice_id required.';
  let invoice = null;
  if (invoice_id) {
    const { data } = await supabase
      .from('vendor_invoices')
      .select('id, vendor_id, client_name, amount, total_amount, status')
      .eq('id', invoice_id)
      .maybeSingle();
    invoice = data;
    if (invoice && invoice.vendor_id && invoice.vendor_id !== vendorId) return 'Invoice does not belong to this vendor.';
  } else {
    const { data } = await supabase
      .from('vendor_invoices')
      .select('id, client_name, amount, total_amount, status')
      .eq('vendor_id', vendorId)
      .ilike('client_name', '%' + client_name + '%')
      .neq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    invoice = data;
  }
  if (!invoice) return 'No unpaid invoice found for ' + (client_name || invoice_id) + '.';
  const { error } = await supabase
    .from('vendor_invoices')
    .update({ status: 'paid', paid_date: new Date().toISOString().slice(0, 10) })
    .eq('id', invoice.id);
  if (error) throw error;
  const paid = amount || invoice.total_amount || invoice.amount || 0;
  return 'Payment recorded for ' + invoice.client_name + ' — Rs ' + Number(paid).toLocaleString('en-IN') + ' marked as paid.';
}

module.exports = { recordPayment };
