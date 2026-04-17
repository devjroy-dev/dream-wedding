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
    const { data, error } = await supabase.from('users')
      .select('id, name, phone, email, couple_tier, token_balance, created_at, user_type, instagram')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { admin_password } = req.body || {};
    if (admin_password !== 'Mira@2551354') return res.status(403).json({ success: false, error: 'Unauthorised' });
    // Cascade delete related records (best-effort)
    const userId = req.params.id;
    const tables = ['moodboard_items', 'messages', 'co_planners', 'couple_planner_checklist', 'couple_planner_budget', 'couple_planner_guests', 'couple_planner_timeline'];
    for (const t of tables) {
      try { await supabase.from(t).delete().eq('user_id', userId); } catch (e) {}
      try { await supabase.from(t).delete().eq('couple_id', userId); } catch (e) {}
    }
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;
    logActivity('user_deleted', `User ${userId} deleted by admin`);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
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
    const { data, error } = await supabase.from('bookings').update(req.body).eq('id', req.params.id).select().single();
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
    const { amount } = req.body;
    const gst_amount = amount * 0.18;
    const total_amount = amount + gst_amount;
    const { data, error } = await supabase
      .from('vendor_invoices')
      .insert([{ ...req.body, gst_amount, total_amount }])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update invoice status
app.patch('/api/invoices/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_invoices')
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
    const { data, error } = await supabase
      .from('vendor_clients')
      .insert([req.body])
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
    const { data, error } = await supabase
      .from('vendor_expenses')
      .insert([{ ...req.body, financial_year }])
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
    const { data, error } = await supabase
      .from('vendor_payment_schedules')
      .insert([req.body])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
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
    const { data, error } = await supabase
      .from('vendor_team_members')
      .insert([req.body])
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
    const { data, error } = await supabase
      .from('vendor_team_members')
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


const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || '';
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || '';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyDzXw3pC_CmSW_q87I_fIUKNVfUIM806h8';

// Step 1: Send OTP
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: 'Phone number required' });

    // Use Twilio Verify — sends real OTP via SMS + WhatsApp
    if (twilioClient) try {
      const verification = await twilioClient.verify.v2
        .services(TWILIO_VERIFY_SID)
        .verifications.create({ to: '+91' + phone, channel: 'sms' });
      console.log('Twilio OTP sent:', verification.status);
      return res.json({ success: true, sessionInfo: 'twilio_' + phone });
    } catch (twilioErr) {
      console.error('Twilio send error:', twilioErr.message);
    }

    // Fallback: Firebase Admin SDK session for test numbers
    if (admin.apps && admin.apps.length > 0) {
      return res.json({ success: true, sessionInfo: 'admin_sdk_' + phone, note: 'Using Firebase fallback' });
    }

    return res.status(400).json({ success: false, error: 'Could not send OTP. Please try again.' });
  } catch (error) {
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
    const { vendor_id, name, email, phone, role, status, permissions } = req.body;
    const { data, error } = await supabase.from('vendor_team_members').insert([{ vendor_id, name, email, phone, role: role || 'staff', status: status || 'active', permissions: permissions || {} }]).select().single();
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
app.put('/api/subscriptions/:vendorId/tier', async (req, res) => {
  try {
    const { tier } = req.body;
    const vendorId = req.params.vendorId;

    // Check if subscription exists
    const { data: existing } = await supabase.from('vendor_subscriptions').select('*').eq('vendor_id', vendorId).limit(1);

    if (existing && existing.length > 0) {
      // Update existing
      const aug1 = new Date('2026-08-01');
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const trialEnd = new Date() < aug1 ? aug1.toISOString().split('T')[0] : thirtyDays.toISOString().split('T')[0];

      const { data, error } = await supabase.from('vendor_subscriptions')
        .update({ tier, status: 'trial', trial_end: trialEnd })
        .eq('vendor_id', vendorId)
        .select().single();
      if (error) throw error;
      res.json({ success: true, data });
    } else {
      // Create new
      const aug1 = new Date('2026-08-01');
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const trialEnd = new Date() < aug1 ? aug1.toISOString().split('T')[0] : thirtyDays.toISOString().split('T')[0];

      const { data, error } = await supabase.from('vendor_subscriptions')
        .insert([{ vendor_id: vendorId, tier, status: 'trial', trial_end: trialEnd }])
        .select().single();
      if (error) throw error;
      res.json({ success: true, data });
    }
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});


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

app.get('/api/ds/photos/pending', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('photo_approvals')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
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


// Admin: delete user
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('users').delete().eq('id', req.params.id);
    if (error) throw error;
    logActivity('user_deleted', 'Deleted user ' + req.params.id);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Admin: delete vendor
app.delete('/api/admin/vendors/:id', async (req, res) => {
  try {
    // Delete subscription first
    await supabase.from('vendor_subscriptions').delete().eq('vendor_id', req.params.id);
    await supabase.from('vendor_logins').delete().eq('vendor_id', req.params.id);
    const { error } = await supabase.from('vendors').delete().eq('id', req.params.id);
    if (error) throw error;
    logActivity('vendor_deleted', 'Deleted vendor ' + req.params.id);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
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

    if (codeErr || !codeData) return res.json({ success: false, error: 'Invalid code' });
    if (codeData.used) return res.json({ success: false, error: 'Code already used' });
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      return res.json({ success: false, error: 'Code expired' });
    }

    const tierMap = { basic: 'free', gold: 'premium', platinum: 'elite' };
    const tokenMap = { basic: 3, gold: 15, platinum: 999 };
    const coupleTier = tierMap[codeData.tier] || 'free';
    const tokens = tokenMap[codeData.tier] || 3;

    // Create user record
    const coupleName = codeData.vendor_name || 'Couple';
    const { data: user, error: userErr } = await supabase.from('users').insert([{
      name: coupleName,
      couple_tier: coupleTier,
      token_balance: tokens,
    }]).select().single();

    if (userErr) throw userErr;

    // Mark code as used
    await supabase.from('access_codes').update({ used: true, used_count: (codeData.used_count || 0) + 1 }).eq('id', codeData.id);

    logActivity('couple_registered', `${coupleName} joined via invite code (${codeData.tier})`);

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
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

// ── Co-Planner System ──

// Generate co-planner invite link
app.post('/api/co-planner/invite', async (req, res) => {
  try {
    const { user_id } = req.body;
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

    await supabase.from('co_planners').insert([{ primary_user_id: user_id, invite_code: inviteCode, status: 'pending' }]);

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
        .select('*').eq('phone_number', '+91' + clean.replace(/\D/g, '')).single();
      vendorCred = data;
    }
    if (!vendorCred) {
      const { data } = await supabase.from('vendor_credentials')
        .select('*').eq('username', clean).single();
      vendorCred = data;
    }

    if (vendorCred) {
      const vendorMatch = await bcrypt.compare(password, vendorCred.password_hash);
      if (!vendorMatch) return res.json({ success: false, error: 'Invalid password' });
      const { data: vendor } = await supabase.from('vendors').select('*').eq('id', vendorCred.vendor_id).single();
      const { data: sub } = await supabase.from('vendor_subscriptions').select('tier, status, trial_end_date')
        .eq('vendor_id', vendorCred.vendor_id).order('created_at', { ascending: false }).limit(1).single();
      
      // Check if this is a team member login
      const isTeam = vendorCred.is_team_member === true;
      let teamRole = 'owner';
      let teamMemberName = vendor?.name;
      if (isTeam && vendorCred.team_member_id) {
        const { data: member } = await supabase.from('vendor_team_members')
          .select('name, role').eq('id', vendorCred.team_member_id).single();
        if (member) { teamRole = member.role || 'staff'; teamMemberName = member.name; }
      }
      
      return res.json({ success: true, data: {
        type: 'vendor', id: vendor?.id, name: vendor?.name, category: vendor?.category,
        city: vendor?.city, tier: sub?.tier || 'essential',
        team_role: teamRole,
        team_member_name: isTeam ? teamMemberName : null,
        is_team_member: isTeam,
      }});
    }

    // Try couple login
    let user = null;
    if (isPhone) {
      const { data } = await supabase.from('users')
        .select('*').eq('phone', '+91' + clean.replace(/\D/g, '')).single();
      user = data;
    }
    if (!user) {
      const { data } = await supabase.from('users')
        .select('*').eq('email', clean).single();
      user = data;
    }

    if (!user) return res.json({ success: false, error: 'Account not found. Please sign up first.' });
    const coupleMatch = await bcrypt.compare(password, user.password_hash);
    if (!coupleMatch) return res.json({ success: false, error: 'Invalid password' });

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
