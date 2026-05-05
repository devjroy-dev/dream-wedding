#!/bin/bash
# P0-SCHEMA-3: Full DreamAi tool audit
# Run this in the dream-wedding Codespace terminal (has Railway access)
# 
# BEFORE RUNNING: confirm Railway is live with the new deployment
# curl https://dream-wedding-production-89ae.up.railway.app/api/ai-health
#
# VENDOR: Swati Roy — phone 8595356978, PIN 2901
# First get Swati's vendor ID via PIN auth:

BACKEND="https://dream-wedding-production-89ae.up.railway.app"
VENDOR_ID="8c7ff7e8-2358-4a9f-8606-7df5b31da6d8"
COUPLE_ID="1acdf38f-e69a-4f5e-b5b2-34c32fe52988"

echo "======================================================"
echo "STEP 0: Confirm Railway live + schema cache loaded"
echo "======================================================"
curl -s "$BACKEND/api/ai-health" | python3 -m json.tool
echo ""

echo "======================================================"
echo "VENDOR TOOLS (11) — Swati: $VENDOR_ID"
echo "======================================================"

echo ""
echo "--- V1: create_invoice ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$VENDOR_ID\",\"userType\":\"vendor\",\"message\":\"Create invoice for Test Client audit 50000\",\"context\":{\"vendor\":{\"name\":\"Swati Roy\",\"id\":\"$VENDOR_ID\",\"tier\":\"prestige\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- V2: add_client ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$VENDOR_ID\",\"userType\":\"vendor\",\"message\":\"Add new client Audit Test Client phone 9999999999 event date 2026-12-20\",\"context\":{\"vendor\":{\"name\":\"Swati Roy\",\"id\":\"$VENDOR_ID\",\"tier\":\"prestige\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- V3: block_calendar_dates ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$VENDOR_ID\",\"userType\":\"vendor\",\"message\":\"Block December 25 for audit test\",\"context\":{\"vendor\":{\"name\":\"Swati Roy\",\"id\":\"$VENDOR_ID\",\"tier\":\"prestige\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- V4: query_schedule ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$VENDOR_ID\",\"userType\":\"vendor\",\"message\":\"What is my schedule today\",\"context\":{\"vendor\":{\"name\":\"Swati Roy\",\"id\":\"$VENDOR_ID\",\"tier\":\"prestige\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- V5: query_revenue ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$VENDOR_ID\",\"userType\":\"vendor\",\"message\":\"Show me this month revenue\",\"context\":{\"vendor\":{\"name\":\"Swati Roy\",\"id\":\"$VENDOR_ID\",\"tier\":\"prestige\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- V6: query_clients ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$VENDOR_ID\",\"userType\":\"vendor\",\"message\":\"Show me my clients\",\"context\":{\"vendor\":{\"name\":\"Swati Roy\",\"id\":\"$VENDOR_ID\",\"tier\":\"prestige\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- V7: create_task ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$VENDOR_ID\",\"userType\":\"vendor\",\"message\":\"Create task: Send audit test portfolio to client by December 15\",\"context\":{\"vendor\":{\"name\":\"Swati Roy\",\"id\":\"$VENDOR_ID\",\"tier\":\"prestige\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- V8: log_expense ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$VENDOR_ID\",\"userType\":\"vendor\",\"message\":\"Log expense 2000 rupees for audit test travel\",\"context\":{\"vendor\":{\"name\":\"Swati Roy\",\"id\":\"$VENDOR_ID\",\"tier\":\"prestige\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- V9: send_client_reminder ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$VENDOR_ID\",\"userType\":\"vendor\",\"message\":\"Send payment reminder to Audit Test Client\",\"context\":{\"vendor\":{\"name\":\"Swati Roy\",\"id\":\"$VENDOR_ID\",\"tier\":\"prestige\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- V10: save_to_muse (vendor) ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$VENDOR_ID\",\"userType\":\"vendor\",\"message\":\"Save https://www.instagram.com/p/test to muse\",\"context\":{\"vendor\":{\"name\":\"Swati Roy\",\"id\":\"$VENDOR_ID\",\"tier\":\"prestige\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- V11: general_reply ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$VENDOR_ID\",\"userType\":\"vendor\",\"message\":\"Hello how are you\",\"context\":{\"vendor\":{\"name\":\"Swati Roy\",\"id\":\"$VENDOR_ID\",\"tier\":\"prestige\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "======================================================"
echo "COUPLE TOOLS (12) — Demo couple: $COUPLE_ID"
echo "======================================================"

echo ""
echo "--- C1: add_vendor ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"Add photographer Audit Studio Delhi quoted 150000\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- C2: add_expense ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"Add expense 50000 for audit test decorator\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- C3: add_guest ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"Add guest Audit Test Guest phone 8888888888\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- C4: query_budget ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"What is my budget status\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- C5: query_tasks ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"Show me my pending tasks\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- C6: query_vendors ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"Show me all my vendors\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- C7: update_vendor_status ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"Mark Audit Studio as booked\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- C8: mark_expense_paid ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"Mark audit test decorator expense as paid\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- C9: save_to_muse (couple) ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"Save https://www.pinterest.com/pin/test to my muse\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- C10: complete_task ---"
# Need a task ID — query first then complete
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"Mark my first pending task as complete\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- C11: send_enquiry ---"
# Find a real vendor_id to send to — use Swati's
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"Send enquiry to vendor $VENDOR_ID saying interested in audit test booking\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "--- C12: general_reply (couple) ---"
curl -s -X POST "$BACKEND/api/v2/dreamai/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$COUPLE_ID\",\"userType\":\"couple\",\"message\":\"What are some good mehendi artists in Delhi\",\"context\":{\"couple\":{\"name\":\"Demo Couple\",\"id\":\"$COUPLE_ID\"}}}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('REPLY:', d.get('reply','')[:200])"

echo ""
echo "======================================================"
echo "AUDIT COMPLETE — now check Railway logs for:"
echo "  [schema] Stripped unknown column"
echo "  [DreamAi] executeToolCall:"
echo "  [DreamAi] in-app tool:"
echo "Expected: zero Stripped warnings. Vendor ID = 8c7ff7e8"
echo "======================================================"
