"""
PHASE 9 — Backend patch
Repo: dream-wedding

Changes:
  1. Expand POST /api/v2/waitlist — accept full fields from new landing page
     (name, phone, instagram, role, category, category_other,
      wedding_date, wedding_date_season, wedding_date_status)
     Upserts on phone so the 60-second edit window works.
  2. Add GET /api/v2/preview-vendors — returns up to 10 curated vendors
     for the "Just Exploring" blind swipe preview on the landing page.
     Reads from preview_vendors table (vendor_id + display_order).
  3. Add POST /api/v2/admin/preview-vendors — set the 10 preview vendor slots.
     Admin portal calls this to curate which vendors appear in the preview.

Run from: /workspaces/dream-wedding
Command:  python3 phase9_backend.py
"""

PATH = 'backend/server.js'
with open(PATH, 'r') as f:
    src = f.read()

original = src
changes = []

# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 1 — Expand POST /api/v2/waitlist
# The current endpoint only takes phone, instagram, role.
# The new landing page sends name, category, wedding details too.
# Upsert on phone so the 60-second edit window can overwrite a just-submitted entry.
# ─────────────────────────────────────────────────────────────────────────────
OLD_WAITLIST = """app.post('/api/v2/waitlist', async (req, res) => {
  try {
    const { phone, instagram, role } = req.body;
    const { error } = await supabase
      .from('waitlist')
      .insert([{ phone, instagram, role }]);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Waitlist error:', err);
    res.status(500).json({ error: 'Failed to submit' });
  }
});"""

NEW_WAITLIST = """app.post('/api/v2/waitlist', async (req, res) => {
  // Full waitlist upsert — accepts all fields from the new landing page.
  // Upserts on phone so the 60-second edit window can overwrite a submission.
  try {
    const {
      phone, instagram, role,
      name,
      category, category_other,
      wedding_date, wedding_date_season, wedding_date_status,
    } = req.body;

    if (!phone) return res.status(400).json({ success: false, error: 'phone required' });

    // Normalise phone to last 10 digits for consistent upsert key
    const cleanPhone = String(phone).replace(/\\D/g, '').slice(-10);
    if (cleanPhone.length < 10) return res.status(400).json({ success: false, error: 'invalid phone' });

    const payload = {
      phone: cleanPhone,
      instagram: instagram || null,
      role: role || 'dreamer',
      name: name || null,
      category: category || null,
      category_other: category_other || null,
      wedding_date: wedding_date || null,
      wedding_date_season: wedding_date_season || null,
      wedding_date_status: wedding_date_status || null,
      source: 'landing',
      updated_at: new Date().toISOString(),
    };

    // Upsert on phone — overwrites if same phone submits again (edit window)
    const { error } = await supabase
      .from('waitlist')
      .upsert([payload], { onConflict: 'phone', ignoreDuplicates: false });

    if (error) {
      // If upsert fails (e.g. column doesn't exist yet), fall back to insert
      const { error: insertErr } = await supabase
        .from('waitlist')
        .insert([{ phone: cleanPhone, instagram: instagram || null, role: role || 'dreamer', name: name || null }]);
      if (insertErr) throw insertErr;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[waitlist] error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to submit' });
  }
});"""

if OLD_WAITLIST in src:
    src = src.replace(OLD_WAITLIST, NEW_WAITLIST)
    changes.append('✓ Change 1: POST /api/v2/waitlist expanded — full fields, upsert on phone')
else:
    changes.append('✗ Change 1 FAILED — waitlist pattern not found')

# ─────────────────────────────────────────────────────────────────────────────
# CHANGE 2 — Preview vendors endpoints
# GET  /api/v2/preview-vendors — landing page calls this for "Just Exploring"
# POST /api/v2/admin/preview-vendors — admin portal sets which 10 vendors show
# GET  /api/v2/admin/preview-vendors — admin reads current slots
#
# Reads/writes preview_vendors table (vendor_id, display_order).
# Falls back gracefully if the table doesn't exist yet (SQL file handles that).
# The GET endpoint returns full vendor cards (same shape as the discovery feed).
# ─────────────────────────────────────────────────────────────────────────────
OLD_MARKER = """// ── SESSION 17: Razorpay + Vendor Today + Vendor Clients ──────────────────────"""

NEW_PREVIEW = """// ─── Landing page preview vendors ────────────────────────────────────────────
// "Just Exploring" path on the landing page shows 10 curated vendor cards
// in the blind swipe feed before the couple signs up.
// Admin controls which 10 vendors appear via the admin portal.

// GET /api/v2/preview-vendors — called by landing page
app.get('/api/v2/preview-vendors', async (req, res) => {
  try {
    // Get the 10 curated vendor IDs in display order
    const { data: slots, error: slotErr } = await supabase
      .from('preview_vendors')
      .select('vendor_id, display_order')
      .order('display_order', { ascending: true })
      .limit(10);

    if (slotErr || !slots || slots.length === 0) {
      // Fallback: return up to 10 live approved vendors if no curation set yet
      const { data: fallback } = await supabase
        .from('vendors')
        .select('id, name, category, city, featured_photos, portfolio_images, starting_price, vibe_tags, about, rating')
        .eq('is_approved', true)
        .eq('discover_listed', true)
        .eq('subscription_active', true)
        .limit(10);
      return res.json({ success: true, data: fallback || [], is_fallback: true });
    }

    // Fetch full vendor data for each curated slot
    const ids = slots.map(s => s.vendor_id);
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, name, category, city, featured_photos, portfolio_images, starting_price, vibe_tags, about, rating')
      .in('id', ids);

    if (!vendors) return res.json({ success: true, data: [], is_fallback: false });

    // Return in display_order
    const lookup = Object.fromEntries(vendors.map(v => [v.id, v]));
    const ordered = slots.map(s => lookup[s.vendor_id]).filter(Boolean);

    res.json({ success: true, data: ordered, is_fallback: false });
  } catch (err) {
    console.error('[preview-vendors] error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v2/admin/preview-vendors — admin reads current curation
app.get('/api/v2/admin/preview-vendors', adminAuth, async (req, res) => {
  try {
    const { data: slots } = await supabase
      .from('preview_vendors')
      .select('vendor_id, display_order')
      .order('display_order', { ascending: true });

    if (!slots || slots.length === 0) return res.json({ success: true, data: [] });

    const ids = slots.map(s => s.vendor_id);
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, name, category, city, featured_photos, tier')
      .in('id', ids);

    const lookup = Object.fromEntries((vendors || []).map(v => [v.id, v]));
    const enriched = slots.map(s => ({ ...lookup[s.vendor_id], display_order: s.display_order })).filter(v => v.id);
    res.json({ success: true, data: enriched });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/v2/admin/preview-vendors — admin sets the 10 preview slots
// Body: { vendor_ids: ['uuid1', 'uuid2', ...] } — ordered array, max 10
app.post('/api/v2/admin/preview-vendors', adminAuth, async (req, res) => {
  try {
    const { vendor_ids } = req.body || {};
    if (!Array.isArray(vendor_ids)) {
      return res.status(400).json({ success: false, error: 'vendor_ids array required' });
    }
    const ids = vendor_ids.slice(0, 10); // enforce max 10

    // Clear existing and insert new slots
    await supabase.from('preview_vendors').delete().neq('vendor_id', '00000000-0000-0000-0000-000000000000');
    if (ids.length > 0) {
      const rows = ids.map((vendor_id, i) => ({ vendor_id, display_order: i + 1 }));
      const { error } = await supabase.from('preview_vendors').insert(rows);
      if (error) throw error;
    }

    logActivity('admin_preview_vendors_updated', `Preview vendors updated: ${ids.length} slots`);
    res.json({ success: true, count: ids.length });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── SESSION 17: Razorpay + Vendor Today + Vendor Clients ──────────────────────"""

if OLD_MARKER in src:
    src = src.replace(OLD_MARKER, NEW_PREVIEW)
    changes.append('✓ Change 2: Preview vendors endpoints added (GET public + GET/POST admin)')
else:
    changes.append('✗ Change 2 FAILED — session 17 marker not found')

# Write
if src != original:
    with open(PATH, 'w') as f:
        f.write(src)

print('\nPhase 9 — Backend patch complete\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Phase 9: waitlist expanded, preview vendors endpoints" && git push')
print('\nThen run phase9_frontend.py from /workspaces/tdw-2')
print('Also run phase9.sql in Supabase SQL editor')
