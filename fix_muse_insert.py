path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

old = """    const ogImage = await fetchOgImage(source_url).catch(() => null);
    const { data, error } = await supabase.from('moodboard_items').insert([{
      user_id,
      vendor_id: null,
      image_url: ogImage || null,
      source_url,
      title: title || null,
      function_tag: 'muse_save',
      created_at: new Date().toISOString(),
    }]).select().single();"""

new = """    const ogImage = await fetchOgImage(source_url).catch(() => null);
    const { data, error } = await supabase.from('moodboard_items').insert([{
      user_id,
      vendor_id: null,
      image_url: ogImage || source_url,
      function_tag: 'muse_save',
      created_at: new Date().toISOString(),
    }]).select().single();"""

assert content.count(old) == 1, f"Found {content.count(old)}"
content = content.replace(old, new, 1)
with open(path, 'w') as f:
    f.write(content)
print("Done ✅")
