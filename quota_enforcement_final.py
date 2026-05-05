path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

# ─────────────────────────────────────────────────────────────
# INSERTION 1: Daily quota helper functions
# Insert BEFORE the existing "Helper: check AI quota for a vendor" block
# ─────────────────────────────────────────────────────────────

OLD_VENDOR_QUOTA_COMMENT = "// Helper: check AI quota for a vendor based on tier\nfunction getAiQuota(vendor) {"

NEW_DAILY_QUOTA_HELPERS = """// ─── Daily DreamAi Quota System ────────────────────────────────────────────────
// Table: dreamai_daily_usage (user_id, user_type, surface, date, count)
// surface: 'whatsapp' | 'inapp'
// Resets daily at midnight IST. Founding period applies Signature caps to Lite brides for 30 days.

function getDailyQuotaCap(tier, surface, isFoundingPeriod) {
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
}

async function checkAndIncrementDailyUsage(userId, userType, surface, tier, foundingBride, createdAt) {
  try {
    const todayIST = new Date(Date.now() + (5.5 * 3600 * 1000)).toISOString().slice(0, 10);

    // Check founding period (30 days from signup)
    let isFoundingPeriod = false;
    if (foundingBride && createdAt) {
      const signupDate = new Date(createdAt);
      const daysSinceSignup = (Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24);
      isFoundingPeriod = daysSinceSignup <= 30;
    }

    const cap = getDailyQuotaCap(tier, surface, isFoundingPeriod);

    // Fetch today's usage
    const { data: existing } = await supabase
      .from("dreamai_daily_usage")
      .select("id, count")
      .eq("user_id", userId)
      .eq("user_type", userType)
      .eq("surface", surface)
      .eq("date", todayIST)
      .maybeSingle();

    const currentCount = existing ? (existing.count || 0) : 0;

    if (currentCount >= cap) {
      return { allowed: false, used: currentCount, cap, isFoundingPeriod };
    }

    // Increment
    if (existing) {
      await supabase
        .from("dreamai_daily_usage")
        .update({ count: currentCount + 1 })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("dreamai_daily_usage")
        .insert([{ user_id: userId, user_type: userType, surface, date: todayIST, count: 1 }]);
    }

    return { allowed: true, used: currentCount + 1, cap, isFoundingPeriod };
  } catch (e) {
    // Never block on quota error — fail open and log
    console.error("[quota] checkAndIncrementDailyUsage error:", e.message);
    return { allowed: true, used: 0, cap: 999, isFoundingPeriod: false };
  }
}

// Helper: check AI quota for a vendor based on tier
function getAiQuota(vendor) {"""

assert content.count(OLD_VENDOR_QUOTA_COMMENT) == 1, f"Anchor 1 not found — count: {content.count(OLD_VENDOR_QUOTA_COMMENT)}"
content = content.replace(OLD_VENDOR_QUOTA_COMMENT, NEW_DAILY_QUOTA_HELPERS)
print("✅ Insertion 1: Daily quota helpers added")

# ─────────────────────────────────────────────────────────────
# INSERTION 2: Couple quota check in /api/v2/dreamai/chat
# Insert AFTER the vendor quota block, BEFORE ANTHROPIC_API_KEY check
# ─────────────────────────────────────────────────────────────

OLD_AFTER_VENDOR_QUOTA = """    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
    if (!ANTHROPIC_API_KEY) return res.status(500).json({ success: false, error: 'DreamAi not configured' });"""

NEW_COUPLE_INAPP_QUOTA = """    }

    // COUPLE in-app daily quota enforcement
    if (userId && userType === "couple") {
      const { data: coupleForQuota } = await supabase
        .from("users")
        .select("couple_tier, founding_bride, created_at")
        .eq("id", userId)
        .maybeSingle();

      if (coupleForQuota) {
        const tier = coupleForQuota.couple_tier || "lite";
        const quotaResult = await checkAndIncrementDailyUsage(
          userId, "couple", "inapp",
          tier,
          coupleForQuota.founding_bride || false,
          coupleForQuota.created_at
        );

        if (!quotaResult.allowed) {
          const isFoundingMsg = quotaResult.isFoundingPeriod
            ? " You're in your founding period — enjoy Signature-tier access for your first 30 days."
            : "";
          return res.json({
            success: true,
            reply: "You've used all your DreamAi messages for today (" + quotaResult.cap + " on your current plan)." + isFoundingMsg + " Your limit resets at midnight IST. Need more capacity? Upgrade your plan or top up tokens at app.thedreamwedding.in/tokens.",
            quota_exceeded: true,
          });
        }
      }
    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
    if (!ANTHROPIC_API_KEY) return res.status(500).json({ success: false, error: 'DreamAi not configured' });"""

assert content.count(OLD_AFTER_VENDOR_QUOTA) == 1, f"Anchor 2 not found — count: {content.count(OLD_AFTER_VENDOR_QUOTA)}"
content = content.replace(OLD_AFTER_VENDOR_QUOTA, NEW_COUPLE_INAPP_QUOTA)
print("✅ Insertion 2: Couple in-app quota enforcement added")

# ─────────────────────────────────────────────────────────────
# INSERTION 3: Couple WhatsApp daily quota check
# Insert just before the agentic loop in the WhatsApp handler
# ─────────────────────────────────────────────────────────────

OLD_WA_AGENTIC_ANCHOR = """          // Run agentic loop (same as in-app, max 3 iterations for WhatsApp)
          const waMessages = [{ role: 'user', content: body }];"""

NEW_WA_WITH_QUOTA = """          // Daily WhatsApp quota check
          const { data: coupleForWaQuota } = await supabase
            .from("users")
            .select("couple_tier, founding_bride, created_at")
            .eq("id", couple.id)
            .maybeSingle();

          const waQuotaTier = coupleForWaQuota ? (coupleForWaQuota.couple_tier || "lite") : "lite";
          const waQuotaResult = await checkAndIncrementDailyUsage(
            couple.id, "couple", "whatsapp",
            waQuotaTier,
            coupleForWaQuota ? (coupleForWaQuota.founding_bride || false) : false,
            coupleForWaQuota ? coupleForWaQuota.created_at : null
          );

          if (!waQuotaResult.allowed) {
            await sendWhatsApp(fromPhone, "You've used your DreamAi WhatsApp messages for today (" + waQuotaResult.cap + " on your current plan). Open TDW to continue with in-app DreamAi (which has separate, higher limits) or wait until midnight IST. Need more? Top up tokens at app.thedreamwedding.in/tokens.");
            return;
          }

          // Run agentic loop (same as in-app, max 3 iterations for WhatsApp)
          const waMessages = [{ role: 'user', content: body }];"""

assert content.count(OLD_WA_AGENTIC_ANCHOR) == 1, f"Anchor 3 not found — count: {content.count(OLD_WA_AGENTIC_ANCHOR)}"
content = content.replace(OLD_WA_AGENTIC_ANCHOR, NEW_WA_WITH_QUOTA)
print("✅ Insertion 3: Couple WhatsApp quota enforcement added")

with open(path, 'w') as f:
    f.write(content)

print("\nAll done. Run: node --check backend/server.js && echo SYNTAX OK")
