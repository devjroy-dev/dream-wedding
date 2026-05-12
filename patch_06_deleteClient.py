import os

path = 'backend/agentic/wedding/vendor/toolHandlers/deleteClient.js'
assert not os.path.exists(path), f"File already exists: {path}"

content = """// backend/agentic/wedding/vendor/toolHandlers/deleteClient.js
//
// Tool handler for wedding_delete_client (Session 7, 2026-05-12).
//
// Hard delete — matches the existing DELETE /api/vendor-clients/:id endpoint
// pattern in server.js line 1323. Soft-delete deferred to a schema-migration
// session per SESSION_BOUNDARIES §125.
//
// Note: deleting a client does NOT cascade-delete invoices or expenses.
// vendor_invoices has client_id as a soft FK (sometimes null); orphaned rows
// keep client_name as text. Matches existing v2 endpoint behavior.
//
// Resolution: prefer client_id; fall back to client_name single-match
// (refuse on ambiguity). Vendor-ownership guard on the delete itself.

const engine = require('../engine');

async function deleteClient(vendorId, { client_id, client_name }) {
  const { supabase } = engine.deps();

  let target = null;
  if (client_id) {
    const { data } = await supabase
      .from('vendor_clients')
      .select('id, vendor_id, name')
      .eq('id', client_id)
      .maybeSingle();
    if (!data) return 'Client not found.';
    if (data.vendor_id !== vendorId) return 'Client does not belong to this vendor.';
    target = data;
  } else if (client_name) {
    const { data } = await supabase
      .from('vendor_clients')
      .select('id, vendor_id, name')
      .eq('vendor_id', vendorId)
      .ilike('name', '%' + client_name + '%')
      .limit(2);
    if (!data || data.length === 0) return 'No client matching "' + client_name + '" found.';
    if (data.length > 1) return 'More than one client matches "' + client_name + '". Specify the client_id.';
    target = data[0];
  } else {
    return 'client_id or client_name required.';
  }

  const { error } = await supabase
    .from('vendor_clients')
    .delete()
    .eq('id', target.id)
    .eq('vendor_id', vendorId);
  if (error) throw error;

  return 'Deleted client: ' + target.name + '. Their invoices and expenses remain on file.';
}

module.exports = { deleteClient };
"""

os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, 'w') as f:
    f.write(content)
print("Written:", path)
