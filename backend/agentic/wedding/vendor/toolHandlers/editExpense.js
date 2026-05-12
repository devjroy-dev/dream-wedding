// backend/agentic/wedding/vendor/toolHandlers/editExpense.js
//
// Tool handler for wedding_edit_expense (Session 7, 2026-05-12).
//
// Resolution: prefer expense_id; fall back to description_match single-match
// (refuse on ambiguity). Vendor-ownership guard on the update itself.
//
// Schema reference: vendor_expenses(id, vendor_id, amount, category,
//   description, expense_date, payment_method, notes, client_id,
//   client_name, receipt_url, financial_year).

const engine = require('../engine');

async function editExpense(vendorId, { expense_id, description_match, amount, category, expense_date, description }) {
  const { supabase } = engine.deps();

  let target = null;
  if (expense_id) {
    const { data } = await supabase
      .from('vendor_expenses')
      .select('id, vendor_id, amount, category, description, expense_date')
      .eq('id', expense_id)
      .maybeSingle();
    if (!data) return 'Expense not found.';
    if (data.vendor_id !== vendorId) return 'Expense does not belong to this vendor.';
    target = data;
  } else if (description_match) {
    const { data } = await supabase
      .from('vendor_expenses')
      .select('id, vendor_id, amount, category, description, expense_date')
      .eq('vendor_id', vendorId)
      .ilike('description', '%' + description_match + '%')
      .order('created_at', { ascending: false })
      .limit(2);
    if (!data || data.length === 0) return 'No expense matching "' + description_match + '" found.';
    if (data.length > 1) return 'More than one expense matches "' + description_match + '". Specify the expense_id.';
    target = data[0];
  } else {
    return 'expense_id or description_match required.';
  }

  const patch = {};
  if (amount !== undefined && amount !== null) {
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum < 0) return 'amount must be a non-negative number.';
    patch.amount = amountNum;
  }
  if (category !== undefined) patch.category = category || 'general';
  if (expense_date !== undefined) patch.expense_date = expense_date;
  if (description !== undefined) patch.description = description;

  if (Object.keys(patch).length === 0) return 'Nothing to update.';

  const { error } = await supabase
    .from('vendor_expenses')
    .update(patch)
    .eq('id', target.id)
    .eq('vendor_id', vendorId);
  if (error) throw error;

  const parts = [];
  if (patch.amount !== undefined) parts.push('amount Rs ' + Number(patch.amount).toLocaleString('en-IN'));
  if (patch.category) parts.push('category ' + patch.category);
  if (patch.expense_date) parts.push('date ' + patch.expense_date);
  if (patch.description) parts.push('description updated');
  return 'Updated expense — ' + parts.join(', ') + '.';
}

module.exports = { editExpense };
