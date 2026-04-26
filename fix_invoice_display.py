import re

content = open('backend/server.js', 'r').read()

# Fix 1: The clients LIST endpoint - fix the broken .or() syntax
old = "supabase.from('vendor_invoices').select('amount, total_amount, status, client_id').eq('vendor_id', vendorId).or(`client_id.eq.${c.id},client_name.ilike.${c.name}`),"
new = "supabase.from('vendor_invoices').select('amount, total_amount, status, client_id').eq('vendor_id', vendorId).or(`client_id.eq.${c.id},client_name.ilike.${encodeURIComponent(c.name)}`),"

if old in content:
    content = content.replace(old, new)
    print('Fix 1 applied')
else:
    # Try alternate fix - just use two separate queries in the list endpoint
    old_alt = "supabase.from('vendor_invoices').select('amount, total_amount, status, client_id').eq('vendor_id', vendorId).or(`client_id.eq.${c.id},client_name.ilike.${c.name}`),"
    print(f'Fix 1 not found, current state may differ')

# Fix 2: The client DETAIL endpoint - ensure both queries work
# The current code looks correct - fetch by client_id AND by client_name with is(client_id, null)
# The issue is the invoice may have client_id set but pointing to wrong client
# Add a third fetch: invoices where client_name matches regardless of client_id
old2 = """    // Fetch invoices by client_id first, fall back to client_name match
    const { data: invoicesById } = await supabase.from('vendor_invoices').select('*').eq('vendor_id', vendorId).eq('client_id', clientId);
    const { data: invoicesByName } = await supabase.from('vendor_invoices').select('*').eq('vendor_id', vendorId).ilike('client_name', clientName).is('client_id', null);
    const invoices = [...(invoicesById || []), ...(invoicesByName || [])];"""

new2 = """    // Fetch invoices by client_id OR by client_name (dedup by id)
    const { data: invoicesById } = await supabase.from('vendor_invoices').select('*').eq('vendor_id', vendorId).eq('client_id', clientId);
    const { data: invoicesByName } = await supabase.from('vendor_invoices').select('*').eq('vendor_id', vendorId).ilike('client_name', clientName);
    const seenIds = new Set();
    const invoices = [...(invoicesById || []), ...(invoicesByName || [])].filter(inv => {
      if (seenIds.has(inv.id)) return false;
      seenIds.add(inv.id);
      return true;
    });"""

if old2 in content:
    content = content.replace(old2, new2)
    print('Fix 2 applied - invoice dedup fetch')
else:
    print('Fix 2 not found')

open('backend/server.js', 'w').write(content)
print('Done')
