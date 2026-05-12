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
];

module.exports = { TDW_VENDOR_CHAT_TOOLS };
