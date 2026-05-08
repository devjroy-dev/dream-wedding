# Frost · Bride DreamAi v1.2 (ZIP 3 of 3)

Final additive backend ZIP for the bride DreamAi engine. Builds on top of v1.1.

## What this drop does

### Bug fixes
1. **`book_vendor` UPDATE path** now stamps `source: 'dreamai'` + `last_dreamai_action` timestamp. v1.1 only stamped on the insert path, so when an existing vendor row got updated by the bride engine, we lost provenance.
2. **`couple_muse` → `moodboard_items`** everywhere the bride engine references it. The PWA already uses `moodboard_items` correctly; the bride engine had stale references to a non-existent `couple_muse` table.
3. **Schema-check** now also probes `notifications` and `co_planners` (used by ZIP 3's broadcast feature).

### New read tools (so the bride can ask, not just tell)
- **`query_my_vendors`** — *"Who have I booked?"* / *"What's my vendor list?"* / *"Is X confirmed?"*
- **`query_my_expenses`** — *"How much have I paid Swati?"* / *"Total spent so far?"* / *"What's my balance with X?"*

### New composite write tools
- **`log_payment`** — *"Paid Swati 50k more"* / *"Sent another 25k to the photographer"*. Updates the right pending expense row, recalculates balance, asks if she wants a follow-up reminder.
- **`settle_balance`** — *"Paid the rest to House of Blooms"* / *"Cleared Swati's balance"*. Closes the pending balance row, marks vendor as paid, deletes any auto-created balance reminder.
- **`broadcast_to_circle`** — *"Tell my family Swati's locked in"* / *"Let everyone know the venue changed"*. Returns a `confirmPreview` — bride must explicitly tap Send (irreversible). Posts to `notifications` table for each Circle member.
- **`ocr_receipt`** — Image upload → Haiku Vision OCR → returns `confirmPreview` with extracted vendor + amount + date → bride confirms → expense row created.

### New endpoint
- **`POST /api/v2/dreamai/bride-confirm`** — executes a previously-previewed action (broadcast or OCR) after the bride taps Confirm in the FrostConfirmCard. Body: `{ userId, action_id, vendor_name? }`. Response: `{ success, reply }`.

## Files

| File | Status |
|---|---|
| `backend/server.js` | PATCHED. +441 lines on top of v1.1. Lint-clean (`node --check` passes). |

## Install

```bash
cd /workspaces/dream-wedding

# Drop frost-dreamai-v1.2.zip at repo root, then:
unzip -o frost-dreamai-v1.2.zip && cp -r deploy/* . && rm -rf deploy frost-dreamai-v1.2.zip

# Verify all the v1.2 endpoints exist (expect 5 — bride-chat, bride-followup, bride-idle, bride-schema-check, bride-confirm):
grep -cE "/api/v2/dreamai/bride-(chat|followup|idle|schema-check|confirm)" backend/server.js

# Verify the 6 new tool definitions (expect 6):
grep -cE "name: '(query_my_vendors|query_my_expenses|log_payment|settle_balance|broadcast_to_circle|ocr_receipt)'" backend/server.js

# Lint:
cd backend && node --check server.js && cd ..

# Deploy:
git add -A
git commit -m "feat: bride DreamAi v1.2 — log_payment, settle_balance, broadcast_to_circle, ocr_receipt + read tools + Muse table fix + source stamping on update"
git push
```

Wait ~2 minutes for Railway to redeploy, then verify the engine is healthy:

```bash
curl https://dream-wedding-production-89ae.up.railway.app/api/v2/dreamai/bride-schema-check/97f3f358-1130-449d-bb65-2863d006c79a
```

Expect `"allOk": true` now (the only failing table — `couple_muse` — is now `moodboard_items` and exists).

## End-to-end test sequence

After the schema-check returns `allOk: true`, run these in order:

### 1. Read tool — query_my_expenses
```bash
curl -s -X POST "https://dream-wedding-production-89ae.up.railway.app/api/v2/dreamai/bride-chat" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "97f3f358-1130-449d-bb65-2863d006c79a",
    "message": "How much have I paid Swati so far?"
  }' | head -c 2000
```

Expected: AI reply with totals, e.g. `"₹30,000 paid to Swati Tomar, ₹70,000 pending."`. `toolsUsed: ["query_my_expenses"]`.

### 2. log_payment — partial additional payment
```bash
curl -s -X POST "https://dream-wedding-production-89ae.up.railway.app/api/v2/dreamai/bride-chat" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "97f3f358-1130-449d-bb65-2863d006c79a",
    "message": "Just paid Swati 30k more"
  }' | head -c 2000
```

Expected: AI reply `"✓ ₹30,000 logged for Swati Tomar."`, summaryLines (payment + total + remaining), one Yes/No follow-up about reminder. The pending balance row should now show `actual_amount: 60000` (was 30k, +30k).

### 3. Verify state after log_payment
```bash
curl -s "https://dream-wedding-production-89ae.up.railway.app/api/couple/expenses/97f3f358-1130-449d-bb65-2863d006c79a" | head -c 1500
```

Look for the Balance due row with `actual_amount: 30000` (the cumulative payment), `payment_status: "pending"` (still 40k owed). Note: the v1.1 setup created an advance of 30k + balance due of 70k. Now after log_payment of 30k more, the balance row should be `actual_amount: 30000` of `planned_amount: 70000`.

### 4. settle_balance — final payment
```bash
curl -s -X POST "https://dream-wedding-production-89ae.up.railway.app/api/v2/dreamai/bride-chat" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "97f3f358-1130-449d-bb65-2863d006c79a",
    "message": "Cleared the rest of Swati Tomar"
  }' | head -c 2000
```

Expected: AI reply `"✓ Swati Tomar fully settled."`, summaryLines (final payment + paid + reminder cleared). Vendor row should now have `status: "paid"`, `source: "dreamai"`, `last_dreamai_action: <recent>`. The "Pay balance to Swati Tomar" reminder should be gone from `couple_checklist`.

### 5. broadcast_to_circle — confirm-required path
```bash
# Step 1: trigger broadcast (returns confirmPreview, doesn't actually send)
curl -s -X POST "https://dream-wedding-production-89ae.up.railway.app/api/v2/dreamai/bride-chat" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "97f3f358-1130-449d-bb65-2863d006c79a",
    "message": "Tell my family Swati is locked in"
  }' | head -c 2000
```

Expected: AI reply with `confirmPreview.action_id`. Note the action_id from the response.

```bash
# Step 2: confirm
curl -s -X POST "https://dream-wedding-production-89ae.up.railway.app/api/v2/dreamai/bride-confirm" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "97f3f358-1130-449d-bb65-2863d006c79a",
    "action_id": "<paste action_id from step 1>"
  }'
```

Expected: `{ success: true, reply: "✓ Sent to N people in your Circle.", delivered_count: N }`. Check `notifications` table for new rows of type `circle_broadcast`.

### 6. query_my_vendors — read after writes
```bash
curl -s -X POST "https://dream-wedding-production-89ae.up.railway.app/api/v2/dreamai/bride-chat" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "97f3f358-1130-449d-bb65-2863d006c79a",
    "message": "Show me my vendor list"
  }' | head -c 2000
```

Expected: list of vendors with status, including Swati now showing `status: "paid"`, `source: "dreamai"`.

## Known limitations (carry to v1.3)

1. **`ocr_receipt` requires a Cloudinary URL** — frontend must upload to Cloudinary first, then pass the URL. ZIP 2's frontend doesn't have the upload widget yet; the receipts capture button in `journey/receipts.tsx` is a stub.
2. **No streaming** — Haiku replies are still all-at-once. v1.7 will add SSE.
3. **`broadcast_to_circle` only delivers to Circle members who have created a TDW account** (filtered by `co_planner_user_id != null`). Members invited via WhatsApp link who haven't joined yet won't get the in-app notification. They could still get a WhatsApp broadcast via the existing Twilio path — out of scope here.
4. **`log_payment` clarify** picks the first match if multiple distinct vendors share a fragment ("Swati" matches both "Swati Tomar" and "Swati R"). It returns a clarify response with candidates so the bride must rephrase. Could be tightened to surface a frontend disambiguation card, but that requires ZIP 2 frontend changes — deferred.
5. **`source: 'dreamai'` and `last_dreamai_action` columns** — if these don't exist on `couple_vendors` in production, the update will fail. Run `bride-schema-check` after deploy to verify. If failure, add the columns via Supabase migration:
   ```sql
   ALTER TABLE couple_vendors ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
   ALTER TABLE couple_vendors ADD COLUMN IF NOT EXISTS last_dreamai_action timestamptz;
   ```
   The `couple_vendors` rows we've already inspected show `source` already exists (we saw `"source":"manual"` in earlier curls). `last_dreamai_action` likely doesn't yet — but Supabase silently drops unknown columns on update, so writes won't fail; we just won't capture the timestamp until the column is added.

## Frontend changes needed (ZIP 2 already covers most)

The Frost frontend already has the message-sending plumbing for chat. To fully use ZIP 3:

1. **Frontend wiring for `confirm-required` responses** — when bride-chat returns `kind: 'confirm-required'` with a `confirmPreview` containing `action_id`, render `<FrostConfirmCard>` and on Confirm, POST to `/api/v2/dreamai/bride-confirm` with the action_id. ZIP 2's `frostApi.ts` may need a small `brideConfirm()` helper added.

2. **Receipt upload widget** — the `journey/receipts.tsx` "Capture a receipt" button currently does nothing. To make `ocr_receipt` real, wire it to: pick image → Cloudinary upload → call `bride-chat` with `"file this receipt"` + `image_url` parameter (passed in the message context). This is one small frontend change, deferrable until ZIP 3 backend is verified working.

3. **Read-tool result rendering** — when bride-chat returns `kind: 'reply'` with a `vendors` or `expenses` array (from query tools), the existing message rendering should already display the AI's text reply. Optional: render a small inline card with the structured list. Deferrable polish.

## Roadmap after this

- **v1.3** — receipt upload widget + Cloudinary integration
- **v1.4** — frontend disambiguation card for log_payment clarify responses
- **v1.5** — streaming responses (SSE)
- **v1.6** — Twilio fallback for broadcast_to_circle members not on TDW
- **v2.0** — Native production builds + App Store + Play Store
