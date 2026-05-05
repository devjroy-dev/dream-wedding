#!/usr/bin/env python3
"""
TDW Backend Patch — Fix broken .or() query in clients list endpoint
This was causing clients to appear empty even though they exist in DB.
Drop in /workspaces/dream-wedding and run:
  python3 patch_clients_list.py
"""

content = open('backend/server.js', 'r').read()

old = "        supabase.from('vendor_invoices').select('amount, total_amount, status, client_id').eq('vendor_id', vendorId).or(`client_id.eq.${c.id},client_name.ilike.${encodeURIComponent(c.name)}`),"

new = """        // Fetch invoices by client_name (primary) — safe, no broken .or() syntax
        supabase.from('vendor_invoices').select('amount, total_amount, status, client_id').eq('vendor_id', vendorId).ilike('client_name', c.name),"""

if old in content:
    content = content.replace(old, new)
    open('backend/server.js', 'w').write(content)
    print('Fix applied: clients list now uses simple ilike query — no broken .or()')
    print('Run: git add -A && git commit -m "Fix: remove broken or() from clients list — clients now appear correctly" && git push')
else:
    print('ERROR: query not found — may already be fixed or text differs')
    # Show what's actually there
    import re
    matches = re.findall(r'supabase\.from\(.vendor_invoices.\)\.select\([^)]+\)\.eq\(.vendor_id., vendorId\)[^\n]+', content)
    for m in matches[:5]:
        print('FOUND:', m[:100])
