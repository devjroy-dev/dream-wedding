path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

old = "app.get('/api/couple/muse/:couple_id', async (req, res) => {"

new = """// POST /api/v2/couple/muse — save a link or URL to muse board
app.post('/api/v2/couple/muse', async (req, res) => {
  try {
    const { user_id, source_url, title, type } = req.body || {};
    if (!user_id || !source_url) return res.status(400).json({ success: false, error: 'user_id and source_url required' });
    const ogImage = await fetchOgImage(source_url).catch(() => null);
    const { data, error } = await supabase.from('moodboard_items').insert([{
      user_id,
      vendor_id: null,
      image_url: ogImage || null,
      source_url,
      title: title || null,
      function_tag: 'muse_save',
      created_at: new Date().toISOString(),
    }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/couple/muse/:couple_id', async (req, res) => {"""

assert content.count(old) == 1, f"Found {content.count(old)} matches"
content = content.replace(old, new, 1)
with open(path, 'w') as f:
    f.write(content)
print("Done ✅")
