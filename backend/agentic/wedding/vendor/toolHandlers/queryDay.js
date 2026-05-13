// backend/agentic/wedding/vendor/toolHandlers/queryDay.js
//
// Tool handler for wedding_query_day.
//
// Returns all date-anchored items for a given date:
//   vendor_calendar_events  — events/blocked entries (event_date = date, not deleted)
//   vendor_availability_blocks — blocked dates (blocked_date = date; no deleted_at column)
//   vendor_todos            — tasks due (due_date = date, done=false, not deleted)
//   vendor_invoices         — invoices due (due_date = date, not paid, not deleted)
//                             NOTE: due_date is stored as text (D3 drift) — eq() comparison works.
//   vendor_payment_schedules — payment schedules due (due_date = date, not paid)
//
// Returns a structured tool_result string; model composes the vendor-facing reply.
// Schema reference: docs/governance/SCHEMA_2026_05_13.md

'use strict';
const engine = require('../engine');

async function queryDay(vendorId, { date } = {}) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return 'Invalid date. Provide YYYY-MM-DD.';
  }

  const { supabase } = engine.deps();

  const [evRes, blkRes, todosRes, invRes, psRes] = await Promise.all([
    supabase
      .from('vendor_calendar_events')
      .select('title, event_time, client_name, type')
      .eq('vendor_id', vendorId)
      .eq('event_date', date)
      .is('deleted_at', null),
    supabase
      .from('vendor_availability_blocks')
      .select('blocked_date, reason')
      .eq('vendor_id', vendorId)
      .eq('blocked_date', date),
    supabase
      .from('vendor_todos')
      .select('title, priority, client_name')
      .eq('vendor_id', vendorId)
      .eq('due_date', date)
      .eq('done', false)
      .is('deleted_at', null),
    supabase
      .from('vendor_invoices')
      .select('invoice_number, amount, total_amount, client_name')
      .eq('vendor_id', vendorId)
      .eq('due_date', date)
      .is('deleted_at', null)
      .not('status', 'eq', 'paid'),
    supabase
      .from('vendor_payment_schedules')
      .select('client_name, amount, status')
      .eq('vendor_id', vendorId)
      .eq('due_date', date)
      .not('status', 'eq', 'paid'),
  ]);

  const events    = evRes.data    || [];
  const blocks    = blkRes.data   || [];
  const todos     = todosRes.data || [];
  const invoices  = invRes.data   || [];
  const schedules = psRes.data    || [];

  const sections = [];

  if (events.length > 0) {
    const lines = events.map(e => {
      const time   = e.event_time ? e.event_time + ' — ' : '';
      const client = e.client_name ? ` (${e.client_name})` : '';
      return `- ${time}${e.title || 'Event'}${client}`;
    });
    sections.push(`EVENTS (${events.length}):\n${lines.join('\n')}`);
  }

  if (blocks.length > 0) {
    const lines = blocks.map(b => `- Blocked${b.reason ? ': ' + b.reason : ''}`);
    sections.push(`BLOCKED DATES:\n${lines.join('\n')}`);
  }

  if (todos.length > 0) {
    const lines = todos.map(t => {
      const pri    = t.priority ? ` [${t.priority}]` : '';
      const client = t.client_name ? ` — ${t.client_name}` : '';
      return `- ${t.title}${pri}${client}`;
    });
    sections.push(`TASKS DUE (${todos.length}):\n${lines.join('\n')}`);
  }

  if (invoices.length > 0) {
    const fmt  = n => 'Rs ' + Math.round(Number(n) || 0).toLocaleString('en-IN');
    const lines = invoices.map(i => {
      const num    = i.invoice_number || 'Invoice';
      const amt    = fmt(i.total_amount != null ? i.total_amount : i.amount);
      const client = i.client_name ? ` from ${i.client_name}` : '';
      return `- ${num} — ${amt}${client}`;
    });
    sections.push(`INVOICES DUE (${invoices.length}):\n${lines.join('\n')}`);
  }

  if (schedules.length > 0) {
    const fmt  = n => 'Rs ' + Math.round(Number(n) || 0).toLocaleString('en-IN');
    const lines = schedules.map(s => {
      const client = s.client_name || 'Client';
      const amt    = fmt(s.amount);
      const status = s.status ? ` [${s.status}]` : '';
      return `- ${fmt(s.amount)} from ${client}${status}`;
    });
    sections.push(`PAYMENT SCHEDULES DUE (${schedules.length}):\n${lines.join('\n')}`);
  }

  if (sections.length === 0) {
    return `No events, tasks, invoices, or reminders on ${date}.`;
  }

  return `Day query for ${date}:\n\n` + sections.join('\n\n');
}

module.exports = { queryDay };
