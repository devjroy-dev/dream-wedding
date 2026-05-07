#!/usr/bin/env python3
"""
Two fixes:
1. Add GET /api/v2/auth/pin-status endpoint — required for login flow
2. Fix cover-photos endpoint to not filter on is_active (field may be null)
Run from /workspaces/dream-wedding
"""
import sys

FILE = 'backend/server.js'

# ── Fix 1: cover-photos — remove is_active filter ────────────────────────────

OLD_COVER = """app.get('/api/v2/cover-photos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cover_photos')
      .select('id, image_url, photographer_name, vendor_id, display_order, is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) throw error;
    const photos = (data || []).map(p => ({ id: p.id, image_url: p.image_url }));
    res.json({ success: true, photos });
  } catch (error) {
    console.error('[GET /api/v2/cover-photos] error:', error.message);
    res.json({ success: true, photos: [] });
  }
});"""

NEW_COVER = """app.get('/api/v2/cover-photos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cover_photos')
      .select('id, image_url, display_order')
      .order('display_order', { ascending: true });
    if (error) throw error;
    const photos = (data || []).map(p => ({ id: p.id, image_url: p.image_url }));
    res.json({ success: true, photos });
  } catch (error) {
    console.error('[GET /api/v2/cover-photos] error:', error.message);
    res.json({ success: true, photos: [] });
  }
});"""

# ── Fix 2: pin-status endpoint — append before app.listen ────────────────────

PIN_STATUS_ENDPOINT = """
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v2/auth/pin-status
// Used by login screen to check if user exists and has a PIN set.
// Query params: phone (10 digits), role ('couple' | 'vendor')
// Returns: { found, userId, pin_set }
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/v2/auth/pin-status', async (req, res) => {
  try {
    const { phone, role } = req.query;
    if (!phone || !role) return res.status(400).json({ found: false, error: 'phone and role required' });

    const bare = String(phone).replace(/\\D/g, '').slice(-10);

    if (role === 'vendor') {
      const { data } = await supabase
        .from('vendors')
        .select('id, pin, phone')
        .or(`phone.eq.${bare},phone.eq.+91${bare},phone.eq.91${bare}`)
        .maybeSingle();
      if (!data) return res.json({ found: false, userId: null, pin_set: false });
      return res.json({ found: true, userId: data.id, pin_set: !!(data.pin) });
    } else {
      const { data } = await supabase
        .from('users')
        .select('id, pin, name, phone')
        .or(`phone.eq.${bare},phone.eq.+91${bare},phone.eq.91${bare}`)
        .maybeSingle();
      if (!data) return res.json({ found: false, userId: null, pin_set: false });
      return res.json({ found: true, userId: data.id, pin_set: !!(data.pin), name: data.name });
    }
  } catch (error) {
    console.error('[GET /api/v2/auth/pin-status] error:', error.message);
    res.status(500).json({ found: false, error: error.message });
  }
});
"""

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Apply cover-photos fix
count = content.count(OLD_COVER)
if count == 0:
    print("ERROR: cover-photos handler not found — may already be patched differently.")
    sys.exit(1)
content = content.replace(OLD_COVER, NEW_COVER)
print("✓ cover-photos endpoint patched — is_active filter removed")

# Append pin-status endpoint before app.listen
if '/api/v2/auth/pin-status' in content:
    print("✓ pin-status endpoint already exists — skipping append")
else:
    # Find app.listen and insert before it
    listen_marker = 'app.listen('
    idx = content.rfind(listen_marker)
    if idx == -1:
        print("ERROR: app.listen not found — cannot insert pin-status endpoint.")
        sys.exit(1)
    content = content[:idx] + PIN_STATUS_ENDPOINT + '\n' + content[idx:]
    print("✓ pin-status endpoint added")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done.")
