#!/usr/bin/env python3
"""
PATCH B-6a — bride budget surface

Adds a write tool the bride can use to set/update her wedding budget,
fixes the broken read tool, and gates a one-shot idle-line prompt.

Six replacements:

(1) FROST_BRIDE_TOOLS — register set_total_budget tool definition.
    Confirm-required pattern (single-row write but financial declaration
    deserves a beat).

(2) Tool executor — set_total_budget case. Dry-run on first call returns
    confirmPreview ("Set" or "Update" variant depending on current value);
    confirmed call PATCHes couple_budget.total_budget.

(3) bride-confirm endpoint — pendingBudgetSets branch. Reads from the Map,
    writes to couple_budget, returns reply.

(4) pendingBudgetSets Map declaration — alongside existing pending* Maps.

(5) query_budget executor (bride side, line ~11977) — fix wrong column
    names. Was reading amount/status from couple_expenses; correct columns
    are actual_amount/planned_amount/payment_status.

(6) Today endpoint (line ~11077-11094) — same column-name fix.

(7) bride-idle endpoint — new gating logic that injects a budget prompt
    once if (a) couple_budget.budget_prompt_shown_at is null AND
    (b) bride has booked vendors > 0 OR expenses > 0. Also writes the
    timestamp so it never fires again.

(8) Bride system prompt — "WHEN TO USE WHICH TOOL" addition for
    set_total_budget routing.

REQUIRES THE SUPABASE MIGRATION TO RUN FIRST:
    ALTER TABLE couple_budget
    ADD COLUMN IF NOT EXISTS budget_prompt_shown_at timestamp with time zone;

Validates: node --check backend/server.js
"""
import os
import sys

REPO = os.environ.get('TDW_REPO', '/workspaces/dream-wedding')
TARGET = os.path.join(REPO, 'backend', 'server.js')

if not os.path.exists(TARGET):
    print(f"ERROR: cannot find {TARGET}")
    sys.exit(1)

with open(TARGET, 'r', encoding='utf-8') as f:
    src = f.read()

orig_len = len(src)

# ─── Replacement 1: register set_total_budget in FROST_BRIDE_TOOLS ───
# Insert after book_vendor's tool def (the first item) and before create_reminder.

OLD_1 = """  {
    name: 'create_reminder',
    description: 'Create a personal reminder for the bride. Use when she asks you to remember something for her, or after another action when a follow-up reminder is appropriate.',"""

NEW_1 = """  {
    name: 'set_total_budget',
    description: 'Set or update the bride\\'s overall wedding budget. Use whenever she says her budget is X / her budget should be X / make her budget X. Examples: "my budget is 40 lac", "set my budget to 35 lakhs", "update my budget to 50 lac". The tool surfaces a confirm card so the bride sees the number before it commits — never write silently.',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Total wedding budget in rupees. Convert lakhs/lac to rupees first (1 lac = 100,000). E.g. "40 lac" → 4000000.' },
      },
      required: ['amount'],
    },
  },
  {
    name: 'create_reminder',
    description: 'Create a personal reminder for the bride. Use when she asks you to remember something for her, or after another action when a follow-up reminder is appropriate.',"""

assert src.count(OLD_1) == 1, f"OLD_1 expected 1, got {src.count(OLD_1)}"
src = src.replace(OLD_1, NEW_1)
print("[1/8] set_total_budget tool registered in FROST_BRIDE_TOOLS")

# ─── Replacement 2: tool executor case for set_total_budget ───
# Insert after book_vendor's executor case (which ends with `      }` then
# `      case 'create_reminder': {`). Place the set_total_budget executor
# right before create_reminder for grouping with the new tool def.

OLD_2 = """      case 'create_reminder': {
        // Real schema: couple_checklist with event (NOT NULL), text (NOT NULL), is_complete, priority, due_date, is_custom"""

NEW_2 = """      case 'set_total_budget': {
        // PATCH B-6a: confirm-required write to couple_budget.total_budget.
        const { amount, confirmed = false } = toolInput || {};
        if (amount == null || isNaN(amount) || amount <= 0) {
          return { ok: false, kind: 'unsure', reply: "How much would you like to set your budget to?" };
        }
        // Dry-run: read current value to shape the confirm card (Set vs Update).
        if (!confirmed) {
          let currentBudget = 0;
          try {
            const { data: existing } = await supabase
              .from('couple_budget')
              .select('total_budget')
              .eq('couple_id', coupleId)
              .maybeSingle();
            currentBudget = Number(existing?.total_budget) || 0;
          } catch (e) { /* if read fails, treat as initial set */ }
          const isUpdate = currentBudget > 0;
          const action_id = 'budget_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
          pendingBudgetSets.set(action_id, { coupleId, amount, isUpdate, previousBudget: currentBudget });
          setTimeout(() => pendingBudgetSets.delete(action_id), 10 * 60 * 1000);
          if (isUpdate) {
            return {
              ok: true,
              kind: 'confirm-required',
              reply: `Want me to update your budget?`,
              confirmPreview: {
                summaryTitle: `Update your wedding budget?`,
                summaryLines: [
                  `From: ${formatINR(currentBudget)}`,
                  `To: ${formatINR(amount)}`,
                ],
                confirmLabel: 'Update',
                cancelLabel: 'Not yet',
                action_id,
              },
            };
          }
          return {
            ok: true,
            kind: 'confirm-required',
            reply: `Want me to set your budget?`,
            confirmPreview: {
              summaryTitle: `Set your wedding budget?`,
              summaryLines: [
                `Total: ${formatINR(amount)}`,
                `This is what I'll pace your spending against.`,
              ],
              confirmLabel: 'Lock in',
              cancelLabel: 'Not yet',
              action_id,
            },
          };
        }
        // Confirmed path (replayed by bride-confirm) — but bride-confirm
        // handles set_total_budget directly, so this branch should rarely
        // execute. Kept for parity with other confirm-required tools.
        try {
          const { data: existing } = await supabase
            .from('couple_budget')
            .select('id')
            .eq('couple_id', coupleId)
            .maybeSingle();
          if (existing) {
            await supabase
              .from('couple_budget')
              .update({ total_budget: amount, updated_at: new Date().toISOString() })
              .eq('couple_id', coupleId);
          } else {
            await supabase
              .from('couple_budget')
              .insert([{ couple_id: coupleId, total_budget: amount, event_envelopes: {} }]);
          }
        } catch (err) {
          return { ok: false, kind: 'unknown', reply: "Something went sideways saving your budget. Try once more?" };
        }
        return {
          ok: true,
          kind: 'composite',
          reply: `✓ Budget set to ${formatINR(amount)}.`,
          confirmPreview: null,
          summaryLines: [`Total budget: ${formatINR(amount)}`],
          followupPrompts: [],
        };
      }

      case 'create_reminder': {
        // Real schema: couple_checklist with event (NOT NULL), text (NOT NULL), is_complete, priority, due_date, is_custom"""

assert src.count(OLD_2) == 1, f"OLD_2 expected 1, got {src.count(OLD_2)}"
src = src.replace(OLD_2, NEW_2)
print("[2/8] set_total_budget executor case added")

# ─── Replacement 3: pendingBudgetSets Map declaration ───
# Add alongside the existing pending* Maps.

OLD_3 = """// Phase 1.6: destructive delete dry-run gates.
const pendingVendorDeletes   = new Map();
const pendingExpenseDeletes  = new Map();
const pendingReminderDeletes = new Map();"""

NEW_3 = """// Phase 1.6: destructive delete dry-run gates.
const pendingVendorDeletes   = new Map();
const pendingExpenseDeletes  = new Map();
const pendingReminderDeletes = new Map();
// PATCH B-6a: budget set/update dry-run gate.
const pendingBudgetSets = new Map();"""

assert src.count(OLD_3) == 1, f"OLD_3 expected 1, got {src.count(OLD_3)}"
src = src.replace(OLD_3, NEW_3)
print("[3/8] pendingBudgetSets Map declared")

# ─── Replacement 4: bride-confirm endpoint — pendingBudgetSets branch ───
# Place after pendingBroadcasts and before pendingReceipts handling.

OLD_4 = """    if (pendingReceipts.has(action_id)) {"""

NEW_4 = """    if (pendingBudgetSets.has(action_id)) {
      // PATCH B-6a: bride tapped Lock in / Update on the budget confirm card.
      const action = pendingBudgetSets.get(action_id);
      if (action.coupleId !== userId) {
        return res.status(403).json({ success: false, error: 'action does not belong to this user', reply: 'That action belongs to a different signed-in account.' });
      }
      pendingBudgetSets.delete(action_id);
      try {
        // Upsert pattern: GET endpoint already creates a default row, but
        // the bride may have never visited that endpoint. Handle both cases.
        const { data: existing } = await supabase
          .from('couple_budget')
          .select('id')
          .eq('couple_id', userId)
          .maybeSingle();
        if (existing) {
          const { error: updErr } = await supabase
            .from('couple_budget')
            .update({ total_budget: action.amount, updated_at: new Date().toISOString() })
            .eq('couple_id', userId);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase
            .from('couple_budget')
            .insert([{ couple_id: userId, total_budget: action.amount, event_envelopes: {} }]);
          if (insErr) throw insErr;
        }
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message, reply: 'Something went sideways saving your budget. Try once more?' });
      }
      const verb = action.isUpdate ? 'updated' : 'set';
      return res.json({
        success: true,
        reply: `✓ Budget ${verb} to ${formatINR(action.amount)}.`,
        summaryLines: action.isUpdate
          ? [`From ${formatINR(action.previousBudget)} to ${formatINR(action.amount)}`]
          : [`Total budget: ${formatINR(action.amount)}`],
      });
    }

    if (pendingReceipts.has(action_id)) {"""

assert src.count(OLD_4) == 1, f"OLD_4 expected 1, got {src.count(OLD_4)}"
src = src.replace(OLD_4, NEW_4)
print("[4/8] bride-confirm pendingBudgetSets branch added")

# ─── Replacement 5: fix query_budget column names (bride side, ~line 11977) ───
# Old: name, amount, category, status, e.amount, e.status === 'paid'
# Real: vendor_name, planned_amount, actual_amount, category, payment_status

OLD_5 = """      case 'query_budget': {
        const { category = null } = toolInput;
        let q = supabase.from('couple_expenses').select('name, amount, category, status').eq('couple_id', coupleId);
        if (category) q = q.eq('category', category);
        const { data } = await q;
        const expenses = data || [];
        const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
        const paid = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + (e.amount || 0), 0);
        const pending = total - paid;
        const { data: budgetData } = await supabase.from('couple_budget').select('total_budget').eq('couple_id', coupleId).single();
        const totalBudget = budgetData?.total_budget || 0;
        const remaining = totalBudget - total;
        let reply = `💰 Budget summary${category ? ' (' + category + ')' : ''}:\\n`;
        if (totalBudget > 0) reply += `Total budget: ₹${totalBudget.toLocaleString('en-IN')}\\n`;
        reply += `Logged: ₹${total.toLocaleString('en-IN')}\\nPaid: ₹${paid.toLocaleString('en-IN')}\\nPending: ₹${pending.toLocaleString('en-IN')}`;
        if (totalBudget > 0) reply += `\\n${remaining >= 0 ? 'Remaining: ₹' + remaining.toLocaleString('en-IN') : 'Over budget by: ₹' + Math.abs(remaining).toLocaleString('en-IN')}`;
        return reply;
      }"""

NEW_5 = """      case 'query_budget': {
        // PATCH B-6a: fixed column names. Was reading name/amount/status which
        // don't exist on couple_expenses; real columns are vendor_name,
        // planned_amount, actual_amount, payment_status.
        const { category = null } = toolInput;
        let q = supabase.from('couple_expenses').select('vendor_name, planned_amount, actual_amount, category, payment_status').eq('couple_id', coupleId);
        if (category) q = q.eq('category', category);
        const { data } = await q;
        const expenses = data || [];
        // Logged = sum of planned commitments (the deal value, paid + pending).
        // Paid = sum of actual_amount on rows marked paid.
        const logged = expenses.reduce((s, e) => s + (Number(e.planned_amount) || 0), 0);
        const paid = expenses.filter(e => e.payment_status === 'paid').reduce((s, e) => s + (Number(e.actual_amount) || 0), 0);
        const pending = Math.max(0, logged - paid);
        const { data: budgetData } = await supabase.from('couple_budget').select('total_budget').eq('couple_id', coupleId).maybeSingle();
        const totalBudget = Number(budgetData?.total_budget) || 0;
        const remaining = totalBudget - logged;
        let reply = `💰 Budget summary${category ? ' (' + category + ')' : ''}:\\n`;
        if (totalBudget > 0) reply += `Total budget: ₹${totalBudget.toLocaleString('en-IN')}\\n`;
        reply += `Logged: ₹${logged.toLocaleString('en-IN')}\\nPaid: ₹${paid.toLocaleString('en-IN')}\\nPending: ₹${pending.toLocaleString('en-IN')}`;
        if (totalBudget > 0) reply += `\\n${remaining >= 0 ? 'Remaining: ₹' + remaining.toLocaleString('en-IN') : 'Over budget by: ₹' + Math.abs(remaining).toLocaleString('en-IN')}`;
        else reply += `\\n(no total budget set yet — say "my budget is X lac" to set one)`;
        return reply;
      }"""

assert src.count(OLD_5) == 1, f"OLD_5 expected 1, got {src.count(OLD_5)}"
src = src.replace(OLD_5, NEW_5)
print("[5/8] query_budget column names fixed")

# ─── Replacement 6: fix Today endpoint column names (line ~11077-11094) ───

OLD_6 = """      supabase.from('couple_expenses').select('id, category, description, amount, is_paid, due_date, vendor_name').eq('couple_id', userId).order('due_date', { ascending: true }).limit(50),
      supabase.from('users').select('token_balance').eq('id', userId).single(),
    ]);
    const user = userR.status === 'fulfilled' ? userR.value.data : null;
    const tasks = tasksR.status === 'fulfilled' ? (tasksR.value.data || []) : [];
    const vendors = vendorsR.status === 'fulfilled' ? (vendorsR.value.data || []) : [];
    const guests = guestsR.status === 'fulfilled' ? (guestsR.value.data || []) : [];
    const events = eventsR.status === 'fulfilled' ? (eventsR.value.data || []) : [];
    const budget = budgetR.status === 'fulfilled' ? budgetR.value.data : null;
    const expenses = expensesR.status === 'fulfilled' ? (expensesR.value.data || []) : [];
    const tokenBalance = tokensR.status === 'fulfilled' ? (tokensR.value.data?.token_balance ?? null) : null;
    const pendingTasks = tasks.filter(t => !t.is_complete);
    const bookedVendors = vendors.filter(v => v.status === 'booked' || v.status === 'confirmed');
    const confirmedGuests = guests.filter(g => g.rsvp_status === 'confirmed');
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const paidExpenses = expenses.filter(e => e.is_paid).reduce((s, e) => s + (e.amount || 0), 0);
    const upcomingPayments = expenses.filter(e => !e.is_paid && e.due_date).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).slice(0, 5);"""

NEW_6 = """      supabase.from('couple_expenses').select('id, category, description, planned_amount, actual_amount, payment_status, due_date, vendor_name').eq('couple_id', userId).order('due_date', { ascending: true }).limit(50),
      supabase.from('users').select('token_balance').eq('id', userId).single(),
    ]);
    const user = userR.status === 'fulfilled' ? userR.value.data : null;
    const tasks = tasksR.status === 'fulfilled' ? (tasksR.value.data || []) : [];
    const vendors = vendorsR.status === 'fulfilled' ? (vendorsR.value.data || []) : [];
    const guests = guestsR.status === 'fulfilled' ? (guestsR.value.data || []) : [];
    const events = eventsR.status === 'fulfilled' ? (eventsR.value.data || []) : [];
    const budget = budgetR.status === 'fulfilled' ? budgetR.value.data : null;
    const expenses = expensesR.status === 'fulfilled' ? (expensesR.value.data || []) : [];
    const tokenBalance = tokensR.status === 'fulfilled' ? (tokensR.value.data?.token_balance ?? null) : null;
    const pendingTasks = tasks.filter(t => !t.is_complete);
    const bookedVendors = vendors.filter(v => v.status === 'booked' || v.status === 'confirmed');
    const confirmedGuests = guests.filter(g => g.rsvp_status === 'confirmed');
    // PATCH B-6a: column-name fix. Was using e.amount/e.is_paid which don't
    // exist; real columns are planned_amount, actual_amount, payment_status.
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.planned_amount) || 0), 0);
    const paidExpenses = expenses.filter(e => e.payment_status === 'paid').reduce((s, e) => s + (Number(e.actual_amount) || 0), 0);
    const upcomingPayments = expenses.filter(e => e.payment_status !== 'paid' && e.due_date).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).slice(0, 5);"""

assert src.count(OLD_6) == 1, f"OLD_6 expected 1, got {src.count(OLD_6)}"
src = src.replace(OLD_6, NEW_6)
print("[6/8] Today endpoint column names fixed")

# Also fix the upcomingPayments .map(e.amount) further down — uses e.amount.
OLD_6b = """      upcoming_payments: upcomingPayments.map(e => ({ id:e.id, vendor_name:e.vendor_name, category:e.category, amount:e.amount, due_date:e.due_date, description:e.description })),"""

NEW_6b = """      upcoming_payments: upcomingPayments.map(e => ({ id:e.id, vendor_name:e.vendor_name, category:e.category, amount: Number(e.planned_amount) || 0, due_date:e.due_date, description:e.description })),"""

assert src.count(OLD_6b) == 1, f"OLD_6b expected 1, got {src.count(OLD_6b)}"
src = src.replace(OLD_6b, NEW_6b)
print("[6b/8] Today endpoint upcoming_payments amount mapping fixed")

# ─── Replacement 7: bride-idle gating logic for budget cold-open prompt ───
# Inject the prompt before the LLM call. If gate fires, hard-replace one of
# the two lines with the budget prompt and write the timestamp.

OLD_7 = """    const ctx = await getBrideContextSummary(userId);

    const promptText = `You are DreamAi — the bride's poetic AI inside Frost."""

NEW_7 = """    const ctx = await getBrideContextSummary(userId);

    // PATCH B-6a: budget cold-open prompt — once-only, gated by activity.
    // Fires if (a) budget_prompt_shown_at is null AND (b) the bride has
    // booked at least one vendor OR has at least one expense logged.
    // Once shown, write the timestamp so it never fires again.
    let budgetPromptLine = null;
    try {
      const { data: budgetRow } = await supabase
        .from('couple_budget')
        .select('total_budget, budget_prompt_shown_at')
        .eq('couple_id', userId)
        .maybeSingle();
      const totalBudget = Number(budgetRow?.total_budget) || 0;
      const alreadyShown = !!budgetRow?.budget_prompt_shown_at;
      const hasActivity = (ctx.vendors_booked > 0) || (ctx.expenses_paid > 0);
      if (totalBudget === 0 && !alreadyShown && hasActivity) {
        budgetPromptLine = "Want to set a total budget so I can pace you?";
        // Write the timestamp first — if the response fails downstream we
        // still don't want to re-prompt later. Idempotent: ensures the row
        // exists (couple_budget GET endpoint creates default if missing,
        // but the bride may not have visited it yet).
        try {
          if (budgetRow) {
            await supabase
              .from('couple_budget')
              .update({ budget_prompt_shown_at: new Date().toISOString() })
              .eq('couple_id', userId);
          } else {
            await supabase
              .from('couple_budget')
              .insert([{
                couple_id: userId,
                total_budget: 0,
                event_envelopes: {},
                budget_prompt_shown_at: new Date().toISOString(),
              }]);
          }
        } catch (e) { /* timestamp write failure is non-fatal — we'll re-fire next idle */ }
      }
    } catch (e) { /* budget read failure: skip the prompt, fall through to normal idle */ }

    const promptText = `You are DreamAi — the bride's poetic AI inside Frost."""

assert src.count(OLD_7) == 1, f"OLD_7 expected 1, got {src.count(OLD_7)}"
src = src.replace(OLD_7, NEW_7)
print("[7/8] bride-idle budget cold-open gating added")

# Now also need to inject budgetPromptLine into the final returned lines.
# The current code computes `lines` from the LLM response, slices to 2.
# If budgetPromptLine is set, replace the LAST line so the LLM-generated
# context-aware line stays first and the prompt sits second.

OLD_7b = """    const lines = text.split('\\n').map(s => s.trim()).filter(Boolean).slice(0, 2);
    if (lines.length < 2) {
      lines.push('Pick a colour for the morning. I will think about it with you.');
    }

    BRIDE_IDLE_CACHE.set(userId, { hourBucket, lines });"""

NEW_7b = """    const lines = text.split('\\n').map(s => s.trim()).filter(Boolean).slice(0, 2);
    if (lines.length < 2) {
      lines.push('Pick a colour for the morning. I will think about it with you.');
    }
    // PATCH B-6a: replace the second line with the budget cold-open if gated.
    // Keeps the LLM's context-aware first line, surfaces the budget nudge below.
    if (budgetPromptLine) {
      lines[1] = budgetPromptLine;
    }

    BRIDE_IDLE_CACHE.set(userId, { hourBucket, lines });"""

assert src.count(OLD_7b) == 1, f"OLD_7b expected 1, got {src.count(OLD_7b)}"
src = src.replace(OLD_7b, NEW_7b)
print("[7b/8] bride-idle line injection wired")

# ─── Replacement 8: system prompt — set_total_budget routing ───
# Add to the WHEN TO USE WHICH TOOL block.

OLD_8 = """- "I just spent 5k on flowers" → add_expense"""

NEW_8 = """- "I just spent 5k on flowers" → add_expense
- "My budget is 40 lac", "Set my budget to 35 lakhs", "Make my budget 50 lac" → set_total_budget (convert lakhs → rupees: 1 lac = 100,000)"""

assert src.count(OLD_8) == 1, f"OLD_8 expected 1, got {src.count(OLD_8)}"
src = src.replace(OLD_8, NEW_8)
print("[8/8] system prompt set_total_budget routing added")

# ─── Sentinel ───
SENTINEL = "// ─── PATCH B-6a LOADED ─── //\n"
if SENTINEL not in src:
    src = src.rstrip() + "\n\n" + SENTINEL

with open(TARGET, 'w', encoding='utf-8') as f:
    f.write(src)

print(f"\nWrote {TARGET}")
print(f"Size delta: {len(src) - orig_len:+d} bytes")
print("\n⚠ MIGRATION REQUIRED FIRST — run in Supabase SQL editor:")
print("    ALTER TABLE couple_budget")
print("    ADD COLUMN IF NOT EXISTS budget_prompt_shown_at timestamp with time zone;")
print("\nThen: node --check backend/server.js")
