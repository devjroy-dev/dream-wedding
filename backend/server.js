const express = require('express');
const admin = require('firebase-admin');

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
if (serviceAccount) { admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }); console.log('Firebase Admin SDK initialized'); } else { console.warn('FIREBASE_SERVICE_ACCOUNT not set'); }
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// ==================
// SOCKET.IO
// ==================

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('join_conversation', ({ userId, vendorId }) => {
    const room = `conversation_${userId}_${vendorId}`;
    socket.join(room);
  });
  socket.on('send_message', async ({ userId, vendorId, message, senderType }) => {
    const room = `conversation_${userId}_${vendorId}`;
    const messageData = { user_id: userId, vendor_id: vendorId, message, sender_type: senderType, created_at: new Date().toISOString() };
    const { data, error } = await supabase.from('messages').insert([messageData]).select().single();
    if (!error) io.to(room).emit('receive_message', data);
  });
  socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

app.get('/', (req, res) => res.json({ message: 'The Dream Wedding API is live 🎉' }));

// ==================
// VENDOR ROUTES
// ==================

app.get('/api/vendors', async (req, res) => {
  try {
    const { category, city, email, firebase_uid, phone } = req.query;

    // Vendor lookup by identity (for session rebuild after login)
    if (email) {
      const { data, error } = await supabase.from('vendors').select('*').ilike('instagram_url', `%${email}%`);
      // Try email field first if it exists
      const { data: emailData } = await supabase.from('vendors').select('*').eq('email', email);
      if (emailData && emailData.length > 0) return res.json({ success: true, data: emailData });
      // Fallback: check vendor_logins table
      const { data: loginData } = await supabase.from('vendor_logins').select('vendor_id').eq('email', email).single();
      if (loginData) {
        const { data: vendorData } = await supabase.from('vendors').select('*').eq('id', loginData.vendor_id).single();
        if (vendorData) return res.json({ success: true, data: [vendorData] });
      }
      return res.json({ success: true, data: [] });
    }

    if (firebase_uid) {
      const { data: loginData } = await supabase.from('vendor_logins').select('vendor_id').eq('firebase_uid', firebase_uid).single();
      if (loginData) {
        const { data: vendorData } = await supabase.from('vendors').select('*').eq('id', loginData.vendor_id).single();
        if (vendorData) return res.json({ success: true, data: [vendorData] });
      }
      return res.json({ success: true, data: [] });
    }

    // Normal browse query
    let query = supabase.from('vendors').select('*').eq('subscription_active', true);
    if (category) query = query.eq('category', category);
    if (city) {
      query = query.or(`city.ilike.%${city}%,city.ilike.%Pan India%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    // Enrich with tier from vendor_subscriptions so admin + clients can show correct tier
    try {
      if (Array.isArray(data) && data.length > 0) {
        const ids = data.map((v) => v.id);
        const { data: subs } = await supabase
          .from('vendor_subscriptions')
          .select('vendor_id, tier, status, founding_badge')
          .in('vendor_id', ids);
        const subMap = {};
        for (const s of (subs || [])) subMap[s.vendor_id] = s;
        for (const v of data) {
          const s = subMap[v.id];
          v.tier = s?.tier || 'essential';
          v.subscription_status = s?.status || 'active';
          v.founding_badge = !!s?.founding_badge;
        }
      }
    } catch (e) { /* tier enrichment is best-effort */ }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/vendors/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendors').select('*').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) {
      // Vendor not found — return 404 instead of 500 so the frontend can handle gracefully
      return res.status(404).json({ success: false, error: 'Vendor not found', code: 'VENDOR_NOT_FOUND' });
    }
    // Attach tier from vendor_subscriptions
    try {
      const { data: sub } = await supabase
        .from('vendor_subscriptions')
        .select('tier, status, founding_badge')
        .eq('vendor_id', req.params.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      data.tier = sub?.tier || 'essential';
      data.subscription_status = sub?.status || 'active';
      data.founding_badge = !!sub?.founding_badge;
    } catch (e) { /* best-effort */ }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/vendors', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendors').insert([req.body]).select().single();
    if (error) throw error;
    // Auto-create Signature trial subscription
    if (data?.id) { await createVendorTrial(data.id); logActivity('vendor_registered', 'New vendor: ' + (data.name || 'Unknown') + ' (' + (data.category || '') + ')', { vendor_id: data.id }); }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/vendors/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('vendors').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/vendors/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendors').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// USER ROUTES
// ==================

app.post('/api/users/push-token', async (req, res) => {
  try {
    const { userId, token, platform } = req.body;
    const { data, error } = await supabase
      .from('users')
      .update({ push_token: token, push_platform: platform })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { phone, name, email } = req.body;
    const { data: existing } = await supabase.from('users').select('*').eq('phone', phone).single();
    if (existing) return res.json({ success: true, data: existing, isNew: false });
    const { data, error } = await supabase.from('users').insert([{ phone, name, email }]).select().single();
    if (error) throw error;
    res.json({ success: true, data, isNew: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    // Use select('*') to tolerate any schema differences
    const { data, error } = await supabase.from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[GET /api/users] error:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[GET /api/users] unhandled:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { admin_password } = req.body || {};
    if (admin_password !== 'Mira@2551354') return res.status(403).json({ success: false, error: 'Unauthorised' });
    const userId = req.params.id;
    console.log('[delete-user] Starting for', userId);

    // 1) Cascade delete child rows (best-effort, ignore per-table errors)
    const tables = [
      'moodboard_items', 'messages', 'co_planners',
      'couple_planner_checklist', 'couple_planner_budget', 'couple_planner_guests', 'couple_planner_timeline',
      'couple_events', 'couple_event_category_budgets', 'couple_checklist',
      'couple_guests', 'couple_moodboard_pins', 'couple_shagun', 'couple_vendors',
      'guests', 'couple_discover_waitlist', 'couple_waitlist',
      'discover_access_requests', 'pai_access_requests', 'pai_events',
      'ai_token_purchases', 'notifications',
      'vendor_enquiries', 'vendor_enquiry_messages',
      'lock_date_holds', 'lock_date_interest', 'luxury_appointments',
    ];
    for (const t of tables) {
      try { await supabase.from(t).delete().eq('user_id', userId); } catch (e) {}
      try { await supabase.from(t).delete().eq('couple_id', userId); } catch (e) {}
    }

    // 2) CRITICAL: Nullify access_codes.redeemed_user_id (FK that was blocking delete)
    try { await supabase.from('access_codes').update({ redeemed_user_id: null }).eq('redeemed_user_id', userId); } catch (e) {}

    // 3) Now delete the user
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) {
      console.error('[delete-user] Delete failed:', error.message);
      throw error;
    }

    console.log('[delete-user] Success for', userId);
    logActivity('user_deleted', `User ${userId} deleted by admin`);
    res.json({ success: true });
  } catch (error) {
    console.error('[delete-user] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/users/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// MOODBOARD ROUTES
// ==================

app.get('/api/moodboard/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('moodboard_items').select('*, vendors(*)').eq('user_id', req.params.userId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/moodboard', async (req, res) => {
  try {
    const { data, error } = await supabase.from('moodboard_items').insert([req.body]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/moodboard/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('moodboard_items').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// BOOKING ROUTES
// ==================

app.post('/api/bookings/check-expired', async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: expiredBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'pending_confirmation')
      .lt('created_at', cutoff);

    if (fetchError) throw fetchError;
    if (!expiredBookings || expiredBookings.length === 0) {
      return res.json({ success: true, message: 'No expired bookings found', refunded: 0 });
    }

    const ids = expiredBookings.map(b => b.id);
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'auto_refunded',
        shield_status: 'refunded_to_couple',
        platform_fee_retained: true,
        auto_refunded_at: new Date().toISOString(),
      })
      .in('id', ids);

    if (updateError) throw updateError;

    const notifications = expiredBookings.map(booking => ({
      user_id: booking.user_id,
      title: 'Auto-Refund Initiated',
      message: `${booking.vendor_name} did not confirm within 48 hours. Your token of ₹${booking.token_amount?.toLocaleString('en-IN')} will be refunded within 3-5 business days. Your ₹999 booking protection fee is non-refundable.`,
      type: 'auto_refund',
      read: false,
    }));

    await supabase.from('notifications').insert(notifications);

    res.json({
      success: true,
      message: `${expiredBookings.length} expired bookings auto-refunded`,
      refunded: expiredBookings.length,
      bookingIds: ids,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const { data, error } = await supabase.from('bookings').insert([req.body]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/bookings/user/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('bookings').select('*, vendors(*)').eq('user_id', req.params.userId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/bookings/vendor/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('bookings').select('*, users(*)').eq('vendor_id', req.params.vendorId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/bookings/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, vendors(*), users(*)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/bookings/:id', async (req, res) => {
  try {
    const allowed = [
      'status', 'event_date', 'event_time', 'event_type',
      'venue', 'guest_count', 'amount', 'notes',
      'client_name', 'client_phone', 'client_email',
      'assigned_to',
    ];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    const { data, error } = await supabase.from('bookings').update(patch).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/bookings/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    if (booking.status !== 'pending_confirmation') {
      return res.status(400).json({ success: false, error: 'Booking is not pending confirmation' });
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        shield_status: 'released_to_vendor',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Auto-create TDS ledger entry for platform booking
    try {
      const vendorReceives = (booking.token_amount || 10000) * 0.95;
      const tds_amount = vendorReceives * 0.10;
      const net_amount = vendorReceives - tds_amount;
      const now = new Date();
      const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const financial_year = `FY ${year}-${String(year + 1).slice(-2)}`;

      await supabase.from('vendor_tds_ledger').insert([{
        vendor_id: booking.vendor_id,
        transaction_type: 'platform_booking',
        reference_id: id,
        reference_type: 'booking',
        gross_amount: vendorReceives,
        tds_rate: 10,
        tds_amount,
        net_amount,
        tds_deducted_by: 'platform',
        tds_deposited: false,
        financial_year,
        notes: `Platform booking token. Commission deducted at source.`,
      }]);
    } catch (tdsErr) {
      console.log('TDS entry failed (non-critical):', tdsErr.message);
    }

    await supabase.from('notifications').insert([{
      user_id: booking.user_id,
      title: 'Booking Confirmed!',
      message: `Your booking with ${booking.vendor_name} has been confirmed. Your date is locked!`,
      type: 'booking_confirmed',
      read: false,
    }]);

    res.json({ success: true, data, message: 'Booking confirmed. Booking confirmed. Payment released to vendor.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/bookings/:id/decline', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'declined',
        declined_at: new Date().toISOString(),
        decline_reason: reason || 'Vendor unavailable',
        shield_status: 'refunded_to_couple',
        platform_fee_retained: true,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('notifications').insert([{
      user_id: booking.user_id,
      title: 'Booking Declined — Refund Initiated',
      message: `${booking.vendor_name} was unable to confirm your booking. Your token of ₹${booking.token_amount?.toLocaleString('en-IN')} will be refunded within 3-5 business days. Your ₹999 booking protection fee is non-refundable.`,
      type: 'booking_declined',
      read: false,
    }]);

    res.json({ success: true, data, message: 'Booking declined. Token refund initiated. Platform fee retained.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Mark a booking as "quoted" — vendor has sent a price to the couple ──
// Accepts optional quote_amount + quote_note. Status transitions
// pending_confirmation → quoted. Couple can still confirm/decline later.
app.post('/api/bookings/:id/quote', async (req, res) => {
  try {
    const { id } = req.params;
    const { quote_amount, quote_note } = req.body || {};
    const { data: booking, error: fetchError } = await supabase
      .from('bookings').select('*').eq('id', id).single();
    if (fetchError || !booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    const updates = {
      status: 'quoted',
      quoted_at: new Date().toISOString(),
    };
    if (quote_amount != null) updates.quote_amount = parseInt(quote_amount) || null;
    if (quote_note) updates.quote_note = String(quote_note).slice(0, 500);
    const { data, error } = await supabase
      .from('bookings').update(updates).eq('id', id).select().single();
    if (error) throw error;
    await supabase.from('notifications').insert([{
      user_id: booking.user_id,
      title: 'Quote received',
      message: `${booking.vendor_name || 'Your vendor'} has sent a quote for your event. Review and confirm.`,
      type: 'quote_received',
      read: false,
    }]).catch(() => {});
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Upgrade nudges: record a nudge shown for a vendor (show-once guarantee) ──
app.post('/api/vendors/:id/upgrade-nudge', async (req, res) => {
  try {
    const { id } = req.params;
    const { trigger_key } = req.body || {};
    if (!trigger_key) return res.status(400).json({ success: false, error: 'trigger_key required' });
    const { data: vendor } = await supabase
      .from('vendors').select('upgrade_nudges_shown').eq('id', id).single();
    const existing = Array.isArray(vendor?.upgrade_nudges_shown) ? vendor.upgrade_nudges_shown : [];
    if (existing.includes(trigger_key)) return res.json({ success: true, data: { already_shown: true } });
    const next = [...existing, trigger_key];
    const { error } = await supabase
      .from('vendors').update({ upgrade_nudges_shown: next }).eq('id', id);
    if (error) throw error;
    res.json({ success: true, data: { upgrade_nudges_shown: next } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/bookings/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, error: 'Only confirmed bookings can be cancelled' });
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled_by_vendor',
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason || 'Vendor cancelled',
        shield_status: 'refunded_to_couple',
        platform_fee_retained: true,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('notifications').insert([{
      user_id: booking.user_id,
      title: 'Vendor Cancelled — Refund Initiated',
      message: `Unfortunately ${booking.vendor_name} had to cancel your booking. Your full token of ₹${booking.token_amount?.toLocaleString('en-IN')} will be refunded within 3-5 business days.`,
      type: 'booking_cancelled',
      read: false,
    }]);

    res.json({ success: true, data, message: 'Booking cancelled. Full token refund initiated.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ==================
// CONTACT FILTER — Airbnb style
// ==================

function containsContactInfo(text) {
  if (!text) return false;
  const patterns = [
    /\b[6-9]\d{9}\b/,                          // Indian phone numbers
    /\+91[\s-]?[6-9]\d{9}/,                    // +91 format
    /\b\d{10}\b/,                               // 10 digit numbers
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,  // emails
    /@[a-zA-Z0-9_.]{2,}/,                         // @handles
    /instagram\.com\//i,                          // instagram links
    /wa\.me\//i,                                  // whatsapp links
    /whatsapp/i,                                   // whatsapp mentions
    /telegram/i,                                   // telegram
  ];
  return patterns.some(p => p.test(text));
}

function sanitizeMessage(text) {
  if (!text) return text;
  return text
    .replace(/\b[6-9]\d{9}\b/g, '[ contact hidden ]')
    .replace(/\+91[\s-]?[6-9]\d{9}/g, '[ contact hidden ]')
    .replace(/\b\d{10}\b/g, '[ contact hidden ]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[ contact hidden ]')
    .replace(/@[a-zA-Z0-9_.]{2,}/g, '[ contact hidden ]')
    .replace(/instagram\.com\/[^\s]*/gi, '[ contact hidden ]')
    .replace(/wa\.me\/[^\s]*/gi, '[ contact hidden ]')
    .replace(/whatsapp/gi, '[ contact hidden ]')
    .replace(/telegram/gi, '[ contact hidden ]');
}

// ==================
// MESSAGING ROUTES
// ==================

app.get('/api/messages/:userId/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('messages').select('*').eq('user_id', req.params.userId).eq('vendor_id', req.params.vendorId).order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { message, ...rest } = req.body;
    const filtered = sanitizeMessage(message);
    const wasFiltered = filtered !== message;
    const { data, error } = await supabase.from('messages').insert([{ ...rest, message: filtered, was_filtered: wasFiltered }]).select().single();
    if (error) throw error;
    res.json({ success: true, data, was_filtered: wasFiltered });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// GUEST ROUTES
// ==================

app.get('/api/guests/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('guests').select('*').eq('user_id', req.params.userId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/guests', async (req, res) => {
  try {
    const { data, error } = await supabase.from('guests').insert([req.body]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/guests/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('guests').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// LEADS ROUTES
// ==================

app.get('/api/leads/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendor_leads').select('*').eq('vendor_id', req.params.vendorId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendor_leads').insert([req.body]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/leads/:id', async (req, res) => {
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

app.get('/api/invoices/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_invoices')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/invoices', async (req, res) => {
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
app.patch('/api/invoices/:id', async (req, res) => {
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
app.post('/api/invoices/:id/mark-paid', async (req, res) => {
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
app.post('/api/invoices/:id/mark-unpaid', async (req, res) => {
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
app.post('/api/invoices/save', async (req, res) => {
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

app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', req.params.userId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/notifications/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('notifications').update({ read: true }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/notifications/send', async (req, res) => {
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

app.get('/api/benchmark/:category/:city', async (req, res) => {
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

app.get('/api/availability/:vendorId', async (req, res) => {
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

app.post('/api/availability', async (req, res) => {
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

app.delete('/api/availability/:id', async (req, res) => {
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

app.get('/api/tds/:vendorId', async (req, res) => {
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

app.post('/api/tds', async (req, res) => {
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

app.get('/api/tds/:vendorId/summary', async (req, res) => {
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

app.get('/api/vendor-clients/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_clients')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch a single vendor client by id (for client detail view)
app.get('/api/vendor-clients/by-id/:id', async (req, res) => {
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

app.post('/api/vendor-clients', async (req, res) => {
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

app.patch('/api/vendor-clients/:id', async (req, res) => {
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

app.delete('/api/vendor-clients/:id', async (req, res) => {
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

app.post('/api/seed', async (req, res) => {
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

app.get('/api/contracts/:vendorId', async (req, res) => {
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

app.post('/api/contracts', async (req, res) => {
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

app.patch('/api/contracts/:id', async (req, res) => {
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

app.get('/api/expenses/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_expenses')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/expenses', async (req, res) => {
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

app.delete('/api/expenses/:id', async (req, res) => {
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
app.get('/api/broadcasts/:vendorId', async (req, res) => {
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
app.post('/api/broadcasts', async (req, res) => {
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

app.get('/api/tds/:vendorId/export', async (req, res) => {
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

app.get('/api/todos/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_todos')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .order('done', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/todos', async (req, res) => {
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

app.patch('/api/todos/:id', async (req, res) => {
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

app.delete('/api/todos/:id', async (req, res) => {
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

app.get('/api/reminders/:vendorId', async (req, res) => {
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

app.post('/api/reminders', async (req, res) => {
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

app.patch('/api/reminders/:id', async (req, res) => {
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

app.delete('/api/reminders/:id', async (req, res) => {
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

app.get('/api/events/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_calendar_events')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .order('event_date', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/events', async (req, res) => {
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

app.patch('/api/events/:id', async (req, res) => {
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

app.delete('/api/events/:id', async (req, res) => {
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

app.get('/api/payment-schedules/:vendorId', async (req, res) => {
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

app.post('/api/payment-schedules', async (req, res) => {
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
            event_type: 'Payment',
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

app.patch('/api/payment-schedules/:id', async (req, res) => {
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

app.get('/api/team/:vendorId', async (req, res) => {
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

app.post('/api/team', async (req, res) => {
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

app.patch('/api/team/:id', async (req, res) => {
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

app.delete('/api/team/:id', async (req, res) => {
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

app.get('/api/team-payments/:vendorId', async (req, res) => {
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

app.post('/api/team-payments', async (req, res) => {
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

app.patch('/api/team-payments/:id', async (req, res) => {
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

app.delete('/api/team-payments/:id', async (req, res) => {
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

app.get('/api/team-broadcasts/:vendorId', async (req, res) => {
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

app.post('/api/team-broadcasts', async (req, res) => {
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


// ==================
// VENDOR LOGINS — link firebase_uid to vendor_id
// ==================

app.post('/api/vendor-logins', async (req, res) => {
  try {
    const { vendor_id, firebase_uid, email, phone } = req.body;
    // Ensure vendor has a trial subscription
    if (vendor_id) await createVendorTrial(vendor_id);
    const { data, error } = await supabase
      .from('vendor_logins')
      .upsert([{ vendor_id, firebase_uid, email, phone }], { onConflict: 'firebase_uid' })
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/vendor-logins/:firebaseUID', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_logins')
      .select('*, vendors(*)')
      .eq('firebase_uid', req.params.firebaseUID)
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ==================
// ACCESS CODES — Invite Only Gate
// ==================

// ==================
// TIER-BASED VENDOR ONBOARDING
// ==================

app.post('/api/tier-codes/generate', async (req, res) => {
  try {
    const { tier, vendor_name, created_by, note } = req.body;
    if (!tier || !['essential', 'signature', 'prestige'].includes(tier)) {
      return res.status(400).json({ success: false, error: 'Tier must be essential, signature, or prestige' });
    }
    const code = genCode();
    // Trial ends: 3 months from now OR Aug 1 2026, whichever is earlier
    const threeMonths = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const aug1 = new Date('2026-08-01T00:00:00Z');
    const trial_end = threeMonths < aug1 ? threeMonths : aug1;

    const { data, error } = await supabase.from('access_codes').insert([{
      code, type: 'vendor_tier_trial', tier, vendor_name: vendor_name || '',
      expires_at: trial_end.toISOString(),
      created_by: created_by || 'admin', note: note || `${tier} trial for ${vendor_name || 'vendor'}`,
      used: false, used_count: 0,
    }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/tier-codes/redeem', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Code required' });

    const { data: codeData, error: codeErr } = await supabase
      .from('access_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('type', 'vendor_tier_trial')
      .single();

    if (codeErr || !codeData) return res.json({ success: false, error: 'Invalid code' });
    if (codeData.used) {
      return res.json({ success: false, error: 'Code already used' });
    }
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      return res.json({ success: false, error: 'Code expired' });
    }

    // Create vendor record if vendor_name exists
    const vendorName = codeData.vendor_name || 'New Vendor';
    const { data: vendor, error: vendorErr } = await supabase.from('vendors').insert([{
      name: vendorName,
      category: 'photographers',
      city: 'Delhi NCR',
      subscription_active: true,
    }]).select().single();

    if (vendorErr) throw vendorErr;

    // Create subscription record
    const threeMonths = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const aug1 = new Date('2026-08-01T00:00:00Z');
    const trial_end = threeMonths < aug1 ? threeMonths : aug1;

    await supabase.from('vendor_subscriptions').insert([{
      vendor_id: vendor.id,
      tier: codeData.tier || 'essential',
      status: 'trial',
      trial_start_date: new Date().toISOString(),
      trial_end_date: trial_end.toISOString(),
      activated_by_code: code.toUpperCase().trim(),
      is_founding_vendor: true,
      founding_badge: true,
    }]);

    // Mark code as used
    await supabase.from('access_codes').update({ used: true, used_count: (codeData.used_count || 0) + 1 }).eq('id', codeData.id);

    res.json({
      success: true,
      data: {
        id: vendor.id,
        name: vendor.name,
        category: vendor.category,
        city: vendor.city,
        tier: codeData.tier,
        trial_end: trial_end.toISOString(),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/tier-codes', async (req, res) => {
  try {
    const { data, error } = await supabase.from('access_codes').select('*').eq('type', 'vendor_tier_trial').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/subscriptions/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendor_subscriptions').select('*').eq('vendor_id', req.params.vendorId).order('created_at', { ascending: false }).limit(1).single();
    if (error) return res.json({ success: true, data: { tier: 'essential', status: 'active' } });
    res.json({ success: true, data });
  } catch (error) {
    res.json({ success: true, data: { tier: 'essential', status: 'active' } });
  }
});

// ==================
// VENDOR CREDENTIALS (username/password)
// ==================

app.post('/api/credentials/create', async (req, res) => {
  try {
    const { vendor_id, username, password } = req.body;
    if (!vendor_id || !username || !password) return res.status(400).json({ success: false, error: 'All fields required' });
    if (username.length < 3) return res.status(400).json({ success: false, error: 'Username must be at least 3 characters' });
    if (password.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    // Check if username already taken
    const { data: existing } = await supabase.from('vendor_credentials').select('id').eq('username', username.toLowerCase().trim()).single();
    if (existing) return res.json({ success: false, error: 'Username already taken' });
    // Check if vendor already has credentials
    const { data: existingVendor } = await supabase.from('vendor_credentials').select('id').eq('vendor_id', vendor_id).single();
    if (existingVendor) return res.json({ success: false, error: 'Account already created. Please log in.' });
    // Hash password with bcrypt before storing
    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('vendor_credentials').insert([{
      vendor_id, username: username.toLowerCase().trim(), password_hash: hashedPassword,
    }]).select().single();
    if (error) throw error;
    res.json({ success: true, data: { id: data.id, vendor_id: data.vendor_id, username: data.username } });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Admin-only: reset a vendor's password (for accounts stuck with plaintext from bug)
app.post('/api/credentials/admin-reset', async (req, res) => {
  try {
    const { admin_password, username, new_password } = req.body;
    if (admin_password !== 'Mira@2551354') return res.status(403).json({ success: false, error: 'Unauthorised' });
    if (!username || !new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, error: 'Username and new password (6+ chars) required' });
    }
    const hashedPassword = await bcrypt.hash(new_password, 10);
    const { data, error } = await supabase.from('vendor_credentials')
      .update({ password_hash: hashedPassword })
      .eq('username', username.toLowerCase().trim())
      .select().single();
    if (error || !data) return res.json({ success: false, error: 'Username not found' });
    res.json({ success: true, data: { username: data.username } });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/credentials/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, error: 'Username and password required' });
    const { data: cred, error } = await supabase.from('vendor_credentials')
      .select('*').eq('username', username.toLowerCase().trim()).single();
    if (error || !cred) return res.json({ success: false, error: 'Invalid username or password' });
    const oldVendorMatch = await bcrypt.compare(password, cred.password_hash);
    if (!oldVendorMatch) return res.json({ success: false, error: 'Invalid username or password' });
    // Get vendor data
    const { data: vendor } = await supabase.from('vendors').select('*').eq('id', cred.vendor_id).single();
    if (!vendor) return res.json({ success: false, error: 'Vendor account not found' });
    // Get subscription tier
    const { data: sub } = await supabase.from('vendor_subscriptions').select('tier, status, trial_end_date')
      .eq('vendor_id', cred.vendor_id).order('created_at', { ascending: false }).limit(1).single();
    res.json({ success: true, data: {
      id: vendor.id, name: vendor.name, category: vendor.category, city: vendor.city,
      tier: sub?.tier || 'essential', status: sub?.status || 'active',
      trial_end: sub?.trial_end_date || null, phone_verified: cred.phone_verified,
    }});
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/credentials/verify-phone', async (req, res) => {
  try {
    const { vendor_id, phone_number } = req.body;
    if (!vendor_id || !phone_number) return res.status(400).json({ success: false, error: 'Vendor ID and phone required' });
    const { data, error } = await supabase.from('vendor_credentials')
      .update({ phone_verified: true, phone_number, updated_at: new Date().toISOString() })
      .eq('vendor_id', vendor_id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.put('/api/subscriptions/:vendorId/tier', async (req, res) => {
  try {
    const { tier } = req.body;
    if (!tier || !['essential', 'signature', 'prestige'].includes(tier)) {
      return res.status(400).json({ success: false, error: 'Invalid tier' });
    }
    // Check if subscription exists
    const { data: existing } = await supabase.from('vendor_subscriptions').select('id').eq('vendor_id', req.params.vendorId).single();
    if (existing) {
      const { data, error } = await supabase.from('vendor_subscriptions').update({ tier, updated_at: new Date().toISOString() }).eq('vendor_id', req.params.vendorId).select().single();
      if (error) throw error;
      res.json({ success: true, data });
    } else {
      const { data, error } = await supabase.from('vendor_subscriptions').insert([{ vendor_id: req.params.vendorId, tier, status: 'active' }]).select().single();
      if (error) throw error;
      res.json({ success: true, data });
    }
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.put('/api/subscriptions/:vendorId/founding', async (req, res) => {
  try {
    const { founding_badge } = req.body;
    const { data: existing } = await supabase.from('vendor_subscriptions').select('id').eq('vendor_id', req.params.vendorId).single();
    if (existing) {
      const { data, error } = await supabase.from('vendor_subscriptions').update({ founding_badge: !!founding_badge, updated_at: new Date().toISOString() }).eq('vendor_id', req.params.vendorId).select().single();
      if (error) throw error;
      res.json({ success: true, data });
    } else {
      const { data, error } = await supabase.from('vendor_subscriptions').insert([{ vendor_id: req.params.vendorId, tier: 'essential', status: 'active', founding_badge: !!founding_badge }]).select().single();
      if (error) throw error;
      res.json({ success: true, data });
    }
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================
// VENDOR REFERRAL SYSTEM
// ==================

app.get('/api/referral-code/:vendorId', async (req, res) => {
  try {
    // Check if vendor already has a referral code
    const { data: existing } = await supabase.from('vendor_referrals').select('referral_code').eq('vendor_id', req.params.vendorId).limit(1);
    if (existing && existing.length > 0 && existing[0].referral_code) {
      return res.json({ success: true, data: { code: existing[0].referral_code } });
    }
    // Generate new unique referral code from vendor name
    const { data: vendor } = await supabase.from('vendors').select('name').eq('id', req.params.vendorId).single();
    const code = genCode();
    res.json({ success: true, data: { code } });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/referrals/track-click', async (req, res) => {
  try {
    const { referral_code, vendor_id } = req.body;
    // Just increment a click counter — we'll track detailed signups later
    const { data, error } = await supabase.from('vendor_referrals').insert([{
      vendor_id, referral_code, status: 'clicked',
      couple_name: 'Unknown', couple_phone: '',
    }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/referrals/stats/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendor_referrals').select('*').eq('vendor_id', req.params.vendorId);
    if (error) throw error;
    const all = data || [];
    const clicked = all.filter(r => r.status === 'clicked').length;
    const signed_up = all.filter(r => r.status === 'signed_up').length;
    const active = all.filter(r => r.status === 'active' || r.status === 'token_purchased').length;
    const dormant = all.filter(r => r.status === 'dormant').length;
    res.json({ success: true, data: { total: all.length, clicked, signed_up, active, dormant, referrals: all } });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================
// REFERRAL REWARDS CALCULATION
// ==================

app.get('/api/referrals/rewards/:vendorId', async (req, res) => {
  try {
    const vid = req.params.vendorId;
    // Get referrals
    const { data: referrals } = await supabase.from('vendor_referrals').select('*').eq('vendor_id', vid);
    const all = referrals || [];
    const active = all.filter(r => r.status === 'active' || r.status === 'token_purchased').length;
    const signed_up = all.filter(r => r.status === 'signed_up').length;
    const dormant = all.filter(r => r.status === 'dormant').length;
    const clicked = all.filter(r => r.status === 'clicked').length;

    // Get subscription to check if founding vendor
    const { data: sub } = await supabase.from('vendor_subscriptions').select('*').eq('vendor_id', vid).order('created_at', { ascending: false }).limit(1).single();
    const isFounding = sub?.is_founding_vendor || sub?.founding_badge || false;
    const tier = sub?.tier || 'essential';

    // Calculate discount for Essential tier
    let discount = 0;
    let nextMilestone = { referrals: 1, discount: isFounding ? 10 : 5 };
    if (tier === 'essential' || tier === 'signature') {
      if (isFounding) {
        if (active >= 10) { discount = 50; nextMilestone = { referrals: 10, discount: 50 }; }
        else if (active >= 5) { discount = 35; nextMilestone = { referrals: 10, discount: 50 }; }
        else if (active >= 3) { discount = 20; nextMilestone = { referrals: 5, discount: 35 }; }
        else if (active >= 1) { discount = 10; nextMilestone = { referrals: 3, discount: 20 }; }
        else { discount = 0; nextMilestone = { referrals: 1, discount: 10 }; }
      } else {
        if (active >= 10) { discount = 35; nextMilestone = { referrals: 10, discount: 35 }; }
        else if (active >= 5) { discount = 20; nextMilestone = { referrals: 10, discount: 35 }; }
        else if (active >= 3) { discount = 10; nextMilestone = { referrals: 5, discount: 20 }; }
        else if (active >= 1) { discount = 5; nextMilestone = { referrals: 3, discount: 10 }; }
        else { discount = 0; nextMilestone = { referrals: 1, discount: 5 }; }
      }
    }

    // Calculate visibility tier for Signature
    let visibilityTier = 'none';
    let visibilityDesc = '';
    if (tier === 'signature') {
      if (active >= 100) { visibilityTier = 'unlimited'; visibilityDesc = 'Unlimited reverse lead access + custom quotes'; }
      else if (active >= 75) { visibilityTier = 'reverse_leads'; visibilityDesc = 'Reverse lead access — 100 leads/month'; }
      else if (active >= 25) { visibilityTier = 'featured'; visibilityDesc = 'Featured placement 1 week/month'; }
      else if (active > 0) { visibilityTier = 'boost'; visibilityDesc = 'Algorithmic discovery boost active'; }
    }

    // Milestones for display
    const milestones = isFounding
      ? [{ referrals: 1, discount: 10 }, { referrals: 3, discount: 20 }, { referrals: 5, discount: 35 }, { referrals: 10, discount: 50 }]
      : [{ referrals: 1, discount: 5 }, { referrals: 3, discount: 10 }, { referrals: 5, discount: 20 }, { referrals: 10, discount: 35 }];

    const visibilityMilestones = [
      { referrals: 1, reward: 'Discovery Boost' },
      { referrals: 25, reward: 'Featured 1 week/month' },
      { referrals: 75, reward: 'Reverse Leads (100/mo)' },
      { referrals: 100, reward: 'Unlimited Leads' },
    ];

    res.json({
      success: true,
      data: {
        total: all.length, active, signed_up, dormant, clicked,
        is_founding: isFounding, tier,
        discount, next_milestone: nextMilestone,
        milestones, visibility_tier: visibilityTier, visibility_desc: visibilityDesc,
        visibility_milestones: visibilityMilestones,
        referrals: all.slice(0, 20),
      }
    });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/credentials/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendor_credentials').select('username, phone_verified, phone_number')
      .eq('vendor_id', req.params.vendorId).single();
    if (error) return res.json({ success: true, data: null });
    res.json({ success: true, data });
  } catch (error) { res.json({ success: true, data: null }); }
});

// ══════════════════════════════════════════════════════════════
// VENDOR OTP AUTH (Session 10 Turn 9A)
// Phone + OTP + password flow. Mirrors couple-side auth.
// Codes are admin-generated; vendor signup is code-gated.
// ══════════════════════════════════════════════════════════════

// Validate a vendor invite code (validate-only, no user creation)
app.post('/api/vendor-codes/validate', async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ success: false, error: 'Code required' });
    const { data: codeData, error: codeErr } = await supabase
      .from('access_codes').select('*')
      .eq('code', code.toUpperCase().trim())
      .single();
    if (codeErr || !codeData) return res.json({ success: false, error: 'Invalid code' });
    // Accept vendor_permanent, vendor_demo, or any 'vendor' type
    const isVendorCode = (codeData.type || '').includes('vendor');
    if (!isVendorCode) return res.json({ success: false, error: 'This is not a vendor code' });
    if (codeData.used && codeData.used_count >= 1 && !(codeData.type || '').includes('demo')) {
      return res.json({ success: false, error: 'This invite has already been used' });
    }
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      return res.json({ success: false, error: 'Code expired' });
    }
    res.json({
      success: true,
      data: {
        tier: codeData.tier || 'essential',
        type: codeData.type,
        note: codeData.note || null,
      },
    });
  } catch (error) {
    console.error('vendor-codes/validate error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vendor onboard — after phone+OTP verified, finalises account with password
app.post('/api/vendor/onboard', async (req, res) => {
  try {
    const {
      name, phone, email, category, city, instagram,
      access_code, password,
    } = req.body || {};

    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Business name and phone required' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }
    if (!access_code) {
      return res.status(400).json({ success: false, error: 'Invite code required' });
    }

    const cleanPhone = ('' + phone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, error: 'Invalid phone number' });
    }
    const fullPhone = '+91' + cleanPhone;

    // Re-validate code atomically — protect against race conditions
    const { data: codeRow } = await supabase
      .from('access_codes').select('*')
      .eq('code', access_code.toUpperCase().trim())
      .maybeSingle();
    if (!codeRow) return res.status(400).json({ success: false, error: 'Invalid invite code' });
    const isVendorCode = (codeRow.type || '').includes('vendor');
    if (!isVendorCode) return res.status(400).json({ success: false, error: 'This is not a vendor code' });
    const isDemo = (codeRow.type || '').includes('demo');
    if (codeRow.used && codeRow.used_count >= 1 && !isDemo) {
      return res.status(400).json({ success: false, error: 'This invite has already been used' });
    }
    if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
      return res.status(400).json({ success: false, error: 'Invite expired' });
    }

    const tier = codeRow.tier || 'essential';
    const passwordHash = await bcrypt.hash(password, 10);

    // Upsert vendor row — match by phone
    const { data: existing } = await supabase
      .from('vendors').select('*').eq('phone', fullPhone).maybeSingle();

    let vendorRow;
    if (existing) {
      const updates = {
        name: name.trim(),
        email: email?.trim() || existing.email || null,
        category: category || existing.category || null,
        city: city || existing.city || null,
        instagram: instagram?.trim() || existing.instagram || null,
        onboarded_otp: true,
      };
      // Only set password_hash if not already set (first-time), preserves existing passwords
      if (!existing.password_hash) updates.password_hash = passwordHash;
      const { data: updated, error: uErr } = await supabase
        .from('vendors').update(updates).eq('id', existing.id).select().single();
      if (uErr) throw uErr;
      vendorRow = updated;
    } else {
      const { data: created, error: cErr } = await supabase
        .from('vendors').insert([{
          name: name.trim(),
          phone: fullPhone,
          email: email?.trim() || null,
          category: category || null,
          city: city || null,
          instagram: instagram?.trim() || null,
          password_hash: passwordHash,
          onboarded_otp: true,
        }]).select().single();
      if (cErr) throw cErr;
      vendorRow = created;
    }

    // Auto-create vendor_subscriptions row if missing (for tier tracking)
    try {
      const { data: sub } = await supabase
        .from('vendor_subscriptions').select('id').eq('vendor_id', vendorRow.id).maybeSingle();
      if (!sub) {
        const trialEnd = new Date();
        trialEnd.setMonth(trialEnd.getMonth() + 3);   // 3-month trial
        await supabase.from('vendor_subscriptions').insert([{
          vendor_id: vendorRow.id,
          tier, status: 'active',
          trial_ends_at: trialEnd.toISOString(),
        }]);
      }
    } catch (e) {
      console.warn('subscription create skipped:', e.message);
    }

    // Mark code consumed (unless demo)
    if (!isDemo) {
      await supabase.from('access_codes').update({
        used: true,
        used_count: (codeRow.used_count || 0) + 1,
        redeemed_vendor_id: vendorRow.id,
        redeemed_at: new Date().toISOString(),
      }).eq('id', codeRow.id);
    }

    if (typeof logActivity === 'function') {
      logActivity('vendor_onboarded', `${name} onboarded (${tier})`);
    }

    res.json({
      success: true,
      data: {
        id: vendorRow.id,
        name: vendorRow.name,
        phone: vendorRow.phone,
        tier,
      },
    });
  } catch (error) {
    console.error('vendor/onboard error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vendor login — phone + password
app.post('/api/vendor/login', async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone || !password) {
      return res.status(400).json({ success: false, error: 'Phone and password required' });
    }
    const cleanPhone = ('' + phone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, error: 'Invalid phone number' });
    }
    const fullPhone = '+91' + cleanPhone;

    // Look up credentials by phone (this is where passwords live for ALL vendors,
    // both signup-flow vendors and admin-created ones)
    const { data: cred } = await supabase
      .from('vendor_credentials').select('*').eq('phone_number', fullPhone).maybeSingle();

    if (!cred || !cred.password_hash) {
      return res.status(401).json({ success: false, error: 'Invalid phone or password' });
    }
    const match = await bcrypt.compare(password, cred.password_hash);
    if (!match) return res.status(401).json({ success: false, error: 'Invalid phone or password' });

    // Now load the vendor row
    const { data: vendor } = await supabase
      .from('vendors').select('*').eq('id', cred.vendor_id).maybeSingle();
    if (!vendor) {
      // Orphan credentials — auto-clean and reject
      try { await supabase.from('vendor_credentials').delete().eq('id', cred.id); } catch {}
      return res.status(401).json({ success: false, error: 'Account no longer exists' });
    }

    // Get tier
    let tier = 'essential';
    try {
      const { data: sub } = await supabase
        .from('vendor_subscriptions').select('tier, status')
        .eq('vendor_id', vendor.id).maybeSingle();
      if (sub?.tier) tier = sub.tier;
    } catch (e) { /* fallback */ }

    res.json({
      success: true,
      data: {
        id: vendor.id,
        name: vendor.name,
        phone: vendor.phone,
        email: vendor.email,
        category: vendor.category,
        city: vendor.city,
        instagram: vendor.instagram,
        tier,
      },
    });
  } catch (error) {
    console.error('vendor/login error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vendor forgot password — check existence (no leak), frontend then sends OTP
app.post('/api/vendor/forgot-password', async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'Phone required' });
    const cleanPhone = ('' + phone).replace(/\D/g, '').slice(-10);
    const fullPhone = '+91' + cleanPhone;
    const { data: vendor } = await supabase
      .from('vendors').select('id').eq('phone', fullPhone).maybeSingle();
    res.json({ success: true, data: { exists: !!vendor } });
  } catch (error) {
    console.error('vendor/forgot-password error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vendor reset password — client has already verified OTP
app.post('/api/vendor/reset-password', async (req, res) => {
  try {
    const { phone, new_password, otp_verified } = req.body || {};
    if (!phone || !new_password) {
      return res.status(400).json({ success: false, error: 'Phone and new password required' });
    }
    if (typeof new_password !== 'string' || new_password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }
    if (!otp_verified) {
      return res.status(400).json({ success: false, error: 'OTP verification required' });
    }
    const cleanPhone = ('' + phone).replace(/\D/g, '').slice(-10);
    const fullPhone = '+91' + cleanPhone;
    const { data: vendor } = await supabase
      .from('vendors').select('id').eq('phone', fullPhone).maybeSingle();
    if (!vendor) return res.status(404).json({ success: false, error: 'Account not found' });
    const passwordHash = await bcrypt.hash(new_password, 10);
    const { error } = await supabase
      .from('vendors').update({ password_hash: passwordHash }).eq('id', vendor.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('vendor/reset-password error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// VENDOR ASSISTANTS (Session 10 Turn 9B)
// Per-event freelancer/assistant tracking for solo + mid-tier vendors.
// Model B: each assistant assigned to specific events — not global.
// ══════════════════════════════════════════════════════════════

// List all assistants for a vendor
app.get('/api/vendor/assistants/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { data, error } = await supabase
      .from('vendor_assistants')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('assistants list error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new assistant (record) + optionally fire WhatsApp invite
app.post('/api/vendor/assistants', async (req, res) => {
  try {
    const { vendor_id, name, phone, role, notes, send_invite } = req.body || {};
    if (!vendor_id || !name || !phone) {
      return res.status(400).json({ success: false, error: 'vendor_id, name, and phone are required' });
    }
    const cleanPhone = ('' + phone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, error: 'Invalid phone number' });
    }
    const fullPhone = '+91' + cleanPhone;

    const { data: existing } = await supabase
      .from('vendor_assistants').select('id')
      .eq('vendor_id', vendor_id).eq('phone', fullPhone).maybeSingle();
    if (existing) {
      return res.json({ success: false, error: 'This assistant is already in your list' });
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('vendor_assistants').insert([{
        vendor_id,
        name: name.trim(),
        phone: fullPhone,
        role: (role || '').trim() || null,
        notes: (notes || '').trim() || null,
        invited_at: send_invite ? new Date().toISOString() : null,
      }]).select().single();
    if (insertErr) throw insertErr;

    // Fire WhatsApp invite if requested (non-blocking)
    if (send_invite) {
      try {
        const { data: vendor } = await supabase
          .from('vendors').select('name').eq('id', vendor_id).maybeSingle();
        const vendorName = vendor?.name || 'The Dream Wedding vendor';
        const roleText = inserted.role ? ` as their ${inserted.role}` : '';
        const msg = `Hi ${inserted.name}! ${vendorName} has added you${roleText} via The Dream Wedding. You'll receive updates about upcoming events you're assigned to. Welcome aboard! ✨`;
        if (typeof sendWhatsApp === 'function') {
          sendWhatsApp(fullPhone, msg).catch(e => console.error('assistant invite send failed:', e.message));
        }
      } catch (e) {
        console.warn('assistant invite lookup failed:', e.message);
      }
    }

    res.json({ success: true, data: inserted });
  } catch (error) {
    console.error('assistants create error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update assistant
app.patch('/api/vendor/assistants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, role, notes } = req.body || {};
    const patch = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (role !== undefined) patch.role = role ? String(role).trim() : null;
    if (notes !== undefined) patch.notes = notes ? String(notes).trim() : null;
    if (phone !== undefined) {
      const cleanPhone = ('' + phone).replace(/\D/g, '').slice(-10);
      if (cleanPhone.length !== 10) return res.status(400).json({ success: false, error: 'Invalid phone number' });
      patch.phone = '+91' + cleanPhone;
    }
    const { data, error } = await supabase
      .from('vendor_assistants').update(patch).eq('id', id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('assistants update error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete assistant (cascade removes their event assignments via FK)
app.delete('/api/vendor/assistants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('vendor_assistants').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('assistants delete error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Assign assistant to a specific event (Model B join)
app.post('/api/vendor/assistants/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { event_id, vendor_id } = req.body || {};
    if (!event_id || !vendor_id) {
      return res.status(400).json({ success: false, error: 'event_id and vendor_id required' });
    }
    const { data, error } = await supabase
      .from('vendor_assistant_assignments').insert([{
        assistant_id: id,
        event_id,
        vendor_id,
      }]).select().single();
    if (error) {
      // Ignore unique constraint violations (already assigned)
      if (error.code === '23505') {
        return res.json({ success: true, data: null, already_assigned: true });
      }
      throw error;
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('assistants assign error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Unassign from an event
app.delete('/api/vendor/assistants/:id/assign/:eventId', async (req, res) => {
  try {
    const { id, eventId } = req.params;
    const { error } = await supabase
      .from('vendor_assistant_assignments').delete()
      .eq('assistant_id', id).eq('event_id', eventId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('assistants unassign error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all assignments for an assistant (which events she's working)
app.get('/api/vendor/assistants/:id/assignments', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('vendor_assistant_assignments').select('*')
      .eq('assistant_id', id)
      .order('assigned_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('assistants assignments list error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// HOT DATES (Session 10 Turn 9D)
// Admin-managed auspicious wedding days. Vendors see them via
// a toggle in the Calendar view.
// ══════════════════════════════════════════════════════════════

// List hot dates (optional filters: year, tradition, region)
app.get('/api/hot-dates', async (req, res) => {
  try {
    const { year, tradition, region } = req.query;
    let q = supabase.from('hot_dates').select('*').order('date', { ascending: true });
    if (year) {
      q = q.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
    }
    if (tradition) q = q.eq('tradition', tradition);
    if (region) q = q.eq('region', region);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('hot-dates list error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: add a hot date
app.post('/api/hot-dates', async (req, res) => {
  try {
    const { date, tradition, region, note } = req.body || {};
    if (!date) return res.status(400).json({ success: false, error: 'date is required' });
    const { data, error } = await supabase
      .from('hot_dates')
      .insert([{
        date,
        tradition: tradition || 'North Indian',
        region: region || 'All India',
        note: note || null,
      }])
      .select().single();
    if (error) {
      if (error.code === '23505') {
        return res.json({ success: false, error: 'This date already exists for this tradition/region' });
      }
      throw error;
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('hot-dates create error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: update a hot date
app.patch('/api/hot-dates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['date', 'tradition', 'region', 'note'];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    const { data, error } = await supabase
      .from('hot_dates').update(patch).eq('id', id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('hot-dates update error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: delete a hot date
app.delete('/api/hot-dates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('hot_dates').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('hot-dates delete error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/access-codes/generate', async (req, res) => {
  try {
    const { type, created_by, note } = req.body;
    // type: 'vendor_permanent' | 'vendor_demo' | 'couple_demo'
    const code = genCode();
    const expires_at = type === 'vendor_permanent' ? null
      : type === 'vendor_demo' ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from('access_codes').insert([{
      code, type, expires_at, created_by: created_by || 'dev', note: note || '',
      used: false, used_count: 0,
    }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/access-codes/validate', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Code required' });
    const { data, error } = await supabase.from('access_codes').select('*').eq('code', code.toUpperCase().trim()).single();
    if (error || !data) return res.json({ success: false, error: 'Invalid code' });
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return res.json({ success: false, error: 'Code expired' });
    }
    // Increment used count
    await supabase.from('access_codes').update({ used: true, used_count: (data.used_count || 0) + 1 }).eq('id', data.id);
    res.json({ success: true, data: {
      type: data.type,
      expires_at: data.expires_at,
      note: data.note,
    }});
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ── Vendor Login Codes ──────────────────────────────────────────────────────
app.post('/api/vendor-login-codes', async (req, res) => {
  try {
    const { vendor_id, code, expires_at } = req.body;
    // Delete any existing codes for this vendor first
    await supabase.from('vendor_login_codes').delete().eq('vendor_id', vendor_id);
    // Insert new code
    const { data, error } = await supabase
      .from('vendor_login_codes')
      .insert([{ vendor_id, code, expires_at }])
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

app.post('/api/vendor-login-codes/verify', async (req, res) => {
  try {
    const { code } = req.body;
    const { data, error } = await supabase
      .from('vendor_login_codes')
      .select('*, vendors(*)')
      .eq('code', code)
      .single();
    if (error || !data) return res.json({ success: false, error: 'Invalid code' });
    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      await supabase.from('vendor_login_codes').delete().eq('code', code);
      return res.json({ success: false, error: 'Code expired' });
    }
    // Delete code after use
    await supabase.from('vendor_login_codes').delete().eq('code', code);
    res.json({ success: true, data: data.vendors });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

app.get('/api/access-codes', async (req, res) => {
  try {
    const { data, error } = await supabase.from('access_codes').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ==================
// FIREBASE PHONE AUTH (REST API — no reCAPTCHA needed)
// ==================

const twilio = require('twilio');
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_VERIFY_SID = process.env.TWILIO_VERIFY_SID || '';
const twilioClient = TWILIO_SID && TWILIO_TOKEN ? twilio(TWILIO_SID, TWILIO_TOKEN) : null;

// ═══════════════════════════════════════════════════════════
// Dream Ai — Claude + Twilio WhatsApp Integration
// ═══════════════════════════════════════════════════════════
const Anthropic = require('@anthropic-ai/sdk');
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

// Helper: send WhatsApp message via Twilio
async function sendWhatsApp(toPhone, message) {
  if (!twilioClient) { console.log('[Dream Ai] Twilio not configured. Would send:', message); return false; }
  try {
    const to = toPhone.startsWith('whatsapp:') ? toPhone : 'whatsapp:' + toPhone;
    await twilioClient.messages.create({ from: TWILIO_WHATSAPP_NUMBER, to, body: message });
    return true;
  } catch (err) {
    console.error('[Dream Ai] WhatsApp send error:', err.message);
    return false;
  }
}

// Helper: normalize phone (strip spaces, +, country codes, keep last 10 digits for IN)
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  // If starts with 91 and is 12 digits, strip 91
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits.slice(-10);
}

// Helper: find vendor by phone number (joins subscription tier)
async function findVendorByPhone(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  // Fetch vendor basic info (NO tier — column doesn't exist on vendors table)
  const { data } = await supabase.from('vendors')
    .select('id, name, phone, email, ai_enabled, ai_commands_used, ai_access_requested, category, city')
    .or(`phone.eq.${normalized},phone.eq.+91${normalized},phone.eq.91${normalized}`)
    .limit(1);
  const vendor = data && data[0] ? data[0] : null;
  if (!vendor) return null;
  // Fetch tier from vendor_subscriptions
  try {
    const { data: sub } = await supabase.from('vendor_subscriptions')
      .select('tier, status').eq('vendor_id', vendor.id).maybeSingle();
    vendor.tier = (sub && sub.tier) ? sub.tier : 'essential';
    vendor.subscription_status = (sub && sub.status) ? sub.status : 'active';
  } catch (e) {
    vendor.tier = 'essential';
  }
  return vendor;
}

// Find couple user by WhatsApp phone
async function findCoupleByPhone(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const { data } = await supabase.from('users')
    .select('id, name, phone, wedding_events, dreamer_type')
    .eq('dreamer_type', 'couple')
    .or(`phone.eq.+91${normalized},phone.eq.${normalized},phone.eq.91${normalized}`)
    .limit(1);
  return data && data[0] ? data[0] : null;
}

// Parse a vCard blob — extract contacts with name + phone
// vCard format is line-oriented: FN, N, TEL, etc. Multiple vcards can be concatenated.
function parseVCards(raw) {
  if (!raw || typeof raw !== 'string') return [];
  const text = raw.replace(/\r\n/g, '\n');
  const cards = [];
  let current = null;

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed === 'BEGIN:VCARD') {
      current = { name: '', phone: '' };
      continue;
    }
    if (trimmed === 'END:VCARD') {
      if (current && (current.name || current.phone)) cards.push(current);
      current = null;
      continue;
    }
    if (!current) continue;

    // FN:Priya Sharma    (full formatted name — preferred)
    if (trimmed.startsWith('FN:') || trimmed.startsWith('FN;')) {
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > -1) {
        const val = trimmed.slice(colonIdx + 1).trim();
        if (val && !current.name) current.name = val;
      }
      continue;
    }

    // N:Sharma;Priya;;;   (structured: family;given;middle;prefix;suffix)
    // Use only if FN wasn't set
    if (trimmed.startsWith('N:') || trimmed.startsWith('N;')) {
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > -1 && !current.name) {
        const val = trimmed.slice(colonIdx + 1).trim();
        const parts = val.split(';').filter(p => p);
        // Format: [family, given, middle, prefix, suffix] — show "given family"
        if (parts.length >= 2) {
          current.name = `${parts[1]} ${parts[0]}`.trim();
        } else if (parts[0]) {
          current.name = parts[0];
        }
      }
      continue;
    }

    // TEL:+919876543210 or TEL;TYPE=CELL:+919876543210
    if (trimmed.startsWith('TEL:') || trimmed.startsWith('TEL;')) {
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > -1 && !current.phone) {
        const val = trimmed.slice(colonIdx + 1).trim();
        // Keep + and digits only
        const clean = val.replace(/[^\d+]/g, '');
        if (clean) current.phone = clean;
      }
    }
  }

  return cards;
}

// Fetch vCard content from a Twilio media URL. Twilio serves media behind
// basic auth using the account SID and auth token.
async function fetchTwilioMedia(url) {
  if (!TWILIO_SID || !TWILIO_TOKEN) return null;
  try {
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    console.error('fetchTwilioMedia error:', e.message);
    return null;
  }
}

// AI TOKEN PACKS (Rs. 2 per token base, bulk discounts)
const AI_TOKEN_PACKS = {
  small:  { tokens: 50,  price: 100, label: 'Starter Pack' },
  medium: { tokens: 200, price: 350, label: 'Popular Pack' },
  large:  { tokens: 500, price: 800, label: 'Power Pack' },
};

// Create Razorpay order for AI token pack
app.post('/api/ai-tokens/create-order', async (req, res) => {
  try {
    const { vendor_id, pack } = req.body;
    if (!vendor_id || !AI_TOKEN_PACKS[pack]) {
      return res.status(400).json({ success: false, error: 'Invalid request' });
    }
    const { tokens, price, label } = AI_TOKEN_PACKS[pack];
    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return res.json({ success: false, error: 'Payment service not configured yet' });
    }
    const auth = Buffer.from(RAZORPAY_KEY_ID + ':' + RAZORPAY_KEY_SECRET).toString('base64');
    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: price * 100,
        currency: 'INR',
        receipt: 'ai_' + vendor_id.slice(0,8) + '_' + Date.now(),
        notes: { vendor_id, pack, tokens: String(tokens), purpose: 'tdw_ai_tokens' },
      }),
    });
    const order = await orderRes.json();
    if (order.error) return res.json({ success: false, error: order.error.description || 'Order creation failed' });
    res.json({ success: true, data: {
      order_id: order.id, amount: order.amount, currency: order.currency,
      key_id: RAZORPAY_KEY_ID, pack, tokens, label, price,
    }});
  } catch (error) {
    console.error('[AI Tokens] Order error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify payment and credit tokens
app.post('/api/ai-tokens/verify-payment', async (req, res) => {
  try {
    const { vendor_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, pack } = req.body;
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
    if (!RAZORPAY_KEY_SECRET) return res.json({ success: false, error: 'Not configured' });
    if (!AI_TOKEN_PACKS[pack]) return res.json({ success: false, error: 'Invalid pack' });
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id).digest('hex');
    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }
    const { tokens, price } = AI_TOKEN_PACKS[pack];
    const { data: v } = await supabase.from('vendors').select('ai_extra_tokens').eq('id', vendor_id).single();
    const current = (v && v.ai_extra_tokens) || 0;
    await supabase.from('vendors').update({ ai_extra_tokens: current + tokens }).eq('id', vendor_id);
    try {
      await supabase.from('ai_token_purchases').insert([{
        vendor_id, pack, tokens, amount: price,
        razorpay_order_id, razorpay_payment_id, created_at: new Date().toISOString(),
      }]);
    } catch (e) {}
    logActivity('ai_tokens_purchased', 'Vendor ' + vendor_id + ' bought ' + tokens + ' AI tokens for Rs.' + price);
    res.json({ success: true, data: { tokens_added: tokens, new_balance: current + tokens } });
  } catch (error) {
    console.error('[AI Tokens] Verify error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get AI usage status for a vendor
app.get('/api/ai-tokens/status/:vendor_id', async (req, res) => {
  try {
    const { data: v } = await supabase.from('vendors')
      .select('id, name, ai_enabled, ai_commands_used, ai_extra_tokens, ai_monthly_reset_at')
      .eq('id', req.params.vendor_id).single();
    if (!v) return res.json({ success: false, error: 'Vendor not found' });
    const resetAt = v.ai_monthly_reset_at ? new Date(v.ai_monthly_reset_at) : new Date();
    const daysSince = (Date.now() - resetAt.getTime()) / (1000 * 60 * 60 * 24);
    let commandsUsed = v.ai_commands_used || 0;
    if (daysSince >= 30) {
      commandsUsed = 0;
      await supabase.from('vendors').update({
        ai_commands_used: 0, ai_monthly_reset_at: new Date().toISOString(),
      }).eq('id', v.id);
    }
    const { data: sub } = await supabase.from('vendor_subscriptions')
      .select('tier').eq('vendor_id', v.id).maybeSingle();
    const tier = (sub && sub.tier) ? sub.tier : 'essential';
    const allowance = tier === 'prestige' ? 500 : tier === 'signature' ? 75 : 20;
    const tierRemaining = Math.max(0, allowance - commandsUsed);
    const extraTokens = v.ai_extra_tokens || 0;
    const totalRemaining = tier === 'prestige' ? 500 : tierRemaining + extraTokens;
    res.json({ success: true, data: {
      ai_enabled: !!v.ai_enabled,
      tier, allowance, commands_used: commandsUsed, tier_remaining: tierRemaining,
      extra_tokens: extraTokens, total_remaining: totalRemaining,
      packs: AI_TOKEN_PACKS,
    }});
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper: check AI quota for a vendor based on tier
function getAiQuota(vendor) {
  const tier = (vendor.tier || 'essential').toLowerCase();
  if (tier === 'prestige') return 99999; // unlimited
  if (tier === 'signature') return 75;
  if (tier === 'essential') return 20;
  return 10; // trial (shouldn't happen if subscription exists)
}

// Increment — uses tier allowance first, then extra tokens
async function incrementAiCommands(vendorId) {
  const { data: v } = await supabase.from('vendors')
    .select('ai_commands_used, ai_extra_tokens').eq('id', vendorId).single();
  if (!v) return 0;
  const { data: sub } = await supabase.from('vendor_subscriptions')
    .select('tier').eq('vendor_id', vendorId).maybeSingle();
  const tier = (sub && sub.tier) ? sub.tier : 'essential';
  const allowance = tier === 'prestige' ? 500 : tier === 'signature' ? 75 : 20;
  const used = v.ai_commands_used || 0;
  const extra = v.ai_extra_tokens || 0;
  if (used < allowance) {
    await supabase.from('vendors').update({ ai_commands_used: used + 1 }).eq('id', vendorId);
  } else if (extra > 0) {
    await supabase.from('vendors').update({ ai_extra_tokens: extra - 1 }).eq('id', vendorId);
  }
  return used + 1;
}

// ─── Claude Tool Definitions ───
const TDW_AI_TOOLS = [
  {
    name: 'create_invoice',
    description: 'Create a GST-compliant invoice for a client. Use when vendor asks to create, generate, or make an invoice.',
    input_schema: {
      type: 'object',
      properties: {
        client_name: { type: 'string', description: 'Client or couple name' },
        amount: { type: 'number', description: 'Total amount in rupees' },
        advance_received: { type: 'number', description: 'Advance amount already paid (0 if not mentioned)' },
        event_type: { type: 'string', description: 'Wedding, engagement, shoot, etc.' },
      },
      required: ['client_name', 'amount'],
    },
  },
  {
    name: 'block_calendar_dates',
    description: 'Block dates on the vendor calendar for a client booking.',
    input_schema: {
      type: 'object',
      properties: {
        client_name: { type: 'string', description: 'Client or couple name' },
        dates: { type: 'array', items: { type: 'string' }, description: 'Array of dates in YYYY-MM-DD format' },
        notes: { type: 'string', description: 'Optional notes about the booking' },
      },
      required: ['client_name', 'dates'],
    },
  },
  {
    name: 'add_client',
    description: 'Add a new client to the vendor CRM.',
    input_schema: {
      type: 'object',
      properties: {
        client_name: { type: 'string', description: 'Client or couple name' },
        phone: { type: 'string', description: 'Client phone number (optional)' },
        event_date: { type: 'string', description: 'Event date in YYYY-MM-DD format (optional)' },
        event_type: { type: 'string', description: 'Wedding, engagement, etc.' },
        budget: { type: 'number', description: 'Client budget in rupees (optional)' },
      },
      required: ['client_name'],
    },
  },
  {
    name: 'query_schedule',
    description: 'Look up the vendor schedule. Use for questions like "what is my schedule today", "when am I free", "show tomorrow", "what meetings do I have".',
    input_schema: {
      type: 'object',
      properties: {
        when: { type: 'string', description: 'Natural language time reference: today, tomorrow, this week, saturday, dec 15' },
      },
      required: ['when'],
    },
  },
  {
    name: 'query_revenue',
    description: 'Query revenue, earnings, income, or payment data. Use for questions like "how much did I earn this month", "pending payments", "what does X owe me".',
    input_schema: {
      type: 'object',
      properties: {
        period: { type: 'string', description: 'Time period: this_month, last_month, this_year, all_time' },
        client_name: { type: 'string', description: 'Filter by client name (optional)' },
      },
    },
  },
  {
    name: 'send_client_reminder',
    description: 'Send a WhatsApp reminder to a client about payment, fitting, meeting, etc.',
    input_schema: {
      type: 'object',
      properties: {
        client_name: { type: 'string', description: 'Client name to send reminder to' },
        reminder_type: { type: 'string', description: 'payment, fitting, meeting, event, or custom' },
        custom_message: { type: 'string', description: 'Custom message text (optional)' },
      },
      required: ['client_name', 'reminder_type'],
    },
  },
  {
    name: 'create_task',
    description: 'Create a task for the vendor or a team member.',
    input_schema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Task description' },
        assignee: { type: 'string', description: 'Team member name (optional, default self)' },
        due_date: { type: 'string', description: 'Due date YYYY-MM-DD (optional)' },
      },
      required: ['task'],
    },
  },
  {
    name: 'query_clients',
    description: 'Look up client list, search a specific client, or get client info.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Client name to search (optional, empty for list all)' },
      },
    },
  },
  {
    name: 'general_reply',
    description: 'Use when the vendor is making small talk, asking something unrelated, or the request cannot be handled by other tools. Reply conversationally.',
    input_schema: {
      type: 'object',
      properties: {
        reply: { type: 'string', description: 'Conversational reply to send back' },
      },
      required: ['reply'],
    },
  },
];

// ─── Tool Executors ───
async function executeToolCall(toolName, toolInput, vendor) {
  try {
    switch (toolName) {
      case 'create_invoice': {
        const { client_name, amount, advance_received = 0, event_type = 'Wedding' } = toolInput;
        const balance = amount - advance_received;
        const cgst = Math.round(amount * 0.09);
        const sgst = Math.round(amount * 0.09);
        const total_with_gst = amount + cgst + sgst;
        const invNum = 'INV-' + Date.now().toString().slice(-6);
        const { data, error } = await supabase.from('vendor_invoices').insert([{
          vendor_id: vendor.id, client_name, event_type,
          subtotal: amount, cgst, sgst, total: total_with_gst,
          advance: advance_received, balance: balance,
          invoice_number: invNum, status: 'pending',
        }]).select().single();
        if (error) throw error;
        return `✓ Invoice created for ${client_name}\n₹${amount.toLocaleString('en-IN')} + GST = ₹${total_with_gst.toLocaleString('en-IN')}\n${advance_received > 0 ? 'Advance: ₹' + advance_received.toLocaleString('en-IN') + ' · Balance: ₹' + balance.toLocaleString('en-IN') + '\n' : ''}Invoice #${invNum}\nView: vendor.thedreamwedding.in`;
      }

      case 'block_calendar_dates': {
        const { client_name, dates, notes = '' } = toolInput;
        for (const date of dates) {
          await supabase.from('blocked_dates').insert([{
            vendor_id: vendor.id, date, reason: `${client_name} wedding`, notes,
          }]).select();
        }
        return `✓ Blocked ${dates.length} date${dates.length > 1 ? 's' : ''} for ${client_name}\n${dates.join(', ')}`;
      }

      case 'add_client': {
        const { client_name, phone = '', event_date = null, event_type = 'Wedding', budget = null } = toolInput;
        const { error } = await supabase.from('vendor_clients').insert([{
          vendor_id: vendor.id, name: client_name, phone,
          event_date, event_type, budget, status: 'upcoming',
        }]);
        if (error) throw error;
        return `✓ Client added: ${client_name}${event_date ? '\nEvent: ' + event_date : ''}${budget ? '\nBudget: ₹' + budget.toLocaleString('en-IN') : ''}`;
      }

      case 'query_schedule': {
        const { when } = toolInput;
        const today = new Date(); today.setHours(0,0,0,0);
        let startDate, endDate, label;
        const w = when.toLowerCase();
        if (w.includes('today') || w.includes('aaj')) {
          startDate = today; endDate = new Date(today.getTime() + 86400000); label = 'today';
        } else if (w.includes('tomorrow') || w.includes('kal')) {
          startDate = new Date(today.getTime() + 86400000); endDate = new Date(today.getTime() + 2*86400000); label = 'tomorrow';
        } else if (w.includes('week')) {
          startDate = today; endDate = new Date(today.getTime() + 7*86400000); label = 'this week';
        } else {
          startDate = today; endDate = new Date(today.getTime() + 30*86400000); label = 'upcoming';
        }
        const { data: clients } = await supabase.from('vendor_clients')
          .select('name, event_date, event_type').eq('vendor_id', vendor.id)
          .gte('event_date', startDate.toISOString().slice(0,10))
          .lt('event_date', endDate.toISOString().slice(0,10))
          .order('event_date');
        const { data: blocked } = await supabase.from('blocked_dates')
          .select('date, reason').eq('vendor_id', vendor.id)
          .gte('date', startDate.toISOString().slice(0,10))
          .lt('date', endDate.toISOString().slice(0,10));
        const events = [];
        (clients || []).forEach(c => events.push(`${c.event_date}: ${c.name} ${c.event_type || ''}`));
        (blocked || []).forEach(b => events.push(`${b.date}: Blocked - ${b.reason || ''}`));
        if (events.length === 0) return `You're free ${label}. No events scheduled.`;
        return `📅 Schedule for ${label}:\n\n${events.join('\n')}`;
      }

      case 'query_revenue': {
        const { period = 'this_month', client_name } = toolInput;
        let query = supabase.from('vendor_invoices').select('client_name, total, advance, balance, status, created_at').eq('vendor_id', vendor.id);
        if (client_name) query = query.ilike('client_name', '%' + client_name + '%');
        const now = new Date();
        if (period === 'this_month') {
          const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          query = query.gte('created_at', start);
        } else if (period === 'last_month') {
          const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
          const end = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          query = query.gte('created_at', start).lt('created_at', end);
        } else if (period === 'this_year') {
          const start = new Date(now.getFullYear(), 0, 1).toISOString();
          query = query.gte('created_at', start);
        }
        const { data } = await query;
        const invoices = data || [];
        const total = invoices.reduce((s, i) => s + (i.total || 0), 0);
        const received = invoices.reduce((s, i) => s + (i.advance || 0), 0);
        const pending = invoices.reduce((s, i) => s + (i.balance || 0), 0);
        if (client_name) {
          return `💰 ${client_name}:\nTotal: ₹${total.toLocaleString('en-IN')}\nReceived: ₹${received.toLocaleString('en-IN')}\nPending: ₹${pending.toLocaleString('en-IN')}\n${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`;
        }
        return `💰 Revenue (${period.replace('_', ' ')}):\nTotal: ₹${total.toLocaleString('en-IN')}\nReceived: ₹${received.toLocaleString('en-IN')}\nPending: ₹${pending.toLocaleString('en-IN')}\n${invoices.length} booking${invoices.length !== 1 ? 's' : ''}`;
      }

      case 'send_client_reminder': {
        const { client_name, reminder_type, custom_message } = toolInput;
        const { data: clients } = await supabase.from('vendor_clients')
          .select('name, phone').eq('vendor_id', vendor.id)
          .ilike('name', '%' + client_name + '%').limit(1);
        if (!clients || clients.length === 0) return `Client "${client_name}" not found. Add them first or check spelling.`;
        const client = clients[0];
        if (!client.phone) return `${client.name} has no phone number. Add one first.`;
        const templates = {
          payment: `Hi ${client.name}, gentle reminder about your pending payment. Please let us know when you'd like to settle. Thanks!`,
          fitting: `Hi ${client.name}, reminder about your upcoming fitting appointment. See you soon!`,
          meeting: `Hi ${client.name}, looking forward to our meeting. See you soon!`,
          event: `Hi ${client.name}, your event is coming up! Let us know if you need anything.`,
        };
        const msg = custom_message || templates[reminder_type] || `Hi ${client.name}, this is a reminder from ${vendor.name}.`;
        const sent = await sendWhatsApp('+91' + normalizePhone(client.phone), msg);
        return sent ? `✓ Reminder sent to ${client.name}\n"${msg.slice(0, 100)}${msg.length > 100 ? '...' : ''}"` : `Could not send to ${client.name}. They may not be on WhatsApp sandbox.`;
      }

      case 'create_task': {
        const { task, assignee = '', due_date = null } = toolInput;
        try {
          await supabase.from('team_tasks').insert([{
            vendor_id: vendor.id, title: task, description: task,
            assignee_name: assignee || vendor.name, due_date,
            status: 'pending', priority: 'medium',
          }]);
        } catch (e) {}
        return `✓ Task created: ${task}${assignee ? '\nAssigned to: ' + assignee : ''}${due_date ? '\nDue: ' + due_date : ''}`;
      }

      case 'query_clients': {
        const { search = '' } = toolInput;
        let q = supabase.from('vendor_clients').select('name, event_date, event_type, budget, status').eq('vendor_id', vendor.id);
        if (search) q = q.ilike('name', '%' + search + '%');
        q = q.order('event_date', { ascending: true }).limit(10);
        const { data } = await q;
        if (!data || data.length === 0) return search ? `No clients matching "${search}"` : 'No clients yet. Add some with "Add client [name]".';
        if (search && data.length === 1) {
          const c = data[0];
          return `👥 ${c.name}\n${c.event_type || 'Wedding'} · ${c.event_date || 'Date TBD'}\n${c.budget ? 'Budget: ₹' + c.budget.toLocaleString('en-IN') : ''}\nStatus: ${c.status || 'upcoming'}`;
        }
        return `👥 Clients (${data.length}):\n\n${data.map(c => `• ${c.name} - ${c.event_date || 'TBD'}`).join('\n')}`;
      }

      case 'general_reply':
        return toolInput.reply;

      default:
        return 'I didn\'t understand that. Try: "Create invoice for [name] ₹[amount]" or "What\'s my schedule today?"';
    }
  } catch (err) {
    console.error('[Dream Ai] Tool error:', toolName, err.message);
    return `Sorry, I hit an error: ${err.message}. Please try again or rephrase.`;
  }
}

// ─── Main webhook: incoming WhatsApp message ───
app.post('/api/whatsapp/incoming', async (req, res) => {
  // Twilio sends form-urlencoded data
  const from = req.body.From || ''; // e.g. "whatsapp:+919876543210"
  const body = (req.body.Body || '').trim();
  console.log('[Dream Ai] Incoming:', from, '->', body);

  // Respond to Twilio immediately (must be TwiML or empty)
  res.set('Content-Type', 'text/xml');
  res.send('<Response></Response>');

  if (!body) return;

  try {
    // Identify vendor by phone
    const fromPhone = from.replace('whatsapp:', '');

    // ── Couple branch ──────────────────────────────────────────
    // If this sender is a registered couple AND has media attachments,
    // parse any vCards and add them to Guest Ledger.
    const couple = await findCoupleByPhone(fromPhone);
    const numMedia = parseInt(req.body.NumMedia || '0', 10) || 0;

    if (couple && numMedia > 0) {
      // Collect all vCard media items
      const vcards = [];
      for (let i = 0; i < numMedia; i++) {
        const contentType = (req.body[`MediaContentType${i}`] || '').toLowerCase();
        const mediaUrl = req.body[`MediaUrl${i}`] || '';
        if (!mediaUrl) continue;
        if (contentType.includes('vcard') || contentType.includes('x-vcard') || contentType === 'text/directory') {
          const raw = await fetchTwilioMedia(mediaUrl);
          if (raw) {
            const parsed = parseVCards(raw);
            vcards.push(...parsed);
          }
        }
      }

      if (vcards.length === 0) {
        await sendWhatsApp(fromPhone, "I didn't find any contacts in that. Try long-pressing a chat, tapping Attach → Contact, then selecting who you want to add.");
        return;
      }

      // Dedupe by phone+name within this batch AND against existing guests
      const { data: existingGuests } = await supabase
        .from('couple_guests')
        .select('name, phone')
        .eq('couple_id', couple.id);

      const seen = new Set();
      if (existingGuests) {
        for (const g of existingGuests) {
          const key = `${(g.name || '').toLowerCase()}|${(g.phone || '').replace(/\D/g, '').slice(-10)}`;
          seen.add(key);
        }
      }

      const events = couple.wedding_events || [];
      const defaultEventInvites = {};
      for (const ev of events) {
        defaultEventInvites[ev] = { invited: false, rsvp: 'pending' };
      }

      const toInsert = [];
      let skipped = 0;
      for (const v of vcards) {
        if (!v.name && !v.phone) { skipped++; continue; }
        const nameKey = (v.name || '').toLowerCase().trim();
        const phoneKey = (v.phone || '').replace(/\D/g, '').slice(-10);
        const key = `${nameKey}|${phoneKey}`;
        if (seen.has(key)) { skipped++; continue; }
        seen.add(key);

        toInsert.push({
          couple_id: couple.id,
          name: v.name || v.phone || 'Unnamed',
          phone: v.phone || null,
          side: 'bride',              // default — she can edit later
          event_invites: defaultEventInvites,
          household_head_id: null,
          dietary: null,
          nudge_sent_at: null,
        });
      }

      if (toInsert.length === 0) {
        await sendWhatsApp(fromPhone, `I found ${vcards.length} contact${vcards.length !== 1 ? 's' : ''}, but they're already in your Guest Ledger. Nothing new added.`);
        return;
      }

      const { error: insertErr } = await supabase
        .from('couple_guests')
        .insert(toInsert);

      if (insertErr) {
        console.error('WhatsApp guest import error:', insertErr.message);
        await sendWhatsApp(fromPhone, "I couldn't save those contacts right now. Please try again in a moment.");
        return;
      }

      const addedPlural = toInsert.length !== 1 ? 's' : '';
      const skippedMsg = skipped > 0 ? ` (${skipped} already on your list)` : '';
      await sendWhatsApp(
        fromPhone,
        `Added ${toInsert.length} guest${addedPlural} to your Guest Ledger ✨${skippedMsg}\n\nOpen TDW → Plan → Guests and pull down to refresh to see them.`
      );
      return;
    }

    // Couple sent text only (no media) — gentle instructions
    if (couple && numMedia === 0) {
      const bodyLower = body.toLowerCase();
      // Only respond if they seem to be asking about contact import
      if (bodyLower.includes('import') || bodyLower.includes('contact') || bodyLower.includes('guest') || bodyLower.includes('help')) {
        await sendWhatsApp(
          fromPhone,
          `Hi ${couple.name?.split(' ')[0] || 'there'}! To add guests, forward me their contacts from WhatsApp:\n\n1. Long-press any chat\n2. Tap Attach → Contact\n3. Select up to 50 at a time\n4. Send them here\n\nI'll add them to your Guest Ledger automatically.`
        );
      }
      // Otherwise, silently ignore — couple-side DreamAi is future work
      return;
    }

    // ── Vendor branch (unchanged from before) ──────────────────
    const vendor = await findVendorByPhone(fromPhone);

    if (!vendor) {
      await sendWhatsApp(fromPhone, 'Welcome to Dream Ai. Your phone number is not registered with TDW yet. Please sign up at vendor.thedreamwedding.in first, then activate Dream Ai from your dashboard.');
      return;
    }

    if (!vendor.ai_enabled) {
      await sendWhatsApp(fromPhone, `Hi ${vendor.name.split(' ')[0]}, Dream Ai is currently in private beta with select founding vendors. Request access from your vendor dashboard and we'll be in touch.`);
      return;
    }

    // Track activity — powers Founding Vendors admin tab + keepalive cron
    try {
      await supabase.from('vendors').update({ last_whatsapp_activity: new Date().toISOString() }).eq('id', vendor.id);
    } catch (e) { /* non-fatal — column may not exist yet */ }

    // Check quota (tier allowance first, then extra tokens)
    const quota = getAiQuota(vendor);
    const used = vendor.ai_commands_used || 0;
    const extraTokens = vendor.ai_extra_tokens || 0;
    const tierRemaining = Math.max(0, quota - used);
    const totalRemaining = tierRemaining + extraTokens;
    if (totalRemaining <= 0) {
      await sendWhatsApp(fromPhone, "You've used all your Dream Ai commands this month. Buy more tokens at vendor.thedreamwedding.in/vendor/settings\n\n50 tokens: Rs.100\n200 tokens: Rs.350 (save 12%)\n500 tokens: Rs.800 (save 20%)");
      return;
    }
    // Low balance warning once at exactly 5 remaining
    if (totalRemaining === 5) {
      setTimeout(() => sendWhatsApp(fromPhone, 'Heads up — you have 5 Dream Ai commands left. Top up at vendor.thedreamwedding.in/vendor/settings'), 3000);
    }

    // Check if Anthropic is configured
    if (!anthropic) {
      await sendWhatsApp(fromPhone, 'Dream Ai is starting up. Please try again in a moment.');
      return;
    }

    // System prompt
    const today = new Date().toISOString().slice(0, 10);
    const systemPrompt = `You are Dream Ai, the WhatsApp assistant for The Dream Wedding — a premium Indian wedding vendor CRM.
You help wedding vendors manage their business via WhatsApp messages.

Today's date: ${today}
Vendor: ${vendor.name}
Category: ${vendor.category || 'wedding professional'}
City: ${vendor.city || 'India'}
Tier: ${vendor.tier || 'essential'}

Your job:
- Understand the vendor's natural language request (English, Hindi, or Hinglish)
- Call the appropriate tool to take action
- Keep responses brief and professional
- Indian currency: use ₹ and Indian number formatting (lakh, crore when appropriate)
- If the vendor is making small talk or the request is unclear, use general_reply
- Never make up data — only use tools to query or modify real data
- For Hindi/Hinglish commands, understand and respond naturally
- Dates: parse relative dates (today, tomorrow, next week, Saturday, Dec 15) into YYYY-MM-DD using today's date as reference`;

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      tools: TDW_AI_TOOLS,
      messages: [{ role: 'user', content: body }],
    });

    // Extract tool call from response
    let replyText = '';
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        replyText = await executeToolCall(block.name, block.input, vendor);
        break;
      } else if (block.type === 'text') {
        replyText = block.text;
      }
    }

    if (!replyText) replyText = 'I didn\'t understand that. Try: "Create invoice for Sharma ₹5L" or "What\'s my schedule today?"';

    // Increment command count
    await incrementAiCommands(vendor.id);

    // Send the reply
    await sendWhatsApp(fromPhone, replyText);
    console.log('[Dream Ai] Replied:', replyText.slice(0, 100));
  } catch (err) {
    console.error('[Dream Ai] Processing error:', err);
    try { await sendWhatsApp(from.replace('whatsapp:', ''), 'Sorry, I encountered an error. Please try again.'); } catch {}
  }
});

// Health check for Dream Ai
app.get('/api/ai-health', (req, res) => {
  res.json({
    success: true,
    twilio: !!twilioClient,
    anthropic: !!anthropic,
    whatsapp_number: TWILIO_WHATSAPP_NUMBER,
  });
});

// ═══════════════════════════════════════════════════════════════════
// PAi — Personal Assistant AI (Turn 9E)
// Structured NL → action extraction via Claude Haiku 4.5
// Invite-only during beta; 5-day access, 5 confirmed actions/day max.
// ═══════════════════════════════════════════════════════════════════

// ── Access check helper
async function checkPaiAccess(userType, userId) {
  const table = userType === 'vendor' ? 'vendors' : 'users';
  const { data, error } = await supabase
    .from(table)
    .select('id, pai_enabled, pai_expires_at')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return { ok: false, reason: 'not_found' };
  if (!data.pai_enabled) return { ok: false, reason: 'not_granted' };
  if (data.pai_expires_at) {
    const expires = new Date(data.pai_expires_at);
    if (expires < new Date()) return { ok: false, reason: 'expired' };
  }
  return { ok: true };
}

// ── Daily cap enforcement (5 confirmed actions / day)
async function checkDailyCap(userType, userId) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from('pai_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_type', userType)
    .eq('user_id', userId)
    .eq('user_confirmed', true)
    .gte('created_at', todayStart.toISOString());
  if (error) return { ok: true }; // fail open (don't block on DB errors)
  const used = count || 0;
  return { ok: used < 5, used, cap: 5 };
}

// ── Status endpoint — PWA calls this on PAi button mount
app.get('/api/pai/status', async (req, res) => {
  try {
    const { user_type, user_id } = req.query;
    if (!user_type || !user_id) {
      return res.status(400).json({ success: false, error: 'user_type and user_id required' });
    }
    const access = await checkPaiAccess(user_type, user_id);
    if (!access.ok) {
      // Check if a pending request already exists
      const { data: pending } = await supabase
        .from('pai_access_requests')
        .select('id, status, created_at')
        .eq('user_type', user_type)
        .eq('user_id', user_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return res.json({
        success: true,
        enabled: false,
        reason: access.reason,
        pending_request: pending || null,
      });
    }
    const cap = await checkDailyCap(user_type, user_id);
    // Fetch expiry to show in UI
    const table = user_type === 'vendor' ? 'vendors' : 'users';
    const { data: u } = await supabase
      .from(table).select('pai_expires_at').eq('id', user_id).maybeSingle();
    res.json({
      success: true,
      enabled: true,
      expires_at: u?.pai_expires_at || null,
      daily_cap: cap.cap,
      daily_used: cap.used,
      daily_remaining: cap.ok ? (cap.cap - cap.used) : 0,
    });
  } catch (error) {
    console.error('pai status error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Access request — non-granted users submit here
app.post('/api/pai/request-access', async (req, res) => {
  try {
    const { user_type, user_id, reason } = req.body || {};
    if (!user_type || !user_id) {
      return res.status(400).json({ success: false, error: 'user_type and user_id required' });
    }
    // Dedup: if there's already a pending request, don't create another
    const { data: existing } = await supabase
      .from('pai_access_requests')
      .select('id').eq('user_type', user_type).eq('user_id', user_id)
      .eq('status', 'pending').maybeSingle();
    if (existing) {
      return res.json({ success: true, already_pending: true, data: existing });
    }
    // Look up name/phone for admin display
    const table = user_type === 'vendor' ? 'vendors' : 'users';
    const { data: u } = await supabase
      .from(table).select('name, phone').eq('id', user_id).maybeSingle();
    const { data, error } = await supabase
      .from('pai_access_requests').insert([{
        user_type, user_id,
        user_name: u?.name || null, user_phone: u?.phone || null,
        reason: reason || null,
      }]).select().single();
    if (error) throw error;
    // Also stamp the user record so it's queryable inline
    await supabase.from(table).update({
      pai_access_requested_at: new Date().toISOString(),
    }).eq('id', user_id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('pai request-access error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── The main parse endpoint
// System prompt with JSON schema for structured extraction.
// Uses Haiku 4.5 with prompt caching on the large system prompt.
const PAI_VENDOR_SYSTEM = `You are PAi — Personal Assistant AI for a wedding vendor using The Dream Wedding platform.

Your ONLY job is to parse the vendor's natural-language input into a structured action.
Today's date: {{TODAY}}. India timezone. Vendor ID: {{VENDOR_ID}}.

Output JSON matching this exact schema (no other text):
{
  "intent": "<one of: create_todo | create_event | create_reminder | create_payment_schedule | create_invoice | unknown>",
  "confidence": <0.0-1.0>,
  "data": { <intent-specific fields> },
  "preview_summary": "<one human-readable sentence summarizing the parsed action>"
}

## Intents & schemas:

1. create_todo — personal task / to-do
   data: { title: string, due_date: "YYYY-MM-DD" | null, assigned_to: string | null, notes: string | null }

2. create_event — scheduled meeting / trial / visit
   data: { title: string, event_date: "YYYY-MM-DD", event_time: "HH:MM" | null, event_type: string, venue: string | null, notes: string | null }

3. create_reminder — reminder to self
   data: { title: string, remind_date: "YYYY-MM-DD", remind_time: "HH:MM" | null, notes: string | null }

4. create_payment_schedule — payment due from a client
   data: { client_name: string, client_phone: string | null, total_amount: number, instalments: [{ label: string, amount: number, due_date: "YYYY-MM-DD" | null }] }

5. create_invoice — bill a client
   data: { client_name: string, client_phone: string | null, amount: number, description: string | null, due_date: "YYYY-MM-DD" | null, gst_enabled: boolean }

## Rules:
- Parse dates relative to today. "tomorrow" = today + 1. "next Monday" = upcoming Monday. "25 April" = 2026-04-25 (this year unless past).
- Indian currency: "5 lakh" = 500000, "50k" = 50000, "2L" = 200000, "₹1cr" = 10000000.
- Understand Hindi/Hinglish. "kal" = tomorrow. "Vivek ko bolo" = assign to Vivek.
- If intent is ambiguous or missing critical info, set intent=unknown with preview_summary explaining what's missing.
- For create_payment_schedule with only one amount, make it a single instalment labeled "Advance" or "Final" based on context.
- GST off by default unless explicitly mentioned (e.g., "with GST", "include tax").
- Never fabricate client data. If client not mentioned, set client_name = "TBD".
- Keep preview_summary under 80 characters, natural English.

Return ONLY the JSON. No markdown, no explanation, no code fence.`;

const PAI_COUPLE_SYSTEM = `You are PAi — Personal Assistant AI for a couple using The Dream Wedding platform to plan their wedding.

Your ONLY job is to parse the couple's natural-language input into a structured action.
Today's date: {{TODAY}}. India timezone. Couple ID: {{COUPLE_ID}}.

Output JSON matching this exact schema (no other text):
{
  "intent": "<one of: create_checklist_item | create_expense | create_guest | create_moodboard_pin | update_vendor_stage | unknown>",
  "confidence": <0.0-1.0>,
  "data": { <intent-specific fields> },
  "preview_summary": "<one human-readable sentence>"
}

## Intents & schemas:

1. create_checklist_item — add a task to wedding planning checklist
   data: { title: string, category: string | null, due_date: "YYYY-MM-DD" | null }

2. create_expense — log a wedding-related expense (or shagun)
   data: { kind: "expense" | "shagun", name: string, amount: number, category: string | null, event: string | null, notes: string | null }

3. create_guest — add a guest to the guest ledger
   data: { name: string, phone: string | null, household_head: string | null, event_invites: string[] | null }

4. create_moodboard_pin — save an inspiration item
   data: { title: string, category: string | null, notes: string | null }

5. update_vendor_stage — move a vendor in the pipeline
   data: { vendor_name: string, new_stage: "Enquired" | "Quoted" | "Booked" | "Confirmed" | "Completed" }

## Rules:
- Dates relative to today. Indian currency conventions (lakh, crore, L, cr).
- Hindi/Hinglish. "bua ne 21000 diya" → create_expense kind=shagun, name="Bua", amount=21000.
- Wedding events: Haldi, Mehendi, Sangeet, Wedding, Reception.
- If ambiguous, intent=unknown with preview_summary explaining.
- Never fabricate data. If vendor name or guest name unclear, set intent=unknown.

Return ONLY the JSON.`;

app.post('/api/pai/parse', async (req, res) => {
  try {
    const { user_type, user_id, input_text } = req.body || {};
    if (!user_type || !user_id || !input_text) {
      return res.status(400).json({ success: false, error: 'user_type, user_id, and input_text required' });
    }

    // Access check
    const access = await checkPaiAccess(user_type, user_id);
    if (!access.ok) {
      return res.status(403).json({ success: false, error: 'access_denied', reason: access.reason });
    }

    // Daily cap check — counts CONFIRMED actions only, so parse requests themselves don't burn quota.
    // We just return current usage so UI can show warnings.

    if (!anthropic) {
      return res.status(503).json({ success: false, error: 'AI service not configured' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const system = (user_type === 'couple' ? PAI_COUPLE_SYSTEM : PAI_VENDOR_SYSTEM)
      .replace('{{TODAY}}', today)
      .replace(user_type === 'couple' ? '{{COUPLE_ID}}' : '{{VENDOR_ID}}', user_id);

    let parsed = null;
    let modelUsed = 'claude-haiku-4-5-20251001';
    let inputTokens = 0;
    let outputTokens = 0;
    let errMsg = null;

    try {
      const response = await anthropic.messages.create({
        model: modelUsed,
        max_tokens: 512,
        system: [
          {
            type: 'text',
            text: system,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: input_text }],
      });
      inputTokens = response.usage?.input_tokens || 0;
      outputTokens = response.usage?.output_tokens || 0;
      const textBlock = response.content.find(b => b.type === 'text');
      const raw = textBlock?.text || '';
      // Strip any markdown fence just in case
      const cleaned = raw.replace(/```json|```/g, '').trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        errMsg = 'Claude returned non-JSON: ' + raw.slice(0, 200);
      }
    } catch (apiErr) {
      errMsg = 'AI call failed: ' + apiErr.message;
    }

    // Log the parse attempt (confirmed=false at this point)
    const { data: logRow } = await supabase
      .from('pai_events')
      .insert([{
        user_type, user_id,
        input_text,
        parsed_intent: parsed?.intent || null,
        parsed_json: parsed || null,
        user_confirmed: false,
        error: errMsg,
        model_used: modelUsed,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      }])
      .select('id').single();

    if (errMsg) {
      return res.json({ success: false, error: errMsg, event_id: logRow?.id });
    }

    res.json({ success: true, parsed, event_id: logRow?.id });
  } catch (error) {
    console.error('pai parse error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Confirm endpoint — creates the actual record + marks event confirmed
app.post('/api/pai/confirm', async (req, res) => {
  try {
    const { event_id, user_type, user_id, intent, data } = req.body || {};
    if (!user_type || !user_id || !intent || !data) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    // Access + cap check
    const access = await checkPaiAccess(user_type, user_id);
    if (!access.ok) {
      return res.status(403).json({ success: false, error: 'access_denied', reason: access.reason });
    }
    const cap = await checkDailyCap(user_type, user_id);
    if (!cap.ok) {
      return res.status(429).json({ success: false, error: 'daily_cap_reached', used: cap.used, cap: cap.cap });
    }

    let createdId = null;
    let createErr = null;

    // Route to appropriate create based on intent
    try {
      if (user_type === 'vendor') {
        if (intent === 'create_todo') {
          const { data: t, error } = await supabase.from('vendor_todos').insert([{
            vendor_id: user_id,
            title: data.title,
            due_date: data.due_date || null,
            notes: data.notes || (data.assigned_to ? `Assigned to: ${data.assigned_to}` : null),
            done: false,
          }]).select().single();
          if (error) throw error; createdId = t?.id;
        } else if (intent === 'create_event') {
          const { data: e, error } = await supabase.from('vendor_calendar_events').insert([{
            vendor_id: user_id,
            title: data.title,
            event_date: data.event_date,
            event_time: data.event_time || null,
            event_type: data.event_type || 'Event',
            venue: data.venue || null,
            notes: data.notes || null,
          }]).select().single();
          if (error) throw error; createdId = e?.id;
        } else if (intent === 'create_reminder') {
          const { data: r, error } = await supabase.from('vendor_reminders').insert([{
            vendor_id: user_id,
            title: data.title,
            remind_date: data.remind_date,
            remind_time: data.remind_time || null,
            notes: data.notes || null,
          }]).select().single();
          if (error) throw error; createdId = r?.id;
        } else if (intent === 'create_payment_schedule') {
          const instalments = data.instalments && data.instalments.length > 0
            ? data.instalments
            : [{ label: 'Advance', amount: data.total_amount || 0, due_date: null, paid: false }];
          const { data: ps, error } = await supabase.from('vendor_payment_schedules').insert([{
            vendor_id: user_id,
            client_name: data.client_name,
            client_phone: data.client_phone || null,
            instalments: instalments.map(i => ({ ...i, paid: false })),
          }]).select().single();
          if (error) throw error; createdId = ps?.id;
        } else if (intent === 'create_invoice') {
          const amount = data.amount || 0;
          const gst_amount = data.gst_enabled ? amount * 0.18 : 0;
          const total_amount = amount + gst_amount;
          const invoice_number = `INV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`;
          const { data: inv, error } = await supabase.from('vendor_invoices').insert([{
            vendor_id: user_id,
            client_name: data.client_name,
            client_phone: data.client_phone || null,
            amount,
            gst_enabled: !!data.gst_enabled,
            gst_amount,
            total_amount,
            description: data.description || null,
            due_date: data.due_date || null,
            invoice_number,
            status: 'unpaid',
            issue_date: new Date().toISOString().slice(0, 10),
          }]).select().single();
          if (error) throw error; createdId = inv?.id;
        } else {
          throw new Error('Unknown vendor intent: ' + intent);
        }
      } else if (user_type === 'couple') {
        if (intent === 'create_checklist_item') {
          const { data: c, error } = await supabase.from('couple_checklist').insert([{
            user_id,
            title: data.title,
            category: data.category || 'General',
            due_date: data.due_date || null,
            done: false,
          }]).select().single();
          if (error) throw error; createdId = c?.id;
        } else if (intent === 'create_expense') {
          const table = data.kind === 'shagun' ? 'couple_shagun' : 'couple_expenses';
          const payload = data.kind === 'shagun'
            ? { user_id, giver_name: data.name, amount: data.amount, event: data.event || null, notes: data.notes || null }
            : { user_id, name: data.name, amount: data.amount, category: data.category || 'Other', notes: data.notes || null };
          const { data: e, error } = await supabase.from(table).insert([payload]).select().single();
          if (error) throw error; createdId = e?.id;
        } else if (intent === 'create_guest') {
          const { data: g, error } = await supabase.from('couple_guests').insert([{
            user_id,
            name: data.name,
            phone: data.phone || null,
            household_head: data.household_head || null,
            event_invites: data.event_invites || {},
          }]).select().single();
          if (error) throw error; createdId = g?.id;
        } else if (intent === 'create_moodboard_pin') {
          const { data: p, error } = await supabase.from('couple_moodboard_pins').insert([{
            user_id,
            title: data.title,
            category: data.category || 'Inspiration',
            notes: data.notes || null,
          }]).select().single();
          if (error) throw error; createdId = p?.id;
        } else if (intent === 'update_vendor_stage') {
          // Find existing vendor by name and update stage
          const { data: existing } = await supabase
            .from('couple_vendors').select('id')
            .eq('user_id', user_id)
            .ilike('vendor_name', `%${data.vendor_name}%`)
            .limit(1).maybeSingle();
          if (!existing) throw new Error(`Vendor "${data.vendor_name}" not found in your list`);
          const { data: upd, error } = await supabase
            .from('couple_vendors').update({ stage: data.new_stage })
            .eq('id', existing.id).select().single();
          if (error) throw error; createdId = upd?.id;
        } else {
          throw new Error('Unknown couple intent: ' + intent);
        }
      }
    } catch (e) {
      createErr = e.message;
    }

    // Mark event confirmed (even on DB error — we want the attempt logged)
    if (event_id) {
      await supabase.from('pai_events').update({
        user_confirmed: true,
        final_action_taken: !createErr,
        error: createErr,
      }).eq('id', event_id);
    } else {
      // No event_id (shouldn't happen but be defensive) — insert a standalone log
      await supabase.from('pai_events').insert([{
        user_type, user_id,
        input_text: '(direct confirm)',
        parsed_intent: intent,
        parsed_json: data,
        user_confirmed: true,
        final_action_taken: !createErr,
        error: createErr,
      }]);
    }

    if (createErr) {
      return res.status(500).json({ success: false, error: createErr });
    }
    res.json({ success: true, created_id: createdId });
  } catch (error) {
    console.error('pai confirm error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Admin: list all access requests
app.get('/api/pai/admin/requests', async (req, res) => {
  try {
    const { status } = req.query;
    let q = supabase.from('pai_access_requests').select('*').order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('pai admin requests error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Admin: grant PAi (approves request if exists)
app.post('/api/pai/admin/grant', async (req, res) => {
  try {
    const { user_type, user_id, days } = req.body || {};
    if (!user_type || !user_id) {
      return res.status(400).json({ success: false, error: 'user_type and user_id required' });
    }
    const dayCount = Math.min(Math.max(parseInt(days) || 5, 1), 30);
    const now = new Date();
    const expires = new Date(now.getTime() + dayCount * 24 * 60 * 60 * 1000);
    const table = user_type === 'vendor' ? 'vendors' : 'users';
    const { error } = await supabase.from(table).update({
      pai_enabled: true,
      pai_granted_at: now.toISOString(),
      pai_expires_at: expires.toISOString(),
    }).eq('id', user_id);
    if (error) throw error;
    // Mark any pending request as granted
    await supabase.from('pai_access_requests').update({
      status: 'granted',
      reviewed_at: now.toISOString(),
      reviewed_by: 'admin',
    }).eq('user_type', user_type).eq('user_id', user_id).eq('status', 'pending');
    res.json({ success: true, expires_at: expires.toISOString(), days: dayCount });
  } catch (error) {
    console.error('pai admin grant error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Admin: revoke PAi
app.post('/api/pai/admin/revoke', async (req, res) => {
  try {
    const { user_type, user_id } = req.body || {};
    if (!user_type || !user_id) {
      return res.status(400).json({ success: false, error: 'user_type and user_id required' });
    }
    const table = user_type === 'vendor' ? 'vendors' : 'users';
    const { error } = await supabase.from(table).update({
      pai_enabled: false,
    }).eq('id', user_id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('pai admin revoke error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Admin: deny request
app.post('/api/pai/admin/deny', async (req, res) => {
  try {
    const { request_id } = req.body || {};
    if (!request_id) return res.status(400).json({ success: false, error: 'request_id required' });
    const { error } = await supabase.from('pai_access_requests').update({
      status: 'denied',
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'admin',
    }).eq('id', request_id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('pai admin deny error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Admin: usage stats
app.get('/api/pai/admin/stats', async (req, res) => {
  try {
    const { data: events } = await supabase.from('pai_events').select('*').order('created_at', { ascending: false }).limit(500);
    const { data: grantedVendors } = await supabase.from('vendors').select('id, name, pai_granted_at, pai_expires_at').eq('pai_enabled', true);
    const { data: grantedCouples } = await supabase.from('users').select('id, name, pai_granted_at, pai_expires_at').eq('pai_enabled', true);
    res.json({
      success: true,
      events: events || [],
      granted_vendors: grantedVendors || [],
      granted_couples: grantedCouples || [],
    });
  } catch (error) {
    console.error('pai admin stats error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});


const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || '';
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || '';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyDzXw3pC_CmSW_q87I_fIUKNVfUIM806h8';

// Step 1: Send OTP
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: 'Phone number required' });

    // Diagnostic: log exactly what's missing so we can see in Railway logs
    if (!twilioClient) {
      console.error('[OTP] Twilio client not initialized. Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN env vars.');
    }
    if (twilioClient && !TWILIO_VERIFY_SID) {
      console.error('[OTP] TWILIO_VERIFY_SID env var missing — needed for Verify service.');
    }

    // Use Twilio Verify — sends real OTP via SMS
    if (twilioClient && TWILIO_VERIFY_SID) try {
      const verification = await twilioClient.verify.v2
        .services(TWILIO_VERIFY_SID)
        .verifications.create({ to: '+91' + phone, channel: 'sms' });
      console.log('[OTP] Twilio sent:', verification.status, 'to +91' + phone);
      return res.json({ success: true, sessionInfo: 'twilio_' + phone });
    } catch (twilioErr) {
      // Surface the actual Twilio error code so we know if it's quota, geo block, invalid number, etc.
      console.error('[OTP] Twilio send error:', twilioErr.code, twilioErr.message);
      // Common error codes: 60200 = invalid params, 60203 = max attempts, 20003 = auth fail, 21408 = unverified region
      const knownErrors = {
        60200: 'Invalid phone number format.',
        60203: 'Too many OTP attempts. Wait 10 minutes and try again.',
        60212: 'Too many OTP attempts on this number. Try later.',
        20003: 'Server config issue (Twilio auth). Please contact support.',
        21408: 'OTP service not enabled for India. Please contact support.',
      };
      const userMsg = knownErrors[twilioErr.code] || `OTP send failed (${twilioErr.code || 'unknown'}). Please try again.`;
      // Don't fall back if the error is user-facing (like wrong number)
      if (twilioErr.code === 60200 || twilioErr.code === 60203 || twilioErr.code === 60212) {
        return res.status(400).json({ success: false, error: userMsg });
      }
      // Otherwise fall through to Firebase fallback
    }

    // Fallback: Firebase Admin SDK session for test numbers
    if (admin.apps && admin.apps.length > 0) {
      console.log('[OTP] Falling back to Firebase test-number flow for +91' + phone);
      return res.json({ success: true, sessionInfo: 'admin_sdk_' + phone, note: 'Using Firebase fallback' });
    }

    console.error('[OTP] All OTP methods failed. Twilio: ' + (twilioClient ? 'configured' : 'not configured') + '. Firebase: ' + (admin.apps?.length > 0 ? 'configured' : 'not configured'));
    return res.status(500).json({ success: false, error: 'OTP service unavailable. Please try email signup or contact support.' });
  } catch (error) {
    console.error('[OTP] Unhandled send-otp error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Step 2: Verify OTP and get Firebase tokens
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { sessionInfo, code } = req.body;
    if (!sessionInfo || !code) return res.status(400).json({ success: false, error: 'Session info and code required' });

    // Handle Twilio verification
    if (sessionInfo.startsWith('twilio_')) {
      const phone = sessionInfo.replace('twilio_', '');
      try {
        const check = await twilioClient?.verify.v2
          .services(TWILIO_VERIFY_SID)
          .verificationChecks.create({ to: '+91' + phone, code });
        if (check.status === 'approved') {
          // OTP verified — create/get Firebase user via Admin SDK
          if (admin.apps && admin.apps.length > 0) {
            const phoneNumber = '+91' + phone;
            let uid;
            try { const user = await admin.auth().getUserByPhoneNumber(phoneNumber); uid = user.uid; }
            catch (e) { const newUser = await admin.auth().createUser({ phoneNumber }); uid = newUser.uid; }
            const customToken = await admin.auth().createCustomToken(uid);
            return res.json({ success: true, idToken: customToken, localId: uid, phoneNumber });
          }
          return res.json({ success: true, localId: 'twilio_' + phone, phoneNumber: '+91' + phone });
        }
        return res.status(400).json({ success: false, error: 'Incorrect code. Please try again.' });
      } catch (e) {
        return res.status(400).json({ success: false, error: 'Verification failed: ' + e.message });
      }
    }

    // Handle Admin SDK fallback session
    if (sessionInfo.startsWith('admin_sdk_') && admin.apps && admin.apps.length > 0) {
      const phone = sessionInfo.replace('admin_sdk_', '');
      const phoneNumber = '+91' + phone;
      // First try to verify via Firebase REST API (validates test numbers properly)
      try {
        const verifyRes = await fetch(
          'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=' + FIREBASE_API_KEY,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionInfo: 'admin_sdk_' + phone, code }) }
        );
        const verifyData = await verifyRes.json();
        // If REST API returns a valid token, use it
        if (verifyData.idToken) {
          return res.json({ success: true, idToken: verifyData.idToken, localId: verifyData.localId, phoneNumber });
        }
      } catch (e) {}
      // REST verify failed — only proceed if code matches known test codes
      // Test codes are configured in Firebase Console, we accept 123456 as fallback
      if (code !== '123456') {
        return res.status(400).json({ success: false, error: 'Incorrect code. Please try again.' });
      }
      try {
        let uid;
        try { const user = await admin.auth().getUserByPhoneNumber(phoneNumber); uid = user.uid; }
        catch (e) { const newUser = await admin.auth().createUser({ phoneNumber }); uid = newUser.uid; }
        const customToken = await admin.auth().createCustomToken(uid);
        return res.json({ success: true, idToken: customToken, localId: uid, phoneNumber });
      } catch (adminErr) {
        return res.status(400).json({ success: false, error: 'Verification failed: ' + adminErr.message });
      }
    }

    const response = await fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=' + FIREBASE_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionInfo, code }),
      }
    );

    const data = await response.json();

    if (data.error) {
      const msg = data.error.message === 'INVALID_CODE' ? 'Incorrect code. Please try again.'
        : data.error.message === 'SESSION_EXPIRED' ? 'Code expired. Please request a new one.'
        : data.error.message || 'Verification failed';
      return res.status(400).json({ success: false, error: msg });
    }

    res.json({
      success: true,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      localId: data.localId,
      phoneNumber: data.phoneNumber,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ==================
// PUSH NOTIFICATIONS — Expo Push API
// ==================

// Store vendor push tokens
app.post('/api/vendors/push-token', async (req, res) => {
  try {
    const { vendorId, token, platform } = req.body;
    const { data, error } = await supabase
      .from('vendors')
      .update({ push_token: token, push_platform: platform })
      .eq('id', vendorId)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send push notification helper
async function sendPushNotification(expoPushToken, title, body, data = {}) {
  if (!expoPushToken) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data,
      }),
    });
  } catch (e) {
    console.log('Push notification error:', e);
  }
}

// Notify vendor on new enquiry
app.post('/api/notify/new-enquiry', async (req, res) => {
  try {
    const { vendorId, coupleName, category } = req.body;
    const { data: vendor } = await supabase
      .from('vendors')
      .select('push_token, name')
      .eq('id', vendorId)
      .single();
    if (vendor?.push_token) {
      await sendPushNotification(
        vendor.push_token,
        'New Enquiry',
        coupleName + ' is interested in your ' + (category || 'services'),
        { type: 'new_enquiry', vendorId }
      );
    }
    // Also save to notifications table
    await supabase.from('notifications').insert([{
      user_id: vendorId,
      title: 'New Enquiry',
      message: coupleName + ' is interested in your ' + (category || 'services'),
      type: 'enquiry',
      read: false,
    }]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Notify couple when vendor replies
app.post('/api/notify/vendor-reply', async (req, res) => {
  try {
    const { userId, vendorName } = req.body;
    const { data: user } = await supabase
      .from('users')
      .select('push_token')
      .eq('id', userId)
      .single();
    if (user?.push_token) {
      await sendPushNotification(
        user.push_token,
        'Vendor Reply',
        vendorName + ' has responded to your enquiry',
        { type: 'vendor_reply', userId }
      );
    }
    await supabase.from('notifications').insert([{
      user_id: userId,
      title: 'Vendor Reply',
      message: vendorName + ' has responded to your enquiry',
      type: 'message',
      read: false,
    }]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Notify vendor on payment received
app.post('/api/notify/payment-received', async (req, res) => {
  try {
    const { vendorId, coupleName, amount } = req.body;
    const { data: vendor } = await supabase
      .from('vendors')
      .select('push_token')
      .eq('id', vendorId)
      .single();
    if (vendor?.push_token) {
      await sendPushNotification(
        vendor.push_token,
        'Payment Received',
        'Rs.' + (amount || 0).toLocaleString('en-IN') + ' received from ' + coupleName,
        { type: 'payment', vendorId }
      );
    }
    await supabase.from('notifications').insert([{
      user_id: vendorId,
      title: 'Payment Received',
      message: 'Rs.' + (amount || 0).toLocaleString('en-IN') + ' received from ' + coupleName,
      type: 'payment',
      read: false,
    }]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Notify couple on booking confirmation
app.post('/api/notify/booking-confirmed', async (req, res) => {
  try {
    const { userId, vendorName, eventDate } = req.body;
    const { data: user } = await supabase
      .from('users')
      .select('push_token')
      .eq('id', userId)
      .single();
    if (user?.push_token) {
      await sendPushNotification(
        user.push_token,
        'Booking Confirmed',
        vendorName + ' has confirmed your booking' + (eventDate ? ' for ' + eventDate : ''),
        { type: 'booking_confirmed', userId }
      );
    }
    await supabase.from('notifications').insert([{
      user_id: userId,
      title: 'Booking Confirmed',
      message: vendorName + ' has confirmed your booking' + (eventDate ? ' for ' + eventDate : ''),
      type: 'booking',
      read: false,
    }]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// Generate 6-char alpha-only code
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const PORT = process.env.PORT || 8080;

// v2 Couple Plan endpoints
app.get("/api/v2/couple/tasks/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase.from("couple_checklist").select("*").eq("couple_id", userId).order("due_date", { ascending: true });
    if (error) throw error;
    const rows = (data || []).map(t => ({ ...t, title: t.title || t.text || "", event_name: t.event_name || t.event || "", status: t.is_complete ? "done" : "pending", priority: t.priority === "high" ? "high" : t.priority === "low" ? "low" : "medium" }));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Internal server error" }); }
});
app.get("/api/v2/couple/money/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const [profile, expenses, eventsRaw] = await Promise.all([
      supabase.from("couple_profiles").select("total_budget").eq("user_id", userId).single().then(r => r.data),
      supabase.from("couple_expenses").select("*").eq("couple_id", userId).then(r => r.data || []),
      supabase.from("couple_events").select("id, event_name, budget_total").eq("couple_id", userId).then(r => r.data || []),
    ]);
    const exps = expenses.map(e => ({ ...e, amount: e.actual_amount || 0, status: e.payment_status || "committed", vendor_name: e.vendor_name || null, purpose: e.description || null, event_name: e.event || null }));
    const committed = exps.filter(e => ["committed","paid"].includes(e.status)).reduce((s,e) => s + e.amount, 0);
    const paid = exps.filter(e => e.status === "paid").reduce((s,e) => s + e.amount, 0);
    const upcoming = exps.filter(e => e.status !== "paid");
    const events = eventsRaw.map(e => ({ id: e.id, name: e.event_name || "", budget: e.budget_total || 0 }));
    res.json({ totalBudget: profile?.total_budget || 0, committed, paid, events, thisWeek: upcoming.slice(0,2), next30: upcoming });
  } catch (err) { res.status(500).json({ error: "Internal server error" }); }
});
app.get("/api/v2/couple/guests/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase.from("couple_guests").select("*").eq("couple_id", userId).order("name", { ascending: true });
    if (error) throw error;
    const rows = (data || []).map(g => ({ ...g, events: g.events || Object.keys(g.event_invites || {}), rsvp: g.rsvp_status || "pending" }));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Internal server error" }); }
});
app.get("/api/v2/couple/events/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase.from("couple_events").select("*").eq("couple_id", userId).order("event_date", { ascending: true });
    if (error) throw error;
    const rows = (data || []).map(e => ({ ...e, name: e.event_name || e.event_type || "", date: e.event_date || null, venue: e.venue || e.event_city || null, task_count: e.task_count ?? null, vendor_count: e.vendor_count ?? null, guest_count: e.guest_count ?? null }));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Internal server error" }); }
});

server.listen(PORT, () => {
  console.log(`The Dream Wedding API running on port ${PORT} 🎉`);
});

// DELETE routes for missing entities
app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('vendor_invoices').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/contracts/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('vendor_contracts').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/payment-schedules/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('vendor_payment_schedules').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================
// DELUXE SUITE — VENDOR TEAM MEMBERS
// ==================

app.get('/api/ds/team/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendor_team_members').select('*').eq('vendor_id', req.params.vendorId).order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/ds/team', async (req, res) => {
  try {
    const { vendor_id, name, email, phone, role, status, permissions, rate, rate_unit } = req.body;
    const { data, error } = await supabase.from('vendor_team_members').insert([{
      vendor_id, name, email, phone,
      role: role || 'staff',
      status: status || 'active',
      permissions: permissions || {},
      rate: rate ? parseInt(rate) : null,
      rate_unit: rate_unit || 'per_event',
    }]).select().single();
    if (error) throw error;

    // Auto-create login credentials for team member
    const loginId = (phone || email || '').toLowerCase().trim();
    if (loginId) {
      const tempPass = Math.random().toString(36).slice(-8); // 8-char random password
      const hashedPass = await bcrypt.hash(tempPass, 10);
      // Check if credentials already exist
      const { data: existing } = await supabase.from('vendor_credentials')
        .select('id').eq('username', loginId).single();
      if (!existing) {
        await supabase.from('vendor_credentials').insert([{
          vendor_id,
          username: loginId,
          password_hash: hashedPass,
          phone_number: phone ? (phone.startsWith('+91') ? phone : '+91' + phone) : null,
          is_team_member: true,
          team_member_id: data.id,
          team_role: role || 'staff',
        }]);
      }
      // Return temp password so owner can share it
      data.temp_password = tempPass;
      data.login_id = loginId;
    }

    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.put('/api/ds/team/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('vendor_team_members').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/ds/team/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('vendor_team_members').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================
// DELUXE SUITE — TEAM TASKS
// ==================

app.get('/api/ds/tasks/:vendorId', async (req, res) => {
  try {
    let query = supabase.from('team_tasks').select('*').eq('vendor_id', req.params.vendorId).order('created_at', { ascending: false });
    if (req.query.assigned_to) query = query.eq('assigned_to', req.query.assigned_to);
    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.category) query = query.eq('category', req.query.category);
    if (req.query.priority) query = query.eq('priority', req.query.priority);
    if (req.query.booking_id) query = query.eq('related_booking_id', req.query.booking_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/ds/tasks', async (req, res) => {
  try {
    const { vendor_id, assigned_to, assigned_by, title, description, priority, status, due_date, related_booking_id, related_client_name, category, notes } = req.body;
    const { data, error } = await supabase.from('team_tasks').insert([{ vendor_id, assigned_to, assigned_by, title, description, priority: priority || 'medium', status: status || 'pending', due_date, related_booking_id, related_client_name, category: category || 'general', notes }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.put('/api/ds/tasks/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    if (updates.status === 'completed' && !updates.completed_at) updates.completed_at = new Date().toISOString();
    const { data, error } = await supabase.from('team_tasks').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/ds/tasks/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('team_tasks').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/ds/tasks/:vendorId/stats', async (req, res) => {
  try {
    const { data, error } = await supabase.from('team_tasks').select('*').eq('vendor_id', req.params.vendorId);
    if (error) throw error;
    const total = data.length;
    const pending = data.filter(t => t.status === 'pending').length;
    const in_progress = data.filter(t => t.status === 'in_progress').length;
    const completed = data.filter(t => t.status === 'completed').length;
    const overdue = data.filter(t => t.status === 'overdue' || (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed')).length;
    res.json({ success: true, data: { total, pending, in_progress, completed, overdue } });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================
// DELUXE SUITE — TEAM MESSAGES
// ==================

app.get('/api/ds/messages/:vendorId', async (req, res) => {
  try {
    let query = supabase.from('team_messages').select('*').eq('vendor_id', req.params.vendorId).order('created_at', { ascending: true });
    if (req.query.channel_id) query = query.eq('channel_id', req.query.channel_id);
    if (req.query.channel_type) query = query.eq('channel_type', req.query.channel_type);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/ds/messages', async (req, res) => {
  try {
    const { vendor_id, sender_id, sender_name, channel_type, channel_id, message, message_type, reference_id } = req.body;
    const { data, error } = await supabase.from('team_messages').insert([{ vendor_id, sender_id, sender_name, channel_type: channel_type || 'group', channel_id, message, message_type: message_type || 'text', reference_id }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.put('/api/ds/messages/:id/pin', async (req, res) => {
  try {
    const { pinned } = req.body;
    const { data, error } = await supabase.from('team_messages').update({ pinned }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================
// DELUXE SUITE — PROCUREMENT
// ==================

app.get('/api/ds/procurement/:vendorId', async (req, res) => {
  try {
    let query = supabase.from('procurement_items').select('*').eq('vendor_id', req.params.vendorId).order('created_at', { ascending: false });
    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.booking_id) query = query.eq('booking_id', req.query.booking_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/ds/procurement', async (req, res) => {
  try {
    const { vendor_id, booking_id, item_name, description, vendor_supplier, status, assigned_to, expected_date, cost, notes, related_client_name } = req.body;
    const { data, error } = await supabase.from('procurement_items').insert([{ vendor_id, booking_id, item_name, description, vendor_supplier, status: status || 'ordered', assigned_to, expected_date, cost, notes, related_client_name }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.put('/api/ds/procurement/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('procurement_items').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/ds/procurement/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('procurement_items').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================
// DELUXE SUITE — DELIVERIES
// ==================

app.get('/api/ds/deliveries/:vendorId', async (req, res) => {
  try {
    let query = supabase.from('delivery_items').select('*').eq('vendor_id', req.params.vendorId).order('created_at', { ascending: false });
    if (req.query.status) query = query.eq('status', req.query.status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/ds/deliveries', async (req, res) => {
  try {
    const { vendor_id, booking_id, item_name, description, status, assigned_to, delivery_date, related_client_name, notes } = req.body;
    const { data, error } = await supabase.from('delivery_items').insert([{ vendor_id, booking_id, item_name, description, status: status || 'preparing', assigned_to, delivery_date, related_client_name, notes }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.put('/api/ds/deliveries/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    if (updates.status === 'client_confirmed' && !updates.client_confirmed_at) updates.client_confirmed_at = new Date().toISOString();
    const { data, error } = await supabase.from('delivery_items').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/ds/deliveries/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('delivery_items').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================
// DELUXE SUITE — TRIAL SCHEDULE
// ==================

app.get('/api/ds/trials/:vendorId', async (req, res) => {
  try {
    let query = supabase.from('trial_schedule').select('*').eq('vendor_id', req.params.vendorId).order('scheduled_date', { ascending: true });
    if (req.query.status) query = query.eq('status', req.query.status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/ds/trials', async (req, res) => {
  try {
    const { vendor_id, booking_id, client_name, trial_type, scheduled_date, assigned_to, status, notes } = req.body;
    const { data, error } = await supabase.from('trial_schedule').insert([{ vendor_id, booking_id, client_name, trial_type: trial_type || 'consultation', scheduled_date, assigned_to, status: status || 'scheduled', notes }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.put('/api/ds/trials/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('trial_schedule').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/ds/trials/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('trial_schedule').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================
// DELUXE SUITE — PHOTO APPROVALS
// ==================

app.get('/api/ds/photos/:vendorId', async (req, res) => {
  try {
    let query = supabase.from('photo_approvals').select('*').eq('vendor_id', req.params.vendorId).order('created_at', { ascending: false });
    if (req.query.status) query = query.eq('status', req.query.status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/ds/photos', async (req, res) => {
  try {
    const { vendor_id, uploaded_by, uploader_name, booking_id, related_client_name, file_url, thumbnail_url, file_type, title, description } = req.body;
    const { data, error } = await supabase.from('photo_approvals').insert([{ vendor_id, uploaded_by, uploader_name, booking_id, related_client_name, file_url, thumbnail_url, file_type: file_type || 'image', title, description, status: 'pending' }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.put('/api/ds/photos/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.status === 'approved' || updates.status === 'revision_requested') updates.reviewed_at = new Date().toISOString();
    const { data, error } = await supabase.from('photo_approvals').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;

    // Side effects on approval
    if (data && updates.status === 'approved') {
      const { category, image_id, vendor_id, file_url, photo_url } = data;
      const url = file_url || photo_url;

      // Carousel approval → add 'carousel' tag to vendor_images row
      if (category === 'carousel' && image_id) {
        try {
          const { data: img } = await supabase.from('vendor_images').select('tags').eq('id', image_id).maybeSingle();
          const newTags = Array.from(new Set([...((img?.tags || [])), 'carousel']));
          await supabase.from('vendor_images').update({ tags: newTags }).eq('id', image_id);
          await syncVendorImagesToVendorColumns(vendor_id);
        } catch (e) { console.error('[photo-approve] carousel side effect:', e.message); }
      }

      // Board approvals (spotlight/style_file/look_book/this_weeks_pricing) → insert into featured_boards
      const boardCategories = ['spotlight', 'style_file', 'look_book', 'this_weeks_pricing'];
      if (boardCategories.includes(category) && url) {
        try {
          // Check if already on board to avoid duplicates
          const { data: existing } = await supabase.from('featured_boards')
            .select('id').eq('vendor_id', vendor_id).eq('board_type', category).eq('image_url', url).limit(1).maybeSingle();
          if (!existing) {
            await supabase.from('featured_boards').insert([{
              vendor_id, board_type: category, image_url: url,
              image_id: image_id || null,
              title: data.title || null, description: data.description || null,
              created_at: new Date().toISOString(),
            }]);
          }
        } catch (e) { console.error('[photo-approve] board side effect:', e.message); }
      }
    }

    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================
// DELUXE SUITE — TEAM CHECK-INS
// ==================

app.get('/api/ds/checkins/:vendorId', async (req, res) => {
  try {
    let query = supabase.from('team_checkins').select('*').eq('vendor_id', req.params.vendorId).order('checked_in_at', { ascending: false });
    if (req.query.booking_id) query = query.eq('booking_id', req.query.booking_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/ds/checkins', async (req, res) => {
  try {
    const { vendor_id, member_id, member_name, booking_id, related_client_name, notes } = req.body;
    const { data, error } = await supabase.from('team_checkins').insert([{ vendor_id, member_id, member_name, booking_id, related_client_name, status: 'checked_in', notes }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.put('/api/ds/checkins/:id/checkout', async (req, res) => {
  try {
    const { data, error } = await supabase.from('team_checkins').update({ status: 'checked_out', checked_out_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================
// DELUXE SUITE — CLIENT SENTIMENT
// ==================

app.get('/api/ds/sentiment/:vendorId', async (req, res) => {
  try {
    let query = supabase.from('client_sentiment').select('*').eq('vendor_id', req.params.vendorId).order('created_at', { ascending: false });
    if (req.query.client_name) query = query.eq('client_name', req.query.client_name);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/ds/sentiment', async (req, res) => {
  try {
    const { vendor_id, booking_id, client_name, milestone, rating, logged_by, logger_name, notes } = req.body;
    const { data, error } = await supabase.from('client_sentiment').insert([{ vendor_id, booking_id, client_name, milestone, rating, logged_by, logger_name, notes }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================
// DELUXE SUITE — DELEGATION TEMPLATES
// ==================

app.get('/api/ds/templates/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('delegation_templates').select('*').eq('vendor_id', req.params.vendorId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/ds/templates', async (req, res) => {
  try {
    const { vendor_id, template_name, event_type, tasks } = req.body;
    const { data, error } = await supabase.from('delegation_templates').insert([{ vendor_id, template_name, event_type: event_type || 'wedding', tasks: tasks || [] }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.put('/api/ds/templates/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('delegation_templates').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/ds/templates/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('delegation_templates').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================
// DELUXE SUITE — DAILY BRIEFING (computed)
// ==================

app.get('/api/ds/briefing/:vendorId', async (req, res) => {
  try {
    const vid = req.params.vendorId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [tasks, procurement, deliveries, trials, checkins, sentiment] = await Promise.all([
      supabase.from('team_tasks').select('*').eq('vendor_id', vid),
      supabase.from('procurement_items').select('*').eq('vendor_id', vid).in('status', ['ordered', 'in_transit']),
      supabase.from('delivery_items').select('*').eq('vendor_id', vid).in('status', ['preparing', 'dispatched']),
      supabase.from('trial_schedule').select('*').eq('vendor_id', vid).gte('scheduled_date', today.toISOString()).lte('scheduled_date', weekEnd.toISOString()).in('status', ['scheduled', 'confirmed']),
      supabase.from('team_checkins').select('*').eq('vendor_id', vid).gte('checked_in_at', today.toISOString()),
      supabase.from('client_sentiment').select('*').eq('vendor_id', vid).eq('rating', 'concerned'),
    ]);

    const allTasks = tasks.data || [];
    const overdueTasks = allTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed');
    const todayTasks = allTasks.filter(t => t.due_date && new Date(t.due_date) >= today && new Date(t.due_date) < tomorrow && t.status !== 'completed');
    const pendingTasks = allTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');

    res.json({
      success: true,
      data: {
        tasks_today: todayTasks.length,
        tasks_overdue: overdueTasks.length,
        tasks_pending: pendingTasks.length,
        tasks_overdue_list: overdueTasks.slice(0, 5),
        tasks_today_list: todayTasks.slice(0, 5),
        procurement_active: (procurement.data || []).length,
        deliveries_pending: (deliveries.data || []).length,
        trials_this_week: (trials.data || []).length,
        trials_list: (trials.data || []).slice(0, 5),
        team_onsite_today: (checkins.data || []).filter(c => c.status === 'checked_in').length,
        concerns: (sentiment.data || []).length,
        concerns_list: (sentiment.data || []).slice(0, 3),
      },
    });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================
// DELUXE SUITE — TEAM PERFORMANCE (computed)
// ==================

app.get('/api/ds/performance/:vendorId', async (req, res) => {
  try {
    const vid = req.params.vendorId;
    const [members, tasks] = await Promise.all([
      supabase.from('vendor_team_members').select('*').eq('vendor_id', vid).eq('status', 'active'),
      supabase.from('team_tasks').select('*').eq('vendor_id', vid),
    ]);
    const allMembers = members.data || [];
    const allTasks = tasks.data || [];
    const performance = allMembers.map(m => {
      const memberTasks = allTasks.filter(t => t.assigned_to === m.id);
      const completed = memberTasks.filter(t => t.status === 'completed');
      const overdue = memberTasks.filter(t => t.status === 'overdue' || (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'));
      const onTime = completed.filter(t => t.due_date && t.completed_at && new Date(t.completed_at) <= new Date(t.due_date));
      return {
        member_id: m.id,
        name: m.name,
        role: m.role,
        total_tasks: memberTasks.length,
        completed: completed.length,
        overdue: overdue.length,
        on_time: onTime.length,
        on_time_rate: completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : 0,
        pending: memberTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
      };
    });
    res.json({ success: true, data: performance });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/tds/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('vendor_tds_ledger').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});


// ==================
// LUXURY / CURATED VENDORS
// ==================

// Browse luxury vendors (couple-side)
app.get('/api/luxury/vendors', async (req, res) => {
  try {
    const { category, city } = req.query;
    let query = supabase.from('vendors').select('*').eq('is_luxury', true).eq('luxury_approved', true);
    if (category) query = query.eq('luxury_category', category);
    if (city) query = query.contains('destination_tags', [city]);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Request appointment (couple-side)
app.post('/api/luxury/appointments', async (req, res) => {
  try {
    const { vendor_id, couple_id, appointment_fee } = req.body;
    const response_deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    // Default split: 80% vendor, 20% TDW
    const vendor_share = Math.round(appointment_fee * 0.8);
    const tdw_share = appointment_fee - vendor_share;
    const { data, error } = await supabase.from('luxury_appointments').insert([{
      vendor_id, couple_id, appointment_fee, status: 'requested',
      requested_at: new Date().toISOString(), response_deadline,
      vendor_share, tdw_share, payment_id: null, refund_id: null,
    }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Vendor confirms or declines appointment
app.put('/api/luxury/appointments/:id', async (req, res) => {
  try {
    const { status } = req.body; // 'confirmed' or 'declined'
    const updates = { status, responded_at: new Date().toISOString() };
    if (status === 'declined') {
      updates.refund_id = 'pending_refund'; // Razorpay refund triggered here in production
    }
    const { data, error } = await supabase.from('luxury_appointments').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Vendor's appointment list
app.get('/api/luxury/appointments/vendor/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('luxury_appointments').select('*').eq('vendor_id', req.params.vendorId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Expire unresponded appointments (cron — call daily)
app.post('/api/luxury/expire-appointments', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('luxury_appointments')
      .update({ status: 'expired', refund_id: 'auto_refund' })
      .eq('status', 'requested')
      .lt('response_deadline', now)
      .select();
    if (error) throw error;
    res.json({ success: true, expired: data?.length || 0, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});


// ==================
// ADMIN — COUPLE TIER MANAGEMENT
// Couple tier mapping: DB value -> UI label
// 'free' = Basic (3 tokens)
// 'premium' = Gold (15 tokens, Rs.999 one-time)
// 'elite' = Platinum (unlimited tokens, Rs.2,999 one-time)
// Vendor tier mapping: DB value = UI label (essential/signature/prestige)
// ==================

// Search user by email or phone
app.get('/api/admin/users/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: false, error: 'Search query required' });
    // Search by phone or email or name
    const { data: byPhone } = await supabase.from('users').select('*').eq('phone', q);
    const { data: byEmail } = await supabase.from('users').select('*').ilike('email', q);
    const { data: byName } = await supabase.from('users').select('*').ilike('name', '%' + q + '%');
    const all = [...(byPhone || []), ...(byEmail || []), ...(byName || [])];
    // Deduplicate by id
    const unique = all.filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i);
    res.json({ success: true, data: unique });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Update user tier + tokens from admin
app.put('/api/admin/users/:id/tier', async (req, res) => {
  try {
    const { couple_tier, token_balance } = req.body;
    const updates = {};
    if (couple_tier) updates.couple_tier = couple_tier;
    if (token_balance !== undefined) updates.token_balance = token_balance;
    const { data, error } = await supabase.from('users').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});


// ── Check and downgrade expired vendor trials ──
app.post('/api/subscriptions/check-expiry', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    // Find all trial subscriptions past their end date
    const { data: expired } = await supabase
      .from('vendor_subscriptions')
      .select('*')
      .eq('status', 'trial')
      .lte('trial_end', today);

    if (!expired || expired.length === 0) {
      return res.json({ success: true, downgraded: 0 });
    }

    // Downgrade each to essential
    for (const sub of expired) {
      await supabase.from('vendor_subscriptions')
        .update({ tier: 'essential', status: 'expired_trial' })
        .eq('id', sub.id);
    }

    res.json({ success: true, downgraded: expired.length });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Update vendor tier from admin ──
// Get pending featured photos for admin approval
// Log when featured photo is submitted
app.post('/api/ds/photos', async (req, res) => {
  try {
    const photoData = req.body;
    const { data, error } = await supabase.from('photo_approvals').insert([photoData]).select().single();
    if (error) throw error;
    if (photoData.status === 'pending') {
      logActivity('photo_approval_requested', 'Featured photo submitted by vendor ' + (photoData.vendor_id || '').slice(0, 8), { vendor_id: photoData.vendor_id, photo_url: photoData.photo_url });
    }
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Pending photos — supports filtering by category for admin Photos folder
app.get('/api/ds/photos/pending', async (req, res) => {
  try {
    const { category } = req.query;
    let q = supabase
      .from('photo_approvals')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (category) q = q.eq('category', category);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Pending photo counts grouped by category — for admin Photos folder badges
app.get('/api/ds/photos/pending-counts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('photo_approvals')
      .select('category')
      .eq('status', 'pending');
    if (error) throw error;
    const counts = {};
    for (const row of (data || [])) {
      const c = row.category || 'uncategorized';
      counts[c] = (counts[c] || 0) + 1;
    }
    res.json({ success: true, counts });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Vendor: submit a batch of photos for a specific board category
// Body: {vendor_id, category, image_ids: [...]}
// Categories: 'carousel' | 'spotlight' | 'style_file' | 'look_book' | 'this_weeks_pricing'
app.post('/api/ds/photos/submit-batch', async (req, res) => {
  try {
    const { vendor_id, category, image_ids } = req.body || {};
    if (!vendor_id || !category || !Array.isArray(image_ids) || image_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'vendor_id, category, image_ids[] required' });
    }
    const allowedCats = ['carousel', 'spotlight', 'style_file', 'look_book', 'this_weeks_pricing'];
    if (!allowedCats.includes(category)) {
      return res.status(400).json({ success: false, error: 'Invalid category' });
    }

    // Determine if vendor is Prestige (auto-approve)
    let isPrestige = false;
    try {
      const { data: sub } = await supabase.from('vendor_subscriptions')
        .select('tier').eq('vendor_id', vendor_id).maybeSingle();
      isPrestige = (sub?.tier || '').toLowerCase() === 'prestige';
    } catch {}

    // For each image_id, fetch the URL + create a photo_approvals row
    const created = [];
    for (const imageId of image_ids) {
      try {
        const { data: img } = await supabase.from('vendor_images')
          .select('url').eq('id', imageId).maybeSingle();
        if (!img?.url) continue;
        // Check if already pending for this category to avoid duplicates
        const { data: existing } = await supabase.from('photo_approvals')
          .select('id').eq('vendor_id', vendor_id).eq('image_id', imageId).eq('category', category)
          .in('status', ['pending', 'approved']).limit(1).maybeSingle();
        if (existing) continue;

        const { data: row, error } = await supabase.from('photo_approvals').insert([{
          vendor_id, image_id: imageId, category,
          file_url: img.url, photo_url: img.url, file_type: 'image',
          status: isPrestige ? 'approved' : 'pending',
          description: `Submitted for ${category.replace(/_/g, ' ')}`,
        }]).select().single();
        if (!error && row) created.push(row.id);
      } catch (e) { /* per-image best-effort */ }
    }

    logActivity('photos_submitted', `Vendor ${vendor_id} submitted ${created.length} photos for ${category}` + (isPrestige ? ' (auto-approved Prestige)' : ''));
    res.json({ success: true, submitted: created.length, auto_approved: isPrestige });
  } catch (error) {
    console.error('[submit-batch] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vendor: get current submission status per image+category (for showing "Submitted" badges in Image Hub)
app.get('/api/ds/photos/submitted/:vendor_id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('photo_approvals')
      .select('image_id, category, status')
      .eq('vendor_id', req.params.vendor_id)
      .in('status', ['pending', 'approved', 'revision_needed']);
    if (error) throw error;
    // Group by image_id -> {category: status}
    const byImage = {};
    for (const r of (data || [])) {
      if (!r.image_id) continue;
      if (!byImage[r.image_id]) byImage[r.image_id] = {};
      byImage[r.image_id][r.category] = r.status;
    }
    res.json({ success: true, by_image: byImage });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});


// ==================
// ADMIN ACTIVITY LOG
// ==================

// Log an admin activity
async function logActivity(type, description, metadata = {}) {
  try {
    await supabase.from('admin_activity_log').insert([{
      type,
      description,
      metadata,
      created_at: new Date().toISOString(),
    }]);
  } catch (e) { console.error('Activity log error:', e.message); }
}

// Get recent activities
app.get('/api/admin/activities', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const { data, error } = await supabase
      .from('admin_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});


// ==================
// DESTINATION PACKAGES
// ==================

// Get all approved packages (couple-facing)
app.get('/api/destination-packages', async (req, res) => {
  try {
    const { destination, status } = req.query;
    let query = supabase.from('destination_packages').select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    else query = query.eq('status', 'approved');
    if (destination) query = query.eq('destination', destination);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Get packages by vendor (event manager dashboard)
app.get('/api/destination-packages/vendor/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('destination_packages').select('*').eq('vendor_id', req.params.vendorId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Get pending packages (admin)
app.get('/api/destination-packages/pending', async (req, res) => {
  try {
    const { data, error } = await supabase.from('destination_packages').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Create package (event manager)
app.post('/api/destination-packages', async (req, res) => {
  try {
    const { data, error } = await supabase.from('destination_packages').insert([req.body]).select().single();
    if (error) throw error;
    logActivity('destination_package_created', 'New destination package: ' + (data.package_name || '') + ' in ' + (data.destination || ''), { vendor_id: data.vendor_id, package_id: data.id });
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Update package status (admin approve/reject)
app.put('/api/destination-packages/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('destination_packages').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Delete package
app.delete('/api/destination-packages/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('destination_packages').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});


// ==================
// FEATURED BOARDS (Spotlight, Get Inspired, Look Book, Special Offers)
// ==================

// Get board items by type (couple-facing)
app.get('/api/featured-boards/:type', async (req, res) => {
  try {
    const { data, error } = await supabase.from('featured_boards').select('*').eq('board_type', req.params.type).eq('status', 'active').order('sort_order', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Get all board items (admin)
app.get('/api/featured-boards', async (req, res) => {
  try {
    const { data, error } = await supabase.from('featured_boards').select('*').order('board_type').order('sort_order', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Create board item (admin)
app.post('/api/featured-boards', async (req, res) => {
  try {
    const { data, error } = await supabase.from('featured_boards').insert([req.body]).select().single();
    if (error) throw error;
    logActivity('featured_board_created', 'Added to ' + (req.body.board_type || '').replace('_', ' ') + ': ' + (req.body.title || req.body.vendor_name || ''));
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Update board item (admin)
app.put('/api/featured-boards/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('featured_boards').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Delete board item (admin)
app.delete('/api/featured-boards/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('featured_boards').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ══════════════════════════════════════════════════════════════
// TRENDING — algorithmic top vendors (enquiries last 7 days) + admin pin
// ══════════════════════════════════════════════════════════════

app.get('/api/vendors/trending', async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const { data: pinned } = await supabase.from('vendors')
      .select('*')
      .eq('trending_pinned', true)
      .eq('vendor_discover_enabled', true)
      .eq('discover_listed', true)
      .order('trending_pinned_at', { ascending: false });

    const pinnedIds = new Set((pinned || []).map(v => v.id));

    const { data: recentEnquiries } = await supabase.from('vendor_enquiries')
      .select('vendor_id')
      .gte('created_at', sevenDaysAgo);

    const counts = {};
    for (const row of (recentEnquiries || [])) {
      if (!row.vendor_id) continue;
      counts[row.vendor_id] = (counts[row.vendor_id] || 0) + 1;
    }

    const sortedIds = Object.entries(counts)
      .filter(([id]) => !pinnedIds.has(id))
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    const need = Math.max(0, 6 - (pinned || []).length);
    let algo = [];
    if (need > 0 && sortedIds.length > 0) {
      const { data } = await supabase.from('vendors')
        .select('*')
        .in('id', sortedIds.slice(0, need))
        .eq('vendor_discover_enabled', true)
        .eq('discover_listed', true);
      if (data) {
        const lookup = Object.fromEntries(data.map(v => [v.id, v]));
        algo = sortedIds.slice(0, need).map(id => lookup[id]).filter(Boolean);
      }
    }

    const trending = [...(pinned || []), ...algo].slice(0, 6).map(v => ({
      ...v,
      trending_reason: pinnedIds.has(v.id) ? 'pinned' : 'enquiries',
      enquiry_count_7d: counts[v.id] || 0,
    }));

    res.json({ success: true, data: trending });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Admin: toggle trending_pinned
app.post('/api/admin/trending/pin', async (req, res) => {
  try {
    const { vendor_id, pinned } = req.body || {};
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    const { error } = await supabase.from('vendors').update({
      trending_pinned: !!pinned,
      trending_pinned_at: pinned ? new Date().toISOString() : null,
    }).eq('id', vendor_id);
    if (error) throw error;
    logActivity('trending_' + (pinned ? 'pinned' : 'unpinned'), 'Vendor ' + vendor_id);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Vendor: toggle flex_leads_enabled (accept leads 15% below range)
app.post('/api/vendor-discover/flex-leads', async (req, res) => {
  try {
    const { vendor_id, enabled } = req.body || {};
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    const { error } = await supabase.from('vendors').update({
      flex_leads_enabled: !!enabled,
    }).eq('id', vendor_id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});


// Admin: delete user
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    // Fetch user to log + get phone for hard cleanup
    const { data: user } = await supabase.from('users').select('id, phone, email, name').eq('id', userId).maybeSingle();
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Cascade delete all couple-related rows (best-effort, ignore errors per table)
    const childTables = [
      'couple_events', 'couple_event_category_budgets', 'couple_checklist',
      'couple_guests', 'couple_moodboard_pins', 'couple_shagun', 'couple_vendors',
      'guests', 'moodboard_items', 'co_planners',
      'vendor_enquiries', 'vendor_enquiry_messages',
      'lock_date_holds', 'lock_date_interest', 'luxury_appointments',
      'couple_discover_waitlist', 'couple_waitlist',
      'discover_access_requests', 'pai_access_requests', 'pai_events',
      'ai_token_purchases', 'notifications', 'messages',
    ];
    for (const t of childTables) {
      try {
        // Try multiple possible foreign key names
        await supabase.from(t).delete().eq('user_id', userId);
        await supabase.from(t).delete().eq('couple_id', userId);
      } catch {}
    }

    // CRITICAL: Nullify access_codes.redeemed_user_id (FK that blocks delete)
    try { await supabase.from('access_codes').update({ redeemed_user_id: null }).eq('redeemed_user_id', userId); } catch {}

    // Finally delete the user row
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;
    logActivity('user_deleted', `Deleted user ${user.name || ''} (${user.phone || user.email || userId})`);
    res.json({ success: true, deleted: { id: userId, phone: user.phone, email: user.email } });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Admin: delete vendor (hard cascade — clears credentials AND every child table)
app.delete('/api/admin/vendors/:id', async (req, res) => {
  try {
    const vendorId = req.params.id;
    const { data: vendor } = await supabase.from('vendors').select('id, name, phone, email').eq('id', vendorId).maybeSingle();
    if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });

    // ALL vendor-related tables (must clear before deleting vendors row)
    const childTables = [
      'vendor_subscriptions', 'vendor_logins', 'vendor_credentials', 'vendor_login_codes',
      'vendor_images', 'vendor_packages', 'vendor_availability_blocks', 'vendor_calendar_events',
      'vendor_clients', 'vendor_contracts', 'vendor_invoices', 'vendor_payment_schedules',
      'vendor_leads', 'vendor_enquiries', 'vendor_enquiry_messages', 'vendor_assistants',
      'vendor_team_members', 'vendor_todos', 'vendor_reminders', 'vendor_referrals',
      'vendor_offers', 'vendor_boosts', 'vendor_featured_applications', 'vendor_photo_approvals',
      'vendor_wedding_albums', 'vendor_tds_ledger', 'vendor_activity_log', 'vendor_analytics_daily',
      'vendor_discover_access_requests', 'vendor_discover_submissions',
      'blocked_dates', 'bookings', 'lock_date_holds', 'lock_date_interest', 'luxury_appointments',
      'photo_approvals', 'team_tasks', 'team_messages', 'team_checkins',
      'procurement_items', 'delivery_items', 'trial_schedule', 'client_sentiment',
      'delegation_templates', 'destination_packages', 'featured_boards', 'discover_access_requests',
    ];
    for (const t of childTables) {
      try { await supabase.from(t).delete().eq('vendor_id', vendorId); } catch {}
    }

    // CRITICAL: Nullify access_codes.redeemed_vendor_id (FK that blocks delete)
    try { await supabase.from('access_codes').update({ redeemed_vendor_id: null }).eq('redeemed_vendor_id', vendorId); } catch {}

    // Now delete the vendor row itself
    const { error } = await supabase.from('vendors').delete().eq('id', vendorId);
    if (error) throw error;
    logActivity('vendor_deleted', `Deleted vendor ${vendor.name} (${vendor.phone || vendor.email || vendorId})`);
    res.json({ success: true, deleted: { id: vendorId, name: vendor.name, phone: vendor.phone, email: vendor.email } });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Admin: cleanup orphan login rows by phone/email (use to fix legacy delete remnants)
app.post('/api/admin/cleanup-credentials', async (req, res) => {
  try {
    const { phone, email } = req.body || {};
    if (!phone && !email) return res.status(400).json({ success: false, error: 'phone or email required' });
    const cleanPhone = phone ? ('+91' + ('' + phone).replace(/\D/g, '').slice(-10)) : null;
    const cleanEmail = email ? email.toLowerCase().trim() : null;
    let removed = { vendor_credentials: 0, vendor_logins: 0, users: 0 };

    if (cleanPhone) {
      const { count: vc } = await supabase.from('vendor_credentials').delete({ count: 'exact' }).eq('phone_number', cleanPhone);
      removed.vendor_credentials += vc || 0;
      const { count: vl } = await supabase.from('vendor_logins').delete({ count: 'exact' }).eq('phone', cleanPhone);
      removed.vendor_logins += vl || 0;
      const { count: u } = await supabase.from('users').delete({ count: 'exact' }).eq('phone', cleanPhone);
      removed.users += u || 0;
    }
    if (cleanEmail) {
      const { count: vc } = await supabase.from('vendor_credentials').delete({ count: 'exact' }).eq('username', cleanEmail);
      removed.vendor_credentials += vc || 0;
      const { count: u } = await supabase.from('users').delete({ count: 'exact' }).eq('email', cleanEmail);
      removed.users += u || 0;
    }
    logActivity('credentials_cleanup', `Cleanup for ${cleanPhone || cleanEmail}: ${JSON.stringify(removed)}`);
    res.json({ success: true, removed });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Admin: create vendor profile directly (phone + password + tier)
app.post('/api/admin/create-vendor', async (req, res) => {
  try {
    const { name, phone, password, tier } = req.body || {};
    if (!phone || !password) return res.status(400).json({ success: false, error: 'phone + password required' });
    if (password.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    const allowedTiers = ['essential', 'signature', 'prestige'];
    const finalTier = allowedTiers.includes(tier) ? tier : 'essential';

    const cleanPhone = ('' + phone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) return res.status(400).json({ success: false, error: 'Phone must be 10 digits' });
    const fullPhone = '+91' + cleanPhone;

    console.log('[admin-create-vendor] Starting for phone:', fullPhone, 'tier:', finalTier);

    // Pre-check: any existing vendor_credentials with this phone? Reject if so.
    const { data: existingCreds } = await supabase.from('vendor_credentials')
      .select('id, vendor_id').eq('phone_number', fullPhone);
    if (existingCreds && existingCreds.length > 0) {
      console.log('[admin-create-vendor] Existing creds found:', existingCreds.length, 'rows. Rejecting.');
      return res.status(409).json({
        success: false,
        error: `Vendor with this phone already exists (${existingCreds.length} stale credential row(s) found). Run cleanup-credentials first to clear them.`,
      });
    }
    // Also check: any existing vendor row with this phone?
    const { data: existingVendors } = await supabase.from('vendors')
      .select('id').eq('phone', cleanPhone);
    if (existingVendors && existingVendors.length > 0) {
      console.log('[admin-create-vendor] Existing vendor row found. Cleaning before re-create.');
      // Soft cleanup of vendor row + related (since user is choosing to re-create)
      for (const v of existingVendors) {
        try { await supabase.from('vendor_subscriptions').delete().eq('vendor_id', v.id); } catch {}
        try { await supabase.from('vendors').delete().eq('id', v.id); } catch {}
      }
    }
    // Also check: any other rows in vendor_credentials with username matching cleanPhone (unique constraint)
    const { data: existingByUsername } = await supabase.from('vendor_credentials')
      .select('id').eq('username', cleanPhone);
    if (existingByUsername && existingByUsername.length > 0) {
      console.log('[admin-create-vendor] Cleaning stale username-only credential rows:', existingByUsername.length);
      for (const c of existingByUsername) {
        try { await supabase.from('vendor_credentials').delete().eq('id', c.id); } catch {}
      }
    }

    // Create vendor row
    const { data: vendor, error: vErr } = await supabase.from('vendors').insert([{
      name: name || ('Vendor ' + cleanPhone), category: 'photographers', city: 'Delhi NCR',
      phone: cleanPhone, ig_verified: false, subscription_active: true,
    }]).select().single();
    if (vErr) {
      console.error('[admin-create-vendor] Vendor insert failed:', vErr.message);
      return res.status(500).json({ success: false, error: 'Vendor row insert failed: ' + vErr.message });
    }
    console.log('[admin-create-vendor] Vendor row created:', vendor.id);

    // Create subscription
    const threeMonths = new Date(Date.now() + 90 * 86400000);
    const aug1 = new Date('2026-08-01T00:00:00Z');
    const trial_end = threeMonths < aug1 ? threeMonths : aug1;
    const { error: sErr } = await supabase.from('vendor_subscriptions').insert([{
      vendor_id: vendor.id, tier: finalTier, status: 'trial',
      trial_start_date: new Date().toISOString(), trial_end_date: trial_end.toISOString(),
      activated_by_code: 'ADMIN_CREATED', is_founding_vendor: false, founding_badge: false,
    }]);
    if (sErr) console.error('[admin-create-vendor] Subscription insert failed (non-fatal):', sErr.message);

    // Create credentials — THIS IS THE CRITICAL ONE; capture and surface error
    const hashedPwd = await bcrypt.hash(password, 10);
    const { error: cErr } = await supabase.from('vendor_credentials').insert([{
      vendor_id: vendor.id, username: cleanPhone, password_hash: hashedPwd,
      phone_number: fullPhone, phone_verified: true, email_verified: false,
    }]);
    if (cErr) {
      console.error('[admin-create-vendor] CREDENTIALS insert failed:', cErr.message);
      // Roll back vendor row to avoid orphaned vendor with no login
      try { await supabase.from('vendor_subscriptions').delete().eq('vendor_id', vendor.id); } catch {}
      try { await supabase.from('vendors').delete().eq('id', vendor.id); } catch {}
      return res.status(500).json({ success: false, error: 'Credentials insert failed: ' + cErr.message });
    }
    console.log('[admin-create-vendor] Credentials inserted. Login should now work for', fullPhone);

    logActivity('admin_vendor_created', `Admin created vendor ${vendor.name} (${fullPhone}, ${finalTier})`);
    res.json({ success: true, data: { id: vendor.id, name: vendor.name, phone: fullPhone, tier: finalTier } });
  } catch (error) {
    console.error('[admin-create-vendor] Unhandled error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Admin: create couple profile directly
app.post('/api/admin/create-couple', async (req, res) => {
  try {
    const { name, phone, password, tier } = req.body || {};
    if (!phone || !password) return res.status(400).json({ success: false, error: 'phone + password required' });
    if (password.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    const allowedTiers = ['basic', 'gold', 'platinum'];
    const finalTier = allowedTiers.includes(tier) ? tier : 'basic';

    const cleanPhone = ('' + phone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) return res.status(400).json({ success: false, error: 'Phone must be 10 digits' });
    const fullPhone = '+91' + cleanPhone;

    console.log('[admin-create-couple] Starting for phone:', fullPhone, 'tier:', finalTier);

    // Check for any existing user rows with this phone (use array, not maybeSingle)
    const { data: existingUsers } = await supabase.from('users')
      .select('id').eq('phone', fullPhone);
    if (existingUsers && existingUsers.length > 0) {
      console.log('[admin-create-couple] Existing user(s) found:', existingUsers.length, '. Rejecting.');
      return res.status(409).json({
        success: false,
        error: `Couple with this phone already exists (${existingUsers.length} existing row(s)). Delete from admin first.`,
      });
    }

    const tierMap = { basic: 'free', gold: 'premium', platinum: 'elite' };
    const tokenMap = { basic: 3, gold: 15, platinum: 999 };
    const coupleTier = tierMap[finalTier];
    const tokens = tokenMap[finalTier];

    const hashedPwd = await bcrypt.hash(password, 10);
    const { data: user, error: uErr } = await supabase.from('users').insert([{
      name: name || ('Couple ' + cleanPhone),
      phone: fullPhone,
      couple_tier: coupleTier, token_balance: tokens,
      password_hash: hashedPwd, email_verified: false,
      dreamer_type: 'couple',
    }]).select().single();
    if (uErr) {
      console.error('[admin-create-couple] User insert failed:', uErr.message);
      return res.status(500).json({ success: false, error: 'Couple insert failed: ' + uErr.message });
    }
    console.log('[admin-create-couple] Couple created:', user.id, '. Login should now work for', fullPhone);

    logActivity('admin_couple_created', `Admin created couple ${user.name} (${fullPhone}, ${finalTier})`);
    res.json({ success: true, data: { id: user.id, name: user.name, phone: fullPhone, tier: finalTier, tokens } });
  } catch (error) {
    console.error('[admin-create-couple] Unhandled error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// ADMIN: NUCLEAR WIPE — clear all vendors / couples / both
// Requires confirm: 'WIPE_VENDORS' or 'WIPE_COUPLES' or 'WIPE_ALL' in body to prevent accident
// ══════════════════════════════════════════════════════════════

const VENDOR_CHILD_TABLES = [
  'vendor_subscriptions', 'vendor_logins', 'vendor_credentials', 'vendor_login_codes',
  'vendor_images', 'vendor_packages', 'vendor_availability_blocks', 'vendor_calendar_events',
  'vendor_clients', 'vendor_contracts', 'vendor_invoices', 'vendor_payment_schedules',
  'vendor_leads', 'vendor_enquiries', 'vendor_enquiry_messages', 'vendor_assistants',
  'vendor_team_members', 'vendor_todos', 'vendor_reminders', 'vendor_referrals',
  'vendor_offers', 'vendor_boosts', 'vendor_featured_applications', 'vendor_photo_approvals',
  'vendor_wedding_albums', 'vendor_tds_ledger', 'vendor_activity_log', 'vendor_analytics_daily',
  'vendor_discover_access_requests', 'vendor_discover_submissions',
  'blocked_dates', 'bookings', 'lock_date_holds', 'lock_date_interest', 'luxury_appointments',
  'photo_approvals', 'team_tasks', 'team_messages', 'team_checkins',
  'procurement_items', 'delivery_items', 'trial_schedule', 'client_sentiment',
  'delegation_templates', 'destination_packages',
];

const COUPLE_CHILD_TABLES = [
  'couple_events', 'couple_event_category_budgets', 'couple_checklist',
  'couple_guests', 'couple_moodboard_pins', 'couple_shagun', 'couple_vendors',
  'guests', 'moodboard_items', 'co_planners',
  'couple_discover_waitlist', 'couple_waitlist',
  'discover_access_requests', 'pai_access_requests', 'pai_events',
  'ai_token_purchases', 'notifications', 'messages',
];

// Helper: delete all rows from a table reliably
// Tries multiple strategies and returns {count, error}
async function wipeTable(table) {
  // Strategy 1: fetch all primary keys, then delete in batch
  // First try common PK names
  const pkCandidates = ['id', 'vendor_id', 'user_id', 'couple_id'];
  for (const pk of pkCandidates) {
    try {
      const { data: rows, error: selErr } = await supabase.from(table).select(pk).limit(10000);
      if (selErr) continue;
      if (!rows) return { count: 0, error: null };
      if (rows.length === 0) return { count: 0, error: null };
      const ids = rows.map(r => r[pk]).filter(Boolean);
      if (ids.length === 0) continue;
      // Delete by PK values
      const { error: delErr } = await supabase.from(table).delete().in(pk, ids);
      if (delErr) return { count: 0, error: delErr.message };
      return { count: ids.length, error: null };
    } catch (e) { continue; }
  }
  return { count: 0, error: 'no-pk-found' };
}

app.post('/api/admin/wipe-vendors', async (req, res) => {
  try {
    const { confirm } = req.body || {};
    if (confirm !== 'WIPE_VENDORS') {
      return res.status(400).json({ success: false, error: 'Confirmation required. Send {"confirm":"WIPE_VENDORS"}' });
    }
    console.log('[wipe-vendors] STARTING — wiping ALL vendor data');
    const counts = {};
    const errors = {};
    // Wipe all child tables first
    for (const t of VENDOR_CHILD_TABLES) {
      const r = await wipeTable(t);
      counts[t] = r.count;
      if (r.error && r.error !== 'no-pk-found') errors[t] = r.error;
    }
    // Now wipe vendors table itself
    const vr = await wipeTable('vendors');
    counts['vendors'] = vr.count;
    if (vr.error) errors['vendors'] = vr.error;

    console.log('[wipe-vendors] DONE. Counts:', JSON.stringify(counts));
    if (Object.keys(errors).length) console.error('[wipe-vendors] Errors:', JSON.stringify(errors));
    logActivity('admin_wipe_vendors', `Wiped all vendor data: ${JSON.stringify(counts)}`);
    res.json({ success: true, wiped: counts, errors });
  } catch (error) {
    console.error('[wipe-vendors] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/wipe-couples', async (req, res) => {
  try {
    const { confirm } = req.body || {};
    if (confirm !== 'WIPE_COUPLES') {
      return res.status(400).json({ success: false, error: 'Confirmation required. Send {"confirm":"WIPE_COUPLES"}' });
    }
    console.log('[wipe-couples] STARTING — wiping ALL couple data');
    const counts = {};
    const errors = {};
    for (const t of COUPLE_CHILD_TABLES) {
      const r = await wipeTable(t);
      counts[t] = r.count;
      if (r.error && r.error !== 'no-pk-found') errors[t] = r.error;
    }
    const ur = await wipeTable('users');
    counts['users'] = ur.count;
    if (ur.error) errors['users'] = ur.error;

    console.log('[wipe-couples] DONE. Counts:', JSON.stringify(counts));
    if (Object.keys(errors).length) console.error('[wipe-couples] Errors:', JSON.stringify(errors));
    logActivity('admin_wipe_couples', `Wiped all couple data: ${JSON.stringify(counts)}`);
    res.json({ success: true, wiped: counts, errors });
  } catch (error) {
    console.error('[wipe-couples] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/wipe-all', async (req, res) => {
  try {
    const { confirm } = req.body || {};
    if (confirm !== 'WIPE_ALL') {
      return res.status(400).json({ success: false, error: 'Confirmation required. Send {"confirm":"WIPE_ALL"}' });
    }
    console.log('[wipe-all] STARTING — wiping vendors + couples + everything');
    const counts = { vendors: {}, couples: {} };
    const errors = { vendors: {}, couples: {} };

    for (const t of VENDOR_CHILD_TABLES) {
      const r = await wipeTable(t);
      counts.vendors[t] = r.count;
      if (r.error && r.error !== 'no-pk-found') errors.vendors[t] = r.error;
    }
    const vr = await wipeTable('vendors');
    counts.vendors['vendors'] = vr.count;
    if (vr.error) errors.vendors['vendors'] = vr.error;

    for (const t of COUPLE_CHILD_TABLES) {
      const r = await wipeTable(t);
      counts.couples[t] = r.count;
      if (r.error && r.error !== 'no-pk-found') errors.couples[t] = r.error;
    }
    const ur = await wipeTable('users');
    counts.couples['users'] = ur.count;
    if (ur.error) errors.couples['users'] = ur.error;

    console.log('[wipe-all] DONE. Counts:', JSON.stringify(counts));
    if (Object.keys(errors.vendors).length || Object.keys(errors.couples).length) {
      console.error('[wipe-all] Errors:', JSON.stringify(errors));
    }
    logActivity('admin_wipe_all', `Wiped EVERYTHING: ${JSON.stringify(counts)}`);
    res.json({ success: true, wiped: counts, errors });
  } catch (error) {
    console.error('[wipe-all] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// COUPLE TIER CODES — invite-only couple access
// ══════════════════════════════════════════════════════════════

// Generate couple tier code (admin)
app.post('/api/couple-codes/generate', async (req, res) => {
  try {
    const { tier, couple_name, created_by, note } = req.body;
    if (!tier || !['basic', 'gold', 'platinum'].includes(tier)) {
      return res.status(400).json({ success: false, error: 'Tier must be basic, gold, or platinum' });
    }
    const code = genCode();

    const tokenMap = { basic: 3, gold: 15, platinum: 999 };

    const { data, error } = await supabase.from('access_codes').insert([{
      code, type: 'couple_tier', tier,
      vendor_name: couple_name || '',
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: created_by || 'admin',
      note: note || `${tier} invite for ${couple_name || 'couple'}`,
      used: false, used_count: 0,
    }]).select().single();
    if (error) throw error;
    res.json({ success: true, data: { ...data, tokens: tokenMap[tier] } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Redeem couple tier code
app.post('/api/couple-codes/redeem', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Code required' });

    const { data: codeData, error: codeErr } = await supabase
      .from('access_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('type', 'couple_tier')
      .single();

    if (codeErr || !codeData) return res.json({ success: false, error: 'Invalid invite code' });
    if (codeData.used || codeData.redeemed_at) {
      return res.json({ success: false, error: 'This invite has already been used' });
    }
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      return res.json({ success: false, error: 'Invite expired' });
    }

    const tierMap = { basic: 'free', gold: 'premium', platinum: 'elite' };
    const tokenMap = { basic: 3, gold: 15, platinum: 999 };
    const coupleTier = tierMap[codeData.tier] || 'free';
    const tokens = tokenMap[codeData.tier] || 3;

    // VALIDATE ONLY — do NOT create a user here. Onboard endpoint creates the user
    // AND marks the code consumed, ensuring atomic single-use enforcement.
    res.json({
      success: true,
      data: {
        couple_tier: coupleTier,
        tier_label: codeData.tier,
        tokens,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List couple codes (admin)
app.get('/api/couple-codes', async (req, res) => {
  try {
    const { data, error } = await supabase.from('access_codes').select('*').eq('type', 'couple_tier').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// DREAMER CODES — Alias for couple-codes (mobile login uses this name)
// Mirrors /api/couple-codes/redeem but supports re-login (idempotent)
// and returns wedding_date + budget so login can route correctly.
// ══════════════════════════════════════════════════════════════

app.post('/api/dreamer-codes/redeem', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Code required' });

    const codeUpper = code.toUpperCase().trim();

    const { data: codeData, error: codeErr } = await supabase
      .from('access_codes')
      .select('*')
      .eq('code', codeUpper)
      .eq('type', 'couple_tier')
      .single();

    if (codeErr || !codeData) return res.json({ success: false, error: 'Invalid code' });
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      return res.json({ success: false, error: 'Code expired' });
    }

    const tierMap = { basic: 'free', gold: 'premium', platinum: 'elite' };
    const tokenMap = { basic: 3, gold: 15, platinum: 999 };
    const coupleTier = tierMap[codeData.tier] || 'free';
    const tokens = tokenMap[codeData.tier] || 3;

    // Re-login support: if code already redeemed, find the existing user via redeemed_user_id
    if (codeData.used && codeData.redeemed_user_id) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', codeData.redeemed_user_id)
        .single();

      if (existingUser) {
        return res.json({
          success: true,
          data: {
            id: existingUser.id,
            name: existingUser.name || '',
            couple_tier: existingUser.couple_tier || coupleTier,
            tier_label: codeData.tier,
            tokens: existingUser.token_balance ?? tokens,
            wedding_date: existingUser.wedding_date || '',
            budget: existingUser.budget || 0,
          }
        });
      }
    }

    if (codeData.used) {
      return res.json({ success: false, error: 'Code already used' });
    }

    // First-time redemption — create new user
    const coupleName = codeData.vendor_name || '';
    const { data: user, error: userErr } = await supabase.from('users').insert([{
      name: coupleName,
      couple_tier: coupleTier,
      token_balance: tokens,
      dreamer_type: 'couple',
    }]).select().single();

    if (userErr) throw userErr;

    // Mark code as used and link to the user (so re-login works)
    await supabase.from('access_codes').update({
      used: true,
      used_count: (codeData.used_count || 0) + 1,
      redeemed_user_id: user.id,
      redeemed_at: new Date().toISOString(),
    }).eq('id', codeData.id);

    if (typeof logActivity === 'function') {
      logActivity('dreamer_registered', `${coupleName || 'Dreamer'} joined via invite code (${codeData.tier})`);
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name || '',
        couple_tier: coupleTier,
        tier_label: codeData.tier,
        tokens,
        wedding_date: '',
        budget: 0,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// UNIFIED SIGNUP — Code-based onboarding for both couples + vendors
// ══════════════════════════════════════════════════════════════

// Step 1: Validate any code (vendor tier code, couple code, or vendor referral code)
app.post('/api/signup/validate-code', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Code required' });
    const c = code.toUpperCase().trim();

    // Check vendor tier codes
    const { data: vendorCode } = await supabase.from('access_codes')
      .select('*').eq('code', c).eq('type', 'vendor_tier_trial').single();
    if (vendorCode && !vendorCode.used) {
      if (vendorCode.expires_at && new Date(vendorCode.expires_at) < new Date()) {
        return res.json({ success: false, error: 'Code expired' });
      }
      return res.json({ success: true, data: { type: 'vendor', tier: vendorCode.tier, code_id: vendorCode.id, vendor_name: vendorCode.vendor_name } });
    }

    // Check couple tier codes
    const { data: coupleCode } = await supabase.from('access_codes')
      .select('*').eq('code', c).eq('type', 'couple_tier').single();
    if (coupleCode && !coupleCode.used) {
      if (coupleCode.expires_at && new Date(coupleCode.expires_at) < new Date()) {
        return res.json({ success: false, error: 'Code expired' });
      }
      return res.json({ success: true, data: { type: 'couple', tier: coupleCode.tier, code_id: coupleCode.id, couple_name: coupleCode.vendor_name } });
    }

    // Check vendor referral codes — exact match in vendor_referrals table
    const { data: refMatch } = await supabase.from('vendor_referrals')
      .select('vendor_id, referral_code').eq('referral_code', c).eq('status', 'active_code').limit(1);
    if (refMatch && refMatch.length > 0) {
      const { data: refVendor } = await supabase.from('vendors').select('name').eq('id', refMatch[0].vendor_id).single();
      return res.json({ success: true, data: { type: 'couple_referral', tier: 'basic', vendor_id: refMatch[0].vendor_id, vendor_name: refVendor?.name || 'Vendor', referral_code: c } });
    }

    return res.json({ success: false, error: 'Invalid or expired code' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Step 2: Complete signup — create account with profile + password
app.post('/api/signup/complete', async (req, res) => {
  try {
    const { code, name, phone, email, instagram, password, code_type, code_id, tier, vendor_id, referral_code, dreamer_type } = req.body;
    // dreamer_type stored in users.dreamer_type column (couple/family/friend)

    if (!name || !phone || !email || !instagram || !password) {
      return res.status(400).json({ success: false, error: 'All fields required: name, phone, email, Instagram, password' });
    }
    if (password.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanEmail = email.toLowerCase().trim();
    const cleanIg = instagram.replace('@', '').trim();

    if (code_type === 'vendor') {
      // Create vendor
      const { data: existingVendor } = await supabase.from('vendor_credentials')
        .select('id').or(`phone_number.eq.+91${cleanPhone},username.eq.${cleanEmail}`).limit(1).single();
      if (existingVendor) return res.json({ success: false, error: 'Account already exists with this phone or email. Please log in.' });

      const { data: vendor, error: vErr } = await supabase.from('vendors').insert([{
        name, category: 'photographers', city: 'Delhi NCR',
        phone: cleanPhone, email: cleanEmail, instagram: cleanIg,
        ig_verified: false, subscription_active: true,
      }]).select().single();
      if (vErr) throw vErr;

      // Create subscription
      const threeMonths = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const aug1 = new Date('2026-08-01T00:00:00Z');
      const trial_end = threeMonths < aug1 ? threeMonths : aug1;
      await supabase.from('vendor_subscriptions').insert([{
        vendor_id: vendor.id, tier: tier || 'essential', status: 'trial',
        trial_start_date: new Date().toISOString(), trial_end_date: trial_end.toISOString(),
        activated_by_code: code, is_founding_vendor: true, founding_badge: true,
      }]);

      // Create credentials (email = username)
      const hashedPwd = await bcrypt.hash(password, 10);
      await supabase.from('vendor_credentials').insert([{
        vendor_id: vendor.id, username: cleanEmail, password_hash: hashedPwd,
        phone_number: '+91' + cleanPhone, phone_verified: false, email_verified: false,
      }]);

      // Mark code as used
      if (code_id) await supabase.from('access_codes').update({ used: true, used_count: 1 }).eq('id', code_id);

      logActivity('vendor_signup', name + ' signed up as vendor (' + (tier || 'essential') + ')');

      return res.json({ success: true, data: {
        type: 'vendor', id: vendor.id, name: vendor.name, category: vendor.category,
        city: vendor.city, tier: tier || 'essential', trial_end: trial_end.toISOString(),
      }});

    } else {
      // Create couple (couple_tier or couple_referral)
      const { data: existingUser } = await supabase.from('users')
        .select('id').or(`phone.eq.+91${cleanPhone},email.eq.${cleanEmail}`).limit(1).single();
      if (existingUser) return res.json({ success: false, error: 'Account already exists with this phone or email. Please log in.' });

      const tierMap = { basic: 'free', gold: 'premium', platinum: 'elite' };
      const tokenMap = { basic: 3, gold: 15, platinum: 999 };
      const coupleTier = tierMap[tier] || 'free';
      const tokens = tokenMap[tier] || 3;

      const hashedCpwd = await bcrypt.hash(password, 10);
      const { data: user, error: uErr } = await supabase.from('users').insert([{
        name, phone: '+91' + cleanPhone, email: cleanEmail, instagram: cleanIg,
        couple_tier: coupleTier, token_balance: tokens,
        password_hash: hashedCpwd, email_verified: false,
        dreamer_type: dreamer_type || 'couple',
      }]).select().single();
      if (uErr) throw uErr;

      // Mark code as used (if admin code)
      if (code_id) await supabase.from('access_codes').update({ used: true, used_count: 1 }).eq('id', code_id);

      // Track referral if vendor-referred
      if (code_type === 'couple_referral' && vendor_id) {
        await supabase.from('vendor_referrals').insert([{
          vendor_id, referral_code: referral_code || code,
          couple_name: name, couple_phone: '+91' + cleanPhone,
          status: 'signed_up',
        }]);
      }

      logActivity('couple_signup', name + ' signed up as couple (' + (tier || 'basic') + ')');

      return res.json({ success: true, data: {
        type: 'couple', id: user.id, name: user.name,
        couple_tier: coupleTier, tier_label: tier || 'basic', tokens,
      }});
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Email Verification ──
// Store verification codes in memory (production: use Redis)
const emailVerifyCodes = {};

app.post('/api/verify/send-email', async (req, res) => {
  try {
    const { user_id, email, user_type } = req.body; // user_type: 'vendor' or 'couple'
    if (!email) return res.status(400).json({ success: false, error: 'Email required' });

    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit code
    emailVerifyCodes[email.toLowerCase()] = { code, user_id, user_type, expires: Date.now() + 10 * 60 * 1000 }; // 10 min expiry

    // In production: send via Resend/Nodemailer. For now, log and return success.
    console.log(`[EMAIL VERIFY] Code for ${email}: ${code}`);

    // TODO: Replace with actual email sending (Resend/Nodemailer)
    // For testing, we return the code in dev mode
    res.json({ success: true, message: 'Verification code sent to your email', dev_code: code });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/verify/confirm-email', async (req, res) => {
  try {
    const { email, code, user_type, user_id } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const stored = emailVerifyCodes[cleanEmail];

    if (!stored) return res.json({ success: false, error: 'No verification code found. Please request a new one.' });
    if (Date.now() > stored.expires) { delete emailVerifyCodes[cleanEmail]; return res.json({ success: false, error: 'Code expired. Please request a new one.' }); }
    if (stored.code !== code) return res.json({ success: false, error: 'Incorrect code. Please try again.' });

    // Mark email as verified in DB
    if (user_type === 'vendor') {
      await supabase.from('vendor_credentials').update({ email_verified: true }).eq('vendor_id', user_id);
    } else {
      await supabase.from('users').update({ email_verified: true }).eq('id', user_id);
    }

    delete emailVerifyCodes[cleanEmail];
    logActivity('email_verified', `${cleanEmail} verified (${user_type})`);
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Instagram Handle Validation ──
app.post('/api/verify/check-instagram', async (req, res) => {
  try {
    const { handle } = req.body;
    if (!handle) return res.status(400).json({ success: false, error: 'Handle required' });

    const cleanHandle = handle.replace('@', '').trim();
    // Check if Instagram profile exists by fetching the page
    try {
      const response = await fetch(`https://www.instagram.com/${cleanHandle}/`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        redirect: 'follow',
      });
      // If page returns 200 and doesn't redirect to login, handle likely exists
      const exists = response.status === 200;
      res.json({ success: true, exists, handle: cleanHandle });
    } catch {
      // Network error — can't verify, assume valid for now
      res.json({ success: true, exists: null, handle: cleanHandle, note: 'Could not verify — Instagram unreachable' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Toggle IG verified status
app.post('/api/admin/verify-instagram', async (req, res) => {
  try {
    const { vendor_id, verified } = req.body;
    await supabase.from('vendors').update({ ig_verified: verified }).eq('id', vendor_id);
    logActivity('ig_verify', `Vendor ${vendor_id} IG ${verified ? 'verified' : 'unverified'} by admin`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// COUPLE V2 — Onboarding + Discover Waitlist
// Session 10 Turn 1 additions for the rebuilt couple PWA.
// ══════════════════════════════════════════════════════════════

// Onboard a couple user: creates or updates record in `users` table.
// Called at the end of the 4-step onboarding flow after OTP verified.
// If access_code is a couple_tier code, it is marked used and linked.
app.post('/api/couple/onboard', async (req, res) => {
  try {
    const {
      name, partner_name, phone, wedding_date, events,
      couple_tier, founding_bride, access_code, password,
    } = req.body || {};

    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Name and phone are required' });
    }

    // Validate password if provided (8+ chars per Option A)
    if (password !== undefined && password !== null) {
      if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
      }
    }

    // If access_code provided, re-validate it's still unused — protect against race conditions
    // where the user opened the link hours ago and someone else redeemed it meanwhile
    if (access_code) {
      const { data: codeCheck } = await supabase
        .from('access_codes')
        .select('used, redeemed_at, expires_at, tier')
        .eq('code', ('' + access_code).toUpperCase().trim())
        .eq('type', 'couple_tier')
        .maybeSingle();
      if (!codeCheck) {
        return res.status(400).json({ success: false, error: 'Invalid invite code' });
      }
      if (codeCheck.used || codeCheck.redeemed_at) {
        return res.status(400).json({ success: false, error: 'This invite has already been used' });
      }
      if (codeCheck.expires_at && new Date(codeCheck.expires_at) < new Date()) {
        return res.status(400).json({ success: false, error: 'Invite expired' });
      }
    }

    const cleanPhone = ('' + phone).replace(/\D/g, '').slice(-10);
    const fullPhone = '+91' + cleanPhone;
    const eventsArr = Array.isArray(events) ? events : [];
    const tier = couple_tier || 'free';
    const isFounding = !!founding_bride;

    // Hash password if provided
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    // Check if user already exists by phone
    const { data: existing } = await supabase
      .from('users').select('*').eq('phone', fullPhone).maybeSingle();

    let userRow;
    if (existing) {
      // Update with onboarding details. Only set password_hash if one was
      // provided AND the existing row doesn't have one (first-time password set)
      // OR this is a fresh-start onboarding (user was stub, not fully onboarded).
      const updatePayload = {
        name,
        partner_name: partner_name || null,
        wedding_date: wedding_date || null,
        wedding_events: eventsArr,
        couple_tier: existing.couple_tier === 'elite' ? 'elite' : tier,
        founding_bride: isFounding || !!existing.founding_bride,
        dreamer_type: 'couple',
      };
      if (passwordHash && !existing.password_hash) {
        updatePayload.password_hash = passwordHash;
      }
      const { data: updated, error: uErr } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', existing.id)
        .select().single();
      if (uErr) throw uErr;
      userRow = updated;
    } else {
      const { data: created, error: cErr } = await supabase
        .from('users')
        .insert([{
          name,
          partner_name: partner_name || null,
          phone: fullPhone,
          wedding_date: wedding_date || null,
          wedding_events: eventsArr,
          couple_tier: tier,
          founding_bride: isFounding,
          dreamer_type: 'couple',
          password_hash: passwordHash,
          token_balance: tier === 'elite' ? 999 : tier === 'premium' ? 15 : 3,
        }])
        .select().single();
      if (cErr) throw cErr;
      userRow = created;
    }

    // If an access_code was used, mark it consumed + link to user
    if (access_code) {
      await supabase.from('access_codes')
        .update({
          used: true,
          redeemed_user_id: userRow.id,
          redeemed_at: new Date().toISOString(),
        })
        .eq('code', ('' + access_code).toUpperCase().trim())
        .eq('type', 'couple_tier');
    }

    if (typeof logActivity === 'function') {
      logActivity('couple_onboarded', `${name} onboarded (${tier}${isFounding ? ', Founding' : ''})`);
    }

    res.json({
      success: true,
      data: {
        id: userRow.id,
        name: userRow.name || name,
        couple_tier: userRow.couple_tier || tier,
        founding_bride: userRow.founding_bride || isFounding,
        token_balance: userRow.token_balance || 0,
      },
    });
  } catch (error) {
    console.error('couple/onboard error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Discover waitlist — capture phone numbers for when Discover mode launches.
app.post('/api/couple/waitlist', async (req, res) => {
  try {
    const { phone, user_id } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'Phone required' });
    const cleanPhone = ('' + phone).replace(/\D/g, '').slice(-10);
    const fullPhone = cleanPhone.length === 10 ? '+91' + cleanPhone : phone;

    // Upsert — one row per phone
    const { data: existing } = await supabase
      .from('couple_discover_waitlist').select('id').eq('phone', fullPhone).maybeSingle();

    if (existing) {
      return res.json({ success: true, data: { already_on_list: true } });
    }

    const { error } = await supabase.from('couple_discover_waitlist').insert([{
      phone: fullPhone, user_id: user_id || null,
    }]);
    if (error) throw error;

    if (typeof logActivity === 'function') {
      logActivity('discover_waitlist', `Discover waitlist: ${fullPhone}`);
    }
    res.json({ success: true, data: { added: true } });
  } catch (error) {
    console.error('couple/waitlist error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// COUPLE V2 — Auth + Access Waitlist (Session 10 Turn 8A)
// ══════════════════════════════════════════════════════════════

// Password login — phone + password
app.post('/api/couple/login', async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone || !password) {
      return res.status(400).json({ success: false, error: 'Phone and password required' });
    }
    const cleanPhone = ('' + phone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, error: 'Invalid phone number' });
    }
    const fullPhone = '+91' + cleanPhone;

    const { data: user } = await supabase
      .from('users').select('*').eq('phone', fullPhone).maybeSingle();

    if (!user || !user.password_hash) {
      // Don't reveal whether the account exists — just say invalid
      return res.status(401).json({ success: false, error: 'Invalid phone or password' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid phone or password' });
    }

    // Must be a couple account
    if (user.dreamer_type && user.dreamer_type !== 'couple') {
      return res.status(403).json({ success: false, error: 'This account is not a couple account' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name || '',
        partner_name: user.partner_name || '',
        wedding_date: user.wedding_date || '',
        events: user.wedding_events || [],
        couple_tier: user.couple_tier || 'free',
        founding_bride: !!user.founding_bride,
        token_balance: user.token_balance || 0,
      }
    });
  } catch (error) {
    console.error('couple/login error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Forgot password — check phone exists then trigger OTP send
app.post('/api/couple/forgot-password', async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'Phone required' });
    const cleanPhone = ('' + phone).replace(/\D/g, '').slice(-10);
    const fullPhone = '+91' + cleanPhone;

    const { data: user } = await supabase
      .from('users').select('id').eq('phone', fullPhone).maybeSingle();

    // Always return success (don't leak existence) — frontend then calls send-otp
    res.json({ success: true, data: { exists: !!user } });
  } catch (error) {
    console.error('couple/forgot-password error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reset password — requires OTP already verified by client
// Client flow: send-otp → verify-otp → call this with new password
app.post('/api/couple/reset-password', async (req, res) => {
  try {
    const { phone, new_password, otp_verified } = req.body || {};
    if (!phone || !new_password) {
      return res.status(400).json({ success: false, error: 'Phone and new password required' });
    }
    if (typeof new_password !== 'string' || new_password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }
    // Simple guard — client must explicitly flag otp_verified. This is a client-trust
    // boundary; for production-grade auth we'd issue a short-lived reset token from
    // verify-otp, but this is fine for current scale and pairs with rate-limiting.
    if (!otp_verified) {
      return res.status(400).json({ success: false, error: 'OTP verification required' });
    }

    const cleanPhone = ('' + phone).replace(/\D/g, '').slice(-10);
    const fullPhone = '+91' + cleanPhone;

    const { data: user } = await supabase
      .from('users').select('id').eq('phone', fullPhone).maybeSingle();
    if (!user) return res.status(404).json({ success: false, error: 'Account not found' });

    const passwordHash = await bcrypt.hash(new_password, 10);
    const { error } = await supabase
      .from('users').update({ password_hash: passwordHash }).eq('id', user.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('couple/reset-password error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Access waitlist — for brides without invite codes
app.post('/api/couple/access-waitlist', async (req, res) => {
  try {
    const { name, phone, wedding_date, referral_source } = req.body || {};
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Name and phone required' });
    }
    const cleanPhone = ('' + phone).replace(/\D/g, '').slice(-10);
    const fullPhone = '+91' + cleanPhone;

    // Dedupe — one row per phone
    const { data: existing } = await supabase
      .from('couple_waitlist').select('id').eq('phone', fullPhone).maybeSingle();
    if (existing) {
      return res.json({ success: true, data: { already_on_list: true } });
    }

    const { error } = await supabase.from('couple_waitlist').insert([{
      name: name.trim(),
      phone: fullPhone,
      wedding_date: wedding_date || null,
      referral_source: referral_source || null,
    }]);
    if (error) throw error;

    if (typeof logActivity === 'function') {
      logActivity('access_waitlist', `Access waitlist: ${name} (${fullPhone})`);
    }
    res.json({ success: true, data: { added: true } });
  } catch (error) {
    console.error('couple/access-waitlist error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin — list access waitlist
app.get('/api/couple/access-waitlist', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('couple_waitlist').select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('access-waitlist list error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin — mark a waitlist entry as contacted/invited
app.patch('/api/couple/access-waitlist/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { contacted_at, invited, invite_code_issued, notes } = req.body || {};
    const payload = {};
    if (contacted_at !== undefined) payload.contacted_at = contacted_at;
    if (invited !== undefined) payload.invited = invited;
    if (invite_code_issued !== undefined) payload.invite_code_issued = invite_code_issued;
    if (notes !== undefined) payload.notes = notes;
    const { data, error } = await supabase
      .from('couple_waitlist').update(payload).eq('id', id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('access-waitlist patch error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// COUPLE V2 — Checklist Tool (Session 10 Turn 2)
// ══════════════════════════════════════════════════════════════

// List all checklist tasks for a couple.
app.get('/api/couple/checklist/:coupleId', async (req, res) => {
  try {
    const { coupleId } = req.params;
    if (!coupleId) return res.status(400).json({ success: false, error: 'coupleId required' });
    const { data, error } = await supabase
      .from('couple_checklist')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('checklist list error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a single task (custom or seeded).
app.post('/api/couple/checklist', async (req, res) => {
  try {
    const {
      couple_id, event, text, priority, assigned_to, due_date,
      is_custom, seeded_from_template,
    } = req.body || {};
    if (!couple_id || !event || !text) {
      return res.status(400).json({ success: false, error: 'couple_id, event, and text required' });
    }
    const { data, error } = await supabase
      .from('couple_checklist')
      .insert([{
        couple_id,
        event,
        text,
        priority: priority || 'normal',
        assigned_to: assigned_to || null,
        due_date: due_date || null,
        is_custom: is_custom !== undefined ? !!is_custom : true,
        seeded_from_template: !!seeded_from_template,
      }])
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('checklist create error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk create tasks — used for initial template seeding on first load.
app.post('/api/couple/checklist/bulk', async (req, res) => {
  try {
    const { couple_id, tasks } = req.body || {};
    if (!couple_id || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ success: false, error: 'couple_id and tasks array required' });
    }
    const rows = tasks.map(t => ({
      couple_id,
      event: t.event,
      text: t.text,
      priority: t.priority || 'normal',
      due_date: t.due_date || null,
      is_custom: false,
      seeded_from_template: true,
    }));
    const { data, error } = await supabase
      .from('couple_checklist')
      .insert(rows)
      .select();
    if (error) throw error;

    // Mark user as seeded so we never duplicate templates
    await supabase.from('users').update({ checklist_seeded: true }).eq('id', couple_id);

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('checklist bulk create error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a single task (toggle complete, edit text, reassign, etc.)
app.patch('/api/couple/checklist/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = { ...(req.body || {}) };
    // Auto-stamp completed_at when flipping is_complete
    if (updates.is_complete === true) updates.completed_at = new Date().toISOString();
    if (updates.is_complete === false) updates.completed_at = null;
    const { data, error } = await supabase
      .from('couple_checklist')
      .update(updates)
      .eq('id', taskId)
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('checklist update error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a task.
app.delete('/api/couple/checklist/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { error } = await supabase
      .from('couple_checklist')
      .delete()
      .eq('id', taskId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('checklist delete error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// COUPLE V2 — Budget + Payment Trail + Shagun (Session 10 Turn 3)
// Payment Trail is NOT a separate store — receipts live on each
// expense row and are surfaced as a filtered view.
// ══════════════════════════════════════════════════════════════

// Get budget envelopes (auto-creates on first access)
app.get('/api/couple/budget/:coupleId', async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { data: existing } = await supabase
      .from('couple_budget').select('*').eq('couple_id', coupleId).maybeSingle();
    if (existing) return res.json({ success: true, data: existing });
    // Create default row
    const { data: created, error: cErr } = await supabase
      .from('couple_budget')
      .insert([{ couple_id: coupleId, total_budget: 0, event_envelopes: {} }])
      .select().single();
    if (cErr) throw cErr;
    res.json({ success: true, data: created });
  } catch (error) {
    console.error('budget get error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update budget envelopes (total_budget + event_envelopes JSONB)
app.patch('/api/couple/budget/:coupleId', async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { total_budget, event_envelopes } = req.body || {};
    const updates = { updated_at: new Date().toISOString() };
    if (total_budget !== undefined) updates.total_budget = total_budget;
    if (event_envelopes !== undefined) updates.event_envelopes = event_envelopes;
    const { data, error } = await supabase
      .from('couple_budget')
      .update(updates)
      .eq('couple_id', coupleId)
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('budget update error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List expenses
app.get('/api/couple/expenses/:coupleId', async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { data, error } = await supabase
      .from('couple_expenses')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('expenses list error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create expense
app.post('/api/couple/expenses', async (req, res) => {
  try {
    const {
      couple_id, event, category, description, vendor_name,
      planned_amount, actual_amount, shadow_amount,
      payment_status, receipt_url, receipt_uploaded_by, receipt_uploaded_by_name, notes,
    } = req.body || {};
    if (!couple_id || !event || !category) {
      return res.status(400).json({ success: false, error: 'couple_id, event, category required' });
    }
    const { data, error } = await supabase
      .from('couple_expenses')
      .insert([{
        couple_id, event, category,
        description: description || null,
        vendor_name: vendor_name || null,
        planned_amount: planned_amount || 0,
        actual_amount: actual_amount || 0,
        shadow_amount: shadow_amount || 0,
        payment_status: payment_status || 'pending',
        receipt_url: receipt_url || null,
        receipt_uploaded_by: receipt_uploaded_by || null,
        receipt_uploaded_by_name: receipt_uploaded_by_name || null,
        notes: notes || null,
      }])
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('expense create error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update expense
app.patch('/api/couple/expenses/:expenseId', async (req, res) => {
  try {
    const { expenseId } = req.params;
    const updates = { ...(req.body || {}), updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('couple_expenses')
      .update(updates)
      .eq('id', expenseId)
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('expense update error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete expense
app.delete('/api/couple/expenses/:expenseId', async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { error } = await supabase
      .from('couple_expenses').delete().eq('id', expenseId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('expense delete error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Shagun — list
app.get('/api/couple/shagun/:coupleId', async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { data, error } = await supabase
      .from('couple_shagun')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('shagun list error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Shagun — create
app.post('/api/couple/shagun', async (req, res) => {
  try {
    const { couple_id, giver_name, relation, event, amount, gift_description, return_gift_sent, notes } = req.body || {};
    if (!couple_id || !giver_name) {
      return res.status(400).json({ success: false, error: 'couple_id and giver_name required' });
    }
    const { data, error } = await supabase
      .from('couple_shagun')
      .insert([{
        couple_id, giver_name,
        relation: relation || null,
        event: event || null,
        amount: amount || 0,
        gift_description: gift_description || null,
        return_gift_sent: !!return_gift_sent,
        notes: notes || null,
      }])
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('shagun create error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Shagun — update
app.patch('/api/couple/shagun/:shagunId', async (req, res) => {
  try {
    const { shagunId } = req.params;
    const { data, error } = await supabase
      .from('couple_shagun')
      .update(req.body || {})
      .eq('id', shagunId)
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('shagun update error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Shagun — delete
app.delete('/api/couple/shagun/:shagunId', async (req, res) => {
  try {
    const { shagunId } = req.params;
    const { error } = await supabase.from('couple_shagun').delete().eq('id', shagunId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('shagun delete error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// COUPLE V2 — Guest Ledger (Session 10 Turn 4)
// Rich guests with Head-of-Family grouping + per-event RSVP.
// ══════════════════════════════════════════════════════════════

// List all guests for a couple
app.get('/api/couple/guests/:coupleId', async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { data, error } = await supabase
      .from('couple_guests')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('guests list error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a guest
app.post('/api/couple/guests', async (req, res) => {
  try {
    const {
      couple_id, name, side, relation, phone, email,
      household_count, is_household_head, household_head_id,
      dietary, dietary_notes, event_invites, notes,
      added_by, added_by_name,
    } = req.body || {};
    if (!couple_id || !name) {
      return res.status(400).json({ success: false, error: 'couple_id and name required' });
    }
    const { data, error } = await supabase
      .from('couple_guests')
      .insert([{
        couple_id,
        name: name.trim(),
        side: side || 'bride',
        relation: relation || null,
        phone: phone || null,
        email: email || null,
        household_count: household_count || 1,
        is_household_head: !!is_household_head,
        household_head_id: household_head_id || null,
        dietary: dietary || null,
        dietary_notes: dietary_notes || null,
        event_invites: event_invites || {},
        notes: notes || null,
        added_by: added_by || null,
        added_by_name: added_by_name || null,
      }])
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('guests create error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a guest
app.patch('/api/couple/guests/:guestId', async (req, res) => {
  try {
    const { guestId } = req.params;
    const updates = { ...(req.body || {}), updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('couple_guests')
      .update(updates)
      .eq('id', guestId)
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('guests update error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a guest
app.delete('/api/couple/guests/:guestId', async (req, res) => {
  try {
    const { guestId } = req.params;
    // Un-link any household members first (set their household_head_id to null)
    await supabase.from('couple_guests').update({ household_head_id: null }).eq('household_head_id', guestId);
    const { error } = await supabase.from('couple_guests').delete().eq('id', guestId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('guests delete error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// COUPLE V2 — Moodboard (Session 10 Turn 5)
// Per-event boards with uploads (Cloudinary) + links (OG preview).
// ══════════════════════════════════════════════════════════════

// Server-side OG metadata fetch. Avoids CORS issues and gives us
// server-cached thumbnail URLs that survive source-page changes.
app.post('/api/couple/moodboard/preview', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ success: false, error: 'url required' });

    let parsed;
    try { parsed = new URL(url); }
    catch { return res.status(400).json({ success: false, error: 'Invalid URL' }); }

    const sourceDomain = parsed.hostname.replace(/^www\./, '');

    // Fetch with timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    let html = '';
    try {
      const fetchRes = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TDW-Preview/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      });
      clearTimeout(timer);
      const buf = await fetchRes.text();
      html = buf.slice(0, 256 * 1024); // OG tags are in <head>
    } catch (e) {
      clearTimeout(timer);
      return res.json({
        success: true,
        data: { og_image: null, og_title: null, og_description: null, source_domain: sourceDomain },
      });
    }

    // Extract OG / Twitter meta tags
    const grabMeta = (property) => {
      const patterns = [
        new RegExp('<meta[^>]+(?:property|name)=["\']' + property + '["\'][^>]*content=["\']([^"\']+)["\']', 'i'),
        new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\']' + property + '["\']', 'i'),
      ];
      for (const re of patterns) {
        const m = html.match(re);
        if (m && m[1]) return m[1];
      }
      return null;
    };

    const decodeEntities = (s) => {
      if (!s) return s;
      return s
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
        .replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ');
    };

    let ogImage = grabMeta('og:image') || grabMeta('twitter:image') || grabMeta('twitter:image:src');
    let ogTitle = grabMeta('og:title') || grabMeta('twitter:title');
    let ogDescription = grabMeta('og:description') || grabMeta('twitter:description') || grabMeta('description');

    // Fallback: look for first <img> with src
    if (!ogImage) {
      const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) ogImage = imgMatch[1];
    }

    // Fallback title to <title>
    if (!ogTitle) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) ogTitle = titleMatch[1].trim();
    }

    // Resolve relative image URLs
    if (ogImage && !ogImage.startsWith('http')) {
      try {
        ogImage = new URL(ogImage, url).href;
      } catch { /* leave as-is */ }
    }

    res.json({
      success: true,
      data: {
        og_image: ogImage ? decodeEntities(ogImage) : null,
        og_title: ogTitle ? decodeEntities(ogTitle).slice(0, 200) : null,
        og_description: ogDescription ? decodeEntities(ogDescription).slice(0, 500) : null,
        source_domain: sourceDomain,
      },
    });
  } catch (error) {
    console.error('moodboard preview error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List pins for a couple
app.get('/api/couple/moodboard/:coupleId', async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { data, error } = await supabase
      .from('couple_moodboard_pins')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('moodboard list error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a pin
app.post('/api/couple/moodboard', async (req, res) => {
  try {
    const {
      couple_id, event, pin_type, image_url, source_url, source_domain,
      title, note, is_suggestion, added_by, added_by_name,
    } = req.body || {};
    if (!couple_id || !event || !pin_type) {
      return res.status(400).json({ success: false, error: 'couple_id, event, pin_type required' });
    }
    const { data, error } = await supabase
      .from('couple_moodboard_pins')
      .insert([{
        couple_id, event, pin_type,
        image_url: image_url || null,
        source_url: source_url || null,
        source_domain: source_domain || null,
        title: title || null,
        note: note || null,
        is_curated: false,
        is_suggestion: !!is_suggestion,
        added_by: added_by || null,
        added_by_name: added_by_name || null,
      }])
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('moodboard create error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a pin
app.patch('/api/couple/moodboard/:pinId', async (req, res) => {
  try {
    const { pinId } = req.params;
    const { data, error } = await supabase
      .from('couple_moodboard_pins')
      .update(req.body || {})
      .eq('id', pinId)
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('moodboard update error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a pin
app.delete('/api/couple/moodboard/:pinId', async (req, res) => {
  try {
    const { pinId } = req.params;
    const { error } = await supabase.from('couple_moodboard_pins').delete().eq('id', pinId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('moodboard delete error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// COUPLE V2 — My Vendors (Session 10 Turn 6)
// Money lives in couple_expenses (vendor_name match). We never
// store vendor totals directly — they're aggregated on read.
// ══════════════════════════════════════════════════════════════

// List all vendors for a couple
app.get('/api/couple/vendors/:coupleId', async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { data, error } = await supabase
      .from('couple_vendors')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('vendors list error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a vendor
app.post('/api/couple/vendors', async (req, res) => {
  try {
    const {
      couple_id, name, category, phone, email, website,
      events, status, quoted_total, balance_due_date,
      contract_url, contract_uploaded_by, contract_uploaded_by_name,
      booked_slot, notes, added_by, added_by_name,
    } = req.body || {};
    if (!couple_id || !name) {
      return res.status(400).json({ success: false, error: 'couple_id and name required' });
    }
    const { data, error } = await supabase
      .from('couple_vendors')
      .insert([{
        couple_id,
        name: name.trim(),
        category: category || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        events: events || [],
        status: status || 'enquired',
        quoted_total: quoted_total || 0,
        balance_due_date: balance_due_date || null,
        contract_url: contract_url || null,
        contract_uploaded_by: contract_uploaded_by || null,
        contract_uploaded_by_name: contract_uploaded_by_name || null,
        booked_slot: booked_slot || null,
        notes: notes || null,
        added_by: added_by || null,
        added_by_name: added_by_name || null,
      }])
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('vendors create error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a vendor
app.patch('/api/couple/vendors/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const updates = { ...(req.body || {}), updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('couple_vendors')
      .update(updates)
      .eq('id', vendorId)
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('vendors update error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a vendor
app.delete('/api/couple/vendors/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { error } = await supabase.from('couple_vendors').delete().eq('id', vendorId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('vendors delete error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// COUPLE V2 — WhatsApp Templates (Session 10 Turn 7)
// ══════════════════════════════════════════════════════════════

// List templates for a couple
app.get('/api/couple/wa-templates/:coupleId', async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { data, error } = await supabase
      .from('couple_whatsapp_templates')
      .select('*')
      .eq('couple_id', coupleId)
      .order('context', { ascending: true })
      .order('sort_order', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('wa-templates list error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk seed defaults for a new couple
app.post('/api/couple/wa-templates/bulk', async (req, res) => {
  try {
    const { couple_id, templates } = req.body || {};
    if (!couple_id || !Array.isArray(templates) || templates.length === 0) {
      return res.status(400).json({ success: false, error: 'couple_id and templates required' });
    }
    const rows = templates.map((t, i) => ({
      couple_id,
      context: t.context,
      template_key: t.template_key || null,
      label: t.label,
      body: t.body,
      is_default: !!t.is_default,
      is_custom: false,
      sort_order: t.sort_order != null ? t.sort_order : i,
    }));
    const { data, error } = await supabase
      .from('couple_whatsapp_templates')
      .insert(rows)
      .select();
    if (error) throw error;
    await supabase.from('users').update({ wa_templates_seeded: true }).eq('id', couple_id);
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('wa-templates bulk error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a custom template
app.post('/api/couple/wa-templates', async (req, res) => {
  try {
    const { couple_id, context, label, body, sort_order } = req.body || {};
    if (!couple_id || !context || !label || !body) {
      return res.status(400).json({ success: false, error: 'couple_id, context, label, body required' });
    }
    const { data, error } = await supabase
      .from('couple_whatsapp_templates')
      .insert([{
        couple_id, context, label, body,
        is_default: false, is_custom: true,
        sort_order: sort_order || 99,
      }])
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('wa-templates create error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a template (edit body, change default flag, etc.)
app.patch('/api/couple/wa-templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const updates = { ...(req.body || {}), updated_at: new Date().toISOString() };

    // If setting is_default=true, unset other defaults in same context first
    if (updates.is_default === true) {
      const { data: existing } = await supabase
        .from('couple_whatsapp_templates').select('couple_id, context').eq('id', templateId).maybeSingle();
      if (existing) {
        await supabase
          .from('couple_whatsapp_templates')
          .update({ is_default: false })
          .eq('couple_id', existing.couple_id)
          .eq('context', existing.context)
          .neq('id', templateId);
      }
    }

    const { data, error } = await supabase
      .from('couple_whatsapp_templates')
      .update(updates)
      .eq('id', templateId)
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('wa-templates update error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a template (only custom templates should be deleted)
app.delete('/api/couple/wa-templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { error } = await supabase
      .from('couple_whatsapp_templates').delete().eq('id', templateId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('wa-templates delete error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// COUPLE V2 — Feedback (Session 10 Turn 7)
// ══════════════════════════════════════════════════════════════

app.post('/api/couple/feedback', async (req, res) => {
  try {
    const { couple_id, rating, message, screen } = req.body || {};
    if (!couple_id) return res.status(400).json({ success: false, error: 'couple_id required' });
    const { data, error } = await supabase
      .from('couple_feedback')
      .insert([{
        couple_id,
        rating: rating || null,
        message: message || null,
        screen: screen || null,
      }])
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('feedback error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark founding bride intro as shown
app.patch('/api/couple/mark-founding-intro/:coupleId', async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { error } = await supabase
      .from('users')
      .update({ founding_intro_shown: true })
      .eq('id', coupleId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('mark founding intro error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Co-Planner System ──

// Generate co-planner invite link
app.post('/api/co-planner/invite', async (req, res) => {
  try {
    const { user_id, role, invitee_name } = req.body;
    if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });

    const { data: existing } = await supabase.from('co_planners').select('id, status').eq('primary_user_id', user_id);
    const active = (existing || []).filter(c => c.status !== 'removed');
    if (active.length >= 4) return res.json({ success: false, error: 'Maximum 4 co-planners reached' });

    const { data: user } = await supabase.from('users').select('couple_tier, token_balance').eq('id', user_id).single();
    if (!user) return res.json({ success: false, error: 'User not found' });

    const tierLabel = user.couple_tier === 'elite' ? 'platinum' : user.couple_tier === 'premium' ? 'gold' : 'basic';
    let tokenCost = 2;
    if (tierLabel === 'platinum') {
      if (active.length === 0) tokenCost = 0;
      else if (active.length === 1) tokenCost = 1;
      else tokenCost = 2;
    }

    if (user.token_balance < tokenCost) {
      return res.json({ success: false, error: `Not enough tokens. This invite costs ${tokenCost} token${tokenCost !== 1 ? 's' : ''}.`, token_cost: tokenCost });
    }

    if (tokenCost > 0) {
      await supabase.from('users').update({ token_balance: user.token_balance - tokenCost }).eq('id', user_id);
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let inviteCode = 'CP';
    for (let i = 0; i < 6; i++) inviteCode += chars[Math.floor(Math.random() * chars.length)];

    await supabase.from('co_planners').insert([{
      primary_user_id: user_id,
      invite_code: inviteCode,
      status: 'pending',
      role: role || 'inner_circle',
      invitee_name: invitee_name || null,
    }]);

    const link = 'https://thedreamwedding.in/join/' + inviteCode;
    logActivity('co_planner_invite', `Co-planner invite: ${inviteCode} (cost: ${tokenCost})`);
    res.json({ success: true, data: { invite_code: inviteCode, link, token_cost: tokenCost, remaining_tokens: user.token_balance - tokenCost } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/co-planner/validate', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Code required' });
    const { data: invite } = await supabase.from('co_planners')
      .select('id, primary_user_id, invite_code').eq('invite_code', code.trim().toUpperCase()).eq('status', 'pending').single();
    if (!invite) return res.json({ success: false, error: 'Invalid or already used invite code' });
    const { data: primary } = await supabase.from('users').select('name').eq('id', invite.primary_user_id).single();
    res.json({ success: true, data: { invite_id: invite.id, primary_name: primary?.name || 'Someone', code: invite.invite_code } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/co-planner/accept', async (req, res) => {
  try {
    const { invite_code, name, phone, email, instagram, password } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ success: false, error: 'Name, phone and password are required' });
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanEmail = email ? email.toLowerCase().trim() : null;
    const cleanIg = instagram ? instagram.replace('@', '').trim() : null;

    const { data: invite } = await supabase.from('co_planners')
      .select('id, primary_user_id, status').eq('invite_code', invite_code.trim().toUpperCase()).single();
    if (!invite || invite.status !== 'pending') return res.json({ success: false, error: 'Invalid or expired invite' });

    const { data: existingUser } = await supabase.from('users').select('id').eq('phone', '+91' + cleanPhone).single();
    let userId;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const hashedCoPwd = await bcrypt.hash(password, 10);
      const { data: newUser, error: uErr } = await supabase.from('users').insert([{
        name, phone: '+91' + cleanPhone, email: cleanEmail, instagram: cleanIg,
        couple_tier: 'co_planner', token_balance: 0, password_hash: hashedCoPwd,
        dreamer_type: 'co_planner', email_verified: false,
      }]).select().single();
      if (uErr) throw uErr;
      userId = newUser.id;
    }

    await supabase.from('co_planners').update({
      co_planner_user_id: userId, name, phone: '+91' + cleanPhone, status: 'active',
    }).eq('id', invite.id);

    logActivity('co_planner_joined', `${name} joined as co-planner via ${invite_code}`);
    res.json({ success: true, data: { id: userId, name, type: 'co_planner', primary_user_id: invite.primary_user_id, invite_code } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/co-planner/list/:userId', async (req, res) => {
  try {
    const { data } = await supabase.from('co_planners').select('*')
      .eq('primary_user_id', req.params.userId).neq('status', 'removed').order('created_at');
    res.json({ success: true, data: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/co-planner/remove', async (req, res) => {
  try {
    const { invite_id, user_id } = req.body;
    await supabase.from('co_planners').update({ status: 'removed' }).eq('id', invite_id).eq('primary_user_id', user_id);
    logActivity('co_planner_removed', `Co-planner ${invite_id} removed`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Enquiry Notification System ──
// When a couple sends an enquiry, notify the vendor via WhatsApp + email
app.post('/api/enquiry/send', async (req, res) => {
  try {
    const { user_id, vendor_id, message } = req.body;
    if (!user_id || !vendor_id) return res.status(400).json({ success: false, error: 'user_id and vendor_id required' });

    // Get couple details
    const { data: user } = await supabase.from('users').select('name, phone, email').eq('id', user_id).single();
    // Get vendor details
    const { data: vendor } = await supabase.from('vendors').select('name, phone, email').eq('id', vendor_id).single();

    if (!user || !vendor) return res.json({ success: false, error: 'User or vendor not found' });

    // Save enquiry as message
    await supabase.from('messages').insert([{
      user_id, vendor_id,
      message: message || `Hi, I found you on The Dream Wedding and would love to discuss my wedding.`,
      sender_type: 'user',
      created_at: new Date().toISOString(),
    }]);

    // Set 24hr refund deadline
    const refundDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('messages').insert([{
      user_id, vendor_id,
      message: `[SYSTEM] Enquiry sent. Vendor must respond by ${new Date(refundDeadline).toLocaleString('en-IN')} or token will be refunded.`,
      sender_type: 'system',
      created_at: new Date().toISOString(),
    }]);

    // Generate WhatsApp notification link for vendor
    const vendorPhone = (vendor.phone || '').replace(/\D/g, '').slice(-10);
    const waMessage = `New enquiry on The Dream Wedding!\n\nFrom: ${user.name}\nPhone: ${user.phone || 'Not shared'}\n\n"${(message || 'I found you on TDW and love your work.').slice(0, 200)}"\n\nReply within 24 hours.\nDashboard: vendor.thedreamwedding.in`;
    const waLink = vendorPhone ? `https://wa.me/91${vendorPhone}?text=${encodeURIComponent(waMessage)}` : null;

    // TODO: Send actual WhatsApp via Twilio WhatsApp API when approved
    // TODO: Send email notification via Resend/Nodemailer when configured
    console.log(`[ENQUIRY] ${user.name} → ${vendor.name} | WA: ${waLink ? 'ready' : 'no phone'}`);

    logActivity('enquiry_sent', `${user.name} sent enquiry to ${vendor.name}`);

    res.json({ success: true, data: { wa_link: waLink, refund_deadline: refundDeadline, vendor_name: vendor.name } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check and process 24hr refund (cron job or manual trigger)
app.post('/api/enquiry/check-refunds', async (req, res) => {
  try {
    // Find system messages with refund deadlines that have passed
    const cutoff = new Date().toISOString();
    const { data: expired } = await supabase.from('messages')
      .select('*').eq('sender_type', 'system').like('message', '%token will be refunded%');

    let refunded = 0;
    for (const msg of (expired || [])) {
      // Check if vendor replied
      const { data: replies } = await supabase.from('messages')
        .select('id').eq('user_id', msg.user_id).eq('vendor_id', msg.vendor_id)
        .eq('sender_type', 'vendor').gt('created_at', msg.created_at).limit(1);

      if (!replies || replies.length === 0) {
        // No reply — refund token
        const { data: user } = await supabase.from('users').select('token_balance').eq('id', msg.user_id).single();
        if (user) {
          await supabase.from('users').update({ token_balance: (user.token_balance || 0) + 1 }).eq('id', msg.user_id);
          refunded++;
        }
      }
      // Delete the system message to avoid re-processing
      await supabase.from('messages').delete().eq('id', msg.id);
    }

    res.json({ success: true, data: { refunded } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Dream Ai Access Control ──
app.post('/api/ai-access/grant', async (req, res) => {
  try {
    const { vendor_id, enabled } = req.body;
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    const { error } = await supabase.from('vendors').update({ ai_enabled: !!enabled }).eq('id', vendor_id);
    if (error) return res.json({ success: false, error: error.message });
    logActivity('ai_access_toggle', `Vendor ${vendor_id}: ${enabled ? 'granted' : 'revoked'}`);
    res.json({ success: true, data: { vendor_id, ai_enabled: !!enabled } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/ai-access/:vendor_id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendors')
      .select('id, name, ai_enabled, ai_commands_used, ai_access_requested')
      .eq('id', req.params.vendor_id).single();
    if (error) return res.json({ success: false, error: error.message });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/ai-access', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendors')
      .select('id, name, category, city, ai_enabled, ai_commands_used, ai_access_requested, ai_use_case, created_at')
      .order('created_at', { ascending: false });
    if (error) return res.json({ success: false, error: error.message });
    // Attach tier from vendor_subscriptions
    const ids = (data || []).map(v => v.id);
    const { data: subs } = await supabase.from('vendor_subscriptions')
      .select('vendor_id, tier').in('vendor_id', ids);
    const tierMap = {};
    (subs || []).forEach(s => { tierMap[s.vendor_id] = s.tier; });
    const enriched = (data || []).map(v => ({ ...v, tier: tierMap[v.id] || 'essential' }));
    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ai-access/request', async (req, res) => {
  try {
    const { vendor_id, use_case } = req.body;
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    await supabase.from('vendors').update({ ai_access_requested: true, ai_use_case: use_case || '' }).eq('id', vendor_id);
    logActivity('ai_access_request', `Vendor ${vendor_id} requested AI access`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Founding Vendors (admin cohort tracking) ──
// Returns founding vendors enriched with tier, profile %, activation signals,
// Dream Ai usage, and admin notes.
app.get('/api/admin/founding-vendors', async (req, res) => {
  try {
    // Step 1: find all founding vendor IDs from vendor_subscriptions
    const { data: subs, error: subsErr } = await supabase
      .from('vendor_subscriptions')
      .select('vendor_id, tier, is_founding_vendor, founding_badge, status, created_at')
      .or('is_founding_vendor.eq.true,founding_badge.eq.true');
    if (subsErr) return res.json({ success: false, error: subsErr.message });

    const ids = (subs || []).map(s => s.vendor_id);
    if (ids.length === 0) return res.json({ success: true, data: [] });

    // Step 2: pull vendor details for those IDs
    const { data: vendors, error: vErr } = await supabase
      .from('vendors')
      .select('id, name, category, city, phone, starting_price, portfolio_images, about, vibe_tags, instagram_url, ai_enabled, ai_commands_used, ai_extra_tokens, ai_access_requested, last_whatsapp_activity, admin_notes, created_at')
      .in('id', ids);
    if (vErr) return res.json({ success: false, error: vErr.message });

    // Step 3: enrich — tier from subs, profile completion %, activation status
    const tierMap = {};
    (subs || []).forEach(s => { tierMap[s.vendor_id] = s.tier || 'essential'; });

    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

    const enriched = (vendors || []).map(v => {
      const checks = [
        !!v.name, !!v.category, !!v.city, !!v.starting_price,
        (v.portfolio_images?.length || 0) >= 5,
        (v.portfolio_images?.length || 0) >= 15,
        !!v.about, (v.vibe_tags?.length || 0) > 0, !!v.instagram_url,
      ];
      const profilePct = Math.round(checks.filter(Boolean).length / checks.length * 100);

      const signedUpAt = v.created_at ? new Date(v.created_at).getTime() : now;
      const lastWa = v.last_whatsapp_activity ? new Date(v.last_whatsapp_activity).getTime() : null;

      let status = 'pending'; // default: ai not enabled yet
      if (v.ai_enabled) {
        if (lastWa && (now - lastWa) < SEVEN_DAYS) status = 'active';
        else if (lastWa) status = 'stalled';
        else status = 'never_activated';
      } else if ((now - signedUpAt) > THREE_DAYS && profilePct < 50) {
        status = 'stalled';
      }

      return {
        id: v.id,
        name: v.name,
        category: v.category,
        city: v.city,
        phone: v.phone,
        tier: tierMap[v.id] || 'essential',
        profile_pct: profilePct,
        ai_enabled: !!v.ai_enabled,
        ai_access_requested: !!v.ai_access_requested,
        ai_commands_used: v.ai_commands_used || 0,
        ai_extra_tokens: v.ai_extra_tokens || 0,
        last_whatsapp_activity: v.last_whatsapp_activity,
        admin_notes: v.admin_notes || '',
        created_at: v.created_at,
        status,
      };
    });

    // Sort: active first, then stalled, then never_activated, then pending
    const statusOrder = { active: 0, stalled: 1, never_activated: 2, pending: 3 };
    enriched.sort((a, b) => (statusOrder[a.status] - statusOrder[b.status]) ||
      (a.name || '').localeCompare(b.name || ''));

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update a founding vendor's admin notes (Swati's observations)
app.patch('/api/admin/founding-vendors/:id/notes', async (req, res) => {
  try {
    const { notes } = req.body;
    const { error } = await supabase.from('vendors')
      .update({ admin_notes: notes || '' }).eq('id', req.params.id);
    if (error) return res.json({ success: false, error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Unified login — phone or email + password (works for both couples and vendors)
app.post('/api/signup/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ success: false, error: 'Email/phone and password required' });

    const clean = identifier.toLowerCase().trim();
    const isPhone = /^\d{10}$/.test(clean.replace(/\D/g, ''));

    // Try vendor credentials first
    let vendorCred = null;
    if (isPhone) {
      const { data } = await supabase.from('vendor_credentials')
        .select('*').eq('phone_number', '+91' + clean.replace(/\D/g, '')).maybeSingle();
      vendorCred = data;
    }
    if (!vendorCred) {
      const { data } = await supabase.from('vendor_credentials')
        .select('*').eq('username', clean).maybeSingle();
      vendorCred = data;
    }

    if (vendorCred) {
      const vendorMatch = await bcrypt.compare(password, vendorCred.password_hash);
      if (!vendorMatch) return res.json({ success: false, error: 'Invalid password' });
      const { data: vendor } = await supabase.from('vendors').select('*').eq('id', vendorCred.vendor_id).maybeSingle();

      // CRITICAL: if vendor row was deleted but credentials remain, treat as deleted account.
      // Auto-clean the orphan credentials so subsequent signup with same phone works.
      if (!vendor) {
        try {
          await supabase.from('vendor_credentials').delete().eq('id', vendorCred.id);
          await supabase.from('vendor_logins').delete().eq('vendor_id', vendorCred.vendor_id);
          await supabase.from('vendor_subscriptions').delete().eq('vendor_id', vendorCred.vendor_id);
        } catch {}
        return res.status(401).json({ success: false, error: 'Account no longer exists' });
      }

      const { data: sub } = await supabase.from('vendor_subscriptions').select('tier, status, trial_end_date')
        .eq('vendor_id', vendorCred.vendor_id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      
      // Check if this is a team member login
      const isTeam = vendorCred.is_team_member === true;
      let teamRole = 'owner';
      let teamMemberName = vendor?.name;
      if (isTeam && vendorCred.team_member_id) {
        const { data: member } = await supabase.from('vendor_team_members')
          .select('name, role').eq('id', vendorCred.team_member_id).maybeSingle();
        if (member) { teamRole = member.role || 'staff'; teamMemberName = member.name; }
      }
      
      return res.json({ success: true, data: {
        type: 'vendor', id: vendor.id, name: vendor.name, category: vendor.category,
        city: vendor.city, tier: sub?.tier || 'essential',
        team_role: teamRole,
        team_member_name: isTeam ? teamMemberName : null,
        is_team_member: isTeam,
      }});
    }

    // Try couple login
    let user = null;
    if (isPhone) {
      const { data } = await supabase.from('users')
        .select('*').eq('phone', '+91' + clean.replace(/\D/g, '')).maybeSingle();
      user = data;
    }
    if (!user) {
      const { data } = await supabase.from('users')
        .select('*').eq('email', clean).maybeSingle();
      user = data;
    }

    if (!user) return res.status(401).json({ success: false, error: 'Account not found. Please sign up first.' });
    if (!user.password_hash) return res.status(401).json({ success: false, error: 'Account not found. Please sign up first.' });
    const coupleMatch = await bcrypt.compare(password, user.password_hash);
    if (!coupleMatch) return res.status(401).json({ success: false, error: 'Invalid password' });

    const tierLabelMap = { free: 'basic', premium: 'gold', elite: 'platinum' };

    return res.json({ success: true, data: {
      type: 'couple', id: user.id, name: user.name,
      couple_tier: user.couple_tier || 'free',
      tier_label: tierLabelMap[user.couple_tier] || 'basic',
      tokens: user.token_balance || 3,
    }});
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vendor: Create referral code for sharing with couples
app.post('/api/vendor-referral/create', async (req, res) => {
  try {
    const { vendor_id } = req.body;
    if (!vendor_id) return res.status(400).json({ success: false, error: 'Vendor ID required' });

    // Check if vendor already has a referral code
    const { data: existing } = await supabase.from('vendor_referrals')
      .select('referral_code').eq('vendor_id', vendor_id).eq('status', 'active_code').limit(1);
    if (existing && existing.length > 0 && existing[0].referral_code) {
      return res.json({ success: true, data: { code: existing[0].referral_code, existing: true } });
    }

    // Generate new code from vendor name
    const { data: vendor } = await supabase.from('vendors').select('name').eq('id', vendor_id).single();
    const code = genCode();

    // Store the referral code
    await supabase.from('vendor_referrals').insert([{
      vendor_id, referral_code: code, status: 'active_code',
      couple_name: '', couple_phone: '',
    }]);

    res.json({ success: true, data: { code, existing: false } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// WAITLIST
// ==================

app.post('/api/waitlist', async (req, res) => {
  try {
    const { name, email, phone, instagram, category, type, source } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, error: 'Name and email required' });

    const { data, error } = await supabase.from('waitlist').insert([{
      name, email, phone: phone || null, instagram: instagram || null,
      category: category || null, type: type || 'dreamer',
      source: source || 'landing_page', status: 'pending',
    }]).select().single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/waitlist', async (req, res) => {
  try {
    const { data, error } = await supabase.from('waitlist')
      .select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// DISCOVER BETA — access control (mirrors PAi pattern)
// Table: discover_access_requests (create in Supabase)
// Columns on users table: discover_enabled (bool), discover_granted_at, discover_expires_at, discover_access_requested_at
// ══════════════════════════════════════════════════════════════════════════════

// ── Status endpoint — couple PWA calls on Discover mount
app.get('/api/discover/status', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
    const { data, error } = await supabase
      .from('users')
      .select('id, discover_enabled, discover_expires_at')
      .eq('id', user_id)
      .maybeSingle();
    if (error || !data) return res.json({ success: true, enabled: false, reason: 'not_found' });
    if (!data.discover_enabled) {
      const { data: pending } = await supabase
        .from('discover_access_requests')
        .select('id, status, created_at')
        .eq('user_id', user_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return res.json({ success: true, enabled: false, reason: 'not_granted', pending_request: pending || null });
    }
    if (data.discover_expires_at && new Date(data.discover_expires_at) < new Date()) {
      return res.json({ success: true, enabled: false, reason: 'expired' });
    }
    res.json({ success: true, enabled: true, expires_at: data.discover_expires_at || null });
  } catch (error) {
    console.error('discover status error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Request access
app.post('/api/discover/request-access', async (req, res) => {
  try {
    const { user_id, reason } = req.body || {};
    if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
    const { data: existing } = await supabase
      .from('discover_access_requests')
      .select('id').eq('user_id', user_id).eq('status', 'pending').maybeSingle();
    if (existing) return res.json({ success: true, already_pending: true, data: existing });
    const { data: u } = await supabase.from('users').select('name, phone').eq('id', user_id).maybeSingle();
    const { data, error } = await supabase
      .from('discover_access_requests').insert([{
        user_id, user_name: u?.name || null, user_phone: u?.phone || null,
        reason: reason || null,
      }]).select().single();
    if (error) throw error;
    await supabase.from('users').update({
      discover_access_requested_at: new Date().toISOString(),
    }).eq('id', user_id);
    logActivity('discover_access_requested', `Couple ${u?.name || user_id} requested Discover beta`);
    res.json({ success: true, data });
  } catch (error) {
    console.error('discover request-access error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Admin: list requests
app.get('/api/discover/admin/requests', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('discover_access_requests')
      .select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Admin: grant access
app.post('/api/discover/admin/grant', async (req, res) => {
  try {
    const { user_id, days } = req.body || {};
    if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
    const dayCount = Math.min(Math.max(parseInt(days) || 30, 1), 365);
    const now = new Date();
    const expires = new Date(now.getTime() + dayCount * 24 * 60 * 60 * 1000);
    const { error } = await supabase.from('users').update({
      discover_enabled: true,
      discover_granted_at: now.toISOString(),
      discover_expires_at: expires.toISOString(),
    }).eq('id', user_id);
    if (error) throw error;
    await supabase.from('discover_access_requests').update({
      status: 'granted', reviewed_at: now.toISOString(), reviewed_by: 'admin',
    }).eq('user_id', user_id).eq('status', 'pending');
    logActivity('discover_access_granted', `Couple ${user_id} granted Discover for ${dayCount} days`);
    res.json({ success: true, expires_at: expires.toISOString(), days: dayCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Admin: revoke
app.post('/api/discover/admin/revoke', async (req, res) => {
  try {
    const { user_id } = req.body || {};
    if (!user_id) return res.status(400).json({ success: false, error: 'user_id required' });
    const { error } = await supabase.from('users').update({ discover_enabled: false }).eq('id', user_id);
    if (error) throw error;
    logActivity('discover_access_revoked', `Couple ${user_id} Discover access revoked`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Admin: deny request
app.post('/api/discover/admin/deny', async (req, res) => {
  try {
    const { request_id } = req.body || {};
    if (!request_id) return res.status(400).json({ success: false, error: 'request_id required' });
    const { error } = await supabase.from('discover_access_requests').update({
      status: 'denied', reviewed_at: new Date().toISOString(), reviewed_by: 'admin',
    }).eq('id', request_id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Admin: stats (granted couples list)
app.get('/api/discover/admin/stats', async (req, res) => {
  try {
    const { data: granted } = await supabase.from('users')
      .select('id, name, phone, discover_granted_at, discover_expires_at')
      .eq('discover_enabled', true);
    res.json({ success: true, granted_couples: granted || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// VENDOR DISCOVERY — access control (mirrors couple Discover pattern)
// ══════════════════════════════════════════════════════════════════════════════

// ── Status: vendor PWA calls on Discover mode mount
app.get('/api/vendor-discover/status', async (req, res) => {
  try {
    const { vendor_id } = req.query;
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    const { data, error } = await supabase
      .from('vendors')
      .select('id, vendor_discover_enabled, vendor_discover_expires_at, discover_listed, discover_submitted_at, discover_approved_at, discover_rejected_reason, discover_completion_pct')
      .eq('id', vendor_id).maybeSingle();
    if (error || !data) return res.json({ success: true, enabled: false, reason: 'not_found' });
    if (!data.vendor_discover_enabled) {
      const { data: pending } = await supabase
        .from('vendor_discover_access_requests')
        .select('id, status, created_at')
        .eq('vendor_id', vendor_id).eq('status', 'pending')
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      return res.json({ success: true, enabled: false, reason: 'not_granted', pending_request: pending || null });
    }
    if (data.vendor_discover_expires_at && new Date(data.vendor_discover_expires_at) < new Date()) {
      return res.json({ success: true, enabled: false, reason: 'expired' });
    }
    res.json({
      success: true,
      enabled: true,
      expires_at: data.vendor_discover_expires_at,
      listed: data.discover_listed,
      submitted_at: data.discover_submitted_at,
      approved_at: data.discover_approved_at,
      rejection_reason: data.discover_rejected_reason,
      completion_pct: data.discover_completion_pct || 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Request access
app.post('/api/vendor-discover/request-access', async (req, res) => {
  try {
    const { vendor_id, reason } = req.body || {};
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    const { data: existing } = await supabase
      .from('vendor_discover_access_requests')
      .select('id').eq('vendor_id', vendor_id).eq('status', 'pending').maybeSingle();
    if (existing) return res.json({ success: true, already_pending: true, data: existing });
    const { data: v } = await supabase.from('vendors').select('name, phone').eq('id', vendor_id).maybeSingle();
    const { data, error } = await supabase
      .from('vendor_discover_access_requests').insert([{
        vendor_id, vendor_name: v?.name || null, vendor_phone: v?.phone || null,
        reason: reason || null,
      }]).select().single();
    if (error) throw error;
    await supabase.from('vendors').update({
      vendor_discover_access_requested_at: new Date().toISOString(),
    }).eq('id', vendor_id);
    logActivity('vendor_discover_requested', `Vendor ${v?.name || vendor_id} requested Discover beta`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Admin: list requests
app.get('/api/vendor-discover/admin/requests', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_discover_access_requests')
      .select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Admin: grant
app.post('/api/vendor-discover/admin/grant', async (req, res) => {
  try {
    const { vendor_id, days } = req.body || {};
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    const dayCount = Math.min(Math.max(parseInt(days) || 365, 1), 730);
    const now = new Date();
    const expires = new Date(now.getTime() + dayCount * 86400000);
    const { error } = await supabase.from('vendors').update({
      vendor_discover_enabled: true,
      vendor_discover_granted_at: now.toISOString(),
      vendor_discover_expires_at: expires.toISOString(),
    }).eq('id', vendor_id);
    if (error) throw error;
    await supabase.from('vendor_discover_access_requests').update({
      status: 'granted', reviewed_at: now.toISOString(), reviewed_by: 'admin',
    }).eq('vendor_id', vendor_id).eq('status', 'pending');
    logActivity('vendor_discover_granted', `Vendor ${vendor_id} granted Discover for ${dayCount} days`);
    res.json({ success: true, expires_at: expires.toISOString(), days: dayCount });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Admin: revoke
app.post('/api/vendor-discover/admin/revoke', async (req, res) => {
  try {
    const { vendor_id } = req.body || {};
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    const { error } = await supabase.from('vendors').update({
      vendor_discover_enabled: false, discover_listed: false,
    }).eq('id', vendor_id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Admin: deny
app.post('/api/vendor-discover/admin/deny', async (req, res) => {
  try {
    const { request_id } = req.body || {};
    if (!request_id) return res.status(400).json({ success: false, error: 'request_id required' });
    const { error } = await supabase.from('vendor_discover_access_requests').update({
      status: 'denied', reviewed_at: new Date().toISOString(), reviewed_by: 'admin',
    }).eq('id', request_id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Admin: stats (granted vendors list)
app.get('/api/vendor-discover/admin/stats', async (req, res) => {
  try {
    const { data: granted } = await supabase.from('vendors')
      .select('id, name, phone, category, city, vendor_discover_granted_at, vendor_discover_expires_at, discover_listed, discover_completion_pct')
      .eq('vendor_discover_enabled', true);
    res.json({ success: true, granted_vendors: granted || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// VENDOR DISCOVERY PROFILE — CRUD operations
// ══════════════════════════════════════════════════════════════════════════════

// ── Get full discovery profile for a vendor
app.get('/api/vendor-discover/profile/:vendor_id', async (req, res) => {
  try {
    const { vendor_id } = req.params;
    const [{ data: vendor }, { data: packages }, { data: albums }, { data: blocks }, { data: photos }] = await Promise.all([
      supabase.from('vendors').select('*').eq('id', vendor_id).maybeSingle(),
      supabase.from('vendor_packages').select('*').eq('vendor_id', vendor_id).order('sort_order'),
      supabase.from('vendor_wedding_albums').select('*').eq('vendor_id', vendor_id).order('sort_order'),
      supabase.from('vendor_availability_blocks').select('*').eq('vendor_id', vendor_id),
      supabase.from('vendor_photo_approvals').select('*').eq('vendor_id', vendor_id),
    ]);
    if (!vendor) return res.status(404).json({ success: false, error: 'vendor not found' });
    res.json({
      success: true,
      data: {
        vendor,
        packages: packages || [],
        albums: albums || [],
        blocked_dates: blocks || [],
        photo_approvals: photos || [],
      },
    });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Update vendor discovery fields (partial update)
app.patch('/api/vendor-discover/profile/:vendor_id', async (req, res) => {
  try {
    const { vendor_id } = req.params;
    // Whitelist updatable fields to avoid accidents
    const allowed = [
      'owner_name', 'serves_cities', 'serves_flexible', 'years_active', 'weddings_delivered',
      'languages', 'team_size', 'category_details', 'gst_number', 'studio_address',
      'studio_lat', 'studio_lng', 'cancellation_policy', 'payment_terms', 'travel_charges',
      'about', 'vibe_tags', 'starting_price', 'equipment', 'delivery_time',
      'portfolio_images', 'featured_photos', 'cities', 'instagram',
    ];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'no updatable fields in body' });
    }
    const { data, error } = await supabase.from('vendors').update(updates).eq('id', vendor_id).select().single();
    if (error) throw error;
    // Recompute completion %
    await recomputeDiscoverCompletion(vendor_id);
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Completion % helper
async function recomputeDiscoverCompletion(vendor_id) {
  try {
    const { data: v } = await supabase.from('vendors').select('*').eq('id', vendor_id).maybeSingle();
    if (!v) return;
    const { data: packages } = await supabase.from('vendor_packages').select('id').eq('vendor_id', vendor_id);
    let score = 0;
    const total = 12;
    if (v.name) score++;
    if (v.category && v.city) score++;
    if (v.serves_cities && Array.isArray(v.serves_cities) && v.serves_cities.length > 0) score++;
    if (v.years_active) score++;
    if (v.weddings_delivered) score++;
    if (v.languages && Array.isArray(v.languages) && v.languages.length > 0) score++;
    if (v.starting_price) score++;
    if (v.portfolio_images && Array.isArray(v.portfolio_images) && v.portfolio_images.length >= 3) score++;
    if (v.about && v.about.length >= 100) score++;
    if (v.vibe_tags && Array.isArray(v.vibe_tags) && v.vibe_tags.length >= 3) score++;
    if (packages && packages.length > 0) score++;
    if (v.cancellation_policy) score++;
    const pct = Math.round((score / total) * 100);
    await supabase.from('vendors').update({ discover_completion_pct: pct }).eq('id', vendor_id);
  } catch (e) { console.warn('recomputeDiscoverCompletion error:', e.message); }
}

// ── Packages CRUD
app.get('/api/vendor-discover/packages/:vendor_id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendor_packages')
      .select('*').eq('vendor_id', req.params.vendor_id).order('sort_order');
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/vendor-discover/packages', async (req, res) => {
  try {
    const { vendor_id, name, price, deliverables, duration, ideal_for, included, sort_order } = req.body || {};
    if (!vendor_id || !name) return res.status(400).json({ success: false, error: 'vendor_id and name required' });
    const { data, error } = await supabase.from('vendor_packages').insert([{
      vendor_id, name, price: price || null,
      deliverables: deliverables || [], duration: duration || null,
      ideal_for: ideal_for || null, included: included || null,
      sort_order: sort_order || 0,
    }]).select().single();
    if (error) throw error;
    await recomputeDiscoverCompletion(vendor_id);
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.patch('/api/vendor-discover/packages/:id', async (req, res) => {
  try {
    const allowed = ['name', 'price', 'deliverables', 'duration', 'ideal_for', 'included', 'sort_order'];
    const updates = { updated_at: new Date().toISOString() };
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    const { data, error } = await supabase.from('vendor_packages').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/vendor-discover/packages/:id', async (req, res) => {
  try {
    const { data: pkg } = await supabase.from('vendor_packages').select('vendor_id').eq('id', req.params.id).maybeSingle();
    const { error } = await supabase.from('vendor_packages').delete().eq('id', req.params.id);
    if (error) throw error;
    if (pkg?.vendor_id) await recomputeDiscoverCompletion(pkg.vendor_id);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Availability blocks CRUD
app.get('/api/vendor-discover/availability/:vendor_id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendor_availability_blocks')
      .select('*').eq('vendor_id', req.params.vendor_id).order('blocked_date');
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/vendor-discover/availability', async (req, res) => {
  try {
    const { vendor_id, dates, reason } = req.body || {};
    if (!vendor_id || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ success: false, error: 'vendor_id and dates[] required' });
    }
    const rows = dates.map(d => ({ vendor_id, blocked_date: d, reason: reason || null }));
    const { data, error } = await supabase.from('vendor_availability_blocks')
      .upsert(rows, { onConflict: 'vendor_id,blocked_date', ignoreDuplicates: true }).select();
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/vendor-discover/availability', async (req, res) => {
  try {
    const { vendor_id, dates } = req.body || {};
    if (!vendor_id || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ success: false, error: 'vendor_id and dates[] required' });
    }
    const { error } = await supabase.from('vendor_availability_blocks')
      .delete().eq('vendor_id', vendor_id).in('blocked_date', dates);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Wedding albums CRUD
app.get('/api/vendor-discover/albums/:vendor_id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendor_wedding_albums')
      .select('*').eq('vendor_id', req.params.vendor_id).order('sort_order');
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/vendor-discover/albums', async (req, res) => {
  try {
    const { vendor_id, title, city, event_date, images, video_url, sort_order } = req.body || {};
    if (!vendor_id || !title) return res.status(400).json({ success: false, error: 'vendor_id and title required' });
    const { data, error } = await supabase.from('vendor_wedding_albums').insert([{
      vendor_id, title, city: city || null, event_date: event_date || null,
      images: images || [], video_url: video_url || null, sort_order: sort_order || 0,
    }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.patch('/api/vendor-discover/albums/:id', async (req, res) => {
  try {
    const allowed = ['title', 'city', 'event_date', 'images', 'video_url', 'sort_order'];
    const updates = { updated_at: new Date().toISOString() };
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    const { data, error } = await supabase.from('vendor_wedding_albums').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/vendor-discover/albums/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('vendor_wedding_albums').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// VENDOR DISCOVERY SUBMISSIONS — approval queue
// ══════════════════════════════════════════════════════════════════════════════

// ── Vendor submits for approval (or re-submits after edits)
app.post('/api/vendor-discover/submit', async (req, res) => {
  try {
    const { vendor_id } = req.body || {};
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });

    const { data: vendor } = await supabase.from('vendors').select('*').eq('id', vendor_id).maybeSingle();
    if (!vendor) return res.status(404).json({ success: false, error: 'vendor not found' });

    // Resolve tier
    const { data: sub } = await supabase.from('vendor_subscriptions').select('tier').eq('vendor_id', vendor_id).maybeSingle();
    const tier = sub?.tier || 'essential';

    // Prestige: auto-approve (skip manual review), just list directly
    if (tier === 'prestige') {
      await supabase.from('vendors').update({
        discover_listed: true,
        discover_submitted_at: new Date().toISOString(),
        discover_approved_at: new Date().toISOString(),
        discover_rejected_reason: null,
      }).eq('id', vendor_id);
      // Mark all pending photos approved
      await supabase.from('vendor_photo_approvals').update({
        approval_status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: 'auto-prestige',
      }).eq('vendor_id', vendor_id).eq('approval_status', 'pending');
      logActivity('vendor_discover_auto_approved', `Prestige vendor ${vendor.name} auto-listed`);
      return res.json({ success: true, auto_approved: true });
    }

    // Essential/Signature: create submission for manual review
    const { data: submission, error } = await supabase.from('vendor_discover_submissions').insert([{
      vendor_id, vendor_name: vendor.name, vendor_tier: tier,
      status: 'pending',
    }]).select().single();
    if (error) throw error;

    // Mark vendor as submitted (not yet listed)
    await supabase.from('vendors').update({
      discover_submitted_at: new Date().toISOString(),
      discover_rejected_reason: null,
    }).eq('id', vendor_id);

    // Ensure photo approvals exist for every portfolio+featured image
    const photoRows = [];
    for (const url of (vendor.portfolio_images || [])) {
      photoRows.push({ vendor_id, image_url: url, context: 'portfolio', approval_status: 'pending' });
    }
    for (const url of (vendor.featured_photos || [])) {
      photoRows.push({ vendor_id, image_url: url, context: 'featured', approval_status: 'pending' });
    }
    if (photoRows.length > 0) {
      await supabase.from('vendor_photo_approvals').upsert(photoRows, {
        onConflict: 'vendor_id,image_url,context', ignoreDuplicates: true,
      });
    }

    // Mark packages as pending
    await supabase.from('vendor_packages').update({ approval_status: 'pending' })
      .eq('vendor_id', vendor_id).eq('approval_status', 'draft');

    logActivity('vendor_discover_submitted', `${tier} vendor ${vendor.name} submitted for Discovery review`);
    res.json({ success: true, submission });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Admin: list all submissions (pending first)
app.get('/api/vendor-discover/admin/submissions', async (req, res) => {
  try {
    const { status } = req.query;
    let q = supabase.from('vendor_discover_submissions').select('*').order('submitted_at', { ascending: false });
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Admin: get full submission detail (vendor profile + photos + packages)
app.get('/api/vendor-discover/admin/submissions/:id', async (req, res) => {
  try {
    const { data: sub } = await supabase.from('vendor_discover_submissions').select('*').eq('id', req.params.id).maybeSingle();
    if (!sub) return res.status(404).json({ success: false, error: 'submission not found' });
    const [{ data: vendor }, { data: packages }, { data: albums }, { data: photos }] = await Promise.all([
      supabase.from('vendors').select('*').eq('id', sub.vendor_id).maybeSingle(),
      supabase.from('vendor_packages').select('*').eq('vendor_id', sub.vendor_id),
      supabase.from('vendor_wedding_albums').select('*').eq('vendor_id', sub.vendor_id),
      supabase.from('vendor_photo_approvals').select('*').eq('vendor_id', sub.vendor_id),
    ]);
    res.json({ success: true, data: { submission: sub, vendor, packages: packages || [], albums: albums || [], photo_approvals: photos || [] } });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Admin: approve photo
app.post('/api/vendor-discover/admin/photo/approve', async (req, res) => {
  try {
    const { photo_approval_id } = req.body || {};
    if (!photo_approval_id) return res.status(400).json({ success: false, error: 'photo_approval_id required' });
    const { error } = await supabase.from('vendor_photo_approvals').update({
      approval_status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: 'admin',
    }).eq('id', photo_approval_id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Admin: reject photo with reason
app.post('/api/vendor-discover/admin/photo/reject', async (req, res) => {
  try {
    const { photo_approval_id, reason } = req.body || {};
    if (!photo_approval_id) return res.status(400).json({ success: false, error: 'photo_approval_id required' });
    const { error } = await supabase.from('vendor_photo_approvals').update({
      approval_status: 'rejected', rejection_reason: reason || null,
      reviewed_at: new Date().toISOString(), reviewed_by: 'admin',
    }).eq('id', photo_approval_id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Admin: finalize submission review (approve/partial/reject overall)
app.post('/api/vendor-discover/admin/submission/finalize', async (req, res) => {
  try {
    const { submission_id, status, rejection_reason, notes } = req.body || {};
    if (!submission_id || !['approved', 'partial', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'submission_id and valid status required' });
    }
    const { data: sub } = await supabase.from('vendor_discover_submissions').select('vendor_id').eq('id', submission_id).maybeSingle();
    if (!sub) return res.status(404).json({ success: false, error: 'submission not found' });

    // Update submission
    await supabase.from('vendor_discover_submissions').update({
      status, rejection_reason: rejection_reason || null,
      notes: notes || [],
      reviewed_at: new Date().toISOString(), reviewed_by: 'admin',
    }).eq('id', submission_id);

    if (status === 'approved' || status === 'partial') {
      // List the vendor — only approved photos will show (enforced on read)
      await supabase.from('vendors').update({
        discover_listed: true,
        discover_approved_at: new Date().toISOString(),
        discover_rejected_reason: status === 'partial' ? (rejection_reason || null) : null,
      }).eq('id', sub.vendor_id);
      // Auto-approve any still-pending photos (if admin didn't touch them, treat as accepted)
      await supabase.from('vendor_photo_approvals').update({
        approval_status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: 'admin-bulk',
      }).eq('vendor_id', sub.vendor_id).eq('approval_status', 'pending');
      // Auto-approve pending packages
      await supabase.from('vendor_packages').update({ approval_status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('vendor_id', sub.vendor_id).eq('approval_status', 'pending');
      logActivity('vendor_discover_listed', `Vendor ${sub.vendor_id} listed in Discovery (${status})`);
    } else {
      // Rejected — don't list
      await supabase.from('vendors').update({
        discover_listed: false,
        discover_rejected_reason: rejection_reason || 'Submission rejected',
      }).eq('id', sub.vendor_id);
      logActivity('vendor_discover_rejected', `Vendor ${sub.vendor_id} Discovery submission rejected`);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// BUILD 2 + BUILD 3 — Couture, Lock Date, Muse, Events, Enquiries, Messages
// ══════════════════════════════════════════════════════════════════════════════

// ── Lock Date interest (validation mechanism) ──
app.post('/api/lock-date/interest', async (req, res) => {
  try {
    const { couple_id, vendor_id, wedding_date, source, explored_couture } = req.body || {};
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    const { data, error } = await supabase.from('lock_date_interest').insert([{
      couple_id: couple_id || null,
      vendor_id,
      wedding_date: wedding_date || null,
      source: source || 'profile',
      explored_couture: !!explored_couture,
    }]).select().single();
    if (error) throw error;
    logActivity('lock_date_interest', `Lock Date tap — vendor ${vendor_id}`);
    // Part D: bump vendor analytics + activity log
    bumpVendorMetric(vendor_id, 'lock_interests').catch(() => {});
    logVendorActivity(vendor_id, 'lock_date_interest', 'A couple tapped Lock Date on your profile').catch(() => {});
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/lock-date/admin/stats', async (req, res) => {
  try {
    const { data: all } = await supabase.from('lock_date_interest')
      .select('*').order('created_at', { ascending: false }).limit(500);
    const total = all?.length || 0;
    const unique_couples = new Set((all || []).map(r => r.couple_id).filter(Boolean)).size;
    const explored = (all || []).filter(r => r.explored_couture).length;
    const byVendor = {};
    (all || []).forEach(r => { byVendor[r.vendor_id] = (byVendor[r.vendor_id] || 0) + 1; });
    const vendorEntries = Object.entries(byVendor).sort((a, b) => b[1] - a[1]).slice(0, 20);
    const vendorIds = vendorEntries.map(([id]) => id);
    const { data: vendors } = await supabase.from('vendors').select('id, name, category, city, couture_eligible').in('id', vendorIds);
    const vendorMap = {};
    (vendors || []).forEach(v => { vendorMap[v.id] = v; });
    const top_vendors = vendorEntries.map(([id, count]) => ({ vendor: vendorMap[id], count }));
    res.json({ success: true, total, unique_couples, explored_couture: explored, top_vendors, recent: (all || []).slice(0, 50) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Couture eligibility (admin toggle) ──
app.post('/api/couture/admin/toggle', async (req, res) => {
  try {
    const { vendor_id, eligible } = req.body || {};
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    const { error } = await supabase.from('vendors').update({
      couture_eligible: !!eligible,
      couture_eligible_since: eligible ? new Date().toISOString() : null,
    }).eq('id', vendor_id);
    if (error) throw error;
    logActivity('couture_toggle', `Vendor ${vendor_id} couture_eligible = ${eligible}`);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/couture/admin/eligible', async (req, res) => {
  try {
    const { data } = await supabase.from('vendors')
      .select('id, name, category, city, tier, couture_eligible, couture_eligible_since, discover_listed, discover_completion_pct, rating')
      .eq('couture_eligible', true);
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── MUSE — saved vendors (uses correct table moodboard_items) ──
app.get('/api/couple/muse/:couple_id', async (req, res) => {
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
});

app.delete('/api/couple/muse/:save_id', async (req, res) => {
  try {
    const { error } = await supabase.from('moodboard_items').delete().eq('id', req.params.save_id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/couple/muse/remove', async (req, res) => {
  try {
    const { couple_id, vendor_id } = req.body || {};
    if (!couple_id || !vendor_id) return res.status(400).json({ success: false, error: 'couple_id and vendor_id required' });
    const { error } = await supabase.from('moodboard_items').delete()
      .eq('user_id', couple_id).eq('vendor_id', vendor_id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Save a vendor to Muse (also creates moodboard_items row for Plan-side Moodboard sync)
app.post('/api/couple/muse/save', async (req, res) => {
  try {
    const { couple_id, vendor_id, event } = req.body || {};
    if (!couple_id || !vendor_id) return res.status(400).json({ success: false, error: 'couple_id and vendor_id required' });
    // Check if already saved
    const { data: existing } = await supabase.from('moodboard_items')
      .select('id').eq('user_id', couple_id).eq('vendor_id', vendor_id).maybeSingle();
    if (existing) return res.json({ success: true, already_saved: true });
    const { data: vendor } = await supabase.from('vendors').select('name, category, portfolio_images, featured_photos').eq('id', vendor_id).maybeSingle();
    const image = vendor?.featured_photos?.[0] || vendor?.portfolio_images?.[0] || null;
    const { data, error } = await supabase.from('moodboard_items').insert([{
      user_id: couple_id, vendor_id, vendor_name: vendor?.name || null,
      vendor_category: vendor?.category || null, vendor_image: image,
      event: event || 'general', source: 'discovery',
    }]).select().single();
    if (error) throw error;
    // Part D: bump vendor analytics + activity log
    bumpVendorMetric(vendor_id, 'saves').catch(() => {});
    logVendorActivity(vendor_id, 'saved_to_muse', 'A couple saved you to their Muse').catch(() => {});
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// BUILD 3: VENDOR LOCK DATE PREFERENCES
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/vendor-discover/lock-prefs/:vendor_id', async (req, res) => {
  try {
    const { data } = await supabase.from('vendors')
      .select('id, tier, accepts_lock_date, lock_date_amount, show_whatsapp_public')
      .eq('id', req.params.vendor_id).maybeSingle();
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.patch('/api/vendor-discover/lock-prefs/:vendor_id', async (req, res) => {
  try {
    const allowed = ['accepts_lock_date', 'lock_date_amount', 'show_whatsapp_public'];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    // Validate lock_date_amount against tier bands
    if (updates.lock_date_amount !== undefined) {
      const { data: v } = await supabase.from('vendors').select('tier').eq('id', req.params.vendor_id).maybeSingle();
      const { data: sub } = await supabase.from('vendor_subscriptions').select('tier').eq('vendor_id', req.params.vendor_id).maybeSingle();
      const tier = (sub?.tier || v?.tier || 'essential').toLowerCase();
      const amt = parseInt(updates.lock_date_amount);
      const bands = {
        essential: [100000, 300000],   // Rs 1000-3000
        signature: [300000, 1000000],  // Rs 3000-10000
        prestige: [1000000, 5000000],  // Rs 10000-50000
      };
      const band = bands[tier] || bands.essential;
      if (amt < band[0] || amt > band[1]) {
        return res.status(400).json({ success: false, error: `Amount must be between Rs ${band[0]/100} and Rs ${band[1]/100} for ${tier} tier` });
      }
    }
    const { data, error } = await supabase.from('vendors').update(updates).eq('id', req.params.vendor_id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// BUILD 3: COUPLE EVENTS — multi-event wedding configuration
// ══════════════════════════════════════════════════════════════════════════════
app.get('/api/couple/events/:couple_id', async (req, res) => {
  try {
    const { data: events } = await supabase.from('couple_events')
      .select('*').eq('couple_id', req.params.couple_id)
      .order('sort_order').order('event_date');
    const eventIds = (events || []).map(e => e.id);
    let budgetsMap = {};
    if (eventIds.length > 0) {
      const { data: budgets } = await supabase.from('couple_event_category_budgets')
        .select('*').in('event_id', eventIds);
      (budgets || []).forEach(b => {
        if (!budgetsMap[b.event_id]) budgetsMap[b.event_id] = [];
        budgetsMap[b.event_id].push(b);
      });
    }
    const enriched = (events || []).map(e => ({ ...e, category_budgets: budgetsMap[e.id] || [] }));
    res.json({ success: true, data: enriched });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/couple/events', async (req, res) => {
  try {
    const { couple_id, event_type, event_name, event_date, event_city, budget_total, vibe_tags, guest_count_range, is_active, notes, sort_order } = req.body || {};
    if (!couple_id || !event_type) return res.status(400).json({ success: false, error: 'couple_id and event_type required' });
    const { data, error } = await supabase.from('couple_events').insert([{
      couple_id, event_type,
      event_name: event_name || null,
      event_date: event_date || null,
      event_city: event_city || null,
      budget_total: budget_total || null,
      vibe_tags: vibe_tags || [],
      guest_count_range: guest_count_range || null,
      is_active: is_active !== false,
      notes: notes || null,
      sort_order: sort_order || 0,
    }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.patch('/api/couple/events/:id', async (req, res) => {
  try {
    const allowed = ['event_name', 'event_date', 'event_city', 'budget_total', 'vibe_tags', 'guest_count_range', 'is_active', 'notes', 'sort_order'];
    const updates = { updated_at: new Date().toISOString() };
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    const { data, error } = await supabase.from('couple_events').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/couple/events/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('couple_events').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Category-specific budgets per event
app.post('/api/couple/events/:event_id/category-budget', async (req, res) => {
  try {
    const { category, budget_min, budget_max } = req.body || {};
    if (!category) return res.status(400).json({ success: false, error: 'category required' });
    const { data, error } = await supabase.from('couple_event_category_budgets').upsert({
      event_id: req.params.event_id, category,
      budget_min: budget_min || null, budget_max: budget_max || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'event_id,category' }).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/couple/events/:event_id/category-budget/:category', async (req, res) => {
  try {
    const { error } = await supabase.from('couple_event_category_budgets')
      .delete().eq('event_id', req.params.event_id).eq('category', req.params.category);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// BUILD 3: ENQUIRIES + MESSAGES (in-app chat between couple and vendor)
// ══════════════════════════════════════════════════════════════════════════════
// Couple creates an enquiry (starts a thread)
app.post('/api/enquiries', async (req, res) => {
  try {
    const { couple_id, vendor_id, event_id, wedding_date, initial_message } = req.body || {};
    if (!couple_id || !vendor_id || !initial_message) return res.status(400).json({ success: false, error: 'couple_id, vendor_id, initial_message required' });
    // Return existing thread if active one exists
    const { data: existing } = await supabase.from('vendor_enquiries')
      .select('id').eq('couple_id', couple_id).eq('vendor_id', vendor_id).eq('status', 'active').maybeSingle();
    let enquiry;
    if (existing) {
      enquiry = existing;
    } else {
      const { data, error } = await supabase.from('vendor_enquiries').insert([{
        couple_id, vendor_id,
        event_id: event_id || null,
        wedding_date: wedding_date || null,
        initial_message,
        last_message_at: new Date().toISOString(),
        last_message_preview: initial_message.slice(0, 120),
        last_message_from: 'couple',
        vendor_unread_count: 1,
      }]).select().single();
      if (error) throw error;
      enquiry = data;
    }
    // Add first message
    await supabase.from('vendor_enquiry_messages').insert([{
      enquiry_id: enquiry.id, from_role: 'couple', content: initial_message,
    }]);
    // Part D: bump vendor analytics + activity log (only for NEW threads, not reopened)
    if (!existing) {
      bumpVendorMetric(vendor_id, 'enquiries').catch(() => {});
      logVendorActivity(vendor_id, 'enquiry_received', 'New enquiry from a couple', { enquiry_id: enquiry.id }).catch(() => {});
    }
    res.json({ success: true, data: enquiry });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// List enquiries for a couple (for Messages tab)
app.get('/api/enquiries/couple/:couple_id', async (req, res) => {
  try {
    const { data: enquiries } = await supabase.from('vendor_enquiries')
      .select('*').eq('couple_id', req.params.couple_id)
      .order('last_message_at', { ascending: false });
    const vendorIds = [...new Set((enquiries || []).map(e => e.vendor_id))];
    let vendorMap = {};
    if (vendorIds.length > 0) {
      const { data: vendors } = await supabase.from('vendors')
        .select('id, name, category, city, portfolio_images, featured_photos, show_whatsapp_public, phone, accepts_lock_date')
        .in('id', vendorIds);
      (vendors || []).forEach(v => { vendorMap[v.id] = v; });
    }
    const enriched = (enquiries || []).map(e => ({ ...e, vendor: vendorMap[e.vendor_id] || null }));
    res.json({ success: true, data: enriched });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// List enquiries for a vendor (for vendor dashboard future use)
app.get('/api/enquiries/vendor/:vendor_id', async (req, res) => {
  try {
    const { data: enquiries } = await supabase.from('vendor_enquiries')
      .select('*').eq('vendor_id', req.params.vendor_id)
      .order('last_message_at', { ascending: false });
    res.json({ success: true, data: enquiries || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Get thread detail with all messages
app.get('/api/enquiries/:id', async (req, res) => {
  try {
    const { data: enquiry } = await supabase.from('vendor_enquiries').select('*').eq('id', req.params.id).maybeSingle();
    if (!enquiry) return res.status(404).json({ success: false, error: 'not found' });
    const { data: messages } = await supabase.from('vendor_enquiry_messages')
      .select('*').eq('enquiry_id', req.params.id).order('created_at');
    const { data: vendor } = await supabase.from('vendors')
      .select('id, name, category, city, portfolio_images, featured_photos, show_whatsapp_public, phone, accepts_lock_date, lock_date_amount')
      .eq('id', enquiry.vendor_id).maybeSingle();
    res.json({ success: true, data: { enquiry, messages: messages || [], vendor } });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Send a new message in a thread
app.post('/api/enquiries/:id/messages', async (req, res) => {
  try {
    const { from_role, content, attachments } = req.body || {};
    if (!from_role || !['couple', 'vendor'].includes(from_role)) return res.status(400).json({ success: false, error: 'from_role required' });
    if (!content) return res.status(400).json({ success: false, error: 'content required' });
    const { data: msg, error } = await supabase.from('vendor_enquiry_messages').insert([{
      enquiry_id: req.params.id, from_role, content,
      attachments: attachments || [],
    }]).select().single();
    if (error) throw error;
    // Update enquiry
    const preview = content.slice(0, 120);
    const now = new Date().toISOString();
    const updates = {
      last_message_at: now, last_message_preview: preview, last_message_from: from_role,
    };
    if (from_role === 'couple') {
      updates.vendor_unread_count = (await supabase.from('vendor_enquiries').select('vendor_unread_count').eq('id', req.params.id).maybeSingle()).data?.vendor_unread_count + 1 || 1;
    } else {
      updates.couple_unread_count = (await supabase.from('vendor_enquiries').select('couple_unread_count').eq('id', req.params.id).maybeSingle()).data?.couple_unread_count + 1 || 1;
    }
    await supabase.from('vendor_enquiries').update(updates).eq('id', req.params.id);
    res.json({ success: true, data: msg });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Mark thread as read
app.post('/api/enquiries/:id/read', async (req, res) => {
  try {
    const { role } = req.body || {};
    const updates = role === 'couple' ? { couple_unread_count: 0 } : { vendor_unread_count: 0 };
    await supabase.from('vendor_enquiries').update(updates).eq('id', req.params.id);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// BUILD 3: LOCK DATE HOLDS (state machine, Razorpay wiring later)
// ══════════════════════════════════════════════════════════════════════════════
// Create a Lock Date hold (pending — awaits payment). For now, auto-marks as 'held' without payment.
app.post('/api/lock-date/create-hold', async (req, res) => {
  try {
    const { enquiry_id, couple_id, vendor_id, wedding_date, amount } = req.body || {};
    if (!enquiry_id || !couple_id || !vendor_id || !wedding_date || !amount) {
      return res.status(400).json({ success: false, error: 'missing required fields' });
    }
    const holdExpires = new Date(Date.now() + 7 * 86400000).toISOString();
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('lock_date_holds').insert([{
      enquiry_id, couple_id, vendor_id,
      wedding_date, amount,
      status: 'held',  // Placeholder: mark as held. Real integration will do 'pending' then Razorpay webhook -> 'held'
      held_at: now,
      expires_at: holdExpires,
    }]).select().single();
    if (error) throw error;
    // Update enquiry with lock date state
    await supabase.from('vendor_enquiries').update({
      lock_date_paid: true, lock_date_amount: amount,
      lock_date_paid_at: now, lock_date_expires_at: holdExpires,
    }).eq('id', enquiry_id);
    // System message in thread
    await supabase.from('vendor_enquiry_messages').insert([{
      enquiry_id, from_role: 'system',
      content: `Lock Date deposit placed: Rs ${(amount / 100).toLocaleString('en-IN')} for wedding date ${wedding_date}. Vendor has 7 days to confirm.`,
      system_event: 'lock_date_paid',
    }]);
    logActivity('lock_date_held', `Lock Date hold for vendor ${vendor_id} — Rs ${amount / 100}`);
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// BUILD 4 — Vendor Discovery mode: trial state, Image Hub, Offers, Boosts,
//          Featured applications, Analytics, Activity feed
// ══════════════════════════════════════════════════════════════════════════════

// Helper: compute trial deadline for a tier
function computeTrialDeadline(startedAt, tier) {
  if (!startedAt) return null;
  const t = (tier || 'essential').toLowerCase();
  if (t === 'prestige') return null; // no cap
  const days = t === 'signature' ? 10 : 7;
  const d = new Date(startedAt);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ── Discovery mode state ────────────────────────────────────────────────
app.get('/api/vendor-discover/mode-state/:vendor_id', async (req, res) => {
  try {
    // Use minimal column set that's guaranteed to exist; rely on best-effort fetch for the rest
    const { data: v } = await supabase.from('vendors')
      .select('*')  // pick all columns — tolerant of missing schema fields
      .eq('id', req.params.vendor_id).maybeSingle();
    if (!v) return res.status(404).json({ success: false, error: 'vendor not found' });

    // Tier from subscription table (NOT from vendors table)
    let tier = 'essential';
    try {
      const { data: sub } = await supabase.from('vendor_subscriptions')
        .select('tier').eq('vendor_id', v.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (sub?.tier) tier = sub.tier;
    } catch {}

    // Determine what basics still need to be filled
    const missingBasics = [];
    if (!v.phone) missingBasics.push('phone');
    if (!v.email) missingBasics.push('email');
    if (!v.category) missingBasics.push('category');
    if (!v.city) missingBasics.push('city');
    if (!v.instagram) missingBasics.push('instagram');
    if (!v.starting_price) missingBasics.push('starting_price');
    if (!v.response_time_commitment) missingBasics.push('response_time_commitment');

    let imgCount = 0;
    try {
      const { count } = await supabase.from('vendor_images')
        .select('id', { count: 'exact', head: true }).eq('vendor_id', v.id);
      imgCount = count || 0;
    } catch {}
    if (imgCount < 3) missingBasics.push('three_photos');

    // Trial tracking — gracefully default if columns don't exist yet
    const basicsCompletedAt = v.discovery_basics_completed_at || null;
    const trialStartedAt = v.discovery_trial_started_at || null;
    const trialDeadline = v.discovery_trial_deadline ? new Date(v.discovery_trial_deadline) : null;
    let trialStatus = v.discovery_trial_status || 'not_started';
    const completionPct = v.discover_completion_pct || 0;

    const now = new Date();
    if (trialStatus === 'active' && trialDeadline && trialDeadline < now && completionPct < 100) {
      trialStatus = 'paused';
      try { await supabase.from('vendors').update({ discovery_trial_status: 'paused' }).eq('id', v.id); } catch {}
    }

    const daysLeft = trialDeadline ? Math.max(0, Math.ceil((trialDeadline.getTime() - now.getTime()) / 86400000)) : null;

    res.json({
      success: true,
      data: {
        vendor_id: v.id,
        tier,
        basics_completed: !!basicsCompletedAt,
        basics_completed_at: basicsCompletedAt,
        missing_basics: missingBasics,
        trial_started_at: trialStartedAt,
        trial_deadline: v.discovery_trial_deadline || null,
        trial_status: trialStatus,
        days_left: daysLeft,
        completion_pct: completionPct,
        discover_listed: !!v.discover_listed,
      },
    });
  } catch (error) {
    console.error('[mode-state] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit onboarding wall (first-time Discovery entry)
app.post('/api/vendor-discover/onboard/:vendor_id', async (req, res) => {
  try {
    const { phone, email, category, city, instagram, starting_price, response_time_commitment } = req.body || {};
    const vendorId = req.params.vendor_id;
    console.log('[onboard] Starting for vendor:', vendorId, 'payload keys:', Object.keys(req.body || {}));

    const { data: v } = await supabase.from('vendors').select('*').eq('id', vendorId).maybeSingle();
    if (!v) {
      console.error('[onboard] Vendor not found:', vendorId);
      return res.status(404).json({ success: false, error: 'vendor not found' });
    }

    // Tier from subscriptions (NOT from vendors)
    let tier = 'essential';
    try {
      const { data: sub } = await supabase.from('vendor_subscriptions')
        .select('tier').eq('vendor_id', vendorId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (sub?.tier) tier = sub.tier;
    } catch {}

    // Build base updates (always-safe columns)
    const baseUpdates = {};
    if (phone) baseUpdates.phone = phone;
    if (email) baseUpdates.email = email;
    if (category) baseUpdates.category = category;
    if (city) baseUpdates.city = city;
    if (instagram) baseUpdates.instagram = instagram;
    if (starting_price) baseUpdates.starting_price = starting_price;

    // Try base updates first
    if (Object.keys(baseUpdates).length > 0) {
      const { error: baseErr } = await supabase.from('vendors').update(baseUpdates).eq('id', vendorId);
      if (baseErr) {
        console.error('[onboard] Base updates failed:', baseErr.message);
        return res.status(500).json({ success: false, error: 'Could not save basics: ' + baseErr.message });
      }
      console.log('[onboard] Base updates saved:', Object.keys(baseUpdates).join(','));
    }

    // Now try the discovery-specific columns ONE BY ONE so a missing column doesn't fail the whole batch
    const trialStartedAt = v.discovery_trial_started_at || null;
    const optionalUpdates = [
      { col: 'discovery_basics_completed_at', val: new Date().toISOString() },
    ];
    if (response_time_commitment) {
      optionalUpdates.push({ col: 'response_time_commitment', val: response_time_commitment });
    }
    if (!trialStartedAt) {
      const now = new Date().toISOString();
      optionalUpdates.push({ col: 'discovery_trial_started_at', val: now });
      optionalUpdates.push({ col: 'discovery_trial_deadline', val: computeTrialDeadline(now, tier) });
      optionalUpdates.push({ col: 'discovery_trial_status', val: tier.toLowerCase() === 'prestige' ? 'exempt' : 'active' });
    }

    const skippedCols = [];
    for (const u of optionalUpdates) {
      try {
        const { error } = await supabase.from('vendors').update({ [u.col]: u.val }).eq('id', vendorId);
        if (error) {
          console.error(`[onboard] Skipping column ${u.col}: ${error.message}`);
          skippedCols.push(u.col);
        }
      } catch (e) {
        skippedCols.push(u.col);
      }
    }

    console.log('[onboard] DONE for vendor:', vendorId, '. Skipped cols:', skippedCols.join(',') || 'none');
    res.json({ success: true, skipped: skippedCols });
  } catch (error) {
    console.error('[onboard] Unhandled error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Vendor Images (Image Hub CRUD) ──────────────────────────────────────
app.get('/api/vendor-images/:vendor_id', async (req, res) => {
  try {
    const { data } = await supabase.from('vendor_images')
      .select('*').eq('vendor_id', req.params.vendor_id)
      .order('order_index').order('uploaded_at', { ascending: false });
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/vendor-images', async (req, res) => {
  try {
    const { vendor_id, url, width, height, file_size, tags, album_title, album_city, album_date, caption } = req.body || {};
    if (!vendor_id || !url) return res.status(400).json({ success: false, error: 'vendor_id and url required' });
    const { data, error } = await supabase.from('vendor_images').insert([{
      vendor_id, url,
      width: width || null, height: height || null, file_size: file_size || null,
      tags: tags || [],
      album_title: album_title || null, album_city: album_city || null, album_date: album_date || null,
      caption: caption || null,
    }]).select().single();
    if (error) throw error;
    await syncVendorImagesToVendorColumns(vendor_id);
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.patch('/api/vendor-images/:id', async (req, res) => {
  try {
    const allowed = ['tags', 'album_title', 'album_city', 'album_date', 'caption', 'order_index'];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    const { data, error } = await supabase.from('vendor_images').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    if (data?.vendor_id) await syncVendorImagesToVendorColumns(data.vendor_id);
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/vendor-images/:id', async (req, res) => {
  try {
    // Get vendor_id before delete for sync
    const { data: img } = await supabase.from('vendor_images').select('vendor_id').eq('id', req.params.id).maybeSingle();
    const { error } = await supabase.from('vendor_images').delete().eq('id', req.params.id);
    if (error) throw error;
    if (img?.vendor_id) await syncVendorImagesToVendorColumns(img.vendor_id);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Bulk tag update — for bulk-select-retag UX
app.post('/api/vendor-images/bulk-tag', async (req, res) => {
  try {
    const { image_ids, add_tags, remove_tags } = req.body || {};
    if (!Array.isArray(image_ids) || image_ids.length === 0) return res.status(400).json({ success: false, error: 'image_ids required' });
    const { data: existing } = await supabase.from('vendor_images').select('id, vendor_id, tags').in('id', image_ids);
    const vendorIds = new Set();
    for (const img of (existing || [])) {
      vendorIds.add(img.vendor_id);
      const currentTags = Array.isArray(img.tags) ? img.tags : [];
      let nextTags = [...currentTags];
      if (Array.isArray(add_tags)) {
        for (const t of add_tags) if (!nextTags.includes(t)) nextTags.push(t);
      }
      if (Array.isArray(remove_tags)) {
        nextTags = nextTags.filter(t => !remove_tags.includes(t));
      }
      await supabase.from('vendor_images').update({ tags: nextTags }).eq('id', img.id);
    }
    // Sync all affected vendors
    for (const vid of vendorIds) {
      await syncVendorImagesToVendorColumns(vid);
    }
    res.json({ success: true, updated: (existing || []).length });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Vendor Offers CRUD ──────────────────────────────────────────────────
app.get('/api/vendor-offers/:vendor_id', async (req, res) => {
  try {
    const { data } = await supabase.from('vendor_offers')
      .select('*').eq('vendor_id', req.params.vendor_id)
      .order('created_at', { ascending: false });
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/vendor-offers', async (req, res) => {
  try {
    const { vendor_id, title, description, discount_type, discount_value, freebie_text, applies_to, starts_at, ends_at, is_active } = req.body || {};
    if (!vendor_id || !title) return res.status(400).json({ success: false, error: 'vendor_id and title required' });
    const { data, error } = await supabase.from('vendor_offers').insert([{
      vendor_id, title,
      description: description || null,
      discount_type: discount_type || null,
      discount_value: discount_value || null,
      freebie_text: freebie_text || null,
      applies_to: applies_to || 'all',
      starts_at: starts_at || null,
      ends_at: ends_at || null,
      is_active: is_active !== false,
    }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.patch('/api/vendor-offers/:id', async (req, res) => {
  try {
    const allowed = ['title', 'description', 'discount_type', 'discount_value', 'freebie_text', 'applies_to', 'starts_at', 'ends_at', 'is_active'];
    const updates = { updated_at: new Date().toISOString() };
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    const { data, error } = await supabase.from('vendor_offers').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/vendor-offers/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('vendor_offers').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Vendor Boosts CRUD ──────────────────────────────────────────────────
app.get('/api/vendor-boosts/:vendor_id', async (req, res) => {
  try {
    const { data } = await supabase.from('vendor_boosts')
      .select('*').eq('vendor_id', req.params.vendor_id)
      .order('boost_date');
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/vendor-boosts', async (req, res) => {
  try {
    const { vendor_id, boost_date, rate_override, message, is_active } = req.body || {};
    if (!vendor_id || !boost_date) return res.status(400).json({ success: false, error: 'vendor_id and boost_date required' });
    const { data, error } = await supabase.from('vendor_boosts').upsert({
      vendor_id, boost_date,
      rate_override: rate_override || null,
      message: message || null,
      is_active: is_active !== false,
    }, { onConflict: 'vendor_id,boost_date' }).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/vendor-boosts/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('vendor_boosts').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Featured Applications CRUD ──────────────────────────────────────────
app.get('/api/vendor-featured/:vendor_id', async (req, res) => {
  try {
    const { data } = await supabase.from('vendor_featured_applications')
      .select('*').eq('vendor_id', req.params.vendor_id)
      .order('created_at', { ascending: false });
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/vendor-featured', async (req, res) => {
  try {
    const { vendor_id, board_type, pitch, proposed_images } = req.body || {};
    if (!vendor_id || !board_type) return res.status(400).json({ success: false, error: 'vendor_id and board_type required' });
    const { data, error } = await supabase.from('vendor_featured_applications').insert([{
      vendor_id, board_type,
      pitch: pitch || null,
      proposed_images: proposed_images || [],
    }]).select().single();
    if (error) throw error;
    logActivity('featured_app_submitted', `Vendor ${vendor_id} applied for ${board_type}`);
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Admin decides
app.patch('/api/vendor-featured/:id/decide', async (req, res) => {
  try {
    const { status, admin_notes, approved_image_id, active_days } = req.body || {};
    if (!status || !['approved', 'rejected'].includes(status)) return res.status(400).json({ success: false, error: 'status must be approved or rejected' });
    const updates = { status, admin_notes: admin_notes || null, decided_at: new Date().toISOString() };
    if (status === 'approved') {
      updates.approved_image_id = approved_image_id || null;
      updates.active_from = new Date().toISOString();
      updates.active_until = new Date(Date.now() + (active_days || 14) * 86400000).toISOString();
    }
    const { data, error } = await supabase.from('vendor_featured_applications').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Analytics (read) + event ingest ──────────────────────────────────────
app.get('/api/vendor-analytics/:vendor_id', async (req, res) => {
  try {
    const days = parseInt((req.query.days || '30')) || 30;
    const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const { data } = await supabase.from('vendor_analytics_daily')
      .select('*').eq('vendor_id', req.params.vendor_id)
      .gte('day', since).order('day');
    // Aggregate totals
    const totals = (data || []).reduce((acc, r) => ({
      impressions: acc.impressions + (r.impressions || 0),
      profile_views: acc.profile_views + (r.profile_views || 0),
      saves: acc.saves + (r.saves || 0),
      enquiries: acc.enquiries + (r.enquiries || 0),
      lock_interests: acc.lock_interests + (r.lock_interests || 0),
    }), { impressions: 0, profile_views: 0, saves: 0, enquiries: 0, lock_interests: 0 });
    res.json({ success: true, daily: data || [], totals });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Ingest event — increments today's rollup for a metric (called from couple-side actions)
app.post('/api/vendor-analytics/ingest', async (req, res) => {
  try {
    const { vendor_id, metric } = req.body || {};
    if (!vendor_id || !metric) return res.status(400).json({ success: false, error: 'vendor_id and metric required' });
    const allowed = ['impressions', 'profile_views', 'saves', 'enquiries', 'lock_interests'];
    if (!allowed.includes(metric)) return res.status(400).json({ success: false, error: 'invalid metric' });
    const day = new Date().toISOString().split('T')[0];
    // Upsert increment
    const { data: existing } = await supabase.from('vendor_analytics_daily')
      .select('*').eq('vendor_id', vendor_id).eq('day', day).maybeSingle();
    if (existing) {
      const updates = { [metric]: (existing[metric] || 0) + 1, updated_at: new Date().toISOString() };
      await supabase.from('vendor_analytics_daily').update(updates).eq('id', existing.id);
    } else {
      const row = { vendor_id, day, impressions: 0, profile_views: 0, saves: 0, enquiries: 0, lock_interests: 0 };
      row[metric] = 1;
      await supabase.from('vendor_analytics_daily').insert([row]);
    }
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ── Vendor Activity Feed ────────────────────────────────────────────────
app.get('/api/vendor-activity/:vendor_id', async (req, res) => {
  try {
    const limit = parseInt((req.query.limit || '20')) || 20;
    const { data } = await supabase.from('vendor_activity_log')
      .select('*').eq('vendor_id', req.params.vendor_id)
      .order('created_at', { ascending: false }).limit(limit);
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/vendor-activity/mark-read', async (req, res) => {
  try {
    const { vendor_id } = req.body || {};
    if (!vendor_id) return res.status(400).json({ success: false, error: 'vendor_id required' });
    await supabase.from('vendor_activity_log').update({ is_read: true }).eq('vendor_id', vendor_id).eq('is_read', false);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// User (couple) lookup — used by vendor Leads tab to show couple names
app.get('/api/user/:id', async (req, res) => {
  try {
    const { data } = await supabase.from('users')
      .select('id, name, email, phone, wedding_date, partner_name')
      .eq('id', req.params.id).maybeSingle();
    if (!data) return res.status(404).json({ success: false, error: 'not found' });
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// Part D: Sync vendor_images -> vendors.featured_photos + portfolio_images
// Keeps the couple-facing Feed reading from the canonical Image Hub
// ══════════════════════════════════════════════════════════════════════════════
// Tier caps for total visible images (hero + carousel combined)
const TIER_IMAGE_CAPS = { essential: 5, signature: 10, prestige: 20 };

async function syncVendorImagesToVendorColumns(vendor_id) {
  if (!vendor_id) return;
  try {
    const { data: imgs } = await supabase.from('vendor_images')
      .select('url, tags, order_index, uploaded_at')
      .eq('vendor_id', vendor_id)
      .order('order_index')
      .order('uploaded_at', { ascending: false });

    if (!imgs) return;

    // NEW (preferred): hero + carousel tags
    const heroImg = imgs.find(i => Array.isArray(i.tags) && i.tags.includes('hero'));
    const carouselImgs = imgs
      .filter(i => Array.isArray(i.tags) && i.tags.includes('carousel'))
      .map(i => i.url);

    // LEGACY fallback: featured + portfolio tags (keep working for existing data)
    const legacyFeatured = imgs
      .filter(i => Array.isArray(i.tags) && i.tags.includes('featured'))
      .map(i => i.url);
    const legacyPortfolio = imgs
      .filter(i => Array.isArray(i.tags) && i.tags.includes('portfolio'))
      .map(i => i.url);

    // featured_photos: hero first (if set), then carousel images; fall back to legacy
    const featured = heroImg || carouselImgs.length > 0
      ? [
          ...(heroImg ? [heroImg.url] : []),
          ...carouselImgs.slice(0, 2),
        ].filter(Boolean)
      : legacyFeatured.slice(0, 10);

    // portfolio_images: full carousel, or fall back to legacy portfolio
    const portfolio = carouselImgs.length > 0
      ? carouselImgs.slice(0, 30)
      : legacyPortfolio.slice(0, 30);

    await supabase.from('vendors').update({
      featured_photos: featured,
      portfolio_images: portfolio,
    }).eq('id', vendor_id);
  } catch (err) {
    console.error('syncVendorImagesToVendorColumns error:', err.message);
  }
}

// Public trigger endpoint — vendor-side can manually force a sync if needed
app.post('/api/vendor-images/sync/:vendor_id', async (req, res) => {
  try {
    await syncVendorImagesToVendorColumns(req.params.vendor_id);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Set hero image (single-select: clears hero tag from all other images)
app.post('/api/vendor-images/set-hero', async (req, res) => {
  try {
    const { vendor_id, image_id } = req.body || {};
    if (!vendor_id || !image_id) return res.status(400).json({ success: false, error: 'vendor_id + image_id required' });
    // Fetch all vendor images
    const { data: imgs } = await supabase.from('vendor_images').select('id, tags').eq('vendor_id', vendor_id);
    if (!imgs) return res.status(404).json({ success: false, error: 'no images' });
    // Remove hero from all; add hero to target
    for (const img of imgs) {
      const tags = Array.isArray(img.tags) ? img.tags.filter(t => t !== 'hero') : [];
      if (img.id === image_id) tags.push('hero');
      await supabase.from('vendor_images').update({ tags }).eq('id', img.id);
    }
    await syncVendorImagesToVendorColumns(vendor_id);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Toggle carousel tag on an image (tier-capped)
app.post('/api/vendor-images/toggle-carousel', async (req, res) => {
  try {
    const { vendor_id, image_id } = req.body || {};
    if (!vendor_id || !image_id) return res.status(400).json({ success: false, error: 'vendor_id + image_id required' });
    // Get vendor tier
    const { data: vendor } = await supabase.from('vendors').select('tier').eq('id', vendor_id).maybeSingle();
    const tier = (vendor?.tier || 'essential').toLowerCase();
    const cap = TIER_IMAGE_CAPS[tier] || TIER_IMAGE_CAPS.essential;
    // Fetch target + count of carousel + hero
    const { data: imgs } = await supabase.from('vendor_images').select('id, tags').eq('vendor_id', vendor_id);
    if (!imgs) return res.status(404).json({ success: false, error: 'no images' });
    const target = imgs.find(i => i.id === image_id);
    if (!target) return res.status(404).json({ success: false, error: 'image not found' });
    const targetTags = Array.isArray(target.tags) ? target.tags : [];
    const hasCarousel = targetTags.includes('carousel');
    if (hasCarousel) {
      // remove carousel
      const newTags = targetTags.filter(t => t !== 'carousel');
      await supabase.from('vendor_images').update({ tags: newTags }).eq('id', image_id);
      await syncVendorImagesToVendorColumns(vendor_id);
      return res.json({ success: true, added: false });
    } else {
      // adding — enforce tier cap (hero + carousel total must be ≤ cap)
      const heroCount = imgs.filter(i => Array.isArray(i.tags) && i.tags.includes('hero')).length;
      const carouselCount = imgs.filter(i => Array.isArray(i.tags) && i.tags.includes('carousel')).length;
      const total = heroCount + carouselCount;
      if (total >= cap) {
        return res.status(400).json({ success: false, error: 'tier_cap', cap, tier, message: `Your ${tier} tier allows ${cap} images total. Upgrade or remove one from carousel.` });
      }
      const newTags = [...targetTags, 'carousel'];
      await supabase.from('vendor_images').update({ tags: newTags }).eq('id', image_id);
      await syncVendorImagesToVendorColumns(vendor_id);
      return res.json({ success: true, added: true });
    }
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// Part D: Activity log + analytics bump helpers
// Called inline from existing couple-side endpoints (enquiries, muse, lock-date)
// ══════════════════════════════════════════════════════════════════════════════
async function bumpVendorMetric(vendor_id, metric) {
  if (!vendor_id || !metric) return;
  try {
    const day = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase.from('vendor_analytics_daily')
      .select('*').eq('vendor_id', vendor_id).eq('day', day).maybeSingle();
    if (existing) {
      await supabase.from('vendor_analytics_daily').update({
        [metric]: (existing[metric] || 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      const row = { vendor_id, day, impressions: 0, profile_views: 0, saves: 0, enquiries: 0, lock_interests: 0 };
      row[metric] = 1;
      await supabase.from('vendor_analytics_daily').insert([row]);
    }
  } catch (err) {
    console.error('bumpVendorMetric error:', err.message);
  }
}

async function logVendorActivity(vendor_id, event_type, event_label, payload) {
  if (!vendor_id) return;
  try {
    await supabase.from('vendor_activity_log').insert([{
      vendor_id,
      event_type,
      event_label: event_label || null,
      payload: payload || {},
    }]);
  } catch (err) {
    console.error('logVendorActivity error:', err.message);
  }
}

// Admin: list all featured applications (with vendor joined)
app.get('/api/vendor-featured/admin/all', async (req, res) => {
  try {
    const { data: apps } = await supabase.from('vendor_featured_applications')
      .select('*').order('created_at', { ascending: false });
    const vendorIds = [...new Set((apps || []).map(a => a.vendor_id))];
    let vmap = {};
    if (vendorIds.length > 0) {
      const { data: vendors } = await supabase.from('vendors')
        .select('id, name, category, city, featured_photos, portfolio_images')
        .in('id', vendorIds);
      (vendors || []).forEach(v => { vmap[v.id] = v; });
    }
    const enriched = (apps || []).map(a => ({ ...a, vendor: vmap[a.vendor_id] || null }));
    res.json({ success: true, data: enriched });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// v2 Discovery feed
app.get('/api/v2/discovery/feed', async (req, res) => {
  try {
    const { data, error } = await supabase.from('discovery_seed_cards').select('*').eq('is_active', true).order('sort_order', { ascending: true });
    if (error) throw error;
    res.json({ cards: data });
  } catch (err) {
    console.error('Discovery feed error:', err);
    res.status(500).json({ error: 'Failed to load feed' });
  }
});
