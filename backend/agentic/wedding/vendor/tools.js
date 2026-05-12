// backend/agentic/wedding/vendor/tools.js
//
// Anthropic tool schemas for the v3 vendor agentic loop. Lifted verbatim
// from server.js (Session 1 lines 18529-18649). Names and descriptions are
// load-bearing for the model's tool-selection behavior — do not edit without
// a coordinated change to the system prompt's WHEN TO ACT vs CONFIRM rules.
//
// Tool names are wedding_*-prefixed (Session 3, 2026-05-12) for multi-vertical
// disambiguation. Dispatcher accepts deprecated unprefixed names via alias map.
//
// Note: `wedding_block_date` is the spec name; the underlying executor case in
// server.js executeToolCall is `block_calendar_dates` (unchanged — shared
// dispatcher, out of scope). The dispatcher in ./dispatcher.js maps between them.

const TDW_VENDOR_CHAT_TOOLS = [
  {
    name: 'wedding_create_invoice',
    description: 'Create a GST-compliant invoice for a client. Internal op — execute directly.',
    input_schema: {
      type: 'object',
      properties: {
        client_name: { type: 'string', description: 'Client or couple name' },
        amount: { type: 'number', description: 'Total amount in rupees' },
        advance_received: { type: 'number', description: 'Advance already paid (default 0)' },
        event_type: { type: 'string', description: 'Wedding, engagement, shoot, etc.' },
      },
      required: ['client_name', 'amount'],
    },
  },
  {
    name: 'wedding_add_client',
    description: 'Add a new client to the vendor CRM. Internal op — execute directly.',
    input_schema: {
      type: 'object',
      properties: {
        client_name: { type: 'string', description: 'Client or couple name' },
        phone: { type: 'string', description: 'Phone number (optional)' },
        event_date: { type: 'string', description: 'YYYY-MM-DD (optional)' },
        event_type: { type: 'string', description: 'Wedding, engagement, etc.' },
        budget: { type: 'number', description: 'Budget in rupees (optional)' },
      },
      required: ['client_name'],
    },
  },
  {
    name: 'wedding_create_task',
    description: 'Create a task for the vendor or a team member. Internal op — execute directly.',
    input_schema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Task description' },
        assignee: { type: 'string', description: 'Team member name (optional)' },
        due_date: { type: 'string', description: 'YYYY-MM-DD (optional)' },
      },
      required: ['task'],
    },
  },
  {
    name: 'wedding_block_date',
    description: 'Block one or more dates on the vendor calendar. Internal op — execute directly.',
    input_schema: {
      type: 'object',
      properties: {
        client_name: { type: 'string', description: 'Client or couple name (use "Blocked" if generic)' },
        dates: { type: 'array', items: { type: 'string' }, description: 'YYYY-MM-DD strings' },
        notes: { type: 'string', description: 'Optional notes' },
      },
      required: ['client_name', 'dates'],
    },
  },
  {
    name: 'wedding_send_payment_reminder',
    description: 'Send a WhatsApp payment-due reminder to a client. Externally visible — confirm with the user before calling.',
    input_schema: {
      type: 'object',
      properties: {
        client_name: { type: 'string', description: 'Client to remind' },
        amount: { type: 'number', description: 'Amount due in rupees (optional)' },
        custom_message: { type: 'string', description: 'Override the default template (optional)' },
      },
      required: ['client_name'],
    },
  },
  {
    name: 'wedding_send_client_reminder',
    description: 'Send a WhatsApp reminder to a client for fitting, meeting, event, or payment. Externally visible — confirm with the user before calling.',
    input_schema: {
      type: 'object',
      properties: {
        client_name: { type: 'string', description: 'Client to remind' },
        reminder_type: { type: 'string', description: 'payment | fitting | meeting | event | custom' },
        custom_message: { type: 'string', description: 'Override the default template (optional)' },
      },
      required: ['client_name', 'reminder_type'],
    },
  },
  {
    name: 'wedding_log_expense',
    description: 'Log a business expense. Internal op — execute directly.',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'What the expense was for' },
        amount: { type: 'number', description: 'Amount in rupees' },
        category: { type: 'string', description: 'Expense category (optional, default general)' },
        date: { type: 'string', description: 'YYYY-MM-DD (optional, default today)' },
      },
      required: ['description', 'amount'],
    },
  },
  {
    name: 'wedding_reply_to_enquiry',
    description: 'Reply to a pending couple enquiry via WhatsApp and mark it replied. Externally visible — confirm with the user before calling.',
    input_schema: {
      type: 'object',
      properties: {
        enquiry_id: { type: 'string', description: 'Enquiry ID to reply to' },
        message: { type: 'string', description: 'Reply message text' },
      },
      required: ['enquiry_id', 'message'],
    },
  },
  {
    name: 'wedding_record_payment',
    description: 'Mark an invoice as paid. Internal op — execute directly.',
    input_schema: {
      type: 'object',
      properties: {
        client_name: { type: 'string', description: 'Client name (use if invoice_id not known)' },
        invoice_id: { type: 'string', description: 'Specific invoice ID (preferred)' },
        amount: { type: 'number', description: 'Amount paid in rupees (optional)' },
      },
    },
  },

  // ─── Session 7 — edit/delete mutations ───────────────────────────────────
  {
    name: 'wedding_edit_invoice',
    description: 'Edit an existing invoice (amount, due date, status, description). Internal op — execute directly.',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id:  { type: 'string', description: 'Invoice ID (preferred)' },
        client_name: { type: 'string', description: 'Client name — finds latest unpaid invoice if invoice_id not given' },
        amount:      { type: 'number', description: 'New amount in rupees (optional)' },
        due_date:    { type: 'string', description: 'New due date YYYY-MM-DD, or empty string to clear (optional)' },
        status:      { type: 'string', description: 'New status: pending | unpaid | paid (optional)' },
        description: { type: 'string', description: 'New description text (optional)' },
      },
    },
  },
  {
    name: 'wedding_delete_invoice',
    description: 'Delete an invoice permanently. Internal op — execute directly.',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id:  { type: 'string', description: 'Invoice ID (preferred)' },
        client_name: { type: 'string', description: 'Client name — finds a single invoice if invoice_id not given' },
      },
    },
  },
  {
    name: 'wedding_edit_expense',
    description: 'Edit an existing expense (amount, category, date, description). Internal op — execute directly.',
    input_schema: {
      type: 'object',
      properties: {
        expense_id:        { type: 'string', description: 'Expense ID (preferred)' },
        description_match: { type: 'string', description: 'Substring of existing description — used if expense_id not given' },
        amount:            { type: 'number', description: 'New amount in rupees (optional)' },
        category:          { type: 'string', description: 'New category (optional)' },
        expense_date:      { type: 'string', description: 'New date YYYY-MM-DD (optional)' },
        description:       { type: 'string', description: 'New description text (optional)' },
      },
    },
  },
  {
    name: 'wedding_delete_expense',
    description: 'Delete an expense permanently. Internal op — execute directly.',
    input_schema: {
      type: 'object',
      properties: {
        expense_id:        { type: 'string', description: 'Expense ID (preferred)' },
        description_match: { type: 'string', description: 'Substring of existing description — used if expense_id not given' },
      },
    },
  },
  {
    name: 'wedding_edit_client',
    description: 'Edit an existing client (name, phone, event date, event type, status, budget, venue, notes). Internal op — execute directly.',
    input_schema: {
      type: 'object',
      properties: {
        client_id:   { type: 'string', description: 'Client ID (preferred)' },
        client_name: { type: 'string', description: 'Existing client name — used if client_id not given' },
        name:        { type: 'string', description: 'New name (optional)' },
        phone:       { type: 'string', description: 'New phone (optional)' },
        event_date:  { type: 'string', description: 'New event date YYYY-MM-DD, or empty string to clear (optional)' },
        event_type:  { type: 'string', description: 'New event type (optional)' },
        status:      { type: 'string', description: 'New status (optional)' },
        budget:      { type: 'number', description: 'New budget in rupees (optional)' },
        venue:       { type: 'string', description: 'New venue (optional)' },
        notes:       { type: 'string', description: 'New notes (optional)' },
      },
    },
  },
  {
    name: 'wedding_delete_client',
    description: 'Delete a client permanently. Their invoices and expenses remain on file. Internal op — execute directly.',
    input_schema: {
      type: 'object',
      properties: {
        client_id:   { type: 'string', description: 'Client ID (preferred)' },
        client_name: { type: 'string', description: 'Client name — used if client_id not given' },
      },
    },
  },

  // ─── Session 8.5e — edit tools for tasks and calendar events ───────────────
  {
    name: 'wedding_edit_task',
    description: 'Edit an existing task (title, due date, done/not-done, priority, assigned_to). Internal op — execute directly.',
    input_schema: {
      type: 'object',
      properties: {
        task_id:     { type: 'string', description: 'Task ID (preferred)' },
        title_match: { type: 'string', description: 'Substring of existing task title — used if task_id not given' },
        title:       { type: 'string', description: 'New title (optional)' },
        due_date:    { type: 'string', description: 'New due date YYYY-MM-DD, or empty string to clear (optional)' },
        done:        { type: 'boolean', description: 'Mark task complete (true) or incomplete (false) (optional)' },
        priority:    { type: 'string', description: 'New priority: low | med | high (optional)' },
        assigned_to: { type: 'string', description: 'Name to assign task to (optional)' },
      },
    },
  },
  {
    name: 'wedding_edit_calendar_event',
    description: 'Edit an existing calendar event (title, date, time, type, client, notes, amount). Internal op — execute directly.',
    input_schema: {
      type: 'object',
      properties: {
        event_id:    { type: 'string', description: 'Event ID (preferred)' },
        title_match: { type: 'string', description: 'Substring of existing event title — used if event_id not given' },
        title:       { type: 'string', description: 'New title (optional)' },
        event_date:  { type: 'string', description: 'New date YYYY-MM-DD (optional)' },
        event_time:  { type: 'string', description: 'New time e.g. "14:00", or empty string to clear (optional)' },
        type:        { type: 'string', description: 'New event type e.g. wedding | shoot | meeting | generic (optional)' },
        client_name: { type: 'string', description: 'New client name, or empty string to clear (optional)' },
        notes:       { type: 'string', description: 'New notes, or empty string to clear (optional)' },
        amount:      { type: 'number', description: 'New amount in rupees (optional)' },
      },
    },
  },

  // ─── Session 7 — money depth reads ───────────────────────────────────────
  {
    name: 'wedding_query_tax_summary',
    description: 'Return GST collected, GST input credit estimate, net GST liability, and TDS deducted for a quarter. Read-only — answer immediately.',
    input_schema: {
      type: 'object',
      properties: {
        quarter:        { type: 'string', description: '1 | 2 | 3 | 4 (Q1=Apr-Jun). Defaults to current quarter.' },
        financial_year: { type: 'string', description: 'e.g. "FY 2025-26" or "2025". Defaults to current FY.' },
      },
    },
  },
  {
    name: 'wedding_query_tds_status',
    description: 'Return TDS ledger entries — rate, amount, deductor, deposited status, financial year. Read-only — answer immediately.',
    input_schema: {
      type: 'object',
      properties: {
        invoice_id:  { type: 'string', description: 'Specific invoice ID (optional)' },
        client_name: { type: 'string', description: 'Client who deducted TDS (optional)' },
      },
    },
  },

  // ─── Session 7 — PWA parity reads ────────────────────────────────────────
  {
    name: 'wedding_enquiry_inbox_summary',
    description: 'Return enquiry counts by status plus the most recent pending entries. Read-only — answer immediately.',
    input_schema: {
      type: 'object',
      properties: {
        limit_pending: { type: 'number', description: 'How many recent pending enquiries to list (default 5, max 10)' },
      },
    },
  },
  {
    name: 'wedding_hot_dates_context',
    description: 'Return upcoming Vivah Muhurat (auspicious Hindu wedding) dates within a configurable window. Read-only — answer immediately.',
    input_schema: {
      type: 'object',
      properties: {
        months_ahead: { type: 'number', description: 'How many months ahead to look (default 3, max 12)' },
        tradition:    { type: 'string', description: 'Tradition filter e.g. "North Indian" (optional)' },
        region:       { type: 'string', description: 'Region filter e.g. "All India" (optional)' },
      },
    },
  },
  {
    name: 'wedding_read_client_messages',
    description: 'Read the last N messages exchanged with a client. Read-only — answer immediately.',
    input_schema: {
      type: 'object',
      properties: {
        client_name: { type: 'string', description: 'Client or couple name' },
        last_n:      { type: 'number', description: 'How many messages to return (default 10, max 20)' },
      },
      required: ['client_name'],
    },
  },
];

module.exports = { TDW_VENDOR_CHAT_TOOLS };
