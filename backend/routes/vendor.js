// backend/routes/vendor.js
//
// Vendor REST routes extracted from server.js (Session 8.5d-2, 2026-05-13).
// Factory pattern: module.exports = function(supabase) { return router; }
// Mounted in server.js via: app.use('/api', require('./routes/vendor')(supabase))
//
// Soft-delete filters (deleted_at IS NULL) added to GET list endpoints for:
//   vendor_invoices, vendor_clients, vendor_expenses, vendor_todos,
//   vendor_calendar_events
//
// All route paths unchanged — additive extraction only.

'use strict';
const express = require('express');

module.exports = function vendorRoutes(supabase) {
  const router = express.Router();

// ==================
// LEADS ROUTES
// ==================

router.get('/api/leads/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendor_leads').select('*').eq('vendor_id', req.params.vendorId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/leads', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendor_leads').insert([req.body]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/api/leads/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendor_leads').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// INVOICE ROUTES
// ==================

router.get('/api/invoices/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_invoices')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/invoices', async (req, res) => {
  try {
    const { amount, gst_enabled } = req.body;
    const gst_amount = gst_enabled ? amount * 0.18 : 0;
    const total_amount = amount + gst_amount;
    // Allow-list the columns we actually have in vendor_invoices to avoid
    // "schema cache" errors when the frontend sends extra fields.
    const allowed = [
      'vendor_id', 'client_id', 'client_name', 'client_phone', 'client_email',
      'amount', 'description', 'invoice_number', 'status', 'issue_date',
      'due_date', 'booking_id', 'gst_enabled', 'tds_applicable',
      'tds_deducted_by_client', 'tds_rate', 'tds_amount',
    ];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    payload.gst_amount = gst_amount;
    payload.total_amount = total_amount;
    const { data, error } = await supabase
      .from('vendor_invoices')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('invoices create error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update invoice status
router.patch('/api/invoices/:id', async (req, res) => {
  try {
    const allowed = [
      'status', 'paid_date', 'amount', 'description', 'due_date',
      'client_name', 'client_phone', 'client_email', 'gst_enabled',
      'gst_amount', 'total_amount', 'notes',
    ];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    const { data, error } = await supabase
      .from('vendor_invoices')
      .update(patch)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Mark invoice as paid + optionally log TDS in one call (Turn 9H)
router.post('/api/invoices/:id/mark-paid', async (req, res) => {
  try {
    const { tds_deducted, tds_rate, tds_amount } = req.body || {};
    // Update invoice
    const { data: inv, error: invErr } = await supabase
      .from('vendor_invoices')
      .update({ status: 'paid', paid_date: new Date().toISOString().slice(0, 10) })
      .eq('id', req.params.id)
      .select()
      .single();
    if (invErr) throw invErr;

    let tdsEntry = null;
    if (tds_deducted && inv) {
      const gross = parseInt(inv.amount) || 0;
      const rate = parseFloat(tds_rate) || 10;
      const amount = tds_amount !== undefined ? parseInt(tds_amount) : Math.round((gross * rate) / 100);
      const net = gross - amount;
      const now = new Date();
      const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const financial_year = `FY ${year}-${String(year + 1).slice(-2)}`;
      const { data: tds, error: tdsErr } = await supabase
        .from('vendor_tds_ledger')
        .insert([{
          vendor_id: inv.vendor_id,
          transaction_type: 'invoice',
          reference_id: inv.id,
          reference_type: 'invoice',
          invoice_id: inv.id,
          gross_amount: gross,
          tds_rate: rate,
          tds_amount: amount,
          net_amount: net,
          tds_deducted_by: inv.client_name || null,
          tds_deposited: false,
          financial_year,
        }])
        .select()
        .single();
      if (!tdsErr) tdsEntry = tds;
    }

    res.json({ success: true, data: inv, tds: tdsEntry });
  } catch (error) {
    console.error('mark-paid error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Mark invoice as unpaid (revert)
router.post('/api/invoices/:id/mark-unpaid', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_invoices')
      .update({ status: 'unpaid', paid_date: null })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Full invoice save with TDS tracking
router.post('/api/invoices/save', async (req, res) => {
  try {
    const {
      vendor_id,
      client_name,
      client_phone,
      amount,
      description,
      invoice_number,
      tds_applicable,
      tds_deducted_by_client,
      tds_rate = 10,
      booking_id,
      due_date,
    } = req.body;

    const gst_amount = amount * 0.18;
    const total_amount = amount + gst_amount;
    const tds_amount = tds_applicable ? (amount * tds_rate) / 100 : 0;

    const now = new Date();
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const financial_year = `FY ${year}-${String(year + 1).slice(-2)}`;

    const { data: invoice, error: invoiceError } = await supabase
      .from('vendor_invoices')
      .insert([{
        vendor_id,
        client_name,
        client_phone,
        amount,
        gst_amount,
        total_amount,
        description,
        invoice_number,
        tds_applicable,
        tds_deducted_by_client,
        tds_amount,
        tds_rate,
        booking_id,
        due_date,
        financial_year,
        status: 'issued',
      }])
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Auto-create TDS ledger entry if TDS applicable
    if (tds_applicable && tds_amount > 0) {
      await supabase.from('vendor_tds_ledger').insert([{
        vendor_id,
        transaction_type: 'client_invoice',
        reference_id: invoice.id,
        reference_type: 'invoice',
        gross_amount: amount,
        tds_rate,
        tds_amount,
        net_amount: amount - tds_amount,
        tds_deducted_by: tds_deducted_by_client ? 'client' : 'self',
        tds_deposited: false,
        financial_year,
        notes: `Invoice ${invoice_number} for ${client_name}`,
      }]);
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// NOTIFICATIONS ROUTES
// ==================

router.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', req.params.userId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/api/notifications/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('notifications').update({ read: true }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/notifications/send', async (req, res) => {
  try {
    const { token, title, body, data } = req.body;
    const message = {
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
    };
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    const result = await response.json();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// BENCHMARKING
// ==================

router.get('/api/benchmark/:category/:city', async (req, res) => {
  try {
    const { category, city } = req.params;
    const { data, error } = await supabase
      .from('vendors')
      .select('name, starting_price, max_price, rating')
      .eq('category', category)
      .eq('city', city)
      .eq('subscription_active', true);
    if (error) throw error;
    if (!data || data.length === 0) return res.json({ success: true, data: null });
    const prices = data.map(v => v.starting_price).filter(Boolean);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgRating = (data.reduce((a, b) => a + (b.rating || 0), 0) / data.length).toFixed(1);
    res.json({
      success: true,
      data: {
        category, city, vendorCount: data.length,
        avgStartingPrice: avgPrice,
        minStartingPrice: minPrice,
        maxStartingPrice: maxPrice,
        avgRating,
        vendors: data,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// AVAILABILITY / CALENDAR
// ==================

router.get('/api/availability/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_availability')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .order('blocked_date', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/availability', async (req, res) => {
  try {
    const { vendor_id, blocked_date, reason } = req.body;
    const insertRow = { vendor_id, blocked_date };
    if (reason) insertRow.reason = reason;
    const { data, error } = await supabase
      .from('vendor_availability')
      .insert([insertRow])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/api/availability/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('vendor_availability')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// TDS LEDGER ROUTES
// ==================

router.get('/api/tds/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { financial_year } = req.query;

    let query = supabase
      .from('vendor_tds_ledger')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (financial_year) query = query.eq('financial_year', financial_year);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/tds', async (req, res) => {
  try {
    const {
      vendor_id,
      transaction_type,
      reference_id,
      reference_type,
      gross_amount,
      tds_rate = 10,
      tds_deducted_by,
      tds_deposited = false,
      challan_number,
      pan_of_deductor,
      notes,
    } = req.body;

    const tds_amount = (gross_amount * tds_rate) / 100;
    const net_amount = gross_amount - tds_amount;
    const now = new Date();
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const financial_year = `FY ${year}-${String(year + 1).slice(-2)}`;

    const { data, error } = await supabase
      .from('vendor_tds_ledger')
      .insert([{
        vendor_id,
        transaction_type,
        reference_id,
        reference_type,
        gross_amount,
        tds_rate,
        tds_amount,
        net_amount,
        tds_deducted_by,
        tds_deposited,
        challan_number,
        pan_of_deductor,
        financial_year,
        notes,
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/api/tds/:vendorId/summary', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const now = new Date();
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const financial_year = `FY ${year}-${String(year + 1).slice(-2)}`;

    const { data, error } = await supabase
      .from('vendor_tds_ledger')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('financial_year', financial_year);

    if (error) throw error;

    const totalGross = data.reduce((s, r) => s + (r.gross_amount || 0), 0);
    const totalTDS = data.reduce((s, r) => s + (r.tds_amount || 0), 0);
    const totalNet = data.reduce((s, r) => s + (r.net_amount || 0), 0);
    const platformTDS = data.filter(r => r.tds_deducted_by === 'platform').reduce((s, r) => s + (r.tds_amount || 0), 0);
    const clientTDS = data.filter(r => r.tds_deducted_by === 'client').reduce((s, r) => s + (r.tds_amount || 0), 0);
    const selfTDS = data.filter(r => r.tds_deducted_by === 'self').reduce((s, r) => s + (r.tds_amount || 0), 0);
    const depositedTDS = data.filter(r => r.tds_deposited).reduce((s, r) => s + (r.tds_amount || 0), 0);
    const pendingTDS = totalTDS - depositedTDS;

    res.json({
      success: true,
      data: {
        financial_year,
        total_entries: data.length,
        total_gross_income: totalGross,
        total_tds_deducted: totalTDS,
        total_net_received: totalNet,
        platform_tds: platformTDS,
        client_tds: clientTDS,
        self_declared_tds: selfTDS,
        deposited_tds: depositedTDS,
        pending_tds: pendingTDS,
        entries: data,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// VENDOR CLIENTS ROUTES
// ==================

router.get('/api/vendor-clients/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_clients')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch a single vendor client by id (for client detail view)
router.get('/api/vendor-clients/by-id/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_clients')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/vendor-clients', async (req, res) => {
  try {
    const allowed = [
      'vendor_id', 'name', 'phone', 'email',
      'event_type', 'event_date', 'venue', 'budget',
      'status', 'notes', 'profile_incomplete',
    ];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    const { data, error } = await supabase
      .from('vendor_clients')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/api/vendor-clients/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_clients')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/api/vendor-clients/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('vendor_clients')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// SEED VENDOR DATA
// ==================

router.post('/api/seed', async (req, res) => {
  try {
    const vendors = [
      { name: 'Joseph Radhik', category: 'photographers', city: 'Mumbai', vibe_tags: ['Candid', 'Luxury'], instagram_url: '@josephradhik', starting_price: 300000, max_price: 800000, is_verified: true, rating: 5.0, review_count: 312, subscription_active: true, about: 'One of India\'s most celebrated wedding photographers.', equipment: 'Leica, Nikon D6, DJI Inspire 2', delivery_time: '8-12 weeks', portfolio_images: ['https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800'] },
      { name: 'The Leela Palace', category: 'venues', city: 'Delhi NCR', vibe_tags: ['Luxury', 'Royal'], instagram_url: '@theleela', starting_price: 1500000, max_price: 5000000, is_verified: true, rating: 4.9, review_count: 189, subscription_active: true, about: 'One of India\'s finest luxury wedding venues.', equipment: 'Capacity: 50-2000 guests · Indoor & Outdoor', delivery_time: 'In-house catering included', portfolio_images: ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800'] },
      { name: 'Namrata Soni', category: 'mua', city: 'Mumbai', vibe_tags: ['Luxury', 'Cinematic'], instagram_url: '@namratasoni', starting_price: 150000, max_price: 500000, is_verified: true, rating: 4.9, review_count: 445, subscription_active: true, about: 'Celebrity makeup artist to Bollywood\'s finest.', equipment: 'Charlotte Tilbury, La Mer, Armani Beauty', delivery_time: 'Trial session included', portfolio_images: ['https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800'] },
      { name: 'Sabyasachi Mukherjee', category: 'designers', city: 'Kolkata', vibe_tags: ['Luxury', 'Traditional'], instagram_url: '@sabyasachiofficial', starting_price: 500000, max_price: 3000000, is_verified: true, rating: 5.0, review_count: 892, subscription_active: true, about: 'India\'s most celebrated bridal designer.', equipment: 'Lead time: 6 months · Fully customised', delivery_time: '6 months lead time', portfolio_images: ['https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800'] },
      { name: 'DJ Chetas', category: 'dj', city: 'Mumbai', vibe_tags: ['Festive', 'Luxury'], instagram_url: '@djchetas', starting_price: 500000, max_price: 2000000, is_verified: true, rating: 4.9, review_count: 234, subscription_active: true, about: 'India\'s most sought after celebrity DJ.', equipment: 'Full sound system · LED setup included', delivery_time: 'Setup included', portfolio_images: ['https://images.unsplash.com/photo-1571266028243-d220c6a5d70b?w=800'] },
      { name: 'Wizcraft International', category: 'event-managers', city: 'Mumbai', vibe_tags: ['Luxury', 'Destination'], instagram_url: '@wizcraft', starting_price: 2000000, max_price: 50000000, is_verified: true, rating: 5.0, review_count: 445, subscription_active: true, about: 'India\'s premier luxury event management company.', equipment: 'Full service · Destination weddings specialists', delivery_time: 'Full planning included', portfolio_images: ['https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800'] },
      { name: 'Anmol Jewellers', category: 'jewellery', city: 'Delhi NCR', vibe_tags: ['Luxury', 'Traditional'], instagram_url: '@anmoljewellers', starting_price: 200000, max_price: 10000000, is_verified: true, rating: 4.8, review_count: 189, subscription_active: true, about: 'India\'s finest bridal jewellery designers.', equipment: 'Custom design · Gold & diamond specialists', delivery_time: '3-4 months for custom pieces', portfolio_images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800'] },
      { name: 'Arjun Mehta Photography', category: 'photographers', city: 'Delhi NCR', vibe_tags: ['Candid', 'Editorial'], instagram_url: '@arjunmehta', starting_price: 150000, max_price: 400000, is_verified: true, rating: 4.8, review_count: 156, subscription_active: true, about: 'Editorial wedding photographer based in Delhi.', equipment: 'Canon R5, Sony A7IV', delivery_time: '6-8 weeks', portfolio_images: ['https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=800'] },
      { name: 'Shakti Mohan', category: 'choreographers', city: 'Mumbai', vibe_tags: ['Festive', 'Contemporary'], instagram_url: '@shaktimohan', starting_price: 200000, max_price: 800000, is_verified: true, rating: 5.0, review_count: 312, subscription_active: true, about: 'Bollywood choreographer for sangeet ceremonies.', equipment: 'Full team · Rehearsal space included', delivery_time: '3-4 rehearsal sessions', portfolio_images: ['https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800'] },
      { name: 'Ambika Pillai', category: 'mua', city: 'Delhi NCR', vibe_tags: ['Traditional', 'Luxury'], instagram_url: '@ambika_pillai', starting_price: 100000, max_price: 350000, is_verified: true, rating: 4.9, review_count: 567, subscription_active: true, about: 'India\'s most trusted bridal makeup artist.', equipment: 'MAC, NARS, Huda Beauty', delivery_time: 'Trial session included', portfolio_images: ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800'] },
      { name: 'Umaid Bhawan Palace', category: 'venues', city: 'Jodhpur', vibe_tags: ['Royal', 'Destination', 'Luxury'], instagram_url: '@umaidbhawan', starting_price: 5000000, max_price: 50000000, is_verified: true, rating: 5.0, review_count: 89, subscription_active: true, about: 'The world\'s most spectacular wedding venue.', equipment: 'Capacity: 20-1000 guests · Full palace', delivery_time: 'All inclusive packages', portfolio_images: ['https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800'] },
      { name: 'Tarun Tahiliani', category: 'designers', city: 'Delhi NCR', vibe_tags: ['Luxury', 'Fusion'], instagram_url: '@taruntahiliani', starting_price: 300000, max_price: 2000000, is_verified: true, rating: 4.9, review_count: 445, subscription_active: true, about: 'Pioneer of Indian bridal couture.', equipment: 'Lead time: 4 months · Fully customised', delivery_time: '4 months lead time', portfolio_images: ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800'] },
      { name: 'BTS by Zara', category: 'content-creators', city: 'Mumbai', vibe_tags: ['Candid', 'Cinematic'], instagram_url: '@btsbyzara', starting_price: 50000, max_price: 200000, is_verified: true, rating: 4.9, review_count: 234, subscription_active: true, about: 'Behind the scenes wedding content creator.', equipment: 'iPhone 15 Pro, GoPro, Gimbal', delivery_time: 'Same day reels', portfolio_images: ['https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800'] },
      { name: 'Reel Moments', category: 'content-creators', city: 'Delhi NCR', vibe_tags: ['Cinematic', 'Editorial'], instagram_url: '@reelmoments', starting_price: 40000, max_price: 150000, is_verified: true, rating: 4.8, review_count: 189, subscription_active: true, about: 'Viral wedding reels specialist.', equipment: 'Sony ZV-E1, DJI OM6', delivery_time: '24 hour delivery', portfolio_images: ['https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800'] },
      { name: 'Kapoor Wedding Films', category: 'photographers', city: 'Delhi NCR', vibe_tags: ['Cinematic', 'Luxury'], instagram_url: '@kapoorfilms', starting_price: 200000, max_price: 600000, is_verified: true, rating: 4.9, review_count: 178, subscription_active: true, about: 'Cinematic wedding films that tell your story.', equipment: 'RED Cinema, DJI Ronin', delivery_time: '10-14 weeks', portfolio_images: ['https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800'] },
    ];
    const { data, error } = await supabase.from('vendors').insert(vendors).select();
    if (error) throw error;
    res.json({ success: true, message: `${data.length} vendors seeded!`, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ==================
// CONTRACT ROUTES
// ==================

router.get('/api/contracts/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_contracts')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/contracts', async (req, res) => {
  try {
    const now = new Date();
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const financial_year = `FY ${year}-${String(year + 1).slice(-2)}`;
    const { data, error } = await supabase
      .from('vendor_contracts')
      .insert([{ ...req.body, financial_year }])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/api/contracts/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_contracts')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// EXPENSE ROUTES
// ==================

router.get('/api/expenses/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_expenses')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/expenses', async (req, res) => {
  try {
    const now = new Date();
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const financial_year = `FY ${year}-${String(year + 1).slice(-2)}`;
    const allowed = [
      'vendor_id', 'amount', 'category', 'description', 'expense_date',
      'payment_method', 'notes', 'client_id', 'client_name', 'receipt_url',
    ];
    const payload = { financial_year };
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    const { data, error } = await supabase
      .from('vendor_expenses')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('vendor_expenses')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// BROADCAST ROUTES (Turn 5+6)
// ==================

// List past broadcasts for a vendor
router.get('/api/broadcasts/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_broadcasts')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .order('sent_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Log a broadcast (called after vendor finishes one-at-a-time send flow)
router.post('/api/broadcasts', async (req, res) => {
  try {
    const { vendor_id, template, message, recipient_count, sent_count } = req.body;
    const { data, error } = await supabase
      .from('vendor_broadcasts')
      .insert([{
        vendor_id, template: template || null, message,
        recipient_count: recipient_count || 0,
        sent_count: sent_count || 0,
      }])
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// TAX & TDS CSV EXPORT
// ==================

router.get('/api/tds/:vendorId/export', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { financial_year } = req.query;
    let query = supabase
      .from('vendor_tds_ledger')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: true });
    if (financial_year) query = query.eq('financial_year', financial_year);
    const { data, error } = await query;
    if (error) throw error;

    // Build CSV — CA-ready format
    const headers = ['Date', 'FY', 'Transaction Type', 'Reference', 'Gross Amount', 'TDS Rate', 'TDS Amount', 'Net Amount', 'Deducted By', 'Notes'];
    const rows = (data || []).map(r => [
      r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
      r.financial_year || '',
      r.transaction_type || '',
      r.reference_id || '',
      r.gross_amount || 0,
      r.tds_rate || 0,
      r.tds_amount || 0,
      r.net_amount || 0,
      r.tds_deducted_by || '',
      (r.notes || '').replace(/,/g, ';').replace(/\n/g, ' '),
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const filename = `tds-ledger-${financial_year ? financial_year.replace(/\s+/g, '-') : 'all'}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// TO-DO ROUTES (Turn 7b)
// ==================

router.get('/api/todos/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_todos')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .is('deleted_at', null)
      .order('done', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/todos', async (req, res) => {
  try {
    const allowed = [
      'vendor_id', 'title', 'due_date', 'notes', 'done',
      'assigned_to', 'client_id', 'client_name',
    ];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    const { data, error } = await supabase
      .from('vendor_todos')
      .insert([payload])
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/api/todos/:id', async (req, res) => {
  try {
    const allowed = [
      'title', 'due_date', 'notes', 'done',
      'assigned_to', 'client_id', 'client_name',
    ];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    const { data, error } = await supabase
      .from('vendor_todos')
      .update(patch)
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/api/todos/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('vendor_todos').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// REMINDER ROUTES (Turn 9F)
// ==================

router.get('/api/reminders/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_reminders')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .order('remind_date', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/reminders', async (req, res) => {
  try {
    const allowed = ['vendor_id', 'title', 'remind_date', 'remind_time', 'notes', 'done'];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    const { data, error } = await supabase
      .from('vendor_reminders').insert([payload]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/api/reminders/:id', async (req, res) => {
  try {
    const allowed = ['title', 'remind_date', 'remind_time', 'notes', 'done'];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    const { data, error } = await supabase
      .from('vendor_reminders').update(patch).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/api/reminders/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('vendor_reminders').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// CALENDAR EVENT ROUTES (Turn 7b)
// ==================

router.get('/api/events/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_calendar_events')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .is('deleted_at', null)
      .order('event_date', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/events', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_calendar_events')
      .insert([req.body])
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/api/events/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_calendar_events')
      .update(req.body)
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/api/events/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('vendor_calendar_events').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// PAYMENT SCHEDULE ROUTES
// ==================

router.get('/api/payment-schedules/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_payment_schedules')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/payment-schedules', async (req, res) => {
  try {
    const allowed = [
      'vendor_id', 'client_id', 'client_name', 'client_phone',
      'booking_id', 'instalments',
    ];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    const { data, error } = await supabase
      .from('vendor_payment_schedules')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;

    // Auto-create calendar events for each instalment with a due_date (Turn 9H)
    if (data && Array.isArray(data.instalments)) {
      const calendarEvents = [];
      for (const inst of data.instalments) {
        if (inst.due_date && inst.amount) {
          calendarEvents.push({
            vendor_id: data.vendor_id,
            title: `${inst.label || 'Payment'} due: ${data.client_name || 'Client'}`,
            event_date: inst.due_date,
            type: 'payment',
            amount: parseInt(inst.amount) || 0,
            notes: `₹${(parseInt(inst.amount) || 0).toLocaleString('en-IN')} from ${data.client_name || 'client'}`,
            source_type: 'payment_schedule',
            source_id: data.id,
          });
        }
      }
      if (calendarEvents.length > 0) {
        await supabase.from('vendor_calendar_events').insert(calendarEvents);
      }
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('payment-schedules create error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/api/payment-schedules/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_payment_schedules')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// TEAM MEMBER ROUTES
// ==================

router.get('/api/team/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_team_members')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .eq('active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/team', async (req, res) => {
  try {
    const allowed = [
      'vendor_id', 'name', 'phone', 'email', 'role',
      'rate', 'rate_unit', 'active', 'status', 'notes', 'permissions',
    ];
    const payload = { active: true };
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    const { data, error } = await supabase
      .from('vendor_team_members')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/api/team/:id', async (req, res) => {
  try {
    const allowed = [
      'name', 'phone', 'email', 'role',
      'rate', 'rate_unit', 'active', 'status', 'notes', 'permissions',
    ];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    const { data, error } = await supabase
      .from('vendor_team_members')
      .update(patch)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/api/team/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('vendor_team_members')
      .update({ active: false })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// TEAM PAYMENTS (Turn 9I)
// Track what vendor owes each team member per event/task.
// ==================

router.get('/api/team-payments/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_team_payments')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/team-payments', async (req, res) => {
  try {
    const allowed = [
      'vendor_id', 'team_member_id', 'amount', 'label',
      'booking_id', 'task_id', 'status', 'paid_date', 'notes',
    ];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    const { data, error } = await supabase
      .from('vendor_team_payments')
      .insert([payload])
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/api/team-payments/:id', async (req, res) => {
  try {
    const allowed = ['amount', 'label', 'status', 'paid_date', 'notes'];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    if (patch.status === 'paid' && !patch.paid_date) {
      patch.paid_date = new Date().toISOString().slice(0, 10);
    }
    const { data, error } = await supabase
      .from('vendor_team_payments')
      .update(patch)
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/api/team-payments/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('vendor_team_payments')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// TEAM BROADCASTS (Turn 9I)
// Log of announcements sent to team (via WhatsApp external).
// ==================

router.get('/api/team-broadcasts/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_team_broadcasts')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/team-broadcasts', async (req, res) => {
  try {
    const allowed = ['vendor_id', 'message', 'recipient_ids', 'recipient_count', 'template_key'];
    const payload = {};
    for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
    const { data, error } = await supabase
      .from('vendor_team_broadcasts')
      .insert([payload])
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


  return router;
};
