import sys

with open('backend/server.js', 'r') as f:
    content = f.read()

changes = 0

# 1. Add push trigger to enquiry endpoint
old = """      bumpVendorMetric(vendor_id, 'enquiries').catch(() => {});
      logVendorActivity(vendor_id, 'enquiry_received', 'New enquiry from a couple', { enquiry_id: enquiry.id }).catch(() => {});
    }
    // Auto-upsert into couple_vendors as 'contacted' (one-way ratchet — never downgrades)
    upsertCoupleVendor(couple_id, vendor_id, 'contacted').catch(() => {});
    res.json({ success: true, data: enquiry });"""

new = """      bumpVendorMetric(vendor_id, 'enquiries').catch(() => {});
      logVendorActivity(vendor_id, 'enquiry_received', 'New enquiry from a couple', { enquiry_id: enquiry.id }).catch(() => {});
      supabase.from('users').select('name').eq('id', couple_id).maybeSingle().then(({ data: coupleUser }) => {
        const coupleName = coupleUser?.name || 'A couple';
        sendPushToVendor(vendor_id, '\\u2726 New Enquiry', `${coupleName} is interested in your work`, '/vendor/leads').catch(() => {});
      }).catch(() => {});
    }
    // Auto-upsert into couple_vendors as 'contacted' (one-way ratchet — never downgrades)
    upsertCoupleVendor(couple_id, vendor_id, 'contacted').catch(() => {});
    res.json({ success: true, data: enquiry });"""

if old in content:
    content = content.replace(old, new, 1)
    print("DONE: enquiry push trigger")
    changes += 1
else:
    print("SKIP: enquiry push trigger (already applied or not found)")

# 2. Add push trigger to collab applications endpoint
old2 = """          sendWhatsApp(phone, msg).catch(() => {});
        }, 5 * 60 * 1000); // 5 minute delay
      }
    }

    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PATCH /api/v2/collab/applications/:id"""

new2 = """          sendWhatsApp(phone, msg).catch(() => {});
        }, 5 * 60 * 1000); // 5 minute delay
      }
      // Push notification — immediate
      const { data: applicant } = await supabase.from('vendors').select('name').eq('id', vendor_id).maybeSingle();
      sendPushToVendor(post.vendor_id, '\\u2726 New Collab Application', `${applicant?.name || 'A Maker'} applied for "${post.title}"`, '/vendor/discovery/collab').catch(() => {});
    }

    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PATCH /api/v2/collab/applications/:id"""

if old2 in content:
    content = content.replace(old2, new2, 1)
    print("DONE: collab push trigger")
    changes += 1
else:
    print("SKIP: collab push trigger (already applied or not found)")

# 3. Add couple onboarding + push-subscribe endpoints at end
if '/api/v2/couple/onboarding' not in content:
    content += """

// PHASE 4: Couple onboarding endpoint
app.post('/api/v2/couple/onboarding', async (req, res) => {
  try {
    const { userId, phone, name, wedding_date, partner_name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name required' });
    let updated = false;
    if (userId) {
      const { error } = await supabase.from('users')
        .update({ name, partner_name: partner_name || null, wedding_date: wedding_date || null })
        .eq('id', userId);
      if (!error) updated = true;
    }
    if (!updated && phone) {
      const bare = phone.replace(/\\D/g, '').slice(-10);
      const full = '+91' + bare;
      const { error: e1 } = await supabase.from('users').update({ name, partner_name: partner_name || null, wedding_date: wedding_date || null }).eq('phone', full);
      if (!e1) updated = true;
      if (!updated) {
        await supabase.from('users').update({ name, partner_name: partner_name || null, wedding_date: wedding_date || null }).eq('phone', bare);
        updated = true;
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PHASE 4: Push subscription endpoint
app.post('/api/v2/vendor/push-subscribe', async (req, res) => {
  const { vendor_id, subscription } = req.body;
  if (!vendor_id || !subscription) return res.status(400).json({ success: false, error: 'vendor_id and subscription required' });
  try {
    await supabase.from('vendor_push_subscriptions')
      .upsert([{ vendor_id, subscription }], { onConflict: 'vendor_id' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
"""
    print("DONE: couple onboarding + push-subscribe endpoints")
    changes += 1
else:
    print("SKIP: endpoints already present")

with open('backend/server.js', 'w') as f:
    f.write(content)

print(f"\nTotal changes applied: {changes}")
