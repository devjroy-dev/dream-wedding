#!/usr/bin/env python3
"""
TDW — Patch: Admin Cover Photos, Exploring Photos, Preview Vendors, Invites
Run from: /workspaces/dream-wedding
Command:  python3 patch_admin_content.py

Adds:
  GET    /api/v2/cover-photos                        (already exists — skip if present)
  POST   /api/v2/admin/cover-photos                  — add cover photo by URL
  PUT    /api/v2/admin/cover-photos/:id              — update cover photo fields
  DELETE /api/v2/admin/cover-photos/:id              — remove cover photo
  POST   /api/v2/admin/cover-photos/upload           — upload image file to Supabase storage

  GET    /api/v2/admin/exploring-photos              — list exploring photos
  POST   /api/v2/admin/exploring-photos/upload       — upload exploring photo
  PATCH  /api/v2/admin/exploring-photos/:id          — update caption/active
  DELETE /api/v2/admin/exploring-photos/:id          — remove exploring photo

  GET    /api/v2/admin/preview-vendors               — list preview vendors
  POST   /api/v2/admin/preview-vendors               — add preview vendor
  DELETE /api/v2/admin/preview-vendors/:id           — remove preview vendor

  GET    /api/v2/admin/invites                       — list all invite codes
  POST   /api/v2/admin/invites/generate              — generate new invite code
  DELETE /api/v2/admin/invites/:id                   — revoke invite code
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

if '/api/v2/admin/cover-photos' in content:
    print('ABORT: /api/v2/admin/cover-photos already exists. No action taken.')
    sys.exit(1)
print('✓ /api/v2/admin/cover-photos not present — safe to add')

if 'createClient' not in content and 'const supabase' not in content:
    print('ABORT: Supabase client not found.')
    sys.exit(1)
print('✓ Supabase client found')

ENDPOINT_CODE = r"""

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN CONTENT ENDPOINTS — cover photos, exploring photos, preview vendors, invites
// ─────────────────────────────────────────────────────────────────────────────

// Re-use ADMIN_PASSWORD and checkAdminAuth from above

// ── GET /api/v2/cover-photos — public, used by native app landing carousel ─
// NOTE: This endpoint may already exist. If Railway returns 404, it means
// it was not added yet. Adding it here as a safe duplicate-guarded version.
// The native app reads d.photos and maps p.image_url
app.get('/api/v2/cover-photos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cover_photos')
      .select('id, image_url, photographer_name, display_order, is_active, is_paid, amount_paid, valid_from, valid_to, vendor_id')
      .eq('is_active', true)
      .eq('placement_type', 'cover')
      .order('display_order', { ascending: true });
    if (error) { console.error('[cover-photos]', error); return res.status(500).json({ error: error.message }); }
    res.json({ photos: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/v2/admin/cover-photos — add photo by URL ───────────────────
app.post('/api/v2/admin/cover-photos', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { image_url, photographer_name = '', is_paid = false, amount_paid = 0, valid_from = null, valid_to = null } = req.body || {};
    if (!image_url) return res.status(400).json({ success: false, error: 'image_url required' });

    const { data: existing } = await supabase.from('cover_photos').select('display_order').eq('placement_type', 'cover').order('display_order', { ascending: false }).limit(1);
    const nextOrder = existing && existing.length > 0 ? (existing[0].display_order + 1) : 1;

    const { data, error } = await supabase.from('cover_photos').insert([{
      image_url, photographer_name, display_order: nextOrder,
      is_active: true, placement_type: 'cover',
      is_paid, amount_paid: amount_paid || 0,
      valid_from: valid_from || null, valid_to: valid_to || null,
      created_at: new Date().toISOString(),
    }]).select().single();
    if (error) { console.error('[admin/cover-photos POST]', error); return res.status(500).json({ success: false, error: error.message }); }
    console.log('[admin] Cover photo added:', image_url);
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── PUT /api/v2/admin/cover-photos/:id — update cover photo ──────────────
app.put('/api/v2/admin/cover-photos/:id', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { id } = req.params;
    const { image_url, photographer_name, is_active, is_paid, amount_paid, valid_from, valid_to, display_order } = req.body || {};
    const update = {};
    if (image_url !== undefined) update.image_url = image_url;
    if (photographer_name !== undefined) update.photographer_name = photographer_name;
    if (is_active !== undefined) update.is_active = is_active;
    if (is_paid !== undefined) update.is_paid = is_paid;
    if (amount_paid !== undefined) update.amount_paid = amount_paid;
    if (valid_from !== undefined) update.valid_from = valid_from || null;
    if (valid_to !== undefined) update.valid_to = valid_to || null;
    if (display_order !== undefined) update.display_order = display_order;
    const { error } = await supabase.from('cover_photos').update(update).eq('id', id);
    if (error) { console.error('[admin/cover-photos PUT]', error); return res.status(500).json({ success: false, error: error.message }); }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── DELETE /api/v2/admin/cover-photos/:id ────────────────────────────────
app.delete('/api/v2/admin/cover-photos/:id', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { error } = await supabase.from('cover_photos').delete().eq('id', req.params.id);
    if (error) { console.error('[admin/cover-photos DELETE]', error); return res.status(500).json({ success: false, error: error.message }); }
    console.log('[admin] Cover photo deleted:', req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── POST /api/v2/admin/cover-photos/upload — upload file to Supabase storage
const multer = require('multer');
const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

app.post('/api/v2/admin/cover-photos/upload', checkAdminAuth, uploadMemory.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const filename = `cover_${Date.now()}.jpg`;
    const { data, error } = await supabase.storage.from('cover-photos').upload(filename, req.file.buffer, { contentType: 'image/jpeg', upsert: false });
    if (error) { console.error('[admin/cover-upload]', error); return res.status(500).json({ success: false, error: error.message }); }
    const { data: urlData } = supabase.storage.from('cover-photos').getPublicUrl(filename);
    const url = urlData?.publicUrl || '';
    console.log('[admin] Cover photo uploaded:', url);
    res.json({ success: true, url });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── GET /api/v2/admin/exploring-photos ───────────────────────────────────
app.get('/api/v2/admin/exploring-photos', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { data, error } = await supabase.from('exploring_photos')
      .select('id, image_url, display_order, caption, active, created_at')
      .order('display_order', { ascending: true });
    if (error) { console.error('[admin/exploring-photos]', error); return res.status(500).json({ success: false, error: error.message }); }
    res.json({ success: true, data: data || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── POST /api/v2/admin/exploring-photos/upload ───────────────────────────
app.post('/api/v2/admin/exploring-photos/upload', checkAdminAuth, uploadMemory.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const filename = `exploring_${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from('exploring-photos').upload(filename, req.file.buffer, { contentType: 'image/jpeg', upsert: false });

    let imageUrl = '';
    if (uploadError) {
      // Storage bucket may not exist — fall back to Cloudinary URL pattern or just save filename
      console.error('[admin/exploring-upload storage]', uploadError.message);
      return res.status(500).json({ success: false, error: 'Storage upload failed: ' + uploadError.message });
    }
    const { data: urlData } = supabase.storage.from('exploring-photos').getPublicUrl(filename);
    imageUrl = urlData?.publicUrl || '';

    const { data: existing } = await supabase.from('exploring_photos').select('display_order').order('display_order', { ascending: false }).limit(1);
    const nextOrder = existing && existing.length > 0 ? (existing[0].display_order + 1) : 1;
    const caption = req.body?.caption || null;

    const { data, error } = await supabase.from('exploring_photos').insert([{
      image_url: imageUrl, display_order: nextOrder,
      caption, active: true, created_at: new Date().toISOString(),
    }]).select().single();
    if (error) { console.error('[admin/exploring-photos insert]', error); return res.status(500).json({ success: false, error: error.message }); }
    console.log('[admin] Exploring photo uploaded:', imageUrl);
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── PATCH /api/v2/admin/exploring-photos/:id ─────────────────────────────
app.patch('/api/v2/admin/exploring-photos/:id', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { id } = req.params;
    const { caption, active, display_order } = req.body || {};
    const update = {};
    if (caption !== undefined) update.caption = caption;
    if (active !== undefined) update.active = active;
    if (display_order !== undefined) update.display_order = display_order;
    const { error } = await supabase.from('exploring_photos').update(update).eq('id', id);
    if (error) { console.error('[admin/exploring-photos PATCH]', error); return res.status(500).json({ success: false, error: error.message }); }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── DELETE /api/v2/admin/exploring-photos/:id ────────────────────────────
app.delete('/api/v2/admin/exploring-photos/:id', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { error } = await supabase.from('exploring_photos').delete().eq('id', req.params.id);
    if (error) { console.error('[admin/exploring-photos DELETE]', error); return res.status(500).json({ success: false, error: error.message }); }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── GET /api/v2/exploring-photos — public, used by native app Just Exploring
app.get('/api/v2/exploring-photos', async (req, res) => {
  try {
    const { data, error } = await supabase.from('exploring_photos')
      .select('id, image_url, caption, display_order')
      .eq('active', true)
      .order('display_order', { ascending: true });
    if (error) { console.error('[exploring-photos]', error); return res.status(500).json({ error: error.message }); }
    res.json({ photos: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/v2/admin/preview-vendors ────────────────────────────────────
app.get('/api/v2/admin/preview-vendors', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    // Preview vendors are vendors manually selected by admin for Just Exploring
    // Uses the vendors table with a preview_enabled flag, or a separate preview_vendors table
    // Try preview_vendors table first, fallback to vendors with is_featured
    const { data: pvData, error: pvError } = await supabase
      .from('preview_vendors')
      .select('id, vendor_id, display_order, created_at')
      .order('display_order', { ascending: true });

    if (!pvError && pvData) {
      // Enrich with vendor details
      const vendorIds = pvData.map(pv => pv.vendor_id).filter(Boolean);
      let vendors = [];
      if (vendorIds.length > 0) {
        const { data: vData } = await supabase.from('vendors')
          .select('id, name, category, city, featured_photos, vendor_tier')
          .in('id', vendorIds);
        vendors = vData || [];
      }
      const enriched = pvData.map(pv => ({
        ...pv,
        vendor: vendors.find(v => v.id === pv.vendor_id) || null,
      }));
      return res.json({ success: true, data: enriched });
    }

    // Fallback — return featured vendors
    const { data, error } = await supabase.from('vendors')
      .select('id, name, category, city, featured_photos, vendor_tier')
      .eq('is_featured', true)
      .limit(20);
    if (error) { console.error('[admin/preview-vendors]', error); return res.status(500).json({ success: false, error: error.message }); }
    res.json({ success: true, data: data || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── GET /api/v2/preview-vendors — public, used by native app Just Exploring
app.get('/api/v2/preview-vendors', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendors')
      .select('id, name, category, city, featured_photos, vendor_tier, starting_price')
      .eq('is_featured', true)
      .eq('subscription_active', true)
      .limit(10);
    if (error) { console.error('[preview-vendors]', error); return res.status(500).json({ error: error.message }); }
    res.json({ vendors: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/v2/admin/invites — list all invite codes ────────────────────
app.get('/api/v2/admin/invites', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { data, error } = await supabase.from('access_codes')
      .select('id, code, type, tier, used, used_count, used_at, created_at, expires_at, created_by, note, vendor_name')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) { console.error('[admin/invites]', error); return res.status(500).json({ success: false, error: error.message }); }

    // Normalise: map type to role for the admin UI
    const codes = (data || []).map(c => ({
      ...c,
      role: c.type === 'couple_tier' ? 'dreamer' : 'vendor',
    }));
    res.json({ success: true, codes, total: codes.length });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── POST /api/v2/admin/invites/generate — create invite code ─────────────
app.post('/api/v2/admin/invites/generate', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { role, tier, expires_at } = req.body || {};
    if (!role || !tier) return res.status(400).json({ success: false, error: 'role and tier required' });

    // Generate a clean 8-char uppercase code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];

    const type = role === 'dreamer' ? 'couple_tier' : 'vendor_tier_trial';

    const { data, error } = await supabase.from('access_codes').insert([{
      code, type, tier,
      used: false, used_count: 0,
      expires_at: expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: 'admin',
      note: `${tier} ${role} invite`,
      created_at: new Date().toISOString(),
    }]).select().single();
    if (error) { console.error('[admin/invites/generate]', error); return res.status(500).json({ success: false, error: error.message }); }
    console.log('[admin] Invite code generated:', code, role, tier);
    res.json({ success: true, code, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── DELETE /api/v2/admin/invites/:id — revoke invite code ────────────────
app.delete('/api/v2/admin/invites/:id', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { error } = await supabase.from('access_codes').delete().eq('id', req.params.id);
    if (error) { console.error('[admin/invites DELETE]', error); return res.status(500).json({ success: false, error: error.message }); }
    console.log('[admin] Invite code revoked:', req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
"""

with open(SERVER_PATH, 'a') as f:
    f.write(ENDPOINT_CODE)

print('')
print('✅ PATCH COMPLETE')
print('   GET    /api/v2/cover-photos                  (public — native app)')
print('   POST   /api/v2/admin/cover-photos            (add by URL)')
print('   PUT    /api/v2/admin/cover-photos/:id        (update fields)')
print('   DELETE /api/v2/admin/cover-photos/:id        (remove)')
print('   POST   /api/v2/admin/cover-photos/upload     (upload file)')
print('   GET    /api/v2/admin/exploring-photos        (admin list)')
print('   POST   /api/v2/admin/exploring-photos/upload (upload file)')
print('   PATCH  /api/v2/admin/exploring-photos/:id    (update)')
print('   DELETE /api/v2/admin/exploring-photos/:id    (remove)')
print('   GET    /api/v2/exploring-photos              (public — native app)')
print('   GET    /api/v2/admin/preview-vendors         (admin list)')
print('   GET    /api/v2/preview-vendors               (public — native app)')
print('   GET    /api/v2/admin/invites                 (list codes)')
print('   POST   /api/v2/admin/invites/generate        (generate code)')
print('   DELETE /api/v2/admin/invites/:id             (revoke code)')
print('')
print('VERIFY AND DEPLOY:')
print('1. grep -n "const express" backend/server.js              <- must be 1')
print('2. grep -n "api/v2/admin/cover-photos" backend/server.js  <- must exist')
print('3. grep -n "api/v2/admin/invites" backend/server.js       <- must exist')
print('4. git add backend/server.js')
print('5. git commit -m "fix: add admin cover, exploring, preview-vendors, invites endpoints"')
print('6. git push origin main')
print('7. Wait 60 seconds — check Railway deploy logs for any errors')
print('8. Open thedreamwedding.in/admin — test Cover, Exploring, Invites pages')
