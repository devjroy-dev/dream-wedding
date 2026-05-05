import sys
path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

if 'save_to_muse' in content:
    print("Already applied"); sys.exit(0)

# 1. Add save_to_muse to TDW_COUPLE_TOOLS
old1 = """  {
    name: 'general_reply',
    description: 'Conversational reply when no action is needed.',
    input_schema: {
      type: 'object',
      properties: {
        reply: { type: 'string', description: 'Response to the couple' },
      },
      required: ['reply'],
    },
  },
];"""
new1 = """  {
    name: 'save_to_muse',
    description: "Save an image URL, Instagram link, Pinterest link, or any inspiration URL to the couple's Muse board.",
    input_schema: {
      type: 'object',
      properties: {
        source_url: { type: 'string', description: 'The URL or link to save' },
        function_tag: { type: 'string', description: 'Optional tag like bridal, decor, photography' },
      },
      required: ['source_url'],
    },
  },
  {
    name: 'general_reply',
    description: 'Conversational reply when no action is needed.',
    input_schema: {
      type: 'object',
      properties: {
        reply: { type: 'string', description: 'Response to the couple' },
      },
      required: ['reply'],
    },
  },
];"""
assert content.count(old1) == 1
content = content.replace(old1, new1, 1)
print("✅ save_to_muse tool added")

# 2. Add to QUERY_TOOLS
old2 = "      const QUERY_TOOLS = ['query_schedule', 'query_revenue', 'query_clients', 'general_reply'];"
new2 = "      const QUERY_TOOLS = ['query_schedule', 'query_revenue', 'query_clients', 'general_reply', 'save_to_muse', 'complete_task', 'add_expense'];"
assert content.count(old2) == 1
content = content.replace(old2, new2, 1)
print("✅ QUERY_TOOLS updated")

# 3. Add executors
old3 = "      case 'general_reply':\n"
new3 = """      case 'save_to_muse': {
        const { source_url, function_tag = 'muse_save' } = toolInput;
        const coupleId = vendor?.id || userId;
        await supabase.from('moodboard_items').insert([{
          user_id: coupleId, vendor_id: null, image_url: source_url, function_tag,
        }]);
        return '✓ Saved to your Muse board! Open Plan → Muse to see it.';
      }

      case 'complete_task': {
        const { task_id } = toolInput;
        if (!task_id) return 'Task ID required.';
        await supabase.from('couple_checklist').update({ is_complete: true, completed_at: new Date().toISOString() }).eq('id', task_id);
        return '✓ Task marked complete.';
      }

      case 'add_expense': {
        const { vendor_name = '', description, actual_amount, category = 'Other' } = toolInput;
        const coupleId = vendor?.id || userId;
        await supabase.from('couple_expenses').insert([{
          couple_id: coupleId, vendor_name, description, actual_amount, category,
          payment_status: 'committed', event: 'general',
        }]);
        return `✓ Expense logged: ₹${actual_amount?.toLocaleString('en-IN')} for ${description}.`;
      }

      case 'general_reply':
"""
assert content.count(old3) == 1
content = content.replace(old3, new3, 1)
print("✅ executors added")

# 4. Update WhatsApp couple branch
old4 = """    // Couple sent text only (no media) — gentle instructions
    if (couple && numMedia === 0) {
      const bodyLower = body.toLowerCase();
      // Only respond if they seem to be asking about contact import
      if (bodyLower.includes('import') || bodyLower.includes('contact') || bodyLower.includes('guest') || bodyLower.includes('help')) {
        await sendWhatsApp(
          fromPhone,
          `Hi ${couple.name?.split(' ')[0] || 'there'}! To add guests, forward me their contacts from WhatsApp:\\n\\n1. Long-press any chat\\n2. Tap Attach → Contact\\n3. Select up to 50 at a time\\n4. Send them here\\n\\nI'll add them to your Guest Ledger automatically.`
        );
      }
      // Otherwise, silently ignore — couple-side DreamAi is future work
      return;
    }"""
new4 = """    // Couple sent text or image — handle muse saving + DreamAi
    if (couple) {
      const bodyLower = body.toLowerCase();

      // Image media — save to muse if intent detected
      if (numMedia > 0) {
        const isMuseIntent = bodyLower.includes('muse') || bodyLower.includes('save') || bodyLower.includes('inspo') || body.trim() === '';
        const imageUrls = [];
        for (let i = 0; i < numMedia; i++) {
          const ct = (req.body[`MediaContentType${i}`] || '').toLowerCase();
          const mu = req.body[`MediaUrl${i}`] || '';
          if (mu && ct.startsWith('image/')) imageUrls.push(mu);
        }
        if (imageUrls.length > 0 && isMuseIntent) {
          for (const url of imageUrls) {
            await supabase.from('moodboard_items').insert([{ user_id: couple.id, vendor_id: null, image_url: url, function_tag: 'muse_save' }]);
          }
          await sendWhatsApp(fromPhone, `Saved ${imageUrls.length > 1 ? imageUrls.length + ' images' : 'that'} to your Muse board ✨\\n\\nOpen TDW → Plan → Muse to see it.`);
          return;
        }
      }

      // URL in message — save to muse if intent detected
      const urlMatch = body.match(/https?:\\/\\/[^\\s]+/);
      if (urlMatch && (bodyLower.includes('muse') || bodyLower.includes('save') || bodyLower.includes('add') || bodyLower.includes('pin') || bodyLower.includes('inspo'))) {
        await supabase.from('moodboard_items').insert([{ user_id: couple.id, vendor_id: null, image_url: urlMatch[0], function_tag: 'muse_save' }]);
        await sendWhatsApp(fromPhone, `Saved to your Muse board ✨\\n\\nOpen TDW → Plan → Muse to see it.`);
        return;
      }

      // Guest import help
      if (bodyLower.includes('import') || bodyLower.includes('contact') || bodyLower.includes('guest') || bodyLower.includes('help')) {
        await sendWhatsApp(fromPhone, `Hi ${couple.name?.split(' ')[0] || 'there'}! To add guests, forward me their contacts from WhatsApp:\\n\\n1. Long-press any chat\\n2. Tap Attach → Contact\\n3. Select up to 50 at a time\\n4. Send them here\\n\\nI'll add them to your Guest Ledger automatically.`);
        return;
      }

      // Everything else — route to DreamAi
      try {
        const apiKey = process.env.ANTHROPIC_API_KEY || '';
        if (apiKey) {
          const { data: profile } = await supabase.from('users').select('name, wedding_date').eq('id', couple.id).maybeSingle();
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 300,
              system: `You are DreamAi for The Dream Wedding. Help ${profile?.name || 'this couple'} plan their wedding. Wedding: ${profile?.wedding_date || 'TBD'}. Be brief, warm, Indian context. ₹ for currency.`,
              messages: [{ role: 'user', content: body }] }),
          });
          const data = await response.json();
          await sendWhatsApp(fromPhone, data.content?.[0]?.text || 'How can I help with your wedding planning?');
        }
      } catch (e) { console.error('[WhatsApp DreamAi couple]', e.message); }
      return;
    }"""
assert content.count(old4) == 1, f"couple branch: {content.count(old4)}"
content = content.replace(old4, new4, 1)
print("✅ WhatsApp couple branch updated")

# 5. Remove vendor_id filter from muse GET
old5 = """      .eq('user_id', couple_id).not('vendor_id', 'is', null)"""
new5 = """      .eq('user_id', couple_id)"""
assert content.count(old5) == 1
content = content.replace(old5, new5, 1)
print("✅ Muse GET filter fixed")

with open(path, 'w') as f:
    f.write(content)
print("All done ✅")
