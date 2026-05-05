path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

changes = []

# ════════════════════════════════════════════════════════════════
# DIRECTIVE 2.5 — Vendor WhatsApp daily cap
# ════════════════════════════════════════════════════════════════
OLD_25 = """    // Check quota (tier allowance first, then extra tokens)
    const quota = getAiQuota(vendor);
    const used = vendor.ai_commands_used || 0;
    const extraTokens = vendor.ai_extra_tokens || 0;
    const tierRemaining = Math.max(0, quota - used);
    const totalRemaining = tierRemaining + extraTokens;
    if (totalRemaining <= 0) {
      await sendWhatsApp(fromPhone, \"You've used all your Dream Ai commands this month. Buy more tokens at vendor.thedreamwedding.in/vendor/settings\\n\\n50 tokens: Rs.100\\n200 tokens: Rs.350 (save 12%)\\n500 tokens: Rs.800 (save 20%)\");
      return;
    }
    // Low balance warning once at exactly 5 remaining
    if (totalRemaining === 5) {
      setTimeout(() => sendWhatsApp(fromPhone, 'Heads up — you have 5 Dream Ai commands left. Top up at vendor.thedreamwedding.in/vendor/settings'), 3000);
    }"""

NEW_25 = """    // Daily WhatsApp cap check — Directive 2.5 (replaces monthly counter)
    const vendorWaQuota = await checkAndIncrementDailyUsage(
      vendor.id, "vendor", "whatsapp",
      vendor.tier || "essential",
      false, null
    );
    if (!vendorWaQuota.allowed) {
      await sendWhatsApp(fromPhone, "You've used your DreamAi WhatsApp messages for today (" + vendorWaQuota.cap + " on your current plan). Log in to vendor.thedreamwedding.in to continue, or wait until midnight IST. Need more? Top up at vendor.thedreamwedding.in/vendor/settings");
      return;
    }"""

assert content.count(OLD_25) == 1, f"2.5 anchor: {content.count(OLD_25)}"
content = content.replace(OLD_25, NEW_25)
changes.append("2.5 Vendor WhatsApp daily cap")

# ════════════════════════════════════════════════════════════════
# DIRECTIVE 2.4 — Count tools not messages
# ════════════════════════════════════════════════════════════════

# A: Remove pre-loop single increment
OLD_24A = """        // Increment usage
        await supabase.from('vendors')
          .update({ ai_commands_used: used + 1 })
          .eq('id', userId);"""
NEW_24A = """        // NOTE: Actual increment happens POST-loop, charged per tool (Directive 2.4)"""
assert content.count(OLD_24A) == 1, f"2.4A anchor: {content.count(OLD_24A)}"
content = content.replace(OLD_24A, NEW_24A)
changes.append("2.4A pre-loop increment replaced with comment")

# B: Add toolsExecuted counter before loop
OLD_24B = "    let finalReply = '';\n    let pendingAction = null;"
NEW_24B = "    let finalReply = '';\n    let pendingAction = null;\n    let toolsExecuted = 0; // Directive 2.4: per-tool billing"
assert content.count(OLD_24B) == 1, f"2.4B anchor: {content.count(OLD_24B)}"
content = content.replace(OLD_24B, NEW_24B)
changes.append("2.4B toolsExecuted counter")

# C: Count query tool executions
OLD_24C = """      if (QUERY_TOOLS.includes(toolName)) {
          // Execute immediately
          try {
            const result = await executeToolCall(toolName, toolInput, { id: userId });"""
NEW_24C = """      if (QUERY_TOOLS.includes(toolName)) {
          // Execute immediately
          toolsExecuted++;
          try {
            const result = await executeToolCall(toolName, toolInput, { id: userId });"""
assert content.count(OLD_24C) == 1, f"2.4C anchor: {content.count(OLD_24C)}"
content = content.replace(OLD_24C, NEW_24C)
changes.append("2.4C toolsExecuted++ on query tool")

# D: Count mutation tool executions
OLD_24D = """        } else {
          // Mutation tool — map to action for confirmation
          if (!pendingAction) {"""
NEW_24D = """        } else {
          // Mutation tool — map to action for confirmation
          toolsExecuted++;
          if (!pendingAction) {"""
assert content.count(OLD_24D) == 1, f"2.4D anchor: {content.count(OLD_24D)}"
content = content.replace(OLD_24D, NEW_24D)
changes.append("2.4D toolsExecuted++ on mutation tool")

# E: Post-loop deduct by tool count
OLD_24E = "    // Build final response\n    if (pendingAction) {"
NEW_24E = """    // Directive 2.4: Post-loop vendor deduction — charged per tool called
    if (userId && userType === 'vendor' && toolsExecuted > 0) {
      try {
        const { data: vq } = await supabase.from('vendors')
          .select('ai_commands_used, ai_extra_tokens').eq('id', userId).maybeSingle();
        if (vq) {
          const vUsed = vq.ai_commands_used || 0;
          const vExtra = vq.ai_extra_tokens || 0;
          const { data: vSub } = await supabase.from('vendor_subscriptions')
            .select('tier').eq('vendor_id', userId).maybeSingle();
          const vTier = (vSub && vSub.tier) ? vSub.tier : 'essential';
          const vAllowance = vTier === 'prestige' ? 999999 : vTier === 'signature' ? 75 : 20;
          const vTierRemaining = Math.max(0, vAllowance - vUsed);
          if (toolsExecuted <= vTierRemaining) {
            await supabase.from('vendors').update({ ai_commands_used: vUsed + toolsExecuted }).eq('id', userId);
          } else {
            const fromExtra = toolsExecuted - vTierRemaining;
            await supabase.from('vendors').update({
              ai_commands_used: vUsed + vTierRemaining,
              ai_extra_tokens: Math.max(0, vExtra - fromExtra),
            }).eq('id', userId);
          }
        }
      } catch (e) { console.error('[quota] vendor post-loop deduct:', e.message); }
    }

    // Build final response
    if (pendingAction) {"""
assert content.count(OLD_24E) == 1, f"2.4E anchor: {content.count(OLD_24E)}"
content = content.replace(OLD_24E, NEW_24E)
changes.append("2.4E post-loop vendor deduction by tool count")

# ════════════════════════════════════════════════════════════════
# DIRECTIVE 3.1 — Set founding_period_end_date on new signup
# ════════════════════════════════════════════════════════════════
OLD_31 = """          founding_bride: isFounding,
          dreamer_type: 'couple',
          password_hash: passwordHash,
          token_balance: tier === 'elite' ? 999 : tier === 'premium' ? 15 : 3,"""
NEW_31 = """          founding_bride: isFounding,
          founding_period_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          dreamer_type: 'couple',
          password_hash: passwordHash,
          token_balance: tier === 'platinum' ? 999 : tier === 'signature' ? 15 : 3,"""
assert content.count(OLD_31) == 1, f"3.1 anchor: {content.count(OLD_31)}"
content = content.replace(OLD_31, NEW_31)
changes.append("3.1 founding_period_end_date on signup + token_balance tier names fixed")

with open(path, 'w') as f:
    f.write(content)

print("Changes applied:")
for c in changes:
    print(f"  ✅ {c}")
print("\nDone. Run: node --check backend/server.js && echo SYNTAX OK")
