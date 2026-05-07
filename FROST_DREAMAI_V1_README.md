# Frost · Bride DreamAi v1 — Backend Drop

This is **ZIP 1 of 3** in the bride DreamAi engine. Strictly additive — it adds three new endpoints to `dream-wedding/backend/server.js` without modifying any existing code. The vendor-side and existing `/api/v2/dreamai/chat` endpoint are untouched.

## What this adds

Three new endpoints, all under `/api/v2/dreamai/`:

### 1. `POST /api/v2/dreamai/bride-chat`
The bride-specific chat endpoint. Same shape as existing `/chat` but returns a Frost-shaped response with structured `summaryLines`, `followupPrompts`, and `confirmPreview` fields the Frost UI uses.

**Request:**
```json
{
  "userId": "1acdf38f-e69a-4f5e-b5b2-34c32fe52988",
  "message": "Booked Swati for 1 lakh, paid 30k advance",
  "history": []
}
```

**Response (composite tool example):**
```json
{
  "success": true,
  "reply": "✓ Done. Swati Tomar is locked in.",
  "summaryLines": [
    "Swati Tomar — locked in as MUA",
    "₹1,00,000 total",
    "₹30,000 advance paid today",
    "Balance reminder set for two weeks before the wedding"
  ],
  "followupPrompts": [
    { "id": "thank_you_note", "text": "Want me to draft a thank-you note to Swati?", "yesLabel": "Yes, draft it", "noLabel": "Not now" },
    { "id": "share_with_circle", "text": "Should I let your Circle know that Swati is locked in?", "yesLabel": "Share", "noLabel": "Keep private" }
  ],
  "toolsUsed": ["book_vendor"]
}
```

### 2. `POST /api/v2/dreamai/bride-followup`
Bride taps Yes or No on a follow-up prompt. Endpoint executes the action.

**Request:**
```json
{
  "userId": "1acdf38f-...",
  "prompt_id": "thank_you_note",
  "answer": "yes",
  "context": { "vendor_name": "Swati Tomar" }
}
```

### 3. `GET /api/v2/dreamai/bride-idle/:userId`
Returns 2 contextual idle lines for the Frost landing Dream box. Hour-bucketed cache (refreshed once per hour per bride). Real Haiku generation, falls back to static pool on error.

**Response:**
```json
{
  "success": true,
  "lines": [
    "Sixty-three days. The brass band has not been booked yet.",
    "The light in October will be the colour of old letters."
  ],
  "cached": false
}
```

## What this does NOT change

- **Existing `/api/v2/dreamai/chat`** — completely untouched, vendor and couple side both still work
- **Existing `TDW_COUPLE_TOOLS`** — untouched, available
- **Existing `executeCoupleToolCall`** — untouched, called by bride executor for read-only queries
- **No new tables. No SQL migrations.** Uses existing `couple_vendors`, `couple_expenses`, `couple_tasks`, and `vendors` tables.

## Tools registered for bride DreamAi

| Tool | Type | What it does |
|---|---|---|
| `book_vendor` | composite | Vendor lookup + status update + advance expense + auto balance reminder |
| `create_reminder` | atomic | Insert into `couple_tasks` |
| `search_tdw_vendors` | atomic | Query platform `vendors` table by category/city |
| `general_reply` | meta | Conversational fallback |
| `query_budget` | inherited | Read budget summary (existing) |
| `query_tasks` | inherited | Read tasks (existing) |
| `query_vendors` | inherited | Read her own vendors (existing) |
| `get_muse_saves` | inherited | Read Muse board (existing) |
| `web_search` | server-side | Anthropic-managed, available for outside questions |

## The Yes/No follow-up rule (locked)

The bride's interaction grammar is tap-driven. After ANY action, optional follow-ups are returned as `followupPrompts` (max 3). The Frost UI renders each as a Yes/No bubble. The bride taps once.

The bride system prompt is built to enforce this — Haiku is told NEVER to ask open-ended follow-up questions ("What date should I remind you?") and instead always offer Yes/No alternatives.

## The honest unknowns rule (locked)

If Haiku doesn't understand or there are multiple matches:
- **Multiple matches** → returns `kind: 'clarify'` with a question listing the options
- **Zero matches** → returns `kind: 'unsure'` with a question asking for category
- **Genuinely confused** → general_reply with "I'm not sure what you'd like me to do. Could you say it differently?"

System prompt explicitly forbids guessing.

## Install

```bash
cd /workspaces/dream-wedding

# Drop frost-dreamai-v1.zip at repo root, then:
unzip -o frost-dreamai-v1.zip && cp -r deploy/* . && rm -rf deploy frost-dreamai-v1.zip

# Verify:
grep -c "bride-chat\|bride-followup\|bride-idle" backend/server.js
# Expected output: 8 (mentions across endpoints + comments)

# Lint:
cd backend && node --check server.js && cd ..
# Expected output: no errors

# Commit + push to deploy:
git add -A
git commit -m "feat: bride DreamAi v1 — book_vendor composite + Yes/No follow-ups + idle endpoint"
git push
```

Railway auto-deploys on push.

## Smoke test (curl, after Railway deploy)

```bash
RAILWAY_URL="https://dream-wedding-production-89ae.up.railway.app"
COUPLE_ID="1acdf38f-e69a-4f5e-b5b2-34c32fe52988"

# Test 1: idle lines
curl -s "$RAILWAY_URL/api/v2/dreamai/bride-idle/$COUPLE_ID" | jq

# Test 2: book a vendor
curl -s -X POST "$RAILWAY_URL/api/v2/dreamai/bride-chat" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$COUPLE_ID\",
    \"message\": \"I just booked Swati Tomar for 1 lakh, paid 30k advance\",
    \"history\": []
  }" | jq

# Test 3: query (inherited tool)
curl -s -X POST "$RAILWAY_URL/api/v2/dreamai/bride-chat" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$COUPLE_ID\",
    \"message\": \"How much have I spent so far?\",
    \"history\": []
  }" | jq

# Test 4: search TDW vendors
curl -s -X POST "$RAILWAY_URL/api/v2/dreamai/bride-chat" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$COUPLE_ID\",
    \"message\": \"What are some good photographers in Delhi?\",
    \"history\": []
  }" | jq
```

## Expected Test 2 response shape

The book_vendor test should return:

```json
{
  "success": true,
  "reply": "✓ Done. Swati Tomar is locked in.",
  "summaryLines": ["Swati Tomar — locked in as MUA", "₹1,00,000 total", ...],
  "followupPrompts": [
    { "id": "thank_you_note", "text": "Want me to draft a thank-you note to Swati Tomar?", ... },
    { "id": "share_with_circle", "text": "Should I let your Circle know...", ... }
  ],
  "toolsUsed": ["book_vendor"]
}
```

If `summaryLines` and `followupPrompts` come back populated → working as designed.
If `kind: 'unsure'` because Swati isn't in saved vendors → also working (honest unknowns).

## Rollback

If anything goes wrong, the previous server.js commit is `8d9ab74`. To rollback:

```bash
cd /workspaces/dream-wedding
git revert HEAD --no-edit && git push
```

This restores the pre-bride-DreamAi state.

## What ships next

- **ZIP 2 — Frost-side wiring (`frost-dream-wired.zip`)** to `tdw-2`. Wires the Dream canvas composer + landing idle box + new `<DreamYesNo>` and `<DreamFollowupQueue>` components to these endpoints.
- **ZIP 3 — Composite tools v2 (`frost-dreamai-tools-v2.zip`)** back to `dream-wedding`. Adds `log_payment`, `settle_balance`, `broadcast_to_circle`, `ocr_receipt` composites once we've tested ZIP 1+2 working end-to-end.

## Production caveats (carry forward)

1. **Wedding date lookup**: the auto-balance-reminder tries to read `couple_profiles.wedding_date`. If that column doesn't exist or the row isn't there yet, it falls back to today + 60 days. Confirm the couple_profiles schema in your Supabase before testing on a real bride; if the column name is different, the bride-chat endpoint still works — only the reminder due date is approximate.
2. **Idle line caching**: in-memory Map. Resets on Railway redeploys. Fine for v1; replace with a `bride_idle_cache` table or Redis in v1.7+ if call volume grows.
3. **Followup `share_with_circle`**: emits a reply line for now but doesn't yet write to the Circle table. Real Circle insert lands in ZIP 2 or 3 (depending on which Circle table schema we end up using).
