#!/usr/bin/env python3
"""
TDW — Patch: Admin Makers, Dreamers, WhatsApp endpoints
Run from: /workspaces/dream-wedding
Command:  python3 patch_admin_makers.py

Adds:
  GET    /api/v3/admin/makers
  PATCH  /api/v3/admin/makers/:id
  POST   /api/v3/admin/makers/:id/approve-all-images
  DELETE /api/v2/admin/vendors/:id
  GET    /api/v3/admin/dreamers
  PATCH  /api/v3/admin/dreamers/:id
  DELETE /api/v2/admin/couples/:id
  POST   /api/v3/admin/send-whatsapp
"""

import sys

SERVER_PATH = 'backend/server.js'

with open(SERVER_PATH, 'r') as f:
    content = f.read()

# Safety checks
express_count = content.count('const express')
if express_count != 1:
    print(f'ABORT: Found {express_count} occurrences of "const express". Expected exactly 1.')
    sys.exit(1)
print(f'✓ const express count: {express_count} (safe)')

if '/api/v3/admin/makers' in content:
    print('ABORT: /api/v3/admin/makers already exists. No action taken.')
    sys.exit(1)
print('✓ /api/v3/admin/makers not present — safe to add')

if 'const supabase' not in content and 'createClient' not in content:
    print('ABORT: Supabase client not found.')
    sys.exit(1)
print('✓ Supabase client found')

ENDPOINT_CODE = r"""

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS — v3
// All routes protected by x-admin-password header
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_PASSWORD = 'Mira@2551354';

function checkAdminAuth(req, res) {
  const pwd = req.headers['x-admin-password'];
  if (pwd !== ADMIN_PASSWORD) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return false;
  }
  return true;
}

// ── GET /api/v3/admin/makers ──────────────────────────────────────────────
app.get('/api/v3/admin/makers', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { search, tier, limit = '200' } = req.query;
    let q = supabase.from('vendors')
      .select('id, name, category, city, phone, is_verified, is_luxury, subscription_active, created_at, discover_enabled, vendor_tier, featured_photos')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    if (search) {
      q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,city.ilike.%${search}%,category.ilike.%${search}%`);
    }
    const { data, error } = await q;
    if (error) { console.error('[admin/makers]', error); return res.status(500).json({ success: false, error: error.message }); }

    let makers = data || [];
    if (makers.length > 0) {
      const ids = makers.map(v => v.id);
      const { data: subs } = await supabase.from('vendor_subscriptions')
        .select('vendor_id, tier, status, founding_badge').in('vendor_id', ids);
      const subMap = {};
      for (const s of (subs || [])) subMap[s.vendor_id] = s;
      makers = makers.map(v => {
        const s = subMap[v.id];
        return { ...v, tier: v.vendor_tier || s?.tier || 'essential', subscription_active: s?.status === 'active' || v.subscription_active || false };
      });
    }
    if (tier && tier !== 'all') makers = makers.filter(m => m.tier === tier);
    res.json({ success: true, data: makers, total: makers.length });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── PATCH /api/v3/admin/makers/:id ───────────────────────────────────────
app.patch('/api/v3/admin/makers/:id', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { id } = req.params;
    const { tier, is_verified, is_luxury, luxury_approved, discover_enabled, featured } = req.body || {};
    const update = {};
    if (tier !== undefined) update.vendor_tier = tier;
    if (is_verified !== undefined) update.is_verified = is_verified;
    if (is_luxury !== undefined) update.is_luxury = is_luxury;
    if (luxury_approved !== undefined) update.luxury_approved = luxury_approved;
    if (discover_enabled !== undefined) update.discover_enabled = discover_enabled;
    if (featured !== undefined) update.is_featured = featured;
    if (Object.keys(update).length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });
    const { error } = await supabase.from('vendors').update(update).eq('id', id);
    if (error) { console.error('[admin/makers PATCH]', error); return res.status(500).json({ success: false, error: error.message }); }
    if (tier) await supabase.from('vendor_subscriptions').update({ tier }).eq('vendor_id', id);
    console.log('[admin] Maker updated:', id, update);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── POST /api/v3/admin/makers/:id/approve-all-images ─────────────────────
app.post('/api/v3/admin/makers/:id/approve-all-images', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { id } = req.params;
    const { error } = await supabase.from('vendor_images')
      .update({ approved: true, rejected: false, rejection_reason: null }).eq('vendor_id', id);
    if (error) { console.error('[admin/approve-images]', error); return res.status(500).json({ success: false, error: error.message }); }
    console.log('[admin] All images approved for:', id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── DELETE /api/v2/admin/vendors/:id ─────────────────────────────────────
app.delete('/api/v2/admin/vendors/:id', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { id } = req.params;
    for (const table of ['vendor_subscriptions','vendor_invoices','vendor_clients','blocked_dates','vendor_images','vendor_todos','team_tasks']) {
      await supabase.from(table).delete().eq('vendor_id', id);
    }
    const { data: vendor } = await supabase.from('vendors').select('phone').eq('id', id).single();
    if (vendor?.phone) await supabase.from('vendor_credentials').delete().eq('phone', vendor.phone);
    const { error } = await supabase.from('vendors').delete().eq('id', id);
    if (error) { console.error('[admin/delete-vendor]', error); return res.status(500).json({ success: false, error: error.message }); }
    console.log('[admin] Vendor deleted:', id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── GET /api/v3/admin/dreamers ────────────────────────────────────────────
app.get('/api/v3/admin/dreamers', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { search, tier, limit = '200' } = req.query;
    let q = supabase.from('users')
      .select('id, name, partner_name, phone, couple_tier, wedding_date, founding_bride, created_at, token_balance, pai_enabled')
      .order('created_at', { ascending: false }).limit(parseInt(limit));
    if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,partner_name.ilike.%${search}%`);
    if (tier && tier !== 'all') q = q.eq('couple_tier', tier);
    const { data, error } = await q;
    if (error) { console.error('[admin/dreamers]', error); return res.status(500).json({ success: false, error: error.message }); }
    res.json({ success: true, data: data || [], total: (data || []).length });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── PATCH /api/v3/admin/dreamers/:id ─────────────────────────────────────
app.patch('/api/v3/admin/dreamers/:id', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { id } = req.params;
    const { couple_tier, tier, founding_bride, pai_enabled } = req.body || {};
    const update = {};
    const resolvedTier = couple_tier || tier;
    if (resolvedTier) update.couple_tier = resolvedTier;
    if (founding_bride !== undefined) update.founding_bride = founding_bride;
    if (pai_enabled !== undefined) update.pai_enabled = pai_enabled;
    if (Object.keys(update).length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });
    const { error } = await supabase.from('users').update(update).eq('id', id);
    if (error) { console.error('[admin/dreamers PATCH]', error); return res.status(500).json({ success: false, error: error.message }); }
    console.log('[admin] Dreamer updated:', id, update);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── DELETE /api/v2/admin/couples/:id ─────────────────────────────────────
app.delete('/api/v2/admin/couples/:id', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { id } = req.params;
    for (const table of ['couple_tasks','couple_expenses','couple_guests','couple_vendors','couple_muse','couple_events','couple_budget','couple_budget_categories']) {
      await supabase.from(table).delete().eq('couple_id', id);
    }
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) { console.error('[admin/delete-couple]', error); return res.status(500).json({ success: false, error: error.message }); }
    console.log('[admin] Couple deleted:', id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── POST /api/v3/admin/send-whatsapp ─────────────────────────────────────
app.post('/api/v3/admin/send-whatsapp', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { phone, message } = req.body || {};
    if (!phone || !message) return res.status(400).json({ success: false, error: 'phone and message required' });
    const normalised = '+91' + phone.replace(/\D/g, '').slice(-10);
    const sent = await sendWhatsApp(normalised, message);
    if (!sent) return res.status(500).json({ success: false, error: 'WhatsApp send failed' });
    console.log('[admin] WhatsApp sent to:', normalised);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
"""

with open(SERVER_PATH, 'a') as f:
    f.write(ENDPOINT_CODE)

print('')
print('✅ PATCH COMPLETE')
print('   GET    /api/v3/admin/makers')
print('   PATCH  /api/v3/admin/makers/:id')
print('   POST   /api/v3/admin/makers/:id/approve-all-images')
print('   DELETE /api/v2/admin/vendors/:id')
print('   GET    /api/v3/admin/dreamers')
print('   PATCH  /api/v3/admin/dreamers/:id')
print('   DELETE /api/v2/admin/couples/:id')
print('   POST   /api/v3/admin/send-whatsapp')
print('')
print('VERIFY AND DEPLOY:')
print('1. grep -n "const express" backend/server.js        <- must be 1')
print('2. grep -n "api/v3/admin/makers" backend/server.js  <- must exist')
print('3. git add backend/server.js')
print('4. git commit -m "fix: add admin makers + dreamers + whatsapp endpoints"')
print('5. git push origin main')
print('6. Wait 60 seconds — check Railway deploy logs')
print('7. Open thedreamwedding.in/admin — login — go to Makers')
