path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

if 'Strip fields that aren\'t columns in couple_vendors' in content:
    print("Already applied"); exit()

old = '''app.patch('/api/couple/vendors/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const updates = { ...(req.body || {}), updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('couple_vendors')
      .update(updates)
      .eq('id', vendorId)
      .select().single();'''

new = '''app.patch('/api/couple/vendors/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    // Strip fields that aren't columns in couple_vendors
    const { event_id, event_name, ...rest } = req.body || {};
    const updates = { ...rest, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('couple_vendors')
      .update(updates)
      .eq('id', vendorId)
      .select().single();'''

assert content.count(old) == 1
content = content.replace(old, new, 1)
with open(path, 'w') as f:
    f.write(content)
print("Fixed ✅")
