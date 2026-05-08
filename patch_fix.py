#!/usr/bin/env python3
"""
Hotfix patch — replaces requireAdmin with checkAdminAuth in discover-heroes routes.
Run from: /workspaces/dream-wedding/
Usage: python3 patch_fix.py
Then:  node --check backend/server.js && git add -A && git commit -m "fix: requireAdmin → checkAdminAuth" && git push
"""

import sys, os

SERVER = os.path.join(os.path.dirname(__file__), 'backend', 'server.js')

with open(SERVER, 'r') as f:
    content = f.read()

print(f"Read {SERVER} ({len(content)} chars)")

# Count occurrences before replacing
count = content.count('requireAdmin')
print(f"Found {count} occurrence(s) of requireAdmin")

if count == 0:
    print("Nothing to fix — requireAdmin not found. Already patched?")
    sys.exit(0)

# All 5 occurrences are in the discover-heroes block we just added.
# checkAdminAuth is defined at line ~15226 in server.js.
content = content.replace('requireAdmin', 'checkAdminAuth')

assert content.count('requireAdmin') == 0, "requireAdmin still present after replacement"
assert content.count('checkAdminAuth') >= 5, "checkAdminAuth replacements missing"

with open(SERVER, 'w') as f:
    f.write(content)

print(f"Fixed. server.js is now {len(content)} chars.")
print()
print("NEXT:")
print("  node --check backend/server.js")
print("  git add -A && git commit -m 'fix: requireAdmin → checkAdminAuth' && git push")
