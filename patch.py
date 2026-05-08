#!/usr/bin/env python3
"""
ZIP 12 — patch.py — Discover Heroes backend routes
Run from: /workspaces/dream-wedding/
Usage:    python3 patch.py
Then:     node --check backend/server.js && git add -A && git commit -m "ZIP 12 — discover heroes endpoints" && git push

Holy Grail schema (section 6.1):
  discover_heroes: id, image_url, caption, category_tag, cta_url,
                   sort_order, visible_from, visible_to, is_active, created_at

Protocol (section 5.4):
  - assert content.count(old) == 1  before every replacement
  - node --check before push
  - never replace server.js wholesale
"""

import sys, os

SERVER = os.path.join(os.path.dirname(__file__), 'backend', 'server.js')

with open(SERVER, 'r') as f:
    content = f.read()

print(f"Read {SERVER} ({len(content)} chars)")

# ─── STEP 1 — Supabase migration reminder ─────────────────────────────────────
# Run this in Supabase SQL editor on project nqcdfzbvlrcrjineoudp BEFORE
# deploying these routes. The routes will 500 if the table doesn't exist.
#
# CREATE TABLE IF NOT EXISTS discover_heroes (
#   id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
#   image_url     text NOT NULL,
#   caption       text,
#   category_tag  text,
#   cta_url       text,
#   sort_order    int  NOT NULL DEFAULT 1,
#   visible_from  timestamptz,
#   visible_to    timestamptz,
#   is_active     boolean NOT NULL DEFAULT true,
#   created_at    timestamptz NOT NULL DEFAULT now()
# );
# CREATE INDEX IF NOT EXISTS discover_heroes_active_sort
#   ON discover_heroes (is_active, sort_order);
#
# Note: No vendor_id — heroes are editorial placements, not vendor rows.
# ──────────────────────────────────────────────────────────────────────────────

# ─── STEP 2 — Find a reliable anchor in server.js ─────────────────────────────
# We look for the existing exploring-photos public route to anchor our insert.
# If your server.js structure differs, search for a stable nearby route.

ANCHOR = "app.get('/api/v2/exploring-photos'"

if content.count(ANCHOR) != 1:
    print(f"ERROR: anchor '{ANCHOR}' appears {content.count(ANCHOR)} times. Aborting.")
    sys.exit(1)

# ─── STEP 3 — The new routes block ────────────────────────────────────────────
# Inserted immediately BEFORE the exploring-photos route.
# Visibility filter: visible_from/visible_to respect date ranges set in admin.
# The admin read route (GET /api/v2/admin/discover-heroes) returns ALL rows
# including inactive ones so the admin page can toggle them.

NEW_ROUTES = """
// ─── Discover Heroes ─────────────────────────────────────────────────────────
// Admin-managed carousel (up to 5 active slots) for the Frost Discover canvas.
// Schema: discover_heroes (id, image_url, caption, category_tag, cta_url,
//          sort_order, visible_from, visible_to, is_active, created_at)

// GET /api/v2/discover-heroes — public, unauthenticated (read by Frost native)
app.get('/api/v2/discover-heroes', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('discover_heroes')
      .select('id, image_url, caption, category_tag, cta_url, sort_order')
      .eq('is_active', true)
      .or(`visible_from.is.null,visible_from.lte.${now}`)
      .or(`visible_to.is.null,visible_to.gte.${now}`)
      .order('sort_order', { ascending: true })
      .limit(5);
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[discover-heroes GET]', err.message);
    res.status(500).json({ success: false, data: [], error: err.message });
  }
});

// GET /api/v2/admin/discover-heroes — admin read (all rows, includes inactive)
app.get('/api/v2/admin/discover-heroes', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('discover_heroes')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[admin/discover-heroes GET]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v2/admin/discover-heroes — create hero
app.post('/api/v2/admin/discover-heroes', requireAdmin, async (req, res) => {
  try {
    const { image_url, caption, category_tag, cta_url,
            sort_order, visible_from, visible_to, is_active } = req.body;
    if (!image_url) return res.status(400).json({ success: false, error: 'image_url required' });
    const { data, error } = await supabase
      .from('discover_heroes')
      .insert({
        image_url,
        caption:      caption      || null,
        category_tag: category_tag || null,
        cta_url:      cta_url      || null,
        sort_order:   sort_order   || 1,
        visible_from: visible_from || null,
        visible_to:   visible_to   || null,
        is_active:    is_active !== false,
      })
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('[admin/discover-heroes POST]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v2/admin/discover-heroes/:id — update (caption, sort_order, active, url, etc.)
app.put('/api/v2/admin/discover-heroes/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['image_url', 'caption', 'category_tag', 'cta_url',
                     'sort_order', 'visible_from', 'visible_to', 'is_active'];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }
    const { data, error } = await supabase
      .from('discover_heroes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('[admin/discover-heroes PUT]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v2/admin/discover-heroes/:id
app.delete('/api/v2/admin/discover-heroes/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('discover_heroes')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[admin/discover-heroes DELETE]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v2/admin/discover-heroes/upload — multipart upload → cover-photos bucket
// Uses the same multer + Supabase Storage pattern as cover-photos upload.
// File goes to cover-photos/heroes/ subfolder (no new bucket needed).
app.post('/api/v2/admin/discover-heroes/upload', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file received' });
    const ext = (req.file.originalname || 'photo.jpg').split('.').pop() || 'jpg';
    const fileName = `heroes/hero_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('cover-photos')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype || 'image/jpeg',
        cacheControl: '31536000',
        upsert: false,
      });
    if (uploadError) throw uploadError;
    const { data: pub } = supabase.storage.from('cover-photos').getPublicUrl(fileName);
    res.json({ success: true, url: pub.publicUrl });
  } catch (err) {
    console.error('[admin/discover-heroes upload]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

"""

# ─── STEP 4 — Apply the patch ─────────────────────────────────────────────────

old = ANCHOR
new = NEW_ROUTES + ANCHOR

assert content.count(old) == 1, f"Anchor appears {content.count(old)} times — aborting"
content = content.replace(old, new)

# ─── STEP 5 — Verify the exploring-photos anchor still present after patch ────
assert content.count(ANCHOR) == 1, "Anchor duplicated after replacement — aborting"

# ─── STEP 6 — Verify all six new routes are present ──────────────────────────
checks = [
    "app.get('/api/v2/discover-heroes'",
    "app.get('/api/v2/admin/discover-heroes'",
    "app.post('/api/v2/admin/discover-heroes'",
    "app.put('/api/v2/admin/discover-heroes/:id'",
    "app.delete('/api/v2/admin/discover-heroes/:id'",
    "app.post('/api/v2/admin/discover-heroes/upload'",
]
for check in checks:
    assert content.count(check) == 1, f"Route missing or duplicated: {check}"

# ─── STEP 7 — Write ───────────────────────────────────────────────────────────
with open(SERVER, 'w') as f:
    f.write(content)

print(f"Patched successfully. server.js is now {len(content)} chars.")
print()
print("NEXT STEPS:")
print("  1. Run the Supabase SQL migration (see comment at top of this file)")
print("  2. node --check backend/server.js")
print("  3. git add -A && git commit -m 'ZIP 12 — discover heroes endpoints' && git push")
print()
print("VERIFY after Railway redeploy:")
print("  curl https://dream-wedding-production-89ae.up.railway.app/api/v2/discover-heroes")
print("  # Expected: { success: true, data: [] }  (empty until admin adds heroes)")
