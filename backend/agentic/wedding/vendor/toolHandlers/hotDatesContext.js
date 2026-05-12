// backend/agentic/wedding/vendor/toolHandlers/hotDatesContext.js
//
// Tool handler for wedding_hot_dates_context (Session 7, 2026-05-12). Read-only.
//
// Returns upcoming Vivah Muhurat (auspicious Hindu wedding) dates within a
// configurable window. Vendor-side only — bride/Frost surface deprecated.
//
// Schema reference: hot_dates(date, tradition, region, note).
// Shared table, no vendor_id column.

const engine = require('../engine');

async function hotDatesContext({ months_ahead, tradition, region } = {}) {
  const { supabase } = engine.deps();

  const window = Math.max(1, Math.min(12, Number(months_ahead) || 3));

  const today = new Date();
  const start = today.toISOString().slice(0, 10);
  const end   = new Date(today.getFullYear(), today.getMonth() + window, today.getDate()).toISOString().slice(0, 10);

  let query = supabase
    .from('hot_dates')
    .select('date, tradition, region, note')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })
    .limit(30);

  if (tradition) query = query.eq('tradition', tradition);
  if (region)    query = query.eq('region', region);

  const { data, error } = await query;
  if (error) throw error;

  const rows = data || [];
  if (rows.length === 0) {
    return 'No hot dates in the next ' + window + ' month' + (window === 1 ? '' : 's') + '.';
  }

  const lines = rows.map(r => {
    const parts = [r.date];
    if (r.tradition) parts.push(r.tradition);
    if (r.region && r.region !== 'All India') parts.push(r.region);
    const head = parts.join(' · ');
    return r.note ? head + ' — ' + r.note : head;
  });

  return 'Upcoming hot dates (' + window + 'mo):\n' + lines.join('\n');
}

module.exports = { hotDatesContext };
