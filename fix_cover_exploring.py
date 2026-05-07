#!/usr/bin/env python3
"""
Fix cover-photos and exploring-photos endpoints to read from correct Supabase tables.
cover_photos table: id, image_url, photographer_name, vendor_id, display_order, is_active, is_paid
exploring_photos table: id, image_url, display_order, caption, active, created_at
Run from /workspaces/dream-wedding
"""
import sys

FILE = 'backend/server.js'

OLD = """app.get('/api/v2/cover-photos', async (req, res) => {
  try {
    const { data: vendors } = await supabase
      .from('vendors')
      .select('featured_photos, portfolio_images')
      .eq('discover_listed', true)
      .eq('vendor_discover_enabled', true)
      .order('rating', { ascending: false })
      .limit(20);

    const photos = [];
    for (const v of (vendors || [])) {
      const imgs = [...(v.featured_photos || []), ...(v.portfolio_images || [])];
      for (const url of imgs.slice(0, 2)) {
        if (url && photos.length < 12) photos.push({ image_url: url });
      }
    }

    res.json({ success: true, photos });
  } catch (error) {
    console.error('[GET /api/v2/cover-photos] error:', error.message);
    res.json({ success: true, photos: [] });
  }
});"""

NEW_COVER = """app.get('/api/v2/cover-photos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cover_photos')
      .select('id, image_url, photographer_name, vendor_id, display_order, is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) throw error;
    const photos = (data || []).map(p => ({ id: p.id, image_url: p.image_url }));
    res.json({ success: true, photos });
  } catch (error) {
    console.error('[GET /api/v2/cover-photos] error:', error.message);
    res.json({ success: true, photos: [] });
  }
});"""

OLD_EXPLORING = """app.get('/api/v2/exploring-photos', async (req, res) => {
  try {
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, name, category, featured_photos, portfolio_images, about')
      .eq('discover_listed', true)
      .eq('vendor_discover_enabled', true)
      .order('rating', { ascending: false })
      .limit(20);

    const photos = [];
    let order = 1;
    for (const v of (vendors || [])) {
      const imgs = [...(v.featured_photos || []), ...(v.portfolio_images || [])];
      for (const url of imgs.slice(0, 3)) {
        if (url && photos.length < 20) {
          photos.push({
            id: `${v.id}-${order}`,
            image_url: url,
            display_order: order++,
            caption: v.name || null,
          });
        }
      }
    }

    res.json({ success: true, photos });
  } catch (error) {
    console.error('[GET /api/v2/exploring-photos] error:', error.message);
    res.json({ success: true, photos: [] });
  }
});"""

NEW_EXPLORING = """app.get('/api/v2/exploring-photos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('exploring_photos')
      .select('id, image_url, display_order, caption, active')
      .eq('active', true)
      .order('display_order', { ascending: true });
    if (error) throw error;
    res.json({ success: true, photos: data || [] });
  } catch (error) {
    console.error('[GET /api/v2/exploring-photos] error:', error.message);
    res.json({ success: true, photos: [] });
  }
});"""

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Patch cover-photos
count = content.count(OLD)
if count == 0:
    print("ERROR: cover-photos handler not found.")
    sys.exit(1)
if count > 1:
    print(f"ERROR: {count} matches for cover-photos handler.")
    sys.exit(1)
content = content.replace(OLD, NEW_COVER)
print("✓ cover-photos endpoint patched — now reads from cover_photos table")

# Patch exploring-photos
count = content.count(OLD_EXPLORING)
if count == 0:
    print("ERROR: exploring-photos handler not found.")
    sys.exit(1)
if count > 1:
    print(f"ERROR: {count} matches for exploring-photos handler.")
    sys.exit(1)
content = content.replace(OLD_EXPLORING, NEW_EXPLORING)
print("✓ exploring-photos endpoint patched — now reads from exploring_photos table")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done. Both endpoints now read from correct admin-managed tables.")
