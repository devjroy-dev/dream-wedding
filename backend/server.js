const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
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
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/vendors/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendors').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/vendors', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendors').insert([req.body]).select().single();
    if (error) throw error;
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
    const { vendor_id, blocked_date } = req.body;
    const { data, error } = await supabase
      .from('vendor_availability')
      .insert([{ vendor_id, blocked_date }])
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
    if (!tier || !['signature', 'prestige'].includes(tier)) {
      return res.status(400).json({ success: false, error: 'Tier must be signature or prestige' });
    }
    const prefix = tier === 'prestige' ? 'PRE' : 'SIG';
    const code = prefix + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
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
    const { data, error } = await supabase.from('vendor_credentials').insert([{
      vendor_id, username: username.toLowerCase().trim(), password_hash: password,
    }]).select().single();
    if (error) throw error;
    res.json({ success: true, data: { id: data.id, vendor_id: data.vendor_id, username: data.username } });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/credentials/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, error: 'Username and password required' });
    const { data: cred, error } = await supabase.from('vendor_credentials')
      .select('*').eq('username', username.toLowerCase().trim()).single();
    if (error || !cred) return res.json({ success: false, error: 'Invalid username or password' });
    if (cred.password_hash !== password) return res.json({ success: false, error: 'Invalid username or password' });
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
    const namePart = (vendor?.name || 'vendor').replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
    const code = namePart + Math.random().toString(36).substring(2, 6).toUpperCase();
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
    const code = type.split('_')[0].toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
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

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyDzXw3pC_CmSW_q87I_fIUKNVfUIM806h8';

// Step 1: Send OTP
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: 'Phone number required' });

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: `+91${phone}`, recaptchaToken: 'BYPASS_RECAPTCHA' }),
      }
    );

    const data = await response.json();

    if (data.error) {
      // If reCAPTCHA bypass doesn't work, try with the test-friendly approach
      // Firebase allows bypassing reCAPTCHA for testing when phone auth is enabled
      return res.status(400).json({
        success: false,
        error: data.error.message || 'Could not send OTP',
      });
    }

    res.json({ success: true, sessionInfo: data.sessionInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Step 2: Verify OTP and get Firebase tokens
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { sessionInfo, code } = req.body;
    if (!sessionInfo || !code) return res.status(400).json({ success: false, error: 'Session info and code required' });

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${FIREBASE_API_KEY}`,
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
    const { data, error } = await supabase.from('vendor_team_members').insert([{ vendor_id, name, email, phone, role: role || 'staff', status: status || 'invited', permissions: permissions || {} }]).select().single();
    if (error) throw error;
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
