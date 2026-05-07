#!/usr/bin/env node
/**
 * patch_today_endpoint.js
 * Replaces GET /api/v2/couple/today/:userId in dream-wedding/backend/server.js
 * with a rich-shape handler that queries correct tables and FK columns.
 *
 * Run from: /workspaces/dream-wedding
 * Command:  node patch_today_endpoint.js
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'backend', 'server.js');

// ── Safety checks ────────────────────────────────────────────────────────────

const src = fs.readFileSync(FILE, 'utf8');

// 1. Only one express instance
const expressCount = (src.match(/const express = require/g) || []).length;
if (expressCount !== 1) {
  console.error(`ABORT: expected 1 express require, found ${expressCount}`);
  process.exit(1);
}

// 2. Today endpoint exists exactly once
const endpointCount = (src.match(/app\.get\('\/api\/v2\/couple\/today\/:userId'/g) || []).length;
if (endpointCount !== 1) {
  console.error(`ABORT: expected 1 today endpoint, found ${endpointCount}`);
  process.exit(1);
}

// 3. New handler not already present
if (src.includes('// TDW_TODAY_V2')) {
  console.error('ABORT: patch already applied');
  process.exit(1);
}

// ── Old handler — exact string to replace ────────────────────────────────────

const OLD = `// GET /api/v2/couple/today/:userId
// Returns: { wedding_date, event_label, nudges[], thisWeek[], muse[], activity[] }
// ─────────────────────────────────────────────────────────────
app.get('/api/v2/couple/today/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    // 1. Wedding date from users table
    let wedding_date = null;
    let event_label = 'wedding';
    if (userId && userId !== 'demo') {
      const { data: userRow } = await supabase
        .from('users')
        .select('wedding_date, dreamer_type')
        .eq('id', userId)
        .single();
      if (userRow) {
        wedding_date = userRow.wedding_date || null;
        if (userRow.dreamer_type) event_label = userRow.dreamer_type;
      }
    }

    // 2. Nudges: pending tasks due within 30 days
    let nudges = [];
    const now = new Date();
    const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
    if (userId && userId !== 'demo') {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, description, due_date, vendor_id')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .lte('due_date', in30.toISOString())
        .gte('due_date', now.toISOString())
        .order('due_date', { ascending: true })
        .limit(3);
      nudges = (tasks || []).map(t => ({
        id: t.id,
        title: t.title,
        context: t.description || 'This needs your attention before your big day.',
        cta: 'Review',
        vendor_name: null,
      }));
    }

    // 3. This week: events/tasks Mon–Sun
    let thisWeek = [];
    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStart.setDate(weekStart.getDate() + diffToMon);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);
    const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (userId && userId !== 'demo') {
      const { data: weekTasks } = await supabase
        .from('tasks')
        .select('id, title, due_date')
        .eq('user_id', userId)
        .gte('due_date', weekStart.toISOString())
        .lt('due_date', weekEnd.toISOString())
        .order('due_date', { ascending: true });
      thisWeek = (weekTasks || []).map(t => ({
        id: t.id,
        day: DAYS_SHORT[new Date(t.due_date).getDay()],
        label: t.title,
      }));
    }

    // 4. Muse: up to 3 vendor saves
    let muse = [];
    if (userId && userId !== 'demo') {
      const { data: saves } = await supabase
        .from('saves')
        .select('id, vendor_id, vendors(name, category, featured_photos)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);
      muse = (saves || []).map(s => {
        const v = s.vendors || {};
        const photos = v.featured_photos || [];
        return {
          id: s.id,
          vendor_name: v.name || 'Vendor',
          category: v.category || '',
          thumbnail_url: photos[0] || null,
        };
      });
    }

    // 5. Activity: last 10 entries
    let activity = [];
    if (userId && userId !== 'demo') {
      const { data: logs } = await supabase
        .from('activity_log')
        .select('id, text, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      activity = (logs || []).map(l => ({
        id: l.id,
        text: l.text,
        timestamp: l.created_at,
      }));
    }

    // 6. Seed demo data if nothing returned (first load / demo user)
    const isEmpty = nudges.length === 0 && thisWeek.length === 0 && muse.length === 0 && activity.length === 0;
    if (isEmpty) {
      const today = new Date();
      const DEMO_DAYS = ['Mon','Tue','Wed'];
      nudges = [
        { id: 'demo-n1', title: 'Confirm your mehendi artist', context: 'You have an open enquiry from 3 days ago. A quick reply keeps your slot.', cta: 'View enquiry', vendor_name: null },
        { id: 'demo-n2', title: 'Share your moodboard with your photographer', context: 'Your photographer is waiting on a reference — share it before your pre-shoot call.', cta: 'Open Moodboard', vendor_name: null },
        { id: 'demo-n3', title: 'Finalise your catering menu', context: 'Selections are due this week. Your caterer has shared the tasting notes.', cta: 'Review menu', vendor_name: null },
      ];
      thisWeek = [
        { id: 'demo-w1', day: 'Tue', label: 'Catering call' },
        { id: 'demo-w2', day: 'Thu', label: 'Venue visit' },
        { id: 'demo-w3', day: 'Sat', label: 'Trial run' },
      ];
      muse = [
        { id: 'demo-m1', vendor_name: 'Studio Nidaan', category: 'Photography', thumbnail_url: null },
        { id: 'demo-m2', vendor_name: 'Weddingscapes', category: 'Décor', thumbnail_url: null },
        { id: 'demo-m3', vendor_name: 'Ritu Kumar Bridal', category: 'Couture', thumbnail_url: null },
      ];
      activity = [
        { id: 'demo-a1', text: 'You saved Studio Nidaan to your Muse', timestamp: new Date(today.getTime() - 1*3600000).toISOString() },
        { id: 'demo-a2', text: 'Enquiry sent to Weddingscapes Décor', timestamp: new Date(today.getTime() - 5*3600000).toISOString() },
        { id: 'demo-a3', text: 'You added 3 photos to your Moodboard', timestamp: new Date(today.getTime() - 26*3600000).toISOString() },
        { id: 'demo-a4', text: 'Venue confirmed for Dec 14', timestamp: new Date(today.getTime() - 50*3600000).toISOString() },
        { id: 'demo-a5', text: 'Guest list updated — 240 total', timestamp: new Date(today.getTime() - 74*3600000).toISOString() },
      ];
      wedding_date = wedding_date || new Date(today.getTime() + 143*86400000).toISOString().split('T')[0];
    }

    res.json({ wedding_date, event_label, nudges, thisWeek, muse, activity });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`;

// ── New handler ───────────────────────────────────────────────────────────────

const NEW = `// GET /api/v2/couple/today/:userId
// TDW_TODAY_V2 — rich shape. Correct tables: couple_checklist, couple_muse, couple_events, couple_expenses.
// ─────────────────────────────────────────────────────────────
app.get('/api/v2/couple/today/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // ── 1. User row: wedding_date, couple_tier, name ──────────────────────
    let wedding_date = null;
    let couple_tier = 'lite';
    let userName = '';
    if (userId && userId !== 'demo') {
      const { data: userRow } = await supabase
        .from('users')
        .select('wedding_date, couple_tier, name')
        .eq('id', userId)
        .single();
      if (userRow) {
        wedding_date = userRow.wedding_date || null;
        couple_tier = userRow.couple_tier || 'lite';
        userName = userRow.name || '';
      }
    }

    // ── 2. Hero: countdown ───────────────────────────────────────────────
    let hero = { state: 'no_date', days_until: null, wedding_date };
    if (wedding_date) {
      const wDate = new Date(wedding_date);
      const diff = Math.ceil((wDate - now) / 86400000);
      if (diff > 0) hero = { state: 'upcoming', days_until: diff, wedding_date };
      else if (diff === 0) hero = { state: 'today', days_until: 0, wedding_date };
      else hero = { state: 'past', days_until: diff, wedding_date };
    }

    // ── 3. Next event ────────────────────────────────────────────────────
    let next_event = null;
    if (userId && userId !== 'demo') {
      const { data: events } = await supabase
        .from('couple_events')
        .select('id, event_name, event_date, event_city')
        .eq('couple_id', userId)
        .eq('is_active', true)
        .gte('event_date', todayStr)
        .order('event_date', { ascending: true })
        .limit(1);
      if (events && events.length > 0) {
        const e = events[0];
        next_event = { id: e.id, event_name: e.event_name, event_date: e.event_date, event_city: e.event_city || null };
      }
    }

    // ── 4. Three moments: pending checklist items due soonest ────────────
    let three_moments = [];
    if (userId && userId !== 'demo') {
      const { data: tasks } = await supabase
        .from('couple_checklist')
        .select('id, text, event, due_date, priority')
        .eq('couple_id', userId)
        .eq('is_complete', false)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .limit(3);
      three_moments = (tasks || []).map(t => ({
        id: t.id,
        title: t.text,
        event: t.event || 'general',
        due_date: t.due_date,
        priority: t.priority || 'medium',
        cta: 'Mark done',
      }));
    }

    // ── 5. Priority tasks: next 5 incomplete, with or without due_date ───
    let priority_tasks = [];
    if (userId && userId !== 'demo') {
      const { data: tasks } = await supabase
        .from('couple_checklist')
        .select('id, text, event, due_date, priority, is_complete')
        .eq('couple_id', userId)
        .eq('is_complete', false)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(5);
      priority_tasks = (tasks || []).map(t => ({
        id: t.id,
        title: t.text,
        event: t.event || 'general',
        due_date: t.due_date || null,
        priority: t.priority || 'medium',
      }));
    }

    // ── 6. Budget summary from couple_expenses ───────────────────────────
    let budget = { total: 0, committed: 0, paid: 0 };
    if (userId && userId !== 'demo') {
      const { data: expenses } = await supabase
        .from('couple_expenses')
        .select('planned_amount, actual_amount, payment_status')
        .eq('couple_id', userId);
      if (expenses && expenses.length > 0) {
        budget.total = expenses.reduce((s, e) => s + (e.planned_amount || 0), 0);
        budget.committed = expenses.reduce((s, e) => s + (e.actual_amount || e.planned_amount || 0), 0);
        budget.paid = expenses
          .filter(e => e.payment_status === 'paid')
          .reduce((s, e) => s + (e.actual_amount || e.planned_amount || 0), 0);
      }
    }

    // ── 7. Upcoming payments: unpaid expenses with due_date ──────────────
    let upcoming_payments = [];
    if (userId && userId !== 'demo') {
      const { data: dues } = await supabase
        .from('couple_expenses')
        .select('id, vendor_name, description, planned_amount, actual_amount, due_date, payment_status')
        .eq('couple_id', userId)
        .neq('payment_status', 'paid')
        .not('due_date', 'is', null)
        .gte('due_date', todayStr)
        .order('due_date', { ascending: true })
        .limit(3);
      upcoming_payments = (dues || []).map(d => ({
        id: d.id,
        vendor_name: d.vendor_name || d.description || 'Vendor',
        amount: d.actual_amount || d.planned_amount || 0,
        due_date: d.due_date,
        status: d.payment_status,
      }));
    }

    // ── 8. Muse saves: latest 5 from couple_muse ────────────────────────
    let muse_saves = [];
    if (userId && userId !== 'demo') {
      const { data: saves } = await supabase
        .from('couple_muse')
        .select('id, image_url, source_url, function_tag, created_at')
        .eq('couple_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      muse_saves = (saves || []).map(s => ({
        id: s.id,
        thumbnail_url: s.image_url || null,
        source_url: s.source_url || null,
        tag: s.function_tag || null,
      }));
    }

    // ── 9. Quiet activity: recent completed tasks ────────────────────────
    let quiet_activity = [];
    if (userId && userId !== 'demo') {
      const { data: done } = await supabase
        .from('couple_checklist')
        .select('id, text, completed_at')
        .eq('couple_id', userId)
        .eq('is_complete', true)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(5);
      quiet_activity = (done || []).map(t => ({
        id: t.id,
        text: t.text + ' — done',
        timestamp: t.completed_at,
      }));
    }

    res.json({
      hero,
      three_moments,
      priority_tasks,
      budget,
      next_event,
      muse_saves,
      quiet_activity,
      upcoming_payments,
      // Legacy fields — kept so old native builds don't break
      wedding_date,
      event_label: 'wedding',
      nudges: three_moments,
      thisWeek: priority_tasks.slice(0, 3).map(t => ({
        id: t.id,
        day: t.due_date ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(t.due_date).getDay()] : '—',
        label: t.title,
      })),
      muse: muse_saves,
      activity: quiet_activity,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`;

// ── Apply patch ───────────────────────────────────────────────────────────────

if (!src.includes(OLD.substring(0, 80))) {
  console.error('ABORT: old handler marker not found — source may have changed');
  process.exit(1);
}

const patched = src.replace(OLD, NEW);

if (patched === src) {
  console.error('ABORT: replace had no effect — OLD string not matched exactly');
  process.exit(1);
}

fs.writeFileSync(FILE, patched, 'utf8');
console.log('✅ Patch applied: today endpoint upgraded to rich shape (TDW_TODAY_V2)');
console.log('Next: git add backend/server.js && git commit -m "feat: today endpoint rich shape v2" && git push');
