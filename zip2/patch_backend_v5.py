#!/usr/bin/env python3
"""
TDW V5 — patch_backend_v5.py
Run from the dream-wedding repo root in Dev's Codespace:
    python3 patch_backend_v5.py

What it does (5 patches):
  1. Adds web_search tool to couple DreamAi chat handler tools array
  2. Adds web_search tool to vendor DreamAi chat handler tools array
  3. Adds get_muse_saves tool definition to couple tools array
  4. Adds get_muse_saves tool handler case in couple tool execution block
  5. Adds image_base64 multimodal content handling to DreamAi chat handler

Uses string anchors — does NOT depend on line numbers.
Creates backup at backend/server.js.bak before writing.
"""

import shutil, sys, re

TARGET = "backend/server.js"
BACKUP = "backend/server.js.bak"

print(f"Reading {TARGET}...")
with open(TARGET, "r", encoding="utf-8") as f:
    content = f.read()

print(f"  {len(content)} chars read.")
print("Creating backup...")
shutil.copy(TARGET, BACKUP)
print(f"  Backup saved to {BACKUP}")

errors = []

# ── PATCH 1 & 2: web_search tool ─────────────────────────────────────────
# Strategy: find the tools array in the Anthropic client.messages.create call.
# The call has a structure like:
#   tools: [
#     { name: "add_expense", ... },
# We insert web_search as the FIRST tool in BOTH the couple and vendor blocks.
# We detect which is which by looking for a nearby userType check.
#
# Because server.js structure varies, we use a robust approach:
# find ALL occurrences of `tools: [` that are inside the dreamai chat handler
# and prepend the web_search tool to each.

WEB_SEARCH_TOOL = """{
          "type": "web_search_20250305",
          "name": "web_search"
        },
        """

# Find every `tools: [` followed by a tool definition object (not already web_search)
pattern_tools = re.compile(
    r'(tools:\s*\[)\s*\n(\s*\{)',
    re.MULTILINE
)

def add_web_search(m):
    # Don't double-add
    # Check if web_search is already in the next 200 chars
    start = m.start()
    snippet = content[start:start+300]
    if 'web_search' in snippet:
        return m.group(0)
    return m.group(1) + '\n' + '        ' + WEB_SEARCH_TOOL.strip() + '\n' + m.group(2)

new_content = pattern_tools.sub(add_web_search, content)

if new_content == content:
    errors.append("PATCH 1/2: Could not find 'tools: [' pattern in server.js. Web search tool NOT added. Manual insertion needed.")
    print("  ✗ Patch 1/2 FAILED — see errors at end.")
else:
    count = len(pattern_tools.findall(content))
    print(f"  ✓ Patch 1/2: web_search tool added to {count} tools array(s).")
    content = new_content

# ── PATCH 3: get_muse_saves tool definition ───────────────────────────────
# Find the couple tools array — look for add_expense tool definition as anchor
# and insert get_muse_saves after the LAST tool in the couple tools array.
# Strategy: find "general_reply" tool (last couple tool) closing brace and
# insert get_muse_saves after it, before the closing ] of the tools array.

GET_MUSE_SAVES_TOOL_DEF = """        {
          name: "get_muse_saves",
          description: "Fetch the bride's current Muse board — saved vendor cards, inspiration images, and links. Use this when the bride asks about her saved items or to power the SURPRISE ME aesthetic feature.",
          input_schema: {
            type: "object",
            properties: {
              limit: {
                type: "number",
                description: "Max saves to return. Defaults to 10."
              }
            },
            required: []
          }
        },"""

# Look for general_reply tool followed by closing of tools array
# The general_reply tool is the last one in couple tools
anchor_couple = '"general_reply"'
if anchor_couple in content and 'get_muse_saves' not in content:
    # Find the last occurrence (couple side, not vendor side)
    idx = content.find(anchor_couple)
    if idx != -1:
        # Find the closing brace of this tool object after the anchor
        close_brace = content.find('\n        },', idx)
        if close_brace == -1:
            close_brace = content.find('\n        }', idx)
        if close_brace != -1:
            insert_pos = close_brace + len('\n        },')
            content = content[:insert_pos] + '\n' + GET_MUSE_SAVES_TOOL_DEF + content[insert_pos:]
            print("  ✓ Patch 3: get_muse_saves tool definition added.")
        else:
            errors.append("PATCH 3: Found general_reply anchor but could not find closing brace. get_muse_saves NOT added.")
            print("  ✗ Patch 3 FAILED.")
elif 'get_muse_saves' in content:
    print("  ✓ Patch 3: get_muse_saves already present, skipping.")
else:
    errors.append("PATCH 3: Could not find 'general_reply' anchor. get_muse_saves tool NOT added. Manual insertion needed.")
    print("  ✗ Patch 3 FAILED.")

# ── PATCH 4: get_muse_saves tool handler ─────────────────────────────────
# Find the couple tool execution block. Look for the general_reply case handler
# as anchor and insert get_muse_saves case before it.

GET_MUSE_SAVES_HANDLER = """
      case 'get_muse_saves': {
        const limit = toolInput.limit || 10;
        const { data: museData, error: museError } = await supabase
          .from('couple_muse')
          .select('id, image_url, source_url, vendor_id, function_tag, created_at')
          .eq('couple_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (museError) {
          toolResults.push({ tool: toolName, result: { success: false, error: museError.message } });
        } else {
          toolResults.push({ tool: toolName, result: { success: true, saves: museData || [], count: (museData || []).length } });
        }
        break;
      }
"""

# Anchor: find "case 'general_reply':" in the couple tool handler
anchor_handler = "case 'general_reply':"
if anchor_handler in content and 'get_muse_saves' not in content:
    idx = content.find(anchor_handler)
    content = content[:idx] + GET_MUSE_SAVES_HANDLER + content[idx:]
    print("  ✓ Patch 4: get_muse_saves handler added.")
elif 'get_muse_saves' in content:
    print("  ✓ Patch 4: get_muse_saves handler already present, skipping.")
else:
    errors.append("PATCH 4: Could not find \"case 'general_reply':\" anchor. Handler NOT added. Manual insertion needed.")
    print("  ✗ Patch 4 FAILED.")

# ── PATCH 5: image_base64 multimodal handling ─────────────────────────────
# Find where the user message is passed to the Anthropic API in the DreamAi
# chat handler. Look for the pattern where messages array is built.
# Anchor: find the POST /api/v2/dreamai/chat handler body destructuring.
#
# We look for: `const { userId, userType, message, context` (the destructure line)
# and extend it, then find where messages: [ { role: 'user', content: message }]
# is built and replace with multimodal-aware version.

MULTIMODAL_ANCHOR = "const { userId, userType, message, context"

if MULTIMODAL_ANCHOR in content and 'image_base64' not in content:
    idx = content.find(MULTIMODAL_ANCHOR)
    # Find end of this destructure statement (semicolon or newline)
    end_of_line = content.find('\n', idx)
    old_destructure = content[idx:end_of_line]

    # Extend the destructure to include image_base64 and image_media_type
    new_destructure = old_destructure.rstrip()
    # Remove trailing } = req.body; and add the new fields
    if '} = req.body' in new_destructure:
        new_destructure = new_destructure.replace(
            '} = req.body',
            ', image_base64, image_media_type } = req.body'
        )
    elif "} = req.body;" in new_destructure:
        new_destructure = new_destructure.replace(
            '} = req.body;',
            ', image_base64, image_media_type } = req.body;'
        )

    content = content[:idx] + new_destructure + content[end_of_line:]

    # Now find where user content is set for the Anthropic call.
    # Look for: role: 'user', content: message
    user_msg_anchor = "role: 'user', content: message"
    if user_msg_anchor in content:
        # Replace the single-message pattern with multimodal-aware version
        MULTIMODAL_USER_CONTENT = """role: 'user', content: image_base64
                ? [
                    { type: 'image', source: { type: 'base64', media_type: image_media_type || 'image/jpeg', data: image_base64 } },
                    { type: 'text', text: message }
                  ]
                : message"""
        content = content.replace(user_msg_anchor, MULTIMODAL_USER_CONTENT, 1)
        print("  ✓ Patch 5: image_base64 multimodal handling added.")
    else:
        errors.append("PATCH 5b: Extended destructure but could not find \"role: 'user', content: message\" to make multimodal. Partial patch applied.")
        print("  ✗ Patch 5b partial.")
elif 'image_base64' in content:
    print("  ✓ Patch 5: image_base64 already present, skipping.")
else:
    errors.append("PATCH 5: Could not find DreamAi chat destructure anchor. Multimodal NOT added. Manual insertion needed.")
    print("  ✗ Patch 5 FAILED.")

# ── Write output ──────────────────────────────────────────────────────────
print(f"\nWriting patched file to {TARGET}...")
with open(TARGET, "w", encoding="utf-8") as f:
    f.write(content)
print("Done.")

if errors:
    print("\n" + "="*60)
    print("FAILED PATCHES — manual action required:")
    for e in errors:
        print(f"  • {e}")
    print("="*60)
    print("\nFor each failed patch, open server.js and apply manually.")
    print("Refer to backend_v5_reference.md in this ZIP for exact code.")
    sys.exit(1)
else:
    print("\nAll 5 patches applied cleanly.")
    print("Next: push to main, Railway will auto-deploy.")
    print("Then run verification curls from backend_v5_reference.md")
