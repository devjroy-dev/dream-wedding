// ══════════════════════════════════════════════════════════════════════════════
// V8.1 BACKEND FIX — cover photos + exploring photos endpoints
// Append to backend/server.js in dream-wedding repo before app.listen().
// No headers. No requires. Route handlers only.
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v2/cover-photos
// Returns { photos: [{ image_url }] }
// Used by landing screen carousel. Pulls from discover-listed vendors.
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/v2/cover-photos', async (req, res) => {
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
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v2/exploring-photos
// Returns { success: true, photos: [{ id, image_url, display_order, caption }] }
// Used by "Just Exploring" flow on landing screen.
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/v2/exploring-photos', async (req, res) => {
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
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v2/preview-vendors
// Fallback used by exploring flow. Returns discover-listed vendors.
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/v2/preview-vendors', async (req, res) => {
  try {
    const { data } = await supabase
      .from('vendors')
      .select('id, name, category, city, featured_photos, portfolio_images, starting_price, rating')
      .eq('discover_listed', true)
      .eq('vendor_discover_enabled', true)
      .order('rating', { ascending: false })
      .limit(12);

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[GET /api/v2/preview-vendors] error:', error.message);
    res.json({ success: true, data: [] });
  }
});
