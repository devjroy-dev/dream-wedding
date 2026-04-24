// ══════════════════════════════════════════════════════════════════════════════
// S29: MUSE → BESPOKE FLOW + CONTACT UNLOCK
// ══════════════════════════════════════════════════════════════════════════════
// Add these endpoints to backend/server.js after line 9042 (after muse/save endpoint)

// ─────────────────────────────────────────────────────────────────────────────
// SHORTLIST: Move vendor from Muse to Bespoke
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/couple/muse/shortlist', async (req, res) => {
  try {
    const { save_id, couple_id, event } = req.body || {};
    
    if (!save_id || !couple_id) {
      return res.status(400).json({ success: false, error: 'save_id and couple_id required' });
    }

    // Step 1: Get the moodboard_item details
    const { data: museItem, error: fetchError } = await supabase
      .from('moodboard_items')
      .select('*')
      .eq('id', save_id)
      .eq('user_id', couple_id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!museItem) {
      return res.status(404).json({ success: false, error: 'Muse item not found' });
    }

    const vendor_id = museItem.vendor_id;

    // Step 2: Get vendor details for the Bespoke pin
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id, name, category, city, portfolio_images, featured_photos, tier')
      .eq('id', vendor_id)
      .maybeSingle();

    if (vendorError) throw vendorError;

    const image_url = museItem.vendor_image 
      || vendor?.featured_photos?.[0] 
      || vendor?.portfolio_images?.[0] 
      || null;

    // Step 3: Create Bespoke pin (couple_moodboard_pins)
    const { data: pin, error: pinError } = await supabase
      .from('couple_moodboard_pins')
      .insert([{
        couple_id,
        event: event || museItem.event || 'general',
        pin_type: 'vendor', // Platform vendor
        image_url,
        source_url: null,
        source_domain: 'thedreamwedding.in',
        title: vendor?.name || museItem.vendor_name || 'Vendor',
        note: `${vendor?.category || ''} · ${vendor?.city || ''}`.trim(),
        is_curated: false,
        is_suggestion: false,
        added_by: couple_id,
        added_by_name: null,
        vendor_id, // CRITICAL: Link to vendor
      }])
      .select()
      .single();

    if (pinError) throw pinError;

    // Step 4: Update entity_links (if exists) OR create new one
    const { data: existingLink } = await supabase
      .from('entity_links')
      .select('id')
      .eq('from_entity_id', couple_id)
      .eq('to_entity_id', vendor_id)
      .eq('from_entity_type', 'couple')
      .eq('to_entity_type', 'vendor')
      .maybeSingle();

    if (existingLink) {
      // Update existing link to 'shortlisted_for'
      await supabase
        .from('entity_links')
        .update({ link_type: 'shortlisted_for', updated_at: new Date().toISOString() })
        .eq('id', existingLink.id);
    } else {
      // Create new link
      await supabase
        .from('entity_links')
        .insert([{
          from_entity_type: 'couple',
          from_entity_id: couple_id,
          to_entity_type: 'vendor',
          to_entity_id: vendor_id,
          link_type: 'shortlisted_for',
          metadata: { event: event || 'general' },
        }]);
    }

    // Step 5: Remove from Muse (moodboard_items)
    const { error: deleteError } = await supabase
      .from('moodboard_items')
      .delete()
      .eq('id', save_id);

    if (deleteError) throw deleteError;

    // Step 6: Bump vendor metrics
    bumpVendorMetric(vendor_id, 'shortlists').catch(() => {});
    logVendorActivity(vendor_id, 'shortlisted', 'A couple moved you to their Bespoke board').catch(() => {});

    res.json({ 
      success: true, 
      data: { 
        pin, 
        whatsapp_unlocked: true,
        message: 'Vendor moved to Bespoke. Contact details unlocked.' 
      } 
    });

  } catch (error) {
    console.error('Shortlist error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADD EXTERNAL PIN: Add manual image/link to Bespoke
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/couple/bespoke/add-pin', async (req, res) => {
  try {
    const {
      couple_id,
      event,
      pin_type, // 'image' | 'link' | 'note'
      image_url,
      source_url,
      title,
      note,
    } = req.body || {};

    if (!couple_id || !event || !pin_type) {
      return res.status(400).json({ 
        success: false, 
        error: 'couple_id, event, and pin_type required' 
      });
    }

    // Extract domain from source_url if provided
    let source_domain = null;
    if (source_url) {
      try {
        const url = new URL(source_url);
        source_domain = url.hostname.replace('www.', '');
      } catch {}
    }

    const { data: pin, error } = await supabase
      .from('couple_moodboard_pins')
      .insert([{
        couple_id,
        event,
        pin_type,
        image_url: image_url || null,
        source_url: source_url || null,
        source_domain,
        title: title || null,
        note: note || null,
        is_curated: false,
        is_suggestion: false,
        added_by: couple_id,
        vendor_id: null, // External pin, not linked to vendor
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: pin });

  } catch (error) {
    console.error('Add pin error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CHECK CONTACT UNLOCK: Is vendor's WhatsApp unlocked for this couple?
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/couple/vendor/:vendor_id/contact-status', async (req, res) => {
  try {
    const { vendor_id } = req.params;
    const { couple_id } = req.query;

    if (!couple_id) {
      return res.status(400).json({ success: false, error: 'couple_id query param required' });
    }

    // Check if vendor is shortlisted (in Bespoke)
    const { data: link } = await supabase
      .from('entity_links')
      .select('link_type')
      .eq('from_entity_id', couple_id)
      .eq('to_entity_id', vendor_id)
      .eq('from_entity_type', 'couple')
      .eq('to_entity_type', 'vendor')
      .maybeSingle();

    const isShortlisted = link?.link_type === 'shortlisted_for';

    if (isShortlisted) {
      // Fetch vendor contact details
      const { data: vendor } = await supabase
        .from('vendors')
        .select('phone, email, instagram_handle, show_whatsapp_public')
        .eq('id', vendor_id)
        .maybeSingle();

      res.json({
        success: true,
        whatsapp_unlocked: true,
        contact: {
          phone: vendor?.phone || null,
          email: vendor?.email || null,
          instagram: vendor?.instagram_handle || null,
          show_whatsapp_public: vendor?.show_whatsapp_public || false,
        }
      });
    } else {
      res.json({
        success: true,
        whatsapp_unlocked: false,
        message: 'Shortlist this vendor to unlock contact details'
      });
    }

  } catch (error) {
    console.error('Contact status error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Bump vendor metric (reuse if exists, otherwise add)
// ─────────────────────────────────────────────────────────────────────────────
async function bumpVendorMetric(vendor_id, metric_name) {
  try {
    const { data: analytics } = await supabase
      .from('vendor_analytics')
      .select('*')
      .eq('vendor_id', vendor_id)
      .maybeSingle();

    if (analytics) {
      const updates = {};
      updates[metric_name] = (analytics[metric_name] || 0) + 1;
      await supabase
        .from('vendor_analytics')
        .update(updates)
        .eq('vendor_id', vendor_id);
    } else {
      const row = { vendor_id };
      row[metric_name] = 1;
      await supabase.from('vendor_analytics').insert([row]);
    }
  } catch (error) {
    console.error(`bumpVendorMetric(${metric_name}) failed:`, error.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Log vendor activity
// ─────────────────────────────────────────────────────────────────────────────
async function logVendorActivity(vendor_id, activity_type, description) {
  try {
    await supabase.from('vendor_activity').insert([{
      vendor_id,
      activity_type,
      description,
      created_at: new Date().toISOString(),
    }]);
  } catch (error) {
    console.error('logVendorActivity failed:', error.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// END S29 ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════
