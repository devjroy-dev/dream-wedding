#!/usr/bin/env python3
"""
TDW Backend Patch — DreamAi Invoice & Payment Fixes
Drop this file in /workspaces/dream-wedding and run:
  python3 patch_dreamai_payments.py
"""

import re

content = open('backend/server.js', 'r').read()
fixes = 0

# ─── FIX 1: Add record_payment tool to TDW_AI_TOOLS ──────────────────────────
# This lets Claude update an existing invoice instead of creating a duplicate

old1 = """    name: 'log_expense',
    description: 'Log a business or client expense — money the vendor SPENT or PAID OUT. Use when vendor mentions paying for something, spending money, procurement, studio rent, marketing, travel, assistants, or any cost. NEVER use this when money is received FROM a client — use create_invoice for that instead.',"""

new1 = """    name: 'record_payment',
    description: 'Record a payment received against an EXISTING invoice. Use ONLY when the client already has an invoice and the vendor says they received payment, e.g. \"Salil paid 20k\", \"received 50k from Priya\", \"20k milaa Salil se\". Do NOT use this to create a new invoice — use create_invoice for new work. This updates the existing invoice status.',
    input_schema: {
      type: 'object',
      properties: {
        client_name: { type: 'string', description: 'Client name whose invoice to update' },
        amount_received: { type: 'number', description: 'Amount received in rupees' },
      },
      required: ['client_name', 'amount_received'],
    },
  },
  {
    name: 'log_expense',
    description: 'Log a business or client expense — money the vendor SPENT or PAID OUT. Use when vendor mentions paying for something, spending money, procurement, studio rent, marketing, travel, assistants, or any cost. NEVER use this when money is received FROM a client — use record_payment or create_invoice for that instead.',"""

if old1 in content:
    content = content.replace(old1, new1)
    print('Fix 1: record_payment tool added to TDW_AI_TOOLS')
    fixes += 1
else:
    print('Fix 1 ERROR: log_expense tool description not found')

# ─── FIX 2: Add record_payment case to executeToolCall ───────────────────────

old2 = """      case 'log_expense': {
        const { description, amount, category, expense_type, related_name } = toolInput;"""

new2 = """      case 'record_payment': {
        const { client_name, amount_received } = toolInput;
        // Find the most recent unpaid/pending invoice for this client
        const { data: existingInvoices } = await supabase
          .from('vendor_invoices')
          .select('id, amount, total_amount, status, description')
          .eq('vendor_id', vendor.id)
          .ilike('client_name', client_name.trim())
          .in('status', ['pending', 'sent'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (!existingInvoices || existingInvoices.length === 0) {
          // No existing invoice — create a new one for the received amount
          const gst_amount = Math.round(amount_received * 0.18);
          const total_amount = amount_received + gst_amount;
          const invNum = 'INV-' + Date.now().toString().slice(-6);
          await supabase.from('vendor_invoices').insert([{
            vendor_id: vendor.id,
            client_name,
            amount: amount_received,
            gst_amount,
            total_amount,
            invoice_number: invNum,
            status: 'paid',
            paid_date: new Date().toISOString().split('T')[0],
            gst_enabled: true,
            description: 'Payment received',
          }]);
          return `✓ Payment of ₹${amount_received.toLocaleString('en-IN')} recorded for ${client_name}\\nNew invoice created and marked paid.`;
        }

        const inv = existingInvoices[0];
        const isFullyPaid = amount_received >= inv.amount;
        const balanceDue = inv.amount - amount_received;
        const newDesc = isFullyPaid
          ? 'Fully paid'
          : `Advance received: ₹${amount_received.toLocaleString('en-IN')} · Balance due: ₹${balanceDue.toLocaleString('en-IN')}`;

        await supabase.from('vendor_invoices')
          .update({
            status: isFullyPaid ? 'paid' : 'pending',
            paid_date: isFullyPaid ? new Date().toISOString().split('T')[0] : null,
            description: newDesc,
          })
          .eq('id', inv.id);

        return isFullyPaid
          ? `✓ Invoice for ${client_name} marked as fully paid ✓\\n₹${inv.amount.toLocaleString('en-IN')} received.`
          : `✓ Payment recorded for ${client_name}\\nAdvance: ₹${amount_received.toLocaleString('en-IN')} · Balance: ₹${balanceDue.toLocaleString('en-IN')} pending.`;
      }

      case 'log_expense': {
        const { description, amount, category, expense_type, related_name } = toolInput;"""

if old2 in content:
    content = content.replace(old2, new2)
    print('Fix 2: record_payment case added to executeToolCall')
    fixes += 1
else:
    print('Fix 2 ERROR: log_expense case not found')

# ─── FIX 3: Add record_payment to mapToolToAction ────────────────────────────

old3 = """    log_expense: {
      type: 'log_expense', requiresConfirmation: true,
      label: 'Log Expense',
      preview: `Log ₹${(input.amount||0).toLocaleString('en-IN')} ${input.category || ''} expense: ${input.description}`,"""

new3 = """    record_payment: {
      type: 'record_payment', requiresConfirmation: true,
      label: 'Record Payment',
      preview: `Record ₹${(input.amount_received||0).toLocaleString('en-IN')} payment from ${input.client_name}`,
      params: input,
      description: `I'll record ₹${(input.amount_received||0).toLocaleString('en-IN')} received from ${input.client_name} against their existing invoice.`,
    },
    log_expense: {
      type: 'log_expense', requiresConfirmation: true,
      label: 'Log Expense',
      preview: `Log ₹${(input.amount||0).toLocaleString('en-IN')} ${input.category || ''} expense: ${input.description}`,"""

if old3 in content:
    content = content.replace(old3, new3)
    print('Fix 3: record_payment added to mapToolToAction')
    fixes += 1
else:
    print('Fix 3 ERROR: log_expense in mapToolToAction not found')

# ─── FIX 4: Add record_payment action endpoint ───────────────────────────────

old4 = """// POST /api/v2/dreamai/vendor-action/create-invoice
app.post('/api/v2/dreamai/vendor-action/create-invoice', async (req, res) => {"""

new4 = """// POST /api/v2/dreamai/vendor-action/record-payment
app.post('/api/v2/dreamai/vendor-action/record-payment', async (req, res) => {
  try {
    const { vendor_id, client_name, amount_received } = req.body || {};
    if (!vendor_id || !client_name || !amount_received) {
      return res.status(400).json({ success: false, error: 'vendor_id, client_name and amount_received required' });
    }
    const result = await executeToolCall(
      'record_payment',
      { client_name, amount_received: Number(amount_received) },
      { id: vendor_id }
    );
    res.json({ success: true, message: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/v2/dreamai/vendor-action/create-invoice
app.post('/api/v2/dreamai/vendor-action/create-invoice', async (req, res) => {"""

if old4 in content:
    content = content.replace(old4, new4)
    print('Fix 4: record-payment action endpoint added')
    fixes += 1
else:
    print('Fix 4 ERROR: create-invoice endpoint not found')

# ─── FIX 5: Improve create_invoice to better extract advance_received ─────────
# Update the tool description to be even clearer about when to use advance_received

old5 = "        advance_received: { type: 'number', description: 'Advance or partial payment already received. Use this when vendor says \"X received\", \"X paid\", \"X advance\", \"X milaa\". Set to 0 if nothing received yet. If full amount received, set equal to amount.' },"
new5 = "        advance_received: { type: 'number', description: 'Advance already received AT THE TIME OF BOOKING. Example: \"1 lakh total, 20k advance\" → amount=100000, advance_received=20000. \"2 lakh received\" with no total mentioned → amount=200000, advance_received=200000. Set to 0 if no advance mentioned.' },"

if old5 in content:
    content = content.replace(old5, new5)
    print('Fix 5: advance_received description clarified')
    fixes += 1
else:
    print('Fix 5 ERROR: advance_received description not found')

open('backend/server.js', 'w').write(content)
print(f'\n✓ {fixes}/5 fixes applied. Run: git add -A && git commit -m "Feat: record_payment tool + advance_received fix" && git push')
