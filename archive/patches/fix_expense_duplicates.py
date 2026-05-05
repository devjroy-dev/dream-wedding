path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

# The duplicate block that appears exactly twice — remove both
old = """
// S28: Add expense endpoint
app.post('/api/couple/expenses', async (req, res) => {
  const { couple_id, vendor_name, description, amount, event, category } = req.body;
  try {
    const { data, error } = await supabase
      .from('couple_expenses')
      .insert([{ couple_id, vendor_name, description, amount, event, category }])
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});"""

count = content.count(old)
print(f"Found {count} instance(s) — expected 2")
assert count == 2, f"ABORT: expected 2, found {count}"

# Remove both
content = content.replace(old, '', 2)

# Verify canonical handler still present
assert "couple_id, event, category, description, vendor_name," in content, "ABORT: canonical handler missing"
# Verify duplicates gone
assert content.count("// S28: Add expense endpoint") == 0, "ABORT: S28 comment still present"

with open(path, 'w') as f:
    f.write(content)

print("Done ✅ — both duplicate handlers removed, canonical handler intact")
