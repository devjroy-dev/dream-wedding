#!/usr/bin/env python3
"""
PATCH B-4 — quoted_total ↔ planned_amount drift detection (Part A)

When the bride edits a vendor's quote, an expense's planned amount, or
adds a new expense against an existing vendor, the budget math can drift:
the vendor's `quoted_total` and the sum of linked expense `planned_amount`
rows stop agreeing.

Bug 4 from May 10 morning audit. Patches:

(1) New helper: checkBudgetDrift(coupleId, vendorName) — looks up the
    vendor row, sums linked expense planned_amounts, returns drift info.

(2) New Map: pendingDriftResolves — stores the proposed fix until the
    bride taps Yes/No on the followup pill (10 min TTL, mirrors existing
    pendingBookings/Payments pattern).

(3) update_vendor — when quoted_total is in the update payload, after the
    write, run drift check. If drift > 0, append heads-up to reply and
    add a followup pill offering to add/adjust an expense row (vendor
    side is source of truth).

(4) update_expense — when planned_amount is in the update payload, after
    the write, run drift check. If drift, offer to bump vendor quote
    (this is the exception — bride edited expense, so expense side may
    be the new truth).

(5) add_expense — when vendor_name is given AND a matching vendor exists
    with quoted_total > 0, after the write, run drift check. Offer to
    bump vendor quote.

(6) bride-followup — new branches matching drift_resolve_* prompt_ids
    that read from pendingDriftResolves and execute the appropriate
    write. Returns a confirmation reply.

Validates: node --check backend/server.js
"""
import os
import sys

REPO = os.environ.get('TDW_REPO', '/workspaces/dream-wedding')
TARGET = os.path.join(REPO, 'backend', 'server.js')

if not os.path.exists(TARGET):
    print(f"ERROR: cannot find {TARGET}")
    print("Set TDW_REPO env var to the dream-wedding repo root.")
    sys.exit(1)

with open(TARGET, 'r', encoding='utf-8') as f:
    src = f.read()

orig_len = len(src)

# ─── Replacement 1: declare pendingDriftResolves Map + add helper ───
# Insert right after pendingReminderDeletes and before formatINR.

OLD_1 = """// Phase 1.6: destructive delete dry-run gates.
const pendingVendorDeletes   = new Map();
const pendingExpenseDeletes  = new Map();
const pendingReminderDeletes = new Map();

function formatINR(amount) {"""

NEW_1 = """// Phase 1.6: destructive delete dry-run gates.
const pendingVendorDeletes   = new Map();
const pendingExpenseDeletes  = new Map();
const pendingReminderDeletes = new Map();
// PATCH B-4: drift resolves — the bride taps Yes on a "want me to add a
// balance row?" / "want me to bump Swati's quote?" followup pill, the
// followup handler reads the proposed fix from this Map and writes it.
const pendingDriftResolves = new Map();

// PATCH B-4: budget drift detector. Returns null if vendor not found or no
// quote set, otherwise { vendor, expenseSum, drift, direction }.
//
//   drift = quoted_total - expenseSum
//   drift > 0 → expenses are LESS than the contract (need a balance row added)
//   drift < 0 → expenses are MORE than the contract (vendor quote may be stale)
//   drift = 0 → no drift, return null so callers can early-out
//
// Vendor's quoted_total is the source of truth (the contract). Expense rows
// are bookkeeping. So when drift is positive, we offer to add an expense to
// match the contract. When drift is negative AND the bride just edited an
// expense (or added one), we offer to bump the vendor quote — the bride
// reported the new spend, and that may be the true new total.
async function checkBudgetDrift(coupleId, vendorName) {
  if (!vendorName) return null;
  const { data: vendors } = await supabase
    .from('couple_vendors')
    .select('id, name, quoted_total, category')
    .eq('couple_id', coupleId)
    .ilike('name', '%' + vendorName + '%');
  if (!vendors || vendors.length !== 1) return null; // skip if no match or ambiguous
  const vendor = vendors[0];
  const quoted = Number(vendor.quoted_total) || 0;
  if (quoted === 0) return null; // no quote set → no drift to detect
  const { data: expenses } = await supabase
    .from('couple_expenses')
    .select('planned_amount, payment_status')
    .eq('couple_id', coupleId)
    .ilike('vendor_name', '%' + vendor.name + '%');
  const expenseSum = (expenses || []).reduce((s, e) => s + (Number(e.planned_amount) || 0), 0);
  const drift = quoted - expenseSum;
  if (Math.abs(drift) < 1) return null; // tolerate sub-rupee rounding
  return {
    vendor,
    expenseSum,
    drift,
    direction: drift > 0 ? 'add_balance' : 'bump_quote',
  };
}

function formatINR(amount) {"""

assert src.count(OLD_1) == 1, f"OLD_1 expected 1 match, got {src.count(OLD_1)}"
src = src.replace(OLD_1, NEW_1)
print("[1/6] pendingDriftResolves Map + checkBudgetDrift helper added")

# ─── Replacement 2: update_vendor drift check ───
# Modify the success return to (a) await the drift check, (b) append a
# heads-up to reply if drift, (c) add a followup pill with prompt_id
# 'drift_resolve_<action_id>'.

OLD_2 = """        const fields = Object.keys(updates).filter(k => k !== 'updated_at');
        const fieldsLabel = fields.join(', ');
        return {
          ok: true, kind: 'reply',
          reply: `Updated ${matches[0].name} — ${fieldsLabel}.`,
          vendor_id: matches[0].id,
          tool_anchor: { tool: 'vendors', entity_type: 'vendor', entity_id: String(matches[0].id) },
        };
      }

      case 'update_expense': {"""

NEW_2 = """        const fields = Object.keys(updates).filter(k => k !== 'updated_at');
        const fieldsLabel = fields.join(', ');
        // PATCH B-4: when quoted_total changes, check for drift against summed
        // expense planned_amounts. If drift exists, surface it and offer fix.
        let driftReply = '';
        let driftFollowups = [];
        if (quoted_total != null) {
          try {
            const drift = await checkBudgetDrift(coupleId, matches[0].name);
            if (drift) {
              const action_id = 'drift_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
              if (drift.direction === 'add_balance') {
                pendingDriftResolves.set(action_id, {
                  coupleId,
                  kind: 'add_balance',
                  vendor_id: drift.vendor.id,
                  vendor_name: drift.vendor.name,
                  category: drift.vendor.category || 'other',
                  amount: drift.drift,
                });
                driftReply = ` Heads up: planned expenses for ${drift.vendor.name} sum to ${formatINR(drift.expenseSum)}, ${formatINR(drift.drift)} less than the new quote.`;
                driftFollowups = [{
                  id: 'drift_resolve_' + action_id,
                  text: `Want me to add a ${formatINR(drift.drift)} balance-due row?`,
                  yesLabel: 'Yes, add it',
                  noLabel: 'Leave as is',
                }];
              } else {
                pendingDriftResolves.set(action_id, {
                  coupleId,
                  kind: 'bump_quote',
                  vendor_id: drift.vendor.id,
                  vendor_name: drift.vendor.name,
                  new_quoted_total: drift.expenseSum,
                });
                driftReply = ` Heads up: planned expenses for ${drift.vendor.name} sum to ${formatINR(drift.expenseSum)}, ${formatINR(-drift.drift)} more than the new quote.`;
                driftFollowups = [{
                  id: 'drift_resolve_' + action_id,
                  text: `Want me to bump ${drift.vendor.name}'s quote to ${formatINR(drift.expenseSum)}?`,
                  yesLabel: 'Yes, bump it',
                  noLabel: 'Leave as is',
                }];
              }
              setTimeout(() => pendingDriftResolves.delete(action_id), 10 * 60 * 1000);
            }
          } catch (e) { /* drift check failures should never block the main update */ }
        }
        return {
          ok: true, kind: 'reply',
          reply: `Updated ${matches[0].name} — ${fieldsLabel}.` + driftReply,
          vendor_id: matches[0].id,
          tool_anchor: { tool: 'vendors', entity_type: 'vendor', entity_id: String(matches[0].id) },
          followupPrompts: driftFollowups,
        };
      }

      case 'update_expense': {"""

assert src.count(OLD_2) == 1, f"OLD_2 expected 1 match, got {src.count(OLD_2)}"
src = src.replace(OLD_2, NEW_2)
print("[2/6] update_vendor drift check added")

# ─── Replacement 3: update_expense drift check ───
# Bride edited an expense's planned_amount. The new expense sum may now
# differ from the vendor's quoted_total. Offer to bump the vendor quote.

OLD_3 = """        const label = matches[0].vendor_name || matches[0].description || 'expense';
        return {
          ok: true, kind: 'reply',
          reply: `Updated ${label}.`,
          expense_id: matches[0].id,
          tool_anchor: { tool: 'money', entity_type: 'expense', entity_id: String(matches[0].id) },
        };
      }

      case 'update_reminder': {"""

NEW_3 = """        const label = matches[0].vendor_name || matches[0].description || 'expense';
        // PATCH B-4: when planned_amount changes, check vendor-side drift.
        let driftReply = '';
        let driftFollowups = [];
        if (new_planned_amount != null && matches[0].vendor_name) {
          try {
            const drift = await checkBudgetDrift(coupleId, matches[0].vendor_name);
            if (drift) {
              const action_id = 'drift_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
              // After an expense edit, prefer offering to update the vendor quote
              // (bride just reported the new expense reality).
              pendingDriftResolves.set(action_id, {
                coupleId,
                kind: 'bump_quote',
                vendor_id: drift.vendor.id,
                vendor_name: drift.vendor.name,
                new_quoted_total: drift.expenseSum,
              });
              if (drift.direction === 'add_balance') {
                driftReply = ` Heads up: ${drift.vendor.name}'s quote (${formatINR(drift.vendor.quoted_total)}) is now ${formatINR(drift.drift)} more than the planned-expense total.`;
                driftFollowups = [{
                  id: 'drift_resolve_' + action_id,
                  text: `Want me to lower ${drift.vendor.name}'s quote to ${formatINR(drift.expenseSum)}?`,
                  yesLabel: 'Yes, lower it',
                  noLabel: 'Leave as is',
                }];
              } else {
                driftReply = ` Heads up: planned expenses for ${drift.vendor.name} now sum to ${formatINR(drift.expenseSum)}, ${formatINR(-drift.drift)} more than her quote.`;
                driftFollowups = [{
                  id: 'drift_resolve_' + action_id,
                  text: `Want me to bump ${drift.vendor.name}'s quote to ${formatINR(drift.expenseSum)}?`,
                  yesLabel: 'Yes, bump it',
                  noLabel: 'Leave as is',
                }];
              }
              setTimeout(() => pendingDriftResolves.delete(action_id), 10 * 60 * 1000);
            }
          } catch (e) { /* swallow drift errors */ }
        }
        return {
          ok: true, kind: 'reply',
          reply: `Updated ${label}.` + driftReply,
          expense_id: matches[0].id,
          tool_anchor: { tool: 'money', entity_type: 'expense', entity_id: String(matches[0].id) },
          followupPrompts: driftFollowups,
        };
      }

      case 'update_reminder': {"""

assert src.count(OLD_3) == 1, f"OLD_3 expected 1 match, got {src.count(OLD_3)}"
src = src.replace(OLD_3, NEW_3)
print("[3/6] update_expense drift check added")

# ─── Replacement 4: add_expense drift check ───
# Bride added an ad-hoc expense tagged to a vendor. If that vendor exists
# with a quote, drift check fires. Offer to bump vendor quote.

OLD_4 = """        return {
          ok: true,
          kind: 'composite',
          reply: `✓ ${formatINR(amount)} logged for ${description}.`,
          confirmPreview: null,
          summaryLines: [
            `${formatINR(amount)} — ${description}`,
            vendor_name ? `Vendor: ${vendor_name}` : 'No vendor tagged',
            `Marked as paid`,
          ],
          followupPrompts: [{
            id: 'add_expense_remind_me',
            text: `Want me to remind you about this when budget review comes up?`,
            yesLabel: 'Yes',
            noLabel: 'Not now',
          }],
          expense_id: row?.id,
        };
      }

      // ── ZIP 8: read_circle_thread (confirm-not-required, read-only) ──"""

NEW_4 = """        // PATCH B-4: if vendor_name was tagged AND that vendor has a quote,
        // check drift. The new expense almost always pushes expense sum
        // higher than the quote. Offer to bump the vendor quote.
        let addDriftReply = '';
        let addDriftFollowups = [{
          id: 'add_expense_remind_me',
          text: `Want me to remind you about this when budget review comes up?`,
          yesLabel: 'Yes',
          noLabel: 'Not now',
        }];
        if (vendor_name) {
          try {
            const drift = await checkBudgetDrift(coupleId, vendor_name);
            if (drift && drift.direction === 'bump_quote') {
              const action_id = 'drift_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
              pendingDriftResolves.set(action_id, {
                coupleId,
                kind: 'bump_quote',
                vendor_id: drift.vendor.id,
                vendor_name: drift.vendor.name,
                new_quoted_total: drift.expenseSum,
              });
              addDriftReply = ` Heads up: planned expenses for ${drift.vendor.name} now sum to ${formatINR(drift.expenseSum)}, ${formatINR(-drift.drift)} more than her quote (${formatINR(drift.vendor.quoted_total)}).`;
              // Replace the generic "remind me" followup with the drift one —
              // it's higher signal and we don't want to overwhelm with two pills.
              addDriftFollowups = [{
                id: 'drift_resolve_' + action_id,
                text: `Want me to bump ${drift.vendor.name}'s quote to ${formatINR(drift.expenseSum)}?`,
                yesLabel: 'Yes, bump it',
                noLabel: 'Leave as is',
              }];
              setTimeout(() => pendingDriftResolves.delete(action_id), 10 * 60 * 1000);
            }
          } catch (e) { /* swallow drift errors */ }
        }
        return {
          ok: true,
          kind: 'composite',
          reply: `✓ ${formatINR(amount)} logged for ${description}.` + addDriftReply,
          confirmPreview: null,
          summaryLines: [
            `${formatINR(amount)} — ${description}`,
            vendor_name ? `Vendor: ${vendor_name}` : 'No vendor tagged',
            `Marked as paid`,
          ],
          followupPrompts: addDriftFollowups,
          expense_id: row?.id,
        };
      }

      // ── ZIP 8: read_circle_thread (confirm-not-required, read-only) ──"""

assert src.count(OLD_4) == 1, f"OLD_4 expected 1 match, got {src.count(OLD_4)}"
src = src.replace(OLD_4, NEW_4)
print("[4/6] add_expense drift check added")

# ─── Replacement 5: bride-followup handler — drift_resolve branch ───
# Add the branch that actually performs the write when bride taps Yes.

OLD_5 = """    if (answer === 'no') {
      // Honor the no — gentle close
      reply = '✦ Got it.';
    } else if (prompt_id === 'thank_you_note') {"""

NEW_5 = """    if (answer === 'no') {
      // Honor the no — gentle close
      reply = '✦ Got it.';
    } else if (prompt_id && prompt_id.startsWith('drift_resolve_')) {
      // PATCH B-4: bride tapped Yes on a drift fix. Look up the proposed
      // fix from pendingDriftResolves and execute the write.
      const action_id = prompt_id.slice('drift_resolve_'.length);
      const proposal = pendingDriftResolves.get(action_id);
      if (!proposal) {
        reply = "✦ That moment passed. Tell me again what you'd like to fix?";
      } else {
        pendingDriftResolves.delete(action_id);
        try {
          if (proposal.kind === 'add_balance') {
            // Insert a balance-due expense row to match the new vendor quote.
            const { error: insErr } = await supabase.from('couple_expenses').insert([{
              couple_id: proposal.coupleId,
              event: 'general',
              category: proposal.category || 'other',
              vendor_name: proposal.vendor_name,
              description: 'Balance to match updated quote',
              planned_amount: proposal.amount,
              actual_amount: 0,
              payment_status: 'pending',
              notes: 'Added by DreamAi to reconcile vendor quote drift',
            }]);
            if (insErr) throw insErr;
            reply = `✦ Added ${formatINR(proposal.amount)} balance row for ${proposal.vendor_name}. Numbers match now.`;
          } else if (proposal.kind === 'bump_quote') {
            // Update vendor quoted_total to match the expense sum.
            const { error: updErr } = await supabase.from('couple_vendors').update({
              quoted_total: proposal.new_quoted_total,
              source: 'dreamai',
              last_dreamai_action: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('id', proposal.vendor_id);
            if (updErr) throw updErr;
            reply = `✦ Updated ${proposal.vendor_name}'s quote to ${formatINR(proposal.new_quoted_total)}. Numbers match now.`;
          } else {
            reply = '✦ Done.';
          }
        } catch (err) {
          console.error('[Bride DreamAi] drift resolve error:', err.message);
          reply = "✦ Something went sideways trying to fix that. Try once more?";
        }
      }
    } else if (prompt_id === 'thank_you_note') {"""

assert src.count(OLD_5) == 1, f"OLD_5 expected 1 match, got {src.count(OLD_5)}"
src = src.replace(OLD_5, NEW_5)
print("[5/6] bride-followup drift_resolve_ branch added")

# ─── Replacement 6: system prompt heads-up about drift behaviour ───
# A short rule so Haiku knows the drift detection happens automatically and
# doesn't try to surface it itself. Goes in the WHEN TO USE WHICH TOOL block.

OLD_6 = """- "The lehenga was 75k not 65k", "Mark Swati's advance as paid" → update_expense"""

NEW_6 = """- "The lehenga was 75k not 65k", "Mark Swati's advance as paid" → update_expense
  · Note: when you change a vendor's quote OR an expense's planned amount, the system automatically detects budget drift and may append a heads-up + Yes/No followup to your reply. You don't need to mention or pre-empt this — it's automatic and the bride sees it as part of the response."""

assert src.count(OLD_6) == 1, f"OLD_6 expected 1 match, got {src.count(OLD_6)}"
src = src.replace(OLD_6, NEW_6)
print("[6/6] system prompt drift-awareness note added")

# ─── Sentinel ───
SENTINEL = "// ─── PATCH B-4 LOADED ─── //\n"
if SENTINEL not in src:
    src = src.rstrip() + "\n\n" + SENTINEL

with open(TARGET, 'w', encoding='utf-8') as f:
    f.write(src)

print(f"\nWrote {TARGET}")
print(f"Size delta: {len(src) - orig_len:+d} bytes")
print("\nNow run:  node --check backend/server.js")
