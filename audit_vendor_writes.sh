#!/bin/bash
# P0-SCHEMA-3 ITEM 1: Vendor side WRITE tools only
# Run in dream-wedding Codespace
# Have `railway logs | grep -E "\[schema\]|\[DreamAi\]"` running in Terminal 2

BACKEND="https://dream-wedding-production-89ae.up.railway.app"
VENDOR_ID="8c7ff7e8-2358-4a9f-8606-7df5b31da6d8"

echo "--- V1: create_invoice ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$VENDOR_ID\",\"userType\":\"vendor\",\"message\":\"Create invoice for Sharma Wedding 75000\",\"context\":{\"vendor\":{\"name\":\"Swati Roy\",\"id\":\"$VENDOR_ID\",\"tier\":\"prestige\"}},\"history\":[]}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','ERROR')[:150])"

sleep 2

echo "--- V2: add_client ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$VENDOR_ID\",\"userType\":\"vendor\",\"message\":\"Add client Reena Kapoor phone 9876543210 wedding date 2026-11-15\",\"context\":{\"vendor\":{\"name\":\"Swati Roy\",\"id\":\"$VENDOR_ID\",\"tier\":\"prestige\"}},\"history\":[]}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','ERROR')[:150])"

sleep 2

echo "--- V3: block_calendar_dates ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$VENDOR_ID\",\"userType\":\"vendor\",\"message\":\"Block November 20 and November 21 for Kapoor wedding\",\"context\":{\"vendor\":{\"name\":\"Swati Roy\",\"id\":\"$VENDOR_ID\",\"tier\":\"prestige\"}},\"history\":[]}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','ERROR')[:150])"

sleep 2

echo "--- V4: create_task ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$VENDOR_ID\",\"userType\":\"vendor\",\"message\":\"Create task: Prepare portfolio for Reena Kapoor due November 1\",\"context\":{\"vendor\":{\"name\":\"Swati Roy\",\"id\":\"$VENDOR_ID\",\"tier\":\"prestige\"}},\"history\":[]}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','ERROR')[:150])"

sleep 2

echo "--- V5: log_expense ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$VENDOR_ID\",\"userType\":\"vendor\",\"message\":\"Log expense 3500 rupees travel to Kapoor family meeting\",\"context\":{\"vendor\":{\"name\":\"Swati Roy\",\"id\":\"$VENDOR_ID\",\"tier\":\"prestige\"}},\"history\":[]}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','ERROR')[:150])"

echo ""
echo "VENDOR WRITE AUDIT COMPLETE — check Terminal 2 logs now"
