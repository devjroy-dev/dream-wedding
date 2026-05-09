#!/usr/bin/env python3
"""
Phase 1.6 backend patch — Dream Ai update/delete tools + contact_vendor.

Adds 7 new tools to FROST_BRIDE_TOOLS:
  - update_vendor    (change name/phone/category/quoted_total/balance_due_date/events)
  - update_expense   (change amount/status/due_date/notes/vendor_name)
  - update_reminder  (change text/due_date/event/priority)
  - delete_vendor    (confirm-required)
  - delete_expense   (confirm-required)
  - delete_reminder  (confirm-required — deletes are usually destructive enough to warrant)
  - contact_vendor   (call or whatsapp; returns contact_action card; no DB write)

Adds executor cases for each.
Adds 3 pending stores (pendingVendorDeletes, pendingExpenseDeletes, pendingReminderDeletes).
Adds 3 bride-confirm replay handlers for the destructive deletes.
Adds system prompt sections teaching Haiku when to use each tool, plus the
bride-voice WhatsApp drafting register for contact_vendor.

Idempotent (sentinel-checked). Run with: node --check after applying.
"""
import sys, os, re

SERVER = "/home/claude/dream-wedding/backend/server.js"
SENTINEL = "// ─── PHASE 1.6 LOADED ─── //"

with open(SERVER) as f:
    src = f.read()

if SENTINEL in src:
    print("✗ Phase 1.6 already applied (sentinel found). Aborting.")
    sys.exit(1)

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 1 — Add 7 new tool definitions to FROST_BRIDE_TOOLS array
# ═══════════════════════════════════════════════════════════════════════════
# Insert before the closing `];` of the FROST_BRIDE_TOOLS array.
# We anchor on the read_circle_thread tool (last tool in array) and append
# right after its closing `},`.

OLD_LAST_TOOL = """    name: 'read_circle_thread',
    description: \"Read recent messages from a Circle thread. Use when the bride asks what someone said, references a Circle conversation, or wants to catch up on a thread. E.g. 'What did mom say?', 'Show me the Logistics Squad thread', 'Did Pooja reply?'. Confirm-not-required — read only, never writes.\",
    input_schema: {
      type: 'object',
      properties: {
        member_name: { type: 'string', description: \"Name of the Circle member whose DM thread to read. Use this OR group_name, not both.\" },
        group_name: { type: 'string', description: \"Name of the group thread to read (e.g. 'Logistics Squad'). Use this OR member_name, not both.\" },
        limit: { type: 'number', description: \"Number of recent messages to return. Default 10, max 20.\" },
      },
    },
  },
];"""

NEW_TOOLS_INSERTION = """    name: 'read_circle_thread',
    description: \"Read recent messages from a Circle thread. Use when the bride asks what someone said, references a Circle conversation, or wants to catch up on a thread. E.g. 'What did mom say?', 'Show me the Logistics Squad thread', 'Did Pooja reply?'. Confirm-not-required — read only, never writes.\",
    input_schema: {
      type: 'object',
      properties: {
        member_name: { type: 'string', description: \"Name of the Circle member whose DM thread to read. Use this OR group_name, not both.\" },
        group_name: { type: 'string', description: \"Name of the group thread to read (e.g. 'Logistics Squad'). Use this OR member_name, not both.\" },
        limit: { type: 'number', description: \"Number of recent messages to return. Default 10, max 20.\" },
      },
    },
  },

  // ─── PHASE 1.6 — UPDATE / DELETE / CONTACT TOOLS ─────────────────────────
  // These complete the bride's CRUD vocabulary. Adding/reading was already
  // possible via book_vendor/add_expense/create_reminder + query_my_*.
  // Now: editing existing rows, deleting them, and reaching out to vendors.
  {
    name: 'update_vendor',
    description: \"Edit fields on an existing vendor in the bride's couple_vendors. Use when she says 'change Swati's number to X', 'her quote is now 80k not 60k', 'move the photographer to mehendi instead of sangeet', 'Swati's category should be MUA not photographer'. The vendor must already exist on her list — if not found, returns clarify. Confirm-not-required (small edits don't need a Yes/No card).\",
    input_schema: {
      type: 'object',
      properties: {
        vendor_name: { type: 'string', description: \"The vendor's name as the bride refers to her — looked up via ilike against couple_vendors.name. Required.\" },
        new_name: { type: 'string', description: \"New name if she's renaming.\" },
        phone: { type: 'string', description: \"Vendor's phone number, with or without country code. Will be normalised to E.164 with +91 default.\" },
        category: { type: 'string', description: \"Vendor category (MUA, photographer, decorator, caterer, etc).\" },
        quoted_total: { type: 'number', description: \"Updated total quote in INR.\" },
        balance_due_date: { type: 'string', description: \"ISO date (YYYY-MM-DD) when the balance is due.\" },
        events: { type: 'array', items: { type: 'string' }, description: \"Which events the vendor covers (haldi, mehendi, sangeet, wedding, reception). Replaces the existing array.\" },
        status: { type: 'string', description: \"Vendor pipeline status (enquired, considering, in_discussion, shortlisted, booked, declined).\" },
        notes: { type: 'string', description: \"Free-text notes the bride wants attached.\" },
      },
      required: ['vendor_name'],
    },
  },
  {
    name: 'update_expense',
    description: \"Edit fields on an existing expense row. Use when she says 'the lehenga was actually 75k not 65k', 'mark Swati's advance as paid', 'change the due date to next Monday', 'the florist deposit is committed not pending'. Looked up by description or vendor_name + most-recent. Confirm-not-required.\",
    input_schema: {
      type: 'object',
      properties: {
        match_vendor_name: { type: 'string', description: \"Find the most-recent expense whose vendor_name ilikes this. Use this OR match_description.\" },
        match_description: { type: 'string', description: \"Find the most-recent expense whose description ilikes this. Use this OR match_vendor_name.\" },
        new_planned_amount: { type: 'number', description: \"Updated planned amount in INR.\" },
        new_actual_amount: { type: 'number', description: \"Updated actual paid amount in INR.\" },
        new_payment_status: { type: 'string', description: \"New payment status: pending | committed | paid.\" },
        new_due_date: { type: 'string', description: \"ISO date (YYYY-MM-DD) for new due date.\" },
        new_notes: { type: 'string', description: \"New free-text notes.\" },
      },
    },
  },
  {
    name: 'update_reminder',
    description: \"Edit fields on an existing reminder/task. Use when she says 'move my lehenga pickup to Tuesday', 'change priority to high', 'tag this to mehendi'. Looked up by text ilike. Confirm-not-required.\",
    input_schema: {
      type: 'object',
      properties: {
        match_text: { type: 'string', description: \"Find the most-recent reminder whose text ilikes this. Required.\" },
        new_text: { type: 'string', description: \"Updated reminder text.\" },
        new_due_date: { type: 'string', description: \"ISO date (YYYY-MM-DD) for new due date.\" },
        new_event: { type: 'string', description: \"Tag the reminder to a specific event (haldi, mehendi, sangeet, wedding, reception).\" },
        new_priority: { type: 'string', description: \"Priority: low | medium | high.\" },
      },
      required: ['match_text'],
    },
  },
  {
    name: 'delete_vendor',
    description: \"Remove a vendor from the bride's list. Confirm-required — destructive. Use when she says 'remove Swati from my vendors', 'I'm not going with Arjun anymore', 'drop the third decorator'. Returns a confirmPreview the bride must tap Yes on.\",
    input_schema: {
      type: 'object',
      properties: {
        vendor_name: { type: 'string', description: \"Vendor's name; looked up via ilike. Required.\" },
        confirmed: { type: 'boolean', description: \"Internal — set automatically by the bride-confirm replay. Never set this from the model.\" },
      },
      required: ['vendor_name'],
    },
  },
  {
    name: 'delete_expense',
    description: \"Remove an expense row. Confirm-required — destructive. Use when she says 'undo that expense', 'remove the catering charge', 'I shouldn't have logged the lehenga twice — delete one'. Returns a confirmPreview.\",
    input_schema: {
      type: 'object',
      properties: {
        match_vendor_name: { type: 'string', description: \"Match by vendor_name ilike. Use this OR match_description.\" },
        match_description: { type: 'string', description: \"Match by description ilike. Use this OR match_vendor_name.\" },
        confirmed: { type: 'boolean', description: \"Internal.\" },
      },
    },
  },
  {
    name: 'delete_reminder',
    description: \"Remove a reminder. Confirm-required — destructive. Use when she says 'forget that reminder', 'I don't need the call-the-florist task', 'remove the 4pm thing'. Returns a confirmPreview.\",
    input_schema: {
      type: 'object',
      properties: {
        match_text: { type: 'string', description: \"Match by text ilike. Required.\" },
        confirmed: { type: 'boolean', description: \"Internal.\" },
      },
      required: ['match_text'],
    },
  },
  {
    name: 'contact_vendor',
    description: \"Call or message a vendor. Use when the bride says 'call Swati', 'message Arjun about the timeline', 'WhatsApp the decorator to confirm'. Looks up the vendor's phone in couple_vendors. Returns a contact_action card the bride taps to dial or open WhatsApp. Does NOT actually place the call or send the message — opens the native app with content pre-filled. The bride is always the one who hits Send. If mode='whatsapp' AND the bride has indicated what she wants to say, draft the message in HER voice (first-person, warm, brief, Indian-bride-natural). If she didn't say what to message about, draft a soft generic opener like 'Hi <name>! Quick question for you.'. Confirm-not-required.\",
    input_schema: {
      type: 'object',
      properties: {
        vendor_name: { type: 'string', description: \"Vendor's name; looked up via ilike. Required.\" },
        mode: { type: 'string', enum: ['call', 'whatsapp'], description: \"'call' opens the native dialer. 'whatsapp' opens WhatsApp with pre-filled message. Required.\" },
        message: { type: 'string', description: \"Drafted message text. Used only when mode='whatsapp'. Write in the BRIDE'S voice, not yours — first-person, warm, short, Indian-bride-natural. Examples: 'Hi Swati! Between the red and gold lehenga, which would you suggest for the wedding day?', 'Hey Arjun, just confirming — Sangeet shoot starts at 6pm right?'\" },
      },
      required: ['vendor_name', 'mode'],
    },
  },
];"""

if OLD_LAST_TOOL not in src:
    print("✗ PATCH 1 anchor not found (read_circle_thread block)")
    sys.exit(1)
src = src.replace(OLD_LAST_TOOL, NEW_TOOLS_INSERTION, 1)
print("✓ PATCH 1 applied — 7 new tool definitions added to FROST_BRIDE_TOOLS")


# ═══════════════════════════════════════════════════════════════════════════
# PATCH 2 — Add 7 executor cases to executeBrideToolCall switch
# Anchor: insert immediately after the read_circle_thread case closes.
# ═══════════════════════════════════════════════════════════════════════════
# We anchor on a unique line. Find the closing of read_circle_thread case.

CASE_ANCHOR_OLD = """      case 'read_circle_thread': {"""

# We need to find the END of that case. Search for the next case after it.
# Strategy: insert NEW cases right after the read_circle_thread case ends.
# read_circle_thread case ends at `      }` then `      case ...:` or
# the default. Let me anchor on the `default:` of executeBrideToolCall to
# insert before it. Looking at line 13279 — `default:` after general_reply.

DEFAULT_ANCHOR = """      case 'general_reply':
        return { ok: true, kind: 'reply', reply: toolInput.reply };

      default:
        return { ok: false, kind: 'unknown', reply: \"I'm not sure what you'd like me to do. Could you say it differently?\" };
    }
  } catch (err) {
    console.error('[Bride DreamAi] Tool error:', toolName, err.message);
    return { ok: false, kind: 'error', reply: `Something went sideways: ${err.message}` };
  }
}"""

NEW_DEFAULT_BLOCK = """      // ─── PHASE 1.6 — UPDATE / DELETE / CONTACT EXECUTOR CASES ───────────

      case 'update_vendor': {
        const {
          vendor_name, new_name, phone, category, quoted_total,
          balance_due_date, events, status, notes,
        } = toolInput || {};
        if (!vendor_name) {
          return { ok: false, kind: 'unsure', reply: \"Which vendor?\" };
        }
        const { data: matches } = await supabase
          .from('couple_vendors')
          .select('id, name')
          .eq('couple_id', coupleId)
          .ilike('name', '%' + vendor_name + '%');
        if (!matches || matches.length === 0) {
          return { ok: false, kind: 'unsure', reply: `I don't have ${vendor_name} on your list. Want to add them?` };
        }
        if (matches.length > 1) {
          return {
            ok: false, kind: 'clarify',
            reply: `A few names match — ${matches.map(m => m.name).join(', ')}. Which one?`,
          };
        }
        const updates = {};
        if (new_name) updates.name = new_name;
        if (phone) {
          // Normalise to E.164 with +91 default if no country code
          let p = String(phone).replace(/[^0-9+]/g, '');
          if (!p.startsWith('+')) {
            if (p.length === 10) p = '+91' + p;
            else if (p.startsWith('91') && p.length === 12) p = '+' + p;
          }
          updates.phone = p;
        }
        if (category) updates.category = category;
        if (quoted_total != null) updates.quoted_total = quoted_total;
        if (balance_due_date) updates.balance_due_date = balance_due_date;
        if (Array.isArray(events) && events.length > 0) updates.events = events;
        if (status) updates.status = status;
        if (notes) updates.notes = notes;
        if (Object.keys(updates).length === 0) {
          return { ok: false, kind: 'unsure', reply: \"Tell me what to change for them.\" };
        }
        updates.updated_at = new Date().toISOString();
        const { error } = await supabase
          .from('couple_vendors')
          .update(updates)
          .eq('id', matches[0].id);
        if (error) throw error;
        const fields = Object.keys(updates).filter(k => k !== 'updated_at');
        const fieldsLabel = fields.join(', ');
        return {
          ok: true, kind: 'reply',
          reply: `Updated ${matches[0].name} — ${fieldsLabel}.`,
          vendor_id: matches[0].id,
          tool_anchor: { tool: 'vendors', entity_type: 'vendor', entity_id: String(matches[0].id) },
        };
      }

      case 'update_expense': {
        const {
          match_vendor_name, match_description,
          new_planned_amount, new_actual_amount, new_payment_status,
          new_due_date, new_notes,
        } = toolInput || {};
        if (!match_vendor_name && !match_description) {
          return { ok: false, kind: 'unsure', reply: \"Which expense?\" };
        }
        let q = supabase.from('couple_expenses')
          .select('id, vendor_name, description, planned_amount, actual_amount, payment_status')
          .eq('couple_id', coupleId);
        if (match_vendor_name) q = q.ilike('vendor_name', '%' + match_vendor_name + '%');
        if (match_description) q = q.ilike('description', '%' + match_description + '%');
        const { data: matches } = await q.order('created_at', { ascending: false }).limit(5);
        if (!matches || matches.length === 0) {
          return { ok: false, kind: 'unsure', reply: \"I couldn't find that expense.\" };
        }
        if (matches.length > 1) {
          const lines = matches.map(m => '• ' + (m.vendor_name || m.description || 'Untitled') + ' — ' + formatINR(m.actual_amount || m.planned_amount || 0));
          return {
            ok: false, kind: 'clarify',
            reply: \"A few match — which one?\\n\\n\" + lines.join('\\n'),
          };
        }
        const updates = {};
        if (new_planned_amount != null) updates.planned_amount = new_planned_amount;
        if (new_actual_amount != null) updates.actual_amount = new_actual_amount;
        if (new_payment_status) updates.payment_status = new_payment_status;
        if (new_due_date) updates.due_date = new_due_date;
        if (new_notes) updates.notes = new_notes;
        if (Object.keys(updates).length === 0) {
          return { ok: false, kind: 'unsure', reply: \"Tell me what to change about it.\" };
        }
        updates.updated_at = new Date().toISOString();
        const { error } = await supabase
          .from('couple_expenses')
          .update(updates)
          .eq('id', matches[0].id);
        if (error) throw error;
        const label = matches[0].vendor_name || matches[0].description || 'expense';
        return {
          ok: true, kind: 'reply',
          reply: `Updated ${label}.`,
          expense_id: matches[0].id,
          tool_anchor: { tool: 'money', entity_type: 'expense', entity_id: String(matches[0].id) },
        };
      }

      case 'update_reminder': {
        const { match_text, new_text, new_due_date, new_event, new_priority } = toolInput || {};
        if (!match_text) {
          return { ok: false, kind: 'unsure', reply: \"Which reminder?\" };
        }
        const { data: matches } = await supabase
          .from('couple_checklist')
          .select('id, text, is_complete')
          .eq('couple_id', coupleId)
          .ilike('text', '%' + match_text + '%')
          .order('created_at', { ascending: false })
          .limit(5);
        if (!matches || matches.length === 0) {
          return { ok: false, kind: 'unsure', reply: \"I couldn't find that reminder.\" };
        }
        if (matches.length > 1) {
          const lines = matches.map(m => '• ' + m.text);
          return {
            ok: false, kind: 'clarify',
            reply: \"A few match — which one?\\n\\n\" + lines.join('\\n'),
          };
        }
        const updates = {};
        if (new_text) updates.text = new_text;
        if (new_due_date) updates.due_date = new_due_date;
        if (new_event) updates.event = new_event;
        if (new_priority) updates.priority = new_priority;
        if (Object.keys(updates).length === 0) {
          return { ok: false, kind: 'unsure', reply: \"Tell me what to change.\" };
        }
        const { error } = await supabase
          .from('couple_checklist')
          .update(updates)
          .eq('id', matches[0].id);
        if (error) throw error;
        return {
          ok: true, kind: 'reply',
          reply: `Updated.`,
          task_id: matches[0].id,
          tool_anchor: { tool: 'tasks', entity_type: 'task', entity_id: String(matches[0].id) },
        };
      }

      case 'delete_vendor': {
        const { vendor_name, confirmed = false } = toolInput || {};
        if (!vendor_name) {
          return { ok: false, kind: 'unsure', reply: \"Which vendor?\" };
        }
        const { data: matches } = await supabase
          .from('couple_vendors')
          .select('id, name, category')
          .eq('couple_id', coupleId)
          .ilike('name', '%' + vendor_name + '%');
        if (!matches || matches.length === 0) {
          return { ok: false, kind: 'unsure', reply: `I don't have ${vendor_name} on your list.` };
        }
        if (matches.length > 1) {
          return {
            ok: false, kind: 'clarify',
            reply: `A few names match — ${matches.map(m => m.name).join(', ')}. Which one?`,
          };
        }
        if (!confirmed) {
          const action_id = 'vendor_del_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
          pendingVendorDeletes.set(action_id, { coupleId, vendor_id: matches[0].id, vendor_name: matches[0].name });
          setTimeout(() => pendingVendorDeletes.delete(action_id), 10 * 60 * 1000);
          return {
            ok: true, kind: 'confirm-required',
            reply: `Remove ${matches[0].name} from your vendors?`,
            confirmPreview: {
              summaryTitle: `Remove ${matches[0].name}?`,
              summaryLines: [
                matches[0].category ? `Category: ${matches[0].category}` : 'Category: not set',
                'They\\'ll be gone from your team.',
                'You can always add them back.',
              ],
              confirmLabel: 'Remove',
              cancelLabel: 'Keep',
              action_id,
            },
          };
        }
        // Confirmed — actually delete
        const { error } = await supabase
          .from('couple_vendors')
          .delete()
          .eq('id', matches[0].id);
        if (error) throw error;
        return {
          ok: true, kind: 'reply',
          reply: `Removed ${matches[0].name}.`,
        };
      }

      case 'delete_expense': {
        const { match_vendor_name, match_description, confirmed = false } = toolInput || {};
        if (!match_vendor_name && !match_description) {
          return { ok: false, kind: 'unsure', reply: \"Which expense?\" };
        }
        let q = supabase.from('couple_expenses')
          .select('id, vendor_name, description, planned_amount, actual_amount')
          .eq('couple_id', coupleId);
        if (match_vendor_name) q = q.ilike('vendor_name', '%' + match_vendor_name + '%');
        if (match_description) q = q.ilike('description', '%' + match_description + '%');
        const { data: matches } = await q.order('created_at', { ascending: false }).limit(5);
        if (!matches || matches.length === 0) {
          return { ok: false, kind: 'unsure', reply: \"I couldn't find that expense.\" };
        }
        if (matches.length > 1) {
          const lines = matches.map(m => '• ' + (m.vendor_name || m.description || 'Untitled') + ' — ' + formatINR(m.actual_amount || m.planned_amount || 0));
          return {
            ok: false, kind: 'clarify',
            reply: \"A few match — which one?\\n\\n\" + lines.join('\\n'),
          };
        }
        const target = matches[0];
        const targetLabel = target.vendor_name || target.description || 'expense';
        const targetAmount = target.actual_amount || target.planned_amount || 0;
        if (!confirmed) {
          const action_id = 'expense_del_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
          pendingExpenseDeletes.set(action_id, { coupleId, expense_id: target.id, label: targetLabel });
          setTimeout(() => pendingExpenseDeletes.delete(action_id), 10 * 60 * 1000);
          return {
            ok: true, kind: 'confirm-required',
            reply: `Remove the ${targetLabel} expense?`,
            confirmPreview: {
              summaryTitle: `Remove ${targetLabel}?`,
              summaryLines: [
                targetAmount > 0 ? `${formatINR(targetAmount)}` : 'No amount on file',
                'It\\'ll be gone from your money page.',
              ],
              confirmLabel: 'Remove',
              cancelLabel: 'Keep',
              action_id,
            },
          };
        }
        const { error } = await supabase
          .from('couple_expenses')
          .delete()
          .eq('id', target.id);
        if (error) throw error;
        return {
          ok: true, kind: 'reply',
          reply: `Removed ${targetLabel}.`,
        };
      }

      case 'delete_reminder': {
        const { match_text, confirmed = false } = toolInput || {};
        if (!match_text) {
          return { ok: false, kind: 'unsure', reply: \"Which reminder?\" };
        }
        const { data: matches } = await supabase
          .from('couple_checklist')
          .select('id, text')
          .eq('couple_id', coupleId)
          .ilike('text', '%' + match_text + '%')
          .order('created_at', { ascending: false })
          .limit(5);
        if (!matches || matches.length === 0) {
          return { ok: false, kind: 'unsure', reply: \"I couldn't find that reminder.\" };
        }
        if (matches.length > 1) {
          const lines = matches.map(m => '• ' + m.text);
          return {
            ok: false, kind: 'clarify',
            reply: \"A few match — which one?\\n\\n\" + lines.join('\\n'),
          };
        }
        const target = matches[0];
        if (!confirmed) {
          const action_id = 'reminder_del_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
          pendingReminderDeletes.set(action_id, { coupleId, reminder_id: target.id, text: target.text });
          setTimeout(() => pendingReminderDeletes.delete(action_id), 10 * 60 * 1000);
          return {
            ok: true, kind: 'confirm-required',
            reply: `Forget the reminder \"${target.text}\"?`,
            confirmPreview: {
              summaryTitle: `Forget this reminder?`,
              summaryLines: [
                target.text,
                'It\\'ll be gone from your list.',
              ],
              confirmLabel: 'Forget it',
              cancelLabel: 'Keep',
              action_id,
            },
          };
        }
        const { error } = await supabase
          .from('couple_checklist')
          .delete()
          .eq('id', target.id);
        if (error) throw error;
        return {
          ok: true, kind: 'reply',
          reply: `Forgotten.`,
        };
      }

      case 'contact_vendor': {
        const { vendor_name, mode, message } = toolInput || {};
        if (!vendor_name) {
          return { ok: false, kind: 'unsure', reply: \"Who do you want to reach?\" };
        }
        if (mode !== 'call' && mode !== 'whatsapp') {
          return { ok: false, kind: 'unsure', reply: \"Call or WhatsApp?\" };
        }
        const { data: matches } = await supabase
          .from('couple_vendors')
          .select('id, name, phone, category')
          .eq('couple_id', coupleId)
          .ilike('name', '%' + vendor_name + '%');
        if (!matches || matches.length === 0) {
          return { ok: false, kind: 'unsure', reply: `I don't have ${vendor_name} saved. What's their number?` };
        }
        if (matches.length > 1) {
          return {
            ok: false, kind: 'clarify',
            reply: `A few names match — ${matches.map(m => m.name + (m.category ? ' (' + m.category + ')' : '')).join(', ')}. Which one?`,
          };
        }
        const v = matches[0];
        if (!v.phone) {
          return {
            ok: false, kind: 'unsure',
            reply: `I don't have a number for ${v.name}. Tell me her phone and I'll save it.`,
          };
        }
        // Normalise phone for outbound URLs (digits only, with country code)
        let cleanPhone = String(v.phone).replace(/[^0-9]/g, '');
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
        const replyText = mode === 'call'
          ? `Tap to call ${v.name}.`
          : `Tap to message ${v.name}.`;
        return {
          ok: true, kind: 'reply',
          reply: replyText,
          contact_action: {
            kind: mode,
            name: v.name,
            phone: '+' + cleanPhone,
            label: v.category || null,
            message: mode === 'whatsapp' ? (message || `Hi ${v.name}! Quick question for you.`) : null,
          },
          tool_anchor: { tool: 'vendors', entity_type: 'vendor', entity_id: String(v.id) },
        };
      }

""" + DEFAULT_ANCHOR

if DEFAULT_ANCHOR not in src:
    print("✗ PATCH 2 anchor not found (executor default block)")
    sys.exit(1)
src = src.replace(DEFAULT_ANCHOR, NEW_DEFAULT_BLOCK, 1)
print("✓ PATCH 2 applied — 7 executor cases inserted before default")


# ═══════════════════════════════════════════════════════════════════════════
# PATCH 3 — Add 3 new pending stores (vendor/expense/reminder deletes)
# Anchor: the existing pendingSettles declaration line.
# ═══════════════════════════════════════════════════════════════════════════
OLD_PENDING_BLOCK = """const pendingBookings = new Map();
const pendingPayments = new Map();
const pendingSettles  = new Map();"""

NEW_PENDING_BLOCK = """const pendingBookings = new Map();
const pendingPayments = new Map();
const pendingSettles  = new Map();
// Phase 1.6: destructive delete dry-run gates.
const pendingVendorDeletes   = new Map();
const pendingExpenseDeletes  = new Map();
const pendingReminderDeletes = new Map();"""

if OLD_PENDING_BLOCK not in src:
    print("✗ PATCH 3 anchor not found (pending store declarations)")
    sys.exit(1)
src = src.replace(OLD_PENDING_BLOCK, NEW_PENDING_BLOCK, 1)
print("✓ PATCH 3 applied — 3 new pending stores added")


# ═══════════════════════════════════════════════════════════════════════════
# PATCH 4 — Add 3 bride-confirm replay handlers for the deletes
# Anchor: insert before the final 404 return in /bride-confirm.
# ═══════════════════════════════════════════════════════════════════════════
OLD_404_BLOCK = """    // BUG C FIX: include `reply` so the frontend can render the failure.
    // This is the MOST COMMON bride-confirm failure: the 10-minute setTimeout
    // cleanup expired the action before she tapped. Voice should be gentle.
    return res.status(404).json({ success: false, error: 'action not found or expired', reply: 'That moment passed. Tell me again?' });"""

NEW_404_BLOCK = """    // ─── PHASE 1.6 — DELETE REPLAYS ────────────────────────────────────
    if (pendingVendorDeletes.has(action_id)) {
      const args = pendingVendorDeletes.get(action_id);
      if (args.coupleId !== userId) return res.status(403).json({ success: false, error: 'action does not belong to this user', reply: 'That action belongs to a different signed-in account.' });
      pendingVendorDeletes.delete(action_id);
      const result = await executeBrideToolCall('delete_vendor', { vendor_name: args.vendor_name, confirmed: true }, userId);
      return res.json({
        success: !!result?.ok,
        reply: result?.reply || `Removed ${args.vendor_name}.`,
      });
    }
    if (pendingExpenseDeletes.has(action_id)) {
      const args = pendingExpenseDeletes.get(action_id);
      if (args.coupleId !== userId) return res.status(403).json({ success: false, error: 'action does not belong to this user', reply: 'That action belongs to a different signed-in account.' });
      pendingExpenseDeletes.delete(action_id);
      // Direct delete by id since match has already been narrowed
      const { error } = await supabase
        .from('couple_expenses')
        .delete()
        .eq('id', args.expense_id);
      if (error) return res.status(500).json({ success: false, error: error.message, reply: 'Something went sideways while removing it. Try once more?' });
      return res.json({ success: true, reply: `Removed ${args.label}.` });
    }
    if (pendingReminderDeletes.has(action_id)) {
      const args = pendingReminderDeletes.get(action_id);
      if (args.coupleId !== userId) return res.status(403).json({ success: false, error: 'action does not belong to this user', reply: 'That action belongs to a different signed-in account.' });
      pendingReminderDeletes.delete(action_id);
      const { error } = await supabase
        .from('couple_checklist')
        .delete()
        .eq('id', args.reminder_id);
      if (error) return res.status(500).json({ success: false, error: error.message, reply: 'Something went sideways. Try once more?' });
      return res.json({ success: true, reply: `Forgotten.` });
    }

    // BUG C FIX: include `reply` so the frontend can render the failure.
    // This is the MOST COMMON bride-confirm failure: the 10-minute setTimeout
    // cleanup expired the action before she tapped. Voice should be gentle.
    return res.status(404).json({ success: false, error: 'action not found or expired', reply: 'That moment passed. Tell me again?' });"""

if OLD_404_BLOCK not in src:
    print("✗ PATCH 4 anchor not found (404 fallback in bride-confirm)")
    sys.exit(1)
src = src.replace(OLD_404_BLOCK, NEW_404_BLOCK, 1)
print("✓ PATCH 4 applied — 3 delete replay handlers added to bride-confirm")


# ═══════════════════════════════════════════════════════════════════════════
# PATCH 5 — Update buildBrideSystemPrompt with new tool guidance
# Anchor: insert before the KEEP REPLIES SHORT line in the prompt.
# ═══════════════════════════════════════════════════════════════════════════
OLD_PROMPT_END = """- "I just spent 5k on flowers" → add_expense
- Conversation, observation, question, advice, idle thought → general_reply
- web_search is available for genuinely outside-the-platform questions ("what is mehendi") — use sparingly.

KEEP REPLIES SHORT."""

NEW_PROMPT_END = """- "I just spent 5k on flowers" → add_expense
- "Change Swati's number to X", "Her quote is now 80k" → update_vendor
- "Move my lehenga pickup to Tuesday", "Make this high priority" → update_reminder
- "The lehenga was 75k not 65k", "Mark Swati's advance as paid" → update_expense
- "Remove Swati from my vendors", "I'm not going with Arjun anymore" → delete_vendor
- "Forget that reminder", "Undo that expense" → delete_reminder / delete_expense
- "Call Swati", "Phone the decorator" → contact_vendor (mode='call')
- "Message Arjun about timeline", "WhatsApp Swati to confirm the lehenga" → contact_vendor (mode='whatsapp', draft message in BRIDE'S voice)
- Conversation, observation, question, advice, idle thought → general_reply
- web_search is available for genuinely outside-the-platform questions ("what is mehendi") — use sparingly.

CONTACT_VENDOR DRAFTING (CRITICAL):
When the bride asks you to message someone, draft the message in HER voice, never yours. The drafted message goes inside contact_vendor's 'message' parameter and will appear pre-filled in WhatsApp. The bride taps Send.
- First-person, brief, warm, Indian-bride-natural register.
- Include enough context that the recipient understands without follow-up.
- Examples (study these, write in this register):
  · "Hi Swati! Between the red and gold lehenga, which would you suggest for the wedding day? Want to lock it in."
  · "Hey Arjun, just confirming — Sangeet shoot starts at 6pm right? Mehendi is 10am the day before."
  · "Hi Priya! Quick one — is the 50k advance for the decor due before Diwali or after?"
- If the bride hasn't said what to message about, use a soft generic: "Hi <name>! Quick question for you."
- Never write the message in your own poetic voice. The bride sends from her own number; the message must sound like her, not like an AI assistant.

DELETE BEHAVIOR:
- Deletes are confirm-required. The model returns a confirmPreview; the bride taps Yes/No on the FrostConfirmCard. The system handles the actual write on confirm.
- For deletes that match multiple rows, ask which one. Never delete the most-recent without asking.

UPDATE BEHAVIOR:
- Updates are NOT confirm-required (small edits don't need ceremony).
- If the bride's match phrase narrows to multiple rows, ask which one before updating.
- After a successful update, narrate briefly: "Updated Swati — phone."

KEEP REPLIES SHORT."""

if OLD_PROMPT_END not in src:
    print("✗ PATCH 5 anchor not found (system prompt 'KEEP REPLIES SHORT' block)")
    sys.exit(1)
src = src.replace(OLD_PROMPT_END, NEW_PROMPT_END, 1)
print("✓ PATCH 5 applied — system prompt updated with new tool guidance + voice rules")


# ═══════════════════════════════════════════════════════════════════════════
# PATCH 6 — Add tool_anchor passthrough for new update/delete in bride-chat
# Anchor: the existing tool_anchor extraction block.
# ═══════════════════════════════════════════════════════════════════════════
# Already handled — tool results return tool_anchor directly, the existing
# `if (toolResult && toolResult.tool_anchor) toolAnchors.push(...)` already
# picks them up. No additional patch needed.
print("✓ PATCH 6 (tool_anchor passthrough) — no changes needed, existing logic handles it")


# ═══════════════════════════════════════════════════════════════════════════
# PATCH 7 — Sentinel for idempotency
# ═══════════════════════════════════════════════════════════════════════════
src = src.rstrip() + "\n\n" + SENTINEL + "\n"
print("✓ PATCH 7 applied — sentinel added")


# ═══════════════════════════════════════════════════════════════════════════
# Write back and validate
# ═══════════════════════════════════════════════════════════════════════════
with open(SERVER, 'w') as f:
    f.write(src)

print()
print("──────────────────────────────────────────────────────────────")
print("Phase 1.6 patch applied. Run `node --check` to verify.")
print("──────────────────────────────────────────────────────────────")
