#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'backend', 'server.js');
const src = fs.readFileSync(FILE, 'utf8');

// Safety checks
const expressCount = (src.match(/const express = require/g) || []).length;
if (expressCount !== 1) { console.error('ABORT: express count wrong'); process.exit(1); }
if (src.includes('TDW_VENDOR_ACTIONS_V1')) { console.error('ABORT: already applied'); process.exit(1); }
if (src.includes("'/api/v2/dreamai/vendor-action/create-invoice'")) { console.error('ABORT: endpoints exist'); process.exit(1); }
if (!src.includes('async function executeToolCall(')) { console.error('ABORT: executeToolCall missing'); process.exit(1); }

const LISTEN_MARKER = 'server.listen(PORT,';
const listenIdx = src.indexOf(LISTEN_MARKER);
if (listenIdx === -1) { console.error('ABORT: server.listen not found'); process.exit(1); }

const NEW_ENDPOINTS = `
// ─────────────────────────────────────────────────────────────────────────────
// VENDOR DREAMAI ACTION ENDPOINTS — TDW_VENDOR_ACTIONS_V1
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/v2/dreamai/vendor-action/create-invoice
app.post('/api/v2/dreamai/vendor-action/create-invoice', async (req, res) => {
  try {
    const { vendor_id, client_name, amount, advance_received = 0, event_type = 'Wedding' } = req.body || {};
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    if (!client_name) return res.status(400).json({ success: false, error: 'client_name required' });
    if (!amount) return res.status(400).json({ success: false, error: 'amount required' });
    const result = await executeToolCall('create_invoice', {
      client_name, amount: Number(amount), advance_received: Number(advance_received), event_type,
    }, { id: vendor_id });
    res.json({ success: true, message: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/v2/dreamai/vendor-action/add-client
app.post('/api/v2/dreamai/vendor-action/add-client', async (req, res) => {
  try {
    const { vendor_id, client_name, phone = '', event_date = null, event_type = 'Wedding', budget = null } = req.body || {};
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    if (!client_name) return res.status(400).json({ success: false, error: 'client_name required' });
    const result = await executeToolCall('add_client', {
      client_name, phone, event_date, event_type, budget: budget ? Number(budget) : null,
    }, { id: vendor_id });
    res.json({ success: true, message: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/v2/dreamai/vendor-action/create-task
app.post('/api/v2/dreamai/vendor-action/create-task', async (req, res) => {
  try {
    const { vendor_id, task, assignee = '', due_date = null } = req.body || {};
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    if (!task) return res.status(400).json({ success: false, error: 'task required' });
    const result = await executeToolCall('create_task', { task, assignee, due_date }, { id: vendor_id });
    res.json({ success: true, message: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/v2/dreamai/vendor-action/block-date
app.post('/api/v2/dreamai/vendor-action/block-date', async (req, res) => {
  try {
    const { vendor_id, client_name, dates, notes = '' } = req.body || {};
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    if (!dates || !Array.isArray(dates) || dates.length === 0) return res.status(400).json({ success: false, error: 'dates array required' });
    const result = await executeToolCall('block_calendar_dates', {
      client_name: client_name || 'Blocked', dates, notes,
    }, { id: vendor_id });
    res.json({ success: true, message: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/v2/dreamai/vendor-action/send-payment-reminder
app.post('/api/v2/dreamai/vendor-action/send-payment-reminder', async (req, res) => {
  try {
    const { vendor_id, client_name, amount, custom_message } = req.body || {};
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    if (!client_name) return res.status(400).json({ success: false, error: 'client_name required' });
    const { data: clients } = await supabase.from('vendor_clients').select('name, phone').eq('vendor_id', vendor_id).ilike('name', '%' + client_name + '%').limit(1);
    if (!clients || clients.length === 0) return res.json({ success: false, message: 'Client not found.' });
    const client = clients[0];
    if (!client.phone) return res.json({ success: false, message: client.name + ' has no phone number saved.' });
    const { data: vendor } = await supabase.from('vendors').select('name').eq('id', vendor_id).maybeSingle();
    const vendorName = vendor ? vendor.name : 'Your vendor';
    const amountStr = amount ? String(Number(amount).toLocaleString('en-IN')) : null;
    const msg = custom_message || (amountStr
      ? 'Hi ' + client.name + ', gentle reminder that \u20b9' + amountStr + ' is due. Please let us know when you would like to settle. Thanks! \u2014 ' + vendorName
      : 'Hi ' + client.name + ', gentle reminder about your pending payment. Thanks! \u2014 ' + vendorName);
    const phone = '+91' + client.phone.replace(/\D/g, '').slice(-10);
    const sent = await sendWhatsApp(phone, msg);
    res.json({ success: true, message: sent ? '\u2713 Reminder sent to ' + client.name : 'Could not send to ' + client.name + '. They may not be on WhatsApp.' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/v2/dreamai/vendor-action/send-client-reminder
app.post('/api/v2/dreamai/vendor-action/send-client-reminder', async (req, res) => {
  try {
    const { vendor_id, client_name, reminder_type = 'general', custom_message } = req.body || {};
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    if (!client_name) return res.status(400).json({ success: false, error: 'client_name required' });
    const { data: vendor } = await supabase.from('vendors').select('name').eq('id', vendor_id).maybeSingle();
    const result = await executeToolCall('send_client_reminder', { client_name, reminder_type, custom_message }, { id: vendor_id, name: vendor ? vendor.name : '' });
    res.json({ success: true, message: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/v2/dreamai/vendor-action/log-expense
app.post('/api/v2/dreamai/vendor-action/log-expense', async (req, res) => {
  try {
    const { vendor_id, description, amount, category = 'general', date = null } = req.body || {};
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    if (!description) return res.status(400).json({ success: false, error: 'description required' });
    if (!amount) return res.status(400).json({ success: false, error: 'amount required' });
    const { error } = await supabase.from('vendor_expenses').insert([{
      vendor_id, description, amount: Number(amount), category,
      date: date || new Date().toISOString().slice(0, 10),
    }]);
    if (error) throw error;
    res.json({ success: true, message: '\u2713 Expense logged: ' + description + '\n\u20b9' + Number(amount).toLocaleString('en-IN') + ' \u00b7 ' + category });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/v2/dreamai/vendor-action/reply-to-enquiry
app.post('/api/v2/dreamai/vendor-action/reply-to-enquiry', async (req, res) => {
  try {
    const { vendor_id, enquiry_id, message } = req.body || {};
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    if (!enquiry_id) return res.status(400).json({ success: false, error: 'enquiry_id required' });
    if (!message) return res.status(400).json({ success: false, error: 'message required' });
    const { data: enquiry } = await supabase.from('vendor_enquiries').select('id, couple_name, couple_phone').eq('id', enquiry_id).maybeSingle();
    if (!enquiry) return res.json({ success: false, message: 'Enquiry not found.' });
    await supabase.from('vendor_enquiries').update({ status: 'replied', replied_at: new Date().toISOString() }).eq('id', enquiry_id);
    let sent = false;
    if (enquiry.couple_phone) {
      const phone = '+91' + enquiry.couple_phone.replace(/\D/g, '').slice(-10);
      sent = await sendWhatsApp(phone, message);
    }
    const coupleName = enquiry.couple_name || 'couple';
    res.json({ success: true, message: sent ? '\u2713 Reply sent to ' + coupleName : '\u2713 Enquiry marked as replied' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/v2/dreamai/vendor-action/record-payment
app.post('/api/v2/dreamai/vendor-action/record-payment', async (req, res) => {
  try {
    const { vendor_id, client_name, amount, invoice_id } = req.body || {};
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    if (!client_name && !invoice_id) return res.status(400).json({ success: false, error: 'client_name or invoice_id required' });
    let invoice = null;
    if (invoice_id) {
      const { data } = await supabase.from('vendor_invoices').select('id, client_name, balance, total').eq('id', invoice_id).maybeSingle();
      invoice = data;
    } else {
      const { data } = await supabase.from('vendor_invoices').select('id, client_name, balance, total').eq('vendor_id', vendor_id).ilike('client_name', '%' + client_name + '%').neq('status', 'paid').order('created_at', { ascending: false }).limit(1).maybeSingle();
      invoice = data;
    }
    if (!invoice) return res.json({ success: false, message: 'No unpaid invoice found for ' + (client_name || invoice_id) + '.' });
    const { error } = await supabase.from('vendor_invoices').update({ status: 'paid', paid_date: new Date().toISOString().slice(0, 10) }).eq('id', invoice.id);
    if (error) throw error;
    const paidAmount = amount || invoice.balance || invoice.total || 0;
    res.json({ success: true, message: '\u2713 Payment recorded for ' + invoice.client_name + '\n\u20b9' + Number(paidAmount).toLocaleString('en-IN') + ' marked as paid' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

`;

const patched = src.slice(0, listenIdx) + NEW_ENDPOINTS + src.slice(listenIdx);

// Verify
if (!patched.includes('TDW_VENDOR_ACTIONS_V1')) { console.error('ABORT: marker missing'); process.exit(1); }
if (!patched.includes('server.listen(PORT,')) { console.error('ABORT: server.listen missing'); process.exit(1); }
const moneyCount = (patched.match(/app\.get\('\/api\/v2\/couple\/money\/:userId'/g) || []).length;
if (moneyCount !== 1) { console.error('ABORT: couple/money count ' + moneyCount); process.exit(1); }

const eps = ['create-invoice','add-client','create-task','block-date','send-payment-reminder','send-client-reminder','log-expense','reply-to-enquiry','record-payment'];
for (const ep of eps) {
  if (!patched.includes("'/api/v2/dreamai/vendor-action/" + ep + "'")) {
    console.error('ABORT: endpoint missing: ' + ep); process.exit(1);
  }
}

fs.writeFileSync(FILE, patched, 'utf8');
console.log('✅ All 9 vendor action endpoints added (TDW_VENDOR_ACTIONS_V1)');
console.log('Next: git add backend/server.js && git commit -m "feat: all 9 vendor DreamAi action endpoints" && git push');
