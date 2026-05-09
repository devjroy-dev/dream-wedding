#!/usr/bin/env python3
"""
Phase 1.6.1 — small backend follow-up: propagate contact_action through
bride-chat response.

The Phase 1.6 contact_vendor tool returns { contact_action: {...} } from
its executor, but bride-chat doesn't currently destructure or include
contact_action in res.json() — so the field gets lost between executor
and frontend.

This patch:
  1. Initialises contactAction = null at the top of the response builder
  2. Extracts toolResult.contact_action where other fields are extracted
  3. Adds contactAction to the res.json() payload so the frontend can read it

Idempotent (sentinel-checked).
"""
import sys, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
SERVER = os.path.join(HERE, "backend", "server.js")
SENTINEL_161 = "// ─── PHASE 1.6.1 LOADED ─── //"
SENTINEL_16  = "// ─── PHASE 1.6 LOADED ─── //"

if not os.path.exists(SERVER):
    print(f"✗ Cannot find {SERVER}")
    print(f"  Place this script at the dream-wedding repo root.")
    sys.exit(1)

with open(SERVER) as f:
    src = f.read()

if SENTINEL_161 in src:
    print("✗ Phase 1.6.1 already applied. Aborting.")
    sys.exit(1)

if SENTINEL_16 not in src:
    print("✗ Phase 1.6 not detected — apply patch_phase_1_6.py first.")
    sys.exit(1)

# ═══════════════════════════════════════════════════════════════════════════
# PATCH 1 — Add `contactAction` initialisation and toolResult extraction
# ═══════════════════════════════════════════════════════════════════════════
# Anchor: the existing `const toolAnchors = []` line right before the
# response-building loop.

OLD_INIT = """    let replyText = '';
    let confirmPreview = null;
    let followupPrompts = [];
    let summaryLines = [];
    const toolsUsed = [];
    const toolAnchors = []; // ZIP 8: long-press routing metadata, Option B (response-only, no DB)"""

NEW_INIT = """    let replyText = '';
    let confirmPreview = null;
    let followupPrompts = [];
    let summaryLines = [];
    let contactAction = null; // PHASE 1.6.1 — contact_vendor tool result
    const toolsUsed = [];
    const toolAnchors = []; // ZIP 8: long-press routing metadata, Option B (response-only, no DB)"""

if OLD_INIT not in src:
    print("✗ PATCH 1 anchor not found (response-builder init block)")
    sys.exit(1)
src = src.replace(OLD_INIT, NEW_INIT, 1)
print("✓ PATCH 1 applied — contactAction variable initialised")


# ═══════════════════════════════════════════════════════════════════════════
# PATCH 2 — Extract toolResult.contact_action where other fields extract
# ═══════════════════════════════════════════════════════════════════════════
OLD_EXTRACT = """        // FIX-1: bubble confirmPreview from toolResult so the frontend can render
        // the FrostConfirmCard. Previously confirmPreview was initialised to null
        // and never reassigned — broadcast_to_circle and ocr_receipt's confirms
        // never reached the bride's screen.
        if (toolResult && toolResult.confirmPreview) {
          confirmPreview = toolResult.confirmPreview;
        }"""

NEW_EXTRACT = """        // FIX-1: bubble confirmPreview from toolResult so the frontend can render
        // the FrostConfirmCard. Previously confirmPreview was initialised to null
        // and never reassigned — broadcast_to_circle and ocr_receipt's confirms
        // never reached the bride's screen.
        if (toolResult && toolResult.confirmPreview) {
          confirmPreview = toolResult.confirmPreview;
        }
        // PHASE 1.6.1: propagate contact_vendor tool's contact_action card to
        // the frontend, so FrostContactCard can render with the bride's choice
        // of channel (phone call vs WhatsApp call vs WhatsApp msg vs SMS).
        if (toolResult && toolResult.contact_action) {
          contactAction = toolResult.contact_action;
        }"""

if OLD_EXTRACT not in src:
    print("✗ PATCH 2 anchor not found (confirmPreview extraction block)")
    sys.exit(1)
src = src.replace(OLD_EXTRACT, NEW_EXTRACT, 1)
print("✓ PATCH 2 applied — contact_action extraction added")


# ═══════════════════════════════════════════════════════════════════════════
# PATCH 3 — Add `contactAction` to the res.json() response payload
# ═══════════════════════════════════════════════════════════════════════════
OLD_RES_JSON = """    res.json({
      success: true,
      reply: replyText,
      summaryLines,
      followupPrompts,
      confirmPreview,
      toolsUsed,
      toolAnchors,
    });"""

NEW_RES_JSON = """    res.json({
      success: true,
      reply: replyText,
      summaryLines,
      followupPrompts,
      confirmPreview,
      contactAction,
      toolsUsed,
      toolAnchors,
    });"""

if OLD_RES_JSON not in src:
    print("✗ PATCH 3 anchor not found (res.json response block)")
    sys.exit(1)
src = src.replace(OLD_RES_JSON, NEW_RES_JSON, 1)
print("✓ PATCH 3 applied — contactAction added to response payload")


# ═══════════════════════════════════════════════════════════════════════════
# PATCH 4 — Sentinel
# ═══════════════════════════════════════════════════════════════════════════
src = src.rstrip() + "\n\n" + SENTINEL_161 + "\n"
print("✓ PATCH 4 applied — sentinel added")


with open(SERVER, 'w') as f:
    f.write(src)

print()
print("──────────────────────────────────────────────────────────────")
print("Phase 1.6.1 patch applied. Run `node --check` to verify.")
print("──────────────────────────────────────────────────────────────")
