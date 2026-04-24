#!/bin/bash
cat >> backend/server.js << 'ENDOFPATCH'

// S38 — Maker Money + Studio
app.get('/api/v2/vendor/gst-summary/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const fy = req.query.fy || (() => { const now = new Date(); const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; return `${y}-${y+1}`; })();
    const fyYear = parseInt(fy.split('-')[0]);
    const { data: invoices } = await supabase.from('vendor_invoices').select('id, client_name, amount, gst_amount, gst_enabled, tds_amount, tds_rate, tds_deducted_by_client, issue_date, status').eq('vendor_id', vendorId).gte('issue_date', `${fyYear}-04-01`).lte('issue_date', `${fyYear+1}-03-31`).order('issue_date', { ascending: true });
    const rows = invoices || [];
    const totalInvoiced = rows.reduce((s, i) => s + (i.amount || 0), 0);
    const totalGST = rows.filter(i => i.gst_enabled).reduce((s, i) => s + (i.gst_amount || 0), 0);
    const totalTDS = rows.reduce((s, i) => s + (i.tds_amount || 0), 0);
    const quarters = [{ label: 'Apr-Jun', start: `${fyYear}-04-01`, end: `${fyYear}-06-30` },{ label: 'Jul-Sep', start: `${fyYear}-07-01`, end: `${fyYear}-09-30` },{ label: 'Oct-Dec', start: `${fyYear}-10-01`, end: `${fyYear}-12-31` },{ label: 'Jan-Mar', start: `${fyYear+1}-01-01`, end: `${fyYear+1}-03-31` }];
    const quarterly = quarters.map(q => { const qRows = rows.filter(i => i.issue_date >= q.start && i.issue_date <= q.end); return { label: q.label, invoiced: qRows.reduce((s,i)=>s+(i.amount||0),0), gst: qRows.filter(i=>i.gst_enabled).reduce((s,i)=>s+(i.gst_amount||0),0) }; });
    const clientMap = {};
    rows.forEach(i => { const k = i.client_name || 'Unknown'; if (!clientMap[k]) clientMap[k] = { client_name: k, total_invoiced: 0, tds_rate: i.tds_rate || 10, tds_amount: 0, tds_deducted_by_client: false }; clientMap[k].total_invoiced += i.amount || 0; clientMap[k].tds_amount += i.tds_amount || 0; if (i.tds_deducted_by_client) clientMap[k].tds_deducted_by_client = true; });
    res.json({ success: true, data: { fy, total_invoiced: totalInvoiced, total_gst: totalGST, total_tds: totalTDS, quarterly, tds_ledger: Object.values(clientMap), invoices: rows } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.get('/api/v2/vendor/gst-export/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const fy = req.query.fy || (() => { const now = new Date(); const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; return `${y}-${y+1}`; })();
    const fyYear = parseInt(fy.split('-')[0]);
    const { data: invoices } = await supabase.from('vendor_invoices').select('invoice_number, client_name, issue_date, amount, gst_enabled, gst_amount, tds_rate, tds_amount, tds_deducted_by_client, status').eq('vendor_id', vendorId).gte('issue_date', `${fyYear}-04-01`).lte('issue_date', `${fyYear+1}-03-31`).order('issue_date', { ascending: true });
    const headers = ['Invoice Number','Client Name','Invoice Date','Amount','GST Rate (%)','GST Amount','TDS Rate (%)','TDS Amount','TDS Deducted By Client','Net Receivable','Status'];
    const rows = (invoices||[]).map(i => [i.invoice_number||'',i.client_name||'',i.issue_date||'',i.amount||0,i.gst_enabled?18:0,i.gst_amount||0,i.tds_rate||0,i.tds_amount||0,i.tds_deducted_by_client?'Yes':'No',((i.amount||0)+(i.gst_amount||0)-(i.tds_amount||0)),i.status||'']);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type','text/csv');
    res.setHeader('Content-Disposition',`attachment; filename="tax-export-${fy}.csv"`);
    res.send(csv);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.get('/api/v2/vendor/payment-shield/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendor_payment_shield').select('*').eq('vendor_id', req.params.vendorId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/api/v2/vendor/payment-shield', async (req, res) => {
  try {
    const { vendor_id, client_id, client_name, amount, wedding_date } = req.body || {};
    if (!vendor_id || !client_name || !amount) return res.status(400).json({ success: false, error: 'required fields missing' });
    const release_date = wedding_date ? new Date(new Date(wedding_date).getTime() + 24*60*60*1000).toISOString().split('T')[0] : null;
    const { data, error } = await supabase.from('vendor_payment_shield').insert([{ vendor_id, client_id: client_id||null, client_name, amount, wedding_date: wedding_date||null, release_date, status: 'holding' }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/api/v2/vendor/broadcast-whatsapp', async (req, res) => {
  try {
    const { vendor_id, message, segment } = req.body || {};
    if (!vendor_id || !message) return res.status(400).json({ success: false, error: 'vendor_id and message required' });
    let query = supabase.from('vendor_clients').select('id, name, phone').eq('vendor_id', vendor_id);
    const today = new Date().toISOString().split('T')[0];
    const in90 = new Date(Date.now()+90*86400000).toISOString().split('T')[0];
    if (segment === 'upcoming') query = query.gte('event_date', today).lte('event_date', in90);
    else if (segment === 'post_wedding') query = query.lt('event_date', today);
    const { data: clients } = await query;
    if (!clients || clients.length === 0) return res.json({ success: true, sent: 0, message: 'No clients in segment' });
    let sent = 0;
    const fullMessage = message + '\n\nReply STOP to unsubscribe.';
    for (const client of clients) {
      if (!client.phone) continue;
      await new Promise(r => setTimeout(r, 500));
      const ok = await sendWhatsApp('+91' + normalizePhone(client.phone), fullMessage);
      if (ok) sent++;
    }
    await supabase.from('vendor_broadcasts').insert([{ vendor_id, message, template: segment || 'all', recipient_count: clients.length, sent_count: sent }]);
    res.json({ success: true, sent, total: clients.length });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/api/v2/vendor/contracts/generate', async (req, res) => {
  try {
    const { vendor_id, client_name, event_date, amount, template_type, custom_terms } = req.body || {};
    if (!vendor_id || !client_name) return res.status(400).json({ success: false, error: 'vendor_id and client_name required' });
    const { data: vendor } = await supabase.from('vendors').select('name, city, phone').eq('id', vendor_id).maybeSingle();
    const templates = { photography: 'Photography & Videography Agreement', mua: 'Makeup Artist Services Agreement', event_management: 'Event Management Agreement', general: 'General Services Agreement' };
    const templateTitle = templates[template_type] || templates.general;
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : '___________';
    const fmtAmt = (n) => n ? 'Rs.' + n.toLocaleString('en-IN') : '___________';
    const contractText = templateTitle + '\n\nSERVICE PROVIDER: ' + (vendor?.name||'Service Provider') + '\nLocation: ' + (vendor?.city||'') + '\n\nCLIENT: ' + client_name + '\nEvent Date: ' + fmtDate(event_date) + '\nTotal Fee: ' + fmtAmt(amount) + '\n\nTERMS\n1. Service Provider delivers services as agreed.\n2. Client pays as per invoice schedule.\n3. Cancellation within 30 days: 50% forfeit.\n4. Cancellation within 7 days: 100% forfeit.\n5. Service Provider cancellation: full refund.\n\n' + (custom_terms ? 'ADDITIONAL TERMS\n' + custom_terms + '\n\n' : '') + 'SIGNATURES\n\nService Provider: _______________________  Date: ___________\n\nClient: _______________________  Date: ___________\n\nGenerated by The Dream Wedding';
    const { data: contract, error } = await supabase.from('vendor_contracts').insert([{ vendor_id, client_name, template_type: template_type || 'general', event_date: event_date || null, amount: amount || null, terms_json: { custom_terms: custom_terms || '' }, status: 'draft', contract_text: contractText }]).select().single();
    if (error) throw error;
    res.json({ success: true, data: { ...contract, contract_text: contractText } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// S39 — Couture Vertical
app.get('/api/v2/couture/designers', async (req, res) => {
  try {
    const { data: designers, error } = await supabase.from('vendors').select('id, name, category, city, about, tagline, starting_price, featured_photos, portfolio_images, rating, review_count, couture_appointment_fee, vibe_tags').eq('luxury_category', 'couture').eq('couture_approved', true).order('rating', { ascending: false });
    if (error) throw error;
    const enriched = await Promise.all((designers || []).map(async (d) => {
      const { data: products } = await supabase.from('couture_products').select('id, title, category, price_from, images, is_featured, available').eq('vendor_id', d.id).eq('available', true).order('is_featured', { ascending: false }).limit(4);
      return { ...d, products: products || [], appointment_fee: d.couture_appointment_fee || 3500 };
    }));
    res.json({ success: true, data: enriched });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.get('/api/v2/couture/products/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('couture_products').select('*').eq('vendor_id', req.params.vendorId).eq('available', true).order('is_featured', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/api/v2/couture/appointments', async (req, res) => {
  try {
    const { vendor_id, couple_id, product_id, appointment_date, appointment_time, notes } = req.body || {};
    if (!vendor_id || !couple_id) return res.status(400).json({ success: false, error: 'vendor_id and couple_id required' });
    const { data: vendor } = await supabase.from('vendors').select('name, couture_appointment_fee').eq('id', vendor_id).maybeSingle();
    const fee = vendor?.couture_appointment_fee || 3500;
    const { data: appt, error } = await supabase.from('couture_appointments').insert([{ vendor_id, couple_id, product_id: product_id || null, appointment_date: appointment_date || null, appointment_time: appointment_time || null, fee, platform_fee: 500, status: 'pending_payment', notes: notes || null, razorpay_payment_link: 'https://rzp.io/l/tdw-couture-' + Date.now() }]).select().single();
    if (error) throw error;
    res.json({ success: true, data: appt, fee, platform_fee: 500 });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// S40 — Collab Hub
app.get('/api/v2/collab/posts', async (req, res) => {
  try {
    const { vendor_id, category, city, post_type } = req.query;
    let query = supabase.from('collab_posts').select('id, vendor_id, title, description, post_type, category, city, budget, date_needed, status, created_at').eq('status', 'open').order('created_at', { ascending: false });
    if (category) query = query.eq('category', category);
    if (city) query = query.ilike('city', '%' + city + '%');
    if (post_type) query = query.eq('post_type', post_type);
    const { data: posts, error } = await query.limit(50);
    if (error) throw error;
    const enriched = await Promise.all((posts || []).map(async (p) => {
      const { data: v } = await supabase.from('vendors').select('name, category, city').eq('id', p.vendor_id).maybeSingle();
      return { ...p, poster_name: v?.name || 'A Maker', poster_category: v?.category || '' };
    }));
    const filtered = vendor_id ? enriched.filter(p => p.vendor_id !== vendor_id) : enriched;
    res.json({ success: true, data: filtered });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.get('/api/v2/collab/my-posts/:vendorId', async (req, res) => {
  try {
    const { data: posts, error } = await supabase.from('collab_posts').select('*').eq('vendor_id', req.params.vendorId).order('created_at', { ascending: false });
    if (error) throw error;
    const enriched = await Promise.all((posts || []).map(async (p) => {
      const { count } = await supabase.from('collab_applications').select('*', { count: 'exact', head: true }).eq('post_id', p.id);
      return { ...p, application_count: count || 0 };
    }));
    res.json({ success: true, data: enriched });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/api/v2/collab/posts', async (req, res) => {
  try {
    const { vendor_id, title, description, post_type, category, city, budget, date_needed } = req.body || {};
    if (!vendor_id || !title || !post_type) return res.status(400).json({ success: false, error: 'vendor_id, title, post_type required' });
    const { data, error } = await supabase.from('collab_posts').insert([{ vendor_id, title, description: description || null, post_type, category: category || null, city: city || null, budget: budget ? Number(budget) : null, date_needed: date_needed || null, status: 'open' }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.patch('/api/v2/collab/posts/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('collab_posts').update({ status: req.body.status }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.get('/api/v2/collab/applications/:postId', async (req, res) => {
  try {
    const { data: apps, error } = await supabase.from('collab_applications').select('*').eq('post_id', req.params.postId).order('created_at', { ascending: false });
    if (error) throw error;
    const enriched = await Promise.all((apps || []).map(async (a) => {
      const { data: v } = await supabase.from('vendors').select('name, category, city, rating, portfolio_images').eq('id', a.vendor_id).maybeSingle();
      return { ...a, applicant: v || null };
    }));
    res.json({ success: true, data: enriched });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/api/v2/collab/applications', async (req, res) => {
  try {
    const { post_id, vendor_id, message } = req.body || {};
    if (!post_id || !vendor_id) return res.status(400).json({ success: false, error: 'post_id and vendor_id required' });
    const { data: existing } = await supabase.from('collab_applications').select('id').eq('post_id', post_id).eq('vendor_id', vendor_id).maybeSingle();
    if (existing) return res.status(400).json({ success: false, error: 'Already applied' });
    const { data, error } = await supabase.from('collab_applications').insert([{ post_id, vendor_id, message: message || null, status: 'pending', match_score: null }]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.patch('/api/v2/collab/applications/:id', async (req, res) => {
  try {
    const { status } = req.body || {};
    const updates = { status };
    const { data, error } = await supabase.from('collab_applications').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// S41 — DreamAi Agentic Actions
app.post('/api/v2/dreamai/action/complete-task', async (req, res) => {
  try {
    const { task_id } = req.body || {};
    if (!task_id) return res.status(400).json({ success: false, error: 'task_id required' });
    const { error } = await supabase.from('couple_checklist').update({ is_complete: true }).eq('id', task_id);
    if (error) throw error;
    res.json({ success: true, message: 'Task marked as complete.' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/api/v2/dreamai/action/add-expense', async (req, res) => {
  try {
    const { couple_id, vendor_name, description, actual_amount, category } = req.body || {};
    if (!couple_id || !actual_amount) return res.status(400).json({ success: false, error: 'couple_id and actual_amount required' });
    const { data, error } = await supabase.from('couple_expenses').insert([{ couple_id, vendor_name: vendor_name||null, description: description||null, actual_amount: Number(actual_amount), category: category||'Other', payment_status: 'committed', event: 'general' }]).select().single();
    if (error) throw error;
    res.json({ success: true, data, message: 'Expense logged.' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/api/v2/dreamai/action/send-whatsapp-reminder', async (req, res) => {
  try {
    const { phone, message } = req.body || {};
    if (!phone || !message) return res.status(400).json({ success: false, error: 'phone and message required' });
    const sent = await sendWhatsApp('+91' + normalizePhone(phone), message);
    res.json({ success: sent, message: sent ? 'WhatsApp reminder sent.' : 'Failed to send.' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/api/v2/dreamai/action/send-enquiry', async (req, res) => {
  try {
    const { couple_id, vendor_id, opening_message } = req.body || {};
    if (!couple_id || !vendor_id || !opening_message) return res.status(400).json({ success: false, error: 'couple_id, vendor_id, opening_message required' });
    const { data: enq, error: enqErr } = await supabase.from('vendor_enquiries').insert([{ couple_id, vendor_id, status: 'active', last_message_at: new Date().toISOString(), last_message_from: 'couple', last_message_preview: opening_message.slice(0, 120) }]).select().single();
    if (enqErr) throw enqErr;
    await supabase.from('vendor_enquiry_messages').insert([{ enquiry_id: enq.id, from_role: 'couple', content: opening_message }]);
    res.json({ success: true, data: enq, message: 'Enquiry sent.' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/api/v2/dreamai/vendor-action/send-payment-reminder', async (req, res) => {
  try {
    const { client_phone, client_name, message } = req.body || {};
    if (!client_phone || !message) return res.status(400).json({ success: false, error: 'client_phone and message required' });
    const sent = await sendWhatsApp('+91' + normalizePhone(client_phone), message);
    res.json({ success: sent, message: sent ? 'Reminder sent to ' + (client_name||'client') + '.' : 'Failed.' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/api/v2/dreamai/vendor-action/reply-to-enquiry', async (req, res) => {
  try {
    const { enquiry_id, message } = req.body || {};
    if (!enquiry_id || !message) return res.status(400).json({ success: false, error: 'enquiry_id and message required' });
    await supabase.from('vendor_enquiry_messages').insert([{ enquiry_id, from_role: 'vendor', content: message }]);
    await supabase.from('vendor_enquiries').update({ last_message_at: new Date().toISOString(), last_message_from: 'vendor', last_message_preview: message.slice(0,120), couple_unread_count: 1 }).eq('id', enquiry_id);
    res.json({ success: true, message: 'Reply sent.' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/api/v2/dreamai/vendor-action/block-date', async (req, res) => {
  try {
    const { vendor_id, blocked_date, note } = req.body || {};
    if (!vendor_id || !blocked_date) return res.status(400).json({ success: false, error: 'vendor_id and blocked_date required' });
    const { data, error } = await supabase.from('vendor_availability_blocks').insert([{ vendor_id, blocked_date, note: note||null }]).select().single();
    if (error) throw error;
    res.json({ success: true, data, message: blocked_date + ' blocked on your calendar.' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/api/v2/dreamai/vendor-action/log-expense', async (req, res) => {
  try {
    const { vendor_id, description, amount, category } = req.body || {};
    if (!vendor_id || !amount) return res.status(400).json({ success: false, error: 'vendor_id and amount required' });
    const { data, error } = await supabase.from('vendor_expenses').insert([{ vendor_id, description: description||null, amount: Number(amount), category: category||'General', expense_date: new Date().toISOString().split('T')[0] }]).select().single();
    if (error) throw error;
    res.json({ success: true, data, message: 'Expense logged.' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin Portal v3
const adminAuth = (req, res, next) => { if (req.headers['x-admin-password'] !== 'Mira@2551354') return res.status(401).json({ error: 'Unauthorized' }); next(); };
app.get('/api/v3/admin/command-centre', adminAuth, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0] + 'T00:00:00.000Z';
    const [{ count: totalDreamers },{ count: totalMakers },{ count: enquiriesToday },{ count: museSavesToday },{ count: enquiriesYesterday },{ count: museSavesYesterday },{ count: dreamersToday },{ count: dreamersYesterday },{ data: recentDreamers },{ data: recentVendors },{ data: recentEnquiries },{ data: recentMuse }] = await Promise.all([supabase.from('users').select('*',{count:'exact',head:true}).eq('dreamer_type','couple'),supabase.from('vendors').select('*',{count:'exact',head:true}).not('name','is',null),supabase.from('vendor_enquiries').select('*',{count:'exact',head:true}).gte('created_at',todayStr),supabase.from('moodboard_items').select('*',{count:'exact',head:true}).gte('created_at',todayStr),supabase.from('vendor_enquiries').select('*',{count:'exact',head:true}).gte('created_at',yesterdayStr).lt('created_at',todayStr),supabase.from('moodboard_items').select('*',{count:'exact',head:true}).gte('created_at',yesterdayStr).lt('created_at',todayStr),supabase.from('users').select('*',{count:'exact',head:true}).gte('created_at',todayStr),supabase.from('users').select('*',{count:'exact',head:true}).gte('created_at',yesterdayStr).lt('created_at',todayStr),supabase.from('users').select('id,name,city,created_at').gte('created_at',todayStr).order('created_at',{ascending:false}).limit(5),supabase.from('vendors').select('id,name,category,created_at').gte('created_at',todayStr).order('created_at',{ascending:false}).limit(5),supabase.from('vendor_enquiries').select('id,created_at').gte('created_at',todayStr).order('created_at',{ascending:false}).limit(10),supabase.from('moodboard_items').select('id,vendor_name,created_at').gte('created_at',todayStr).order('created_at',{ascending:false}).limit(10)]);
    const activity = [];
    (recentDreamers||[]).forEach(u=>activity.push({type:'new_dreamer',emoji:'🟡',text:'New Dreamer joined — '+(u.name||'Unknown')+(u.city?', '+u.city:''),at:u.created_at,id:u.id}));
    (recentVendors||[]).forEach(v=>activity.push({type:'new_maker',emoji:'🟢',text:'New Maker onboarded — '+v.name,at:v.created_at,id:v.id}));
    (recentEnquiries||[]).forEach(e=>activity.push({type:'enquiry',emoji:'💬',text:'Enquiry sent',at:e.created_at,id:e.id}));
    (recentMuse||[]).forEach(m=>activity.push({type:'muse_save',emoji:'♥',text:'Muse save — '+(m.vendor_name||'vendor'),at:m.created_at,id:m.id}));
    activity.sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime());
    res.json({success:true,counters:{dreamers:{total:totalDreamers||0,today_delta:(dreamersToday||0)-(dreamersYesterday||0)},makers:{total:totalMakers||0},enquiries_today:{total:enquiriesToday||0,delta:(enquiriesToday||0)-(enquiriesYesterday||0)},muse_saves_today:{total:museSavesToday||0,delta:(museSavesToday||0)-(museSavesYesterday||0)}},activity:activity.slice(0,25)});
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.get('/api/v3/admin/dreamers', adminAuth, async (req, res) => {
  try {
    const { search, tier } = req.query;
    let query = supabase.from('users').select('id,name,phone,email,city,couple_tier,wedding_date,created_at,discover_enabled,token_balance').order('created_at',{ascending:false}).limit(200);
    if (search) query = query.or('name.ilike.%' + search + '%,phone.ilike.%' + search + '%');
    if (tier && tier !== 'all') query = query.eq('couple_tier', tier);
    const { data, error } = await query;
    if (error) throw error;
    const enriched = await Promise.all((data||[]).map(async (u) => {
      const [{ count: museCount },{ count: enquiryCount }] = await Promise.all([supabase.from('moodboard_items').select('*',{count:'exact',head:true}).eq('user_id',u.id),supabase.from('vendor_enquiries').select('*',{count:'exact',head:true}).eq('couple_id',u.id)]);
      return { ...u, muse_saves: museCount||0, enquiries_sent: enquiryCount||0 };
    }));
    res.json({ success: true, data: enriched });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.patch('/api/v3/admin/dreamers/:id', adminAuth, async (req, res) => {
  try {
    const allowed = ['couple_tier','discover_enabled','token_balance','wedding_date','name','phone'];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    const { data, error } = await supabase.from('users').update(patch).eq('id',req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.get('/api/v3/admin/makers', adminAuth, async (req, res) => {
  try {
    const { search, tier } = req.query;
    let query = supabase.from('vendors').select('id,name,category,city,phone,tier,is_verified,is_luxury,subscription_active,created_at,discover_enabled').not('name','is',null).order('created_at',{ascending:false}).limit(200);
    if (search) query = query.or('name.ilike.%' + search + '%,phone.ilike.%' + search + '%');
    if (tier && tier !== 'all') query = query.eq('tier', tier);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.patch('/api/v3/admin/makers/:id', adminAuth, async (req, res) => {
  try {
    const allowed = ['tier','is_verified','is_luxury','luxury_approved','couture_approved','discover_enabled','subscription_active'];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    const { data, error } = await supabase.from('vendors').update(patch).eq('id',req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.get('/api/v3/admin/images/pending', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('vendor_images').select('id,url,tags,vendor_id,created_at').eq('approved',false).order('created_at',{ascending:false}).limit(100);
    if (error) throw error;
    const enriched = await Promise.all((data||[]).map(async (img) => { const { data: v } = await supabase.from('vendors').select('name,category').eq('id',img.vendor_id).maybeSingle(); return { ...img, vendor_name: v?.name||'Unknown', vendor_category: v?.category||'' }; }));
    res.json({ success: true, data: enriched });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.patch('/api/v3/admin/images/:id', adminAuth, async (req, res) => {
  try {
    const { approved, rejection_reason } = req.body || {};
    const { data, error } = await supabase.from('vendor_images').update({ approved: !!approved, rejection_reason: rejection_reason||null }).eq('id',req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.get('/api/v3/admin/data/entity-link-stats', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('entity_links').select('link_type');
    if (error) throw error;
    const counts = {};
    (data||[]).forEach(r => { counts[r.link_type] = (counts[r.link_type]||0) + 1; });
    res.json({ success: true, data: Object.entries(counts).map(([link_type, count]) => ({ link_type, count })).sort((a,b) => b.count - a.count) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/api/v3/admin/data/backfill-all', adminAuth, async (req, res) => {
  try {
    const { data: couples } = await supabase.from('users').select('id').eq('dreamer_type','couple');
    let totalWritten = 0;
    for (const couple of couples || []) {
      const coupleId = couple.id;
      const [{ data: muse },{ data: enquiries },{ data: cvs }] = await Promise.all([supabase.from('moodboard_items').select('vendor_id').eq('user_id',coupleId).not('vendor_id','is',null),supabase.from('vendor_enquiries').select('vendor_id').eq('couple_id',coupleId),supabase.from('couple_vendors').select('vendor_id,status').eq('couple_id',coupleId).not('vendor_id','is',null)]);
      for (const m of muse||[]) { writeEntityLink({from_entity_type:'couple',from_entity_id:coupleId,to_entity_type:'vendor',to_entity_id:m.vendor_id,link_type:'saved_to_muse',couple_id:coupleId}); totalWritten++; }
      for (const e of enquiries||[]) { writeEntityLink({from_entity_type:'couple',from_entity_id:coupleId,to_entity_type:'vendor',to_entity_id:e.vendor_id,link_type:'enquired_about',couple_id:coupleId}); totalWritten++; }
      for (const cv of cvs||[]) { writeEntityLink({from_entity_type:'couple',from_entity_id:coupleId,to_entity_type:'vendor',to_entity_id:cv.vendor_id,link_type:cv.status==='booked'||cv.status==='paid'?'booked_for':'considering',couple_id:coupleId}); totalWritten++; }
    }
    await new Promise(r => setTimeout(r, 800));
    res.json({ success: true, couples_processed: (couples||[]).length, links_attempted: totalWritten });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.get('/api/v3/admin/system/health', adminAuth, async (req, res) => {
  try {
    const start = Date.now();
    const { error: sbErr } = await supabase.from('users').select('id').limit(1);
    res.json({ success: true, data: { supabase: { ok: !sbErr, latency_ms: Date.now()-start }, twilio: { ok: !!twilioClient }, railway: { ok: true, timestamp: new Date().toISOString() } } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/api/v3/admin/send-whatsapp', adminAuth, async (req, res) => {
  try {
    const { phone, message } = req.body || {};
    if (!phone || !message) return res.status(400).json({ success: false, error: 'phone and message required' });
    const sent = await sendWhatsApp(phone.startsWith('+') ? phone : '+91' + normalizePhone(phone), message);
    res.json({ success: sent, message: sent ? 'Sent.' : 'Failed.' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
ENDOFPATCH
