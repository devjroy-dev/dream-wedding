path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

# Fix 1: Remove source_url from today endpoint select
old = "supabase.from('moodboard_items').select('id, vendor_id, image_url, source_url, title, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),"
new = "supabase.from('moodboard_items').select('id, vendor_id, image_url, title, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),"
assert content.count(old) == 1, f"Fix1: {content.count(old)}"
content = content.replace(old, new, 1)

# Fix 2: Fix muse link save endpoint to not use source_url column
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
assert content.count(old) == 1, f"Fix2: {content.count(old)}"
content = content.replace(old, new, 1)

# Fix 3: Add image upload endpoint before the muse GET endpoint
old = "app.get('/api/couple/muse/:couple_id', async (req, res) => {"
new = """// POST /api/v2/couple/muse-image — save a Cloudinary image URL to muse
app.post('/api/v2/couple/muse-image', async (req, res) => {
  try {
    const { user_id, image_url } = req.body || {};
    if (!user_id || !image_url) return res.status(400).json({ success: false, error: 'user_id and image_url required' });
    const { data, error } = await supabase.from('moodboard_items').insert([{
      user_id,
      vendor_id: null,
      image_url,
      function_tag: 'muse_save',
      created_at: new Date().toISOString(),
    }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/couple/muse/:couple_id', async (req, res) => {"""
assert content.count("app.get('/api/couple/muse/:couple_id', async (req, res) => {") == 1
content = content.replace("app.get('/api/couple/muse/:couple_id', async (req, res) => {", new, 1)

with open(path, 'w') as f:
    f.write(content)
print("Done ✅")
