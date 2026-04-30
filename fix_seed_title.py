path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

old = '''    const rows = WEDDING_TASK_TEMPLATES.map(t => ({
      couple_id: coupleId,
      event: t.event,
      text: t.text,
      title: t.text,
      priority: t.priority,
      is_complete: false,
      is_custom: false,
      seeded_from_template: true,
    }));'''

new = '''    const rows = WEDDING_TASK_TEMPLATES.map(t => ({
      couple_id: coupleId,
      event: t.event,
      text: t.text,
      priority: t.priority,
      is_complete: false,
      is_custom: false,
      seeded_from_template: true,
    }));'''

assert content.count(old) == 1
content = content.replace(old, new, 1)
with open(path, 'w') as f:
    f.write(content)
print("Fixed ✅")
