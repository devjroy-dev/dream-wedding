#!/usr/bin/env python3
"""
P0-SCHEMA-1 + P0-SCHEMA-2: Universal safePayload rollout
Run from dream-wedding Codespace root: python3 apply_safe_payload.py
"""

import re, sys

TARGET = 'backend/server.js'

with open(TARGET, 'r', encoding='utf-8') as f:
    content = f.read()

original_content = content
change_log = []

def replace_exact(text, old, new, description, allow_zero=False):
    count = text.count(old)
    if count == 0 and not allow_zero:
        print(f"  WARN: '{description}' — pattern not found")
        return text
    if count > 1:
        print(f"  NOTE: '{description}' — {count} occurrences (all replaced)")
    result = text.replace(old, new)
    change_log.append(f"  {description}: {count}")
    return result

def wrap_single_line_insert(line, table):
    """
    Transform: .from('T').insert([{ ... }]).rest
    Into:      .from('T').insert([safePayload('T', { ... })]).rest
    Uses brace-depth counting to find the correct closing bracket.
    """
    pattern = f".from('{table}').insert([{{"
    if pattern not in line or 'safePayload' in line:
        return line, False
    
    start = line.index(pattern) + len(f".from('{table}').insert([")
    # Now start points to { in the original line
    # We need to find the matching }
    depth = 0
    close_pos = -1
    for i in range(start, len(line)):
        if line[i] == '{': depth += 1
        elif line[i] == '}':
            depth -= 1
            if depth == 0:
                close_pos = i
                break
    
    if close_pos == -1:
        return line, False
    
    # At close_pos we have }. After it should be ]) to close array and insert
    # Check if it's actually }]) or }]).
    if close_pos + 2 < len(line) and line[close_pos+1] == ']' and line[close_pos+2] == ')':
        # Transform:
        # before close: .insert([{...
        # at close: }])rest
        # after:    .insert([safePayload('T', {...})])rest
        new_line = (
            line[:start] +
            f"safePayload('{table}', {{" +
            line[start+1:close_pos] +
            '})])' +
            line[close_pos+3:]
        )
        return new_line, True
    
    return line, False

def wrap_single_line_update(line, table):
    """
    Transform: .from('T').update({ ... }).rest
    Into:      .from('T').update(safePayload('T', { ... })).rest
    Uses brace-depth counting.
    """
    pattern = f".from('{table}').update({{"
    if pattern not in line or 'safePayload' in line:
        return line, False
    
    start = line.index(pattern) + len(f".from('{table}').update(")
    # start points to { in the original
    depth = 0
    close_pos = -1
    for i in range(start, len(line)):
        if line[i] == '{': depth += 1
        elif line[i] == '}':
            depth -= 1
            if depth == 0:
                close_pos = i
                break
    
    if close_pos == -1:
        return line, False
    
    # At close_pos we have }. After it should be ) to close update call
    if close_pos + 1 < len(line) and line[close_pos+1] == ')':
        # Transform:
        # .update({...})rest  ->  .update(safePayload('T', {...}))rest
        new_line = (
            line[:start] +
            f"safePayload('{table}', {{" +
            line[start+1:close_pos] +
            '}))' +
            line[close_pos+2:]
        )
        return new_line, True
    
    return line, False

# ==============================================================
# SECTION A: req.body inserts — all known occurrences
# ==============================================================
content = replace_exact(content,
    "supabase.from('vendors').insert([req.body])",
    "supabase.from('vendors').insert([safePayload('vendors', req.body)])",
    "vendors insert([req.body])")
content = replace_exact(content,
    "supabase.from('moodboard_items').insert([req.body])",
    "supabase.from('moodboard_items').insert([safePayload('moodboard_items', req.body)])",
    "moodboard_items insert([req.body])")
content = replace_exact(content,
    "supabase.from('guests').insert([req.body])",
    "supabase.from('guests').insert([safePayload('guests', req.body)])",
    "guests insert([req.body])")
content = replace_exact(content,
    "supabase.from('vendor_leads').insert([req.body])",
    "supabase.from('vendor_leads').insert([safePayload('vendor_leads', req.body)])",
    "vendor_leads insert([req.body])")
content = replace_exact(content,
    "supabase.from('destination_packages').insert([req.body])",
    "supabase.from('destination_packages').insert([safePayload('destination_packages', req.body)])",
    "destination_packages insert([req.body])")
content = replace_exact(content,
    "supabase.from('featured_boards').insert([req.body])",
    "supabase.from('featured_boards').insert([safePayload('featured_boards', req.body)])",
    "featured_boards insert([req.body])")
content = replace_exact(content,
    ".insert([{ ...req.body, financial_year }])",
    ".insert([safePayload('vendor_contracts', { ...req.body, financial_year })])",
    "vendor_contracts insert([{...req.body}])")
content = replace_exact(content,
    "      .from('vendor_calendar_events')\n      .insert([req.body])\n",
    "      .from('vendor_calendar_events')\n      .insert([safePayload('vendor_calendar_events', req.body)])\n",
    "vendor_calendar_events insert([req.body]) multiline")

# ==============================================================
# SECTION B: req.body updates
# ==============================================================
content = replace_exact(content,
    "supabase.from('vendors').update(req.body).eq",
    "supabase.from('vendors').update(safePayload('vendors', req.body)).eq",
    "vendors update(req.body)")
content = replace_exact(content,
    "supabase.from('users').update(req.body).eq",
    "supabase.from('users').update(safePayload('users', req.body)).eq",
    "users update(req.body)")
content = replace_exact(content,
    "supabase.from('guests').update(req.body).eq",
    "supabase.from('guests').update(safePayload('guests', req.body)).eq",
    "guests update(req.body)")
content = replace_exact(content,
    "supabase.from('vendor_leads').update(req.body).eq",
    "supabase.from('vendor_leads').update(safePayload('vendor_leads', req.body)).eq",
    "vendor_leads update(req.body)")
content = replace_exact(content,
    "      .from('vendor_clients')\n      .update(req.body)\n",
    "      .from('vendor_clients')\n      .update(safePayload('vendor_clients', req.body))\n",
    "vendor_clients multiline update(req.body)")
content = replace_exact(content,
    "      .from('vendor_contracts')\n      .update(req.body)\n",
    "      .from('vendor_contracts')\n      .update(safePayload('vendor_contracts', req.body))\n",
    "vendor_contracts multiline update(req.body)")
content = replace_exact(content,
    "      .from('vendor_calendar_events')\n      .update(req.body)\n",
    "      .from('vendor_calendar_events')\n      .update(safePayload('vendor_calendar_events', req.body))\n",
    "vendor_calendar_events multiline update(req.body)")
content = replace_exact(content,
    "      .from('vendor_payment_schedules')\n      .update(req.body)\n",
    "      .from('vendor_payment_schedules')\n      .update(safePayload('vendor_payment_schedules', req.body))\n",
    "vendor_payment_schedules multiline update(req.body)")
content = replace_exact(content,
    "supabase.from('destination_packages').update(req.body).eq",
    "supabase.from('destination_packages').update(safePayload('destination_packages', req.body)).eq",
    "destination_packages update(req.body)")
content = replace_exact(content,
    "supabase.from('featured_boards').update(req.body).eq",
    "supabase.from('featured_boards').update(safePayload('featured_boards', req.body)).eq",
    "featured_boards update(req.body)")
content = replace_exact(content,
    "      .from('couple_shagun')\n      .update(req.body || {})\n",
    "      .from('couple_shagun')\n      .update(safePayload('couple_shagun', req.body || {}))\n",
    "couple_shagun update(req.body || {})")
content = replace_exact(content,
    "      .from('couple_moodboard_pins')\n      .update(req.body || {})\n",
    "      .from('couple_moodboard_pins')\n      .update(safePayload('couple_moodboard_pins', req.body || {}))\n",
    "couple_moodboard_pins update(req.body || {})")

print("=== SECTION A+B: req.body insert/update wrappers ===")
for c in change_log: print(c)
change_log.clear()

# ==============================================================
# SECTION C: executeToolCall — all 13 write tools + TOOL_TABLE_MAP
# ==============================================================
content = replace_exact(content,
    "async function executeToolCall(toolName, toolInput, vendor) {\n  try {\n    switch (toolName) {",
    """async function executeToolCall(toolName, toolInput, vendor) {
  // P0-SCHEMA-2: tool-to-table map — every write tool mapped to its target table
  const TOOL_TABLE_MAP = {
    create_invoice:       'vendor_invoices',
    block_calendar_dates: 'blocked_dates',
    add_client:           'vendor_clients',
    create_task:          'team_tasks',
    log_expense:          'vendor_expenses',
    save_to_muse:         'moodboard_items',
    complete_task:        'couple_checklist',
    add_expense:          'couple_expenses',
    add_vendor:           'couple_vendors',
    add_guest:            'couple_guests',
    send_enquiry:         'vendor_enquiries',
  };
  // P0-DREAMAI-VENDOR-ID diagnostic
  console.log('[DreamAi] executeToolCall:', toolName, '| id:', vendor?.id);
  try {
    switch (toolName) {""",
    "executeToolCall: TOOL_TABLE_MAP + vendor ID log")

content = replace_exact(content,
    "        const { data, error } = await supabase.from('vendor_invoices').insert([{\n          vendor_id: vendor.id, client_name, event_type,\n          amount, gst_amount, total_amount,\n          invoice_number: invNum, status: 'pending',\n          gst_enabled: true,\n        }]).select().single();",
    "        const { data, error } = await supabase.from('vendor_invoices').insert([safePayload('vendor_invoices', {\n          vendor_id: vendor.id, client_name, event_type,\n          amount, gst_amount, total_amount,\n          invoice_number: invNum, status: 'pending',\n          gst_enabled: true,\n        })]).select().single();",
    "create_invoice safePayload")

content = replace_exact(content,
    "          await supabase.from('blocked_dates').insert([{\n            vendor_id: vendor.id, date, reason: `${client_name} wedding`, notes,\n          }]).select();",
    "          await supabase.from('blocked_dates').insert([safePayload('blocked_dates', {\n            vendor_id: vendor.id, date, reason: `${client_name} wedding`, notes,\n          })]).select();",
    "block_calendar_dates safePayload")

content = replace_exact(content,
    "        const { error } = await supabase.from('vendor_clients').insert([{\n          vendor_id: vendor.id, name: client_name, phone,\n          event_date, event_type, budget, status: 'upcoming',\n        }]);",
    "        const { error } = await supabase.from('vendor_clients').insert([safePayload('vendor_clients', {\n          vendor_id: vendor.id, name: client_name, phone,\n          event_date, event_type, budget, status: 'upcoming',\n        })]);",
    "add_client safePayload")

content = replace_exact(content,
    "          await supabase.from('team_tasks').insert([{\n            vendor_id: vendor.id, title: task, description: task,\n            assignee_name: assignee || vendor.name, due_date,\n            status: 'pending', priority: 'medium',\n          }]);",
    "          await supabase.from('team_tasks').insert([safePayload('team_tasks', {\n            vendor_id: vendor.id, title: task, description: task,\n            assignee_name: assignee || vendor.name, due_date,\n            status: 'pending', priority: 'medium',\n          })]);",
    "create_task safePayload")

content = replace_exact(content,
    "        await supabase.from('moodboard_items').insert([{\n          user_id: coupleId, vendor_id: null,\n          image_url: ogImage || source_url,\n          function_tag,\n        }]);",
    "        await supabase.from('moodboard_items').insert([safePayload('moodboard_items', {\n          user_id: coupleId, vendor_id: null,\n          image_url: ogImage || source_url,\n          function_tag,\n        })]);",
    "save_to_muse safePayload")

content = replace_exact(content,
    "        await supabase.from('couple_checklist').update({ is_complete: true, completed_at: new Date().toISOString() }).eq('id', task_id);",
    "        await supabase.from('couple_checklist').update(safePayload('couple_checklist', { is_complete: true, completed_at: new Date().toISOString() })).eq('id', task_id);",
    "complete_task safePayload")

content = replace_exact(content,
    "        await supabase.from('couple_expenses').insert([{\n          couple_id: coupleId, vendor_name, description, actual_amount, category,\n          payment_status: 'committed', event: 'general',\n        }]);",
    "        await supabase.from('couple_expenses').insert([safePayload('couple_expenses', {\n          couple_id: coupleId, vendor_name, description, actual_amount, category,\n          payment_status: 'committed', event: 'general',\n        })]);",
    "add_expense safePayload")

content = replace_exact(content,
    "          await supabase.from('couple_expenses').update({ payment_status: 'paid' }).eq('id', expense_id);",
    "          await supabase.from('couple_expenses').update(safePayload('couple_expenses', { payment_status: 'paid' })).eq('id', expense_id);",
    "mark_expense_paid by id safePayload")

content = replace_exact(content,
    "          await supabase.from('couple_expenses').update({ payment_status: 'paid' })\n            .eq('couple_id', coupleId).ilike('vendor_name', '%' + vendor_name + '%');",
    "          await supabase.from('couple_expenses').update(safePayload('couple_expenses', { payment_status: 'paid' }))\n            .eq('couple_id', coupleId).ilike('vendor_name', '%' + vendor_name + '%');",
    "mark_expense_paid by vendor_name safePayload")

content = replace_exact(content,
    "        const { error } = await supabase.from('couple_vendors').insert([{\n          couple_id: coupleId, name, category, phone, quoted_total,\n          status, events, source: 'manual',\n        }]);",
    "        const { error } = await supabase.from('couple_vendors').insert([safePayload('couple_vendors', {\n          couple_id: coupleId, name, category, phone, quoted_total,\n          status, events, source: 'manual',\n        })]);",
    "add_vendor safePayload")

content = replace_exact(content,
    "        await supabase.from('couple_vendors').update({ status: status, updated_at: new Date().toISOString() }).eq('id', rows[0].id);",
    "        await supabase.from('couple_vendors').update(safePayload('couple_vendors', { status: status, updated_at: new Date().toISOString() })).eq('id', rows[0].id);",
    "update_vendor_status safePayload")

content = replace_exact(content,
    "        const { error } = await supabase.from('couple_guests').insert([{\n          couple_id: coupleId, name, phone, side, rsvp_status,\n        }]);",
    "        const { error } = await supabase.from('couple_guests').insert([safePayload('couple_guests', {\n          couple_id: coupleId, name, phone, side, rsvp_status,\n        })]);",
    "add_guest safePayload")

content = replace_exact(content,
    "          await supabase.from('vendor_enquiry_messages').insert([{ enquiry_id: existing.id, from_role: 'couple', content: message }]);",
    "          await supabase.from('vendor_enquiry_messages').insert([safePayload('vendor_enquiry_messages', { enquiry_id: existing.id, from_role: 'couple', content: message })]);",
    "send_enquiry vendor_enquiry_messages (existing)")

content = replace_exact(content,
    "          await supabase.from('vendor_enquiries').update({\n            last_message_at: new Date().toISOString(),\n            last_message_preview: message.slice(0, 120),\n            last_message_from: 'couple',\n            vendor_unread_count: 1,\n          }).eq('id', existing.id);",
    "          await supabase.from('vendor_enquiries').update(safePayload('vendor_enquiries', {\n            last_message_at: new Date().toISOString(),\n            last_message_preview: message.slice(0, 120),\n            last_message_from: 'couple',\n            vendor_unread_count: 1,\n          })).eq('id', existing.id);",
    "send_enquiry vendor_enquiries update")

content = replace_exact(content,
    "        const { data: enq, error } = await supabase.from('vendor_enquiries').insert([{\n          couple_id: coupleId, vendor_id, initial_message: message,\n          wedding_date: cp ? cp.wedding_date : null,\n          last_message_at: new Date().toISOString(),\n          last_message_preview: message.slice(0, 120),\n          last_message_from: 'couple',\n          vendor_unread_count: 1,\n        }]).select().single();",
    "        const { data: enq, error } = await supabase.from('vendor_enquiries').insert([safePayload('vendor_enquiries', {\n          couple_id: coupleId, vendor_id, initial_message: message,\n          wedding_date: cp ? cp.wedding_date : null,\n          last_message_at: new Date().toISOString(),\n          last_message_preview: message.slice(0, 120),\n          last_message_from: 'couple',\n          vendor_unread_count: 1,\n        })]).select().single();",
    "send_enquiry vendor_enquiries insert")

content = replace_exact(content,
    "        await supabase.from('vendor_enquiry_messages').insert([{ enquiry_id: enq.id, from_role: 'couple', content: message }]);",
    "        await supabase.from('vendor_enquiry_messages').insert([safePayload('vendor_enquiry_messages', { enquiry_id: enq.id, from_role: 'couple', content: message })]);",
    "send_enquiry vendor_enquiry_messages (new)")

content = replace_exact(content,
    "        const { data, error } = await supabase.from('vendor_expenses').insert([{\n          vendor_id: vendor.id,\n          description: description || null,\n          amount: Number(amount),\n          category: category || 'Other',\n          expense_type: expense_type || 'client',\n          related_name: related_name || null,\n          expense_date: now.toISOString().split('T')[0],\n          financial_year,\n        }]).select().single();",
    "        const { data, error } = await supabase.from('vendor_expenses').insert([safePayload('vendor_expenses', {\n          vendor_id: vendor.id,\n          description: description || null,\n          amount: Number(amount),\n          category: category || 'Other',\n          expense_type: expense_type || 'client',\n          related_name: related_name || null,\n          expense_date: now.toISOString().split('T')[0],\n          financial_year,\n        })]).select().single();",
    "log_expense safePayload")

# Diagnostic log for in-app DreamAi userId
content = replace_exact(content,
    "        if (QUERY_TOOLS.includes(toolName)) {\n          // Execute immediately\n          toolsExecuted++;\n          try {\n            const result = await executeToolCall(toolName, toolInput, { id: userId });",
    "        if (QUERY_TOOLS.includes(toolName)) {\n          // Execute immediately\n          toolsExecuted++;\n          console.log('[DreamAi] in-app tool:', toolName, '| userId:', userId, '| type:', userType);\n          try {\n            const result = await executeToolCall(toolName, toolInput, { id: userId });",
    "DreamAi in-app: add userId diagnostic log")

print("\n=== SECTION C: executeToolCall (P0-SCHEMA-2) ===")
for c in change_log: print(c)
change_log.clear()

# ==============================================================
# SECTION D: Systematic single-line explicit dict inserts
# Using brace-depth counting for correct bracket matching
# ==============================================================
lines_list = content.split('\n')
d_count = 0
d_skipped = 0

for i, line in enumerate(lines_list):
    stripped = line.strip()
    if stripped.startswith('//') or stripped.startswith('*'):
        continue
    
    m = re.search(r"\.from\('(\w+)'\)\.insert\(\[\{", line)
    if m and 'safePayload' not in line:
        table = m.group(1)
        new_line, changed = wrap_single_line_insert(line, table)
        if changed:
            lines_list[i] = new_line
            d_count += 1
        else:
            d_skipped += 1

content = '\n'.join(lines_list)
change_log.append(f"Pattern D single-line .insert([{{: {d_count} wrapped, {d_skipped} skipped (multiline)")

# ==============================================================
# SECTION E: Systematic single-line explicit dict updates
# ==============================================================
lines_list = content.split('\n')
e_count = 0
e_skipped = 0

for i, line in enumerate(lines_list):
    stripped = line.strip()
    if stripped.startswith('//') or stripped.startswith('*'):
        continue
    
    m = re.search(r"\.from\('(\w+)'\)\.update\(\{", line)
    if m and 'safePayload' not in line:
        table = m.group(1)
        new_line, changed = wrap_single_line_update(line, table)
        if changed:
            lines_list[i] = new_line
            e_count += 1
        else:
            e_skipped += 1

content = '\n'.join(lines_list)
change_log.append(f"Pattern E single-line .update({{: {e_count} wrapped, {e_skipped} skipped (multiline or dynamic)")

print("\n=== SECTION D+E: systematic insert/update wrapping ===")
for c in change_log: print(c)
change_log.clear()

# ==============================================================
# SECTION F: Multi-line .update({ patterns (5 known from grep)
# These are lines where .update({ is alone, dict spans next lines
# Lines: 428, 540, 609, 711 (bookings table), 8874 (access_codes)
# ==============================================================
lines_list = content.split('\n')
f_count = 0

i = 0
while i < len(lines_list):
    stripped = lines_list[i].strip()
    # Standalone .update({ line (nothing else on the line after the {)
    if re.match(r'^\.update\(\{\s*$', stripped) and 'safePayload' not in stripped:
        # Find table name looking back up to 8 lines
        table = None
        for j in range(max(0, i-8), i):
            m = re.search(r"\.from\('(\w+)'\)", lines_list[j])
            if m:
                table = m.group(1)
        
        if table:
            indent = len(lines_list[i]) - len(lines_list[i].lstrip())
            lines_list[i] = ' ' * indent + f".update(safePayload('{table}', {{"
            
            # Find the matching closing }) using brace depth
            depth = 1  # we already consumed the opening {
            for k in range(i+1, min(i+50, len(lines_list))):
                for ch in lines_list[k]:
                    if ch == '{': depth += 1
                    elif ch == '}': depth -= 1
                    if depth == 0: break
                
                if depth == 0:
                    # This line contains the closing }
                    # Transform: first }) on this line -> }))
                    # Must handle: }).eq(...) or }).select() or }) alone
                    idx = lines_list[k].find('})')
                    if idx >= 0:
                        lines_list[k] = lines_list[k][:idx] + '}))' + lines_list[k][idx+2:]
                    f_count += 1
                    break
    i += 1

content = '\n'.join(lines_list)
change_log.append(f"Pattern F multiline .update({{: {f_count} wrapped")
print("\n=== SECTION F: multiline update wrapping ===")
for c in change_log: print(c)
change_log.clear()

# ==============================================================
# SUMMARY
# ==============================================================
final_count = content.count('safePayload(')
orig_count = original_content.count('safePayload(')
print(f"\n=== SUMMARY ===")
print(f"Original safePayload() count: {orig_count}")
print(f"Final safePayload() count:    {final_count}")
print(f"Net new wrappers: {final_count - orig_count}")

with open(TARGET, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"\nWrote {TARGET}")
print("Run: node --check backend/server.js && echo 'SYNTAX OK'")
