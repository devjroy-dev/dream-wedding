#!/usr/bin/env python3
"""
patch_dreamai_foundation.py — Phase 1 of Dream Ai foundation pass.

Fixes Bugs A, B, and C-backend in `backend/server.js` (single file edits only).
Each replacement asserts old.count == 1 for idempotency (running twice fails fast
with a clear message rather than silently double-applying).

Bugs addressed:
  A — query_my_vendors and query_my_expenses now build bulleted replies with
      names/amounts in the `reply` string itself (matching query_my_reminders).
  B — getBrideContextSummary reads correct columns:
        couple_expenses.amount/status     -> actual_amount/planned_amount/payment_status
        couple_profiles.wedding_date      -> users.wedding_date  (with users.id = coupleId)
  C — bride-confirm error responses now include a `reply` field with a gentle,
      bride-voice fallback so the frontend never silently drops the response.

Pre-ship: run from dream-wedding repo root, then `node --check backend/server.js`.
"""

import sys
import os

PATH = "backend/server.js"

if not os.path.exists(PATH):
    print(f"ERROR: {PATH} not found. Run this script from the dream-wedding repo root.")
    sys.exit(1)

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

original_len = len(src)
fixes_applied = 0


def replace_once(haystack: str, needle: str, replacement: str, label: str) -> str:
    """Assert exactly one match, then replace. Otherwise fail loud."""
    count = haystack.count(needle)
    if count == 0:
        print(f"  ✗ {label}: needle NOT FOUND. Already patched? Or source drift.")
        sys.exit(1)
    if count > 1:
        print(f"  ✗ {label}: needle matched {count} times. Refusing to patch ambiguously.")
        sys.exit(1)
    print(f"  ✓ {label}")
    return haystack.replace(needle, replacement, 1)


# ─────────────────────────────────────────────────────────────────────────────
# FIX A1 — query_my_vendors: bulleted reply with names + status + amounts
# ─────────────────────────────────────────────────────────────────────────────

OLD_QUERY_VENDORS = """      // ── ZIP 3: query_my_vendors ──
      case 'query_my_vendors': {
        const { status_filter = 'all', category_filter } = toolInput || {};
        let q = supabase.from('couple_vendors')
          .select('id, name, category, status, quoted_total, balance_due_date, events')
          .eq('couple_id', coupleId);
        if (status_filter === 'in-talks') q = q.in('status', ['considering', 'in_discussion', 'shortlisted']);
        else if (status_filter !== 'all') q = q.eq('status', status_filter);
        if (category_filter) q = q.ilike('category', category_filter);
        const { data, error } = await q.order('updated_at', { ascending: false });
        if (error) throw error;
        const list = (data || []).map(v => ({
          name: v.name, category: v.category, status: v.status,
          quoted_total: v.quoted_total, balance_due_date: v.balance_due_date,
        }));
        return {
          ok: true,
          kind: 'reply',
          reply: list.length === 0 ? "You haven't added anyone yet." : `${list.length} vendor${list.length === 1 ? '' : 's'} match.`,
          vendors: list,
        };
      }
"""

NEW_QUERY_VENDORS = """      // ── ZIP 3: query_my_vendors ──
      // BUG A FIX: build bulleted reply with vendor names, status, amounts so
      // the bride sees who's on her team without a second exchange. Mirrors
      // query_my_reminders pattern (bullet lines into `reply`).
      case 'query_my_vendors': {
        const { status_filter = 'all', category_filter } = toolInput || {};
        let q = supabase.from('couple_vendors')
          .select('id, name, category, status, quoted_total, balance_due_date, events')
          .eq('couple_id', coupleId);
        if (status_filter === 'in-talks') q = q.in('status', ['considering', 'in_discussion', 'shortlisted']);
        else if (status_filter !== 'all') q = q.eq('status', status_filter);
        if (category_filter) q = q.ilike('category', category_filter);
        const { data, error } = await q.order('updated_at', { ascending: false });
        if (error) throw error;
        const list = data || [];
        if (list.length === 0) {
          return {
            ok: true,
            kind: 'reply',
            reply: status_filter === 'booked'
              ? "Nothing booked yet."
              : "You haven't added anyone yet.",
            vendors: [],
            tool_anchor: { tool: 'vendors', entity_type: 'list' },
          };
        }
        const statusLabel = (s) => {
          if (s === 'booked') return 'booked';
          if (s === 'shortlisted') return 'shortlisted';
          if (s === 'considering') return 'in talks';
          if (s === 'in_discussion') return 'in talks';
          if (s === 'declined') return 'passed on';
          return s || 'tracked';
        };
        const lines = list.slice(0, 10).map(v => {
          const cat = v.category ? ` — ${v.category}` : '';
          const st = ` · ${statusLabel(v.status)}`;
          const amt = v.quoted_total ? ` · ${formatINR(v.quoted_total)}` : '';
          return `• ${v.name}${cat}${st}${amt}`;
        });
        const more = list.length > 10 ? `\\n\\n…and ${list.length - 10} more.` : '';
        const header = list.length === 1
          ? "Here's who's on your team:"
          : `Here are your ${list.length} vendors:`;
        const slim = list.map(v => ({
          name: v.name, category: v.category, status: v.status,
          quoted_total: v.quoted_total, balance_due_date: v.balance_due_date,
        }));
        return {
          ok: true,
          kind: 'reply',
          reply: `${header}\\n\\n${lines.join('\\n')}${more}`,
          vendors: slim,
          tool_anchor: { tool: 'vendors', entity_type: 'list' },
        };
      }
"""

src = replace_once(src, OLD_QUERY_VENDORS, NEW_QUERY_VENDORS, "Bug A1 — query_my_vendors bulleted reply")
fixes_applied += 1


# ─────────────────────────────────────────────────────────────────────────────
# FIX A2 — query_my_expenses: bulleted reply with vendor + amount + status
# ─────────────────────────────────────────────────────────────────────────────

OLD_QUERY_EXPENSES = """      // ── ZIP 3: query_my_expenses ──
      case 'query_my_expenses': {
        const { vendor_name, payment_status = 'all' } = toolInput || {};
        let q = supabase.from('couple_expenses')
          .select('id, vendor_name, description, planned_amount, actual_amount, payment_status, due_date, category')
          .eq('couple_id', coupleId);
        if (vendor_name) q = q.ilike('vendor_name', `%${vendor_name}%`);
        if (payment_status !== 'all') q = q.eq('payment_status', payment_status);
        const { data, error } = await q.order('created_at', { ascending: false });
        if (error) throw error;
        const rows = data || [];
        const totalPaid = rows.filter(r => r.payment_status === 'paid')
          .reduce((sum, r) => sum + (r.actual_amount || 0), 0);
        const totalPending = rows.filter(r => r.payment_status === 'pending')
          .reduce((sum, r) => sum + (r.planned_amount || 0), 0);
        return {
          ok: true,
          kind: 'reply',
          reply: vendor_name
            ? `${formatINR(totalPaid)} paid to ${vendor_name}, ${formatINR(totalPending)} pending.`
            : `${formatINR(totalPaid)} paid so far. ${formatINR(totalPending)} still pending.`,
          total_paid: totalPaid,
          total_pending: totalPending,
          total_committed: totalPaid + totalPending,
          expenses: rows.map(r => ({
            vendor_name: r.vendor_name,
            description: r.description,
            amount: r.payment_status === 'paid' ? r.actual_amount : r.planned_amount,
            status: r.payment_status,
            due_date: r.due_date,
          })),
        };
      }
"""

NEW_QUERY_EXPENSES = """      // ── ZIP 3: query_my_expenses ──
      // BUG A FIX: header line with totals + bulleted expense lines so the
      // bride sees what she paid for and what's still pending without a
      // second exchange. Matches query_my_reminders pattern.
      case 'query_my_expenses': {
        const { vendor_name, payment_status = 'all' } = toolInput || {};
        let q = supabase.from('couple_expenses')
          .select('id, vendor_name, description, planned_amount, actual_amount, payment_status, due_date, category')
          .eq('couple_id', coupleId);
        if (vendor_name) q = q.ilike('vendor_name', `%${vendor_name}%`);
        if (payment_status !== 'all') q = q.eq('payment_status', payment_status);
        const { data, error } = await q.order('created_at', { ascending: false });
        if (error) throw error;
        const rows = data || [];
        const totalPaid = rows.filter(r => r.payment_status === 'paid')
          .reduce((sum, r) => sum + (r.actual_amount || 0), 0);
        const totalPending = rows.filter(r => r.payment_status === 'pending')
          .reduce((sum, r) => sum + (r.planned_amount || 0), 0);
        if (rows.length === 0) {
          return {
            ok: true,
            kind: 'reply',
            reply: vendor_name
              ? `Nothing logged for ${vendor_name} yet.`
              : "Nothing logged yet.",
            total_paid: 0,
            total_pending: 0,
            total_committed: 0,
            expenses: [],
            tool_anchor: { tool: 'money', entity_type: 'list' },
          };
        }
        const header = vendor_name
          ? `${formatINR(totalPaid)} paid to ${vendor_name} · ${formatINR(totalPending)} pending`
          : `${formatINR(totalPaid)} paid so far · ${formatINR(totalPending)} still pending`;
        const lines = rows.slice(0, 10).map(r => {
          const who = r.vendor_name || r.description || 'Untitled';
          const amt = r.payment_status === 'paid'
            ? (r.actual_amount || 0)
            : (r.planned_amount || 0);
          const stLabel = r.payment_status === 'paid'
            ? 'paid'
            : (r.payment_status === 'pending' ? 'pending' : (r.payment_status || 'tracked'));
          const due = r.due_date && r.payment_status !== 'paid' ? ` · due ${r.due_date}` : '';
          return `• ${who} — ${formatINR(amt)} · ${stLabel}${due}`;
        });
        const more = rows.length > 10 ? `\\n\\n…and ${rows.length - 10} more.` : '';
        return {
          ok: true,
          kind: 'reply',
          reply: `${header}\\n\\n${lines.join('\\n')}${more}`,
          total_paid: totalPaid,
          total_pending: totalPending,
          total_committed: totalPaid + totalPending,
          expenses: rows.map(r => ({
            vendor_name: r.vendor_name,
            description: r.description,
            amount: r.payment_status === 'paid' ? r.actual_amount : r.planned_amount,
            status: r.payment_status,
            due_date: r.due_date,
          })),
          tool_anchor: { tool: 'money', entity_type: 'list' },
        };
      }
"""

src = replace_once(src, OLD_QUERY_EXPENSES, NEW_QUERY_EXPENSES, "Bug A2 — query_my_expenses bulleted reply")
fixes_applied += 1


# ─────────────────────────────────────────────────────────────────────────────
# FIX B — getBrideContextSummary: correct column reads
#   - couple_expenses.amount/status   -> actual_amount/planned_amount/payment_status
#   - couple_profiles.wedding_date    -> users.wedding_date (with users.id = coupleId)
# ─────────────────────────────────────────────────────────────────────────────

OLD_BRIDE_SUMMARY = """async function getBrideContextSummary(coupleId) {
  const summary = { vendors_booked: 0, vendors_shortlisted: 0, expenses_paid: 0, total_spent: 0, days_until_wedding: null };
  try {
    const { data: vendors } = await supabase
      .from('couple_vendors')
      .select('status')
      .eq('couple_id', coupleId);
    if (vendors) {
      summary.vendors_booked = vendors.filter(v => v.status === 'booked').length;
      summary.vendors_shortlisted = vendors.filter(v => v.status === 'shortlisted').length;
    }
    const { data: expenses } = await supabase
      .from('couple_expenses')
      .select('amount, status')
      .eq('couple_id', coupleId);
    if (expenses) {
      summary.expenses_paid = expenses.filter(e => e.status === 'paid').length;
      summary.total_spent = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    }
    try {
      const { data: profile } = await supabase
        .from('couple_profiles')
        .select('wedding_date')
        .eq('couple_id', coupleId)
        .maybeSingle();
      if (profile && profile.wedding_date) {
        const today = new Date(); today.setHours(0,0,0,0);
        const wd = new Date(profile.wedding_date); wd.setHours(0,0,0,0);
        summary.days_until_wedding = Math.max(0, Math.round((wd.getTime() - today.getTime()) / 86400000));
      }
    } catch (e) {}
  } catch (err) {
    console.error('[Bride context] error:', err.message);
  }
  return summary;
}"""

NEW_BRIDE_SUMMARY = """async function getBrideContextSummary(coupleId) {
  // BUG B FIX: schema-correct reads.
  //   couple_expenses uses actual_amount/planned_amount/payment_status (NOT amount/status).
  //   wedding_date lives on users (NOT couple_profiles).
  // Old code silently zeroed every field for every bride. Bride-idle and any
  // future prompt context that reads this summary returned junk.
  const summary = { vendors_booked: 0, vendors_shortlisted: 0, expenses_paid: 0, total_spent: 0, days_until_wedding: null };
  try {
    const { data: vendors } = await supabase
      .from('couple_vendors')
      .select('status')
      .eq('couple_id', coupleId);
    if (vendors) {
      summary.vendors_booked = vendors.filter(v => v.status === 'booked').length;
      summary.vendors_shortlisted = vendors.filter(v => v.status === 'shortlisted').length;
    }
    const { data: expenses } = await supabase
      .from('couple_expenses')
      .select('actual_amount, planned_amount, payment_status')
      .eq('couple_id', coupleId);
    if (expenses) {
      summary.expenses_paid = expenses.filter(e => e.payment_status === 'paid').length;
      summary.total_spent = expenses.reduce((s, e) => {
        // For paid rows use actual_amount; for pending rows fall back to planned_amount.
        const amt = e.payment_status === 'paid'
          ? (e.actual_amount || e.planned_amount || 0)
          : (e.planned_amount || 0);
        return s + amt;
      }, 0);
    }
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('wedding_date')
        .eq('id', coupleId)
        .maybeSingle();
      if (profile && profile.wedding_date) {
        const today = new Date(); today.setHours(0,0,0,0);
        const wd = new Date(profile.wedding_date); wd.setHours(0,0,0,0);
        summary.days_until_wedding = Math.max(0, Math.round((wd.getTime() - today.getTime()) / 86400000));
      }
    } catch (e) {}
  } catch (err) {
    console.error('[Bride context] error:', err.message);
  }
  return summary;
}"""

src = replace_once(src, OLD_BRIDE_SUMMARY, NEW_BRIDE_SUMMARY, "Bug B — getBrideContextSummary column corrections")
fixes_applied += 1


# ─────────────────────────────────────────────────────────────────────────────
# FIX C — bride-confirm error responses now include `reply` field
#
# Five error returns currently set only `error`. Frontend (dream.tsx handleConfirm)
# only renders if response has either `success && reply` or just `reply`. Without
# `reply`, the bride sees nothing — silent failure on action expiry, mismatched
# user, or missing fields. Each error gets a gentle bride-voice reply.
# ─────────────────────────────────────────────────────────────────────────────

# 1. Top-level missing IDs (400)
OLD_C1 = """app.post('/api/v2/dreamai/bride-confirm', async (req, res) => {
  try {
    const { userId, action_id, vendor_name } = req.body || {};
    if (!userId || !action_id) {
      return res.status(400).json({ success: false, error: 'userId and action_id required' });
    }"""
NEW_C1 = """app.post('/api/v2/dreamai/bride-confirm', async (req, res) => {
  try {
    const { userId, action_id, vendor_name } = req.body || {};
    if (!userId || !action_id) {
      // BUG C FIX: include `reply` so the frontend can render the failure.
      return res.status(400).json({ success: false, error: 'userId and action_id required', reply: 'Something went sideways. Try once more?' });
    }"""
src = replace_once(src, OLD_C1, NEW_C1, "Bug C1 — bride-confirm 400 missing IDs reply")
fixes_applied += 1

# 2. Broadcast: action does not belong to this user (403)
OLD_C2 = """      if (action.coupleId !== userId) {
        return res.status(403).json({ success: false, error: 'action does not belong to this user' });
      }
      pendingBroadcasts.delete(action_id);"""
NEW_C2 = """      if (action.coupleId !== userId) {
        // BUG C FIX: include `reply` so the frontend can render the failure.
        return res.status(403).json({ success: false, error: 'action does not belong to this user', reply: 'That action belongs to a different signed-in account.' });
      }
      pendingBroadcasts.delete(action_id);"""
src = replace_once(src, OLD_C2, NEW_C2, "Bug C2 — bride-confirm 403 broadcast wrong-user reply")
fixes_applied += 1

# 3. Receipt: action does not belong to this user (403)
OLD_C3 = """      if (action.coupleId !== userId) {
        return res.status(403).json({ success: false, error: 'action does not belong to this user' });
      }
      pendingReceipts.delete(action_id);"""
NEW_C3 = """      if (action.coupleId !== userId) {
        // BUG C FIX: include `reply` so the frontend can render the failure.
        return res.status(403).json({ success: false, error: 'action does not belong to this user', reply: 'That action belongs to a different signed-in account.' });
      }
      pendingReceipts.delete(action_id);"""
src = replace_once(src, OLD_C3, NEW_C3, "Bug C3 — bride-confirm 403 receipt wrong-user reply")
fixes_applied += 1

# 4. Bookings/Payments/Settles wrong-user (3 occurrences, each unique by surrounding context)
OLD_C4 = """    if (pendingBookings.has(action_id)) {
      const args = pendingBookings.get(action_id);
      if (args.coupleId !== userId) return res.status(403).json({ success: false, error: 'action does not belong to this user' });
      pendingBookings.delete(action_id);"""
NEW_C4 = """    if (pendingBookings.has(action_id)) {
      const args = pendingBookings.get(action_id);
      // BUG C FIX: include `reply` so the frontend can render the failure.
      if (args.coupleId !== userId) return res.status(403).json({ success: false, error: 'action does not belong to this user', reply: 'That action belongs to a different signed-in account.' });
      pendingBookings.delete(action_id);"""
src = replace_once(src, OLD_C4, NEW_C4, "Bug C4 — bride-confirm 403 booking wrong-user reply")
fixes_applied += 1

OLD_C5 = """    if (pendingPayments.has(action_id)) {
      const args = pendingPayments.get(action_id);
      if (args.coupleId !== userId) return res.status(403).json({ success: false, error: 'action does not belong to this user' });
      pendingPayments.delete(action_id);"""
NEW_C5 = """    if (pendingPayments.has(action_id)) {
      const args = pendingPayments.get(action_id);
      // BUG C FIX: include `reply` so the frontend can render the failure.
      if (args.coupleId !== userId) return res.status(403).json({ success: false, error: 'action does not belong to this user', reply: 'That action belongs to a different signed-in account.' });
      pendingPayments.delete(action_id);"""
src = replace_once(src, OLD_C5, NEW_C5, "Bug C5 — bride-confirm 403 payment wrong-user reply")
fixes_applied += 1

OLD_C6 = """    if (pendingSettles.has(action_id)) {
      const args = pendingSettles.get(action_id);
      if (args.coupleId !== userId) return res.status(403).json({ success: false, error: 'action does not belong to this user' });
      pendingSettles.delete(action_id);"""
NEW_C6 = """    if (pendingSettles.has(action_id)) {
      const args = pendingSettles.get(action_id);
      // BUG C FIX: include `reply` so the frontend can render the failure.
      if (args.coupleId !== userId) return res.status(403).json({ success: false, error: 'action does not belong to this user', reply: 'That action belongs to a different signed-in account.' });
      pendingSettles.delete(action_id);"""
src = replace_once(src, OLD_C6, NEW_C6, "Bug C6 — bride-confirm 403 settle wrong-user reply")
fixes_applied += 1

# 5. Action expired (404) — most common failure path: bride taps Confirm > 10min after card rendered
OLD_C7 = """    return res.status(404).json({ success: false, error: 'action not found or expired' });"""
NEW_C7 = """    // BUG C FIX: include `reply` so the frontend can render the failure.
    // This is the MOST COMMON bride-confirm failure: the 10-minute setTimeout
    // cleanup expired the action before she tapped. Voice should be gentle.
    return res.status(404).json({ success: false, error: 'action not found or expired', reply: 'That moment passed. Tell me again?' });"""
src = replace_once(src, OLD_C7, NEW_C7, "Bug C7 — bride-confirm 404 expired-action reply")
fixes_applied += 1

# 6. Insert error inside group broadcast (no try-catch wrapper, returns 500 inline)
OLD_C8 = """        if (msgErr) return res.status(500).json({ success: false, error: msgErr.message });

        await supabase.from('circle_activity_events').insert([{
          couple_id: userId,
          actor_user_id: userId,
          actor_role: 'bride',
          event_type: 'circle_broadcast_sent',
          payload: { message, topic: topic || null, target: 'group', group_id, group_name },"""
NEW_C8 = """        if (msgErr) return res.status(500).json({ success: false, error: msgErr.message, reply: 'Something went sideways while sending. Try once more?' });

        await supabase.from('circle_activity_events').insert([{
          couple_id: userId,
          actor_user_id: userId,
          actor_role: 'bride',
          event_type: 'circle_broadcast_sent',
          payload: { message, topic: topic || null, target: 'group', group_id, group_name },"""
src = replace_once(src, OLD_C8, NEW_C8, "Bug C8 — bride-confirm 500 group-broadcast insert reply")
fixes_applied += 1

# 7. Insert error inside individual broadcast
OLD_C9 = """        if (msgs.length > 0) {
          const { error: msgErr } = await supabase.from('circle_messages').insert(msgs);
          if (msgErr) return res.status(500).json({ success: false, error: msgErr.message });
        }"""
NEW_C9 = """        if (msgs.length > 0) {
          const { error: msgErr } = await supabase.from('circle_messages').insert(msgs);
          if (msgErr) return res.status(500).json({ success: false, error: msgErr.message, reply: 'Something went sideways while sending. Try once more?' });
        }"""
src = replace_once(src, OLD_C9, NEW_C9, "Bug C9 — bride-confirm 500 individual-broadcast insert reply")
fixes_applied += 1

# 8. Receipt insert error
OLD_C10 = """      if (error) return res.status(500).json({ success: false, error: error.message });
      return res.json({
        success: true,
        reply: `✓ Filed ${formatINR(finalAmount)} under ${finalVendor}.`,"""
NEW_C10 = """      if (error) return res.status(500).json({ success: false, error: error.message, reply: 'Something went sideways while filing the receipt. Try once more?' });
      return res.json({
        success: true,
        reply: `✓ Filed ${formatINR(finalAmount)} under ${finalVendor}.`,"""
src = replace_once(src, OLD_C10, NEW_C10, "Bug C10 — bride-confirm 500 receipt-insert reply")
fixes_applied += 1

# 9. Outer catch (any thrown error)
OLD_C11 = """    return res.status(404).json({ success: false, error: 'action not found or expired', reply: 'That moment passed. Tell me again?' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});"""
NEW_C11 = """    return res.status(404).json({ success: false, error: 'action not found or expired', reply: 'That moment passed. Tell me again?' });
  } catch (error) {
    // BUG C FIX: include `reply` so the frontend can render the failure.
    res.status(500).json({ success: false, error: error.message, reply: 'Something went sideways. Try once more?' });
  }
});"""
src = replace_once(src, OLD_C11, NEW_C11, "Bug C11 — bride-confirm outer catch reply")
fixes_applied += 1


# ─────────────────────────────────────────────────────────────────────────────
# Write back
# ─────────────────────────────────────────────────────────────────────────────

with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

new_len = len(src)
delta = new_len - original_len

print()
print(f"━" * 72)
print(f"  Patch complete: {fixes_applied} fixes applied")
print(f"  Original: {original_len:,} chars")
print(f"  New:      {new_len:,} chars  (Δ {delta:+,})")
print(f"━" * 72)
print()
print("  Next step: node --check backend/server.js")
print()
