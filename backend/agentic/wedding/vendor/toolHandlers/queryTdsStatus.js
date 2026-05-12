// backend/agentic/wedding/vendor/toolHandlers/queryTdsStatus.js
//
// Tool handler for wedding_query_tds_status (Session 7, 2026-05-12). Read-only.
//
// Filter: prefer invoice_id; else match tds_deducted_by ILIKE client_name.
// Returns per-entry rate, amount, deductor, deposited status, FY.
//
// Schema reference: vendor_tds_ledger(vendor_id, invoice_id, tds_rate,
//   tds_amount, tds_deducted_by, tds_deposited, financial_year,
//   gross_amount, created_at).

const engine = require('../engine');

async function queryTdsStatus(vendorId, { invoice_id, client_name } = {}) {
  const { supabase } = engine.deps();

  let query = supabase
    .from('vendor_tds_ledger')
    .select('invoice_id, tds_rate, tds_amount, tds_deducted_by, tds_deposited, financial_year, created_at')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (invoice_id)  query = query.eq('invoice_id', invoice_id);
  else if (client_name) query = query.ilike('tds_deducted_by', '%' + client_name + '%');

  const { data, error } = await query;
  if (error) throw error;

  const rows = data || [];
  if (rows.length === 0) {
    if (invoice_id)   return 'No TDS entry for invoice ' + invoice_id + '.';
    if (client_name)  return 'No TDS deducted by ' + client_name + ' on record.';
    return 'No TDS entries on record.';
  }

  const fmt = n => 'Rs ' + Math.round(Number(n) || 0).toLocaleString('en-IN');
  return rows.map(r => {
    const date = r.created_at ? r.created_at.slice(0, 10) : 'unknown';
    const dep  = r.tds_deposited ? 'deposited' : 'not deposited';
    const fy   = r.financial_year ? ' [' + r.financial_year + ']' : '';
    const by   = r.tds_deducted_by ? ' by ' + r.tds_deducted_by : '';
    return date + ': ' + fmt(r.tds_amount) + ' @ ' + (r.tds_rate || 10) + '%' + by + ' — ' + dep + fy;
  }).join('\n');
}

module.exports = { queryTdsStatus };
