# Frost · Bride DreamAi v1.4 (ZIP 5) — Surprise Me (backend)

Single backend ZIP. +383 lines on top of v1.3. Lint-clean.

Built against commit `ecba062` (v1.3) — the live Railway deployment.

## What this drop does

Surprise Me is **taste-aware visual suggestion engine**. It looks at what the bride has saved in her Muse, builds a style profile via Haiku Vision, and returns 6 (or up to 12) inspiration images blended from four sources.

### Two surfaces, one engine

- **Voice** — bride says *"surprise me with reception ideas"* in Dream chat → Haiku picks `surprise_me` tool → returns suggestions inline
- **Button** — POST to `/api/v2/frost/surprise-me` directly (ZIP 6 frontend wires the Muse canvas button to this)

Both surfaces share `generateSurpriseSuggestions()` internally — no duplication.

### Sources (blended in roughly 50/25/25 mix for visual density)

1. **Pinterest** (~50%) — scrapes public `pinterest.com/search/pins` HTML, extracts CDN image URLs, prefers `/736x/` sizing for grid quality. **Fragile** (Pinterest can change HTML), but works today and provides the visual density the Muse canvas needs.

2. **Anthropic web_search** (~25%) — Haiku runs a web_search with the taste profile, then extracts up to N image URLs from results.

3. **TDW vendors table** (~25%) — queries `vendors` table for `subscription_active=true` AND `discover_listed=true` vendors, scores each by `vibe_tags` overlap with the bride's profile, returns 1 image per matching vendor (variety > volume). Currently low-volume because few vendors have populated `vibe_tags` — grows naturally as TDW catalog matures.

4. **Commerce** — reserved slot. Returns `[]` today. Future ZIPs will add Pinterest official API (post dev account approval), Instagram Graph API hashtag search (post Meta Business approval), and partner commerce sites (Aza, Pernia's, Ogaan, etc.). The shape is in place so ZIP 6 frontend doesn't need updates when these light up.

### Suggestion shape (frozen contract for ZIP 6 frontend)

```json
{
  "image_url": "https://i.pinimg.com/736x/...",
  "source": "pinterest" | "web" | "vendor" | "commerce",
  "suggestion_id": "sg_xxxxx",
  "caption": "Sabyasachi reception look" | null,
  "vendor_id": "uuid" | undefined,
  "source_url": "https://..." | undefined
}
```

`suggestion_id` is a deterministic hash of `image_url` — used for dedup across sources and for ZIP 6 to track "save this" actions.

### Taste profiling

If the bride has 3+ saves with `image_url`, Haiku Vision reads up to 5 of them and extracts:
- 3-5 style descriptors (e.g. "marigold yellow", "intricate henna", "champagne tablescape")
- 3 dominant colours
- Inferred ceremony focus
- One-sentence summary returned to the bride as `tasteSummary`

If she has fewer than 3 saves (cold-start), falls back to ceremony-keyed defaults. So Surprise Me works on day 1 even with an empty Muse.

## Install

```bash
cd /workspaces/dream-wedding

unzip -o frost-dreamai-v1.4.zip && cp -r deploy/* . && rm -rf deploy frost-dreamai-v1.4.zip

grep -c "name: 'surprise_me'" backend/server.js              # expect 1
grep -c "case 'surprise_me'" backend/server.js                # expect 1
grep -c "function generateSurpriseSuggestions" backend/server.js  # expect 1
grep -c "/api/v2/frost/surprise-me" backend/server.js          # expect 3 (comment + app.post + ref)

cd backend && node --check server.js && cd ..

git add -A
git commit -m "feat: bride DreamAi v1.4 — Surprise Me (taste-aware suggestions from Pinterest + web + vendors)"
git push
```

Wait ~2 minutes for Railway redeploy.

## Verification

### 1. Voice trigger via DreamAi chat

```bash
curl -s -X POST "https://dream-wedding-production-89ae.up.railway.app/api/v2/dreamai/bride-chat" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "97f3f358-1130-449d-bb65-2863d006c79a",
    "message": "surprise me with reception ideas"
  }' | head -c 3000
```

**Expected:**
- `toolsUsed: ["surprise_me"]`
- `reply`: something like `"✨ Found 6 ideas for you."`
- `summaryLines`: 3 lines (taste summary, count, source breakdown)
- `suggestions`: array of 6 objects, each with `image_url`, `source`, `suggestion_id`, optional `caption`/`vendor_id`/`source_url`
- `tasteSummary`: a sentence from Haiku Vision describing her style

### 2. Direct button-style endpoint

```bash
curl -s -X POST "https://dream-wedding-production-89ae.up.railway.app/api/v2/frost/surprise-me" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "97f3f358-1130-449d-bb65-2863d006c79a",
    "function_tag": "reception",
    "count": 6
  }' | head -c 3000
```

**Expected:** `success: true`, `suggestions: [...]`, `tasteSummary: "..."`, `sourceCounts: { pinterest: N, web: N, vendor: N, commerce: 0 }`, `query: "..."`.

### 3. Cold-start (no function_tag, no style hint)

```bash
curl -s -X POST "https://dream-wedding-production-89ae.up.railway.app/api/v2/frost/surprise-me" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "97f3f358-1130-449d-bb65-2863d006c79a",
    "count": 8
  }' | head -c 3000
```

**Expected:** Still returns 6-8 suggestions. If the bride's Muse has 3+ image saves, taste comes from Vision profiling. Otherwise fallback profile kicks in.

### 4. End-to-end save flow (verifies ZIP 5 + ZIP 4 chain)

The bride sees a suggestion → wants to save → her client calls `save_to_muse` with the `image_url` from the suggestion. ZIP 4's `save_to_muse` is unchanged and handles this.

```bash
# Take an image_url from the response above and save it
curl -s -X POST "https://dream-wedding-production-89ae.up.railway.app/api/v2/dreamai/bride-chat" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "97f3f358-1130-449d-bb65-2863d006c79a",
    "message": "save https://i.pinimg.com/736x/... to my muse for reception"
  }' | head -c 1500
```

`toolsUsed: ["save_to_muse"]`, row appears in `moodboard_items`.

## Known issues / followups

1. **Pinterest scrape is fragile.** If Pinterest changes their HTML, the regex pattern breaks. Mitigation: web_search and vendor sources keep working independently. Fix: ZIP 8 with official Pinterest API post-dev-account-approval.

2. **Web source can be slow** (3-5 second Haiku web_search call). Mitigation: parallel `Promise.all` so Pinterest results return fast.

3. **Vendor source returns 0 today** for most queries because `vibe_tags` is rarely populated. Mitigation: when fewer than 3 results from Pinterest+web, the merge loop won't artificially pad — better to return 4 great suggestions than 6 mediocre ones.

4. **No paid-promo placement logic yet.** Some vendors will pay for Surprise Me visibility eventually. Future ZIP can boost their ranking when `tier === 'prestige'` or a `featured_in_surprise_me` flag is set.

5. **No "more like this" yet.** ZIP 6 frontend can call `/api/v2/frost/surprise-me` again with a `style_hint` derived from a specific suggestion she liked. Backend supports `style_hint` parameter already.

## Deferred to future sessions (handover)

- **ZIP 8+** Pinterest official API integration once dev account + production review approved
- **ZIP 9+** Instagram Graph API hashtag search post Meta Business approval
- **ZIP 10+** Commerce site partnerships (Aza, Pernia's Pop-Up, Ogaan, etc.) via outreach + custom integrations

## Roadmap after this

- **ZIP 6 (frontend, v1.5)** — Frost Muse canvas with grid view, Surprise Me gold pill button, save-suggestion flow, real Cloudinary upload for camera capture
- **ZIP 7 (frontend, v1.6)** — Dream composer image picker for OCR receipt flow
- **ZIP 8+ (backend, v1.7+)** — Pinterest official API, IG hashtag search, commerce partnerships, streaming responses (SSE)
- **v2.0** — Native production builds + App Store + Play Store
