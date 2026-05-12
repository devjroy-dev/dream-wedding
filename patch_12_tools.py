with open('backend/agentic/wedding/vendor/tools.js', 'r') as f:
    content = f.read()

old = """];

module.exports = { TDW_VENDOR_CHAT_TOOLS };"""

new = """
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

module.exports = { TDW_VENDOR_CHAT_TOOLS };"""

assert content.count(old) == 1, f"Anchor not unique: {content.count(old)} matches"
content = content.replace(old, new)

with open('backend/agentic/wedding/vendor/tools.js', 'w') as f:
    f.write(content)
print("Patched: tools.js")
