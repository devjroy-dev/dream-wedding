path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

# Update /api/v2/couple/onboarding to accept + store segment fields
OLD = """app.post('/api/v2/couple/onboarding', async (req, res) => {
  try {
    const { userId, phone, name, wedding_date, partner_name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name required' });
    let updated = false;
    if (userId) {
      const { error } = await supabase.from('users')
        .update({ name, partner_name: partner_name || null, wedding_date: wedding_date || null })
        .eq('id', userId);
      if (!error) updated = true;
    }
    if (!updated && phone) {
      const bare = phone.replace(/\\D/g, '').slice(-10);
      const full = '+91' + bare;
      const { error: e1 } = await supabase.from('users').update({ name, partner_name: partner_name || null, wedding_date: wedding_date || null }).eq('phone', full);
      if (!e1) updated = true;
      if (!updated) {
        await supabase.from('users').update({ name, partner_name: partner_name || null, wedding_date: wedding_date || null }).eq('phone', bare);
        updated = true;
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});"""

NEW = """app.post('/api/v2/couple/onboarding', async (req, res) => {
  try {
    const { userId, phone, name, wedding_date, partner_name, residence_country, wedding_country, user_segment } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name required' });

    // Build update payload — include segment fields if provided (Directive 2.9)
    const updatePayload = {
      name,
      partner_name: partner_name || null,
      wedding_date: wedding_date || null,
    };
    if (residence_country) updatePayload.residence_country = residence_country;
    if (wedding_country) updatePayload.wedding_country = wedding_country;
    if (user_segment) updatePayload.user_segment = user_segment;

    let updated = false;
    if (userId) {
      const { error } = await supabase.from('users').update(updatePayload).eq('id', userId);
      if (!error) updated = true;
    }
    if (!updated && phone) {
      const bare = phone.replace(/\\D/g, '').slice(-10);
      const full = '+91' + bare;
      const { error: e1 } = await supabase.from('users').update(updatePayload).eq('phone', full);
      if (!e1) updated = true;
      if (!updated) {
        await supabase.from('users').update(updatePayload).eq('phone', bare);
        updated = true;
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});"""

assert content.count(OLD) == 1, f"Onboarding endpoint anchor: {content.count(OLD)}"
content = content.replace(OLD, NEW)

with open(path, 'w') as f:
    f.write(content)

print("✅ 2.9 Segment fields added to /api/v2/couple/onboarding")
print("Run: node --check backend/server.js && echo SYNTAX OK")
