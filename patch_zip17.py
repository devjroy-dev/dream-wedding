#!/usr/bin/env python3
"""
ZIP 17 — patch.py — Fix couple OTP send/verify
The /api/v2/couple/auth/send-otp uses a 307 redirect to /api/auth/send-otp.
307 redirects with POST can drop the body in some HTTP clients.
Fix: implement send-otp directly instead of redirecting.

Run from: /workspaces/dream-wedding/
Usage:    python3 patch.py
Then:     node --check backend/server.js && git add -A && git commit -m "fix: couple send-otp direct implementation, no redirect" && git push
"""

import sys, os

SERVER = os.path.join(os.path.dirname(__file__), 'backend', 'server.js')

with open(SERVER, 'r') as f:
    content = f.read()

print(f"Read {SERVER} ({len(content)} chars)")

OLD = """// POST /api/v2/couple/auth/send-otp — alias
app.post('/api/v2/couple/auth/send-otp', async (req, res) => {
  req.url = '/api/auth/send-otp';
  return res.redirect(307, '/api/auth/send-otp');
});

// POST /api/v2/vendor/auth/send-otp — alias
app.post('/api/v2/vendor/auth/send-otp', async (req, res) => {
  req.url = '/api/auth/send-otp';
  return res.redirect(307, '/api/auth/send-otp');
});"""

NEW = """// POST /api/v2/couple/auth/send-otp — direct implementation (no redirect)
app.post('/api/v2/couple/auth/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: 'Phone number required' });
    const bare = ('' + phone).replace(/\\D/g, '').slice(-10);
    const fullPhone = '+91' + bare;
    if (twilioClient && TWILIO_VERIFY_SID) {
      try {
        const verification = await twilioClient.verify.v2
          .services(TWILIO_VERIFY_SID)
          .verifications.create({ to: fullPhone, channel: 'sms' });
        console.log('[OTP couple] Twilio sent:', verification.status, 'to', fullPhone);
        return res.json({ success: true, sessionInfo: 'twilio_' + bare });
      } catch (twilioErr) {
        console.error('[OTP couple] Twilio error:', twilioErr.code, twilioErr.message);
        const knownErrors = {
          60200: 'Invalid phone number format.',
          60203: 'Too many OTP attempts. Wait 10 minutes and try again.',
          60212: 'Too many OTP attempts on this number. Try later.',
        };
        const userMsg = knownErrors[twilioErr.code] || 'Could not send code. Try again.';
        return res.status(400).json({ success: false, error: userMsg });
      }
    }
    return res.status(500).json({ success: false, error: 'OTP service unavailable.' });
  } catch (err) {
    console.error('[OTP couple] Unhandled error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v2/vendor/auth/send-otp — alias
app.post('/api/v2/vendor/auth/send-otp', async (req, res) => {
  req.url = '/api/auth/send-otp';
  return res.redirect(307, '/api/auth/send-otp');
});"""

assert content.count(OLD) == 1, f"Pattern not found uniquely: {content.count(OLD)}"
content = content.replace(OLD, NEW)

with open(SERVER, 'w') as f:
    f.write(content)

print(f"Patched. server.js is now {len(content)} chars.")
print()
print("NEXT:")
print("  node --check backend/server.js")
print("  git add -A && git commit -m 'fix: couple send-otp direct, no 307 redirect' && git push")
