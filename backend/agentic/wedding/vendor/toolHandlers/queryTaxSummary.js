// backend/agentic/wedding/vendor/toolHandlers/queryTaxSummary.js
//
// Tool handler for wedding_query_tax_summary (Session 7, 2026-05-12). Read-only.
//
// Indian FY quarters: Q1 Apr-Jun, Q2 Jul-Sep, Q3 Oct-Dec, Q4 Jan-Mar.
// GST collected: sum of gst_amount on paid invoices in window.
// GST input credit estimate: 18% of expense total in window (estimate only).
// TDS deducted: sum of tds_amount on vendor_tds_ledger in window.
// Net liability: GST collected minus GST input estimate.
//
// Schema reference:
//   vendor_invoices(vendor_id, gst_amount, status, paid_date)
//   vendor_expenses(vendor_id, amount, expense_date)
//   vendor_tds_ledger(vendor_id, tds_amount, created_at)

const engine = require('../engine');

function _fyOf(d) {
  const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return { fy_start_year: year, label: 'FY ' + year + '-' + String(year + 1).slice(-2) };
}

function _quarterWindow(quarterParam, fyParam) {
  const now = new Date();
  const currentFy = _fyOf(now);

  let fyStartYear = currentFy.fy_start_year;
  if (fyParam) {
    const m = String(fyParam).match(/(\d{4})/);
    if (m) fyStartYear = parseInt(m[1], 10);
  }

  let quarter;
  if (quarterParam) {
    const m = String(quarterParam).match(/[1-4]/);
    quarter = m ? parseInt(m[0], 10) : null;
  }
  if (!quarter) {
    const mo = now.getMonth();
    if (mo >= 3 && mo <= 5) quarter = 1;
    else if (mo >= 6 && mo <= 8) quarter = 2;
    else if (mo >= 9 && mo <= 11) quarter = 3;
    else quarter = 4;
  }

  let startMonth, endMonth, startYear, endYear;
  if (quarter === 1)      { startMonth = 3;  endMonth = 5;  startYear = fyStartYear;     endYear = fyStartYear;     }
  else if (quarter === 2) { startMonth = 6;  endMonth = 8;  startYear = fyStartYear;     endYear = fyStartYear;     }
  else if (quarter === 3) { startMonth = 9;  endMonth = 11; startYear = fyStartYear;     endYear = fyStartYear;     }
  else                    { startMonth = 0;  endMonth = 2;  startYear = fyStartYear + 1; endYear = fyStartYear + 1; }

  const lastDay = new Date(endYear, endMonth + 1, 0).getDate();
  const fmt = (y, mo, d) => y + '-' + String(mo + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  const fy = _fyOf(new Date(fyStartYear, 5, 1));

  return {
    start: fmt(startYear, startMonth, 1),
    end: fmt(endYear, endMonth, lastDay),
    quarter,
    fy_label: fy.label,
    label: 'Q' + quarter + ' ' + fy.label,
  };
}

async function queryTaxSummary(vendorId, { quarter, financial_year } = {}) {
  const { supabase } = engine.deps();

  const win = _quarterWindow(quarter, financial_year);

  const [invRes, expRes, tdsRes] = await Promise.all([
    supabase
      .from('vendor_invoices')
      .select('gst_amount')
      .eq('vendor_id', vendorId)
      .eq('status', 'paid')
      .gte('paid_date', win.start)
      .lte('paid_date', win.end),
    supabase
      .from('vendor_expenses')
      .select('amount')
      .eq('vendor_id', vendorId)
      .gte('expense_date', win.start)
      .lte('expense_date', win.end),
    supabase
      .from('vendor_tds_ledger')
      .select('tds_amount')
      .eq('vendor_id', vendorId)
      .gte('created_at', win.start + 'T00:00:00')
      .lte('created_at', win.end + 'T23:59:59'),
  ]);

  const invoices  = invRes.data  || [];
  const expenses  = expRes.data  || [];
  const tdsRows   = tdsRes.data  || [];

  const gstCollected      = invoices.reduce((s, r) => s + (Number(r.gst_amount) || 0), 0);
  const expenseTotal      = expenses.reduce((s, r) => s + (Number(r.amount)     || 0), 0);
  const gstInputEstimate  = Math.round(expenseTotal * 0.18);
  const tdsDeducted       = tdsRows.reduce((s, r)  => s + (Number(r.tds_amount) || 0), 0);
  const netLiability      = Math.max(0, gstCollected - gstInputEstimate);

  const fmt = n => 'Rs ' + Math.round(n).toLocaleString('en-IN');

  const lines = [
    win.label + ' (' + win.start + ' to ' + win.end + ')',
    'GST collected: ' + fmt(gstCollected),
    'GST input credit (estimate at 18% of expenses): ' + fmt(gstInputEstimate),
    'Net GST liability: ' + fmt(netLiability),
    'TDS deducted in window: ' + fmt(tdsDeducted),
  ];
  if (invoices.length === 0 && expenses.length === 0 && tdsRows.length === 0) {
    lines.push('No invoices, expenses, or TDS entries in this window.');
  }
  return lines.join('\n');
}

module.exports = { queryTaxSummary };
