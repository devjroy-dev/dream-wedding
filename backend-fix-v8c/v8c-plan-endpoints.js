// ══════════════════════════════════════════════════════════════════════════════
// V8 BACKEND FIX 2 — Plan tab endpoints
// Append to backend/server.js in dream-wedding repo before app.listen().
// No headers. No requires. No top-level const declarations.
// Route handlers only.
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/v2/couple/money/:userId
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/v2/couple/money/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    const [budgetRes, expensesRes, eventsRes] = await Promise.allSettled([
      supabase.from('couple_budget').select('total_budget').eq('couple_id', userId).maybeSingle(),
      supabase.from('couple_expenses').select('*').eq('couple_id', userId).order('due_date', { ascending: true }),
      supabase.from('couple_events').select('id, event_name, event_type, budget_total').eq('couple_id', userId).eq('is_active', true),
    ]);

    const budget = budgetRes.status === 'fulfilled' ? budgetRes.value.data : null;
    const expenses = expensesRes.status === 'fulfilled' ? (expensesRes.value.data || []) : [];
    const events = eventsRes.status === 'fulfilled' ? (eventsRes.value.data || []) : [];

    const totalBudget = budget?.total_budget || 0;
    const committed = expenses.filter(e => e.payment_status !== 'paid').reduce((s, e) => s + (e.actual_amount || 0), 0);
    const paid = expenses.filter(e => e.payment_status === 'paid').reduce((s, e) => s + (e.actual_amount || 0), 0);

    const now = new Date();
    const in7 = new Date(now); in7.setDate(in7.getDate() + 7);
    const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
    const unpaid = expenses.filter(e => e.payment_status !== 'paid' && e.due_date);

    const mapExp = e => ({ id: e.id, vendor_name: e.vendor_name || null, description: e.description || e.purpose || null, actual_amount: e.actual_amount || 0, due_date: e.due_date || null, payment_status: e.payment_status || 'committed', event: e.event || e.event_name || null });

    res.json({
      totalBudget,
      committed,
      paid,
      events: events.map(e => ({ id: e.id, name: e.event_name || e.event_type || '', budget: e.budget_total || 0 })),
      thisWeek: unpaid.filter(e => new Date(e.due_date) <= in7).map(mapExp),
      next30: unpaid.filter(e => new Date(e.due_date) <= in30).map(mapExp),
    });
  } catch (error) {
    console.error('[GET /api/v2/couple/money] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /api/v2/couple/profile/:userId
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/v2/couple/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    const { data, error } = await supabase
      .from('users')
      .select('id, name, partner_name, wedding_date, couple_tier, wedding_events, phone, residence_country, wedding_country, photo_url, guest_count, discovery_categories, discovery_city, token_balance, founding_bride')
      .eq('id', userId)
      .single();

    if (error) throw error;
    res.json({ success: true, couple: data });
  } catch (error) {
    console.error('[GET /api/v2/couple/profile] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET /api/v2/couple/tokens/:userId
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/v2/couple/tokens/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    const { data, error } = await supabase.from('users').select('token_balance').eq('id', userId).single();
    if (error) throw error;
    res.json({ success: true, balance: data?.token_balance ?? 0, remaining: data?.token_balance ?? 0 });
  } catch (error) {
    console.error('[GET /api/v2/couple/tokens] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET /api/v2/couple/guests/:userId
//    Returns raw array — plan.tsx expects Array.isArray(d)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/v2/couple/guests/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    const { data, error } = await supabase.from('couple_guests').select('*').eq('couple_id', userId).order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('[GET /api/v2/couple/guests] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. DELETE /api/v2/couple/guests/:guestId
// ─────────────────────────────────────────────────────────────────────────────
app.delete('/api/v2/couple/guests/:guestId', async (req, res) => {
  try {
    const { guestId } = req.params;
    if (!guestId) return res.status(400).json({ success: false, error: 'guestId required' });
    await supabase.from('couple_guests').update({ household_head_id: null }).eq('household_head_id', guestId);
    const { error } = await supabase.from('couple_guests').delete().eq('id', guestId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/v2/couple/guests] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. GET /api/couple/budget-categories/:userId
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/couple/budget-categories/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    const { data, error } = await supabase.from('couple_budget_categories').select('*').eq('couple_id', userId).order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[GET /api/couple/budget-categories] error:', error.message);
    res.json({ success: true, data: [] });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. POST /api/couple/budget-categories/:userId
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/couple/budget-categories/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { categories } = req.body || {};
    if (!userId || !Array.isArray(categories)) return res.status(400).json({ success: false, error: 'userId and categories array required' });

    await supabase.from('couple_budget_categories').delete().eq('couple_id', userId);
    if (categories.length > 0) {
      const rows = categories.map(c => ({ couple_id: userId, category_key: c.category_key || c.key || '', display_name: c.display_name || c.label || c.category_key || '', allocated_amount: c.allocated_amount || 0, pct: c.pct || 0 }));
      const { data, error } = await supabase.from('couple_budget_categories').insert(rows).select();
      if (error) throw error;
      return res.json({ success: true, data: data || [] });
    }
    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('[POST /api/couple/budget-categories] error:', error.message);
    res.json({ success: true, data: [] });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. POST /api/couple/checklist/seed/:userId
//    Seeds default tasks for new couple. Inlined — no top-level const.
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/couple/checklist/seed/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    const { data: existing } = await supabase.from('couple_checklist').select('id').eq('couple_id', userId).limit(1);
    if (existing && existing.length > 0) return res.json({ success: true, seeded: false, message: 'Already seeded' });

    const now = new Date();
    const addDays = (d) => new Date(now.getTime() + d * 86400000).toISOString().split('T')[0];

    const rows = [
      { event: 'general', text: 'Set your total wedding budget', priority: 'high', due_date: null },
      { event: 'general', text: 'Choose wedding date', priority: 'high', due_date: null },
      { event: 'general', text: 'Create guest list (draft)', priority: 'high', due_date: null },
      { event: 'general', text: 'Book wedding venue', priority: 'high', due_date: addDays(60) },
      { event: 'general', text: 'Shortlist and book MUA', priority: 'high', due_date: addDays(30) },
      { event: 'general', text: 'Book photographer', priority: 'high', due_date: addDays(45) },
      { event: 'general', text: 'Book videographer', priority: 'high', due_date: null },
      { event: 'general', text: 'Finalise bridal lehenga', priority: 'high', due_date: null },
      { event: 'general', text: 'Design and order wedding invitations', priority: 'high', due_date: null },
      { event: 'general', text: 'Send save-the-dates (outstation guests)', priority: 'normal', due_date: null },
      { event: 'general', text: 'Send wedding invitations', priority: 'high', due_date: null },
      { event: 'general', text: 'Order bridal jewellery', priority: 'high', due_date: null },
      { event: 'general', text: 'Book honeymoon', priority: 'normal', due_date: null },
      { event: 'general', text: 'Groom — finalise sherwani / suit', priority: 'normal', due_date: null },
      { event: 'general', text: 'Confirm all vendor payment schedules', priority: 'high', due_date: null },
      { event: 'general', text: 'Collect RSVPs and share final count', priority: 'high', due_date: null },
      { event: 'general', text: 'Bridal lehenga final fitting', priority: 'high', due_date: null },
      { event: 'general', text: 'Confirm all vendors — final call / WhatsApp', priority: 'high', due_date: null },
      { event: 'general', text: 'Pay all final vendor balances', priority: 'high', due_date: null },
      { event: 'general', text: 'Write reviews for your vendors on TDW', priority: 'normal', due_date: null },
      { event: 'general', text: 'Start honeymoon!', priority: 'normal', due_date: null },
      { event: 'mehendi', text: 'Book mehendi artist', priority: 'high', due_date: null },
      { event: 'sangeet', text: 'Book DJ or live music for sangeet', priority: 'normal', due_date: null },
      { event: 'sangeet', text: 'Plan sangeet performances and rehearsal schedule', priority: 'normal', due_date: null },
      { event: 'reception', text: 'Shortlist and book decorator', priority: 'high', due_date: null },
      { event: 'reception', text: 'Shortlist and book caterer', priority: 'normal', due_date: null },
      { event: 'wedding', text: 'Book ceremony venue', priority: 'high', due_date: null },
      { event: 'wedding', text: 'Shortlist and book pandit / officiant', priority: 'high', due_date: null },
      { event: 'wedding', text: 'Confirm pandit — discuss rituals and timings', priority: 'high', due_date: null },
      { event: 'wedding', text: 'Wedding day — confirm call time with MUA', priority: 'high', due_date: null },
      { event: 'wedding', text: 'Wedding day — confirm call time with photographer', priority: 'high', due_date: null },
    ].map(t => ({ couple_id: userId, event: t.event, text: t.text, priority: t.priority, due_date: t.due_date, is_custom: false, seeded_from_template: true }));

    const { data, error } = await supabase.from('couple_checklist').insert(rows).select();
    if (error) throw error;

    await supabase.from('users').update({ checklist_seeded: true }).eq('id', userId).catch(() => {});
    res.json({ success: true, seeded: true, count: (data || []).length });
  } catch (error) {
    console.error('[POST /api/couple/checklist/seed] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});
