#!/bin/bash
# patch_seed_wedding_date.sh
# Fixes checklist/seed endpoint to calculate due dates backwards from wedding date
# If no wedding date set, uses today as reference (tasks due immediately = high priority signal)
# Run from: /workspaces/dream-wedding

set -e
FILE="backend/server.js"

echo "=== SAFETY CHECKS ==="
if [ ! -f "$FILE" ]; then echo "ERROR: $FILE not found."; exit 1; fi
EXPRESS_COUNT=$(grep -c "const express" "$FILE" || true)
echo "express count: $EXPRESS_COUNT (expected 1)"
if [ "$EXPRESS_COUNT" -ne 1 ]; then echo "ERROR: express count wrong. Aborting."; exit 1; fi
echo "Checks passed."

python3 << 'PYEOF'
content = open('backend/server.js', 'r').read()

# Find and replace the second (live) seed endpoint
old_seed = """app.post('/api/couple/checklist/seed/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    const { data: existing } = await supabase.from('couple_checklist').select('id').eq('couple_id', userId).limit(1);
    if (existing && existing.length > 0) return res.json({ success: true, seeded: false, message: 'Already seeded' });

    const now = new Date();
    const addDays = (d) => new Date(now.getTime() + d * 86400000).toISOString().split('T')[0];

    const rows = [
      { event: 'general', text: 'Set your total wedding budget', priority: 'high', due_date: null },
      { event: 'general', text: 'Choose wedding date', priority: 'high', due_date: null },
      { event: 'general', text: 'Create guest list (draft)', priority: 'high', due_date: null },
      { event: 'general', text: 'Book wedding venue', priority: 'high', due_date: addDays(60) },
      { event: 'general', text: 'Shortlist and book MUA', priority: 'high', due_date: addDays(30) },
      { event: 'general', text: 'Book photographer', priority: 'high', due_date: addDays(45) },
      { event: 'general', text: 'Book videographer', priority: 'high', due_date: null },
      { event: 'general', text: 'Finalise bridal lehenga', priority: 'high', due_date: null },
      { event: 'general', text: 'Design and order wedding invitations', priority: 'high', due_date: null },
      { event: 'general', text: 'Send save-the-dates (outstation guests)', priority: 'normal', due_date: null },
      { event: 'general', text: 'Send wedding invitations', priority: 'high', due_date: null },
      { event: 'general', text: 'Order bridal jewellery', priority: 'high', due_date: null },
      { event: 'general', text: 'Book honeymoon', priority: 'normal', due_date: null },
      { event: 'general', text: 'Groom — finalise sherwani / suit', priority: 'normal', due_date: null },
      { event: 'general', text: 'Confirm all vendor payment schedules', priority: 'high', due_date: null },
      { event: 'general', text: 'Collect RSVPs and share final count', priority: 'high', due_date: null },
      { event: 'general', text: 'Bridal lehenga final fitting', priority: 'high', due_date: null },
      { event: 'general', text: 'Confirm all vendors — final call / WhatsApp', priority: 'high', due_date: null },
      { event: 'general', text: 'Pay all final vendor balances', priority: 'high', due_date: null },
      { event: 'general', text: 'Write reviews for your vendors on TDW', priority: 'normal', due_date: null },
      { event: 'general', text: 'Start honeymoon!', priority: 'normal', due_date: null },
      { event: 'mehendi', text: 'Book mehendi artist', priority: 'high', due_date: null },
      { event: 'sangeet', text: 'Book DJ or live music for sangeet', priority: 'normal', due_date: null },
      { event: 'sangeet', text: 'Plan sangeet performances and rehearsal schedule', priority: 'normal', due_date: null },
      { event: 'reception', text: 'Shortlist and book decorator', priority: 'high', due_date: null },
      { event: 'reception', text: 'Shortlist and book caterer', priority: 'normal', due_date: null },
      { event: 'wedding', text: 'Book ceremony venue', priority: 'high', due_date: null },
      { event: 'wedding', text: 'Shortlist and book pandit / officiant', priority: 'high', due_date: null },
      { event: 'wedding', text: 'Confirm pandit — discuss rituals and timings', priority: 'high', due_date: null },
      { event: 'wedding', text: 'Wedding day — confirm call time with MUA', priority: 'high', due_date: null },
      { event: 'wedding', text: 'Wedding day — confirm call time with photographer', priority: 'high', due_date: null },
    ].map(t => ({ couple_id: userId, event: t.event, text: t.text, priority: t.priority, due_date: t.due_date, is_custom: false, seeded_from_template: true }));

    const { data, error } = await supabase.from('couple_checklist').insert(rows).select();
    if (error) throw error;

    await supabase.from('users').update({ checklist_seeded: true }).eq('id', userId).catch(() => {});
    res.json({ success: true, seeded: true, count: (data || []).length });
  } catch (error) {
    console.error('[POST /api/couple/checklist/seed] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// V9 login fix: pin-status endpoint"""

new_seed = """app.post('/api/couple/checklist/seed/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    const { data: existing } = await supabase.from('couple_checklist').select('id').eq('couple_id', userId).limit(1);
    if (existing && existing.length > 0) return res.json({ success: true, seeded: false, message: 'Already seeded' });

    // Fetch wedding date — calculate due dates backwards from wedding
    const { data: userRow } = await supabase.from('users').select('wedding_date').eq('id', userId).maybeSingle();
    const weddingDate = userRow?.wedding_date ? new Date(userRow.wedding_date) : null;

    // beforeWedding(days) = wedding_date minus N days
    // If no wedding date, returns null (no due date set)
    const beforeWedding = (days) => {
      if (!weddingDate) return null;
      const d = new Date(weddingDate.getTime() - days * 86400000);
      return d.toISOString().split('T')[0];
    };

    const rows = [
      // Book early — 12+ months before
      { event: 'general',   text: 'Set your total wedding budget',                    priority: 'high',   due_date: beforeWedding(365) },
      { event: 'general',   text: 'Choose wedding date',                              priority: 'high',   due_date: beforeWedding(365) },
      { event: 'general',   text: 'Create guest list (draft)',                         priority: 'high',   due_date: beforeWedding(330) },
      { event: 'general',   text: 'Book wedding venue',                               priority: 'high',   due_date: beforeWedding(300) },
      { event: 'general',   text: 'Book photographer',                                priority: 'high',   due_date: beforeWedding(270) },
      { event: 'general',   text: 'Book videographer',                                priority: 'high',   due_date: beforeWedding(270) },
      { event: 'wedding',   text: 'Book ceremony venue',                              priority: 'high',   due_date: beforeWedding(270) },
      // 6–9 months before
      { event: 'general',   text: 'Shortlist and book MUA',                           priority: 'high',   due_date: beforeWedding(240) },
      { event: 'general',   text: 'Finalise bridal lehenga',                          priority: 'high',   due_date: beforeWedding(210) },
      { event: 'general',   text: 'Order bridal jewellery',                           priority: 'high',   due_date: beforeWedding(210) },
      { event: 'general',   text: 'Groom — finalise sherwani / suit',                 priority: 'normal', due_date: beforeWedding(180) },
      { event: 'reception', text: 'Shortlist and book decorator',                     priority: 'high',   due_date: beforeWedding(180) },
      { event: 'reception', text: 'Shortlist and book caterer',                       priority: 'normal', due_date: beforeWedding(180) },
      { event: 'mehendi',   text: 'Book mehendi artist',                              priority: 'high',   due_date: beforeWedding(180) },
      { event: 'wedding',   text: 'Shortlist and book pandit / officiant',            priority: 'high',   due_date: beforeWedding(180) },
      { event: 'sangeet',   text: 'Book DJ or live music for sangeet',                priority: 'normal', due_date: beforeWedding(150) },
      // 3–6 months before
      { event: 'general',   text: 'Design and order wedding invitations',             priority: 'high',   due_date: beforeWedding(120) },
      { event: 'general',   text: 'Book honeymoon',                                   priority: 'normal', due_date: beforeWedding(120) },
      { event: 'sangeet',   text: 'Plan sangeet performances and rehearsal schedule', priority: 'normal', due_date: beforeWedding(90) },
      { event: 'wedding',   text: 'Confirm pandit — discuss rituals and timings',     priority: 'high',   due_date: beforeWedding(90) },
      // 1–3 months before
      { event: 'general',   text: 'Send save-the-dates (outstation guests)',          priority: 'normal', due_date: beforeWedding(75) },
      { event: 'general',   text: 'Send wedding invitations',                         priority: 'high',   due_date: beforeWedding(60) },
      { event: 'general',   text: 'Collect RSVPs and share final count',              priority: 'high',   due_date: beforeWedding(30) },
      { event: 'general',   text: 'Confirm all vendor payment schedules',             priority: 'high',   due_date: beforeWedding(30) },
      // Final month
      { event: 'general',   text: 'Bridal lehenga final fitting',                    priority: 'high',   due_date: beforeWedding(21) },
      { event: 'general',   text: 'Confirm all vendors — final call / WhatsApp',     priority: 'high',   due_date: beforeWedding(7) },
      { event: 'wedding',   text: 'Wedding day — confirm call time with MUA',        priority: 'high',   due_date: beforeWedding(2) },
      { event: 'wedding',   text: 'Wedding day — confirm call time with photographer', priority: 'high', due_date: beforeWedding(2) },
      // After wedding
      { event: 'general',   text: 'Pay all final vendor balances',                   priority: 'high',   due_date: beforeWedding(-3) },
      { event: 'general',   text: 'Write reviews for your vendors on TDW',           priority: 'normal', due_date: beforeWedding(-14) },
      { event: 'general',   text: 'Start honeymoon!',                                priority: 'normal', due_date: beforeWedding(-1) },
    ].map(t => ({ couple_id: userId, event: t.event, text: t.text, priority: t.priority, due_date: t.due_date, is_custom: false, seeded_from_template: true }));

    const { data, error } = await supabase.from('couple_checklist').insert(rows).select();
    if (error) throw error;

    await supabase.from('users').update({ checklist_seeded: true }).eq('id', userId).catch(() => {});
    res.json({ success: true, seeded: true, count: (data || []).length, wedding_date: weddingDate?.toISOString().split('T')[0] || null });
  } catch (error) {
    console.error('[POST /api/couple/checklist/seed] error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// V9 login fix: pin-status endpoint"""

if old_seed not in content:
    print("ERROR: Could not find seed endpoint to replace.")
    exit(1)

fixed = content.replace(old_seed, new_seed, 1)
open('backend/server.js', 'w').write(fixed)
print("Seed endpoint patched — due dates now calculated from wedding date.")
PYEOF

echo ""
echo "=== VERIFICATION ==="
grep -n "beforeWedding\|wedding_date" "$FILE" | grep -v "supabase\|#\|//" | head -10
echo ""
echo "express count (must be 1):"
grep -c "const express" "$FILE"
echo ""
echo "=== DONE ==="
echo "Run:"
echo "  git add backend/server.js"
echo "  git commit -m 'fix: seed tasks with due dates calculated backwards from wedding date'"
echo "  git push origin main"
