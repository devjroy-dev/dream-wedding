path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

changes = []

# ── 1. tierMap — replace all occurrences ──
old = "const tierMap = { basic: 'free', gold: 'premium', platinum: 'elite' };"
new = "const tierMap = { lite: 'lite', signature: 'signature', platinum: 'platinum' };"
count = content.count(old)
assert count >= 3, f"tierMap count too low: {count}"
content = content.replace(old, new)
changes.append(f"tierMap x{count}")

# ── 2. tokenMap — replace all occurrences ──
old = "const tokenMap = { basic: 3, gold: 15, platinum: 999 };"
new = "const tokenMap = { lite: 3, signature: 15, platinum: 999 };"
count = content.count(old)
assert count >= 3, f"tokenMap count too low: {count}"
content = content.replace(old, new)
changes.append(f"tokenMap x{count}")

# ── 3. Tier validation in code generator ──
old = "!['basic', 'gold', 'platinum'].includes(tier)"
new = "!['lite', 'signature', 'platinum'].includes(tier)"
count = content.count(old)
assert count == 1, f"tier validation count wrong: {count}"
content = content.replace(old, new)
old2 = "'Tier must be basic, gold, or platinum'"
new2 = "'Tier must be lite, signature, or platinum'"
content = content.replace(old2, new2)
changes.append(f"tier validation x{count}")

# ── 4. All || 'free' fallbacks — safe replace-all ──
before = content.count("|| 'free'")
content = content.replace("|| 'free'", "|| 'lite'")
after = content.count("|| 'free'")
changes.append(f"|| 'free' → || 'lite' ({before} replaced)")

# ── 5. All : 'free' assignments in couple context ──
content = content.replace(": 'free'", ": 'lite'")
changes.append(": 'free' → : 'lite' (all)")

# ── 6. Protect platinum on re-onboard (was 'elite') ──
old = "couple_tier: existing.couple_tier === 'elite' ? 'elite' : tier,"
new = "couple_tier: existing.couple_tier === 'platinum' ? 'platinum' : tier,"
count = content.count(old)
assert count == 1, f"elite protect count wrong: {count}"
content = content.replace(old, new)
changes.append(f"protect platinum on re-onboard x{count}")

# ── 7. tier_label fallback ──
old = "tier_label: tier || 'basic',"
new = "tier_label: tier || 'lite',"
count = content.count(old)
assert count == 1, f"tier_label fallback count wrong: {count}"
content = content.replace(old, new)
changes.append(f"tier_label fallback x{count}")

# ── 8. logActivity fallback ──
old = "(tier || 'basic') + ')')"
new = "(tier || 'lite') + ')')"
count = content.count(old)
assert count == 1, f"logActivity count wrong: {count}"
content = content.replace(old, new)
changes.append(f"logActivity fallback x{count}")

# ── 9. tierLabelMap ──
old = "const tierLabelMap = { free: 'basic', premium: 'gold', elite: 'platinum' };"
new = "const tierLabelMap = { lite: 'Lite', signature: 'Signature', platinum: 'Platinum' };"
count = content.count(old)
assert count == 1, f"tierLabelMap count wrong: {count}"
content = content.replace(old, new)
changes.append(f"tierLabelMap x{count}")

# ── 10. co-planner tierLabel logic ──
old = "const tierLabel = user.couple_tier === 'elite' ? 'platinum' : user.couple_tier === 'premium' ? 'gold' : 'basic';"
new = "const tierLabel = user.couple_tier === 'platinum' ? 'platinum' : user.couple_tier === 'signature' ? 'signature' : 'lite';"
count = content.count(old)
assert count == 1, f"co-planner tierLabel count wrong: {count}"
content = content.replace(old, new)
changes.append(f"co-planner tierLabel x{count}")

# ── 11. co-planner token cost gold → signature ──
old = "else if (tierLabel === 'gold') tokenCost = 1;"
new = "else if (tierLabel === 'signature') tokenCost = 1;"
count = content.count(old)
assert count == 1, f"co-planner gold count wrong: {count}"
content = content.replace(old, new)
changes.append(f"co-planner gold→signature x{count}")

with open(path, 'w') as f:
    f.write(content)

print("Changes applied:")
for c in changes:
    print(f"  ✅ {c}")

# Final residual check
print("\nChecking for remaining old values...")
old_vals = ["=== 'elite'", "=== 'premium'", ": 'free'", "|| 'free'", "|| 'basic'", "|| 'gold'", "=== 'gold'"]
found_any = False
for v in old_vals:
    lines = [(i+1, l.strip()) for i, l in enumerate(content.split('\n'))
             if v in l and ('couple_tier' in l or 'tierLabel' in l or 'coupleTier' in l or 'tierMap' in l or 'tokenMap' in l)]
    if lines:
        found_any = True
        print(f"  ⚠️  '{v}':")
        for ln, text in lines[:3]:
            print(f"    Line {ln}: {text[:120]}")

if not found_any:
    print("  ✅ Clean")

print("\nDone. Run: node --check backend/server.js && echo SYNTAX OK")
