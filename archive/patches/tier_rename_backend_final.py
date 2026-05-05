path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

changes = []

# ── 1. tierMap — all 4 occurrences (same string) ──
old = "const tierMap = { basic: 'free', gold: 'premium', platinum: 'elite' };"
new = "const tierMap = { lite: 'lite', signature: 'signature', platinum: 'platinum' };"
count = content.count(old)
assert count == 4, f"tierMap count wrong: {count}"
content = content.replace(old, new)
changes.append(f"tierMap x{count}")

# ── 2. tokenMap — all 5 occurrences (same string) ──
old = "const tokenMap = { basic: 3, gold: 15, platinum: 999 };"
new = "const tokenMap = { lite: 3, signature: 15, platinum: 999 };"
count = content.count(old)
assert count == 5, f"tokenMap count wrong: {count}"
content = content.replace(old, new)
changes.append(f"tokenMap x{count}")

# ── 3. Tier validation in code generator ──
old = "if (!tier || !['basic', 'gold', 'platinum'].includes(tier)) {\n      return res.status(400).json({ success: false, error: 'Tier must be basic, gold, or platinum' });"
new = "if (!tier || !['lite', 'signature', 'platinum'].includes(tier)) {\n      return res.status(400).json({ success: false, error: 'Tier must be lite, signature, or platinum' });"
count = content.count(old)
assert count == 1, f"tier validation count wrong: {count}"
content = content.replace(old, new)
changes.append(f"tier validation x{count}")

# ── 4. codeData tier fallback (x2) ──
old = "tierMap[codeData.tier] || 'free';"
new = "tierMap[codeData.tier] || 'lite';"
count = content.count(old)
assert count == 2, f"codeData fallback count wrong: {count}"
content = content.replace(old, new)
changes.append(f"codeData tier fallback x{count}")

# ── 5. tier fallback (x1) ──
old = "tierMap[tier] || 'free';"
new = "tierMap[tier] || 'lite';"
count = content.count(old)
assert count == 1, f"tier fallback count wrong: {count}"
content = content.replace(old, new)
changes.append(f"tier fallback x{count}")

# ── 6. tokenMap fallbacks ──
old = "tokenMap[codeData.tier] || 3;"
count = content.count(old)
assert count >= 1, f"tokenMap codeData fallback not found"
changes.append(f"tokenMap codeData fallback x{count} (unchanged, correct)")

# ── 7. couple_tier || 'free' fallbacks — all occurrences ──
before = content.count("|| 'free'")
content = content.replace("couple_tier || 'free'", "couple_tier || 'lite'")
content = content.replace("user.couple_tier || 'free'", "user.couple_tier || 'lite'")
content = content.replace("data.couple_tier || 'free'", "data.couple_tier || 'lite'")
after = content.count("|| 'free'")
changes.append(f"couple_tier 'free' fallbacks → lite ({before-after} replaced)")

# ── 8. Onboarding default tier ──
old = "const tier = couple_tier || 'free';"
new = "const tier = couple_tier || 'lite';"
count = content.count(old)
assert count == 1, f"onboarding tier default count wrong: {count}"
content = content.replace(old, new)
changes.append(f"onboarding tier default x{count}")

# ── 9. Protect platinum on re-onboard (was 'elite') ──
old = "couple_tier: existing.couple_tier === 'elite' ? 'elite' : tier,"
new = "couple_tier: existing.couple_tier === 'platinum' ? 'platinum' : tier,"
count = content.count(old)
assert count == 1, f"elite protect count wrong: {count}"
content = content.replace(old, new)
changes.append(f"protect platinum on re-onboard x{count}")

# ── 10. tier_label fallback ──
old = "tier_label: tier || 'basic',"
new = "tier_label: tier || 'lite',"
count = content.count(old)
assert count == 1, f"tier_label fallback count wrong: {count}"
content = content.replace(old, new)
changes.append(f"tier_label fallback x{count}")

# ── 11. logActivity fallback ──
old = "(tier || 'basic') + ')')"
new = "(tier || 'lite') + ')')"
count = content.count(old)
assert count == 1, f"logActivity count wrong: {count}"
content = content.replace(old, new)
changes.append(f"logActivity fallback x{count}")

# ── 12. tierLabelMap ──
old = "const tierLabelMap = { free: 'basic', premium: 'gold', elite: 'platinum' };"
new = "const tierLabelMap = { lite: 'Lite', signature: 'Signature', platinum: 'Platinum' };"
count = content.count(old)
assert count == 1, f"tierLabelMap count wrong: {count}"
content = content.replace(old, new)
changes.append(f"tierLabelMap x{count}")

# ── 13. co-planner tierLabel logic ──
old = "const tierLabel = user.couple_tier === 'elite' ? 'platinum' : user.couple_tier === 'premium' ? 'gold' : 'basic';"
new = "const tierLabel = user.couple_tier === 'platinum' ? 'platinum' : user.couple_tier === 'signature' ? 'signature' : 'lite';"
count = content.count(old)
assert count == 1, f"co-planner tierLabel count wrong: {count}"
content = content.replace(old, new)
changes.append(f"co-planner tierLabel x{count}")

# ── 14. co-planner token cost gold→signature ──
old = "else if (tierLabel === 'gold') tokenCost = 1;"
new = "else if (tierLabel === 'signature') tokenCost = 1;"
count = content.count(old)
assert count == 1, f"co-planner gold count wrong: {count}"
content = content.replace(old, new)
changes.append(f"co-planner gold→signature x{count}")

# ── 15. dreamer_type fallback ──
content = content.replace("data.dreamer_type || 'free'", "data.dreamer_type || 'lite'")
changes.append("dreamer_type fallback → lite")

with open(path, 'w') as f:
    f.write(content)

print("Changes applied:")
for c in changes:
    print(f"  ✅ {c}")

# Final check — no old values left in couple_tier logic context
print("\nChecking for remaining old tier values in couple_tier context...")
suspicious = ["=== 'elite'", "=== 'premium'", "=== 'free'", ": 'free'", "|| 'free'", "|| 'basic'", ": 'basic'", "=== 'gold'", ": 'gold'", "|| 'gold'"]
found_any = False
for v in suspicious:
    lines = [(i+1, l.strip()) for i, l in enumerate(content.split('\n')) if v in l and ('couple_tier' in l or 'tierLabel' in l or 'coupleTier' in l or 'tierMap' in l or 'tokenMap' in l)]
    if lines:
        found_any = True
        print(f"  ⚠️  '{v}':")
        for ln, text in lines[:3]:
            print(f"    Line {ln}: {text[:120]}")

if not found_any:
    print("  ✅ Clean — no old tier values remain in logic")

print("\nDone. Run: node --check backend/server.js && echo SYNTAX OK")
