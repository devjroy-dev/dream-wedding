path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

if 'Keep couple_profiles in sync' in content:
    print("Already applied"); exit()

old = '''// Update budget envelopes (total_budget + event_envelopes JSONB)
app.patch('/api/couple/budget/:coupleId', async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { total_budget, event_envelopes } = req.body || {};
    const updates = { updated_at: new Date().toISOString() };
    if (total_budget !== undefined) updates.total_budget = total_budget;
    if (event_envelopes !== undefined) updates.event_envelopes = event_envelopes;
    const { data, error } = await supabase
      .from('couple_budget')
      .update(updates)
      .eq('couple_id', coupleId)
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('budget update error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});'''

new = '''// Update budget envelopes (total_budget + event_envelopes JSONB)
app.patch('/api/couple/budget/:coupleId', async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { total_budget, event_envelopes } = req.body || {};
    const updates = { updated_at: new Date().toISOString() };
    if (total_budget !== undefined) updates.total_budget = total_budget;
    if (event_envelopes !== undefined) updates.event_envelopes = event_envelopes;
    const { data, error } = await supabase
      .from('couple_budget')
      .update(updates)
      .eq('couple_id', coupleId)
      .select().single();
    if (error) throw error;
    // Keep couple_profiles in sync so money dashboard reflects new total
    if (total_budget !== undefined) {
      await supabase.from('couple_profiles').upsert(
        { user_id: coupleId, total_budget },
        { onConflict: 'user_id' }
      );
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('budget update error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});'''

assert content.count(old) == 1
content = content.replace(old, new, 1)
with open(path, 'w') as f:
    f.write(content)
print("Fixed ✅")
