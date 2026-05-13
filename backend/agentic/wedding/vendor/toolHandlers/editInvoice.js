// backend/agentic/wedding/vendor/toolHandlers/editInvoice.js
//
// Tool handler for wedding_edit_invoice (Session 7, 2026-05-12).
//
// Behavior:
//   1. Resolve target invoice: prefer invoice_id; otherwise use client_name to
//      find the most-recent non-paid invoice for that client (single match
//      preferred — if zero or ambiguous, return a clarifying message).
//   2. Apply allow-listed updates: amount, due_date, status, description.
//      If amount changes and gst_enabled was true, recompute gst_amount and
//      total_amount to stay consistent with the create_invoice handler.
//   3. Return a short vendor-voice status string.
//
// Allowed status values mirror existing usage in server.js: 'pending', 'unpaid', 'paid'.
// Schema reference: vendor_invoices(id, vendor_id, client_name, amount,
//   gst_enabled, gst_amount, total_amount, status, due_date, description, ...).

const engine = require('../engine');

const ALLOWED_STATUSES = ['pending', 'unpaid', 'paid'];

async function editInvoice(vendorId, { invoice_id, client_name, amount, due_date, status, description }) {
  const { supabase } = engine.deps();

  let target = null;
  if (invoice_id) {
    const { data } = await supabase
      .from('vendor_invoices')
      .select('id, vendor_id, client_name, amount, gst_enabled, gst_amount, total_amount, status, due_date')
      .eq('id', invoice_id)
      .is('deleted_at', null)
      .maybeSingle();
    if (!data) return 'Invoice not found.';
    if (data.vendor_id !== vendorId) return 'Invoice does not belong to this vendor.';
    target = data;
  } else if (client_name) {
    const { data } = await supabase
      .from('vendor_invoices')
      .select('id, vendor_id, client_name, amount, gst_enabled, gst_amount, total_amount, status, due_date')
      .eq('vendor_id', vendorId)
      .ilike('client_name', '%' + client_name + '%')
      .neq('status', 'paid')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(2);
    if (!data || data.length === 0) return 'No unpaid invoice found for ' + client_name + '.';
    if (data.length > 1) return 'More than one unpaid invoice for ' + client_name + '. Specify the invoice_id.';
    target = data[0];
  } else {
    return 'invoice_id or client_name required.';
  }

  const patch = {};
  let amountChanged = false;
  if (amount !== undefined && amount !== null) {
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum < 0) return 'amount must be a non-negative number.';
    patch.amount = amountNum;
    amountChanged = true;
  }
  if (due_date !== undefined) patch.due_date = due_date || null;
  if (status !== undefined) {
    if (!ALLOWED_STATUSES.includes(status)) return 'status must be one of: ' + ALLOWED_STATUSES.join(', ') + '.';
    patch.status = status;
    if (status === 'paid' && !target.paid_date) {
      patch.paid_date = new Date().toISOString().slice(0, 10);
    }
  }
  if (description !== undefined) patch.description = description;

  if (amountChanged && target.gst_enabled) {
    patch.gst_amount = Math.round(patch.amount * 0.18);
    patch.total_amount = patch.amount + patch.gst_amount;
  } else if (amountChanged && !target.gst_enabled) {
    patch.total_amount = patch.amount;
  }

  if (Object.keys(patch).length === 0) return 'Nothing to update.';

  const { error } = await supabase.from('vendor_invoices').update(patch).eq('id', target.id);
  if (error) throw error;

  const parts = [];
  if (amountChanged) parts.push('amount Rs ' + Number(patch.amount).toLocaleString('en-IN'));
  if (patch.due_date !== undefined) parts.push('due ' + (patch.due_date || 'cleared'));
  if (patch.status) parts.push('status ' + patch.status);
  if (patch.description !== undefined) parts.push('description updated');
  return 'Updated invoice for ' + target.client_name + ' — ' + parts.join(', ') + '.';
}

module.exports = { editInvoice };
