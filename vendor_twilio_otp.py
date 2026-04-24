"""
BACKEND PATCH — Vendor Twilio OTP endpoints
Repo: dream-wedding

Adds:
  POST /api/v2/vendor/auth/send-otp   — sends Twilio Verify SMS to vendor
  POST /api/v2/vendor/auth/verify-otp — verifies code, returns vendor record

These mirror /api/v2/couple/auth/* but look up vendors table instead of users.
The landing page will use these instead of the Firebase-hybrid /api/auth/* endpoints.

Run from: /workspaces/dream-wedding
Command:  python3 vendor_twilio_otp.py
"""

PATH = 'backend/server.js'
with open(PATH, 'r') as f:
    src = f.read()

# Insert after the couple OTP endpoints
OLD_MARKER = "// v2 Couple Auth — OTP via Twilio Verify\n\n// ── SESSION 13: Waitlist endpoint ──"

NEW_ENDPOINTS = """// v2 Couple Auth — OTP via Twilio Verify

// ── v2 Vendor Auth — OTP via Twilio Verify ───────────────────────────────────
// Used by thedreamwedding.in landing page for Maker sign-in.
// Pure Twilio — no Firebase involved.

app.post('/api/v2/vendor/auth/send-otp', async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone || phone.replace(/\\D/g,'').length < 10) {
      return res.status(400).json({ success: false, error: 'Valid 10-digit phone required' });
    }
    const bare = phone.replace(/\\D/g,'').slice(-10);
    if (!twilioClient || !TWILIO_VERIFY_SID) {
      console.error('[v2 vendor OTP] Twilio not configured');
      return res.status(500).json({ success: false, error: 'OTP service unavailable' });
    }
    const verification = await twilioClient.verify.v2
      .services(TWILIO_VERIFY_SID)
      .verifications.create({ to: '+91' + bare, channel: 'sms' });
    console.log('[v2 vendor OTP] sent:', verification.status, 'to +91' + bare);
    res.json({ success: true });
  } catch (err) {
    console.error('[v2 vendor OTP] send error:', err.code, err.message);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

app.post('/api/v2/vendor/auth/verify-otp', async (req, res) => {
  try {
    const { phone, code } = req.body || {};
    if (!phone || !code) {
      return res.status(400).json({ success: false, error: 'Phone and code required' });
    }
    const bare = phone.replace(/\\D/g,'').slice(-10);
    if (!twilioClient || !TWILIO_VERIFY_SID) {
      return res.status(500).json({ success: false, error: 'OTP service unavailable' });
    }
    const check = await twilioClient.verify.v2
      .services(TWILIO_VERIFY_SID)
      .verificationChecks.create({ to: '+91' + bare, code });
    if (check.status !== 'approved') {
      return res.status(401).json({ success: false, error: 'Incorrect code' });
    }
    const fullPhone = '+91' + bare;
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
    res.json({ success: true, vendor: { id: vendor.id, name: vendor.name, phone: vendor.phone, pin_set: !!vendor.pin_set, category: vendor.category, tier: vendor.tier } });
  } catch (err) {
    console.error('[v2 vendor OTP] verify error:', err.message);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// ── SESSION 13: Waitlist endpoint ──"""

if OLD_MARKER in src:
    src = src.replace(OLD_MARKER, NEW_ENDPOINTS)
    with open(PATH, 'w') as f:
        f.write(src)
    print('✓ Vendor Twilio OTP endpoints added: /api/v2/vendor/auth/send-otp + verify-otp')
else:
    print('✗ Marker not found')

import subprocess
result = subprocess.run(['node', '--check', PATH], capture_output=True, text=True)
if result.returncode == 0:
    print('✓ server.js syntax check passed')
else:
    print('✗ Syntax error:', result.stderr[:200])

print('\nNext: git add -A && git commit -m "Backend: vendor Twilio OTP endpoints" && git push')
