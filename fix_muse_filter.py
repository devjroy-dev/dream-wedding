#!/usr/bin/env python3
"""
Item 3 — Fix Muse endpoint to return all saves, not just vendor saves.
Removes the .not('vendor_id', 'is', null) filter from GET /api/couple/muse/:couple_id.
Also enriches all saves with vendor data where vendor_id exists.
Run from /workspaces/dream-wedding
"""
import sys

FILE = 'backend/server.js'

OLD = """app.get('/api/couple/muse/:couple_id', async (req, res) => {
  try {
    const { couple_id } = req.params;
    if (!couple_id) return res.status(400).json({ success: false, error: 'couple_id required' });
    const { data: saves } = await supabase.from('moodboard_items')
      .select('*').eq('user_id', couple_id).not('vendor_id', 'is', null)
      .order('created_at', { ascending: false });
    const vendorIds = [...new Set((saves || []).map(s => s.vendor_id).filter(Boolean))];
    let vendorMap = {};
    if (vendorIds.length > 0) {
      const { data: vendors } = await supabase.from('vendors')
        .select('id, name, category, city, portfolio_images, featured_photos, starting_price, rating, review_count, vibe_tags, tier, couture_eligible, accepts_lock_date, lock_date_amount, show_whatsapp_public, discover_listed, phone')
        .in('id', vendorIds);
      (vendors || []).forEach(v => { vendorMap[v.id] = v; });
    }
    const enriched = (saves || []).map(s => ({ ...s, vendor: vendorMap[s.vendor_id] || null }));
    res.json({ success: true, data: enriched });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});"""

NEW = """app.get('/api/couple/muse/:couple_id', async (req, res) => {
  try {
    const { couple_id } = req.params;
    if (!couple_id) return res.status(400).json({ success: false, error: 'couple_id required' });
    // Fetch ALL saves — vendor saves AND image/camera saves (no vendor_id filter)
    const { data: saves } = await supabase.from('moodboard_items')
      .select('*').eq('user_id', couple_id)
      .order('created_at', { ascending: false });
    const vendorIds = [...new Set((saves || []).map(s => s.vendor_id).filter(Boolean))];
    let vendorMap = {};
    if (vendorIds.length > 0) {
      const { data: vendors } = await supabase.from('vendors')
        .select('id, name, category, city, portfolio_images, featured_photos, starting_price, rating, review_count, vibe_tags, tier, couture_eligible, accepts_lock_date, lock_date_amount, show_whatsapp_public, discover_listed, phone')
        .in('id', vendorIds);
      (vendors || []).forEach(v => { vendorMap[v.id] = v; });
    }
    const enriched = (saves || []).map(s => ({ ...s, vendor: s.vendor_id ? (vendorMap[s.vendor_id] || null) : null }));
    res.json({ success: true, data: enriched });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});"""

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

count = content.count(OLD)
if count == 0:
    print("ERROR: Target handler not found. Handler may differ from expected.")
    sys.exit(1)
if count > 1:
    print(f"ERROR: Found {count} matches — expected exactly 1. Aborting.")
    sys.exit(1)

fixed = content.replace(OLD, NEW)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(fixed)

print("✓ Muse endpoint patched — all saves returned, vendor_id filter removed")
