"""
BACKEND FIX — verify-pin returns full vendor/user details
Repo: dream-wedding

Currently verify-pin only selects 'id, pin_hash, pin_set' and returns
{ success: true, userId }. This means pin-login can't store vendorName,
category, tier in the session, so the today page shows "Good morning, Maker".

Fix: select full vendor record and return name, category, tier, phone.

Run from: /workspaces/dream-wedding
Command:  python3 fix_verify_pin.py
"""

with open('backend/server.js', 'r') as f:
    src = f.read()

changes = []

# Fix verify-pin to select and return full vendor details
OLD = """    if (phone) {
      const bare = phone.replace(/\\D/g, '').slice(-10);
      const full = '+91' + bare;
      const { data: d1 } = await supabase.from(table).select('id, pin_hash, pin_set').eq('phone', full).maybeSingle();
      if (d1) data = d1;
      if (!data) {
        const { data: d2 } = await supabase.from(table).select('id, pin_hash, pin_set').eq('phone', bare).maybeSingle();
        if (d2) data = d2;
      }
    }
    if (!data && userId) {
      const { data: d3 } = await supabase.from(table).select('id, pin_hash, pin_set').eq('id', userId).maybeSingle();
      if (d3) data = d3;
    }
    const error = null;
    if (error) throw error;
    if (!data || !data.pin_set || !data.pin_hash) return res.status(400).json({ success: false, error: 'PIN not set' });
    const match = await bcrypt.compare(pin, data.pin_hash);
    if (!match) return res.status(400).json({ success: false, error: 'Incorrect PIN' });
    res.json({ success: true, userId: data.id });"""

NEW = """    const fields = role === 'vendor'
      ? 'id, pin_hash, pin_set, name, category, tier, phone'
      : 'id, pin_hash, pin_set, name, phone, dreamer_type';
    if (phone) {
      const bare = phone.replace(/\\D/g, '').slice(-10);
      const full = '+91' + bare;
      const { data: d1 } = await supabase.from(table).select(fields).eq('phone', full).maybeSingle();
      if (d1) data = d1;
      if (!data) {
        const { data: d2 } = await supabase.from(table).select(fields).eq('phone', bare).maybeSingle();
        if (d2) data = d2;
      }
    }
    if (!data && userId) {
      const { data: d3 } = await supabase.from(table).select(fields).eq('id', userId).maybeSingle();
      if (d3) data = d3;
    }
    if (!data || !data.pin_set || !data.pin_hash) return res.status(400).json({ success: false, error: 'PIN not set' });
    const match = await bcrypt.compare(pin, data.pin_hash);
    if (!match) return res.status(400).json({ success: false, error: 'Incorrect PIN' });
    res.json({
      success: true,
      userId: data.id,
      name: data.name || null,
      category: data.category || null,
      tier: data.tier || null,
      phone: data.phone || null,
      dreamer_type: data.dreamer_type || null,
    });"""

if OLD in src:
    src = src.replace(OLD, NEW)
    changes.append('✓ verify-pin returns full vendor/user details')
else:
    changes.append('✗ verify-pin pattern not found')

with open('backend/server.js', 'w') as f:
    f.write(src)

import subprocess
r = subprocess.run(['node', '--check', 'backend/server.js'], capture_output=True, text=True)
changes.append('✓ Syntax OK' if r.returncode == 0 else '✗ ' + r.stderr[:100])

print('\nBackend verify-pin fix\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Fix: verify-pin returns full vendor details — name, category, tier" && git push')
