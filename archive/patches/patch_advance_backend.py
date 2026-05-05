#!/usr/bin/env python3
"""
TDW Backend Patch — Include advance payment in totalPaid in clients list
Drop in /workspaces/dream-wedding and run:
  python3 patch_advance_backend.py
"""

content = open('backend/server.js', 'r').read()

old = """      const totalInvoiced = (invoices || []).reduce((s, i) => s + (i.amount || 0), 0);
      const totalPaid = (invoices || []).filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);"""

new = """      const totalInvoiced = (invoices || []).reduce((s, i) => s + (i.amount || 0), 0);
      // Include advance payments stored in description field
      const getInvoicePaid = (inv) => {
        if (inv.status === 'paid') return inv.amount || 0;
        if (inv.description) {
          const m = inv.description.match(/Advance received[:\\s]*[\\u20B9]?([\\d,]+)/i);
          if (m) return parseInt(m[1].replace(/,/g, '')) || 0;
        }
        return 0;
      };
      const totalPaid = (invoices || []).reduce((s, i) => s + getInvoicePaid(i), 0);"""

if old in content:
    content = content.replace(old, new)
    open('backend/server.js', 'w').write(content)
    print('Fix applied: clients list now includes advance in totalPaid')
    print('Run: git add -A && git commit -m "Fix: include advance payment in client card paid amount" && git push')
else:
    print('ERROR: text not found')
