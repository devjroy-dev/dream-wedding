// backend/agentic/wedding/vendor/toolHandlers/deleteExpense.js
//
// Tool handler for wedding_delete_expense (Session 7, 2026-05-12).
//
// Updated Session 8.5b (2026-05-13): converted to soft-delete (deleted_at).
// Sets deleted_at = now() instead of hard DELETE.
//
// Resolution: prefer expense_id; fall back to description_match single-match
// (refuse on ambiguity). Vendor-ownership guard on the delete itself.

const engine = require('../engine');

async function deleteExpense(vendorId, { expense_id, description_match }) {
  const { supabase } = engine.deps();

  let target = null;
  if (expense_id) {
    const { data } = await supabase
      .from('vendor_expenses')
      .select('id, vendor_id, amount, description')
      .eq('id', expense_id)
      .is('deleted_at', null)
      .maybeSingle();
    if (!data) return 'Expense not found.';
    if (data.vendor_id !== vendorId) return 'Expense does not belong to this vendor.';
    target = data;
  } else if (description_match) {
    const { data } = await supabase
      .from('vendor_expenses')
      .select('id, vendor_id, amount, description')
      .eq('vendor_id', vendorId)
      .ilike('description', '%' + description_match + '%')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(2);
    if (!data || data.length === 0) return 'No expense matching "' + description_match + '" found.';
    if (data.length > 1) return 'More than one expense matches "' + description_match + '". Specify the expense_id.';
    target = data[0];
  } else {
    return 'expense_id or description_match required.';
  }

  const { error } = await supabase
    .from('vendor_expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', target.id)
    .eq('vendor_id', vendorId);
  if (error) throw error;

  return 'Deleted expense: ' + (target.description || 'untitled') + ' — Rs ' + Number(target.amount || 0).toLocaleString('en-IN') + '.';
}

module.exports = { deleteExpense };
