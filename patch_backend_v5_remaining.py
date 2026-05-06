#!/usr/bin/env python3
"""
TDW V5 — patch_backend_v5_remaining.py
Applies ONLY patches 1/2/3 (web_search + get_muse_saves tool definitions).
Patches 4 and 5 are already applied — this script skips them.

Run from dream-wedding repo root in Codespace:
    python3 zip2/patch_backend_v5_remaining.py

Creates backup at backend/server.js.bak2 before writing.
"""

import shutil, sys

TARGET = "backend/server.js"
BACKUP = "backend/server.js.bak2"

print(f"Reading {TARGET}...")
with open(TARGET, "r", encoding="utf-8") as f:
    content = f.read()
print(f"  {len(content)} chars read.")

shutil.copy(TARGET, BACKUP)
print(f"  Backup saved to {BACKUP}")

errors = []

# ── PATCH 1: web_search into TDW_AI_TOOLS (vendor) ────────────────────────
# Anchor: the last tool in TDW_AI_TOOLS ends with this unique sequence
# (notes field for the last vendor tool, then closing ];\n)
# We insert web_search BEFORE the ];\n that closes TDW_AI_TOOLS.
# Unique anchor: "required: ['client_name'],\n    },\n  },\n];\n"
# This sequence appears ONCE in server.js — at line 3812.

AI_TOOLS_ANCHOR = "      required: ['client_name'],\n    },\n  },\n];\n"
WEB_SEARCH_TOOL = """\
  {
    type: 'web_search_20250305',
    name: 'web_search',
  },
"""

if 'web_search_20250305' in content:
    print("  ✓ Patch 1: web_search already present in server.js, skipping.")
elif AI_TOOLS_ANCHOR in content:
    # Insert web_search before the closing ];\n of TDW_AI_TOOLS
    replacement = AI_TOOLS_ANCHOR.replace(
        "];\n",
        WEB_SEARCH_TOOL + "];\n",
        1
    )
    count_before = content.count(AI_TOOLS_ANCHOR)
    content = content.replace(AI_TOOLS_ANCHOR, replacement, 1)
    print(f"  ✓ Patch 1: web_search tool added to TDW_AI_TOOLS (vendor). Anchor found {count_before}x, replaced first occurrence.")
else:
    errors.append("PATCH 1: Could not find TDW_AI_TOOLS closing anchor. web_search NOT added to vendor tools.")
    print("  ✗ Patch 1 FAILED.")

# ── PATCH 2: web_search into TDW_COUPLE_TOOLS ─────────────────────────────
# Anchor: the last tool in TDW_COUPLE_TOOLS ends with this unique sequence
# (reply field, then closing ];\n)
# "required: ['reply'],\n    },\n  },\n];\n"

COUPLE_TOOLS_ANCHOR = "      required: ['reply'],\n    },\n  },\n];\n"
GET_MUSE_SAVES_TOOL = """\
  {
    name: 'get_muse_saves',
    description: "Fetch the bride's current Muse board — saved vendor cards, inspiration images, and links. Use this when the bride asks about her saved items or to power the SURPRISE ME aesthetic feature.",
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max saves to return. Defaults to 10.' },
      },
      required: [],
    },
  },
"""

if COUPLE_TOOLS_ANCHOR in content:
    if 'web_search_20250305' not in content:
        # Both web_search and get_muse_saves go before the closing ];
        replacement = COUPLE_TOOLS_ANCHOR.replace(
            "];\n",
            WEB_SEARCH_TOOL + GET_MUSE_SAVES_TOOL + "];\n",
            1
        )
    else:
        # web_search already added, only add get_muse_saves
        replacement = COUPLE_TOOLS_ANCHOR.replace(
            "];\n",
            GET_MUSE_SAVES_TOOL + "];\n",
            1
        )
    content = content.replace(COUPLE_TOOLS_ANCHOR, replacement, 1)
    print("  ✓ Patch 2+3: web_search + get_muse_saves added to TDW_COUPLE_TOOLS.")
else:
    errors.append("PATCH 2/3: Could not find TDW_COUPLE_TOOLS closing anchor. web_search + get_muse_saves NOT added to couple tools.")
    print("  ✗ Patch 2/3 FAILED.")

# ── Verify get_muse_saves handler is present (patch 4 — already applied) ──
if 'get_muse_saves' in content and "case 'get_muse_saves'" in content:
    print("  ✓ Patch 4 (handler): already applied, confirmed present.")
elif 'get_muse_saves' in content:
    print("  ✓ Patch 4 (handler): get_muse_saves handler present.")
else:
    errors.append("PATCH 4: get_muse_saves handler NOT found — patch 4 may not have applied. Check server.js manually.")
    print("  ✗ Patch 4 handler missing — check manually.")

# ── Verify image_base64 is present (patch 5 — already applied) ────────────
if 'image_base64' in content:
    print("  ✓ Patch 5 (multimodal): already applied, confirmed present.")
else:
    errors.append("PATCH 5: image_base64 NOT found — patch 5 may not have applied.")
    print("  ✗ Patch 5 missing — check manually.")

# ── Write ──────────────────────────────────────────────────────────────────
print(f"\nWriting to {TARGET}...")
with open(TARGET, "w", encoding="utf-8") as f:
    f.write(content)
print("Done.")

if errors:
    print("\n" + "="*60)
    print("FAILED PATCHES:")
    for e in errors:
        print(f"  • {e}")
    print("="*60)
    sys.exit(1)
else:
    print("\nAll patches applied. Next steps:")
    print("  git add -A && git commit -m 'V5: web_search + get_muse_saves tools'")
    print("  git push origin main")
    print("  Check Railway logs after deploy.")
    print("  Run verification curls from backend_v5_reference.md")
