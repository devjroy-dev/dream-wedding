"""
BACKEND FIX — vendor/auth/verify-otp upserts on first login
Repo: dream-wedding

Current: verify-otp looks up vendor by phone, returns 404 if not found.
Problem: vendor 9888294440 may not be in vendors table (created via different path),
         or phone format mismatch (stored without +91).

Fix 1: verify-otp — try all phone formats (+91, bare, with spaces)
Fix 2: verify-otp — if still not found, CREATE the vendor record (upsert on first Twilio login)
Fix 3: pin-status — same robust phone lookup

Run from: /workspaces/dream-wedding
Command:  python3 fix_vendor_otp_upsert.py
"""

with open('backend/server.js', 'r') as f:
    src = f.read()

changes = []

# Fix vendor/auth/verify-otp — upsert if not found
OLD_VERIFY = """    const fullPhone = '+91' + bare;
    // Look up vendor by phone
    let vendor = null;
    const { data: v1 } = await supabase.from('vendors').select('id, name, phone, pin_set, category, tier').eq('phone', fullPhone).maybeSingle();
    if (v1) vendor = v1;
    if (!vendor) {
      const { data: v2 } = await supabase.from('vendors').select('id, name, phone, pin_set, category, tier').eq('phone', bare).maybeSingle();
      if (v2) vendor = v2;
    }
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'No vendor account found for this number.' });
    }
    res.json({ success: true, vendor: { id: vendor.id, name: vendor.name, phone: vendor.phone, pin_set: !!vendor.pin_set, category: vendor.category, tier: vendor.tier } });"""

NEW_VERIFY = """    const fullPhone = '+91' + bare;
    // Look up vendor by phone — try all formats
    let vendor = null;
    const { data: v1 } = await supabase.from('vendors').select('id, name, phone, pin_set, category, tier').eq('phone', fullPhone).maybeSingle();
    if (v1) vendor = v1;
    if (!vendor) {
      const { data: v2 } = await supabase.from('vendors').select('id, name, phone, pin_set, category, tier').eq('phone', bare).maybeSingle();
      if (v2) vendor = v2;
    }
    if (!vendor) {
      // Try with spaces or alternate formats
      const { data: v3 } = await supabase.from('vendors').select('id, name, phone, pin_set, category, tier').ilike('phone', '%' + bare.slice(-9)).maybeSingle();
      if (v3) vendor = v3;
    }
    if (!vendor) {
      // Vendor verified via Twilio but not in DB — create record now
      console.log('[v2 vendor OTP] Vendor not found, creating record for', fullPhone);
      const { data: newVendor, error: insertErr } = await supabase.from('vendors').insert([{
        phone: fullPhone,
        created_at: new Date().toISOString(),
        pin_set: false,
      }]).select('id, name, phone, pin_set, category, tier').single();
      if (insertErr) {
        console.error('[v2 vendor OTP] Insert failed:', insertErr.message);
        return res.status(404).json({ success: false, error: 'No vendor account found. Please sign up via invite.' });
      }
      vendor = newVendor;
    }
    res.json({ success: true, vendor: { id: vendor.id, name: vendor.name, phone: vendor.phone, pin_set: !!vendor.pin_set, category: vendor.category, tier: vendor.tier } });"""

if OLD_VERIFY in src:
    src = src.replace(OLD_VERIFY, NEW_VERIFY)
    changes.append('✓ vendor/verify-otp: robust phone lookup + upsert on first login')
else:
    changes.append('✗ vendor verify-otp pattern not found')

# Fix pin-status — also try ilike for phone format variants
OLD_PINSTATUS = """      if (phone) {
      const bare = phone.replace(/\\D/g, '').slice(-10);
      const full = '+91' + bare;
      const { data: d1 } = await supabase.from(table).select('id, pin_set').eq('phone', full).maybeSingle();
      if (d1) return res.json({ success: true, pin_set: !!d1.pin_set, userId: d1.id });
      const { data: d2 } = await supabase.from(table).select('id, pin_set').eq('phone', bare).maybeSingle();
      if (d2) return res.json({ success: true, pin_set: !!d2.pin_set, userId: d2.id });
      return res.json({ success: true, pin_set: false, userId: null, found: false });
    }"""

NEW_PINSTATUS = """      if (phone) {
      const bare = phone.replace(/\\D/g, '').slice(-10);
      const full = '+91' + bare;
      const { data: d1 } = await supabase.from(table).select('id, pin_set').eq('phone', full).maybeSingle();
      if (d1) return res.json({ success: true, pin_set: !!d1.pin_set, userId: d1.id });
      const { data: d2 } = await supabase.from(table).select('id, pin_set').eq('phone', bare).maybeSingle();
      if (d2) return res.json({ success: true, pin_set: !!d2.pin_set, userId: d2.id });
      // Try partial match for any formatting variant
      const { data: d3 } = await supabase.from(table).select('id, pin_set').ilike('phone', '%' + bare.slice(-9)).maybeSingle();
      if (d3) return res.json({ success: true, pin_set: !!d3.pin_set, userId: d3.id });
      return res.json({ success: true, pin_set: false, userId: null, found: false });
    }"""

if OLD_PINSTATUS in src:
    src = src.replace(OLD_PINSTATUS, NEW_PINSTATUS)
    changes.append('✓ pin-status: ilike fallback for phone format variants')
else:
    changes.append('✗ pin-status pattern not found')

with open('backend/server.js', 'w') as f:
    f.write(src)

import subprocess
r = subprocess.run(['node', '--check', 'backend/server.js'], capture_output=True, text=True)
changes.append('✓ Syntax OK' if r.returncode == 0 else '✗ ' + r.stderr[:150])

print('\nVendor OTP upsert fix\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Fix: vendor verify-otp upserts on first login, robust phone lookup" && git push')
