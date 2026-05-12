// backend/agentic/wedding/vendor/context.js
//
// Builds the authoritative vendor context object that gets baked into the
// system prompt at the start of every agentic turn.
//
// Lifted verbatim from server.js _vendorChatFetchContext (Session 1.2,
// commit 9e5a371). Session 2 keeps behavior byte-identical to the prior
// inline implementation.
//
// Architectural pattern (locked by Session 1.1 root-cause analysis):
//   vendor-chat reads are answered from this snapshot, not from tools.
//   When new entity types are added (e.g. tax queries in Session 7), the
//   snapshot must be expanded — adding a tool alone is not enough.
//
// KNOWN PRE-EXISTING BUG (queued for Session 2.1, NOT fixed here):
//   The select on vendor_calendar_events references `event_name` — that
//   column does not exist. The real column is `title`. Six call sites in
//   server.js carry this bug today (lines 5001, 5070, 11638, 11646, 11703,
//   11718, plus 18308/18353/18675 — all extracted here). The `|| 'Event'`
//   fallback masks it; schedule lists render as "Event" not the real title.
//   Per Option C decision: ship S2 with byte-identical behavior, sweep all
//   six sites in S2.1.

const engine = require('./engine');

async function fetchContext(vendorId) {
  const { supabase } = engine.deps();

  // Mirrors /api/v2/dreamai/vendor-context/:vendorId so the frontend never has
  // to send context up — keeps the surface stateless and tamper-proof.
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const [vendorRes, subRes, clientsRes, invoicesRes, enquiriesRes, calendarRes] = await Promise.all([
    supabase.from('vendors').select('id, name, category').eq('id', vendorId).maybeSingle(),
    supabase.from('vendor_subscriptions').select('tier').eq('vendor_id', vendorId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('vendor_clients').select('id, name, event_type, event_date, status').eq('vendor_id', vendorId).order('event_date', { ascending: true }).limit(20),
    supabase.from('vendor_invoices').select('id, client_name, amount, total_amount, status, due_date, paid_date, created_at').eq('vendor_id', vendorId).order('created_at', { ascending: false }).limit(30),
    supabase.from('vendor_enquiries').select('id, couple_id, initial_message, last_message_preview, last_message_at, created_at, status, wedding_date, couple:users(name, bride_name, groom_name, phone)').eq('vendor_id', vendorId).order('created_at', { ascending: false }).limit(10),
    supabase.from('vendor_calendar_events').select('id, event_name, event_date, event_time, client_name').eq('vendor_id', vendorId).gte('event_date', todayStr).order('event_date', { ascending: true }).limit(10),
  ]);

  if (!vendorRes.data) return null;

  const vendor = vendorRes.data;
  const tier = subRes.data?.tier || 'essential';
  const clients = clientsRes.data || [];
  const invoices = invoicesRes.data || [];
  const enquiries = enquiriesRes.data || [];
  const calendar = calendarRes.data || [];

  const outstanding = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((s, i) => s + parseFloat(i.total_amount || i.amount || 0), 0);

  const overdue = invoices.filter(i =>
    (i.status === 'unpaid' || i.status === 'issued' || i.status === 'pending') &&
    i.due_date && i.due_date < todayStr
  );

  const pendingEnquiries = enquiries.filter(e => e.status !== 'replied' && e.status !== 'closed');

  // ── Detail lists for the briefing snapshot (Session 1.2)
  // Surface per-entity info so the model can answer "who owes me money", "what's
  // on my schedule", etc. without needing a tool call. Capped to keep the prompt
  // size reasonable; vendors with more than these counts will see a "+ N more" hint.
  const pendingInvoices = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'))
    .slice(0, 10)
    .map(i => ({
      client_name: i.client_name || '(unnamed)',
      amount: parseFloat(i.total_amount || i.amount || 0),
      due_date: i.due_date || null,
      is_overdue: !!(i.due_date && i.due_date < todayStr),
    }));
  const pendingInvoicesMore = Math.max(
    0,
    invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').length - pendingInvoices.length
  );

  const upcomingEvents = (calendar || []).slice(0, 5).map(e => ({
    date: e.event_date,
    time: e.event_time || null,
    event_name: e.event_name || 'Event',
    client_name: e.client_name || null,
  }));

  const upcomingClients = (clients || [])
    .filter(c => c.event_date && c.event_date >= todayStr)
    .slice(0, 10)
    .map(c => ({
      name: c.name,
      event_type: c.event_type || 'Event',
      event_date: c.event_date,
      status: c.status || 'upcoming',
    }));

  const pendingEnquiriesList = pendingEnquiries.slice(0, 5).map(e => {
    const couple = e.couple || {};
    const coupleName = couple.name || couple.bride_name || couple.groom_name || 'Unnamed couple';
    const preview = (e.initial_message || e.last_message_preview || '').slice(0, 80);
    return {
      couple_name: coupleName,
      when: e.created_at,
      preview,
    };
  });

  return {
    vendor: { id: vendor.id, name: vendor.name, category: vendor.category, tier },
    clients,
    invoices,
    enquiries,
    pending_enquiries: pendingEnquiries,
    calendar,
    outstanding,
    overdue,
    // Session 1.2 — formatted detail lists for snapshot
    pending_invoices: pendingInvoices,
    pending_invoices_more: pendingInvoicesMore,
    upcoming_events: upcomingEvents,
    upcoming_clients: upcomingClients,
    pending_enquiries_list: pendingEnquiriesList,
  };
}

module.exports = { fetchContext };
