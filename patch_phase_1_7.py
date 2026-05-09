#!/usr/bin/env python3
"""
Phase 1.7 — Disambiguation buttons in Dream Ai.

Adds clarify_options array to all 10 clarify branches across the bride
executor. When Haiku finds multiple matches and asks "which one?", the
frontend renders the options as tappable pills instead of expecting the
bride to type the disambiguator.

Tool-by-tool changes:
  - book_vendor       : multi-vendor match (12547) → clarify_options with name+category
  - log_payment       : multi-vendor match (12963) → clarify_options with vendor_name
  - settle_balance    : multi-vendor match (13050) → clarify_options with vendor_name
  - update_vendor     : multi-vendor match (13400) → clarify_options with name
  - update_expense    : multi-expense match (13461) → clarify_options with name+amount
  - update_reminder   : multi-reminder match (13507) → clarify_options with text
  - delete_vendor     : multi-vendor match (13547) → clarify_options with name
  - delete_expense    : multi-expense match (13600) → clarify_options with name+amount
  - delete_reminder   : multi-reminder match (13655) → clarify_options with text
  - contact_vendor    : multi-vendor match (13708) → clarify_options with name+category

Plus:
  - Response builder: extract toolResult.clarifyOptions like other side-channel fields
  - Response payload: add `clarifyOptions` field for the frontend to read

Cap: 4 options per clarify. If matches > 4, fallback to text-only as today.
This keeps the pill row from becoming a wall on small phones.

Idempotent (sentinel-checked).
"""
import sys, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
SERVER = os.path.join(HERE, "backend", "server.js")
SENTINEL_17  = "// ─── PHASE 1.7 LOADED ─── //"
SENTINEL_161 = "// ─── PHASE 1.6.1 LOADED ─── //"

if not os.path.exists(SERVER):
    print(f"✗ Cannot find {SERVER}")
    sys.exit(1)

with open(SERVER) as f:
    src = f.read()

if SENTINEL_17 in src:
    print("✗ Phase 1.7 already applied. Aborting.")
    sys.exit(1)
if SENTINEL_161 not in src:
    print("✗ Phase 1.6.1 not detected — apply patch_phase_1_6_1.py first.")
    sys.exit(1)

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 1 — book_vendor multi-vendor clarify (line ~12547)
# ═══════════════════════════════════════════════════════════════════════════
OLD_1 = """        if (existingVendors && existingVendors.length > 1) {
          return {
            ok: false,
            kind: 'clarify',
            reply: `I see a few people named "${vendor_name}" in your list — ${existingVendors.map(v => v.name + ' (' + (v.category || 'unknown') + ')').join(', ')}. Which one?`,
          };
        }"""

NEW_1 = """        if (existingVendors && existingVendors.length > 1) {
          // Phase 1.7: clarify_options for tappable pill disambiguation
          const opts = existingVendors.slice(0, 4).map(v => ({
            label: v.name + (v.category ? ' (' + v.category + ')' : ''),
            send_text: v.name,
          }));
          return {
            ok: false,
            kind: 'clarify',
            reply: existingVendors.length <= 4
              ? `Which ${vendor_name}?`
              : `I see a few people named "${vendor_name}" in your list — ${existingVendors.map(v => v.name).join(', ')}. Which one?`,
            clarify_options: existingVendors.length <= 4 ? opts : null,
          };
        }"""

if OLD_1 not in src:
    print("✗ PATCH 1 anchor not found (book_vendor clarify)")
    sys.exit(1)
src = src.replace(OLD_1, NEW_1, 1)
print("✓ PATCH 1 — book_vendor clarify_options")

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 2 — log_payment multi-vendor clarify (line ~12963)
# ═══════════════════════════════════════════════════════════════════════════
OLD_2 = """        if (distinctNames.length > 1) {
          return {
            ok: false,
            kind: 'clarify',
            reply: `I see a few different vendors matching "${vendor_name}". Which one did you pay?`,
            candidates: distinctNames,
          };
        }"""

NEW_2 = """        if (distinctNames.length > 1) {
          // Phase 1.7: clarify_options for tappable pill disambiguation
          const opts = distinctNames.slice(0, 4).map(n => ({
            label: n,
            send_text: n,
          }));
          return {
            ok: false,
            kind: 'clarify',
            reply: distinctNames.length <= 4
              ? `Which one did you pay?`
              : `I see a few different vendors matching "${vendor_name}" — ${distinctNames.join(', ')}. Which one?`,
            candidates: distinctNames,
            clarify_options: distinctNames.length <= 4 ? opts : null,
          };
        }"""

if OLD_2 not in src:
    print("✗ PATCH 2 anchor not found (log_payment clarify)")
    sys.exit(1)
src = src.replace(OLD_2, NEW_2, 1)
print("✓ PATCH 2 — log_payment clarify_options")

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 3 — settle_balance multi-vendor clarify (line ~13050)
# ═══════════════════════════════════════════════════════════════════════════
OLD_3 = """          return { ok: false, kind: 'clarify', reply: `Which one did you settle?`, candidates: distinctNames };"""

NEW_3 = """          {
            const opts = distinctNames.slice(0, 4).map(n => ({ label: n, send_text: n }));
            return {
              ok: false, kind: 'clarify',
              reply: `Which one did you settle?`,
              candidates: distinctNames,
              clarify_options: distinctNames.length <= 4 ? opts : null,
            };
          }"""

if OLD_3 not in src:
    print("✗ PATCH 3 anchor not found (settle_balance clarify)")
    sys.exit(1)
src = src.replace(OLD_3, NEW_3, 1)
print("✓ PATCH 3 — settle_balance clarify_options")

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 4 — update_vendor multi-vendor clarify (line ~13400)
# ═══════════════════════════════════════════════════════════════════════════
OLD_4 = """        if (matches.length > 1) {
          return {
            ok: false, kind: 'clarify',
            reply: `A few names match — ${matches.map(m => m.name).join(', ')}. Which one?`,
          };
        }
        const updates = {};
        if (new_name) updates.name = new_name;
        if (phone) {"""

NEW_4 = """        if (matches.length > 1) {
          // Phase 1.7: clarify_options for tappable pill disambiguation
          const opts = matches.slice(0, 4).map(m => ({ label: m.name, send_text: m.name }));
          return {
            ok: false, kind: 'clarify',
            reply: matches.length <= 4
              ? `Which one?`
              : `A few names match — ${matches.map(m => m.name).join(', ')}. Which one?`,
            clarify_options: matches.length <= 4 ? opts : null,
          };
        }
        const updates = {};
        if (new_name) updates.name = new_name;
        if (phone) {"""

if OLD_4 not in src:
    print("✗ PATCH 4 anchor not found (update_vendor clarify)")
    sys.exit(1)
src = src.replace(OLD_4, NEW_4, 1)
print("✓ PATCH 4 — update_vendor clarify_options")

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 5 — update_expense multi-match clarify (line ~13461)
# ═══════════════════════════════════════════════════════════════════════════
OLD_5 = """        if (matches.length > 1) {
          const lines = matches.map(m => '• ' + (m.vendor_name || m.description || 'Untitled') + ' — ' + formatINR(m.actual_amount || m.planned_amount || 0));
          return {
            ok: false, kind: 'clarify',
            reply: "A few match — which one?\\n\\n" + lines.join('\\n'),
          };
        }
        const updates = {};
        if (new_planned_amount != null) updates.planned_amount = new_planned_amount;"""

NEW_5 = """        if (matches.length > 1) {
          const lines = matches.map(m => '• ' + (m.vendor_name || m.description || 'Untitled') + ' — ' + formatINR(m.actual_amount || m.planned_amount || 0));
          // Phase 1.7: clarify_options for tappable pill disambiguation
          const opts = matches.slice(0, 4).map(m => ({
            label: (m.vendor_name || m.description || 'Untitled') + ' · ' + formatINR(m.actual_amount || m.planned_amount || 0),
            send_text: m.vendor_name || m.description || '',
          }));
          return {
            ok: false, kind: 'clarify',
            reply: matches.length <= 4
              ? `Which one?`
              : "A few match — which one?\\n\\n" + lines.join('\\n'),
            clarify_options: matches.length <= 4 ? opts : null,
          };
        }
        const updates = {};
        if (new_planned_amount != null) updates.planned_amount = new_planned_amount;"""

if OLD_5 not in src:
    print("✗ PATCH 5 anchor not found (update_expense clarify)")
    sys.exit(1)
src = src.replace(OLD_5, NEW_5, 1)
print("✓ PATCH 5 — update_expense clarify_options")

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 6 — update_reminder multi-match clarify (line ~13507)
# ═══════════════════════════════════════════════════════════════════════════
OLD_6 = """        if (matches.length > 1) {
          const lines = matches.map(m => '• ' + m.text);
          return {
            ok: false, kind: 'clarify',
            reply: "A few match — which one?\\n\\n" + lines.join('\\n'),
          };
        }
        const updates = {};
        if (new_text) updates.text = new_text;"""

NEW_6 = """        if (matches.length > 1) {
          const lines = matches.map(m => '• ' + m.text);
          // Phase 1.7: clarify_options for tappable pill disambiguation
          const opts = matches.slice(0, 4).map(m => ({
            label: m.text.length > 50 ? m.text.slice(0, 47) + '…' : m.text,
            send_text: m.text,
          }));
          return {
            ok: false, kind: 'clarify',
            reply: matches.length <= 4
              ? `Which one?`
              : "A few match — which one?\\n\\n" + lines.join('\\n'),
            clarify_options: matches.length <= 4 ? opts : null,
          };
        }
        const updates = {};
        if (new_text) updates.text = new_text;"""

if OLD_6 not in src:
    print("✗ PATCH 6 anchor not found (update_reminder clarify)")
    sys.exit(1)
src = src.replace(OLD_6, NEW_6, 1)
print("✓ PATCH 6 — update_reminder clarify_options")

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 7 — delete_vendor multi-match clarify (line ~13547)
# ═══════════════════════════════════════════════════════════════════════════
OLD_7 = """        if (matches.length > 1) {
          return {
            ok: false, kind: 'clarify',
            reply: `A few names match — ${matches.map(m => m.name).join(', ')}. Which one?`,
          };
        }
        if (!confirmed) {
          const action_id = 'vendor_del_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);"""

NEW_7 = """        if (matches.length > 1) {
          // Phase 1.7: clarify_options for tappable pill disambiguation
          const opts = matches.slice(0, 4).map(m => ({
            label: m.name + (m.category ? ' (' + m.category + ')' : ''),
            send_text: m.name,
          }));
          return {
            ok: false, kind: 'clarify',
            reply: matches.length <= 4
              ? `Which one?`
              : `A few names match — ${matches.map(m => m.name).join(', ')}. Which one?`,
            clarify_options: matches.length <= 4 ? opts : null,
          };
        }
        if (!confirmed) {
          const action_id = 'vendor_del_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);"""

if OLD_7 not in src:
    print("✗ PATCH 7 anchor not found (delete_vendor clarify)")
    sys.exit(1)
src = src.replace(OLD_7, NEW_7, 1)
print("✓ PATCH 7 — delete_vendor clarify_options")

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 8 — delete_expense multi-match clarify (line ~13600)
# ═══════════════════════════════════════════════════════════════════════════
OLD_8 = """        if (matches.length > 1) {
          const lines = matches.map(m => '• ' + (m.vendor_name || m.description || 'Untitled') + ' — ' + formatINR(m.actual_amount || m.planned_amount || 0));
          return {
            ok: false, kind: 'clarify',
            reply: "A few match — which one?\\n\\n" + lines.join('\\n'),
          };
        }
        const target = matches[0];
        const targetLabel = target.vendor_name || target.description || 'expense';"""

NEW_8 = """        if (matches.length > 1) {
          const lines = matches.map(m => '• ' + (m.vendor_name || m.description || 'Untitled') + ' — ' + formatINR(m.actual_amount || m.planned_amount || 0));
          // Phase 1.7: clarify_options for tappable pill disambiguation
          const opts = matches.slice(0, 4).map(m => ({
            label: (m.vendor_name || m.description || 'Untitled') + ' · ' + formatINR(m.actual_amount || m.planned_amount || 0),
            send_text: m.vendor_name || m.description || '',
          }));
          return {
            ok: false, kind: 'clarify',
            reply: matches.length <= 4
              ? `Which one?`
              : "A few match — which one?\\n\\n" + lines.join('\\n'),
            clarify_options: matches.length <= 4 ? opts : null,
          };
        }
        const target = matches[0];
        const targetLabel = target.vendor_name || target.description || 'expense';"""

if OLD_8 not in src:
    print("✗ PATCH 8 anchor not found (delete_expense clarify)")
    sys.exit(1)
src = src.replace(OLD_8, NEW_8, 1)
print("✓ PATCH 8 — delete_expense clarify_options")

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 9 — delete_reminder multi-match clarify (line ~13655)
# ═══════════════════════════════════════════════════════════════════════════
OLD_9 = """        if (matches.length > 1) {
          const lines = matches.map(m => '• ' + m.text);
          return {
            ok: false, kind: 'clarify',
            reply: "A few match — which one?\\n\\n" + lines.join('\\n'),
          };
        }
        const target = matches[0];
        if (!confirmed) {
          const action_id = 'reminder_del_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);"""

NEW_9 = """        if (matches.length > 1) {
          const lines = matches.map(m => '• ' + m.text);
          // Phase 1.7: clarify_options for tappable pill disambiguation
          const opts = matches.slice(0, 4).map(m => ({
            label: m.text.length > 50 ? m.text.slice(0, 47) + '…' : m.text,
            send_text: m.text,
          }));
          return {
            ok: false, kind: 'clarify',
            reply: matches.length <= 4
              ? `Which one?`
              : "A few match — which one?\\n\\n" + lines.join('\\n'),
            clarify_options: matches.length <= 4 ? opts : null,
          };
        }
        const target = matches[0];
        if (!confirmed) {
          const action_id = 'reminder_del_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);"""

if OLD_9 not in src:
    print("✗ PATCH 9 anchor not found (delete_reminder clarify)")
    sys.exit(1)
src = src.replace(OLD_9, NEW_9, 1)
print("✓ PATCH 9 — delete_reminder clarify_options")

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 10 — contact_vendor multi-match clarify (line ~13708)
# ═══════════════════════════════════════════════════════════════════════════
OLD_10 = """        if (matches.length > 1) {
          return {
            ok: false, kind: 'clarify',
            reply: `A few names match — ${matches.map(m => m.name + (m.category ? ' (' + m.category + ')' : '')).join(', ')}. Which one?`,
          };
        }"""

NEW_10 = """        if (matches.length > 1) {
          // Phase 1.7: clarify_options for tappable pill disambiguation
          const opts = matches.slice(0, 4).map(m => ({
            label: m.name + (m.category ? ' (' + m.category + ')' : ''),
            send_text: m.name,
          }));
          return {
            ok: false, kind: 'clarify',
            reply: matches.length <= 4
              ? `Which one?`
              : `A few names match — ${matches.map(m => m.name).join(', ')}. Which one?`,
            clarify_options: matches.length <= 4 ? opts : null,
          };
        }"""

if OLD_10 not in src:
    print("✗ PATCH 10 anchor not found (contact_vendor clarify)")
    sys.exit(1)
src = src.replace(OLD_10, NEW_10, 1)
print("✓ PATCH 10 — contact_vendor clarify_options")

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 11 — Response builder: extract clarifyOptions
# ═══════════════════════════════════════════════════════════════════════════
OLD_11 = """    let replyText = '';
    let confirmPreview = null;
    let followupPrompts = [];
    let summaryLines = [];
    let contactAction = null; // PHASE 1.6.1 — contact_vendor tool result
    const toolsUsed = [];"""

NEW_11 = """    let replyText = '';
    let confirmPreview = null;
    let followupPrompts = [];
    let summaryLines = [];
    let contactAction = null; // PHASE 1.6.1 — contact_vendor tool result
    let clarifyOptions = null; // PHASE 1.7 — disambiguation pills from clarify branches
    const toolsUsed = [];"""

if OLD_11 not in src:
    print("✗ PATCH 11 anchor not found (response builder init)")
    sys.exit(1)
src = src.replace(OLD_11, NEW_11, 1)
print("✓ PATCH 11 — clarifyOptions variable initialised")

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 12 — Response builder: extract toolResult.clarify_options
# ═══════════════════════════════════════════════════════════════════════════
OLD_12 = """        // PHASE 1.6.1: propagate contact_vendor tool's contact_action card to
        // the frontend, so FrostContactCard can render with the bride's choice
        // of channel (phone call vs WhatsApp call vs WhatsApp msg vs SMS).
        if (toolResult && toolResult.contact_action) {
          contactAction = toolResult.contact_action;
        }"""

NEW_12 = """        // PHASE 1.6.1: propagate contact_vendor tool's contact_action card to
        // the frontend, so FrostContactCard can render with the bride's choice
        // of channel (phone call vs WhatsApp call vs WhatsApp msg vs SMS).
        if (toolResult && toolResult.contact_action) {
          contactAction = toolResult.contact_action;
        }
        // PHASE 1.7: propagate clarify_options for tappable pill disambiguation.
        // Multi-match clarify branches return options the frontend renders as
        // a FrostClarifyCard. Bride taps → frontend resends send_text as a
        // user message, model re-runs the original tool with the disambiguator.
        if (toolResult && toolResult.clarify_options) {
          clarifyOptions = toolResult.clarify_options;
        }"""

if OLD_12 not in src:
    print("✗ PATCH 12 anchor not found (contactAction extraction)")
    sys.exit(1)
src = src.replace(OLD_12, NEW_12, 1)
print("✓ PATCH 12 — clarify_options extraction added")

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 13 — Response payload includes clarifyOptions
# ═══════════════════════════════════════════════════════════════════════════
OLD_13 = """    res.json({
      success: true,
      reply: replyText,
      summaryLines,
      followupPrompts,
      confirmPreview,
      contactAction,
      toolsUsed,
      toolAnchors,
    });"""

NEW_13 = """    res.json({
      success: true,
      reply: replyText,
      summaryLines,
      followupPrompts,
      confirmPreview,
      contactAction,
      clarifyOptions,
      toolsUsed,
      toolAnchors,
    });"""

if OLD_13 not in src:
    print("✗ PATCH 13 anchor not found (res.json)")
    sys.exit(1)
src = src.replace(OLD_13, NEW_13, 1)
print("✓ PATCH 13 — clarifyOptions in response payload")

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 14 — Sentinel
# ═══════════════════════════════════════════════════════════════════════════
src = src.rstrip() + "\n\n" + SENTINEL_17 + "\n"
print("✓ PATCH 14 — sentinel added")

with open(SERVER, 'w') as f:
    f.write(src)

print()
print("──────────────────────────────────────────────────────────────")
print("Phase 1.7 patch applied. Run `node --check` to verify.")
print("──────────────────────────────────────────────────────────────")
