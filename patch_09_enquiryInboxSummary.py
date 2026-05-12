import os

path = 'backend/agentic/wedding/vendor/toolHandlers/enquiryInboxSummary.js'
assert not os.path.exists(path), f"File already exists: {path}"

content = """// backend/agentic/wedding/vendor/toolHandlers/enquiryInboxSummary.js
//
// Tool handler for wedding_enquiry_inbox_summary (Session 7, 2026-05-12). Read-only.
//
// Returns a short breakdown of the vendor's recent enquiries: counts by status
// plus the most recent pending entries with couple name and message preview.
//
// Schema reference: vendor_enquiries(id, vendor_id, couple_id, status,
//   last_message_preview, last_message_from, created_at).
//   Joined: users(id, name, bride_name, groom_name).

const engine = require('../engine');

async function enquiryInboxSummary(vendorId, { limit_pending } = {}) {
  const { supabase } = engine.deps();

  const limit = Math.max(1, Math.min(10, Number(limit_pending) || 5));

  const { data: recent } = await supabase
    .from('vendor_enquiries')
    .select('id, status, last_message_preview, created_at, couple_id, couple:users(name, bride_name, groom_name)')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = recent || [];
  if (rows.length === 0) return 'No enquiries on record yet.';

  const counts = { pending: 0, replied: 0, converted: 0, closed: 0, other: 0 };
  for (const r of rows) {
    const s = (r.status || 'pending').toLowerCase();
    if (counts[s] !== undefined) counts[s]++;
    else counts.other++;
  }

  const pending = rows
    .filter(r => !r.status || r.status === 'pending')
    .slice(0, limit);

  const lines = [
    'Pending: ' + counts.pending + ' · Replied: ' + counts.replied + ' · Converted: ' + counts.converted + ' · Closed: ' + counts.closed,
  ];

  if (pending.length > 0) {
    lines.push('');
    lines.push('Most recent pending:');
    for (const r of pending) {
      const c = r.couple || {};
      const coupleName = c.name || c.bride_name || c.groom_name || 'couple';
      const when = r.created_at ? r.created_at.slice(0, 10) : '';
      const preview = (r.last_message_preview || '').slice(0, 80).trim();
      lines.push('- ' + coupleName + (when ? ' (' + when + ')' : '') + (preview ? ' — "' + preview + '"' : ''));
    }
  }

  return lines.join('\\n');
}

module.exports = { enquiryInboxSummary };
"""

os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, 'w') as f:
    f.write(content)
print("Written:", path)
