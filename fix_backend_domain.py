"""
BACKEND FIX — Allow thedreamwedding.in (v2 landing page)
Repo: dream-wedding

The backend middleware blocks any request from thedreamwedding.in
that isn't app.thedreamwedding.in, treating it as v1.
But thedreamwedding.in is now the v2 landing page and needs
to call the backend for Twilio OTP auth.

Fix: remove thedreamwedding.in from the v1 block list.
Only block vendor.thedreamwedding.in (the actual old v1).

Run from: /workspaces/dream-wedding
Command:  python3 fix_backend_domain.py
"""

with open('backend/server.js', 'r') as f:
    src = f.read()

OLD = "  const isV1 = origin.includes('thedreamwedding.in') && !origin.includes('app.thedreamwedding.in') && !origin.includes('tdw-2');"
NEW = "  const isV1 = origin.includes('vendor.thedreamwedding.in') && !origin.includes('app.thedreamwedding.in') && !origin.includes('tdw-2');"

if OLD in src:
    src = src.replace(OLD, NEW)
    with open('backend/server.js', 'w') as f:
        f.write(src)
    print('✓ v1 block updated — now only blocks vendor.thedreamwedding.in (old v1)')
    print('  thedreamwedding.in (new landing page) is now allowed through')
else:
    print('✗ Pattern not found')

import subprocess
r = subprocess.run(['node', '--check', 'backend/server.js'], capture_output=True, text=True)
print('✓ Syntax OK' if r.returncode == 0 else '✗ Syntax error: ' + r.stderr[:100])

print('\nNext: git add -A && git commit -m "Fix: allow thedreamwedding.in — v2 landing page not v1" && git push')
