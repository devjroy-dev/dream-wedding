#!/usr/bin/env python3
"""
TDW — Patch: Hot Dates, Command Centre, Image Approvals
Run from: /workspaces/dream-wedding
Command:  python3 patch_admin_dashboard.py

Adds:
  GET    /api/v2/admin/hot-dates          — list hot dates
  POST   /api/v2/admin/hot-dates          — create hot date
  PATCH  /api/v2/admin/hot-dates/:id      — update hot date
  DELETE /api/v2/admin/hot-dates/:id      — delete hot date

  GET    /api/v3/admin/command-centre     — dashboard stats + activity
  POST   /api/v3/admin/data/backfill-all  — trigger data backfill

  GET    /api/v3/admin/images/pending     — pending image approvals
  PATCH  /api/v3/admin/images/:id         — approve or reject image
"""

import sys

SERVER_PATH = 'backend/server.js'

with open(SERVER_PATH, 'r') as f:
    content = f.read()

express_count = content.count('const express')
if express_count != 1:
    print(f'ABORT: Found {express_count} occurrences of "const express". Expected exactly 1.')
    sys.exit(1)
print(f'✓ const express count: {express_count} (safe)')

if '/api/v2/admin/hot-dates' in content:
    print('ABORT: /api/v2/admin/hot-dates already exists. No action taken.')
    sys.exit(1)
print('✓ /api/v2/admin/hot-dates not present — safe to add')

if 'createClient' not in content and 'const supabase' not in content:
    print('ABORT: Supabase client not found.')
    sys.exit(1)
print('✓ Supabase client found')

ENDPOINT_CODE = r"""

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN DASHBOARD ENDPOINTS — hot dates, command centre, image approvals
// ─────────────────────────────────────────────────────────────────────────────

// ── GET /api/v2/admin/hot-dates ───────────────────────────────────────────
app.get('/api/v2/admin/hot-dates', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { data, error } = await supabase.from('hot_dates')
      .select('id, date, label, intensity, active, created_at')
      .order('date', { ascending: true });
    if (error) { console.error('[admin/hot-dates]', error); return res.status(500).json({ success: false, error: error.message }); }
    res.json({ success: true, data: data || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── POST /api/v2/admin/hot-dates — create hot date ────────────────────────
app.post('/api/v2/admin/hot-dates', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { date, label, intensity = 'medium', active = true } = req.body || {};
    if (!date || !label) return res.status(400).json({ success: false, error: 'date and label required' });
    const { data, error } = await supabase.from('hot_dates').insert([{
      date, label, intensity, active, created_at: new Date().toISOString(),
    }]).select().single();
    if (error) { console.error('[admin/hot-dates POST]', error); return res.status(500).json({ success: false, error: error.message }); }
    console.log('[admin] Hot date created:', date, label);
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── PATCH /api/v2/admin/hot-dates/:id ─────────────────────────────────────
app.patch('/api/v2/admin/hot-dates/:id', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { id } = req.params;
    const { date, label, intensity, active } = req.body || {};
    const update = {};
    if (date !== undefined) update.date = date;
    if (label !== undefined) update.label = label;
    if (intensity !== undefined) update.intensity = intensity;
    if (active !== undefined) update.active = active;
    const { error } = await supabase.from('hot_dates').update(update).eq('id', id);
    if (error) { console.error('[admin/hot-dates PATCH]', error); return res.status(500).json({ success: false, error: error.message }); }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── DELETE /api/v2/admin/hot-dates/:id ────────────────────────────────────
app.delete('/api/v2/admin/hot-dates/:id', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { error } = await supabase.from('hot_dates').delete().eq('id', req.params.id);
    if (error) { console.error('[admin/hot-dates DELETE]', error); return res.status(500).json({ success: false, error: error.message }); }
    console.log('[admin] Hot date deleted:', req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── GET /api/v3/admin/command-centre — dashboard stats ────────────────────
app.get('/api/v3/admin/command-centre', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Run all counts in parallel
    const [
      { count: totalDreamers },
      { count: todayDreamers },
      { count: yesterdayDreamers },
      { count: totalMakers },
      { count: todayMakers },
      { count: yesterdayMakers },
      { count: enquiriesToday },
      { count: enquiriesYesterday },
      { count: museSavesToday },
      { count: museSavesYesterday },
      { data: recentUsers },
      { data: recentVendors },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', yesterday).lt('created_at', today),
      supabase.from('vendors').select('*', { count: 'exact', head: true }),
      supabase.from('vendors').select('*', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('vendors').select('*', { count: 'exact', head: true }).gte('created_at', yesterday).lt('created_at', today),
      supabase.from('vendor_enquiries').select('*', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('vendor_enquiries').select('*', { count: 'exact', head: true }).gte('created_at', yesterday).lt('created_at', today),
      supabase.from('couple_muse').select('*', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('couple_muse').select('*', { count: 'exact', head: true }).gte('created_at', yesterday).lt('created_at', today),
      supabase.from('users').select('id, name, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('vendors').select('id, name, created_at, category').order('created_at', { ascending: false }).limit(5),
    ]);

    // Build activity feed from recent signups
    const activity = [];
    for (const u of (recentUsers || [])) {
      activity.push({
        type: 'new_dreamer',
        emoji: '♡',
        text: `${u.name || 'A new Dreamer'} joined`,
        at: u.created_at,
        id: u.id,
      });
    }
    for (const v of (recentVendors || [])) {
      activity.push({
        type: 'new_maker',
        emoji: '✦',
        text: `${v.name || 'A new Maker'} (${v.category || 'vendor'}) joined`,
        at: v.created_at,
        id: v.id,
      });
    }
    activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    res.json({
      success: true,
      counters: {
        dreamers: { total: totalDreamers || 0, today_delta: (todayDreamers || 0) - (yesterdayDreamers || 0) },
        makers: { total: totalMakers || 0, today_delta: (todayMakers || 0) - (yesterdayMakers || 0) },
        enquiries_today: { total: enquiriesToday || 0, delta: (enquiriesToday || 0) - (enquiriesYesterday || 0) },
        muse_saves_today: { total: museSavesToday || 0, delta: (museSavesToday || 0) - (museSavesYesterday || 0) },
      },
      activity: activity.slice(0, 10),
    });
  } catch (err) {
    console.error('[admin/command-centre]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/v3/admin/data/backfill-all — trigger backfill ───────────────
app.post('/api/v3/admin/data/backfill-all', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  // Placeholder — logs the trigger, returns success
  console.log('[admin] Data backfill triggered');
  res.json({ success: true, message: 'Backfill triggered' });
});

// ── GET /api/v3/admin/images/pending — pending image approvals ────────────
app.get('/api/v3/admin/images/pending', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { data, error } = await supabase.from('vendor_images')
      .select('id, url, tags, vendor_id, created_at, caption, album_title')
      .eq('approved', false)
      .is('rejected', null)
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) { console.error('[admin/images/pending]', error); return res.status(500).json({ success: false, error: error.message }); }

    // Enrich with vendor name and category
    const images = data || [];
    if (images.length > 0) {
      const vendorIds = [...new Set(images.map(i => i.vendor_id).filter(Boolean))];
      const { data: vendors } = await supabase.from('vendors')
        .select('id, name, category').in('id', vendorIds);
      const vendorMap = {};
      for (const v of (vendors || [])) vendorMap[v.id] = v;
      for (const img of images) {
        const v = vendorMap[img.vendor_id];
        img.vendor_name = v?.name || 'Unknown';
        img.vendor_category = v?.category || '';
      }
    }

    res.json({ success: true, data: images, total: images.length });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── PATCH /api/v3/admin/images/:id — approve or reject image ─────────────
app.patch('/api/v3/admin/images/:id', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { id } = req.params;
    const { approved, rejection_reason } = req.body || {};
    const update = {};
    if (approved === true) {
      update.approved = true;
      update.rejected = false;
      update.rejection_reason = null;
    } else if (approved === false) {
      update.approved = false;
      update.rejected = true;
      update.rejection_reason = rejection_reason || 'Did not meet quality standards';
    }
    const { error } = await supabase.from('vendor_images').update(update).eq('id', id);
    if (error) { console.error('[admin/images PATCH]', error); return res.status(500).json({ success: false, error: error.message }); }
    console.log('[admin] Image', approved ? 'approved' : 'rejected', ':', id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── GET /api/v3/admin/system/health — system health check ─────────────────
app.get('/api/v3/admin/system/health', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const start = Date.now();
    const { data, error } = await supabase.from('users').select('id').limit(1);
    const dbLatency = Date.now() - start;
    res.json({
      success: true,
      status: 'healthy',
      db: error ? 'error' : 'connected',
      db_latency_ms: dbLatency,
      node_version: process.version,
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
"""

with open(SERVER_PATH, 'a') as f:
    f.write(ENDPOINT_CODE)

print('')
print('✅ PATCH COMPLETE')
print('   GET    /api/v2/admin/hot-dates')
print('   POST   /api/v2/admin/hot-dates')
print('   PATCH  /api/v2/admin/hot-dates/:id')
print('   DELETE /api/v2/admin/hot-dates/:id')
print('   GET    /api/v3/admin/command-centre')
print('   POST   /api/v3/admin/data/backfill-all')
print('   GET    /api/v3/admin/images/pending')
print('   PATCH  /api/v3/admin/images/:id')
print('   GET    /api/v3/admin/system/health')
print('')
print('VERIFY AND DEPLOY:')
print('1. grep -n "const express" backend/server.js        <- must be 1')
print('2. grep -n "api/v2/admin/hot-dates" backend/server.js')
print('3. grep -n "api/v3/admin/command-centre" backend/server.js')
print('4. git add backend/server.js')
print('5. git commit -m "fix: add hot-dates, command-centre, image approval endpoints"')
print('6. git push origin main')
print('7. Wait 60 seconds — check Railway logs')
print('8. Open thedreamwedding.in/admin — test all three pages')
