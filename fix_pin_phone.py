#!/usr/bin/env python3
"""
Fix pin-status endpoint — phone lookup was using wrong Supabase .or() syntax.
Phone is stored as +91XXXXXXXXXX in users table and vendors table.
Run from /workspaces/dream-wedding
"""
import sys, subprocess

FILE = 'backend/server.js'

OLD = """app.get('/api/v2/auth/pin-status', async (req, res) => {
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

NEW = """app.get('/api/v2/auth/pin-status', async (req, res) => {
  try {
    const { phone, role } = req.query;
    if (!phone || !role) return res.status(400).json({ found: false, error: 'phone and role required' });
    const bare = String(phone).replace(/\\D/g, '').slice(-10);
    const fullPhone = '+91' + bare;
    if (role === 'vendor') {
      const { data } = await supabase
        .from('vendors')
        .select('id, pin, phone')
        .eq('phone', fullPhone)
        .maybeSingle();
      if (!data) return res.json({ found: false, userId: null, pin_set: false });
      return res.json({ found: true, userId: data.id, pin_set: !!(data.pin) });
    } else {
      const { data } = await supabase
        .from('users')
        .select('id, pin, name, phone')
        .eq('phone', fullPhone)
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

count = content.count(OLD)
if count == 0:
    print("ERROR: pin-status handler not found.")
    sys.exit(1)
if count > 1:
    print(f"ERROR: {count} matches — expected 1.")
    sys.exit(1)

content = content.replace(OLD, NEW)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

result = subprocess.run(['node', '--check', FILE], capture_output=True, text=True)
if result.returncode != 0:
    print("ERROR: Syntax check failed:")
    print(result.stderr)
    sys.exit(1)

print("✓ pin-status phone lookup fixed — uses +91 prefix, eq() not or()")
print("✓ Syntax check passed")
print("Safe to commit.")
