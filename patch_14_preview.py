with open('backend/agentic/wedding/vendor/preview.js', 'r') as f:
    content = f.read()

old = """    default:
      return 'Run ' + toolName;
  }
}

module.exports = { buildToolPreview };"""

new = """    // ─── Session 7: edit/delete mutations ──────────────────────────────────
    case 'wedding_edit_invoice': {
      const ref  = input.invoice_id ? '#' + safe(input.invoice_id, 10) : safe(input.client_name);
      const parts = [];
      if (input.amount != null) parts.push(fmtRs(input.amount));
      if (input.status)         parts.push(input.status);
      if (input.due_date)       parts.push('due ' + input.due_date);
      const tail = parts.length ? ' → ' + parts.join(', ') : '';
      return ref ? 'Edit invoice (' + ref + ')' + tail : 'Edit invoice' + tail;
    }
    case 'wedding_delete_invoice': {
      const ref = input.invoice_id ? '#' + safe(input.invoice_id, 10) : safe(input.client_name);
      return ref ? 'Delete invoice — ' + ref : 'Delete invoice';
    }
    case 'wedding_edit_expense': {
      const ref   = input.expense_id ? '#' + safe(input.expense_id, 10) : safe(input.description_match, 30);
      const parts = [];
      if (input.amount != null) parts.push(fmtRs(input.amount));
      if (input.category)       parts.push(input.category);
      if (input.expense_date)   parts.push(input.expense_date);
      const tail = parts.length ? ' → ' + parts.join(', ') : '';
      return ref ? 'Edit expense (' + ref + ')' + tail : 'Edit expense' + tail;
    }
    case 'wedding_delete_expense': {
      const ref = input.expense_id ? '#' + safe(input.expense_id, 10) : safe(input.description_match, 30);
      return ref ? 'Delete expense — ' + ref : 'Delete expense';
    }
    case 'wedding_edit_client': {
      const ref   = input.client_id ? '#' + safe(input.client_id, 10) : safe(input.client_name);
      const parts = [];
      if (input.name)           parts.push('name ' + safe(input.name, 20));
      if (input.phone)          parts.push('phone updated');
      if (input.event_date)     parts.push('date ' + input.event_date);
      if (input.status)         parts.push('status ' + input.status);
      if (input.budget != null) parts.push(fmtRs(input.budget));
      const tail = parts.length ? ' → ' + parts.join(', ') : '';
      return ref ? 'Edit client (' + ref + ')' + tail : 'Edit client' + tail;
    }
    case 'wedding_delete_client': {
      const ref = input.client_id ? '#' + safe(input.client_id, 10) : safe(input.client_name);
      return ref ? 'Delete client — ' + ref : 'Delete client';
    }

    default:
      return 'Run ' + toolName;
  }
}

module.exports = { buildToolPreview };"""

assert content.count(old) == 1, f"Anchor not unique: {content.count(old)} matches"
content = content.replace(old, new)

with open('backend/agentic/wedding/vendor/preview.js', 'w') as f:
    f.write(content)
print("Patched: preview.js")
