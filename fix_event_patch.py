path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

if "'venue'" in content and "couple_events" in content and "allowed" in content:
    old = "    const allowed = ['event_name', 'event_date', 'event_city', 'budget_total', 'vibe_tags', 'guest_count_range', 'is_active', 'notes', 'sort_order'];"
    new = "    const allowed = ['event_name', 'event_date', 'event_city', 'venue', 'budget_total', 'vibe_tags', 'guest_count_range', 'is_active', 'notes', 'sort_order'];"
    if content.count(old) == 1:
        content = content.replace(old, new, 1)
        with open(path, 'w') as f:
            f.write(content)
        print("Fixed ✅")
    else:
        print("Already applied or not found")
else:
    print("Pattern not found")
