#!/usr/bin/env python3
"""
Fixed patch:
1. Fix cover-photos endpoint — remove is_active filter
2. Add pin-status endpoint — inserted BEFORE the cover-photos handler
   (safe anchor guaranteed to be before app.listen)
Run from /workspaces/dream-wedding
"""
import sys

FILE = 'backend/server.js'

# ── Fix 1 + 2 combined: replace cover-photos handler with pin-status + fixed cover-photos ──

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

NEW_BOTH = """app.get('/api/v2/auth/pin-status', async (req, res) => {
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

app.get('/api/v2/cover-photos', async (req, res) => {
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

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Verify pin-status not already present
if '/api/v2/auth/pin-status' in content:
    print("pin-status already exists — skipping")
else:
    count = content.count(OLD_COVER)
    if count == 0:
        print("ERROR: cover-photos handler not found.")
        sys.exit(1)
    if count > 1:
        print(f"ERROR: {count} matches found — expected 1.")
        sys.exit(1)
    content = content.replace(OLD_COVER, NEW_BOTH)
    print("✓ pin-status endpoint added + cover-photos is_active filter removed")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

# Verify app.listen comes AFTER our new handlers
pin_pos = content.find('/api/v2/auth/pin-status')
listen_pos = content.rfind('app.listen(')
if listen_pos > 0 and pin_pos > listen_pos:
    print("ERROR: pin-status is AFTER app.listen — abort and revert!")
    sys.exit(1)

print(f"✓ Position check passed — pin-status at char {pin_pos}, app.listen at char {listen_pos}")
print("Done.")
