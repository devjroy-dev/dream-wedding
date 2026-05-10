#!/usr/bin/env python3
"""
PATCH B-1 — book_vendor without quote

Bug: book_vendor's tool schema required `total_price`. When the bride says
"add Swati R as a jeweller, no quote yet", the model has no callable tool
that fits and instead generates a confident "Done" reply text without
calling the tool. Vendor never gets written.

Fix: drop total_price from required. When total_price is missing/null:
- Skip expense logging (advance + balance)
- Skip balance reminder creation
- Set vendor status to 'enquired' instead of 'booked'
- Adapt confirmPreview and success reply text accordingly

Validates: node --check backend/server.js
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# Default to the cloned dream-wedding repo location used by Codespaces
REPO = os.environ.get('TDW_REPO', '/workspaces/dream-wedding')
TARGET = os.path.join(REPO, 'backend', 'server.js')

if not os.path.exists(TARGET):
    print(f"ERROR: cannot find {TARGET}")
    print("Set TDW_REPO env var to the dream-wedding repo root.")
    sys.exit(1)

with open(TARGET, 'r', encoding='utf-8') as f:
    src = f.read()

orig_len = len(src)

# ─── Replacement 1: tool description + required array ───
# Update tool description to reflect optional total_price; drop total_price
# from required.

OLD_1 = """    name: 'book_vendor',
    description: 'Composite tool. Use when the bride says she has booked or finalized a vendor with a total price and (optionally) an advance amount. Example: "Booked Swati for 1 lakh, paid 30k advance". This will: (1) update vendor status to booked, (2) log the advance as a paid expense, (3) auto-create a balance reminder. After this, ASK YES/NO follow-ups for: thank-you note draft, share with circle.',
    input_schema: {
      type: 'object',
      properties: {
        vendor_name: { type: 'string', description: 'Vendor name as the bride said it (will be matched against her saved vendors).' },
        total_price: { type: 'number', description: 'Total agreed price in rupees.' },
        advance: { type: 'number', description: 'Advance paid in rupees (optional).' },
        category: { type: 'string', description: 'Vendor category if not already in her saved list (mua, photographer, decorator, designer, jeweller, venue, caterer, choreographer, event, other).' },
      },
      required: ['vendor_name', 'total_price'],
    },"""

NEW_1 = """    name: 'book_vendor',
    description: 'Composite tool. Use whenever the bride wants to add or book a vendor — with OR WITHOUT a total price. If she has booked with a price ("Booked Swati for 1 lakh, paid 30k advance"), it will: (1) update vendor status to booked, (2) log the advance as a paid expense, (3) auto-create a balance reminder. If she has only added them without a quote ("add Swati R as a jeweller, no quote yet"), it will simply add them with status=enquired — no expense, no reminder. After a booking with price, ASK YES/NO follow-ups for: thank-you note draft, share with circle.',
    input_schema: {
      type: 'object',
      properties: {
        vendor_name: { type: 'string', description: 'Vendor name as the bride said it (will be matched against her saved vendors).' },
        total_price: { type: 'number', description: 'Total agreed price in rupees. Optional — omit if the bride has not given a quote yet.' },
        advance: { type: 'number', description: 'Advance paid in rupees (optional).' },
        category: { type: 'string', description: 'Vendor category if not already in her saved list (mua, photographer, decorator, designer, jeweller, venue, caterer, choreographer, event, other).' },
      },
      required: ['vendor_name'],
    },"""

assert src.count(OLD_1) == 1, f"OLD_1 expected exactly 1 match, got {src.count(OLD_1)}"
src = src.replace(OLD_1, NEW_1)
print("[1/4] tool def updated — total_price now optional")

# ─── Replacement 2: confirmPreview block ───
# When there's no total_price, summary lines change shape.

OLD_2 = """      case 'book_vendor': {
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
        }"""

NEW_2 = """      case 'book_vendor': {
        const { vendor_name, total_price = null, advance = 0, category = null, confirmed = false } = toolInput;
        const hasQuote = total_price != null && total_price > 0;

        // FIX-4: dry-run gate — first call (LLM) returns preview; bride-confirm
        // replays with confirmed=true to actually write.
        // PATCH B-1: when no quote, the confirm card describes a no-quote add.
        if (!confirmed) {
          const action_id = 'booking_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
          pendingBookings.set(action_id, { coupleId, vendor_name, total_price, advance, category });
          setTimeout(() => pendingBookings.delete(action_id), 10 * 60 * 1000);
          if (!hasQuote) {
            return {
              ok: true,
              kind: 'confirm-required',
              reply: `Want me to add ${vendor_name}?`,
              confirmPreview: {
                summaryTitle: `Add ${vendor_name}?`,
                summaryLines: [
                  category ? `Category: ${category}` : 'Category: existing on file',
                  'No quote yet — you can update later',
                  'Status: enquired',
                ],
                confirmLabel: 'Add',
                cancelLabel: 'Not yet',
                action_id,
              },
            };
          }
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
        }"""

assert src.count(OLD_2) == 1, f"OLD_2 expected exactly 1 match, got {src.count(OLD_2)}"
src = src.replace(OLD_2, NEW_2)
print("[2/4] confirmPreview block now handles no-quote case")

# ─── Replacement 3: vendor write + expense/reminder gating ───
# Step 3 (vendor update with status=booked) must become conditional. Step 4-6
# (expense advance + balance + reminder) must skip entirely when no quote.

OLD_3 = """        // 3. Update vendor: status=booked, quoted_total, balance_due_date
        const updateData = { status: 'booked', quoted_total: total_price, source: 'dreamai', last_dreamai_action: new Date().toISOString() };
        if (balanceDueDate) updateData.balance_due_date = balanceDueDate;
        const { error: updateErr } = await supabase
          .from('couple_vendors')
          .update(updateData)
          .eq('id', vendorRow.id);
        if (updateErr) throw updateErr;

        // 4. Log advance as a paid expense (if any)
        // Real schema: event (NOT NULL), category, vendor_name, description, planned_amount, actual_amount, payment_status, due_date, notes
        const eventTag = (vendorRow.events && Array.isArray(vendorRow.events) && vendorRow.events.length > 0)
          ? vendorRow.events[0]
          : 'general';

        if (advance > 0) {
          const { error: expErr } = await supabase.from('couple_expenses').insert([{
            couple_id: coupleId,
            event: eventTag,
            category: vendorRow.category || category || 'other',
            vendor_name: vendor_name,
            description: 'Advance payment',
            planned_amount: advance,
            actual_amount: advance,
            payment_status: 'paid',
            notes: 'Logged via DreamAi on booking',
          }]);
          if (expErr) console.error('[bride book_vendor expense]', expErr.message);
        }

        // 5. Also log a planned-but-unpaid expense for the balance, so the budget reflects total commitment
        const balance = total_price - advance;
        if (balance > 0) {
          const { error: balExpErr } = await supabase.from('couple_expenses').insert([{
            couple_id: coupleId,
            event: eventTag,
            category: vendorRow.category || category || 'other',
            vendor_name: vendor_name,
            description: 'Balance due',
            planned_amount: balance,
            actual_amount: 0,
            payment_status: 'pending',
            due_date: balanceDueDate,
            notes: 'Logged via DreamAi on booking',
          }]);
          if (balExpErr) console.error('[bride book_vendor balance expense]', balExpErr.message);
        }

        // 6. Auto-create balance reminder in couple_checklist
        // Real schema: id, couple_id, event (NOT NULL), text (NOT NULL), is_complete, priority, due_date, ...
        let reminderCreated = false;
        if (balance > 0) {
          let dueDate = balanceDueDate;
          if (!dueDate) {
            const fallback = new Date();
            fallback.setDate(fallback.getDate() + 60);
            dueDate = fallback.toISOString().slice(0, 10);
          }
          const { error: remErr } = await supabase.from('couple_checklist').insert([{
            couple_id: coupleId,
            event: eventTag,
            text: 'Pay balance to ' + vendor_name + ' — ₹' + balance.toLocaleString('en-IN'),
            due_date: dueDate,
            priority: 'high',
            is_custom: true,
          }]);
          if (!remErr) reminderCreated = true;
          else console.error('[bride book_vendor reminder]', remErr.message);
        }"""

NEW_3 = """        // 3. Update vendor: status=booked (with quote) OR enquired (no quote), quoted_total, balance_due_date
        // PATCH B-1: when no quote, only mark status='enquired' and set source/last_dreamai_action.
        const eventTag = (vendorRow.events && Array.isArray(vendorRow.events) && vendorRow.events.length > 0)
          ? vendorRow.events[0]
          : 'general';
        const updateData = hasQuote
          ? { status: 'booked', quoted_total: total_price, source: 'dreamai', last_dreamai_action: new Date().toISOString() }
          : { status: 'enquired', source: 'dreamai', last_dreamai_action: new Date().toISOString() };
        if (hasQuote && balanceDueDate) updateData.balance_due_date = balanceDueDate;
        const { error: updateErr } = await supabase
          .from('couple_vendors')
          .update(updateData)
          .eq('id', vendorRow.id);
        if (updateErr) throw updateErr;

        // 4. Log advance as a paid expense (if any) — only when there's a quote
        // Real schema: event (NOT NULL), category, vendor_name, description, planned_amount, actual_amount, payment_status, due_date, notes
        if (hasQuote && advance > 0) {
          const { error: expErr } = await supabase.from('couple_expenses').insert([{
            couple_id: coupleId,
            event: eventTag,
            category: vendorRow.category || category || 'other',
            vendor_name: vendor_name,
            description: 'Advance payment',
            planned_amount: advance,
            actual_amount: advance,
            payment_status: 'paid',
            notes: 'Logged via DreamAi on booking',
          }]);
          if (expErr) console.error('[bride book_vendor expense]', expErr.message);
        }

        // 5. Also log a planned-but-unpaid expense for the balance, so the budget reflects total commitment
        const balance = hasQuote ? (total_price - advance) : 0;
        if (hasQuote && balance > 0) {
          const { error: balExpErr } = await supabase.from('couple_expenses').insert([{
            couple_id: coupleId,
            event: eventTag,
            category: vendorRow.category || category || 'other',
            vendor_name: vendor_name,
            description: 'Balance due',
            planned_amount: balance,
            actual_amount: 0,
            payment_status: 'pending',
            due_date: balanceDueDate,
            notes: 'Logged via DreamAi on booking',
          }]);
          if (balExpErr) console.error('[bride book_vendor balance expense]', balExpErr.message);
        }

        // 6. Auto-create balance reminder in couple_checklist — only when there's a quote AND a balance
        // Real schema: id, couple_id, event (NOT NULL), text (NOT NULL), is_complete, priority, due_date, ...
        let reminderCreated = false;
        if (hasQuote && balance > 0) {
          let dueDate = balanceDueDate;
          if (!dueDate) {
            const fallback = new Date();
            fallback.setDate(fallback.getDate() + 60);
            dueDate = fallback.toISOString().slice(0, 10);
          }
          const { error: remErr } = await supabase.from('couple_checklist').insert([{
            couple_id: coupleId,
            event: eventTag,
            text: 'Pay balance to ' + vendor_name + ' — ₹' + balance.toLocaleString('en-IN'),
            due_date: dueDate,
            priority: 'high',
            is_custom: true,
          }]);
          if (!remErr) reminderCreated = true;
          else console.error('[bride book_vendor reminder]', remErr.message);
        }"""

assert src.count(OLD_3) == 1, f"OLD_3 expected exactly 1 match, got {src.count(OLD_3)}"
src = src.replace(OLD_3, NEW_3)
print("[3/4] vendor write + expense/reminder gated by hasQuote")

# ─── Replacement 4: success reply / summary lines ───
# When there's no quote, success message says "added as enquired" not "locked in".
# Note: I also need to remove the duplicate eventTag declaration that NEW_3 already
# moved up. The original block below references eventTag but it's now defined earlier,
# so I just need to update the success summary + reply.

OLD_4 = """        // 7. Build the structured response for Frost UI
        const summaryLines = [
          `${vendor_name} — locked in as ${vendorRow.category || category}`,
          `₹${total_price.toLocaleString('en-IN')} total`,
        ];
        if (advance > 0) summaryLines.push(`₹${advance.toLocaleString('en-IN')} advance paid today`);
        if (reminderCreated && balanceDueDate) {
          summaryLines.push(`Balance reminder set for ${balanceDueDate} (two weeks before the wedding)`);
        } else if (reminderCreated) {
          summaryLines.push(`Balance reminder set`);
        }

        const followups = [
          {
            id: 'thank_you_note',
            text: `Want me to draft a thank-you note to ${vendor_name}?`,
            yesLabel: 'Yes, draft it',
            noLabel: 'Not now',
          },
          {
            id: 'share_with_circle',
            text: `Should I let your Circle know that ${vendor_name} is locked in?`,
            yesLabel: 'Share',
            noLabel: 'Keep private',
          },
        ];

        return {
          ok: true,
          kind: 'composite',
          reply: `✓ Done. ${vendor_name} is locked in.`,
          confirmPreview: null,
          summaryLines,
          followupPrompts: followups,
          // FIX-3: return vendor_id for anchor routing — long-press jumps to vendor page
          vendor_id: vendorRow.id,
        };
      }"""

NEW_4 = """        // 7. Build the structured response for Frost UI
        // PATCH B-1: when no quote, summary + reply describe an enquired add, not a lock-in.
        if (!hasQuote) {
          const summaryLines = [
            `${vendor_name} added as ${vendorRow.category || category || 'vendor'}`,
            'Status: enquired',
            'No quote yet — you can update her quote whenever you\\'re ready',
          ];
          return {
            ok: true,
            kind: 'composite',
            reply: `✓ Added ${vendor_name} to your list. You can update the quote whenever you're ready.`,
            confirmPreview: null,
            summaryLines,
            followupPrompts: [],
            vendor_id: vendorRow.id,
          };
        }
        const summaryLines = [
          `${vendor_name} — locked in as ${vendorRow.category || category}`,
          `₹${total_price.toLocaleString('en-IN')} total`,
        ];
        if (advance > 0) summaryLines.push(`₹${advance.toLocaleString('en-IN')} advance paid today`);
        if (reminderCreated && balanceDueDate) {
          summaryLines.push(`Balance reminder set for ${balanceDueDate} (two weeks before the wedding)`);
        } else if (reminderCreated) {
          summaryLines.push(`Balance reminder set`);
        }

        const followups = [
          {
            id: 'thank_you_note',
            text: `Want me to draft a thank-you note to ${vendor_name}?`,
            yesLabel: 'Yes, draft it',
            noLabel: 'Not now',
          },
          {
            id: 'share_with_circle',
            text: `Should I let your Circle know that ${vendor_name} is locked in?`,
            yesLabel: 'Share',
            noLabel: 'Keep private',
          },
        ];

        return {
          ok: true,
          kind: 'composite',
          reply: `✓ Done. ${vendor_name} is locked in.`,
          confirmPreview: null,
          summaryLines,
          followupPrompts: followups,
          // FIX-3: return vendor_id for anchor routing — long-press jumps to vendor page
          vendor_id: vendorRow.id,
        };
      }"""

assert src.count(OLD_4) == 1, f"OLD_4 expected exactly 1 match, got {src.count(OLD_4)}"
src = src.replace(OLD_4, NEW_4)
print("[4/4] success reply / summary lines gated by hasQuote")

# ─── Add sentinel comment at end of file ───
SENTINEL = "// ─── PATCH B-1 LOADED ─── //\n"
if SENTINEL not in src:
    src = src.rstrip() + "\n\n" + SENTINEL

with open(TARGET, 'w', encoding='utf-8') as f:
    f.write(src)

print(f"\nWrote {TARGET}")
print(f"Size delta: {len(src) - orig_len:+d} bytes")
print("\nNow run:  node --check backend/server.js")
