import os

path = 'backend/agentic/wedding/vendor/toolHandlers/readClientMessages.js'
assert not os.path.exists(path), f"File already exists: {path}"

content = """// backend/agentic/wedding/vendor/toolHandlers/readClientMessages.js
//
// Tool handler for wedding_read_client_messages (Session 7, 2026-05-12). Read-only.
//
// Reads last N messages exchanged with a client via the platform enquiry thread.
//
// CARRY-FORWARD TO SESSION 9 (MUST PROPAGATE THROUGH SESSION 8 HANDOVER):
// This handler today reads ONLY from vendor_enquiry_messages. Inbound WhatsApp
// messages sent directly to the vendor +1 number are not captured yet.
// Session 9 (ROADMAP line 43) ships WhatsApp inbound routing. When Session 9
// ships, extend this handler to also read from whatever inbound store Session 9
// creates. The tool name and contract stay stable — no rename, no tools.js change.
// Remove the fallback string mentioning "later session" once inbound is live.
// Session 8 MUST re-include this carry-forward block in its handover addressed
// to Session 9. If you (future Claude) see this handler still reading only
// vendor_enquiry_messages after Session 9 shipped: that is a bug — fix it.
//
// Schema reference:
//   vendor_enquiries(id, vendor_id, couple_id, created_at)
//   vendor_enquiry_messages(enquiry_id, from_role, content, created_at)
//   users(id, name, bride_name, groom_name)

const engine = require('../engine');

async function readClientMessages(vendorId, { client_name, last_n } = {}) {
  const { supabase } = engine.deps();

  if (!client_name) return 'client_name required.';
  const n = Math.max(1, Math.min(20, Number(last_n) || 10));

  const term = '%' + client_name + '%';
  const { data: couples } = await supabase
    .from('users')
    .select('id, name, bride_name, groom_name')
    .or('name.ilike.' + term + ',bride_name.ilike.' + term + ',groom_name.ilike.' + term)
    .limit(20);

  if (!couples || couples.length === 0) {
    return 'No platform messages with ' + client_name + ' yet. (WhatsApp inbound from clients lands in a later session.)';
  }

  const coupleIds = couples.map(c => c.id);

  const { data: enquiries } = await supabase
    .from('vendor_enquiries')
    .select('id, couple_id, created_at')
    .eq('vendor_id', vendorId)
    .in('couple_id', coupleIds)
    .order('created_at', { ascending: false })
    .limit(1);

  if (!enquiries || enquiries.length === 0) {
    return 'No platform messages with ' + client_name + ' yet. (WhatsApp inbound from clients lands in a later session.)';
  }

  const enquiry = enquiries[0];
  const matchedCouple = couples.find(c => c.id === enquiry.couple_id) || {};
  const coupleName = matchedCouple.name || matchedCouple.bride_name || matchedCouple.groom_name || client_name;

  const { data: msgsDesc } = await supabase
    .from('vendor_enquiry_messages')
    .select('from_role, content, created_at')
    .eq('enquiry_id', enquiry.id)
    .order('created_at', { ascending: false })
    .limit(n);

  const msgs = (msgsDesc || []).slice().reverse();
  if (msgs.length === 0) return 'Enquiry thread with ' + coupleName + ' has no messages yet.';

  const lines = ['Last ' + msgs.length + ' message' + (msgs.length === 1 ? '' : 's') + ' with ' + coupleName + ':'];
  for (const m of msgs) {
    const who  = m.from_role === 'vendor' ? 'You' : coupleName;
    const when = m.created_at ? m.created_at.slice(0, 10) : '';
    const body = (m.content || '').slice(0, 200);
    lines.push((when ? '[' + when + '] ' : '') + who + ': ' + body);
  }
  return lines.join('\\n');
}

module.exports = { readClientMessages };
"""

os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, 'w') as f:
    f.write(content)
print("Written:", path)
