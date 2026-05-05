import sys
path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

if '/api/v2/couple/guests/bulk' in content:
    print("Already applied"); sys.exit(0)

anchor = 'app.get("/api/v2/couple/guests/:userId"'

new_endpoints = r'''// ─── Couple Guest Bulk Import ─────────────────────────────────────────────────
app.post('/api/v2/couple/guests/bulk', async (req, res) => {
  try {
    const { couple_id, guests } = req.body || {};
    if (!couple_id || !Array.isArray(guests) || guests.length === 0)
      return res.status(400).json({ success: false, error: 'couple_id and guests array required' });
    const { data: existing } = await supabase.from('couple_guests').select('name, phone').eq('couple_id', couple_id);
    const existingKeys = new Set((existing || []).map(g =>
      `${(g.name||'').toLowerCase()}|${(g.phone||'').replace(/[^0-9]/g,'').slice(-10)}`
    ));
    const rows = guests
      .filter(g => g.name?.trim())
      .filter(g => {
        const key = `${(g.name||'').toLowerCase()}|${(g.phone||'').replace(/[^0-9]/g,'').slice(-10)}`;
        return !existingKeys.has(key);
      })
      .map(g => ({ couple_id, name: g.name.trim(), phone: g.phone?.trim() || null, side: g.side || 'bride', rsvp_status: 'pending', event_invites: {} }));
    if (rows.length === 0) return res.json({ success: true, added: 0, skipped: guests.length });
    const { data, error } = await supabase.from('couple_guests').insert(rows).select();
    if (error) throw error;
    res.json({ success: true, added: data?.length || 0, skipped: guests.length - (data?.length || 0) });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ─── Couple Guest Broadcast (WhatsApp) ───────────────────────────────────────
app.post('/api/v2/couple/guests/broadcast', async (req, res) => {
  try {
    const { couple_id, guest_ids, message } = req.body || {};
    if (!couple_id || !message) return res.status(400).json({ success: false, error: 'couple_id and message required' });
    let query = supabase.from('couple_guests').select('id, name, phone').eq('couple_id', couple_id);
    if (Array.isArray(guest_ids) && guest_ids.length > 0) query = query.in('id', guest_ids);
    const { data: guests, error } = await query;
    if (error) throw error;
    const withPhone = (guests || []).filter(g => g.phone);
    if (withPhone.length === 0) return res.json({ success: true, sent: 0, skipped: (guests||[]).length });
    let sent = 0, failed = 0;
    for (const guest of withPhone) {
      try {
        await sendWhatsApp(guest.phone, message.replace('{name}', guest.name?.split(' ')[0] || 'there'));
        sent++;
        await new Promise(r => setTimeout(r, 200));
      } catch { failed++; }
    }
    res.json({ success: true, sent, failed, skipped: (guests||[]).length - withPhone.length });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

'''

assert content.count(anchor) == 1
content = content.replace(anchor, new_endpoints + anchor, 1)
with open(path, 'w') as f:
    f.write(content)
print("Done ✅")
