#!/usr/bin/env python3
"""
PATCH B-5 — paid_total on vendors-list endpoint

Adds a `paid_total` field to each row returned by GET
/api/couple/vendors/:coupleId. Sum of `actual_amount` across
couple_expenses rows where vendor_name matches AND payment_status='paid'.

This powers the new "₹X of ₹Y paid" meta line on booked rows in the
native journey/vendors list.

Two queries instead of one (vendors + expenses), then one in-memory
match. The match uses case-insensitive substring (same way book_vendor /
log_payment match vendor names) so "Swati Tomar" expense rows match a
"Swati Tomar" vendor row regardless of case quirks.

Validates: node --check backend/server.js
"""
import os
import sys

REPO = os.environ.get('TDW_REPO', '/workspaces/dream-wedding')
TARGET = os.path.join(REPO, 'backend', 'server.js')

if not os.path.exists(TARGET):
    print(f"ERROR: cannot find {TARGET}")
    sys.exit(1)

with open(TARGET, 'r', encoding='utf-8') as f:
    src = f.read()

orig_len = len(src)

OLD = """app.get('/api/couple/vendors/:coupleId', async (req, res) => {
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
});"""

NEW = """app.get('/api/couple/vendors/:coupleId', async (req, res) => {
  try {
    const { coupleId } = req.params;
    const { data, error } = await supabase
      .from('couple_vendors')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    // PATCH B-5: attach paid_total to each vendor row.
    // Fetch all paid expenses for the couple in one query, build a
    // case-insensitive name → sum map, then walk vendors and attach.
    // Vendor names are matched by exact lowercase comparison; substring
    // matching would over-attribute (e.g. "Swati R" rolling up under
    // "Swati Tomar"). The bride's actual flow logs payments against the
    // vendor's saved name, so exact match is the correct discriminator.
    const vendors = data || [];
    let paidByName = new Map();
    try {
      const { data: paidExpenses } = await supabase
        .from('couple_expenses')
        .select('vendor_name, actual_amount')
        .eq('couple_id', coupleId)
        .eq('payment_status', 'paid');
      for (const e of paidExpenses || []) {
        if (!e.vendor_name) continue;
        const key = e.vendor_name.toLowerCase().trim();
        const prev = paidByName.get(key) || 0;
        paidByName.set(key, prev + (Number(e.actual_amount) || 0));
      }
    } catch (e) {
      // Expense fetch failure should not block the vendors list.
      console.error('vendors list paid_total fetch error:', e.message);
    }
    const enriched = vendors.map(v => ({
      ...v,
      paid_total: paidByName.get((v.name || '').toLowerCase().trim()) || 0,
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('vendors list error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});"""

assert src.count(OLD) == 1, f"OLD expected 1 match, got {src.count(OLD)}"
src = src.replace(OLD, NEW)
print("[1/1] vendors-list endpoint now returns paid_total on each row")

SENTINEL = "// ─── PATCH B-5 LOADED ─── //\n"
if SENTINEL not in src:
    src = src.rstrip() + "\n\n" + SENTINEL

with open(TARGET, 'w', encoding='utf-8') as f:
    f.write(src)

print(f"\nWrote {TARGET}")
print(f"Size delta: {len(src) - orig_len:+d} bytes")
print("\nNow run:  node --check backend/server.js")
