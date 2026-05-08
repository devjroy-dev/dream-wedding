# Frost DreamAi v1.5 (ZIP 5b) — Surprise Me source patch

Patch on top of v1.4 (ZIP 5). Backend only. Fixes the empty-suggestions bug.

## Diagnosis

Live diagnostic confirmed Pinterest is now fully client-side rendered. A 808KB
search HTML returned **zero** `i.pinimg.com` URLs — only static assets (favicon,
share-image, logo). Pinterest's pin data is loaded by JavaScript after page
boot, which means server-side scraping returns nothing. This won't be fixable
without Puppeteer (heavy) or the official Pinterest API (pending dev account).

## Changes

1. **fetchPinterestSuggestions** — stubbed to return `[]`. Function name kept
   so future ZIP can drop in the official Pinterest API without refactoring.
2. **fetchWebSuggestions** — rewritten:
   - Better, more directive prompt to Haiku
   - 3-tier parsing: strict JSON → first `{...}` block → regex extract URLs from prose
   - Filters out trailing punctuation that can sneak into URL captures
3. **fetchVendorSuggestions** — relaxed:
   - Removed strict vibe_tags overlap requirement (was filtering out all
     vendors when profile tokens like "champagne tablescape" don't match
     vendor tags like "Luxury")
   - Vendors with images are always candidates; vibe_tags overlap now just
     boosts ranking, doesn't gate
   - Random tiebreaker so same vendor doesn't always lead
   - Picks a random image from top 3 in vendor's portfolio for variety
4. **Blend updated**: 0% Pinterest, 60% web, 40% vendor. Total still ~6 cards
   per request.

## Verification

After deploy, test with:

```bash
curl -X POST "https://dream-wedding-production-89ae.up.railway.app/api/v2/frost/surprise-me" \
  -H "Content-Type: application/json" \
  -d '{"coupleId":"97f3f358-1130-449d-bb65-2863d006c79a","functionTag":"reception","count":6}' | jq .
```

Expected: `suggestions` array with 4-6 items, mix of `source: "web"` and
`source: "vendor"`, `sourceCounts.pinterest: 0`.

If web returns 0 but vendor returns 4: web_search prompt may need further
tuning, but Surprise Me is still functional. If both return 0: investigate
console.error logs for `[surprise_me web]` and `[surprise_me vendors]`.

## Deploy

```
unzip -o frost-dreamai-v1.5b.zip
cp -r deploy/* .
rm -rf deploy frost-dreamai-v1.5b.zip
node --check backend/server.js
git add -A
git commit -m "ZIP 5b: drop Pinterest scrape, relax web+vendor source helpers"
git push
```
