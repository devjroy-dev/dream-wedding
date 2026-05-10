#!/usr/bin/env python3
"""
PATCH B-3a — backend: create_reminder returns task_id

Tiny backend fix. create_reminder is the only bride write tool that
currently does not return its entity_id. Without task_id, the bride-chat
handler can't auto-derive a tool_anchor for the new reminder, so the
View pill (B-3b frontend) has nothing to tap.

Fix: capture row.id from the insert .select() and return task_id in the
response. The bride-chat handler's existing auto-derive code at line
14201 will then push a {tool: 'tasks', entity_type: 'task', entity_id}
anchor into toolAnchors.

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

OLD = """      case 'create_reminder': {
        // Real schema: couple_checklist with event (NOT NULL), text (NOT NULL), is_complete, priority, due_date, is_custom
        const { text: reminderText, due_date = null, priority = 'normal', event = 'general' } = toolInput;
        const insertData = {
          couple_id: coupleId,
          event,
          text: reminderText,
          priority,
          is_custom: true,
        };
        if (due_date) insertData.due_date = due_date;
        const { error } = await supabase.from('couple_checklist').insert([insertData]);
        if (error) throw error;
        return {
          ok: true,
          kind: 'atomic',
          reply: `✦ I'll remember: ${reminderText}${due_date ? ' · ' + due_date : ''}`,
        };
      }"""

NEW = """      case 'create_reminder': {
        // Real schema: couple_checklist with event (NOT NULL), text (NOT NULL), is_complete, priority, due_date, is_custom
        const { text: reminderText, due_date = null, priority = 'normal', event = 'general' } = toolInput;
        const insertData = {
          couple_id: coupleId,
          event,
          text: reminderText,
          priority,
          is_custom: true,
        };
        if (due_date) insertData.due_date = due_date;
        // PATCH B-3a: capture row.id so bride-chat can derive a tool_anchor for the View pill.
        const { data: row, error } = await supabase.from('couple_checklist').insert([insertData]).select('id').single();
        if (error) throw error;
        return {
          ok: true,
          kind: 'atomic',
          reply: `✦ I'll remember: ${reminderText}${due_date ? ' · ' + due_date : ''}`,
          task_id: row?.id,
        };
      }"""

assert src.count(OLD) == 1, f"OLD expected exactly 1 match, got {src.count(OLD)}"
src = src.replace(OLD, NEW)
print("[1/1] create_reminder now returns task_id")

SENTINEL = "// ─── PATCH B-3a LOADED ─── //\n"
if SENTINEL not in src:
    src = src.rstrip() + "\n\n" + SENTINEL

with open(TARGET, 'w', encoding='utf-8') as f:
    f.write(src)

print(f"\nWrote {TARGET}")
print(f"Size delta: {len(src) - orig_len:+d} bytes")
print("\nNow run:  node --check backend/server.js")
