path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

old_handler = """      // ── Everything else — DreamAi conversation ──
      if (apiKey) {
        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001', max_tokens: 300,
              system: `You are DreamAi, the AI wedding companion for The Dream Wedding (TDW) — India's premium wedding platform.
You're chatting via WhatsApp with ${coupleName}, who is planning their wedding${profile?.wedding_date ? ' on ' + profile.wedding_date : ''}.
You are a knowledgeable wedding expert. Answer BOTH personal planning questions AND general wedding questions (best bridal markets, vendor recommendations, outfit ideas, city guides etc). Be warm, brief (2-3 sentences), specific. Indian wedding context. Use ₹ for currency. Never refuse a wedding-related question.
To save inspiration: send a link or image with the word "muse" or "save".
To log a receipt: send a photo of the receipt.
To add guests: forward contacts from WhatsApp.`,
              messages: [{ role: 'user', content: body }]
            }),
          });
          const data = await response.json();
          await sendWhatsApp(fromPhone, data.content?.[0]?.text || 'How can I help with your wedding planning?');
        } catch (e) { console.error('[WhatsApp DreamAi couple]', e.message); }
      }
      return;
    }"""

new_handler = """      // ── Everything else — Full agentic DreamAi (WhatsApp parity) ──
      if (apiKey) {
        try {
          // Load full couple context (same as in-app)
          const todayStr = new Date().toISOString().split('T')[0];
          const next30 = new Date(Date.now() + 30 * 86400000).toISOString();
          const [
            { data: events },
            { data: tasks },
            { data: expenses },
            { data: guests },
            { data: coupleVendors },
            { data: coupleProfile },
          ] = await Promise.all([
            supabase.from('couple_events').select('id, event_name, event_date, venue').eq('couple_id', couple.id).order('event_date', { ascending: true }),
            supabase.from('couple_checklist').select('id, text, is_complete, due_date, event, priority').eq('couple_id', couple.id).eq('is_complete', false).order('due_date', { ascending: true }),
            supabase.from('couple_expenses').select('id, vendor_name, description, actual_amount, payment_status, due_date, category').eq('couple_id', couple.id),
            supabase.from('couple_guests').select('id, rsvp_status').eq('couple_id', couple.id),
            supabase.from('couple_vendors').select('id, name, vendor_id, status, category, quoted_total').eq('couple_id', couple.id),
            supabase.from('couple_profiles').select('total_budget').eq('user_id', couple.id).maybeSingle(),
          ]);

          const allExp = expenses || [];
          const totalBudget = coupleProfile && coupleProfile.total_budget ? coupleProfile.total_budget : 0;
          const committed = allExp.filter(function(e) { return e.payment_status === 'committed' || e.payment_status === 'paid'; }).reduce(function(s, e) { return s + (e.actual_amount || 0); }, 0);
          const paid = allExp.filter(function(e) { return e.payment_status === 'paid'; }).reduce(function(s, e) { return s + (e.actual_amount || 0); }, 0);
          const overdueTasks = (tasks || []).filter(function(t) { return t.due_date && t.due_date < todayStr; });
          const bookedVendors = (coupleVendors || []).filter(function(v) { return v.status === 'booked' || v.status === 'paid'; });

          const weddingDate = profile && profile.wedding_date ? profile.wedding_date : null;
          let daysRemaining = null;
          if (weddingDate) {
            daysRemaining = Math.ceil((new Date(weddingDate).getTime() - Date.now()) / 86400000);
          }

          const ctx = [
            "COUPLE: " + coupleName + (weddingDate ? ", wedding on " + weddingDate + " (" + daysRemaining + " days away)" : ""),
            "BUDGET: Rs." + totalBudget.toLocaleString('en-IN') + " total, Rs." + committed.toLocaleString('en-IN') + " committed, Rs." + paid.toLocaleString('en-IN') + " paid, Rs." + (totalBudget - committed).toLocaleString('en-IN') + " remaining",
            "EVENTS: " + (events && events.length > 0 ? events.map(function(e) { return e.event_name + " on " + e.event_date + (e.venue ? " at " + e.venue : ""); }).join("; ") : "none set"),
            "PENDING TASKS: " + (tasks ? tasks.length : 0) + " total, " + overdueTasks.length + " overdue" + (overdueTasks.length > 0 ? " (" + overdueTasks.slice(0, 3).map(function(t) { return t.text; }).join(", ") + ")" : ""),
            "VENDORS: " + (coupleVendors ? coupleVendors.length : 0) + " total, " + bookedVendors.length + " booked (" + bookedVendors.map(function(v) { return v.name + "/" + v.category; }).join(", ") + ")",
            "GUESTS: " + (guests ? guests.length : 0) + " total, " + (guests ? guests.filter(function(g) { return g.rsvp_status === 'confirmed'; }).length : 0) + " confirmed",
          ].join("\\n");

          const waSystem = "You are DreamAi, the AI wedding companion for The Dream Wedding (TDW) — India's premium wedding platform. You are chatting via WhatsApp with " + coupleName + "." +
            "\\n\\nCOUPLE'S WEDDING DATA:\\n" + ctx +
            "\\n\\nYou have access to tools to take actions on their behalf. Use them when the user wants to do something. For queries about their data, use the query tools and reply with the actual numbers. For general wedding questions (markets, vendors, cities, trends, outfit ideas), answer directly from your knowledge." +
            "\\n\\nCRITICAL RULES FOR WHATSAPP:" +
            "\\n- Keep replies SHORT — 2-4 sentences max. WhatsApp is not a browser." +
            "\\n- NO markdown. No **bold**, no ##headers, no bullet points with hyphens. Plain text only." +
            "\\n- Use Rs. not the rupee symbol." +
            "\\n- Be warm and specific. Indian wedding context always." +
            "\\n- Never refuse a wedding-related question." +
            "\\n- When taking an action, confirm it simply: 'Done! Added Priya to your guest list.'" +
            "\\n\\nTo save inspiration: send a link or image with the word muse or save." +
            "\\n\\nTo log a receipt: send a photo of the receipt." +
            "\\n\\nTo add guests: forward contacts from WhatsApp.";

          // Run agentic loop (same as in-app, max 3 iterations for WhatsApp)
          const waMessages = [{ role: 'user', content: body }];
          const WA_QUERY_TOOLS = ['query_budget', 'query_tasks', 'query_vendors', 'general_reply', 'save_to_muse'];
          let finalReply = '';
          let iterations = 0;

          while (iterations < 3) {
            iterations++;
            const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
              body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 400,
                system: waSystem,
                tools: TDW_COUPLE_TOOLS,
                messages: waMessages,
              }),
            });
            const aiData = await aiRes.json();

            if (aiData.stop_reason === 'end_turn') {
              const textBlock = (aiData.content || []).find(function(b) { return b.type === 'text'; });
              finalReply = textBlock ? textBlock.text : '';
              break;
            }

            if (aiData.stop_reason === 'tool_use') {
              const toolBlocks = (aiData.content || []).filter(function(b) { return b.type === 'tool_use'; });
              if (toolBlocks.length === 0) break;
              waMessages.push({ role: 'assistant', content: aiData.content });

              const toolResults = [];
              for (const tb of toolBlocks) {
                const toolName = tb.name;
                const toolInput = tb.input || {};
                let result = '';
                if (WA_QUERY_TOOLS.includes(toolName)) {
                  // Execute immediately
                  try {
                    result = await executeToolCall(toolName, toolInput, { id: couple.id });
                  } catch (e) {
                    result = 'Error: ' + e.message;
                  }
                } else {
                  // Mutation tools — execute directly on WhatsApp (no confirmation UI available)
                  try {
                    result = await executeToolCall(toolName, toolInput, { id: couple.id });
                    // Prepend a done indicator so Haiku knows to confirm to user
                    result = 'Done. ' + result;
                  } catch (e) {
                    result = 'Error: ' + e.message;
                  }
                }
                toolResults.push({ type: 'tool_result', tool_use_id: tb.id, content: result });
              }
              waMessages.push({ role: 'user', content: toolResults });
              continue;
            }

            // Unexpected stop
            const textBlock = (aiData.content || []).find(function(b) { return b.type === 'text'; });
            finalReply = textBlock ? textBlock.text : '';
            break;
          }

          if (!finalReply || finalReply.trim() === '' || finalReply.trim() === 'Done.') {
            finalReply = 'Done! What else can I help with?';
          }

          await sendWhatsApp(fromPhone, finalReply);
        } catch (e) { console.error('[WhatsApp DreamAi couple]', e.message); }
      }
      return;
    }"""

assert content.count(old_handler) == 1, "old_handler not found exactly once"
content = content.replace(old_handler, new_handler, 1)
print("✅ WhatsApp couple handler upgraded to full agentic DreamAi")

with open(path, 'w') as f:
    f.write(content)
print("✅ server.js written")
