path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

old = "supabase.from('moodboard_items').select('id, vendor_id, image_url, source_url, title, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),"
new = "supabase.from('moodboard_items').select('id, vendor_id, image_url, title, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),"

assert content.count(old) == 1, f"Found {content.count(old)}"
content = content.replace(old, new, 1)
with open(path, 'w') as f:
    f.write(content)
print("Done ✅")
