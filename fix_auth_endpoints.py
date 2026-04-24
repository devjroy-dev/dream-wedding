"""
BACKEND FIXES — Auth endpoints
Repo: dream-wedding

Fix 1: couple/auth/verify-otp — add pin_set to response
  Currently returns { user: { id, name, phone } } with no pin_set.
  Frontend assumes pin_set=false and always redirects to /couple/pin (set PIN).
  Fix: add pin_set to the user lookup and return it.

Fix 2: pin-status — return null userId clearly when not found
  Currently the bare-phone fallback returns even when d2 is null:
  { success: true, pin_set: false, userId: undefined }
  Frontend checks !d.userId which should catch this, but undefined is falsy.
  Fix: explicitly return { success: true, found: false } when not found.

Run from: /workspaces/dream-wedding
Command:  python3 fix_auth_endpoints.py
"""

with open('backend/server.js', 'r') as f:
    src = f.read()

changes = []

# Fix 1: couple verify-otp — add pin_set to select and response
OLD_COUPLE_VERIFY = """    // Look up user in users table by phone
    const fullPhone = \"+91\" + phone;
    const { data: user, error } = await supabase
      .from(\"users\")
      .select(\"id, name, phone\")
      .eq(\"phone\", fullPhone)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(404).json({ success: false, error: \"No account found. Join the waitlist.\" });

    res.json({ success: true, user: { id: user.id, name: user.name, phone: user.phone } });"""

NEW_COUPLE_VERIFY = """    // Look up user in users table by phone
    const fullPhone = \"+91\" + phone;
    let user = null;
    const { data: u1 } = await supabase.from(\"users\").select(\"id, name, phone, pin_set, dreamer_type\").eq(\"phone\", fullPhone).maybeSingle();
    if (u1) user = u1;
    if (!user) {
      const { data: u2 } = await supabase.from(\"users\").select(\"id, name, phone, pin_set, dreamer_type\").eq(\"phone\", phone).maybeSingle();
      if (u2) user = u2;
    }
    if (!user) return res.status(404).json({ success: false, error: \"No account found. Join the waitlist.\" });

    res.json({ success: true, user: { id: user.id, name: user.name, phone: user.phone, pin_set: !!user.pin_set, dreamer_type: user.dreamer_type || 'basic' } });"""

if OLD_COUPLE_VERIFY in src:
    src = src.replace(OLD_COUPLE_VERIFY, NEW_COUPLE_VERIFY)
    changes.append('✓ couple/verify-otp: pin_set added to response')
else:
    changes.append('✗ couple verify-otp pattern not found')

# Fix 2: pin-status — return found:false clearly when neither phone format matches
OLD_PIN_STATUS = """    if (phone) {
      const bare = phone.replace(/\\D/g, '').slice(-10);
      const full = '+91' + bare;
      const { data: d1 } = await supabase.from(table).select('id, pin_set').eq('phone', full).maybeSingle();
      if (d1) return res.json({ success: true, pin_set: !!d1.pin_set, userId: d1.id });
      const { data: d2 } = await supabase.from(table).select('id, pin_set').eq('phone', bare).maybeSingle();
      return res.json({ success: true, pin_set: !!d2?.pin_set, userId: d2?.id });
    }"""

NEW_PIN_STATUS = """    if (phone) {
      const bare = phone.replace(/\\D/g, '').slice(-10);
      const full = '+91' + bare;
      const { data: d1 } = await supabase.from(table).select('id, pin_set').eq('phone', full).maybeSingle();
      if (d1) return res.json({ success: true, pin_set: !!d1.pin_set, userId: d1.id });
      const { data: d2 } = await supabase.from(table).select('id, pin_set').eq('phone', bare).maybeSingle();
      if (d2) return res.json({ success: true, pin_set: !!d2.pin_set, userId: d2.id });
      return res.json({ success: true, pin_set: false, userId: null, found: false });
    }"""

if OLD_PIN_STATUS in src:
    src = src.replace(OLD_PIN_STATUS, NEW_PIN_STATUS)
    changes.append('✓ pin-status: explicit null when not found, no undefined userId')
else:
    changes.append('✗ pin-status pattern not found')

with open('backend/server.js', 'w') as f:
    f.write(src)

import subprocess
r = subprocess.run(['node', '--check', 'backend/server.js'], capture_output=True, text=True)
changes.append('✓ Syntax OK' if r.returncode == 0 else '✗ ' + r.stderr[:100])

print('\nAuth endpoint fixes\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Fix: couple verify-otp returns pin_set, pin-status explicit null when not found" && git push')
