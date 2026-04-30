import subprocess, sys
path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

anchor = "\n// List expenses\napp.get('/api/couple/expenses/:coupleId', async (req, res) => {"

if '/api/couple/budget-categories/' in content:
    print("Already applied — skipping")
    sys.exit(0)

new_endpoints = """
// ─── Budget Categories ────────────────────────────────────────────────────────
app.get('/api/couple/budget-categories/:coupleId', async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { data, error } = await supabase
      .from('couple_budget_categories')
      .select('*')
      .eq('couple_id', coupleId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/couple/budget-categories/:coupleId', async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { categories } = req.body || {};
    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ success: false, error: 'categories array required' });
    }
    const rows = categories.map((c, i) => ({
      couple_id: coupleId,
      category_key: c.category_key,
      display_name: c.display_name,
      allocated_amount: c.allocated_amount || 0,
      pct: c.pct || 0,
      is_custom: c.is_custom || false,
      sort_order: i,
    }));
    await supabase.from('couple_budget_categories').delete().eq('couple_id', coupleId);
    const { data, error } = await supabase.from('couple_budget_categories').insert(rows).select();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/couple/budget-categories/:coupleId/:categoryKey', async (req, res) => {
  try {
    const { coupleId, categoryKey } = req.params;
    const { display_name, allocated_amount, pct } = req.body || {};
    const updates = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (allocated_amount !== undefined) updates.allocated_amount = allocated_amount;
    if (pct !== undefined) updates.pct = pct;
    const { data, error } = await supabase
      .from('couple_budget_categories')
      .update(updates)
      .eq('couple_id', coupleId)
      .eq('category_key', categoryKey)
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

"""

content = content.replace(anchor, new_endpoints + anchor, 1)
with open(path, 'w') as f:
    f.write(content)
print("Done")
