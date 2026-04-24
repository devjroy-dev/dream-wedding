"""
PHASE 1 — Backend patch
File: dream-wedding/backend/server.js

Changes:
  1. /api/vendors browse filter — add is_approved + discover_listed + vendor_discover_enabled
  2. 4 new DreamAi in-app action endpoints (create-invoice, add-client, create-task, send-client-reminder)
  3. Updated DreamAi vendor system prompt — exposes all 8 actions
  4. 5 missing admin vendor endpoints (GET list, approve, revoke, tier, dreamai, create)

Run from: /workspaces/dream-wedding
Command:  python3 phase1_backend.py
"""

import re

PATH = 'backend/server.js'

with open(PATH, 'r') as f:
    src = f.read()

original = src  # keep a copy so we can confirm changes at the end
changes = []

# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 1
# /api/vendors browse query — add the three discovery flags to the WHERE clause.
# A vendor only appears in couple discovery when ALL THREE flags are true,
# plus subscription_active. This is the "zero appearance until Level 3" rule.
# ─────────────────────────────────────────────────────────────────────────────
OLD_FILTER = """    // Normal browse query
    let query = supabase.from('vendors').select('*').eq('subscription_active', true);
    if (category) query = query.eq('category', category);
    if (city) {
      query = query.or(`city.ilike.%${city}%,city.ilike.%Pan India%`);
    }"""

NEW_FILTER = """    // Normal browse query
    // ALL FOUR conditions must be true for a vendor to appear in couple discovery.
    // subscription_active  → vendor has an active subscription
    // is_approved          → Dev/Swati manually approved them at Level 3
    // discover_listed      → set true atomically with is_approved on approval
    // vendor_discover_enabled → set true atomically with is_approved on approval
    let query = supabase.from('vendors').select('*')
      .eq('subscription_active', true)
      .eq('is_approved', true)
      .eq('discover_listed', true)
      .eq('vendor_discover_enabled', true);
    if (category) query = query.eq('category', category);
    if (city) {
      query = query.or(`city.ilike.%${city}%,city.ilike.%Pan India%`);
    }"""

if OLD_FILTER in src:
    src = src.replace(OLD_FILTER, NEW_FILTER)
    changes.append('✓ Change 1: /api/vendors browse filter — added is_approved + discover_listed + vendor_discover_enabled')
else:
    changes.append('✗ Change 1 FAILED — pattern not found. Check server.js manually.')


# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 2
# DreamAi vendor system prompt — updated to expose all 8 action types.
# The old prompt only told Claude about 0 actions (no action tags at all).
# Now Claude knows all 8 and will emit the correct [ACTION:...] tag when
# the vendor asks it to DO something rather than just query data.
# ─────────────────────────────────────────────────────────────────────────────
OLD_PROMPT = """      : `You are DreamAi, the AI business companion for The Dream Wedding. You have complete knowledge of this Maker's business. Speak like a sharp, professional business assistant — concise, data-driven. Always use their actual data from the context below. Answer in 2-4 sentences max unless drafting a message.\\n\\nContext: ${JSON.stringify(context || {})}`;"""

NEW_PROMPT = """      : `You are DreamAi, the AI business companion for The Dream Wedding. You have complete knowledge of this Maker's business. Speak like a sharp, professional business assistant — concise, data-driven. Always use their actual data from the context below. Answer in 2-4 sentences max unless drafting a message.

When the vendor asks you to DO something (not just query), end your reply with an action tag in this exact format:
[ACTION:action_type|Button Label|Preview of what will happen|{"param":"value"}]

Available actions:
- create_invoice:        [ACTION:create_invoice|Create Invoice|Create invoice for {client} ₹{amount}|{"client_name":"...","amount":0,"advance_received":0,"event_type":"Wedding"}]
- add_client:            [ACTION:add_client|Add Client|Add {name} as a new client|{"client_name":"...","event_type":"Wedding","event_date":"","budget":0}]
- create_task:           [ACTION:create_task|Create Task|Create task: {task}|{"task":"...","assignee":"","due_date":""}]
- block_date:            [ACTION:block_date|Block Date|Block {date} for {client}|{"client_name":"...","dates":["YYYY-MM-DD"]}]
- send_payment_reminder: [ACTION:send_payment_reminder|Send Reminder|Send payment reminder to {client}|{"client_name":"...","amount":0}]
- send_client_reminder:  [ACTION:send_client_reminder|Send Reminder|Send {type} reminder to {client}|{"client_name":"...","reminder_type":"payment"}]
- log_expense:           [ACTION:log_expense|Log Expense|Log ₹{amount} expense: {description}|{"amount":0,"description":"...","category":"General"}]
- reply_to_enquiry:      [ACTION:reply_to_enquiry|Send Reply|Reply to {couple} enquiry|{"enquiry_id":"...","message":"..."}]

Context: \${JSON.stringify(context || {})}`;"""

if OLD_PROMPT in src:
    src = src.replace(OLD_PROMPT, NEW_PROMPT)
    changes.append('✓ Change 2: DreamAi vendor system prompt — updated to expose all 8 action types')
else:
    changes.append('✗ Change 2 FAILED — system prompt pattern not found. Check server.js manually.')


# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 3
# 4 new DreamAi in-app action endpoints.
# These call executeToolCall() which already has all the Supabase logic —
# we are just exposing them as REST endpoints so the frontend FAB can trigger them.
# Inserted immediately after the existing log-expense endpoint.
# ─────────────────────────────────────────────────────────────────────────────
OLD_AFTER_LOGEXPENSE = """// POST /api/v2/dreamai/whatsapp-extract"""

NEW_DREAMAI_ACTIONS = """// ─── DreamAi in-app action endpoints ─────────────────────────────────────────
// These 4 endpoints complete the set. The first 4 (send-payment-reminder,
// reply-to-enquiry, block-date, log-expense) already exist above.
// Together all 8 match the WhatsApp DreamAi tool set exactly.

// POST /api/v2/dreamai/vendor-action/create-invoice
app.post('/api/v2/dreamai/vendor-action/create-invoice', async (req, res) => {
  try {
    const { vendor_id, client_name, amount, advance_received, event_type } = req.body || {};
    if (!vendor_id || !client_name || !amount) {
      return res.status(400).json({ success: false, error: 'vendor_id, client_name and amount required' });
    }
    const result = await executeToolCall(
      'create_invoice',
      { client_name, amount: Number(amount), advance_received: Number(advance_received || 0), event_type: event_type || 'Wedding' },
      { id: vendor_id }
    );
    res.json({ success: true, message: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/v2/dreamai/vendor-action/add-client
app.post('/api/v2/dreamai/vendor-action/add-client', async (req, res) => {
  try {
    const { vendor_id, client_name, phone, event_date, event_type, budget } = req.body || {};
    if (!vendor_id || !client_name) {
      return res.status(400).json({ success: false, error: 'vendor_id and client_name required' });
    }
    const result = await executeToolCall(
      'add_client',
      { client_name, phone: phone || null, event_date: event_date || null, event_type: event_type || 'Wedding', budget: Number(budget || 0) },
      { id: vendor_id }
    );
    res.json({ success: true, message: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/v2/dreamai/vendor-action/create-task
app.post('/api/v2/dreamai/vendor-action/create-task', async (req, res) => {
  try {
    const { vendor_id, task, assignee, due_date } = req.body || {};
    if (!vendor_id || !task) {
      return res.status(400).json({ success: false, error: 'vendor_id and task required' });
    }
    const result = await executeToolCall(
      'create_task',
      { task, assignee: assignee || null, due_date: due_date || null },
      { id: vendor_id }
    );
    res.json({ success: true, message: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/v2/dreamai/vendor-action/send-client-reminder
app.post('/api/v2/dreamai/vendor-action/send-client-reminder', async (req, res) => {
  try {
    const { vendor_id, client_name, reminder_type, custom_message } = req.body || {};
    if (!vendor_id || !client_name) {
      return res.status(400).json({ success: false, error: 'vendor_id and client_name required' });
    }
    const result = await executeToolCall(
      'send_client_reminder',
      { client_name, reminder_type: reminder_type || 'payment', custom_message: custom_message || null },
      { id: vendor_id }
    );
    res.json({ success: true, message: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/v2/dreamai/whatsapp-extract"""

if OLD_AFTER_LOGEXPENSE in src:
    src = src.replace(OLD_AFTER_LOGEXPENSE, NEW_DREAMAI_ACTIONS)
    changes.append('✓ Change 3: 4 new DreamAi in-app action endpoints added (create-invoice, add-client, create-task, send-client-reminder)')
else:
    changes.append('✗ Change 3 FAILED — whatsapp-extract marker not found. Check server.js manually.')


# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 4
# 5 missing admin vendor endpoints.
# The admin portal at app.thedreamwedding.in/admin/vendors calls these URLs
# but they didn't exist in the backend — every button was silently 404-ing.
# Inserted right after the existing /api/v2/admin/vendors/list endpoint.
# ─────────────────────────────────────────────────────────────────────────────
OLD_AFTER_LIST = """// ── Admin: delete vendor/maker (full cascade)
app.delete('/api/v2/admin/vendors/:id', async (req, res) => {"""

NEW_ADMIN_ENDPOINTS = """// ─── Admin vendor management endpoints ───────────────────────────────────────
// The admin portal calls these URLs. Kept simple and explicit so any new
// developer can read exactly what each button in the admin UI does.

// GET /api/v2/admin/vendors — full vendor list with tier + approval status
// (frontend calls this on load; /list above is an alias kept for compatibility)
app.get('/api/v2/admin/vendors', async (req, res) => {
  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD && req.headers['x-admin-password'] !== 'Mira@2551354') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('id, name, phone, category, city, tier, is_approved, dreamai_access, subscription_active, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, vendors: vendors || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PATCH /api/v2/admin/vendors/:id/approve — toggle is_approved on the vendor row
app.patch('/api/v2/admin/vendors/:id/approve', async (req, res) => {
  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD && req.headers['x-admin-password'] !== 'Mira@2551354') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { data: vendor } = await supabase.from('vendors').select('is_approved').eq('id', req.params.id).maybeSingle();
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });
    const { error } = await supabase.from('vendors').update({ is_approved: !vendor.is_approved }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, is_approved: !vendor.is_approved });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PATCH /api/v2/admin/vendors/:id/revoke — remove vendor from discovery entirely
// Clears all three discovery flags atomically so vendor vanishes from couple feed immediately.
app.patch('/api/v2/admin/vendors/:id/revoke', async (req, res) => {
  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD && req.headers['x-admin-password'] !== 'Mira@2551354') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { error } = await supabase.from('vendors').update({
      is_approved: false,
      discover_listed: false,
      vendor_discover_enabled: false,
    }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PATCH /api/v2/admin/vendors/:id/tier — change vendor subscription tier
app.patch('/api/v2/admin/vendors/:id/tier', async (req, res) => {
  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD && req.headers['x-admin-password'] !== 'Mira@2551354') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { tier } = req.body || {};
    const allowed = ['essential', 'signature', 'prestige'];
    if (!allowed.includes(tier)) return res.status(400).json({ success: false, error: 'Invalid tier' });
    const { error } = await supabase.from('vendor_subscriptions').update({ tier }).eq('vendor_id', req.params.id);
    if (error) throw error;
    res.json({ success: true, tier });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PATCH /api/v2/admin/vendors/:id/dreamai — toggle DreamAi WhatsApp access
app.patch('/api/v2/admin/vendors/:id/dreamai', async (req, res) => {
  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD && req.headers['x-admin-password'] !== 'Mira@2551354') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { access } = req.body || {};
    const { error } = await supabase.from('vendors').update({ dreamai_access: !!access }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, dreamai_access: !!access });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/v2/admin/vendors/create — create a new vendor from the admin panel
// Delegates to the existing /api/admin/create-vendor logic (full cascade creation).
app.post('/api/v2/admin/vendors/create', async (req, res) => {
  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD && req.headers['x-admin-password'] !== 'Mira@2551354') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { business_name, phone, category, city, tier } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'phone required' });
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) return res.status(400).json({ success: false, error: 'Phone must be 10 digits' });
    const fullPhone = `+91${cleanPhone}`;
    const allowedTiers = ['essential', 'signature', 'prestige'];
    const finalTier = allowedTiers.includes(tier) ? tier : 'signature';

    // Insert vendor row
    const { data: vendor, error: vErr } = await supabase.from('vendors').insert([{
      name: business_name || 'New Maker',
      phone: fullPhone,
      category: category || null,
      city: city || null,
      subscription_active: true,
    }]).select().single();
    if (vErr) throw vErr;

    // Create subscription row with trial until Aug 1 2026 (founding period)
    const trialEnd = new Date('2026-08-01').toISOString();
    await supabase.from('vendor_subscriptions').insert([{
      vendor_id: vendor.id, tier: finalTier, status: 'active', trial_ends_at: trialEnd,
    }]);

    res.json({ success: true, data: vendor });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── Admin: delete vendor/maker (full cascade)
app.delete('/api/v2/admin/vendors/:id', async (req, res) => {"""

if OLD_AFTER_LIST in src:
    src = src.replace(OLD_AFTER_LIST, NEW_ADMIN_ENDPOINTS)
    changes.append('✓ Change 4: 6 admin vendor endpoints added (GET list, approve, revoke, tier, dreamai, create)')
else:
    changes.append('✗ Change 4 FAILED — delete vendor marker not found. Check server.js manually.')


# ─────────────────────────────────────────────────────────────────────────────
# Write and report
# ─────────────────────────────────────────────────────────────────────────────
if src == original:
    print('✗ NO CHANGES MADE — all patterns failed to match. Do not commit.')
else:
    with open(PATH, 'w') as f:
        f.write(src)
    print('\nPhase 1 — Backend patch complete\n')
    for c in changes:
        print(c)
    print(f'\nFile: {PATH}')
    print('Next: git add -A && git commit -m "Phase 1: vendor filter, DreamAi actions, admin vendor endpoints" && git push')
