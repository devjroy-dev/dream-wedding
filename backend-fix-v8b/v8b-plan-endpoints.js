// ══════════════════════════════════════════════════════════════════════════════
// V8 BACKEND FIX 2 — Five missing Plan tab endpoints
// Add to backend/server.js in dream-wedding repo.
// Append before app.listen() call.
// No headers. No requires. Route handlers only.
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/v2/couple/money/:userId
//    Returns budget summary in shape plan.tsx MoneyTab expects:
//    { totalBudget, committed, paid, events[], thisWeek[], next30[] }
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
    const thisWeek = unpaid.filter(e => new Date(e.due_date) <= in7);
    const next30 = unpaid.filter(e => new Date(e.due_date) <= in30);

    const mapExpense = e => ({
      id: e.id,
      vendor_name: e.vendor_name || null,
      description: e.description || e.purpose || null,
      actual_amount: e.actual_amount || 0,
      due_date: e.due_date || null,
      payment_status: e.payment_status || 'committed',
      event: e.event || e.event_name || null,
    });

    res.json({
      totalBudget,
      committed,
      paid,
      events: events.map(e => ({
        id: e.id,
        name: e.event_name || e.event_type || '',
        budget: e.budget_total || 0,
      })),
      thisWeek: thisWeek.map(mapExpense),
      next30: next30.map(mapExpense),
    });
  } catch (error) {
    console.error('[GET /api/v2/couple/money] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /api/v2/couple/profile/:userId
//    Returns { couple: { ...user fields } }
//    Reads from users table. Includes couple_tier — never dreamer_type.
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
//    Returns { balance, remaining } from users.token_balance
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/v2/couple/tokens/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    const { data, error } = await supabase
      .from('users')
      .select('token_balance')
      .eq('id', userId)
      .single();

    if (error) throw error;

    res.json({ success: true, balance: data?.token_balance ?? 0, remaining: data?.token_balance ?? 0 });
  } catch (error) {
    console.error('[GET /api/v2/couple/tokens] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET /api/v2/couple/guests/:userId
//    Returns array of guests directly (plan.tsx expects Array.isArray(d))
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/v2/couple/guests/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    const { data, error } = await supabase
      .from('couple_guests')
      .select('*')
      .eq('couple_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // plan.tsx expects raw array: Array.isArray(d) check
    res.json(data || []);
  } catch (error) {
    console.error('[GET /api/v2/couple/guests] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. DELETE /api/v2/couple/guests/:guestId
//    Deletes a guest by id
// ─────────────────────────────────────────────────────────────────────────────
app.delete('/api/v2/couple/guests/:guestId', async (req, res) => {
  try {
    const { guestId } = req.params;
    if (!guestId) return res.status(400).json({ success: false, error: 'guestId required' });

    // Clear household references first
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
//    Returns saved budget category allocations for the couple
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/couple/budget-categories/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    const { data, error } = await supabase
      .from('couple_budget_categories')
      .select('*')
      .eq('couple_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[GET /api/couple/budget-categories] error:', error.message);
    // Return empty gracefully — table may not exist yet
    res.json({ success: true, data: [] });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. POST /api/couple/budget-categories/:userId
//    Upserts budget category allocations for the couple
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/couple/budget-categories/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { categories } = req.body || {};
    if (!userId || !Array.isArray(categories)) {
      return res.status(400).json({ success: false, error: 'userId and categories array required' });
    }

    // Delete existing and reinsert — clean slate upsert
    await supabase.from('couple_budget_categories').delete().eq('couple_id', userId);

    if (categories.length > 0) {
      const rows = categories.map(c => ({
        couple_id: userId,
        category_key: c.category_key || c.key || '',
        label: c.label || c.category_key || '',
        allocated_amount: c.allocated_amount || 0,
        pct: c.pct || 0,
      }));
      const { data, error } = await supabase.from('couple_budget_categories').insert(rows).select();
      if (error) throw error;
      return res.json({ success: true, data: data || [] });
    }

    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('[POST /api/couple/budget-categories] error:', error.message);
    // Graceful — table may not exist
    res.json({ success: true, data: [] });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. POST /api/couple/checklist/seed/:userId
//    Seeds default checklist tasks for a new couple if none exist.
//    Called by plan.tsx on first load when task list is empty.
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_CHECKLIST_TASKS = [
  { event: 'general', text: 'Set your total wedding budget', priority: 'high' },
  { event: 'general', text: 'Choose wedding date', priority: 'high' },
  { event: 'general', text: 'Create guest list (draft)', priority: 'high' },
  { event: 'general', text: 'Book wedding venue', priority: 'high', due_date_offset_days: 60 },
  { event: 'general', text: 'Shortlist and book MUA', priority: 'high', due_date_offset_days: 30 },
  { event: 'general', text: 'Book photographer', priority: 'high', due_date_offset_days: 45 },
  { event: 'general', text: 'Book videographer', priority: 'high' },
  { event: 'general', text: 'Finalise bridal lehenga', priority: 'high' },
  { event: 'general', text: 'Design and order wedding invitations', priority: 'high' },
  { event: 'general', text: 'Send save-the-dates (outstation guests)', priority: 'normal' },
  { event: 'general', text: 'Send wedding invitations', priority: 'high' },
  { event: 'general', text: 'Order bridal jewellery', priority: 'high' },
  { event: 'general', text: 'Book honeymoon', priority: 'normal' },
  { event: 'general', text: 'Groom — finalise sherwani / suit', priority: 'normal' },
  { event: 'general', text: 'Confirm all vendor payment schedules', priority: 'high' },
  { event: 'general', text: 'Collect RSVPs and share final count', priority: 'high' },
  { event: 'general', text: 'Bridal lehenga final fitting', priority: 'high' },
  { event: 'general', text: 'Confirm all vendors — final call / WhatsApp', priority: 'high' },
  { event: 'general', text: 'Pay all final vendor balances', priority: 'high' },
  { event: 'general', text: 'Write reviews for your vendors on TDW', priority: 'normal' },
  { event: 'general', text: 'Start honeymoon!', priority: 'normal' },
  { event: 'mehendi', text: 'Book mehendi artist', priority: 'high' },
  { event: 'sangeet', text: 'Book DJ or live music for sangeet', priority: 'normal' },
  { event: 'sangeet', text: 'Plan sangeet performances and rehearsal schedule', priority: 'normal' },
  { event: 'reception', text: 'Shortlist and book decorator', priority: 'high' },
  { event: 'reception', text: 'Shortlist and book caterer', priority: 'normal' },
  { event: 'wedding', text: 'Book ceremony venue', priority: 'high' },
  { event: 'wedding', text: 'Shortlist and book pandit / officiant', priority: 'high' },
  { event: 'wedding', text: 'Confirm pandit — discuss rituals and timings', priority: 'high' },
  { event: 'wedding', text: 'Wedding day — confirm call time with MUA', priority: 'high' },
  { event: 'wedding', text: 'Wedding day — confirm call time with photographer', priority: 'high' },
];

app.post('/api/couple/checklist/seed/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    // Check if already seeded — do not duplicate
    const { data: existing } = await supabase
      .from('couple_checklist')
      .select('id')
      .eq('couple_id', userId)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.json({ success: true, seeded: false, message: 'Already seeded' });
    }

    const now = new Date();
    const rows = DEFAULT_CHECKLIST_TASKS.map(t => ({
      couple_id: userId,
      event: t.event,
      text: t.text,
      priority: t.priority,
      is_custom: false,
      seeded_from_template: true,
      due_date: t.due_date_offset_days
        ? new Date(now.getTime() + t.due_date_offset_days * 86400000).toISOString().split('T')[0]
        : null,
    }));

    const { data, error } = await supabase
      .from('couple_checklist')
      .insert(rows)
      .select();

    if (error) throw error;

    // Mark user as seeded
    await supabase.from('users').update({ checklist_seeded: true }).eq('id', userId).catch(() => {});

    res.json({ success: true, seeded: true, count: (data || []).length });
  } catch (error) {
    console.error('[POST /api/couple/checklist/seed] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});
