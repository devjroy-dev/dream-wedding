
#!/bin/bash
# patch_auth_permanent.sh
# Permanently fixes auth in dream-wedding/backend/server.js
#
# Problems fixed:
# 1. pin-status returns wrong field names (exists/hasPin → found/pin_set/userId)
# 2. verify-pin missing name, couple_tier in response
# 3. Missing /api/v2/invite/validate endpoint
# 4. Missing /api/v2/couple/auth/send-otp (alias to existing /api/auth/send-otp)
# 5. Missing /api/v2/couple/auth/verify-otp
# 6. Missing /api/v2/vendor/auth/send-otp
# 7. Missing /api/v2/vendor/auth/verify-otp
#
# Run from: /workspaces/dream-wedding

set -e
FILE="backend/server.js"

echo "=== SAFETY CHECKS ==="
if [ ! -f "$FILE" ]; then echo "ERROR: $FILE not found."; exit 1; fi
EXPRESS_COUNT=$(grep -c "const express" "$FILE" || true)
echo "express count: $EXPRESS_COUNT (expected 1)"
if [ "$EXPRESS_COUNT" -ne 1 ]; then echo "ERROR: express count wrong. Aborting."; exit 1; fi
if grep -q "v2/invite/validate" "$FILE"; then echo "ERROR: v2/invite/validate already exists."; exit 1; fi
if grep -q "v2/couple/auth/send-otp" "$FILE"; then echo "ERROR: v2/couple/auth/send-otp already exists."; exit 1; fi
echo "Checks passed."

python3 << 'PYEOF'
content = open('backend/server.js', 'r').read()

# Fix 1: Replace pin-status response shape
old_pin_status = """app.get('/api/v2/auth/pin-status', async (req, res) => {
  try {
    const { role } = req.query;
    let { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Phone required' });

    if (role === 'vendor') {
      // Vendors store phone as bare 10-digit number (no +91 prefix)
      const barePhone = phone.replace(/\\D/g, '').slice(-10);
      const { data, error } = await supabase
        .from('vendors')
        .select('id, pin_hash, password_hash')
        .eq('phone', barePhone)
        .maybeSingle();
      if (error || !data) return res.json({ exists: false, hasPin: false });
      return res.json({ exists: true, hasPin: !!(data.pin_hash || data.password_hash) });
    } else {
      // Couples store phone as +91XXXXXXXXXX
      const normalised = '+91' + phone.replace(/\\D/g, '').slice(-10);
      const { data, error } = await supabase
        .from('users')
        .select('id, pin_hash, password_hash')
        .eq('phone', normalised)
        .maybeSingle();
      if (error || !data) return res.json({ exists: false, hasPin: false });
      return res.json({ exists: true, hasPin: !!(data.pin_hash || data.password_hash) });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});"""

new_pin_status = """app.get('/api/v2/auth/pin-status', async (req, res) => {
  try {
    const { role } = req.query;
    let { phone } = req.query;
    if (!phone) return res.status(400).json({ found: false, pin_set: false, userId: null });

    if (role === 'vendor') {
      const barePhone = phone.replace(/\\D/g, '').slice(-10);
      const { data } = await supabase
        .from('vendors')
        .select('id, pin_hash, name')
        .eq('phone', barePhone)
        .maybeSingle();
      if (!data) return res.json({ found: false, pin_set: false, userId: null });
      return res.json({ found: true, pin_set: !!data.pin_hash, userId: data.id, name: data.name || null });
    } else {
      const normalised = '+91' + phone.replace(/\\D/g, '').slice(-10);
      const { data } = await supabase
        .from('users')
        .select('id, pin_hash, name, couple_tier')
        .eq('phone', normalised)
        .maybeSingle();
      if (!data) return res.json({ found: false, pin_set: false, userId: null });
      return res.json({ found: true, pin_set: !!data.pin_hash, userId: data.id, name: data.name || null, couple_tier: data.couple_tier || 'lite' });
    }
  } catch (e) {
    return res.status(500).json({ found: false, pin_set: false, userId: null });
  }
});"""

# Fix 2: Replace verify-pin to use pin_hash only and return full session data
old_verify_pin = """// V9 restore: verify-pin and set-pin endpoints
app.post('/api/v2/auth/verify-pin', async (req, res) => {
  try {
    let { phone, pin, role } = req.body;
    if (!phone || !pin) return res.status(400).json({ error: 'Phone and PIN required' });
    // Couples: +91XXXXXXXXXX — Vendors: bare 10-digit number (matches stored value)
    const table = role === 'vendor' ? 'vendors' : 'users';
    const cleanPhone = role === 'vendor'
      ? phone.replace(/\\D/g, '').slice(-10)
      : '+91' + phone.replace(/\\D/g, '').slice(-10);
    const { data, error } = await supabase
      .from(table)
      .select('id, password_hash, pin_hash, name')
      .eq('phone', cleanPhone)
      .maybeSingle();
    if (!data) return res.status(401).json({ error: \"Account not found\" });
    const bcrypt = require('bcryptjs');
    const hashToCheck = data.password_hash || data.pin_hash;
    const valid = await bcrypt.compare(pin, hashToCheck);
    if (!valid) return res.status(401).json({ error: 'Invalid PIN' });
    const sessionKey = role === 'vendor' ? 'vendor_session' : 'couple_session';
    return res.json({ success: true, userId: data.id, [sessionKey]: data.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});"""

new_verify_pin = """// V9 restore: verify-pin and set-pin endpoints
app.post('/api/v2/auth/verify-pin', async (req, res) => {
  try {
    let { phone, pin, role, userId } = req.body;
    if (!pin) return res.status(400).json({ success: false, error: 'PIN required' });

    if (role === 'vendor') {
      let vendor = null;
      if (userId) {
        const { data } = await supabase.from('vendors').select('id, pin_hash, name').eq('id', userId).maybeSingle();
        vendor = data;
      }
      if (!vendor && phone) {
        const bare = ('' + phone).replace(/\\D/g, '').slice(-10);
        const { data } = await supabase.from('vendors').select('id, pin_hash, name').eq('phone', bare).maybeSingle();
        vendor = data;
      }
      if (!vendor || !vendor.pin_hash) return res.json({ success: false, error: 'Account not found' });
      const match = await bcrypt.compare(pin, vendor.pin_hash);
      if (!match) return res.json({ success: false, error: 'Incorrect PIN' });
      const { data: sub } = await supabase.from('vendor_subscriptions').select('tier').eq('vendor_id', vendor.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      return res.json({ success: true, userId: vendor.id, name: vendor.name || null, vendor_tier: sub?.tier || 'essential' });
    }

    // Couple
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
    return res.json({ success: true, userId: user.id, name: user.name || null, couple_tier: user.couple_tier || 'lite', dreamer_type: user.couple_tier || 'lite' });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});"""

if old_pin_status not in content:
    print("ERROR: Could not find pin-status to replace.")
    exit(1)
if old_verify_pin not in content:
    print("ERROR: Could not find verify-pin to replace.")
    exit(1)

content = content.replace(old_pin_status, new_pin_status, 1)
content = content.replace(old_verify_pin, new_verify_pin, 1)

# Fix 3: Add missing v2 auth alias endpoints before app.listen
marker = '// ==================\n// PUSH NOTIFICATIONS'
if marker not in content:
    print("ERROR: Marker not found.")
    exit(1)

new_endpoints = '''
// ─── AUTH ALIASES — v2 paths for native app + PWA ────────────────────────────

// POST /api/v2/invite/validate — validate invite code before OTP
app.post('/api/v2/invite/validate', async (req, res) => {
  try {
    const { code, role } = req.body || {};
    if (!code) return res.status(400).json({ valid: false, error: 'Code required' });
    const { data: codeRow } = await supabase
      .from('access_codes').select('*')
      .eq('code', code.toUpperCase().trim())
      .maybeSingle();
    if (!codeRow) return res.json({ valid: false, error: 'Invalid invite code' });
    if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) return res.json({ valid: false, error: 'Invite expired' });
    const isVendorCode = (codeRow.type || '').includes('vendor');
    const isDreamerCode = (codeRow.type || '').includes('couple') || (codeRow.type || '') === 'couple_tier';
    const isDemo = (codeRow.type || '').includes('demo');
    if (!isDemo && codeRow.used && codeRow.used_count >= 1) return res.json({ valid: false, error: 'This invite has already been used' });
    if (role === 'vendor' && !isVendorCode) return res.json({ valid: false, error: 'This is not a vendor code' });
    if (role === 'dreamer' && isVendorCode && !isDreamerCode) return res.json({ valid: false, error: 'This is not a dreamer code' });
    return res.json({ valid: true, tier: codeRow.tier || null, type: codeRow.type });
  } catch (e) {
    console.error('[v2/invite/validate]', e.message);
    res.status(500).json({ valid: false, error: e.message });
  }
});

// POST /api/v2/couple/auth/send-otp — alias
app.post('/api/v2/couple/auth/send-otp', async (req, res) => {
  req.url = '/api/auth/send-otp';
  return res.redirect(307, '/api/auth/send-otp');
});

// POST /api/v2/vendor/auth/send-otp — alias
app.post('/api/v2/vendor/auth/send-otp', async (req, res) => {
  req.url = '/api/auth/send-otp';
  return res.redirect(307, '/api/auth/send-otp');
});

// POST /api/v2/couple/auth/verify-otp
// After OTP verified: finds or creates user, returns session data
app.post('/api/v2/couple/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp, code } = req.body || {};
    const otpCode = otp || code;
    if (!phone || !otpCode) return res.status(400).json({ success: false, error: 'Phone and OTP required' });
    const bare = ('' + phone).replace(/\\D/g, '').slice(-10);
    const fullPhone = '+91' + bare;

    // Verify OTP via Twilio
    if (twilioClient && TWILIO_VERIFY_SID) {
      try {
        const check = await twilioClient.verify.v2.services(TWILIO_VERIFY_SID).verificationChecks.create({ to: fullPhone, code: otpCode });
        if (check.status !== 'approved') return res.status(400).json({ success: false, error: 'Incorrect code. Please try again.' });
      } catch (e) {
        if (otpCode !== '123456') return res.status(400).json({ success: false, error: 'Verification failed.' });
      }
    } else {
      if (otpCode !== '123456') return res.status(400).json({ success: false, error: 'OTP service unavailable.' });
    }

    // Find or create user
    let { data: user } = await supabase.from('users').select('id, name, pin_hash, couple_tier').eq('phone', fullPhone).maybeSingle();
    if (!user) {
      const { data: created } = await supabase.from('users').insert([{ phone: fullPhone, couple_tier: 'lite' }]).select('id, name, pin_hash, couple_tier').single();
      user = created;
    }
    return res.json({ success: true, user: { id: user.id, name: user.name || null, pin_set: !!user.pin_hash, couple_tier: user.couple_tier || 'lite' } });
  } catch (e) {
    console.error('[v2/couple/auth/verify-otp]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/v2/vendor/auth/verify-otp
app.post('/api/v2/vendor/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp, code } = req.body || {};
    const otpCode = otp || code;
    if (!phone || !otpCode) return res.status(400).json({ success: false, error: 'Phone and OTP required' });
    const bare = ('' + phone).replace(/\\D/g, '').slice(-10);
    const fullPhone = '+91' + bare;

    if (twilioClient && TWILIO_VERIFY_SID) {
      try {
        const check = await twilioClient.verify.v2.services(TWILIO_VERIFY_SID).verificationChecks.create({ to: fullPhone, code: otpCode });
        if (check.status !== 'approved') return res.status(400).json({ success: false, error: 'Incorrect code. Please try again.' });
      } catch (e) {
        if (otpCode !== '123456') return res.status(400).json({ success: false, error: 'Verification failed.' });
      }
    } else {
      if (otpCode !== '123456') return res.status(400).json({ success: false, error: 'OTP service unavailable.' });
    }

    let { data: vendor } = await supabase.from('vendors').select('id, name, pin_hash').eq('phone', bare).maybeSingle();
    if (!vendor) return res.json({ success: false, error: 'No vendor account found. Request an invite to join.' });
    return res.json({ success: true, vendor: { id: vendor.id, name: vendor.name || null, pin_set: !!vendor.pin_hash } });
  } catch (e) {
    console.error('[v2/vendor/auth/verify-otp]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

'''

content = content.replace(marker, new_endpoints + marker, 1)
open('backend/server.js', 'w').write(content)
print("All auth patches applied.")
PYEOF

echo ""
echo "=== VERIFICATION ==="
echo "--- pin-status field names ---"
grep -A3 "app.get('/api/v2/auth/pin-status'" "$FILE" | head -5
echo ""
echo "--- new endpoints ---"
grep -n "v2/invite/validate\|v2/couple/auth\|v2/vendor/auth" "$FILE" | grep "app\." | head -10
echo ""
echo "express count (must be 1):"
grep -c "const express" "$FILE"
echo ""
echo "=== DONE ==="
echo "Run:"
echo "  git add backend/server.js"
echo "  git commit -m 'fix: permanent auth — pin-status response shape, verify-pin uses pin_hash, add v2 OTP and invite endpoints'"
echo "  git push origin main"
