#!/usr/bin/env python3
"""
Item 1 — Fix budget-categories POST handler.
Replaces the rows mapping that passes unknown 'label' column to Supabase.
Run from /workspaces/dream-wedding
"""
import sys

FILE = 'backend/server.js'

OLD = "const rows = categories.map(c => ({ couple_id: userId, category_key: c.category_key || c.key || '', display_name: c.display_name || c.label || c.category_key || '', allocated_amount: c.allocated_amount || 0, pct: c.pct || 0 }));"

NEW = "const rows = categories.map(c => ({ couple_id: userId, category_key: String(c.category_key || c.key || ''), display_name: String(c.display_name || c.label || c.category_key || ''), allocated_amount: Number(c.allocated_amount || 0), pct: Number(c.pct || 0) }));"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

count = content.count(OLD)
if count == 0:
    print("ERROR: Target string not found. File may already be patched or handler differs.")
    sys.exit(1)
if count > 1:
    print(f"ERROR: Found {count} matches — expected exactly 1. Aborting.")
    sys.exit(1)

fixed = content.replace(OLD, NEW)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(fixed)

print("✓ Budget categories rows mapping patched — label column removed from insert")
