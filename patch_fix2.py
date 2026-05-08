#!/usr/bin/env python3
"""
Hotfix patch 2 — replaces upload.single with uploadMemory.single in discover-heroes upload route.
Run from: /workspaces/dream-wedding/
Usage: python3 patch_fix2.py
Then:  node --check backend/server.js && git add -A && git commit -m "fix: upload → uploadMemory in discover-heroes upload route" && git push
"""

import sys, os

SERVER = os.path.join(os.path.dirname(__file__), 'backend', 'server.js')

with open(SERVER, 'r') as f:
    content = f.read()

print(f"Read {SERVER} ({len(content)} chars)")

OLD = "app.post('/api/v2/admin/discover-heroes/upload', checkAdminAuth, upload.single('file'), async (req, res) => {"
NEW = "app.post('/api/v2/admin/discover-heroes/upload', checkAdminAuth, uploadMemory.single('file'), async (req, res) => {"

assert content.count(OLD) == 1, f"Expected 1 occurrence, found {content.count(OLD)}"
content = content.replace(OLD, NEW)
assert content.count(NEW) == 1

with open(SERVER, 'w') as f:
    f.write(content)

print("Fixed. upload → uploadMemory in discover-heroes upload route.")
print()
print("NEXT:")
print("  node --check backend/server.js")
print("  git add -A && git commit -m 'fix: upload → uploadMemory in discover-heroes upload route' && git push")
