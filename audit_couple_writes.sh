#!/bin/bash
# P0-SCHEMA-3 ITEM 2: Dreamer side WRITE tools only
# Run in dream-wedding Codespace
# Have `railway logs | grep -E "\[schema\]|\[DreamAi\]"` running in Terminal 2

BACKEND="https://dream-wedding-production-89ae.up.railway.app"
COUPLE_ID="1acdf38f-e69a-4f5e-b5b2-34c32fe52988"

echo "--- C1: add_vendor ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"Add MUA artist Shehnaz Hussain Delhi quoted 45000\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}},\"history\":[]}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','ERROR')[:150])"

sleep 2

echo "--- C2: add_guest ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"Add guest Priya Mehta phone 9123456780 bride side\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}},\"history\":[]}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','ERROR')[:150])"

sleep 2

echo "--- C3: add_expense ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"Add expense 85000 for Shehnaz Hussain MUA\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}},\"history\":[]}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','ERROR')[:150])"

sleep 2

echo "--- C4: update_vendor_status ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"Mark Shehnaz Hussain as booked\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}},\"history\":[]}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','ERROR')[:150])"

sleep 2

echo "--- C5: mark_expense_paid ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"Mark Shehnaz Hussain expense as paid\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}},\"history\":[]}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','ERROR')[:150])"

sleep 2

echo "--- C6: save_to_muse ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"Save https://www.pinterest.com/pin/bridal-lehenga-audit to my muse\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}},\"history\":[]}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','ERROR')[:150])"

sleep 2

echo "--- C7: send_enquiry ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"Send enquiry to vendor 8c7ff7e8-2358-4a9f-8606-7df5b31da6d8 saying interested in bridal photography for December wedding\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}},\"history\":[]}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','ERROR')[:150])"

sleep 2

echo "--- C8: complete_task (needs a real task_id — using query first) ---"
# Query tasks to get a real ID, then complete it
TASK_RESPONSE=$(curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"Show me my pending tasks\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}},\"history\":[]}")
echo "Tasks query: $(echo $TASK_RESPONSE | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('reply','')[:100])")"

# Get first task ID directly from DB via API
FIRST_TASK=$(curl -s "$BACKEND/api/couple/checklist/$COUPLE_ID" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    tasks = d.get('data', d) if isinstance(d, dict) else d
    if isinstance(tasks, list) and tasks:
        t = [x for x in tasks if not x.get('is_complete', False)]
        print(t[0]['id'] if t else 'NO_INCOMPLETE_TASKS')
    else:
        print('NO_TASKS')
except Exception as e:
    print('ERROR:', e)
" 2>/dev/null)
echo "First incomplete task ID: $FIRST_TASK"

if [[ "$FIRST_TASK" != "NO"* && "$FIRST_TASK" != "ERROR"* ]]; then
  curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
    -H "Content-Type: application/json" \
    -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"Mark task $FIRST_TASK as complete\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}},\"history\":[]}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','ERROR')[:150])"
else
  echo "SKIP: No incomplete tasks to complete — tool covered by earlier test run"
fi

echo ""
echo "COUPLE WRITE AUDIT COMPLETE — check Terminal 2 logs now"
