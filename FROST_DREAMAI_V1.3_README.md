# Frost · Bride DreamAi v1.3 (ZIP 4) — DreamAi-as-Router

Single backend ZIP. +149 lines on top of v1.2. Lint-clean (`node --check` passes).

Built against commit `e187dd0` (v1.2) — the live Railway deployment.

This ZIP turns DreamAi from a "tool the bride invokes" into a **router** that automatically figures out where her inputs belong: Pinterest links go to Muse, receipt photos go to Expenses, vendor screenshots get a clarifying question.

## What this drop does

### Frost-blocking fixes (ZIP 3 left these red)

1. **`moodboard_items` real schema discovered** — columns are `id, user_id, vendor_id, image_url, function_tag, note`. Schema-check probe corrected. `bride-schema-check` will return `allOk: true` after deploy.

2. **PWA `/api/couple/muse/save` was silently broken** — was writing `vendor_name`, `vendor_category`, `vendor_image`, `event`, `source` (none of which exist in `moodboard_items`). Supabase silently dropped them, so every Muse-save row has been saving with only `user_id` and `vendor_id`. Now writes the real columns: `user_id`, `vendor_id`, `image_url` (derived from vendor's portfolio images), `function_tag` (mapped from the existing `event` parameter for backward compatibility).

3. **PWA `/api/couple/muse/:userId` list was filtering out non-vendor saves** — had `.not('vendor_id', 'is', null)` so pure-inspiration saves never appeared. Filter removed. List now returns both vendor-linked saves AND pure-inspiration image saves.

### `save_to_muse` REBUILT for the bride engine

The older couple toolkit's `save_to_muse` (line ~11938) was broken too — wrote `couple_id` instead of `user_id` and `source_url`/`title` columns that don't exist. **That broken version is left in place** because Frost doesn't use the older couple toolkit at all. We added a **new** `save_to_muse` to `FROST_BRIDE_TOOLS` with the real column shape.

Bride-side `save_to_muse`:
- Inputs: `image_url` (required), `function_tag` (optional ceremony tag), `note` (optional bride's annotation), `vendor_id` (optional)
- Writes to `moodboard_items` with the real schema
- Returns a 2-3 line summary card + Yes/No follow-up "Want to tag this for a specific ceremony?" if no `function_tag` was provided

### URL detector

Before sending the bride's message to Haiku, `bride-chat` now scans for URLs:
- **Pinterest URL** (pinterest.com, pin.it) → routing hint: "almost certainly inspiration → save_to_muse"
- **Instagram URL** (instagram.com, instagr.am) → routing hint: "likely inspiration → save_to_muse, unless she names a vendor"
- **Direct image URL** (`.jpg`, `.png`, `.webp`, `.gif`, `.heic`) → triggers Vision classifier

### Image classifier (Haiku Vision)

When a direct image URL is detected, `bride-chat` runs a quick Haiku Vision pass classifying it as one of:
- `receipt` → routing hint: "use ocr_receipt"
- `inspiration` → routing hint: "use save_to_muse"
- `vendor_screenshot` → routing hint: "ASK her: Add to vendor list, or save the look?"
- `document` / `other` → routing hint: "ask her plainly"

Classification is appended to the system prompt as a **strong suggestion**, but the bride's explicit text always wins. If she pastes a Pinterest link and says "log this as a receipt", Haiku still uses `ocr_receipt`.

### System prompt routing rules

A new "ROUTING RULES (DreamAi-as-Router)" section was added to the bride system prompt with explicit examples and the rule "if unclear, ask plainly. Never guess routing."

## Files

| File | Status |
|---|---|
| `backend/server.js` | PATCHED. +149 lines. Lint-clean. |

## Install

```bash
cd /workspaces/dream-wedding

unzip -o frost-dreamai-v1.3.zip && cp -r deploy/* . && rm -rf deploy frost-dreamai-v1.3.zip

# Verify save_to_muse is now in the bride toolkit (expect 1 each):
grep -c "name: 'save_to_muse'" backend/server.js
# expect 1 in FROST_BRIDE_TOOLS array

grep -c "case 'save_to_muse'" backend/server.js
# expect 1 in executeBrideToolCall

# Verify the new routing preprocessing is in bride-chat:
grep -c "DreamAi-as-Router preprocessing" backend/server.js
# expect 1

# Verify the schema-check probe was corrected:
grep "moodboard_items.*columns:" backend/server.js
# expect: { name: 'moodboard_items', columns: 'id, user_id, vendor_id, image_url, function_tag' },

# Lint:
cd backend && node --check server.js && cd ..

# Push:
git add -A
git commit -m "feat: bride DreamAi v1.3 — DreamAi-as-Router (URL detection + Vision classification + save_to_muse rebuilt + Muse schema fixes)"
git push
```

Wait ~2 minutes for Railway redeploy.

## Verification

### 1. Schema-check goes green

```bash
curl https://dream-wedding-production-89ae.up.railway.app/api/v2/dreamai/bride-schema-check/97f3f358-1130-449d-bb65-2863d006c79a
```

**Expected:** `"allOk": true` across all 9 tables. The previously-failing `moodboard_items` probe now uses real columns and should return `ok: true`.

### 2. Pinterest link → save_to_muse

```bash
curl -s -X POST "https://dream-wedding-production-89ae.up.railway.app/api/v2/dreamai/bride-chat" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "97f3f358-1130-449d-bb65-2863d006c79a",
    "message": "https://www.pinterest.com/pin/12345/ this is gorgeous"
  }' | head -c 1500
```

**Expected:** Reply something like `"✓ Saved to Muse."` with `summaryLines` (saved, no function tag yet) and a Yes/No follow-up about ceremony tagging. `toolsUsed: ["save_to_muse"]`.

### 3. Verify the row landed

```bash
curl -s "https://dream-wedding-production-89ae.up.railway.app/api/couple/muse/97f3f358-1130-449d-bb65-2863d006c79a" | head -c 2000
```

**Expected:** A new entry with the Pinterest URL in `image_url`. May be the first non-vendor entry in your Muse — note that the patched list endpoint now returns these.

### 4. Direct image URL → Vision classifier

```bash
# A clearly inspiration-style image URL
curl -s -X POST "https://dream-wedding-production-89ae.up.railway.app/api/v2/dreamai/bride-chat" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "97f3f358-1130-449d-bb65-2863d006c79a",
    "message": "https://images.unsplash.com/photo-1583394293214-28a4b0843b1d save this"
  }' | head -c 1500
```

**Expected:** Vision classifier identifies it as inspiration → routes to `save_to_muse` → reply is "✓ Saved to Muse." `toolsUsed: ["save_to_muse"]`.

### 5. Ambiguous routing — explicit override

```bash
curl -s -X POST "https://dream-wedding-production-89ae.up.railway.app/api/v2/dreamai/bride-chat" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "97f3f358-1130-449d-bb65-2863d006c79a",
    "message": "https://www.pinterest.com/pin/12345/ — this is from Sabyasachi, can I save it to muse and tag for reception"
  }' | head -c 1500
```

**Expected:** `save_to_muse` called with `function_tag: "reception"` extracted from the message. Reply confirms tagged save.

## Known limitations / followups

1. **Vision classifier adds latency** — when a direct image URL is in the message, an extra ~600ms Vision call happens before Haiku sees the message. For Pinterest/Instagram URLs (which are HTML pages, not direct images), no classifier runs — it's a faster path. For chat-uploaded receipts/inspiration, this is the right tradeoff.

2. **Pinterest "scrape" not implemented** — when the bride pastes a Pinterest pin URL, we save the URL itself in `image_url`, not the underlying image. The Frost frontend will need to render Pinterest URLs differently (oEmbed) or scrape them. Could be a v1.4 backend addition (`expand_pinterest_url` helper) or a frontend display-time fix. The simpler approach for v1.3 is to display Pinterest URLs as clickable cards.

3. **Vendor-screenshot disambiguation is a question, not an action** — when the classifier returns `vendor_screenshot`, DreamAi asks "Add to vendor list or save the look?" but doesn't offer Yes/No buttons because there are 2 distinct destinations. The bride needs to type a one-word reply. Could be tightened by surfacing a custom 2-option follow-up primitive in v1.4.

4. **`bride-chat` does NOT yet accept image attachments via the API** — only URLs in the message body. ZIP 2's frontend Dream composer doesn't have an image upload widget; the receipts capture button in `journey/receipts.tsx` is a stub. To complete the OCR receipt flow end-to-end, ZIP 5 (frontend) needs:
   - Image picker in Dream composer
   - Cloudinary upload helper (already wired into the codebase via `dccso5ljv` / preset `dream_wedding_uploads`)
   - Pass the uploaded URL into `bride-chat` message so the backend's URL detector + Vision classifier kick in

## Roadmap after this

- **ZIP 5 (frontend, v1.4)** — Dream composer image picker + Cloudinary upload + Pinterest oEmbed display + receipts capture button
- **ZIP 6 (backend, v1.5)** — Pinterest URL expansion (oEmbed → real image_url), streaming responses (SSE)
- **ZIP 7 (backend, v1.6)** — Twilio fallback for broadcast_to_circle members not on TDW
- **v2.0** — Native production builds + App Store + Play Store
