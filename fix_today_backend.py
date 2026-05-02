path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

# Fix 1: activityRows query — add vendor_id, last_message_from
old = "supabase.from('vendor_enquiries').select('id, last_message_at, last_message_preview').eq('couple_id', userId).order('last_message_at', { ascending: false }).limit(5),"
new = "supabase.from('vendor_enquiries').select('id, vendor_id, last_message_at, last_message_preview, last_message_from').eq('couple_id', userId).order('last_message_at', { ascending: false }).limit(5),"

assert content.count(old) == 1, f"Found {content.count(old)} matches"
content = content.replace(old, new, 1)

# Fix 2: enrich quiet_activity with vendor name
old = """    // ── Quiet activity ────────────────────────────────────────────────────────
    const quietActivity = (activityRows || []).slice(0, 5).map(e => ({
      type: 'message',
      text: e.last_message_preview || 'New message',
      at: e.last_message_at,
      enquiry_id: e.id,
    }));"""

new = """    // ── Quiet activity ────────────────────────────────────────────────────────
    // Enrich with vendor names
    const activityVendorIds = [...new Set((activityRows || []).map(e => e.vendor_id).filter(Boolean))];
    let activityVendorMap = {};
    if (activityVendorIds.length > 0) {
      const { data: actVendors } = await supabase.from('vendors').select('id, name, category').in('id', activityVendorIds);
      (actVendors || []).forEach(v => { activityVendorMap[v.id] = v; });
    }
    const quietActivity = (activityRows || []).slice(0, 5).map(e => ({
      type: 'message',
      text: e.last_message_preview || 'New message',
      at: e.last_message_at,
      enquiry_id: e.id,
      vendor_id: e.vendor_id,
      vendor_name: activityVendorMap[e.vendor_id]?.name || null,
      vendor_category: activityVendorMap[e.vendor_id]?.category || null,
      from: e.last_message_from || 'unknown',
    }));"""

assert content.count(old) == 1, f"Found {content.count(old)} matches"
content = content.replace(old, new, 1)

with open(path, 'w') as f:
    f.write(content)
print("Done ✅")
