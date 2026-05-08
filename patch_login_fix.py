#!/usr/bin/env python3
"""
patch_login_fix.py — The actual login fix for The Dream Wedding.

Problem (verified against current backend/server.js HEAD):
  Dev's couple account (and an unknown number of legacy accounts) has its 4-digit
  PIN stored in users.password_hash, not users.pin_hash. Three endpoints currently
  read only pin_hash, which means:

    1. /api/v2/couple/auth/verify-otp returns pin_set: false (wrong)
    2. /api/v2/auth/pin-status returns pin_set: false (wrong) — symptom hidden
       only because the OTP path is what the app actually hits
    3. /api/v2/auth/verify-pin compares against null pin_hash and returns
       "Account not found" (FATAL — even after fixing #1, the user is routed
       to the PIN screen, types 1234, and login still fails)

The handover doc's patch_zip19.py only fixes #1. That's a half-fix that breaks
login a different way. This patch fixes all three, and migrates password_hash
to pin_hash on successful login so the codebase converges on a single column.

Run from: /workspaces/dream-wedding/
After running:  node --check backend/server.js
                git add -A && git commit -m "fix(auth): legacy PIN in password_hash works across verify-otp, pin-status, verify-pin"
                git push
"""

import os
import sys

SERVER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend', 'server.js')

with open(SERVER, 'r') as f:
    content = f.read()

print(f"Read {SERVER} ({len(content)} chars)")

# ─────────────────────────────────────────────────────────────────────────────
# Fix 1: /api/v2/couple/auth/verify-otp
#   - Select password_hash too
#   - pin_set = !!(pin_hash || password_hash)
#   - Return flat fields alongside the existing user{} object so frontend
#     code reading either d.user.* or d.* works (current frontend does d.user || d)
#   - Also return isNewUser, dreamer_type, phone for the routing decision
# ─────────────────────────────────────────────────────────────────────────────
OLD_1 = """    // Find or create user
    let { data: user } = await supabase.from('users').select('id, name, pin_hash, couple_tier').eq('phone', fullPhone).maybeSingle();
    if (!user) {
      const { data: created } = await supabase.from('users').insert([{ phone: fullPhone, couple_tier: 'lite' }]).select('id, name, pin_hash, couple_tier').single();
      user = created;
    }
    return res.json({ success: true, user: { id: user.id, name: user.name || null, pin_set: !!user.pin_hash, couple_tier: user.couple_tier || 'lite' } });"""

NEW_1 = """    // Find or create user
    // NOTE: legacy accounts store the 4-digit PIN in password_hash. Treat either
    // pin_hash or password_hash as evidence the user has a PIN set. verify-pin
    // mirrors this fallback and migrates password_hash -> pin_hash on success.
    let { data: user } = await supabase.from('users').select('id, name, pin_hash, password_hash, couple_tier, dreamer_type').eq('phone', fullPhone).maybeSingle();
    if (!user) {
      const { data: created } = await supabase.from('users').insert([{ phone: fullPhone, couple_tier: 'lite' }]).select('id, name, pin_hash, password_hash, couple_tier, dreamer_type').single();
      user = created;
    }
    const pinSet = !!(user.pin_hash || user.password_hash);
    const isNewUser = !user.name;
    return res.json({
      success: true,
      // Flat fields (preferred — current frontend reads d.user || d)
      id: user.id,
      userId: user.id,
      name: user.name || null,
      pin_set: pinSet,
      couple_tier: user.couple_tier || 'lite',
      dreamer_type: user.dreamer_type || null,
      phone: fullPhone,
      isNewUser,
      // Backward-compatible nested shape
      user: { id: user.id, name: user.name || null, pin_set: pinSet, couple_tier: user.couple_tier || 'lite', dreamer_type: user.dreamer_type || null, phone: fullPhone, isNewUser },
    });"""

n1 = content.count(OLD_1)
assert n1 == 1, f"[Fix 1 / verify-otp] expected exactly 1 match, found {n1}"
content = content.replace(OLD_1, NEW_1)
print("  [Fix 1] verify-otp: now checks pin_hash || password_hash, returns flat fields")

# ─────────────────────────────────────────────────────────────────────────────
# Fix 2: /api/v2/auth/pin-status (couple branch)
#   Same legacy fallback. Vendor branch is unaffected — vendors never had the
#   password_hash legacy path for PINs in the same way, and changing it would
#   widen blast radius. Leave vendors as-is.
# ─────────────────────────────────────────────────────────────────────────────
OLD_2 = """    } else {
      const normalised = '+91' + phone.replace(/\\D/g, '').slice(-10);
      const { data } = await supabase
        .from('users')
        .select('id, pin_hash, name, couple_tier')
        .eq('phone', normalised)
        .maybeSingle();
      if (!data) return res.json({ found: false, pin_set: false, userId: null });
      return res.json({ found: true, pin_set: !!data.pin_hash, userId: data.id, name: data.name || null, couple_tier: data.couple_tier || 'lite' });
    }"""

NEW_2 = """    } else {
      const normalised = '+91' + phone.replace(/\\D/g, '').slice(-10);
      const { data } = await supabase
        .from('users')
        .select('id, pin_hash, password_hash, name, couple_tier')
        .eq('phone', normalised)
        .maybeSingle();
      if (!data) return res.json({ found: false, pin_set: false, userId: null });
      // Legacy fallback: PIN may live in password_hash for older accounts
      return res.json({ found: true, pin_set: !!(data.pin_hash || data.password_hash), userId: data.id, name: data.name || null, couple_tier: data.couple_tier || 'lite' });
    }"""

n2 = content.count(OLD_2)
assert n2 == 1, f"[Fix 2 / pin-status] expected exactly 1 match, found {n2}"
content = content.replace(OLD_2, NEW_2)
print("  [Fix 2] pin-status: couple branch now checks pin_hash || password_hash")

# ─────────────────────────────────────────────────────────────────────────────
# Fix 3: /api/v2/auth/verify-pin (couple branch) — THE CRITICAL FIX
#   If pin_hash is null but password_hash exists, compare the entered PIN against
#   password_hash. On match, migrate it: copy the hash into pin_hash so future
#   logins go through the canonical path and we don't carry this fork forever.
#   Vendor branch is left alone for the same scope-control reason as Fix 2.
# ─────────────────────────────────────────────────────────────────────────────
OLD_3 = """    // Couple
    let user = null;
    if (userId) {
      const { data } = await supabase.from('users').select('id, pin_hash, name, couple_tier').eq('id', userId).maybeSingle();
      user = data;
    }
    if (!user && phone) {
      const bare = ('' + phone).replace(/\\D/g, '').slice(-10);
      const { data } = await supabase.from('users').select('id, pin_hash, name, couple_tier').eq('phone', '+91' + bare).maybeSingle();
      user = data;
    }
    if (!user || !user.pin_hash) return res.json({ success: false, error: 'Account not found' });
    const match = await bcrypt.compare(pin, user.pin_hash);
    if (!match) return res.json({ success: false, error: 'Incorrect PIN' });
    return res.json({ success: true, userId: user.id, name: user.name || null, couple_tier: user.couple_tier || 'lite', dreamer_type: user.couple_tier || 'lite' });"""

NEW_3 = """    // Couple
    let user = null;
    if (userId) {
      const { data } = await supabase.from('users').select('id, pin_hash, password_hash, name, couple_tier, dreamer_type').eq('id', userId).maybeSingle();
      user = data;
    }
    if (!user && phone) {
      const bare = ('' + phone).replace(/\\D/g, '').slice(-10);
      const { data } = await supabase.from('users').select('id, pin_hash, password_hash, name, couple_tier, dreamer_type').eq('phone', '+91' + bare).maybeSingle();
      user = data;
    }
    if (!user || (!user.pin_hash && !user.password_hash)) return res.json({ success: false, error: 'Account not found' });
    // Try pin_hash first (canonical), fall back to password_hash (legacy).
    let match = false;
    let usedLegacy = false;
    if (user.pin_hash) {
      match = await bcrypt.compare(pin, user.pin_hash);
    }
    if (!match && user.password_hash) {
      match = await bcrypt.compare(pin, user.password_hash);
      if (match) usedLegacy = true;
    }
    if (!match) return res.json({ success: false, error: 'Incorrect PIN' });
    // Migrate legacy PIN: write password_hash value into pin_hash so the next
    // login uses the canonical column. Fire and forget — login should not block
    // on this. We don't clear password_hash because other code paths may still
    // rely on it during the transition.
    if (usedLegacy) {
      supabase.from('users').update({ pin_hash: user.password_hash }).eq('id', user.id).then(
        () => console.log('[verify-pin] migrated legacy PIN for user', user.id),
        (e) => console.warn('[verify-pin] PIN migration failed for user', user.id, e?.message || e)
      );
    }
    return res.json({ success: true, userId: user.id, name: user.name || null, couple_tier: user.couple_tier || 'lite', dreamer_type: user.dreamer_type || user.couple_tier || 'lite' });"""

n3 = content.count(OLD_3)
assert n3 == 1, f"[Fix 3 / verify-pin] expected exactly 1 match, found {n3}"
content = content.replace(OLD_3, NEW_3)
print("  [Fix 3] verify-pin: couple branch falls back to password_hash + auto-migrates")

# Sanity: dreamer_type was previously aliased to couple_tier in the success
# response (clearly a bug — they're different concepts). The replacement above
# now reads dreamer_type from the actual column and falls back to couple_tier
# only if dreamer_type is null. Documented here so it's not silent.

with open(SERVER, 'w') as f:
    f.write(content)

print()
print(f"Wrote {SERVER} ({len(content)} chars)")
print()
print("Three endpoints patched. Now run:")
print("  node --check backend/server.js")
print("  git add -A && git commit -m 'fix(auth): legacy PIN in password_hash works across verify-otp, pin-status, verify-pin'")
print("  git push")
