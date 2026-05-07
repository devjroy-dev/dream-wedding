#!/usr/bin/env node
/**
 * patch_vendor_context.js
 * Adds GET /api/v2/dreamai/vendor-context/:vendorId to dream-wedding/backend/server.js
 *
 * Run from: /workspaces/dream-wedding
 * Command:  node patch_vendor_context.js
 *
 * Returns:
 * {
 *   vendor: { name, category, tier }
 *   clients: [{ id, name, event_type, event_date, status }]
 *   invoices: [{ id, client_name, amount, total, paid, due_date, status }]
 *   enquiries: [{ id, couple_name, message, date, replied }]
 *   calendar: [{ id, date, event_name, client_name, time }]
 *   revenue: { this_month, last_month, outstanding }
 *   overdue_invoices: [{ client_name, amount, due_date }]
 * }
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'backend', 'server.js');
const src = fs.readFileSync(FILE, 'utf8');

// ── Safety checks ─────────────────────────────────────────────────────────────
const expressCount = (src.match(/const express = require/g) || []).length;
if (expressCount !== 1) {
  console.error(`ABORT: expected 1 express require, found ${expressCount}`);
  process.exit(1);
}

if (src.includes("'/api/v2/dreamai/vendor-context/:vendorId'")) {
  console.error('ABORT: vendor-context endpoint already exists');
  process.exit(1);
}

if (src.includes('// TDW_VENDOR_CONTEXT_V1')) {
  console.error('ABORT: patch already applied');
  process.exit(1);
}

// ── Correct insert point: just before server.listen ───────────────────────────
const LISTEN_MARKER = 'server.listen(PORT,';
const listenIdx = src.indexOf(LISTEN_MARKER);
if (listenIdx === -1) {
  console.error('ABORT: could not find server.listen(PORT, in server.js');
  process.exit(1);
}

// ── New endpoint ──────────────────────────────────────────────────────────────
const NEW_ENDPOINT = `
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v2/dreamai/vendor-context/:vendorId
// TDW_VENDOR_CONTEXT_V1
// Returns full vendor business context for DreamAi reasoning.
// Tables: vendors, vendor_subscriptions, vendor_clients, vendor_invoices,
//         vendor_enquiries, vendor_calendar_events
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/v2/dreamai/vendor-context/:vendorId', async (req, res) => {
  const { vendorId } = req.params;
  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
    const next30Str = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);

    // ── Fetch in parallel ────────────────────────────────────────────────────
    const [
      vendorRes,
      subRes,
      clientsRes,
      invoicesRes,
      enquiriesRes,
      calendarRes,
    ] = await Promise.all([
      supabase.from('vendors').select('id, name, category').eq('id', vendorId).maybeSingle(),
      supabase.from('vendor_subscriptions').select('tier').eq('vendor_id', vendorId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('vendor_clients').select('id, name, event_type, event_date, status, budget').eq('vendor_id', vendorId).order('event_date', { ascending: true }).limit(20),
      supabase.from('vendor_invoices').select('id, client_name, amount, total_amount, total, advance, balance, status, due_date, created_at').eq('vendor_id', vendorId).order('created_at', { ascending: false }).limit(30),
      supabase.from('vendor_enquiries').select('id, couple_name, message, created_at, status').eq('vendor_id', vendorId).order('created_at', { ascending: false }).limit(10),
      supabase.from('vendor_calendar_events').select('id, event_name, event_date, event_time, client_name').eq('vendor_id', vendorId).gte('event_date', todayStr).order('event_date', { ascending: true }).limit(10),
    ]);

    if (!vendorRes.data) return res.status(404).json({ error: 'Vendor not found' });

    const vendor = vendorRes.data;
    const tier = subRes.data?.tier || 'essential';
    const clients = clientsRes.data || [];
    const invoices = invoicesRes.data || [];
    const enquiries = enquiriesRes.data || [];
    const calendar = calendarRes.data || [];

    // ── Revenue calculations ──────────────────────────────────────────────────
    const getAmount = inv => parseFloat(inv.total_amount || inv.total || inv.amount || 0);

    const thisMonthRevenue = invoices
      .filter(i => i.status === 'paid' && i.created_at >= monthStart)
      .reduce((s, i) => s + getAmount(i), 0);

    const lastMonthRevenue = invoices
      .filter(i => i.status === 'paid' && i.created_at >= lastMonthStart && i.created_at <= lastMonthEnd)
      .reduce((s, i) => s + getAmount(i), 0);

    const outstanding = invoices
      .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
      .reduce((s, i) => s + parseFloat(i.balance || i.amount || 0), 0);

    // ── Overdue invoices ──────────────────────────────────────────────────────
    const overdue_invoices = invoices
      .filter(i => (i.status === 'unpaid' || i.status === 'issued' || i.status === 'pending') && i.due_date && i.due_date < todayStr)
      .map(i => ({
        client_name: i.client_name,
        amount: parseFloat(i.balance || i.amount || 0),
        due_date: i.due_date,
      }));

    // ── Shape response ────────────────────────────────────────────────────────
    res.json({
      vendor: {
        name: vendor.name,
        category: vendor.category,
        tier,
      },
      clients: clients.map(c => ({
        id: c.id,
        name: c.name,
        event_type: c.event_type || 'Wedding',
        event_date: c.event_date || null,
        status: c.status || 'upcoming',
        budget: c.budget || null,
      })),
      invoices: invoices.slice(0, 15).map(i => ({
        id: i.id,
        client_name: i.client_name,
        amount: getAmount(i),
        paid: i.status === 'paid',
        due_date: i.due_date || null,
        status: i.status,
      })),
      enquiries: enquiries.map(e => ({
        id: e.id,
        couple_name: e.couple_name || 'A couple',
        message: e.message || '',
        date: e.created_at,
        replied: e.status === 'replied' || e.status === 'closed',
      })),
      calendar: calendar.map(e => ({
        id: e.id,
        date: e.event_date,
        event_name: e.event_name || 'Event',
        client_name: e.client_name || null,
        time: e.event_time || null,
      })),
      revenue: {
        this_month: thisMonthRevenue,
        last_month: lastMonthRevenue,
        outstanding,
      },
      overdue_invoices,
    });

  } catch (error) {
    console.error('vendor-context error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

`;

// ── Insert before server.listen ───────────────────────────────────────────────
const patched = src.slice(0, listenIdx) + NEW_ENDPOINT + src.slice(listenIdx);

// Verify
if (!(patched.match(/app\.get\('\/api\/v2\/couple\/money\/:userId'/g) || []).length === 1) {
  console.error('ABORT: couple/money count changed — aborting');
  process.exit(1);
}
if (!patched.includes('TDW_VENDOR_CONTEXT_V1')) {
  console.error('ABORT: new endpoint not found in patched file');
  process.exit(1);
}
if (!patched.includes('server.listen(PORT,')) {
  console.error('ABORT: server.listen missing from patched file');
  process.exit(1);
}

fs.writeFileSync(FILE, patched, 'utf8');
console.log('✅ Patch applied: GET /api/v2/dreamai/vendor-context/:vendorId (TDW_VENDOR_CONTEXT_V1)');
console.log('Next: git add backend/server.js && git commit -m "feat: vendor DreamAi context endpoint v1" && git push');
