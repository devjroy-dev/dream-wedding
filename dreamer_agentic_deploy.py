path = '/workspaces/dream-wedding/backend/server.js'
with open(path, 'r') as f:
    content = f.read()

# ── 1. Replace TDW_COUPLE_TOOLS ───────────────────────────────────────────────
old_tools = """const TDW_COUPLE_TOOLS = [
  {
    name: 'complete_task',
    description: 'Mark a wedding checklist task as complete.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID from checklist' },
        task_description: { type: 'string', description: 'Description of the task being completed' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'add_expense',
    description: 'Log a wedding expense.',
    input_schema: {
      type: 'object',
      properties: {
        vendor_name: { type: 'string', description: 'Vendor or payee name' },
        description: { type: 'string', description: 'What the expense was for' },
        actual_amount: { type: 'number', description: 'Amount in rupees' },
        category: { type: 'string', description: 'Category: Venue, Photography, Makeup, Decor, Catering, Attire, Jewellery, Entertainment, Other' },
      },
      required: ['actual_amount', 'description'],
    },
  },
  {
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

new_tools = """const TDW_COUPLE_TOOLS = [
  {
    name: 'complete_task',
    description: 'Mark a wedding checklist task as complete.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID from checklist' },
        task_description: { type: 'string', description: 'Description of the task being completed' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'add_expense',
    description: 'Log a wedding expense or payment.',
    input_schema: {
      type: 'object',
      properties: {
        vendor_name: { type: 'string', description: 'Vendor or payee name' },
        description: { type: 'string', description: 'What the expense was for' },
        actual_amount: { type: 'number', description: 'Amount in rupees' },
        category: { type: 'string', description: 'Category: Venue, Photography, Makeup, Decor, Catering, Attire, Jewellery, Entertainment, Other' },
        payment_status: { type: 'string', description: 'paid or committed (default: committed)' },
      },
      required: ['actual_amount', 'description'],
    },
  },
  {
    name: 'mark_expense_paid',
    description: 'Mark an existing expense or vendor payment as paid.',
    input_schema: {
      type: 'object',
      properties: {
        vendor_name: { type: 'string', description: 'Vendor name to find and mark paid' },
        expense_id: { type: 'string', description: 'Specific expense ID if known' },
      },
      required: [],
    },
  },
  {
    name: 'add_vendor',
    description: "Add a vendor to the couple's vendor list manually (not from discovery).",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Vendor or business name' },
        category: { type: 'string', description: 'Category: Photography, MUA, Decor, Catering, Venue, Attire, Entertainment, Other' },
        phone: { type: 'string', description: 'Phone number (optional)' },
        quoted_total: { type: 'number', description: 'Quoted price in rupees (optional)' },
        status: { type: 'string', description: 'shortlisted, booked, or paid (default: shortlisted)' },
        events: { type: 'string', description: 'Which events this vendor covers e.g. Mehendi, Sangeet (optional)' },
      },
      required: ['name', 'category'],
    },
  },
  {
    name: 'update_vendor_status',
    description: "Update a vendor's status in the couple's vendor list.",
    input_schema: {
      type: 'object',
      properties: {
        vendor_name: { type: 'string', description: 'Name of vendor to update' },
        status: { type: 'string', description: 'New status: shortlisted, booked, or paid' },
      },
      required: ['vendor_name', 'status'],
    },
  },
  {
    name: 'add_guest',
    description: 'Add a guest to the wedding guest list.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Guest full name' },
        phone: { type: 'string', description: 'Phone number (optional)' },
        side: { type: 'string', description: 'bride or groom (optional)' },
        rsvp_status: { type: 'string', description: 'pending, confirmed, or declined (default: pending)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'send_enquiry',
    description: 'Send an enquiry message to a vendor on the platform.',
    input_schema: {
      type: 'object',
      properties: {
        vendor_id: { type: 'string', description: 'Vendor ID to send enquiry to' },
        message: { type: 'string', description: 'The enquiry message' },
      },
      required: ['vendor_id', 'message'],
    },
  },
  {
    name: 'query_budget',
    description: 'Check budget status — total, committed, paid, remaining, by category.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Optional — filter by category' },
      },
      required: [],
    },
  },
  {
    name: 'query_tasks',
    description: 'List pending or overdue tasks, optionally filtered by event.',
    input_schema: {
      type: 'object',
      properties: {
        filter: { type: 'string', description: 'overdue, upcoming, all (default: all)' },
        event: { type: 'string', description: 'Optional — filter by event name e.g. Mehendi' },
      },
      required: [],
    },
  },
  {
    name: 'query_vendors',
    description: "List the couple's vendors, optionally filtered by category or status.",
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Optional — filter by category' },
        status: { type: 'string', description: 'Optional — shortlisted, booked, paid' },
      },
      required: [],
    },
  },
  {
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
    description: 'Conversational reply when no action is needed — general wedding knowledge, advice, recommendations.',
    input_schema: {
      type: 'object',
      properties: {
        reply: { type: 'string', description: 'Response to the couple' },
      },
      required: ['reply'],
    },
  },
];"""

assert content.count(old_tools) == 1, "old_tools not found exactly once"
content = content.replace(old_tools, new_tools, 1)
print("✅ TDW_COUPLE_TOOLS replaced")

# ── 2. New executor cases ─────────────────────────────────────────────────────
old_executor = """      case 'general_reply':
        return toolInput.reply;

      case 'log_expense':"""

new_executor = """      case 'mark_expense_paid': {
        const { vendor_name, expense_id } = toolInput;
        const coupleId = vendor && vendor.id ? vendor.id : userId;
        if (expense_id) {
          await supabase.from('couple_expenses').update({ payment_status: 'paid' }).eq('id', expense_id);
          return "Marked as paid.";
        }
        if (vendor_name) {
          const { data: rows } = await supabase.from('couple_expenses')
            .select('id, vendor_name, actual_amount').eq('couple_id', coupleId)
            .ilike('vendor_name', '%' + vendor_name + '%')
            .neq('payment_status', 'paid');
          if (!rows || rows.length === 0) return "No unpaid expenses found for " + vendor_name + ".";
          await supabase.from('couple_expenses').update({ payment_status: 'paid' })
            .eq('couple_id', coupleId).ilike('vendor_name', '%' + vendor_name + '%');
          const total = rows.reduce(function(s, r) { return s + (r.actual_amount || 0); }, 0);
          return "Marked paid: " + rows.length + " expense(s) for " + vendor_name + " (Rs." + total.toLocaleString('en-IN') + " total)";
        }
        return "Please tell me which vendor or expense to mark as paid.";
      }

      case 'add_vendor': {
        const { name, category, phone = null, quoted_total = 0, status = 'shortlisted', events = null } = toolInput;
        const coupleId = vendor && vendor.id ? vendor.id : userId;
        const { error } = await supabase.from('couple_vendors').insert([{
          couple_id: coupleId, name, category, phone, quoted_total,
          status, events, source: 'manual',
        }]);
        if (error) throw error;
        return "Added " + name + " (" + category + ") to your vendors as " + status + "." + (quoted_total ? " Quoted: Rs." + quoted_total.toLocaleString('en-IN') : "");
      }

      case 'update_vendor_status': {
        const { vendor_name, status } = toolInput;
        const coupleId = vendor && vendor.id ? vendor.id : userId;
        const { data: rows } = await supabase.from('couple_vendors')
          .select('id, name').eq('couple_id', coupleId).ilike('name', '%' + vendor_name + '%').limit(1);
        if (!rows || rows.length === 0) return "Vendor " + vendor_name + " not found in your list. Add them first.";
        await supabase.from('couple_vendors').update({ status: status, updated_at: new Date().toISOString() }).eq('id', rows[0].id);
        return rows[0].name + " updated to " + status + ".";
      }

      case 'add_guest': {
        const { name, phone = null, side = null, rsvp_status = 'pending' } = toolInput;
        const coupleId = vendor && vendor.id ? vendor.id : userId;
        const { error } = await supabase.from('couple_guests').insert([{
          couple_id: coupleId, name, phone, side, rsvp_status,
        }]);
        if (error) throw error;
        return name + " added to your guest list" + (side ? " (" + side + " side)" : "") + ".";
      }

      case 'send_enquiry': {
        const { vendor_id, message } = toolInput;
        const coupleId = vendor && vendor.id ? vendor.id : userId;
        const { data: cp } = await supabase.from('users').select('name, wedding_date').eq('id', coupleId).maybeSingle();
        const { data: existing } = await supabase.from('vendor_enquiries')
          .select('id').eq('couple_id', coupleId).eq('vendor_id', vendor_id).maybeSingle();
        if (existing) {
          await supabase.from('vendor_enquiry_messages').insert([{ enquiry_id: existing.id, from_role: 'couple', content: message }]);
          await supabase.from('vendor_enquiries').update({
            last_message_at: new Date().toISOString(),
            last_message_preview: message.slice(0, 120),
            last_message_from: 'couple',
            vendor_unread_count: 1,
          }).eq('id', existing.id);
          return "Message sent to vendor.";
        }
        const { data: enq, error } = await supabase.from('vendor_enquiries').insert([{
          couple_id: coupleId, vendor_id, initial_message: message,
          wedding_date: cp ? cp.wedding_date : null,
          last_message_at: new Date().toISOString(),
          last_message_preview: message.slice(0, 120),
          last_message_from: 'couple',
          vendor_unread_count: 1,
        }]).select().single();
        if (error) throw error;
        await supabase.from('vendor_enquiry_messages').insert([{ enquiry_id: enq.id, from_role: 'couple', content: message }]);
        return "Enquiry sent! You will see replies in Messages.";
      }

      case 'query_budget': {
        const { category } = toolInput;
        const coupleId = vendor && vendor.id ? vendor.id : userId;
        const { data: expenses } = await supabase.from('couple_expenses')
          .select('vendor_name, actual_amount, payment_status, category').eq('couple_id', coupleId);
        const { data: profile } = await supabase.from('couple_profiles')
          .select('total_budget').eq('user_id', coupleId).maybeSingle();
        const totalBudget = profile && profile.total_budget ? profile.total_budget : 0;
        const all = expenses || [];
        if (category) {
          const catExp = all.filter(function(e) { return e.category && e.category.toLowerCase().includes(category.toLowerCase()); });
          const spent = catExp.reduce(function(s, e) { return s + (e.actual_amount || 0); }, 0);
          return category + ": Rs." + spent.toLocaleString('en-IN') + " logged across " + catExp.length + " expense(s).";
        }
        const committed = all.filter(function(e) { return e.payment_status === 'committed' || e.payment_status === 'paid'; })
          .reduce(function(s, e) { return s + (e.actual_amount || 0); }, 0);
        const paid = all.filter(function(e) { return e.payment_status === 'paid'; })
          .reduce(function(s, e) { return s + (e.actual_amount || 0); }, 0);
        const remaining = totalBudget - committed;
        const pct = totalBudget > 0 ? Math.round((committed / totalBudget) * 100) : 0;
        const overBudget = remaining < 0 ? " WARNING: Over budget!" : "";
        return "Budget: Rs." + totalBudget.toLocaleString('en-IN') + " total. Committed: Rs." + committed.toLocaleString('en-IN') + " (" + pct + "%). Paid: Rs." + paid.toLocaleString('en-IN') + ". Remaining: Rs." + remaining.toLocaleString('en-IN') + "." + overBudget;
      }

      case 'query_tasks': {
        const { filter = 'all', event } = toolInput;
        const coupleId = vendor && vendor.id ? vendor.id : userId;
        const todayStr = new Date().toISOString().slice(0, 10);
        let q = supabase.from('couple_checklist').select('id, text, due_date, event, priority')
          .eq('couple_id', coupleId).eq('is_complete', false).order('due_date', { ascending: true });
        if (event) q = q.ilike('event', '%' + event + '%');
        const { data: tasks } = await q;
        let filtered = tasks || [];
        if (filter === 'overdue') filtered = filtered.filter(function(t) { return t.due_date && t.due_date < todayStr; });
        else if (filter === 'upcoming') filtered = filtered.filter(function(t) { return t.due_date && t.due_date >= todayStr; });
        if (filtered.length === 0) return filter === 'overdue' ? "No overdue tasks! You are on track." : "No pending tasks found.";
        const lines = filtered.slice(0, 10).map(function(t) {
          const overdue = t.due_date && t.due_date < todayStr ? " [OVERDUE]" : "";
          return "- " + t.text + (t.due_date ? " (due " + t.due_date + ")" : "") + overdue;
        });
        const label = filter === 'overdue' ? 'Overdue' : filter === 'upcoming' ? 'Upcoming' : 'Pending';
        const eventLabel = event ? " for " + event : "";
        const more = filtered.length > 10 ? " ...and " + (filtered.length - 10) + " more." : "";
        return label + " tasks" + eventLabel + " (" + filtered.length + "):" + " " + lines.join(", ") + more;
      }

      case 'query_vendors': {
        const { category, status } = toolInput;
        const coupleId = vendor && vendor.id ? vendor.id : userId;
        let q = supabase.from('couple_vendors').select('name, category, status, quoted_total, events').eq('couple_id', coupleId);
        if (category) q = q.ilike('category', '%' + category + '%');
        if (status) q = q.eq('status', status);
        const { data: vlist } = await q.order('created_at', { ascending: false });
        const v = vlist || [];
        if (v.length === 0) return "No vendors found" + (category ? " for " + category : "") + (status ? " with status " + status : "") + ". Ask me to add one!";
        const lines = v.map(function(vn) {
          return vn.name + " — " + vn.category + " / " + vn.status + (vn.quoted_total ? " / Rs." + vn.quoted_total.toLocaleString('en-IN') : "");
        });
        return "Your vendors (" + v.length + "): " + lines.join("; ");
      }

      case 'general_reply':
        return toolInput.reply;

      case 'log_expense':"""

assert content.count(old_executor) == 1, "old_executor not found exactly once"
content = content.replace(old_executor, new_executor, 1)
print("✅ New executor cases added")

# ── 3. QUERY_TOOLS — reads only ───────────────────────────────────────────────
old_query = "      const QUERY_TOOLS = ['query_schedule', 'query_revenue', 'query_clients', 'general_reply', 'save_to_muse', 'complete_task', 'add_expense'];"
new_query = "      const QUERY_TOOLS = ['query_schedule', 'query_revenue', 'query_clients', 'general_reply', 'save_to_muse', 'query_budget', 'query_tasks', 'query_vendors'];"

assert content.count(old_query) == 1, "old_query not found exactly once"
content = content.replace(old_query, new_query, 1)
print("✅ QUERY_TOOLS fixed")

# ── 4. mapToolToAction ────────────────────────────────────────────────────────
old_map = """    add_expense: {
      type: 'add_expense', requiresConfirmation: true,
      label: 'Log Expense',
      preview: `Log ₹${(input.actual_amount||0).toLocaleString('en-IN')} expense`,
      params: input,
      description: `I'll log this wedding expense.`,
    },
  };"""

new_map = """    add_expense: {
      type: 'add_expense', requiresConfirmation: true,
      label: 'Log Expense',
      preview: `Log ₹${(input.actual_amount||0).toLocaleString('en-IN')} expense`,
      params: input,
      description: `I'll log this wedding expense.`,
    },
    mark_expense_paid: {
      type: 'mark_expense_paid', requiresConfirmation: true,
      label: 'Mark Paid',
      preview: 'Mark ' + (input.vendor_name || 'expense') + ' as paid',
      params: input,
      description: "I'll mark this as paid.",
    },
    add_vendor: {
      type: 'add_vendor', requiresConfirmation: true,
      label: 'Add Vendor',
      preview: 'Add ' + input.name + ' (' + input.category + ') to vendors',
      params: input,
      description: "I'll add this vendor to your list.",
    },
    update_vendor_status: {
      type: 'update_vendor_status', requiresConfirmation: true,
      label: 'Update Vendor',
      preview: 'Update ' + input.vendor_name + ' to ' + input.status,
      params: input,
      description: "I'll update this vendor's status.",
    },
    add_guest: {
      type: 'add_guest', requiresConfirmation: true,
      label: 'Add Guest',
      preview: 'Add ' + input.name + ' to guest list',
      params: input,
      description: "I'll add this guest.",
    },
    send_enquiry: {
      type: 'send_enquiry', requiresConfirmation: true,
      label: 'Send Enquiry',
      preview: 'Send enquiry to vendor',
      params: input,
      description: "I'll send this enquiry.",
    },
    query_budget: { type: 'query_budget', requiresConfirmation: false, params: input },
    query_tasks: { type: 'query_tasks', requiresConfirmation: false, params: input },
    query_vendors: { type: 'query_vendors', requiresConfirmation: false, params: input },
  };"""

assert content.count(old_map) == 1, "old_map not found exactly once"
content = content.replace(old_map, new_map, 1)
print("✅ mapToolToAction updated")

with open(path, 'w') as f:
    f.write(content)
print("✅ server.js written")
