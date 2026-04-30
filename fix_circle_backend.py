path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

# Also add circle room to socket.io
old_socket = """io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('join_conversation', ({ userId, vendorId }) => {
    const room = `conversation_${userId}_${vendorId}`;
    socket.join(room);
  });
  socket.on('send_message', async ({ userId, vendorId, message, senderType }) => {
    const room = `conversation_${userId}_${vendorId}`;
    const messageData = { user_id: userId, vendor_id: vendorId, message, sender_type: senderType, created_at: new Date().toISOString() };
    const { data, error } = await supabase.from('messages').insert([messageData]).select().single();
    if (!error) io.to(room).emit('receive_message', data);
  });
  socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});"""

new_socket = """io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('join_conversation', ({ userId, vendorId }) => {
    const room = `conversation_${userId}_${vendorId}`;
    socket.join(room);
  });
  socket.on('send_message', async ({ userId, vendorId, message, senderType }) => {
    const room = `conversation_${userId}_${vendorId}`;
    const messageData = { user_id: userId, vendor_id: vendorId, message, sender_type: senderType, created_at: new Date().toISOString() };
    const { data, error } = await supabase.from('messages').insert([messageData]).select().single();
    if (!error) io.to(room).emit('receive_message', data);
  });
  // Circle group chat room
  socket.on('join_circle', ({ coupleId }) => {
    socket.join(`circle_${coupleId}`);
  });
  socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});"""

assert content.count(old_socket) == 1, f'ABORT socket: {content.count(old_socket)}'
content = content.replace(old_socket, new_socket, 1)

# Insert circle endpoints after co-planner/remove
old_anchor = """// ── Enquiry Notification System ──"""

new_endpoints = """// ── Circle Reactions ──────────────────────────────────────────────────────────

app.get('/api/circle/reactions/:coupleId', async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { data, error } = await supabase
      .from('circle_reactions')
      .select('*')
      .eq('couple_id', coupleId);
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/circle/reactions', async (req, res) => {
  try {
    const { couple_id, item_id, emoji, actor_name } = req.body;
    if (!couple_id || !item_id || !emoji) return res.status(400).json({ success: false, error: 'couple_id, item_id, emoji required' });
    // Toggle: if same actor+item+emoji exists, remove it
    const { data: existing } = await supabase
      .from('circle_reactions')
      .select('id')
      .eq('couple_id', couple_id)
      .eq('item_id', item_id)
      .eq('emoji', emoji)
      .eq('actor_name', actor_name || 'You')
      .maybeSingle();
    if (existing) {
      await supabase.from('circle_reactions').delete().eq('id', existing.id);
      return res.json({ success: true, action: 'removed' });
    }
    const { data, error } = await supabase
      .from('circle_reactions')
      .insert([{ couple_id, item_id, emoji, actor_name: actor_name || 'You' }])
      .select().single();
    if (error) throw error;
    res.json({ success: true, action: 'added', data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Circle Messages ────────────────────────────────────────────────────────────

app.get('/api/circle/messages/:coupleId', async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { data, error } = await supabase
      .from('circle_messages')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/circle/messages', async (req, res) => {
  try {
    const { couple_id, sender_user_id, sender_name, sender_role, content } = req.body;
    if (!couple_id || !content?.trim()) return res.status(400).json({ success: false, error: 'couple_id and content required' });
    const { data, error } = await supabase
      .from('circle_messages')
      .insert([{ couple_id, sender_user_id: sender_user_id || null, sender_name: sender_name || 'Someone', sender_role: sender_role || 'inner_circle', content: content.trim() }])
      .select().single();
    if (error) throw error;
    // Broadcast to circle room
    io.to(`circle_${couple_id}`).emit('circle_message', data);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Enquiry Notification System ──"""

assert content.count(old_anchor) == 1, f'ABORT anchor: {content.count(old_anchor)}'
content = content.replace(old_anchor, new_endpoints, 1)

with open(path, 'w') as f:
    f.write(content)

print("Done ✅ — circle reactions + messages endpoints added, socket room wired")
