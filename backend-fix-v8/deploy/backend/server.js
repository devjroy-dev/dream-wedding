// ══════════════════════════════════════════════════════════════════════════════
// V8 BACKEND FIX — Four missing endpoints
// Add these four blocks to backend/server.js in the dream-wedding repo.
// Insert them together, near the other /api/v2/couple/* endpoints.
// Deploy to Railway before triggering EAS build.
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/v2/couple/tasks/:userId
//    Returns couple checklist tasks from couple_checklist table.
//    Derives status from is_complete — never reads a status column.
//    Safe fields only: id, couple_id, text, due_date, event, priority,
//                      is_complete, completed_at, notes, created_at
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

    // Derive status from is_complete — never read a status column
    const tasks = (data || []).map(t => ({
      ...t,
      status: t.is_complete ? 'done' : 'pending',
    }));

    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('[GET /api/v2/couple/tasks] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /api/v2/couple/events/:userId
//    Returns couple events from couple_events table.
//    Deduped by event_name. Includes category_budgets joined from
//    couple_event_category_budgets.
//    Also computes task_count, vendor_count, guest_count per event.
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

    if (!events || events.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Dedup by event_name — keep first occurrence
    const seen = new Set();
    const deduped = events.filter(e => {
      const key = (e.event_name || e.event_type || '').toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const eventIds = deduped.map(e => e.id);

    // Fetch category budgets
    const { data: budgets } = await supabase
      .from('couple_event_category_budgets')
      .select('*')
      .in('event_id', eventIds);

    const budgetsMap = {};
    (budgets || []).forEach(b => {
      if (!budgetsMap[b.event_id]) budgetsMap[b.event_id] = [];
      budgetsMap[b.event_id].push(b);
    });

    // Fetch task counts per event
    const { data: tasks } = await supabase
      .from('couple_checklist')
      .select('event')
      .eq('couple_id', userId)
      .eq('is_complete', false);

    const taskCountMap = {};
    (tasks || []).forEach(t => {
      const key = (t.event || '').toLowerCase().trim();
      taskCountMap[key] = (taskCountMap[key] || 0) + 1;
    });

    // Fetch vendor counts per event
    const { data: vendors } = await supabase
      .from('couple_vendors')
      .select('events')
      .eq('couple_id', userId);

    const vendorCountMap = {};
    (vendors || []).forEach(v => {
      (v.events || []).forEach(evName => {
        const key = (evName || '').toLowerCase().trim();
        vendorCountMap[key] = (vendorCountMap[key] || 0) + 1;
      });
    });

    // Fetch guest count total (shared across events — attach to each)
    const { data: guestData } = await supabase
      .from('couple_guests')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', userId);

    const totalGuestCount = guestData?.length ?? 0;

    const enriched = deduped.map(e => {
      const nameKey = (e.event_name || e.event_type || '').toLowerCase().trim();
      return {
        ...e,
        category_budgets: budgetsMap[e.id] || [],
        task_count: taskCountMap[nameKey] || 0,
        vendor_count: vendorCountMap[nameKey] || 0,
        guest_count: totalGuestCount,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('[GET /api/v2/couple/events] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET /api/circle/messages/:userId
//    Returns Circle family co-planning activity for the couple.
//    Reads from co_planners table (members) and vendor_enquiry_messages
//    for recent activity. If no data exists, returns empty array — never 500.
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/circle/messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    // Fetch circle members (co_planners) for this couple
    let members = [];
    try {
      const { data: coplanners } = await supabase
        .from('co_planners')
        .select('id, name, phone, role, status, created_at, co_planner_user_id')
        .eq('primary_user_id', userId)
        .eq('status', 'active');
      members = coplanners || [];
    } catch {}

    // Fetch recent activity from couple_checklist (tasks completed recently)
    let recentActivity = [];
    try {
      const { data: recentTasks } = await supabase
        .from('couple_checklist')
        .select('id, text, event, completed_at, is_complete')
        .eq('couple_id', userId)
        .eq('is_complete', true)
        .order('completed_at', { ascending: false })
        .limit(10);

      recentActivity = (recentTasks || []).map(t => ({
        id: t.id,
        type: 'task_completed',
        text: `Task completed: ${t.text}`,
        event: t.event || null,
        at: t.completed_at || null,
        from: 'couple',
      }));
    } catch {}

    res.json({
      success: true,
      data: {
        members,
        messages: [],        // circle_messages table not yet created — return empty
        recent_activity: recentActivity,
      },
    });
  } catch (error) {
    console.error('[GET /api/circle/messages] error:', error.message);
    // Never 500 for circle — return empty gracefully
    res.json({ success: true, data: { members: [], messages: [], recent_activity: [] } });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET /api/v2/dreamai/couple-context/:userId
//    Returns full couple context for DreamAi — read before every AI response.
//    Pulls from: users, couple_checklist, couple_vendors, couple_guests,
//                couple_events, couple_budget, couple_expenses
//    The richer this context, the smarter DreamAi is.
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/v2/dreamai/couple-context/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    // Run all queries in parallel for speed
    const [
      userResult,
      tasksResult,
      vendorsResult,
      guestsResult,
      eventsResult,
      budgetResult,
      expensesResult,
      tokensResult,
    ] = await Promise.allSettled([
      supabase.from('users')
        .select('id, name, partner_name, wedding_date, couple_tier, wedding_events, phone, residence_country, wedding_country')
        .eq('id', userId)
        .single(),
      supabase.from('couple_checklist')
        .select('id, text, event, priority, is_complete, due_date, notes')
        .eq('couple_id', userId)
        .order('due_date', { ascending: true }),
      supabase.from('couple_vendors')
        .select('id, name, category, status, quoted_total, events, notes, balance_due_date')
        .eq('couple_id', userId)
        .order('created_at', { ascending: false }),
      supabase.from('couple_guests')
        .select('id, name, rsvp_status, household, side, events')
        .eq('couple_id', userId),
      supabase.from('couple_events')
        .select('id, event_name, event_type, event_date, event_city, budget_total, is_active')
        .eq('couple_id', userId)
        .order('event_date'),
      supabase.from('couple_budget')
        .select('total_budget, event_envelopes')
        .eq('couple_id', userId)
        .maybeSingle(),
      supabase.from('couple_expenses')
        .select('id, category, description, amount, is_paid, due_date, vendor_name')
        .eq('couple_id', userId)
        .order('due_date', { ascending: true })
        .limit(50),
      supabase.from('users')
        .select('token_balance')
        .eq('id', userId)
        .single(),
    ]);

    const user = userResult.status === 'fulfilled' ? userResult.value.data : null;
    const tasks = tasksResult.status === 'fulfilled' ? (tasksResult.value.data || []) : [];
    const vendors = vendorsResult.status === 'fulfilled' ? (vendorsResult.value.data || []) : [];
    const guests = guestsResult.status === 'fulfilled' ? (guestsResult.value.data || []) : [];
    const events = eventsResult.status === 'fulfilled' ? (eventsResult.value.data || []) : [];
    const budget = budgetResult.status === 'fulfilled' ? budgetResult.value.data : null;
    const expenses = expensesResult.status === 'fulfilled' ? (expensesResult.value.data || []) : [];
    const tokenBalance = tokensResult.status === 'fulfilled' ? (tokensResult.value.data?.token_balance ?? null) : null;

    // Compute summary stats for DreamAi
    const pendingTasks = tasks.filter(t => !t.is_complete);
    const completedTasks = tasks.filter(t => t.is_complete);
    const bookedVendors = vendors.filter(v => v.status === 'booked' || v.status === 'confirmed');
    const pendingVendors = vendors.filter(v => v.status === 'enquired' || v.status === 'negotiating');
    const confirmedGuests = guests.filter(g => g.rsvp_status === 'confirmed');
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const paidExpenses = expenses.filter(e => e.is_paid).reduce((sum, e) => sum + (e.amount || 0), 0);
    const upcomingPayments = expenses
      .filter(e => !e.is_paid && e.due_date)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 5);

    // Compute days until wedding
    let daysUntilWedding = null;
    if (user?.wedding_date) {
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const wd = new Date(user.wedding_date); wd.setHours(0, 0, 0, 0);
      daysUntilWedding = Math.round((wd.getTime() - now.getTime()) / 86400000);
    }

    const context = {
      // Identity
      couple: {
        id: userId,
        name: user?.name || null,
        partner_name: user?.partner_name || null,
        wedding_date: user?.wedding_date || null,
        days_until_wedding: daysUntilWedding,
        tier: user?.couple_tier || 'lite',
        token_balance: tokenBalance,
        wedding_events: user?.wedding_events || [],
        city: user?.residence_country || null,
        wedding_city: user?.wedding_country || null,
      },

      // Tasks
      tasks: {
        total: tasks.length,
        pending: pendingTasks.length,
        completed: completedTasks.length,
        pending_list: pendingTasks.slice(0, 20).map(t => ({
          id: t.id,
          text: t.text,
          event: t.event,
          priority: t.priority,
          due_date: t.due_date,
          notes: t.notes,
        })),
      },

      // Vendors
      vendors: {
        total: vendors.length,
        booked: bookedVendors.length,
        pending: pendingVendors.length,
        list: vendors.slice(0, 20).map(v => ({
          id: v.id,
          name: v.name,
          category: v.category,
          status: v.status,
          quoted_total: v.quoted_total,
          events: v.events,
          balance_due_date: v.balance_due_date,
          notes: v.notes,
        })),
      },

      // Guests
      guests: {
        total: guests.length,
        confirmed: confirmedGuests.length,
        pending: guests.filter(g => !g.rsvp_status || g.rsvp_status === 'pending').length,
        declined: guests.filter(g => g.rsvp_status === 'declined').length,
      },

      // Events
      events: events.map(e => ({
        id: e.id,
        name: e.event_name || e.event_type,
        date: e.event_date,
        city: e.event_city,
        budget_total: e.budget_total,
        is_active: e.is_active,
      })),

      // Budget
      budget: {
        total: budget?.total_budget || 0,
        committed: totalExpenses,
        paid: paidExpenses,
        remaining: (budget?.total_budget || 0) - totalExpenses,
        event_envelopes: budget?.event_envelopes || {},
      },

      // Upcoming payments
      upcoming_payments: upcomingPayments.map(e => ({
        id: e.id,
        vendor_name: e.vendor_name,
        category: e.category,
        amount: e.amount,
        due_date: e.due_date,
        description: e.description,
      })),
    };

    res.json({ success: true, data: context });
  } catch (error) {
    console.error('[GET /api/v2/dreamai/couple-context] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});
