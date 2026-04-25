import re

path = '/workspaces/dream-wedding/backend/server.js'

with open(path, 'r') as f:
    c = f.read()

# Fix 1 — select name, category, phone in all three queries
c = c.replace(
    "supabase.from(table).select('id, pin_hash, pin_set').eq('phone', full).maybeSingle()",
    "supabase.from(table).select('id, pin_hash, pin_set, name, category, phone').eq('phone', full).maybeSingle()"
)
c = c.replace(
    "supabase.from(table).select('id, pin_hash, pin_set').eq('phone', bare).maybeSingle()",
    "supabase.from(table).select('id, pin_hash, pin_set, name, category, phone').eq('phone', bare).maybeSingle()"
)
c = c.replace(
    "supabase.from(table).select('id, pin_hash, pin_set').eq('id', userId).maybeSingle()",
    "supabase.from(table).select('id, pin_hash, pin_set, name, category, phone').eq('id', userId).maybeSingle()"
)

# Fix 2 — return name, category, phone in the success response
c = c.replace(
    "res.json({ success: true, userId: data.id });",
    "res.json({ success: true, userId: data.id, name: data.name || null, category: data.category || null, phone: data.phone || null });"
)

with open(path, 'w') as f:
    f.write(c)

print("✓ verify-pin now returns name, category, phone")
print("Run: cd /workspaces/dream-wedding && git add -A && git commit -m 'Fix: verify-pin returns name and category' && git push")
