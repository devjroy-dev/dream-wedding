// ══════════════════════════════════════════════════════════════════════════════
// V8 ENDPOINT INJECTION — four route handlers only
// INSERT these blocks into backend/server.js in the dream-wedding repo.
// INSERT POINT: paste immediately before the final app.listen() call.
// No headers. No requires. No middleware. Route handlers only.
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/v2/couple/tasks/:userId
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/v2/couple/tasks/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
    const { data, error } = await supabase
      .from('couple_checklist')
      .select('id, couple_id, text, due_date, event, priority, is_complete, completed_at, notes, created_at')
      .eq('couple_id', userId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const tasks = (data || []).map(t => ({ ...t, status: t.is_complete ? 'done' : 'pending' }));
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('[GET /api/v2/couple/tasks] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /api/v2/couple/events/:userId
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/v2/couple/events/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
    const { data: events, error: evErr } = await supabase
      .from('couple_events')
      .select('*')
      .eq('couple_id', userId)
      .order('sort_order')
      .order('event_date');
    if (evErr) throw evErr;
    if (!events || events.length === 0) return res.json({ success: true, data: [] });
    const seen = new Set();
    const deduped = events.filter(e => {
      const key = (e.event_name || e.event_type || '').toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    const eventIds = deduped.map(e => e.id);
    const { data: budgets } = await supabase.from('couple_event_category_budgets').select('*').in('event_id', eventIds);
    const budgetsMap = {};
    (budgets || []).forEach(b => { if (!budgetsMap[b.event_id]) budgetsMap[b.event_id] = []; budgetsMap[b.event_id].push(b); });
    const { data: tasks } = await supabase.from('couple_checklist').select('event').eq('couple_id', userId).eq('is_complete', false);
    const taskCountMap = {};
    (tasks || []).forEach(t => { const k = (t.event || '').toLowerCase().trim(); taskCountMap[k] = (taskCountMap[k] || 0) + 1; });
    const { data: vendors } = await supabase.from('couple_vendors').select('events').eq('couple_id', userId);
    const vendorCountMap = {};
    (vendors || []).forEach(v => { (v.events || []).forEach(n => { const k = (n || '').toLowerCase().trim(); vendorCountMap[k] = (vendorCountMap[k] || 0) + 1; }); });
    const { data: guests } = await supabase.from('couple_guests').select('id').eq('couple_id', userId);
    const totalGuestCount = (guests || []).length;
    const enriched = deduped.map(e => {
      const nameKey = (e.event_name || e.event_type || '').toLowerCase().trim();
      return { ...e, category_budgets: budgetsMap[e.id] || [], task_count: taskCountMap[nameKey] || 0, vendor_count: vendorCountMap[nameKey] || 0, guest_count: totalGuestCount };
    });
    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('[GET /api/v2/couple/events] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET /api/circle/messages/:userId
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/circle/messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
    let members = [];
    try {
      const { data } = await supabase.from('co_planners').select('id, name, phone, role, status, created_at, co_planner_user_id').eq('primary_user_id', userId).eq('status', 'active');
      members = data || [];
    } catch {}
    let recentActivity = [];
    try {
      const { data } = await supabase.from('couple_checklist').select('id, text, event, completed_at, is_complete').eq('couple_id', userId).eq('is_complete', true).order('completed_at', { ascending: false }).limit(10);
      recentActivity = (data || []).map(t => ({ id: t.id, type: 'task_completed', text: `Task completed: ${t.text}`, event: t.event || null, at: t.completed_at || null, from: 'couple' }));
    } catch {}
    res.json({ success: true, data: { members, messages: [], recent_activity: recentActivity } });
  } catch (error) {
    console.error('[GET /api/circle/messages] error:', error.message);
    res.json({ success: true, data: { members: [], messages: [], recent_activity: [] } });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET /api/v2/dreamai/couple-context/:userId
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/v2/dreamai/couple-context/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
    const [userR, tasksR, vendorsR, guestsR, eventsR, budgetR, expensesR, tokensR] = await Promise.allSettled([
      supabase.from('users').select('id, name, partner_name, wedding_date, couple_tier, wedding_events, phone, residence_country, wedding_country').eq('id', userId).single(),
      supabase.from('couple_checklist').select('id, text, event, priority, is_complete, due_date, notes').eq('couple_id', userId).order('due_date', { ascending: true }),
      supabase.from('couple_vendors').select('id, name, category, status, quoted_total, events, notes, balance_due_date').eq('couple_id', userId).order('created_at', { ascending: false }),
      supabase.from('couple_guests').select('id, name, rsvp_status, household, side, events').eq('couple_id', userId),
      supabase.from('couple_events').select('id, event_name, event_type, event_date, event_city, budget_total, is_active').eq('couple_id', userId).order('event_date'),
      supabase.from('couple_budget').select('total_budget, event_envelopes').eq('couple_id', userId).maybeSingle(),
      supabase.from('couple_expenses').select('id, category, description, amount, is_paid, due_date, vendor_name').eq('couple_id', userId).order('due_date', { ascending: true }).limit(50),
      supabase.from('users').select('token_balance').eq('id', userId).single(),
    ]);
    const user = userR.status === 'fulfilled' ? userR.value.data : null;
    const tasks = tasksR.status === 'fulfilled' ? (tasksR.value.data || []) : [];
    const vendors = vendorsR.status === 'fulfilled' ? (vendorsR.value.data || []) : [];
    const guests = guestsR.status === 'fulfilled' ? (guestsR.value.data || []) : [];
    const events = eventsR.status === 'fulfilled' ? (eventsR.value.data || []) : [];
    const budget = budgetR.status === 'fulfilled' ? budgetR.value.data : null;
    const expenses = expensesR.status === 'fulfilled' ? (expensesR.value.data || []) : [];
    const tokenBalance = tokensR.status === 'fulfilled' ? (tokensR.value.data?.token_balance ?? null) : null;
    const pendingTasks = tasks.filter(t => !t.is_complete);
    const bookedVendors = vendors.filter(v => v.status === 'booked' || v.status === 'confirmed');
    const confirmedGuests = guests.filter(g => g.rsvp_status === 'confirmed');
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const paidExpenses = expenses.filter(e => e.is_paid).reduce((s, e) => s + (e.amount || 0), 0);
    const upcomingPayments = expenses.filter(e => !e.is_paid && e.due_date).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).slice(0, 5);
    let daysUntilWedding = null;
    if (user?.wedding_date) {
      const now = new Date(); now.setHours(0,0,0,0);
      const wd = new Date(user.wedding_date); wd.setHours(0,0,0,0);
      daysUntilWedding = Math.round((wd.getTime() - now.getTime()) / 86400000);
    }
    res.json({ success: true, data: {
      couple: { id: userId, name: user?.name||null, partner_name: user?.partner_name||null, wedding_date: user?.wedding_date||null, days_until_wedding: daysUntilWedding, tier: user?.couple_tier||'lite', token_balance: tokenBalance, wedding_events: user?.wedding_events||[], city: user?.residence_country||null, wedding_city: user?.wedding_country||null },
      tasks: { total: tasks.length, pending: pendingTasks.length, completed: tasks.length - pendingTasks.length, pending_list: pendingTasks.slice(0,20).map(t => ({ id:t.id, text:t.text, event:t.event, priority:t.priority, due_date:t.due_date, notes:t.notes })) },
      vendors: { total: vendors.length, booked: bookedVendors.length, pending: vendors.filter(v=>v.status==='enquired'||v.status==='negotiating').length, list: vendors.slice(0,20).map(v => ({ id:v.id, name:v.name, category:v.category, status:v.status, quoted_total:v.quoted_total, events:v.events, balance_due_date:v.balance_due_date, notes:v.notes })) },
      guests: { total: guests.length, confirmed: confirmedGuests.length, pending: guests.filter(g=>!g.rsvp_status||g.rsvp_status==='pending').length, declined: guests.filter(g=>g.rsvp_status==='declined').length },
      events: events.map(e => ({ id:e.id, name:e.event_name||e.event_type, date:e.event_date, city:e.event_city, budget_total:e.budget_total, is_active:e.is_active })),
      budget: { total: budget?.total_budget||0, committed: totalExpenses, paid: paidExpenses, remaining: (budget?.total_budget||0) - totalExpenses, event_envelopes: budget?.event_envelopes||{} },
      upcoming_payments: upcomingPayments.map(e => ({ id:e.id, vendor_name:e.vendor_name, category:e.category, amount:e.amount, due_date:e.due_date, description:e.description })),
    }});
  } catch (error) {
    console.error('[GET /api/v2/dreamai/couple-context] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});
