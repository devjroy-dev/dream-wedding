with open('backend/agentic/wedding/vendor/dispatcher.js', 'r') as f:
    content = f.read()

# Step 1: add require imports after the existing four
old_requires = """const { sendPaymentReminder } = require('./toolHandlers/sendPaymentReminder');
const { logExpense } = require('./toolHandlers/logExpense');
const { replyToEnquiry } = require('./toolHandlers/replyToEnquiry');
const { recordPayment } = require('./toolHandlers/recordPayment');"""

new_requires = """const { sendPaymentReminder } = require('./toolHandlers/sendPaymentReminder');
const { logExpense } = require('./toolHandlers/logExpense');
const { replyToEnquiry } = require('./toolHandlers/replyToEnquiry');
const { recordPayment } = require('./toolHandlers/recordPayment');

// Session 7 — edit/delete mutations
const { editInvoice } = require('./toolHandlers/editInvoice');
const { deleteInvoice } = require('./toolHandlers/deleteInvoice');
const { editExpense } = require('./toolHandlers/editExpense');
const { deleteExpense } = require('./toolHandlers/deleteExpense');
const { editClient } = require('./toolHandlers/editClient');
const { deleteClient } = require('./toolHandlers/deleteClient');

// Session 7 — money depth reads
const { queryTaxSummary } = require('./toolHandlers/queryTaxSummary');
const { queryTdsStatus } = require('./toolHandlers/queryTdsStatus');

// Session 7 — PWA parity reads
const { enquiryInboxSummary } = require('./toolHandlers/enquiryInboxSummary');
const { hotDatesContext } = require('./toolHandlers/hotDatesContext');
const { readClientMessages } = require('./toolHandlers/readClientMessages');"""

assert content.count(old_requires) == 1, f"Anchor 1 not unique: {content.count(old_requires)} matches"
content = content.replace(old_requires, new_requires)

# Step 2: add 11 new cases before the default
old_default = """    default:
      return 'Unknown tool: ' + toolName;
  }
}

module.exports = { dispatchTool };"""

new_default = """    // ─── Session 7: edit/delete mutations ──────────────────────────────────
    case 'wedding_edit_invoice':
      return await editInvoice(vendor.id, toolInput);
    case 'wedding_delete_invoice':
      return await deleteInvoice(vendor.id, toolInput);
    case 'wedding_edit_expense':
      return await editExpense(vendor.id, toolInput);
    case 'wedding_delete_expense':
      return await deleteExpense(vendor.id, toolInput);
    case 'wedding_edit_client':
      return await editClient(vendor.id, toolInput);
    case 'wedding_delete_client':
      return await deleteClient(vendor.id, toolInput);

    // ─── Session 7: money depth reads ────────────────────────────────────
    case 'wedding_query_tax_summary':
      return await queryTaxSummary(vendor.id, toolInput);
    case 'wedding_query_tds_status':
      return await queryTdsStatus(vendor.id, toolInput);

    // ─── Session 7: PWA parity reads ─────────────────────────────────────
    case 'wedding_enquiry_inbox_summary':
      return await enquiryInboxSummary(vendor.id, toolInput);
    case 'wedding_hot_dates_context':
      return await hotDatesContext(toolInput);
    case 'wedding_read_client_messages':
      return await readClientMessages(vendor.id, toolInput);

    default:
      return 'Unknown tool: ' + toolName;
  }
}

module.exports = { dispatchTool };"""

assert content.count(old_default) == 1, f"Anchor 2 not unique: {content.count(old_default)} matches"
content = content.replace(old_default, new_default)

with open('backend/agentic/wedding/vendor/dispatcher.js', 'w') as f:
    f.write(content)
print("Patched: dispatcher.js")
