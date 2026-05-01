path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

old_anchor = "// POST /api/v2/dreamai/whatsapp-extract"

new_endpoint = (
"// GET /api/admin/all-vendors — returns ALL vendors for admin dashboard (no discovery filters)\n"
"app.get('/api/admin/all-vendors', async (req, res) => {\n"
"  try {\n"
"    const { search } = req.query;\n"
"    let q = supabase.from('vendors').select('id, name, phone, email, category, city, instagram, is_approved, subscription_active, discover_listed, vendor_discover_enabled, created_at');\n"
"    if (search) q = q.or('name.ilike.%' + search + '%,category.ilike.%' + search + '%,city.ilike.%' + search + '%');\n"
"    q = q.order('created_at', { ascending: false });\n"
"    const { data, error } = await q;\n"
"    if (error) throw error;\n"
"    // Enrich with tier from vendor_subscriptions\n"
"    const ids = (data || []).map(function(v) { return v.id; });\n"
"    let subMap = {};\n"
"    if (ids.length > 0) {\n"
"      const { data: subs } = await supabase.from('vendor_subscriptions').select('vendor_id, tier, status').in('vendor_id', ids);\n"
"      (subs || []).forEach(function(s) { subMap[s.vendor_id] = s; });\n"
"    }\n"
"    const enriched = (data || []).map(function(v) {\n"
"      const sub = subMap[v.id] || {};\n"
"      return Object.assign({}, v, { tier: sub.tier || 'essential', sub_status: sub.status || null });\n"
"    });\n"
"    res.json({ success: true, data: enriched });\n"
"  } catch (err) {\n"
"    console.error('[admin/all-vendors]', err.message);\n"
"    res.status(500).json({ success: false, error: err.message });\n"
"  }\n"
"});\n"
"\n"
"// POST /api/v2/dreamai/whatsapp-extract"
)

assert content.count(old_anchor) == 1, "anchor not found exactly once"
content = content.replace(old_anchor, new_endpoint, 1)
print("OK: admin/all-vendors endpoint added")

with open(path, 'w') as f:
    f.write(content)
print("OK: server.js written")
