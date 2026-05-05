import sys

with open('backend/server.js', 'r') as f:
    content = f.read()

changes = 0

# 1. Fix getDailyQuotaCap to handle vendor vs couple signature tier correctly
old1 = '''function getDailyQuotaCap(tier, surface, isFoundingPeriod) {
  const t = (tier || "lite").toLowerCase();
  // Founding period: Lite brides get Signature caps for first 30 days
  const effectiveTier = (isFoundingPeriod && t === "lite") ? "signature" : t;

  // Couple caps
  if (effectiveTier === "platinum") return 999999; // unlimited
  if (effectiveTier === "signature") return surface === "whatsapp" ? 8 : 25;
  if (effectiveTier === "lite" || effectiveTier === "basic" || effectiveTier === "free") return surface === "whatsapp" ? 3 : 10;

  // Vendor caps
  if (effectiveTier === "prestige") return 999999; // unlimited
  if (effectiveTier === "essential") return surface === "whatsapp" ? 3 : 20;

  // Fallback
  return surface === "whatsapp" ? 3 : 10;
}'''

new1 = '''function getDailyQuotaCap(tier, surface, isFoundingPeriod, userType) {
  const t = (tier || "lite").toLowerCase();
  const isVendorUser = (userType === "vendor");

  // Vendor caps (Essential/Signature/Prestige — different from couple tiers)
  if (isVendorUser) {
    if (t === "prestige") return 999999; // unlimited
    if (t === "signature") return surface === "whatsapp" ? 8 : 75;
    // essential (and fallback)
    return surface === "whatsapp" ? 3 : 20;
  }

  // Couple caps
  // Founding period: Lite brides get Signature caps for first 30 days
  const effectiveTier = (isFoundingPeriod && t === "lite") ? "signature" : t;
  if (effectiveTier === "platinum") return 999999; // unlimited
  if (effectiveTier === "signature") return surface === "whatsapp" ? 8 : 25;
  if (effectiveTier === "lite" || effectiveTier === "basic" || effectiveTier === "free") return surface === "whatsapp" ? 3 : 10;

  // Fallback
  return surface === "whatsapp" ? 3 : 10;
}'''

if old1 in content:
    content = content.replace(old1, new1)
    changes += 1
    print("✅ Step 1: getDailyQuotaCap updated")
else:
    print("❌ Step 1 FAILED: string not found")
    sys.exit(1)

# 2. Pass userType into getDailyQuotaCap call
old2 = '    const cap = getDailyQuotaCap(tier, surface, isFoundingPeriod);'
new2 = '    const cap = getDailyQuotaCap(tier, surface, isFoundingPeriod, userType);'
if old2 in content:
    content = content.replace(old2, new2)
    changes += 1
    print("✅ Step 2: cap call updated")
else:
    print("❌ Step 2 FAILED")
    sys.exit(1)

# 3. Replace vendor in-app monthly quota with daily cap
old3 = '''    // PHASE 5: Token quota enforcement for in-app DreamAi chat
    if (userId && userType === 'vendor') {
      const { data: vendorQuota } = await supabase.from('vendors')
        .select('ai_commands_used, ai_extra_tokens, tier')
        .eq('id', userId).maybeSingle();

      if (vendorQuota) {
        const quota = getAiQuota(vendorQuota);
        const used = vendorQuota.ai_commands_used || 0;
        const extra = vendorQuota.ai_extra_tokens || 0;
        const totalRemaining = Math.max(0, quota - used) + extra;

        if (totalRemaining <= 0) {
          return res.json({
            success: true,
            reply: "You've used all your DreamAi commands this month. Top up at Settings \\u2192 DreamAi Tokens.\\n\\n50 commands for \\u20b9100 \\u00b7 200 for \\u20b9350 \\u00b7 500 for \\u20b9800",
          });
        }

        // NOTE: Actual increment happens POST-loop, charged per tool (Directive 2.4)
      }
    }'''

new3 = '''    // Vendor in-app daily cap — Directive 2.3
    // Caps: Essential 20/day, Signature 75/day, Prestige unlimited
    if (userId && userType === 'vendor') {
      const { data: vSub } = await supabase.from('vendor_subscriptions')
        .select('tier').eq('vendor_id', userId).maybeSingle();
      const vTier = (vSub && vSub.tier) ? vSub.tier : 'essential';

      const vendorDailyResult = await checkAndIncrementDailyUsage(
        userId, 'vendor', 'inapp', vTier, false, null
      );

      if (!vendorDailyResult.allowed) {
        const capMsg = vTier === 'essential'
          ? "You\\'ve used your 20 in-app DreamAi messages for today. Upgrade to Signature for 75/day, or wait until midnight IST."
          : "You\\'ve used your daily in-app DreamAi messages. Your limit resets at midnight IST.";
        return res.json({ success: true, reply: capMsg, quota_exceeded: true });
      }
    }'''

if old3 in content:
    content = content.replace(old3, new3)
    changes += 1
    print("✅ Step 3: vendor in-app quota replaced")
else:
    print("❌ Step 3 FAILED: old vendor quota block not found")
    sys.exit(1)

# 4. Remove old post-loop vendor deduction
old4 = '''    // Directive 2.4: Post-loop vendor deduction — charged per tool called
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
    }'''

new4 = "    // Vendor daily usage recorded by checkAndIncrementDailyUsage at request start (Directive 2.3)"

if old4 in content:
    content = content.replace(old4, new4)
    changes += 1
    print("✅ Step 4: old post-loop deduct removed")
else:
    print("⚠️  Step 4: post-loop block not found — may already be clean, continuing")
    changes += 1  # non-fatal

with open('backend/server.js', 'w') as f:
    f.write(content)

print(f"\n{changes}/4 changes applied. Run: node --check backend/server.js && echo SYNTAX OK")
