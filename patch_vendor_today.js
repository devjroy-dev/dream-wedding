#!/usr/bin/env node
/**
 * patch_vendor_today.js
 * Adds GET /api/v2/vendor/today/:vendorId to dream-wedding/backend/server.js
 *
 * Run from: /workspaces/dream-wedding
 * Command:  node patch_vendor_today.js
 *
 * Returns:
 * {
 *   needs_attention: AttentionItem[]   — overdue invoices, unanswered enquiries, today's shoots
 *   todays_schedule: ScheduleItem[]   — vendor_calendar_events for today
 *   this_week_summary: string         — plain text summary of the week
 *   snapshot: Snapshot                — views, saves, enquiries + deltas vs last week
 * }
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'backend', 'server.js');

// ── Safety checks ─────────────────────────────────────────────────────────────
const src = fs.readFileSync(FILE, 'utf8');

const expressCount = (src.match(/const express = require/g) || []).length;
if (expressCount !== 1) {
  console.error(`ABORT: expected 1 express require, found ${expressCount}`);
  process.exit(1);
}

if (src.includes("'/api/v2/vendor/today/:vendorId'")) {
  console.error('ABORT: vendor today endpoint already exists');
  process.exit(1);
}

if (src.includes('// TDW_VENDOR_TODAY_V1')) {
  console.error('ABORT: patch already applied');
  process.exit(1);
}

// ── Find insert point: just before app.listen ─────────────────────────────────
const LISTEN_MARKER = 'app.listen(';
const listenIdx = src.lastIndexOf(LISTEN_MARKER);
if (listenIdx === -1) {
  console.error('ABORT: could not find app.listen() in server.js');
  process.exit(1);
}

// ── New endpoint ──────────────────────────────────────────────────────────────
const NEW_ENDPOINT = `
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v2/vendor/today/:vendorId
// TDW_VENDOR_TODAY_V1
// Returns: needs_attention[], todays_schedule[], this_week_summary, snapshot
// Tables: vendors, vendor_invoices, vendor_clients, vendor_calendar_events,
//         vendor_enquiries, vendor_analytics_daily
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/v2/vendor/today/:vendorId', async (req, res) => {
  const { vendorId } = req.params;
  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Week bounds (Mon–Sun)
    const dayOfWeek = now.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMon);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    // Last week bounds (for snapshot deltas)
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(weekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStart);
    const lastWeekStartStr = lastWeekStart.toISOString().slice(0, 10);
    const lastWeekEndStr = lastWeekEnd.toISOString().slice(0, 10);

    // ── 1. Vendor row ────────────────────────────────────────────────────────
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id, name, category, tier')
      .eq('id', vendorId)
      .single();

    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    // ── 2. Overdue invoices ──────────────────────────────────────────────────
    const { data: overdueInvoices } = await supabase
      .from('vendor_invoices')
      .select('id, client_name, amount, total_amount, due_date, status')
      .eq('vendor_id', vendorId)
      .in('status', ['unpaid', 'issued'])
      .lt('due_date', todayStr)
      .order('due_date', { ascending: true })
      .limit(3);

    // ── 3. Unanswered enquiries ──────────────────────────────────────────────
    const { data: openEnquiries } = await supabase
      .from('vendor_enquiries')
      .select('id, couple_name, message, created_at')
      .eq('vendor_id', vendorId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(3);

    // ── 4. Today's calendar events ───────────────────────────────────────────
    const { data: todayEvents } = await supabase
      .from('vendor_calendar_events')
      .select('id, event_name, event_date, event_time, client_name, notes')
      .eq('vendor_id', vendorId)
      .eq('event_date', todayStr)
      .order('event_time', { ascending: true });

    // ── 5. This week's events (for summary) ──────────────────────────────────
    const { data: weekEvents } = await supabase
      .from('vendor_calendar_events')
      .select('id, event_name, event_date, event_time, client_name')
      .eq('vendor_id', vendorId)
      .gte('event_date', weekStartStr)
      .lt('event_date', weekEndStr)
      .order('event_date', { ascending: true });

    // ── 6. Discovery snapshot — current week ─────────────────────────────────
    const { data: analyticsNow } = await supabase
      .from('vendor_analytics_daily')
      .select('views, saves, enquiries')
      .eq('vendor_id', vendorId)
      .gte('date', weekStartStr)
      .lt('date', weekEndStr);

    // ── 7. Discovery snapshot — last week (for delta) ────────────────────────
    const { data: analyticsLast } = await supabase
      .from('vendor_analytics_daily')
      .select('views, saves, enquiries')
      .eq('vendor_id', vendorId)
      .gte('date', lastWeekStartStr)
      .lt('date', lastWeekEndStr);

    // ── Build needs_attention ────────────────────────────────────────────────
    const needs_attention = [];

    // Overdue invoices → type: 'invoice'
    for (const inv of (overdueInvoices || [])) {
      const amount = parseFloat(inv.total_amount || inv.amount) || 0;
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000);
      needs_attention.push({
        id: inv.id,
        type: 'invoice',
        title: \`\${inv.client_name} — payment overdue\`,
        subtitle: \`\${daysOverdue} day\${daysOverdue !== 1 ? 's' : ''} overdue. Send a reminder now.\`,
        amount,
        cta: 'Send reminder',
      });
    }

    // Unanswered enquiries → type: 'enquiry'
    for (const enq of (openEnquiries || [])) {
      const hoursAgo = Math.floor((now.getTime() - new Date(enq.created_at).getTime()) / 3600000);
      const timeLabel = hoursAgo < 24 ? \`\${hoursAgo}h ago\` : \`\${Math.floor(hoursAgo/24)}d ago\`;
      needs_attention.push({
        id: enq.id,
        type: 'enquiry',
        title: \`New enquiry from \${enq.couple_name || 'a couple'}\`,
        subtitle: \`Received \${timeLabel}. A quick reply keeps the lead warm.\`,
        cta: 'Reply now',
      });
    }

    // Today's shoots → type: 'shoot'
    for (const ev of (todayEvents || [])) {
      needs_attention.push({
        id: ev.id,
        type: 'shoot',
        title: ev.event_name || 'Event today',
        subtitle: ev.client_name
          ? \`\${ev.client_name}\${ev.event_time ? ' · ' + ev.event_time : ''}\`
          : (ev.event_time || 'Today'),
        cta: 'View details',
      });
    }

    // Cap at 3
    const capped_attention = needs_attention.slice(0, 3);

    // ── Build todays_schedule ────────────────────────────────────────────────
    const todays_schedule = (todayEvents || []).map(ev => ({
      id: ev.id,
      time: ev.event_time || '—',
      event_name: ev.event_name || 'Event',
      client_name: ev.client_name || null,
    }));

    // ── Build this_week_summary ──────────────────────────────────────────────
    const wkEvs = weekEvents || [];
    let this_week_summary = '';
    if (wkEvs.length === 0) {
      this_week_summary = 'Your calendar is clear this week.';
    } else if (wkEvs.length === 1) {
      const e = wkEvs[0];
      this_week_summary = \`One event this week\${e.client_name ? ' — ' + e.client_name : ''}.\`;
    } else {
      const names = wkEvs
        .filter(e => e.client_name)
        .map(e => e.client_name)
        .slice(0, 2);
      this_week_summary = \`\${wkEvs.length} events this week\${names.length ? ' — ' + names.join(', ') : ''}.\`;
    }

    // ── Build snapshot ───────────────────────────────────────────────────────
    const sumAnalytics = (rows) => (rows || []).reduce(
      (acc, r) => ({
        views: acc.views + (r.views || 0),
        saves: acc.saves + (r.saves || 0),
        enquiries: acc.enquiries + (r.enquiries || 0),
      }),
      { views: 0, saves: 0, enquiries: 0 }
    );

    const thisWeekTotals = sumAnalytics(analyticsNow);
    const lastWeekTotals = sumAnalytics(analyticsLast);

    const snapshot = {
      views: thisWeekTotals.views,
      saves: thisWeekTotals.saves,
      enquiries: thisWeekTotals.enquiries,
      views_delta: thisWeekTotals.views - lastWeekTotals.views,
      saves_delta: thisWeekTotals.saves - lastWeekTotals.saves,
      enquiries_delta: thisWeekTotals.enquiries - lastWeekTotals.enquiries,
    };

    res.json({
      needs_attention: capped_attention,
      todays_schedule,
      this_week_summary,
      snapshot,
    });

  } catch (error) {
    console.error('vendor today error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

`;

// ── Insert before app.listen ──────────────────────────────────────────────────
const patched = src.slice(0, listenIdx) + NEW_ENDPOINT + src.slice(listenIdx);

fs.writeFileSync(FILE, patched, 'utf8');
console.log('✅ Patch applied: GET /api/v2/vendor/today/:vendorId added (TDW_VENDOR_TODAY_V1)');
console.log('Next: git add backend/server.js && git commit -m "feat: vendor today endpoint v1" && git push');
