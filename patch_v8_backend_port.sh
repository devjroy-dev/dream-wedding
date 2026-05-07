#!/bin/bash
# patch_v8_backend_port.sh
# Ports all missing V8 backend endpoints into tdw-2/backend/server.js
# Source: dream-wedding repo commit dd8a0ac + plan tab endpoints
# Endpoints added:
#   GET  /api/v2/couple/tasks/:userId
#   GET  /api/v2/couple/events/:userId
#   GET  /api/circle/messages/:userId
#   GET  /api/v2/dreamai/couple-context/:userId
#   GET  /api/v2/couple/money/:userId
#   GET  /api/v2/couple/profile/:userId
#   GET  /api/v2/couple/tokens/:userId
#   GET  /api/v2/couple/guests/:userId
#   DELETE /api/v2/couple/guests/:guestId
#   GET  /api/couple/budget-categories/:userId
#   POST /api/couple/budget-categories/:userId
#   POST /api/couple/checklist/seed/:userId
# Run from: /workspaces/tdw-2

set -e
FILE="backend/server.js"

echo "=== SAFETY CHECKS ==="
if [ ! -f "$FILE" ]; then echo "ERROR: $FILE not found."; exit 1; fi
EXPRESS_COUNT=$(grep -c "const express" "$FILE" || true)
echo "express count: $EXPRESS_COUNT (expected 1)"
if [ "$EXPRESS_COUNT" -ne 1 ]; then echo "ERROR: express count wrong. Aborting."; exit 1; fi
if grep -q "api/v2/couple/tasks" "$FILE"; then echo "ERROR: tasks endpoint already exists."; exit 1; fi
if grep -q "api/v2/couple/money" "$FILE"; then echo "ERROR: money endpoint already exists."; exit 1; fi
echo "Checks passed."

python3 << 'PYEOF'
content = open('backend/server.js', 'r').read()

marker = '// ==================\n// PUSH NOTIFICATIONS'
if marker not in content:
    print("ERROR: Marker not found.")
    exit(1)

endpoints = '''
// ══════════════════════════════════════════════════════════════════════════════
// V8 PLAN TAB + DREAMAI ENDPOINTS
// Ported from dream-wedding commit dd8a0ac
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/v2/couple/tasks/:userId
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
    const tasks = (data || []).map(t => ({ ...t, title: t.text, status: t.is_complete ? 'done' : 'pending', event_name: t.event }));
    res.json(tasks);
  } catch (error) {
    console.error('[GET /api/v2/couple/tasks] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v2/couple/events/:userId
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

// GET /api/circle/messages/:userId
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

// GET /api/v2/dreamai/couple-context/:userId
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

// GET /api/v2/couple/money/:userId
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
    const mapExpense = e => ({ id: e.id, vendor_name: e.vendor_name || null, description: e.description || e.purpose || null, actual_amount: e.actual_amount || 0, due_date: e.due_date || null, payment_status: e.payment_status || 'committed', event: e.event || e.event_name || null });
    res.json({ totalBudget, committed, paid, events: events.map(e => ({ id: e.id, name: e.event_name || e.event_type || '', budget: e.budget_total || 0 })), thisWeek: unpaid.filter(e => new Date(e.due_date) <= in7).map(mapExpense), next30: unpaid.filter(e => new Date(e.due_date) <= in30).map(mapExpense) });
  } catch (error) {
    console.error('[GET /api/v2/couple/money] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v2/couple/profile/:userId
app.get('/api/v2/couple/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
    const { data, error } = await supabase.from('users').select('id, name, partner_name, wedding_date, couple_tier, wedding_events, phone, residence_country, wedding_country, photo_url, guest_count, discovery_categories, discovery_city, token_balance, founding_bride').eq('id', userId).single();
    if (error) throw error;
    res.json({ success: true, couple: data });
  } catch (error) {
    console.error('[GET /api/v2/couple/profile] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v2/couple/tokens/:userId
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

// GET /api/v2/couple/guests/:userId
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

// DELETE /api/v2/couple/guests/:guestId
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

// GET /api/couple/budget-categories/:userId
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

// POST /api/couple/budget-categories/:userId
app.post('/api/couple/budget-categories/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { categories } = req.body || {};
    if (!userId || !Array.isArray(categories)) return res.status(400).json({ success: false, error: 'userId and categories array required' });
    await supabase.from('couple_budget_categories').delete().eq('couple_id', userId);
    if (categories.length > 0) {
      const rows = categories.map(c => ({ couple_id: userId, category_key: c.category_key || c.key || '', label: c.label || c.category_key || '', allocated_amount: c.allocated_amount || 0, pct: c.pct || 0 }));
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

// POST /api/couple/checklist/seed/:userId
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

'''

patched = content.replace(marker, endpoints + marker, 1)
open('backend/server.js', 'w').write(patched)
print("All endpoints patched.")
PYEOF

echo ""
echo "=== VERIFICATION ==="
echo "Checking all endpoints present:"
grep -n "api/v2/couple/tasks\|api/v2/couple/events\|api/circle/messages\|api/v2/dreamai/couple-context\|api/v2/couple/money\|api/v2/couple/profile\|api/v2/couple/tokens\|api/v2/couple/guests\|api/couple/budget-categories\|api/couple/checklist/seed" "$FILE" | grep "app\."
echo ""
echo "express count (must still be 1):"
grep -c "const express" "$FILE"
echo ""
echo "=== DONE ==="
echo "Run:"
echo "  git add backend/server.js"
echo "  git commit -m 'feat: port all V8 backend endpoints — tasks, events, money, profile, guests, dreamai context, seed'"
echo "  git push"
