"""
HOTFIX — verify-pin selects tier column which doesn't exist
Repo: dream-wedding

verify-pin selects 'id, pin_hash, pin_set, name, category, tier, phone'
and returns tier in response. vendors table has no tier column.
This causes verify-pin to fail silently → "wrong PIN" error.

Run from: /workspaces/dream-wedding
Command:  python3 fix_verify_pin_tier.py
"""

with open('backend/server.js', 'r') as f:
    src = f.read()

changes = []

OLD_FIELDS = "      ? 'id, pin_hash, pin_set, name, category, tier, phone'"
NEW_FIELDS = "      ? 'id, pin_hash, pin_set, name, category, phone'"

if OLD_FIELDS in src:
    src = src.replace(OLD_FIELDS, NEW_FIELDS)
    changes.append('✓ Removed tier from verify-pin select fields')
elif NEW_FIELDS in src:
    changes.append('✓ Already fixed')
else:
    changes.append('✗ Fields pattern not found')

OLD_RES = "    res.json({\n      success: true,\n      userId: data.id,\n      name: data.name || null,\n      category: data.category || null,\n      tier: data.tier || null,\n      phone: data.phone || null,\n      dreamer_type: data.dreamer_type || null,\n    });"
NEW_RES = "    res.json({\n      success: true,\n      userId: data.id,\n      name: data.name || null,\n      category: data.category || null,\n      phone: data.phone || null,\n      dreamer_type: data.dreamer_type || null,\n    });"

if OLD_RES in src:
    src = src.replace(OLD_RES, NEW_RES)
    changes.append('✓ Removed tier from verify-pin response')
elif NEW_RES in src:
    changes.append('✓ Response already fixed')
else:
    changes.append('✗ Response pattern not found')

with open('backend/server.js', 'w') as f:
    f.write(src)

import subprocess
r = subprocess.run(['node', '--check', 'backend/server.js'], capture_output=True, text=True)
changes.append('✓ Syntax OK' if r.returncode == 0 else '✗ ' + r.stderr[:100])

print('\nverify-pin tier fix\n')
for c in changes:
    print(c)
print('\nNext: git add -A && git commit -m "Hotfix: remove tier from verify-pin — column does not exist" && git push')
