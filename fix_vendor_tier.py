"""
HOTFIX — vendors.tier column does not exist
Repo: dream-wedding

Railway log shows:
  [v2 vendor OTP] Insert failed: column vendors.tier does not exist
  
The verify-otp upsert tried to select/insert 'tier' column which doesn't
exist in the vendors table. This caused the insert to fail, which then
caused a delay, which caused the Twilio verification to expire.

Fix: remove 'tier' from all selects and inserts in vendor/auth/verify-otp.

Run from: /workspaces/dream-wedding
Command:  python3 fix_vendor_tier.py
"""

with open('backend/server.js', 'r') as f:
    src = f.read()

changes = []

replacements = [
    (
        "supabase.from('vendors').select('id, name, phone, pin_set, category, tier').eq('phone', fullPhone).maybeSingle();",
        "supabase.from('vendors').select('id, name, phone, pin_set, category').eq('phone', fullPhone).maybeSingle();"
    ),
    (
        "supabase.from('vendors').select('id, name, phone, pin_set, category, tier').eq('phone', bare).maybeSingle();",
        "supabase.from('vendors').select('id, name, phone, pin_set, category').eq('phone', bare).maybeSingle();"
    ),
    (
        "supabase.from('vendors').select('id, name, phone, pin_set, category, tier').ilike('phone', '%' + bare.slice(-9)).maybeSingle();",
        "supabase.from('vendors').select('id, name, phone, pin_set, category').ilike('phone', '%' + bare.slice(-9)).maybeSingle();"
    ),
    (
        """      const { data: newVendor, error: insertErr } = await supabase.from('vendors').insert([{
        phone: fullPhone,
        created_at: new Date().toISOString(),
        pin_set: false,
      }]).select('id, name, phone, pin_set, category, tier').single();""",
        """      const { data: newVendor, error: insertErr } = await supabase.from('vendors').insert([{
        phone: fullPhone,
        created_at: new Date().toISOString(),
      }]).select('id, name, phone, pin_set, category').single();"""
    ),
    (
        "res.json({ success: true, vendor: { id: vendor.id, name: vendor.name, phone: vendor.phone, pin_set: !!vendor.pin_set, category: vendor.category, tier: vendor.tier } });",
        "res.json({ success: true, vendor: { id: vendor.id, name: vendor.name, phone: vendor.phone, pin_set: !!vendor.pin_set, category: vendor.category } });"
    ),
]

for old, new in replacements:
    if old in src:
        src = src.replace(old, new)
        changes.append(f'✓ Fixed: {old[:60].strip()!r}')
    elif new in src:
        changes.append(f'✓ Already fixed: {new[:60].strip()!r}')

with open('backend/server.js', 'w') as f:
    f.write(src)

import subprocess
r = subprocess.run(['node', '--check', 'backend/server.js'], capture_output=True, text=True)
changes.append('✓ Syntax OK' if r.returncode == 0 else '✗ ' + r.stderr[:100])

print('\nVendor tier column fix\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Hotfix: remove tier column from vendor verify-otp — column does not exist" && git push')
