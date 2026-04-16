"""
Session 6 — Patch 2: Kill Token Wall (swipe.tsx)
- Blind mode defaults to OFF (aesthetic toggle only, no cost)
- Token spending removed from swipe-right
- Profile button always unlocked
- Token modal removed entirely
"""

with open('app/swipe.tsx', 'r') as f:
    content = f.read()

# ── 1. Blind mode default OFF, tokens zeroed ─────────────────────────────────

old_blind = """  // Blind mode — default ON (token system)
  const [blindMode, setBlindMode] = useState(true);
  const [revealName, setRevealName] = useState<string | null>(null);

  // Token system
  const [tokenBalance, setTokenBalance] = useState(3); // 3 free tokens to start
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [pendingRevealVendor, setPendingRevealVendor] = useState<any>(null);
  const [unlockedVendors, setUnlockedVendors] = useState<string[]>([]);
  const [coupleTier, setCoupleTier] = useState<'free' | 'premium' | 'elite'>('free');"""

new_blind = """  // Blind mode — aesthetic toggle only, no token cost
  const [blindMode, setBlindMode] = useState(false);
  const [revealName, setRevealName] = useState<string | null>(null);

  // Token system — KILLED (free discovery)
  const [tokenBalance, setTokenBalance] = useState(0);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [pendingRevealVendor, setPendingRevealVendor] = useState<any>(null);
  const [unlockedVendors, setUnlockedVendors] = useState<string[]>([]);
  const [coupleTier, setCoupleTier] = useState<'free' | 'premium' | 'elite'>('free');"""

assert old_blind in content, "ERROR: Could not find blind mode block in swipe.tsx"
content = content.replace(old_blind, new_blind)
print("✓ Blind mode default OFF, tokens zeroed")

# ── 2. Remove token spending on swipe-right ───────────────────────────────────

old_token_spend = """    // Token system — blind mode reveal costs 1 token
    if (blindMode) {
      setPendingRevealVendor(vendor);
      setShowTokenModal(true);
      fireToast('Saved to Moodboard');
    } else {
      fireToast('Saved to Moodboard');
    }"""

new_token_spend = """    // Free discovery — no token cost
    fireToast('Saved to Moodboard');"""

assert old_token_spend in content, "ERROR: Could not find token spend block in swipe.tsx"
content = content.replace(old_token_spend, new_token_spend)
print("✓ Token spending removed from swipe-right")

# ── 3. Unlock profile button ─────────────────────────────────────────────────

old_profile = """          onPress={() => {
            const isUnlocked = !blindMode || unlockedVendors.includes(vendor.id);
            if (isUnlocked) {
              router.push(`/vendor-profile?id=${vendor.id}` as any);
            } else {
              Alert.alert(
                'Profile Locked',
                'In blind mode, use a token to unlock this vendor\\'s full profile. Save their card first, then unlock.',
                [{ text: 'Got it' }]
              );
            }
          }}"""

new_profile = """          onPress={() => {
            router.push(`/vendor-profile?id=${vendor.id}` as any);
          }}"""

assert old_profile in content, "ERROR: Could not find profile lock block in swipe.tsx"
content = content.replace(old_profile, new_profile)
print("✓ Profile button always unlocked")

# ── 4. Always show eye icon ──────────────────────────────────────────────────

old_icon = """          <Feather name={blindMode && !unlockedVendors.includes(vendor.id) ? "lock" : "eye"} size={16} color="#C9A84C" />"""
new_icon = """          <Feather name="eye" size={16} color="#C9A84C" />"""

assert old_icon in content, "ERROR: Could not find lock/eye icon in swipe.tsx"
content = content.replace(old_icon, new_icon)
print("✓ Profile icon always shows eye")

# ── 5. Remove token modal ────────────────────────────────────────────────────

# Find the token modal block and replace with empty comment
token_modal_start = "      {/* Token Unlock Modal */}"
token_modal_end = "      {/* Filter Modal */}"

start_idx = content.find(token_modal_start)
end_idx = content.find(token_modal_end)

assert start_idx != -1, "ERROR: Could not find token modal start"
assert end_idx != -1, "ERROR: Could not find filter modal marker"

content = content[:start_idx] + "      {/* Token system removed — free discovery */}\n\n      {/* Filter Modal */}" + content[end_idx + len(token_modal_end):]
print("✓ Token unlock modal removed")

with open('app/swipe.tsx', 'w') as f:
    f.write(content)

print()
print("PATCH 2 COMPLETE — Token wall killed")
print("Run: npx tsc --noEmit -p tsconfig.json")
