#!/usr/bin/env python3
"""
PATCH B-2 — false-confirmation prevention + overpayment math

Two fixes in one patch.

(1) System prompt: explicit rule against narrating success without a real
    tool call, and against fabricating data (vendor names, expense IDs,
    dates). The morning audit (May 10) showed Haiku saying "Done. Swati R is
    on your list" without calling book_vendor, and inventing "Swati Rani"
    as a disambiguation option that didn't exist in the DB.

(2) Overpayment math: log_payment and settle_balance both currently say
    "Fully settled" when paid exceeds planned. They should detect overpay
    and surface it: "Overpaid by ₹X — want me to update the planned
    amount?"

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

# ─── Replacement 1: System prompt — TRUTHFUL CONFIRMATIONS rule ───
# Inserted right before "KEEP REPLIES SHORT." which sits at the end of the
# prompt body just before the routingContext interpolation.

OLD_1 = """UPDATE BEHAVIOR:
- Updates are NOT confirm-required (small edits don't need ceremony).
- If the bride's match phrase narrows to multiple rows, ask which one before updating.
- After a successful update, narrate briefly: "Updated Swati — phone."

KEEP REPLIES SHORT."""

NEW_1 = """UPDATE BEHAVIOR:
- Updates are NOT confirm-required (small edits don't need ceremony).
- If the bride's match phrase narrows to multiple rows, ask which one before updating.
- After a successful update, narrate briefly: "Updated Swati — phone."

TRUTHFUL CONFIRMATIONS (CRITICAL):
NEVER narrate a successful action with words like 'Done', 'Saved', 'Logged', 'Added' unless you have actually called the corresponding tool and received a result with ok: true. If you cannot call any tool that fits the bride's intent, say so plainly: "I can't quite do that yet — would you like me to do X instead?" Never invent vendor names, expense IDs, dates, or other data to appear helpful. When tools return kind: 'clarify' or kind: 'unsure', surface those results exactly — do not paraphrase or fabricate. If you find yourself wanting to list multiple options to the bride, that is a clarify situation — call the corresponding tool with proper input, never make up the list yourself.

KEEP REPLIES SHORT."""

assert src.count(OLD_1) == 1, f"OLD_1 expected exactly 1 match, got {src.count(OLD_1)}"
src = src.replace(OLD_1, NEW_1)
print("[1/3] system prompt — TRUTHFUL CONFIRMATIONS rule added")

# ─── Replacement 2: log_payment overpayment math ───
# Currently: newStatus = paid if newActual >= planned, else pending.
#            Reply: "Fully settled" if remaining=0, else "Balance remaining: X".
# When paid > planned, both fire wrong: marked paid, says "Fully settled".
# Fix: detect overpayment, surface it, offer to update the planned amount.

OLD_2 = """        const target = matches[0];
        const newActual = (target.actual_amount || 0) + amount;
        const newStatus = newActual >= (target.planned_amount || 0) ? 'paid' : 'pending';
        const mergedNotes = note
          ? (target.notes ? target.notes + ' | ' + note : note)
          : target.notes;
        const { error: updateErr } = await supabase.from('couple_expenses').update({
          actual_amount: newActual,
          payment_status: newStatus,
          notes: mergedNotes,
          updated_at: new Date().toISOString(),
        }).eq('id', target.id);
        if (updateErr) throw updateErr;
        const remaining = Math.max(0, (target.planned_amount || 0) - newActual);
        const summaryLines = [
          `Payment of ${formatINR(amount)} recorded`,
          `Total paid: ${formatINR(newActual)} of ${formatINR(target.planned_amount || 0)}`,
          remaining > 0 ? `Balance remaining: ${formatINR(remaining)}` : 'Fully settled',
        ];
        const followups = remaining > 0 ? [{
          id: 'log_payment_remind_me',
          text: `Want me to remind you when the next payment is due?`,
          yesLabel: 'Yes, set reminder',
          noLabel: 'Not now',
        }] : [];
        return {
          ok: true,
          kind: 'composite',
          reply: `✓ ${formatINR(amount)} logged for ${target.vendor_name}.`,
          confirmPreview: null,
          summaryLines,
          followupPrompts: followups,
          // FIX-3: return expense_id for anchor routing
          expense_id: target.id,
        };
      }"""

NEW_2 = """        const target = matches[0];
        const newActual = (target.actual_amount || 0) + amount;
        const planned = target.planned_amount || 0;
        const newStatus = newActual >= planned ? 'paid' : 'pending';
        const mergedNotes = note
          ? (target.notes ? target.notes + ' | ' + note : note)
          : target.notes;
        const { error: updateErr } = await supabase.from('couple_expenses').update({
          actual_amount: newActual,
          payment_status: newStatus,
          notes: mergedNotes,
          updated_at: new Date().toISOString(),
        }).eq('id', target.id);
        if (updateErr) throw updateErr;
        // PATCH B-2: detect overpayment and surface it instead of "Fully settled".
        const overpaid = newActual > planned && planned > 0 ? newActual - planned : 0;
        const remaining = Math.max(0, planned - newActual);
        const summaryLines = [
          `Payment of ${formatINR(amount)} recorded`,
          `Total paid: ${formatINR(newActual)} of ${formatINR(planned)}`,
          overpaid > 0
            ? `Overpaid by ${formatINR(overpaid)} — the planned amount may be out of date`
            : (remaining > 0 ? `Balance remaining: ${formatINR(remaining)}` : 'Fully settled'),
        ];
        const followups = overpaid > 0
          ? [{
              id: 'log_payment_update_planned',
              text: `Total paid is more than planned. Want me to update the planned amount to ${formatINR(newActual)}?`,
              yesLabel: 'Yes, update',
              noLabel: 'Leave as is',
            }]
          : (remaining > 0 ? [{
              id: 'log_payment_remind_me',
              text: `Want me to remind you when the next payment is due?`,
              yesLabel: 'Yes, set reminder',
              noLabel: 'Not now',
            }] : []);
        return {
          ok: true,
          kind: 'composite',
          reply: overpaid > 0
            ? `✓ ${formatINR(amount)} logged for ${target.vendor_name}. Note: paid is now ${formatINR(overpaid)} over the planned amount.`
            : `✓ ${formatINR(amount)} logged for ${target.vendor_name}.`,
          confirmPreview: null,
          summaryLines,
          followupPrompts: followups,
          // FIX-3: return expense_id for anchor routing
          expense_id: target.id,
        };
      }"""

assert src.count(OLD_2) == 1, f"OLD_2 expected exactly 1 match, got {src.count(OLD_2)}"
src = src.replace(OLD_2, NEW_2)
print("[2/3] log_payment overpayment math added")

# ─── Replacement 3: settle_balance overpayment math ───
# settle_balance always sets actual_amount = planned (or amount_override) and
# marks paid. If amount_override > planned, that's an overpayment but the
# current code silently accepts it. Mirror the log_payment surfacing.

OLD_3 = """        const target = matches[0];
        const settleAmount = amount_override != null ? amount_override : (target.planned_amount || 0);
        const { error: expErr } = await supabase.from('couple_expenses').update({
          actual_amount: settleAmount,
          payment_status: 'paid',
          updated_at: new Date().toISOString(),
        }).eq('id', target.id);
        if (expErr) throw expErr;
        await supabase.from('couple_vendors').update({
          status: 'paid',
          source: 'dreamai',
          last_dreamai_action: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('couple_id', coupleId).ilike('name', `%${vendor_name}%`);
        await supabase.from('couple_checklist').delete()
          .eq('couple_id', coupleId)
          .eq('is_custom', true)
          .ilike('text', `%balance%${vendor_name}%`);
        return {
          ok: true,
          kind: 'composite',
          reply: `✓ ${target.vendor_name} fully settled.`,
          confirmPreview: null,
          summaryLines: [
            `Final payment of ${formatINR(settleAmount)} recorded`,
            `Vendor marked as paid`,
            `Balance reminder cleared`,
          ],
          followupPrompts: [{
            id: 'settle_thank_you',
            text: `Want me to draft a thank-you note for ${target.vendor_name}?`,
            yesLabel: 'Yes, draft it',
            noLabel: 'Not now',
          }],
          // FIX-3: return expense_id for anchor routing — long-press jumps to expense
          expense_id: target.id,
        };
      }"""

NEW_3 = """        const target = matches[0];
        const settleAmount = amount_override != null ? amount_override : (target.planned_amount || 0);
        const planned = target.planned_amount || 0;
        // PATCH B-2: detect overpayment on settle (only meaningful when bride
        // passed amount_override > planned — naked settle uses planned itself).
        const overpaid = settleAmount > planned && planned > 0 ? settleAmount - planned : 0;
        const { error: expErr } = await supabase.from('couple_expenses').update({
          actual_amount: settleAmount,
          payment_status: 'paid',
          updated_at: new Date().toISOString(),
        }).eq('id', target.id);
        if (expErr) throw expErr;
        await supabase.from('couple_vendors').update({
          status: 'paid',
          source: 'dreamai',
          last_dreamai_action: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('couple_id', coupleId).ilike('name', `%${vendor_name}%`);
        await supabase.from('couple_checklist').delete()
          .eq('couple_id', coupleId)
          .eq('is_custom', true)
          .ilike('text', `%balance%${vendor_name}%`);
        const settleSummary = [
          `Final payment of ${formatINR(settleAmount)} recorded`,
          `Vendor marked as paid`,
          `Balance reminder cleared`,
        ];
        if (overpaid > 0) {
          settleSummary.push(`Overpaid by ${formatINR(overpaid)} — the planned amount may be out of date`);
        }
        const settleFollowups = overpaid > 0
          ? [{
              id: 'settle_update_planned',
              text: `Total paid is more than planned. Want me to update the planned amount to ${formatINR(settleAmount)}?`,
              yesLabel: 'Yes, update',
              noLabel: 'Leave as is',
            }, {
              id: 'settle_thank_you',
              text: `Want me to draft a thank-you note for ${target.vendor_name}?`,
              yesLabel: 'Yes, draft it',
              noLabel: 'Not now',
            }]
          : [{
              id: 'settle_thank_you',
              text: `Want me to draft a thank-you note for ${target.vendor_name}?`,
              yesLabel: 'Yes, draft it',
              noLabel: 'Not now',
            }];
        return {
          ok: true,
          kind: 'composite',
          reply: overpaid > 0
            ? `✓ ${target.vendor_name} settled. Note: total paid is ${formatINR(overpaid)} over the planned amount.`
            : `✓ ${target.vendor_name} fully settled.`,
          confirmPreview: null,
          summaryLines: settleSummary,
          followupPrompts: settleFollowups,
          // FIX-3: return expense_id for anchor routing — long-press jumps to expense
          expense_id: target.id,
        };
      }"""

assert src.count(OLD_3) == 1, f"OLD_3 expected exactly 1 match, got {src.count(OLD_3)}"
src = src.replace(OLD_3, NEW_3)
print("[3/3] settle_balance overpayment math added")

# ─── Sentinel ───
SENTINEL = "// ─── PATCH B-2 LOADED ─── //\n"
if SENTINEL not in src:
    src = src.rstrip() + "\n\n" + SENTINEL

with open(TARGET, 'w', encoding='utf-8') as f:
    f.write(src)

print(f"\nWrote {TARGET}")
print(f"Size delta: {len(src) - orig_len:+d} bytes")
print("\nNow run:  node --check backend/server.js")
