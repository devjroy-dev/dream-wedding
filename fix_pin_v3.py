#!/usr/bin/env python3
"""
Simple patch:
1. Fix cover-photos — remove is_active filter, read from cover_photos table correctly
2. Add pin-status — appended right after cover-photos handler (same block, both work)
Run from /workspaces/dream-wedding
"""
import sys, subprocess

FILE = 'backend/server.js'

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

NEW_COVER_AND_PIN = """app.get('/api/v2/cover-photos', async (req, res) => {
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
});

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
});"""

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

if '/api/v2/auth/pin-status' in content:
    print("pin-status already exists — skipping")
    sys.exit(0)

count = content.count(OLD_COVER)
if count == 0:
    print("ERROR: cover-photos handler not found — check if already patched")
    sys.exit(1)
if count > 1:
    print(f"ERROR: {count} matches — expected 1")
    sys.exit(1)

content = content.replace(OLD_COVER, NEW_COVER_AND_PIN)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

# Syntax check
result = subprocess.run(['node', '--check', FILE], capture_output=True, text=True)
if result.returncode != 0:
    print("ERROR: Syntax check failed:")
    print(result.stderr)
    sys.exit(1)

print("✓ cover-photos fixed (no is_active filter)")
print("✓ pin-status endpoint added")
print("✓ Syntax check passed")
print("Safe to commit.")
