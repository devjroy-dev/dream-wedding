"""
Session 6 — Patch 4b: Fix MyVendorsTool TS error
The filter !== 'tdw' comparison fails because TS narrows the type.
Simple fix: remove the redundant check since showExt already handles it.
"""

with open('components/planner/MyVendorsTool.tsx', 'r') as f:
    content = f.read()

old = "        {showExt && externalVendors.length === 0 && filter !== 'tdw' && ("
new = "        {showExt && externalVendors.length === 0 && ("

assert old in content, "ERROR: Could not find the line to fix"
content = content.replace(old, new)

with open('components/planner/MyVendorsTool.tsx', 'w') as f:
    f.write(content)

print("✓ Fixed MyVendorsTool.tsx — removed redundant filter check")
print("Run: npx tsc --noEmit -p tsconfig.json")
