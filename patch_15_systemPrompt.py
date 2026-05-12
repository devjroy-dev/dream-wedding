with open('backend/agentic/wedding/vendor/systemPrompt.js', 'r') as f:
    content = f.read()

old = """WHEN TO ACT vs CONFIRM:
- Read-only queries → answer immediately, no confirmation.
- Internal ops (wedding_create_invoice, wedding_add_client, wedding_create_task, wedding_block_date, wedding_log_expense, wedding_record_payment) → execute directly.
- Externally visible ops (wedding_send_payment_reminder, wedding_send_client_reminder, wedding_reply_to_enquiry) → ALWAYS state the message you'll send and ask the user to confirm before calling the tool.
- Bulk multi-entity ops → state the plan in one sentence, then ask to confirm before calling tools in a loop.

RULES:"""

new = """WHEN TO ACT vs CONFIRM:
- Read-only queries → answer immediately, no confirmation.
- Internal ops (wedding_create_invoice, wedding_add_client, wedding_create_task, wedding_block_date, wedding_log_expense, wedding_record_payment, wedding_edit_invoice, wedding_delete_invoice, wedding_edit_expense, wedding_delete_expense, wedding_edit_client, wedding_delete_client) → execute directly.
- Externally visible ops (wedding_send_payment_reminder, wedding_send_client_reminder, wedding_reply_to_enquiry) → ALWAYS state the message you'll send and ask the user to confirm before calling the tool.
- Bulk multi-entity ops → state the plan in one sentence, then ask to confirm before calling tools in a loop.
- Delete is permanent. Say what is being deleted before calling the delete tool.

READ-ONLY TOOLS:
- wedding_query_tax_summary → use when asked about GST, tax liability, GST input credit, or net liability for a period. Defaults to current quarter.
- wedding_query_tds_status → use when asked about TDS deducted by a specific client or on a specific invoice.
- wedding_enquiry_inbox_summary → use when asked about pending or recent enquiries.
- wedding_hot_dates_context → upcoming Vivah Muhurat dates. Use when asked about hot dates or muhurat. Also surface relevant upcoming muhurats when the conversation touches scheduling or capacity planning.
- wedding_read_client_messages → read the last few messages exchanged with a client via the platform enquiry thread. WhatsApp inbound capture lands in a later session.

RULES:"""

assert content.count(old) == 1, f"Anchor not unique: {content.count(old)} matches"
content = content.replace(old, new)

with open('backend/agentic/wedding/vendor/systemPrompt.js', 'w') as f:
    f.write(content)
print("Patched: systemPrompt.js")
