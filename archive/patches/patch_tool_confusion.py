#!/usr/bin/env python3
"""
TDW Backend Patch — Fix tool confusion between create_invoice and record_payment
Also fix clients list to include description in invoice select.
Drop in /workspaces/dream-wedding and run:
  python3 patch_tool_confusion.py
"""

content = open('backend/server.js', 'r').read()
fixes = 0

# Fix 1: Clarify create_invoice — for NEW work, new bookings
old1 = "    name: 'create_invoice',\n    description: 'Create a GST-compliant invoice for a client. Use when vendor asks to create an invoice OR when money is received FROM a client (\"X received from client\", \"client paid X\", \"X mila\", \"X payment aaya\"). NEVER use log_expense for money received from clients — that is always an invoice.',"
new1 = "    name: 'create_invoice',\n    description: 'Create a NEW GST-compliant invoice for a client. Use for NEW work or NEW bookings. Examples: \"create invoice for Priya 2 lakh\", \"new booking for Salil 1 lakh\", \"bill Sharma for wedding\". If the vendor mentions a total amount AND an advance received together — create the invoice with advance_received field. NEVER use for updating an existing invoice — use record_payment for that.',"

if old1 in content:
    content = content.replace(old1, new1)
    print('Fix 1: create_invoice description clarified for new bookings')
    fixes += 1
else:
    print('Fix 1 ERROR: create_invoice description not found')

# Fix 2: Restrict record_payment to ONLY existing clients with invoices
old2 = "    name: 'record_payment',\n    description: 'Record a payment received against an EXISTING invoice. Use ONLY when the client already has an invoice and the vendor says they received payment, e.g. \"Salil paid 20k\", \"received 50k from Priya\", \"20k milaa Salil se\". Do NOT use this to create a new invoice — use create_invoice for new work. This updates the existing invoice status.',"
new2 = "    name: 'record_payment',\n    description: 'Record a payment against an EXISTING invoice for an EXISTING client. Use ONLY for standalone payment messages like \"Priya paid 50k\", \"Sharma ne 20k diya\", \"collected payment from X\" — where NO new booking or new work is being created. NEVER use when creating a new booking or new invoice. If unsure, use create_invoice instead.',"

if old2 in content:
    content = content.replace(old2, new2)
    print('Fix 2: record_payment description restricted to standalone payments only')
    fixes += 1
else:
    print('Fix 2 ERROR: record_payment description not found')

# Fix 3: Fix clients list invoice select to include description field
old3 = "        // Fetch invoices by client_name (primary) — safe, no broken .or() syntax\n        supabase.from('vendor_invoices').select('amount, total_amount, status, client_id').eq('vendor_id', vendorId).ilike('client_name', c.name),"
new3 = "        // Fetch invoices by client_name — include description for advance parsing\n        supabase.from('vendor_invoices').select('amount, total_amount, status, client_id, description').eq('vendor_id', vendorId).ilike('client_name', c.name),"

if old3 in content:
    content = content.replace(old3, new3)
    print('Fix 3: clients list invoice select now includes description field')
    fixes += 1
else:
    print('Fix 3 ERROR: clients list invoice select not found')

open('backend/server.js', 'w').write(content)
print(f'\n✓ {fixes}/3 fixes applied.')
print('Run: git add -A && git commit -m "Fix: tool confusion create_invoice vs record_payment + description in invoice select" && git push')
