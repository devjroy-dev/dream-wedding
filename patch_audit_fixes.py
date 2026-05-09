#!/usr/bin/env python3
"""
patch_audit_fixes.py

Six backend fixes for backend/server.js (the file Railway runs).
All Python string-replacement, all idempotent, all asserted unique before
write. node --check at the end.

Fixes applied:

  1. confirmPreview bubble-through in bride-chat
     The handler initialises `let confirmPreview = null;` and never assigns
     to it from tool results. Fixes by adding the assignment in the tool
     loop. Tools that return confirmPreview (broadcast_to_circle,
     ocr_receipt) will now surface to the bride's UI.

  2. Add `add_expense` to FROST_BRIDE_TOOLS
     Bride says "I just spent 5k on flowers" — currently nothing happens
     because the tool isn't registered. The system prompt already
     references it. Adding the tool definition + executor case.

  3. Return entity IDs from book_vendor / log_payment / settle_balance
     The toolAnchors logic in bride-chat checks `toolResult.vendor_id`
     etc. but these tools don't include those fields in their returns.
     Adding them so anchors fire.

  4. Dry-run + pendingBookings/Payments/Settles for the three destructive tools
     Right now book_vendor writes 4 Supabase rows, log_payment updates an
     expense, settle_balance updates 3+ rows — all immediately, no preview.
     Adding pending Maps + dry-run branches so the bride sees a confirm
     card first. Adds confirm handlers to /api/v2/dreamai/bride-confirm.

  5. Just Explore shape fix
     `/api/v2/exploring-photos` returns { photos: [...] }. Two native
     consumers (blind-swipe, discover/feed) check `d.success` which is
     undefined and skip rendering. Adding `success: true` to the response.

  6. Discover heroes public-read limit bump
     `.limit(5)` → `.limit(20)` so the admin can upload more than 5.
"""

import sys, pathlib, subprocess, re

PATH = pathlib.Path('/workspaces/dream-wedding/backend/server.js')


def must_replace(src: str, old: str, new: str, name: str) -> str:
    """String-replace asserting uniqueness. Aborts if old appears 0 or 2+ times."""
    count = src.count(old)
    if count == 0:
        raise SystemExit(f"ERROR [{name}]: old string not found. Aborting.")
    if count > 1:
        raise SystemExit(f"ERROR [{name}]: old string matches {count} places. Disambiguate.")
    return src.replace(old, new, 1)


def already_applied(src: str, marker: str) -> bool:
    """Check whether a unique post-fix marker is present."""
    return marker in src


def main():
    if not PATH.exists():
        raise SystemExit(f"ERROR: {PATH} not found.")

    src = PATH.read_text()

    # ─────────────────────────────────────────────────────────────────────
    # FIX 1 — confirmPreview bubble-through in bride-chat
    # ─────────────────────────────────────────────────────────────────────
    fix1_marker = "// FIX-1: bubble confirmPreview from toolResult"
    if already_applied(src, fix1_marker):
        print("Fix 1 [confirmPreview bubble]: already applied.")
    else:
        old = """        if (toolResult && toolResult.reply) {
          replyText += (replyText ? '\\n\\n' : '') + toolResult.reply;
        }
        if (toolResult && toolResult.followupPrompts) {
          followupPrompts = toolResult.followupPrompts;
        }
        if (toolResult && toolResult.summaryLines) {
          summaryLines = toolResult.summaryLines;
        }"""
        new = """        if (toolResult && toolResult.reply) {
          replyText += (replyText ? '\\n\\n' : '') + toolResult.reply;
        }
        if (toolResult && toolResult.followupPrompts) {
          followupPrompts = toolResult.followupPrompts;
        }
        if (toolResult && toolResult.summaryLines) {
          summaryLines = toolResult.summaryLines;
        }
        // FIX-1: bubble confirmPreview from toolResult so the frontend can render
        // the FrostConfirmCard. Previously confirmPreview was initialised to null
        // and never reassigned — broadcast_to_circle and ocr_receipt's confirms
        // never reached the bride's screen.
        if (toolResult && toolResult.confirmPreview) {
          confirmPreview = toolResult.confirmPreview;
        }"""
        src = must_replace(src, old, new, "Fix 1 confirmPreview bubble")
        print("✓ Fix 1 applied — confirmPreview now bubbles up to the response.")

    # ─────────────────────────────────────────────────────────────────────
    # FIX 2 — Add add_expense to FROST_BRIDE_TOOLS + executor case
    # ─────────────────────────────────────────────────────────────────────
    fix2_marker = "// FIX-2: add_expense ad-hoc expense logging"
    if already_applied(src, fix2_marker):
        print("Fix 2 [add_expense tool]: already applied.")
    else:
        # 2a — insert tool definition just before read_circle_thread
        tool_def_old = """  // ── ZIP 8: read_circle_thread ─────────────────────────────────────────────
  {
    name: 'read_circle_thread',"""
        tool_def_new = """  // FIX-2: add_expense ad-hoc expense logging
  {
    name: 'add_expense',
    description: "Log a one-off expense the bride mentions. Use when she says 'I just spent X on Y', 'paid Z for the lehenga today', 'gave 5k to the florist'. Creates a paid expense row immediately. NOT for booking advances (use book_vendor) or for settling pending balances (use log_payment / settle_balance).",
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: "Amount spent in INR." },
        description: { type: 'string', description: "What the expense is for. E.g. 'flowers', 'mehendi cones', 'driver tip'. Free text." },
        vendor_name: { type: 'string', description: "Optional vendor or recipient name. Pass if she mentions one. Otherwise omit." },
        category: { type: 'string', description: "Optional category — 'decor', 'food', 'attire', 'logistics', 'other'. Best-guess from description." },
        event: { type: 'string', description: "Optional event tag — 'haldi', 'mehendi', 'sangeet', 'wedding', 'reception', 'general'. Default 'general'." },
      },
      required: ['amount', 'description'],
    },
  },

  // ── ZIP 8: read_circle_thread ─────────────────────────────────────────────
  {
    name: 'read_circle_thread',"""
        src = must_replace(src, tool_def_old, tool_def_new, "Fix 2 tool def")

        # 2b — insert executor case right before read_circle_thread case
        exec_case_old = """      // ── ZIP 8: read_circle_thread (confirm-not-required, read-only) ──
      case 'read_circle_thread': {"""
        exec_case_new = """      // FIX-2: add_expense ad-hoc expense logging — fire-and-forget on bride mention
      case 'add_expense': {
        const { amount, description, vendor_name = null, category = 'other', event = 'general' } = toolInput || {};
        if (!amount || !description) {
          return { ok: false, kind: 'unknown', reply: "I'll need an amount and what it's for." };
        }
        const { data: row, error } = await supabase.from('couple_expenses').insert([{
          couple_id: coupleId,
          event,
          category,
          vendor_name,
          description,
          planned_amount: amount,
          actual_amount: amount,
          payment_status: 'paid',
          notes: 'Logged ad-hoc via DreamAi',
        }]).select('id').single();
        if (error) throw error;
        return {
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

      // ── ZIP 8: read_circle_thread (confirm-not-required, read-only) ──
      case 'read_circle_thread': {"""
        src = must_replace(src, exec_case_old, exec_case_new, "Fix 2 exec case")
        print("✓ Fix 2 applied — add_expense tool registered + executor case.")

    # ─────────────────────────────────────────────────────────────────────
    # FIX 3 — return entity IDs from book_vendor / log_payment / settle_balance
    # ─────────────────────────────────────────────────────────────────────
    fix3_marker = "// FIX-3: return vendor_id for anchor routing"
    if already_applied(src, fix3_marker):
        print("Fix 3 [entity IDs in returns]: already applied.")
    else:
        # 3a — book_vendor's success return
        book_old = """        return {
          ok: true,
          kind: 'composite',
          reply: `✓ Done. ${vendor_name} is locked in.`,
          confirmPreview: null,
          summaryLines,
          followupPrompts: followups,
        };
      }
      case 'create_reminder': {"""
        book_new = """        return {
          ok: true,
          kind: 'composite',
          reply: `✓ Done. ${vendor_name} is locked in.`,
          confirmPreview: null,
          summaryLines,
          followupPrompts: followups,
          // FIX-3: return vendor_id for anchor routing — long-press jumps to vendor page
          vendor_id: vendorRow.id,
        };
      }
      case 'create_reminder': {"""
        src = must_replace(src, book_old, book_new, "Fix 3 book_vendor return")

        # 3b — log_payment's success return
        log_old = """        return {
          ok: true,
          kind: 'composite',
          reply: `✓ ${formatINR(amount)} logged for ${target.vendor_name}.`,
          confirmPreview: null,
          summaryLines,
          followupPrompts: followups,
        };
      }

      // ── ZIP 3: settle_balance ──"""
        log_new = """        return {
          ok: true,
          kind: 'composite',
          reply: `✓ ${formatINR(amount)} logged for ${target.vendor_name}.`,
          confirmPreview: null,
          summaryLines,
          followupPrompts: followups,
          // FIX-3: return expense_id for anchor routing
          expense_id: target.id,
        };
      }

      // ── ZIP 3: settle_balance ──"""
        src = must_replace(src, log_old, log_new, "Fix 3 log_payment return")

        # 3c — settle_balance's success return
        settle_old = """        return {
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
        };
      }"""
        settle_new = """        return {
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
        src = must_replace(src, settle_old, settle_new, "Fix 3 settle_balance return")
        print("✓ Fix 3 applied — book_vendor/log_payment/settle_balance now return entity IDs.")

    # ─────────────────────────────────────────────────────────────────────
    # FIX 5 — Just Explore shape fix (do this BEFORE Fix 4 since 4 is heavier)
    # ─────────────────────────────────────────────────────────────────────
    fix5_marker = "// FIX-5: include success:true so native consumers"
    if already_applied(src, fix5_marker):
        print("Fix 5 [exploring-photos shape]: already applied.")
    else:
        old = """app.get('/api/v2/exploring-photos', async (req, res) => {
  try {
    const { data, error } = await supabase.from('exploring_photos')
      .select('id, image_url, caption, display_order')
      .eq('active', true)
      .order('display_order', { ascending: true });
    if (error) { console.error('[exploring-photos]', error); return res.status(500).json({ error: error.message }); }
    res.json({ photos: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});"""
        new = """app.get('/api/v2/exploring-photos', async (req, res) => {
  try {
    const { data, error } = await supabase.from('exploring_photos')
      .select('id, image_url, caption, display_order')
      .eq('active', true)
      .order('display_order', { ascending: true });
    if (error) { console.error('[exploring-photos]', error); return res.status(500).json({ success: false, error: error.message }); }
    // FIX-5: include success:true so native consumers (blind-swipe, discover/feed)
    // that check d.success can actually render the photos. Cover-photos consumer
    // ignores success field and reads d.photos directly — unchanged behaviour.
    res.json({ success: true, photos: data || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});"""
        src = must_replace(src, old, new, "Fix 5 exploring-photos shape")
        print("✓ Fix 5 applied — exploring-photos returns success:true.")

    # ─────────────────────────────────────────────────────────────────────
    # FIX 6 — Discover heroes public-read limit bump (5 → 20)
    # ─────────────────────────────────────────────────────────────────────
    fix6_marker = "// FIX-6: limit bumped 5→20"
    if already_applied(src, fix6_marker):
        print("Fix 6 [discover-heroes limit]: already applied.")
    else:
        old = """app.get('/api/v2/discover-heroes', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('discover_heroes')
      .select('id, image_url, caption, category_tag, cta_url, sort_order')
      .eq('is_active', true)
      .or(`visible_from.is.null,visible_from.lte.${now}`)
      .or(`visible_to.is.null,visible_to.gte.${now}`)
      .order('sort_order', { ascending: true })
      .limit(5);"""
        new = """app.get('/api/v2/discover-heroes', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('discover_heroes')
      .select('id, image_url, caption, category_tag, cta_url, sort_order')
      .eq('is_active', true)
      .or(`visible_from.is.null,visible_from.lte.${now}`)
      .or(`visible_to.is.null,visible_to.gte.${now}`)
      .order('sort_order', { ascending: true })
      .limit(20); // FIX-6: limit bumped 5→20 so admin can upload as many heroes as they want"""
        src = must_replace(src, old, new, "Fix 6 discover-heroes limit")
        print("✓ Fix 6 applied — discover-heroes limit raised to 20.")

    # ─────────────────────────────────────────────────────────────────────
    # FIX 4 — Dry-run + pendingBookings/Payments/Settles + confirm handlers
    # ─────────────────────────────────────────────────────────────────────
    # Strategy: wrap book_vendor's body in a dry-run guard. When the LLM first
    # calls it, return a confirmPreview with action_id and store the args in
    # pendingBookings. The bride taps Send → frontend POSTs /bride-confirm with
    # action_id → confirm endpoint replays the original logic.
    #
    # Same pattern for log_payment and settle_balance.
    #
    # New args to bride tools: confirmed: boolean (LLM doesn't set this; frontend
    # sets it via the confirm endpoint). If false/undefined → return preview.
    # If true → execute.
    #
    # Cleanest split: keep the existing executor logic but call internal helpers
    # bookVendorExecute / logPaymentExecute / settleBalanceExecute, and have
    # the case branches return previews. The confirm endpoint calls the helpers
    # directly with stored args.
    fix4_marker = "// FIX-4: pendingBookings/Payments/Settles dry-run gates"
    if already_applied(src, fix4_marker):
        print("Fix 4 [dry-run gates]: already applied.")
    else:
        # 4a — declare new pending Maps right after the existing ones
        old = """const pendingBroadcasts = new Map();
const pendingReceipts = new Map();"""
        new = """const pendingBroadcasts = new Map();
const pendingReceipts = new Map();
// FIX-4: pendingBookings/Payments/Settles dry-run gates for destructive tools.
// Holds the tool's parsed input + computed preview lines for 10 minutes; the
// frontend POSTs /bride-confirm with action_id → server replays via the helper.
const pendingBookings = new Map();
const pendingPayments = new Map();
const pendingSettles  = new Map();"""
        src = must_replace(src, old, new, "Fix 4 pending Maps")

        # 4b — replace the destructive tools' bodies with dry-run-first logic.
        # We'll wrap each in a confirmed-flag check. The LLM's first call won't
        # have confirmed=true, so it returns a preview. The bride-confirm
        # endpoint calls the case again with confirmed=true to actually write.
        #
        # Implementation note: we add an internal helper at the top of the
        # executor case that builds the action_id + preview. The actual write
        # logic stays as-is, gated by `if (toolInput?.confirmed === true) {...}`.
        #
        # Approach:
        #   case 'book_vendor': {
        #     const { vendor_name, total_price, advance, category, confirmed } = toolInput;
        #     if (!confirmed) {
        #       // build action_id, store args in pendingBookings, return preview
        #     }
        #     // ... existing write logic unchanged ...
        #   }
        #
        # That's a big diff. To keep this script reliable, we'll do it via
        # surgical text insertions at the top of each case rather than rewriting
        # the whole body.

        book_old = """      case 'book_vendor': {
        const { vendor_name, total_price, advance = 0, category = null } = toolInput;

        // 1. Find or create the vendor row in couple_vendors"""
        book_new = """      case 'book_vendor': {
        const { vendor_name, total_price, advance = 0, category = null, confirmed = false } = toolInput;

        // FIX-4: dry-run gate — first call (LLM) returns preview; bride-confirm
        // replays with confirmed=true to actually write.
        if (!confirmed) {
          const action_id = 'booking_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
          pendingBookings.set(action_id, { coupleId, vendor_name, total_price, advance, category });
          setTimeout(() => pendingBookings.delete(action_id), 10 * 60 * 1000);
          const balance = total_price - advance;
          return {
            ok: true,
            kind: 'confirm-required',
            reply: `Want me to lock in ${vendor_name}?`,
            confirmPreview: {
              summaryTitle: `Lock in ${vendor_name}?`,
              summaryLines: [
                `Total: ${formatINR(total_price)}`,
                advance > 0 ? `Advance paid today: ${formatINR(advance)}` : 'No advance yet',
                balance > 0 ? `Balance: ${formatINR(balance)} (reminder will be set 2 weeks before the wedding)` : 'Fully paid up front',
                category ? `Category: ${category}` : 'Category: existing on file',
              ],
              confirmLabel: 'Lock in',
              cancelLabel: 'Not yet',
              action_id,
            },
          };
        }

        // 1. Find or create the vendor row in couple_vendors"""
        src = must_replace(src, book_old, book_new, "Fix 4 book_vendor dry-run")

        log_old = """      case 'log_payment': {
        const { vendor_name, amount, note } = toolInput || {};
        if (!vendor_name || !amount) {
          return { ok: false, kind: 'unknown', reply: "I'll need a vendor name and an amount." };
        }
        const { data: matches } = await supabase.from('couple_expenses')"""
        log_new = """      case 'log_payment': {
        const { vendor_name, amount, note, confirmed = false } = toolInput || {};
        if (!vendor_name || !amount) {
          return { ok: false, kind: 'unknown', reply: "I'll need a vendor name and an amount." };
        }
        // FIX-4: dry-run gate — first call returns preview.
        if (!confirmed) {
          const action_id = 'payment_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
          pendingPayments.set(action_id, { coupleId, vendor_name, amount, note });
          setTimeout(() => pendingPayments.delete(action_id), 10 * 60 * 1000);
          return {
            ok: true,
            kind: 'confirm-required',
            reply: `Want me to log this payment?`,
            confirmPreview: {
              summaryTitle: `Log ${formatINR(amount)} to ${vendor_name}?`,
              summaryLines: [
                `Amount: ${formatINR(amount)}`,
                `Vendor: ${vendor_name}`,
                note ? `Note: "${note}"` : 'No note',
              ],
              confirmLabel: 'Log payment',
              cancelLabel: 'Not yet',
              action_id,
            },
          };
        }
        const { data: matches } = await supabase.from('couple_expenses')"""
        src = must_replace(src, log_old, log_new, "Fix 4 log_payment dry-run")

        settle_old = """      case 'settle_balance': {
        const { vendor_name, amount_override } = toolInput || {};
        if (!vendor_name) {
          return { ok: false, kind: 'unknown', reply: "Which vendor did you settle?" };
        }
        const { data: matches } = await supabase.from('couple_expenses')
          .select('id, vendor_name, description, planned_amount, actual_amount, payment_status')
          .eq('couple_id', coupleId)
          .ilike('vendor_name', `%${vendor_name}%`)
          .eq('payment_status', 'pending')
          .order('created_at', { ascending: false });
        if (!matches || matches.length === 0) {
          return {
            ok: false,
            kind: 'unknown',
            reply: `I couldn't find a pending balance for ${vendor_name}. Maybe it's already settled?`,
          };
        }"""
        settle_new = """      case 'settle_balance': {
        const { vendor_name, amount_override, confirmed = false } = toolInput || {};
        if (!vendor_name) {
          return { ok: false, kind: 'unknown', reply: "Which vendor did you settle?" };
        }
        const { data: matches } = await supabase.from('couple_expenses')
          .select('id, vendor_name, description, planned_amount, actual_amount, payment_status')
          .eq('couple_id', coupleId)
          .ilike('vendor_name', `%${vendor_name}%`)
          .eq('payment_status', 'pending')
          .order('created_at', { ascending: false });
        if (!matches || matches.length === 0) {
          return {
            ok: false,
            kind: 'unknown',
            reply: `I couldn't find a pending balance for ${vendor_name}. Maybe it's already settled?`,
          };
        }
        // FIX-4: dry-run gate — first call returns preview.
        if (!confirmed) {
          const previewTarget = matches[0];
          const previewAmount = amount_override != null ? amount_override : (previewTarget.planned_amount || 0);
          const action_id = 'settle_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
          pendingSettles.set(action_id, { coupleId, vendor_name, amount_override });
          setTimeout(() => pendingSettles.delete(action_id), 10 * 60 * 1000);
          return {
            ok: true,
            kind: 'confirm-required',
            reply: `Want me to settle ${previewTarget.vendor_name}?`,
            confirmPreview: {
              summaryTitle: `Settle ${previewTarget.vendor_name}?`,
              summaryLines: [
                `Final payment: ${formatINR(previewAmount)}`,
                `Vendor will be marked paid`,
                `Balance reminder will be cleared`,
              ],
              confirmLabel: 'Settle',
              cancelLabel: 'Not yet',
              action_id,
            },
          };
        }"""
        src = must_replace(src, settle_old, settle_new, "Fix 4 settle_balance dry-run")

        # 4c — append confirm-handler branches to bride-confirm endpoint, just
        # before the final 404. We hook on the unique "action not found or expired" line.
        confirm_old = """    return res.status(404).json({ success: false, error: 'action not found or expired' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});"""
        confirm_new = """    // FIX-4: pendingBookings/Payments/Settles dry-run gates — confirm handlers.
    // The frontend hits /bride-confirm with the action_id; we replay the tool
    // with confirmed=true via executeBrideToolCall so the same write logic runs.
    if (pendingBookings.has(action_id)) {
      const args = pendingBookings.get(action_id);
      if (args.coupleId !== userId) return res.status(403).json({ success: false, error: 'action does not belong to this user' });
      pendingBookings.delete(action_id);
      const result = await executeBrideToolCall('book_vendor', { ...args, confirmed: true }, userId);
      return res.json({
        success: !!result?.ok,
        reply: result?.reply || `✓ ${args.vendor_name} locked in.`,
        summaryLines: result?.summaryLines || [],
        followupPrompts: result?.followupPrompts || [],
        vendor_id: result?.vendor_id,
      });
    }
    if (pendingPayments.has(action_id)) {
      const args = pendingPayments.get(action_id);
      if (args.coupleId !== userId) return res.status(403).json({ success: false, error: 'action does not belong to this user' });
      pendingPayments.delete(action_id);
      const result = await executeBrideToolCall('log_payment', { ...args, confirmed: true }, userId);
      return res.json({
        success: !!result?.ok,
        reply: result?.reply || `✓ Payment logged.`,
        summaryLines: result?.summaryLines || [],
        followupPrompts: result?.followupPrompts || [],
        expense_id: result?.expense_id,
      });
    }
    if (pendingSettles.has(action_id)) {
      const args = pendingSettles.get(action_id);
      if (args.coupleId !== userId) return res.status(403).json({ success: false, error: 'action does not belong to this user' });
      pendingSettles.delete(action_id);
      const result = await executeBrideToolCall('settle_balance', { ...args, confirmed: true }, userId);
      return res.json({
        success: !!result?.ok,
        reply: result?.reply || `✓ Settled.`,
        summaryLines: result?.summaryLines || [],
        followupPrompts: result?.followupPrompts || [],
        expense_id: result?.expense_id,
      });
    }

    return res.status(404).json({ success: false, error: 'action not found or expired' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});"""
        src = must_replace(src, confirm_old, confirm_new, "Fix 4 confirm handlers")
        print("✓ Fix 4 applied — book_vendor/log_payment/settle_balance now dry-run + bride-confirm replays.")

    # Write
    PATH.write_text(src)
    print("")
    print("All fixes written to backend/server.js.")

    # Syntax check
    try:
        result = subprocess.run(['node', '--check', str(PATH)], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"\n⚠ node --check FAILED:\n{result.stderr}", file=sys.stderr)
            sys.exit(4)
        print("✓ node --check passed")
    except FileNotFoundError:
        print("⚠ node not on PATH — skipping syntax check (run `node --check backend/server.js` manually)")


if __name__ == '__main__':
    main()
