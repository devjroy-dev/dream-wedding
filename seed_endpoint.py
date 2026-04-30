import sys
path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

if '/api/couple/checklist/seed/' in content:
    print("Already applied — skipping")
    sys.exit(0)

anchor = "// Update a single task (toggle complete, edit text, reassign, etc.)\napp.patch('/api/couple/checklist/:taskId',"

new_endpoint = '''// ─── Seed 52 tasks for a couple ──────────────────────────────────────────────
app.post('/api/couple/checklist/seed/:coupleId', async (req, res) => {
  try {
    const { coupleId } = req.params;
    if (!coupleId) return res.status(400).json({ success: false, error: 'coupleId required' });

    const { data: user } = await supabase.from('users').select('checklist_seeded').eq('id', coupleId).maybeSingle();
    if (user?.checklist_seeded) {
      const { data: existing } = await supabase.from('couple_checklist').select('id').eq('couple_id', coupleId);
      return res.json({ success: true, seeded: false, message: 'Already seeded', count: existing?.length || 0 });
    }

    const { data: existing } = await supabase.from('couple_checklist').select('id').eq('couple_id', coupleId);
    if (existing && existing.length > 0) {
      await supabase.from('users').update({ checklist_seeded: true }).eq('id', coupleId);
      return res.json({ success: true, seeded: false, message: 'Tasks already exist', count: existing.length });
    }

    const WEDDING_TASK_TEMPLATES = [
      { text: 'Set your total wedding budget', event: 'general', priority: 'high' },
      { text: 'Create guest list (draft)', event: 'general', priority: 'high' },
      { text: 'Choose wedding date', event: 'general', priority: 'high' },
      { text: 'Book wedding venue', event: 'reception', priority: 'high' },
      { text: 'Book ceremony venue', event: 'wedding', priority: 'high' },
      { text: 'Shortlist and book MUA', event: 'general', priority: 'high' },
      { text: 'Shortlist photographers — review portfolios', event: 'general', priority: 'high' },
      { text: 'Book photographer', event: 'general', priority: 'high' },
      { text: 'Book videographer', event: 'general', priority: 'high' },
      { text: 'Start bridal lehenga shopping', event: 'general', priority: 'high' },
      { text: 'Shortlist and book decorator', event: 'reception', priority: 'high' },
      { text: 'Shortlist and book caterer', event: 'reception', priority: 'normal' },
      { text: 'Book mehendi artist', event: 'mehendi', priority: 'high' },
      { text: 'Send save-the-dates (outstation guests)', event: 'general', priority: 'normal' },
      { text: 'Book DJ or live music for sangeet', event: 'sangeet', priority: 'normal' },
      { text: 'Finalise bridal lehenga', event: 'general', priority: 'high' },
      { text: 'Book hotel room block for outstation guests', event: 'general', priority: 'normal' },
      { text: 'Discuss decor theme and mood board with decorator', event: 'general', priority: 'normal' },
      { text: 'Shortlist and book pandit / officiant', event: 'wedding', priority: 'high' },
      { text: 'Finalise guest list (final headcount)', event: 'general', priority: 'high' },
      { text: 'Order bridal jewellery', event: 'general', priority: 'high' },
      { text: 'Plan sangeet performances and rehearsal schedule', event: 'sangeet', priority: 'normal' },
      { text: 'Design and order wedding invitations', event: 'general', priority: 'high' },
      { text: 'Book honeymoon', event: 'general', priority: 'normal' },
      { text: 'Groom — finalise sherwani / suit', event: 'general', priority: 'normal' },
      { text: 'Confirm headcount with venue and caterer', event: 'general', priority: 'high' },
      { text: 'Send wedding invitations', event: 'general', priority: 'high' },
      { text: 'Schedule pre-wedding shoot', event: 'general', priority: 'normal' },
      { text: 'Finalise decor details with decorator', event: 'general', priority: 'normal' },
      { text: 'Book makeup trials for bridesmaids / family', event: 'general', priority: 'normal' },
      { text: 'Confirm pandit — discuss rituals and timings', event: 'wedding', priority: 'high' },
      { text: 'Pre-wedding shoot', event: 'general', priority: 'normal' },
      { text: 'Confirm all vendor payment schedules', event: 'general', priority: 'high' },
      { text: 'Collect RSVPs and share final count', event: 'general', priority: 'high' },
      { text: 'Bridal lehenga final fitting', event: 'general', priority: 'high' },
      { text: 'Prepare vendor advance payment list', event: 'general', priority: 'high' },
      { text: 'Sangeet rehearsals begin', event: 'sangeet', priority: 'normal' },
      { text: 'Confirm hotel rooming list for guests', event: 'general', priority: 'normal' },
      { text: 'Pack bridal emergency kit', event: 'general', priority: 'normal' },
      { text: 'Confirm all vendors — final call / WhatsApp', event: 'general', priority: 'high' },
      { text: 'Mehendi ceremony', event: 'mehendi', priority: 'high' },
      { text: 'Sangeet ceremony', event: 'sangeet', priority: 'high' },
      { text: 'Haldi ceremony', event: 'haldi', priority: 'normal' },
      { text: 'Wedding day — confirm call time with MUA', event: 'wedding', priority: 'high' },
      { text: 'Wedding day — confirm call time with photographer', event: 'wedding', priority: 'high' },
      { text: 'Wedding ceremony', event: 'wedding', priority: 'high' },
      { text: 'Wedding reception', event: 'reception', priority: 'high' },
      { text: 'Pay all final vendor balances', event: 'general', priority: 'high' },
      { text: 'Share wedding photos with family and friends', event: 'general', priority: 'normal' },
      { text: 'Write reviews for your vendors on TDW', event: 'general', priority: 'normal' },
      { text: 'Send thank-you notes to vendors', event: 'general', priority: 'normal' },
      { text: 'Start honeymoon!', event: 'general', priority: 'normal' },
    ];

    const rows = WEDDING_TASK_TEMPLATES.map(t => ({
      couple_id: coupleId,
      event: t.event,
      text: t.text,
      title: t.text,
      priority: t.priority,
      is_complete: false,
      is_custom: false,
      seeded_from_template: true,
    }));

    const { data, error } = await supabase.from('couple_checklist').insert(rows).select();
    if (error) throw error;

    await supabase.from('users').update({ checklist_seeded: true }).eq('id', coupleId);
    res.json({ success: true, seeded: true, count: data?.length || 0 });
  } catch (error) {
    console.error('checklist seed error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

'''

assert content.count(anchor) == 1, f"anchor not found: {content.count(anchor)}"
content = content.replace(anchor, new_endpoint + anchor, 1)
with open(path, 'w') as f:
    f.write(content)
print("Seed endpoint added ✅")
