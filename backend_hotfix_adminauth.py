"""
BACKEND HOTFIX — Railway crash: adminAuth used before initialization
Repo: dream-wedding

Error: ReferenceError: Cannot access 'adminAuth' before initialization
       at /app/server.js:11556

Cause: Phase 9 placed the preview-vendor admin endpoints at line ~11556
but adminAuth is declared with `const` at line 13272. Node's temporal
dead zone means you cannot reference a const before its declaration,
even if it comes later in the same file. Railway crashes on every boot.

Fix: replace the adminAuth middleware parameter on both admin preview-vendor
endpoints with the inline password check pattern used by all other
pre-13272 admin endpoints.

Run from: /workspaces/dream-wedding
Command:  python3 backend_hotfix_adminauth.py
"""

with open('backend/server.js', 'r') as f:
    src = f.read()

AUTH_CHECK = "  if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD && req.headers['x-admin-password'] !== 'Mira@2551354') {\n    return res.status(401).json({ error: 'Unauthorized' });\n  }"

OLD_GET  = "app.get('/api/v2/admin/preview-vendors', adminAuth, async (req, res) => {\n  try {"
NEW_GET  = f"app.get('/api/v2/admin/preview-vendors', async (req, res) => {{\n{AUTH_CHECK}\n  try {{"

OLD_POST = "app.post('/api/v2/admin/preview-vendors', adminAuth, async (req, res) => {\n  try {"
NEW_POST = f"app.post('/api/v2/admin/preview-vendors', async (req, res) => {{\n{AUTH_CHECK}\n  try {{"

changes = []

if OLD_GET in src:
    src = src.replace(OLD_GET, NEW_GET)
    changes.append('✓ GET /api/v2/admin/preview-vendors — fixed')
elif NEW_GET[:60] in src:
    changes.append('✓ GET already fixed')
else:
    changes.append('✗ GET pattern not found — check manually')

if OLD_POST in src:
    src = src.replace(OLD_POST, NEW_POST)
    changes.append('✓ POST /api/v2/admin/preview-vendors — fixed')
elif NEW_POST[:60] in src:
    changes.append('✓ POST already fixed')
else:
    changes.append('✗ POST pattern not found — check manually')

with open('backend/server.js', 'w') as f:
    f.write(src)

print('\nBackend hotfix — adminAuth TDZ crash\n')
for c in changes:
    print(c)
print('\nNext: node --check backend/server.js && git add -A && git commit -m "Hotfix: adminAuth TDZ crash — preview-vendor endpoints use inline auth" && git push')
