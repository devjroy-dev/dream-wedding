// backend/agentic/wedding/vendor/toolHandlers/logExpense.js
//
// Tool handler for log_expense. Lifted verbatim from server.js
// _vendorChatLogExpense (Session 1.1, commit a42157b — schema-correct).
//
// Behavior: inserts a row into vendor_expenses with the vendor's id, the
// description, the rupee amount, optional category (defaults to 'general'),
// and the date (defaults to today). Returns a status string.

const engine = require('../engine');

async function logExpense(vendorId, { description, amount, category, date }) {
  const { supabase } = engine.deps();

  if (!description) return 'description required.';
  if (!amount) return 'amount required.';
  const { error } = await supabase.from('vendor_expenses').insert([{
    vendor_id: vendorId,
    description,
    amount: Number(amount),
    category: category || 'general',
    expense_date: date || new Date().toISOString().slice(0, 10),
  }]);
  if (error) throw error;
  return 'Expense logged: ' + description + ' — Rs ' + Number(amount).toLocaleString('en-IN') + ' (' + (category || 'general') + ').';
}

module.exports = { logExpense };
