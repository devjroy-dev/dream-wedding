#!/bin/bash
# P0-CALENDAR ITEM 3: Verify booking dot and block date via API + Supabase check
# Run in dream-wedding Codespace

BACKEND="https://dream-wedding-production-89ae.up.railway.app"
VENDOR_ID="8c7ff7e8-2358-4a9f-8606-7df5b31da6d8"
TEST_DATE="2026-12-28"
TEST_NAME="P0CalendarAuditClient"

echo "======================================================"
echo "P0-CALENDAR VERIFICATION — Swati vendor $VENDOR_ID"
echo "======================================================"

echo ""
echo "--- STEP 1: Create booking via /api/vendor-clients ---"
BOOKING_RESULT=$(curl -s -X POST "$BACKEND/api/vendor-clients" \
  -H "Content-Type: application/json" \
  -d "{\"vendor_id\":\"$VENDOR_ID\",\"name\":\"$TEST_NAME\",\"phone\":\"9000000001\",\"event_type\":\"Wedding\",\"event_date\":\"$TEST_DATE\",\"notes\":\"P0 calendar audit\",\"status\":\"potential\"}")
echo "Create booking response: $(echo $BOOKING_RESULT | python3 -c "import sys,json; d=json.load(sys.stdin); print('success:', d.get('success'), '| id:', d.get('data',{}).get('id','N/A') if d.get('data') else 'N/A')")"
BOOKING_ID=$(echo $BOOKING_RESULT | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id','') if d.get('data') else '')" 2>/dev/null)

echo ""
echo "--- STEP 2: Fetch vendor-clients and verify booking appears ---"
FETCH_RESULT=$(curl -s "$BACKEND/api/vendor-clients/$VENDOR_ID")
FOUND=$(echo $FETCH_RESULT | python3 -c "
import sys, json
d = json.load(sys.stdin)
clients = d.get('data', [])
match = [c for c in clients if c.get('name') == 'P0CalendarAuditClient']
if match:
    c = match[0]
    print('FOUND — id:', c.get('id'), '| event_date:', c.get('event_date'), '| status:', c.get('status'))
else:
    print('NOT FOUND — booking did not persist')
")
echo "Booking in vendor_clients: $FOUND"

echo ""
echo "--- STEP 3: Block a date via /api/v2/dreamai/vendor-action/block-date ---"
BLOCK_DATE="2026-12-29"
BLOCK_RESULT=$(curl -s -X POST "$BACKEND/api/v2/dreamai/vendor-action/block-date" \
  -H "Content-Type: application/json" \
  -d "{\"vendor_id\":\"$VENDOR_ID\",\"blocked_date\":\"$BLOCK_DATE\",\"reason\":\"P0 calendar audit block\"}")
echo "Block date response: $(echo $BLOCK_RESULT | python3 -c "import sys,json; d=json.load(sys.stdin); print('success:', d.get('success'), '| message:', d.get('message','N/A'))")"

echo ""
echo "--- STEP 4: Fetch availability blocks and verify block appears ---"
AVAIL_RESULT=$(curl -s "$BACKEND/api/vendor-discover/availability/$VENDOR_ID")
BLOCK_FOUND=$(echo $AVAIL_RESULT | python3 -c "
import sys, json
d = json.load(sys.stdin)
blocks = d.get('data', [])
match = [b for b in blocks if b.get('blocked_date') == '2026-12-29']
if match:
    b = match[0]
    print('FOUND — id:', b.get('id'), '| blocked_date:', b.get('blocked_date'), '| reason:', b.get('reason'))
else:
    print('NOT FOUND in', len(blocks), 'blocks')
")
echo "Block in vendor_availability_blocks: $BLOCK_FOUND"

echo ""
echo "--- STEP 5: Cleanup — delete the audit booking ---"
if [ -n "$BOOKING_ID" ]; then
  curl -s -X DELETE "$BACKEND/api/vendor-clients/$BOOKING_ID" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Cleanup booking:', d.get('success', 'N/A'))"
fi

echo ""
echo "======================================================"
echo "P0-CALENDAR VERIFICATION COMPLETE"
echo "Expected: FOUND on both Step 2 and Step 4"
echo "======================================================"
