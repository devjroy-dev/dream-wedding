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
    const { category, city } = req.query;
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
        escrow_status: 'refunded_to_couple',
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
        escrow_status: 'released_to_vendor',
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

    res.json({ success: true, data, message: 'Booking confirmed. Escrow released to vendor.' });
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
        escrow_status: 'refunded_to_couple',
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
        escrow_status: 'refunded_to_couple',
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
    const { data, error } = await supabase.from('messages').insert([req.body]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
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

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`The Dream Wedding API running on port ${PORT} 🎉`);
});