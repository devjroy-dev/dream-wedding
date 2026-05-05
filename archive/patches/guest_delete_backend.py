import sys
path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

if "DELETE.*couple.*guest\|delete.*couple_guest" in content or "app.delete('/api/v2/couple/guests/:guestId'" in content:
    print("Already applied"); sys.exit(0)

anchor = 'app.get("/api/v2/couple/guests/:userId"'
new_endpoint = '''// DELETE a single guest
app.delete('/api/v2/couple/guests/:guestId', async (req, res) => {
  try {
    const { guestId } = req.params;
    const { error } = await supabase.from('couple_guests').delete().eq('id', guestId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

'''
assert content.count(anchor) == 1
content = content.replace(anchor, new_endpoint + anchor, 1)
with open(path, 'w') as f:
    f.write(content)
print("Done ✅")
