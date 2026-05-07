#!/bin/bash
# patch_dreamai_actions.sh
# Adds V6 couple DreamAi action endpoints to dream-wedding/backend/server.js
# Source: commit c9d28dc
# Endpoints:
#   POST /api/v2/dreamai/couple-action/complete-task
#   POST /api/v2/dreamai/couple-action/mark-expense-paid
#   POST /api/v2/dreamai/couple-action/update-vendor-status
#   POST /api/v2/dreamai/couple-action/send-enquiry
# Run from: /workspaces/dream-wedding

set -e
FILE="backend/server.js"

echo "=== SAFETY CHECKS ==="
if [ ! -f "$FILE" ]; then echo "ERROR: $FILE not found."; exit 1; fi
EXPRESS_COUNT=$(grep -c "const express" "$FILE" || true)
echo "express count: $EXPRESS_COUNT (expected 1)"
if [ "$EXPRESS_COUNT" -ne 1 ]; then echo "ERROR: express count wrong. Aborting."; exit 1; fi
if grep -q "couple-action/complete-task" "$FILE"; then echo "ERROR: action endpoints already exist."; exit 1; fi
echo "Checks passed."

python3 << 'PYEOF'
content = open('backend/server.js', 'r').read()

marker = '// ==================\n// PUSH NOTIFICATIONS'
if marker not in content:
    print("ERROR: Marker not found.")
    exit(1)

endpoints = '''
// ─── Couple DreamAi action endpoints — V6 ────────────────────────────────────
// Called by native app action card Confirm button.
// Mirrors vendor-action pattern. vendor arg carries { id: couple_id }.

// POST /api/v2/dreamai/couple-action/complete-task
app.post('/api/v2/dreamai/couple-action/complete-task', async (req, res) => {
  try {
    const { couple_id, task_id } = req.body || {};
    if (!couple_id || !task_id) return res.status(400).json({ success: false, error: 'couple_id and task_id required' });
    const result = await executeToolCall('complete_task', { task_id }, { id: couple_id });
    res.json({ success: true, message: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/v2/dreamai/couple-action/mark-expense-paid
app.post('/api/v2/dreamai/couple-action/mark-expense-paid', async (req, res) => {
  try {
    const { couple_id, expense_id, vendor_name } = req.body || {};
    if (!couple_id) return res.status(400).json({ success: false, error: 'couple_id required' });
    if (!expense_id && !vendor_name) return res.status(400).json({ success: false, error: 'expense_id or vendor_name required' });
    const result = await executeToolCall('mark_expense_paid', { expense_id: expense_id || null, vendor_name: vendor_name || null }, { id: couple_id });
    res.json({ success: true, message: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/v2/dreamai/couple-action/update-vendor-status
app.post('/api/v2/dreamai/couple-action/update-vendor-status', async (req, res) => {
  try {
    const { couple_id, vendor_name, status, quoted_price, advance, event } = req.body || {};
    if (!couple_id) return res.status(400).json({ success: false, error: 'couple_id required' });
    if (!status) return res.status(400).json({ success: false, error: 'status required' });
    if (!vendor_name) return res.status(400).json({ success: false, error: 'vendor_name required' });
    const result = await executeToolCall('update_vendor_status', { vendor_name, status, quoted_price: quoted_price ? Number(quoted_price) : undefined, advance: advance ? Number(advance) : undefined, event: event || null }, { id: couple_id });
    res.json({ success: true, message: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/v2/dreamai/couple-action/send-enquiry
app.post('/api/v2/dreamai/couple-action/send-enquiry', async (req, res) => {
  try {
    const { couple_id, vendor_id, message } = req.body || {};
    if (!couple_id || !vendor_id) return res.status(400).json({ success: false, error: 'couple_id and vendor_id required' });
    const result = await executeToolCall('send_enquiry', { vendor_id, message: message || 'Hello, I am interested in your work.' }, { id: couple_id });
    res.json({ success: true, message: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

'''

patched = content.replace(marker, endpoints + marker, 1)
open('backend/server.js', 'w').write(patched)
print("DreamAi action endpoints added.")
PYEOF

echo ""
echo "=== VERIFICATION ==="
grep -n "couple-action" "$FILE" | grep "app\."
echo ""
echo "express count (must be 1):"
grep -c "const express" "$FILE"
echo ""
echo "=== DONE ==="
echo "Run:"
echo "  git add backend/server.js"
echo "  git commit -m 'feat: add V6 couple DreamAi action endpoints — complete-task, mark-expense-paid, update-vendor-status, send-enquiry'"
echo "  git push origin main"
