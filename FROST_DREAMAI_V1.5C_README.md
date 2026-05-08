# Frost DreamAi v1.5c — Web search 4-tier extraction + diagnostic logging

Backend-only patch on top of v1.5b. Fixes the "no images parsable from response"
failure mode by adding three more extraction tiers and verbose logging when all
four fail.

## Why the previous version failed

Railway logs from v1.5b showed `[surprise_me web] no images parsable from
response`. Translation: Haiku DID generate text after web_search, but neither
JSON nor URL-regex extraction found any direct `.jpg/.png/.webp` links.

This happens because Haiku, when summarising web_search results, often returns:
- **Page URLs** (article URLs ending in `.html` or no extension)
- **Markdown image syntax** `![caption](https://...)` which the simple URL
  regex didn't always pick up cleanly with surrounding parens
- **Prose summaries** with citation links rather than direct image refs

## What's new

`fetchWebSuggestions` now extracts in four tiers and falls through:

| Tier | What it tries |
|------|---------------|
| 1    | Strict `JSON.parse` of cleaned text |
| 2    | Extract first `{...}` block, parse that |
| 3    | Markdown `![alt](url)` regex + direct URL regex (handles `?query` strings) |
| 4    | Collect page citation URLs from `web_search_tool_result` blocks → fetch each → extract `og:image` / `twitter:image` meta tag |

If all four fail, it now logs:
- First 600 chars of Haiku's raw response (so we can see what actually came back)
- How many page citations were collected

`fetchOgImage` is a new helper: 4-second timeout, fetches a page URL, regex-extracts og:image or twitter:image meta tags. Used by tier 4 in parallel (capped at 6 pages, takes the first `limit` that resolve).

## Verification

After deploy, test:

```bash
curl -X POST "https://dream-wedding-production-89ae.up.railway.app/api/v2/frost/surprise-me" \
  -H "Content-Type: application/json" \
  -d '{"userId":"97f3f358-1130-449d-bb65-2863d006c79a","function_tag":"reception","count":6}' | jq .
```

Expected: `sourceCounts.web` should now be > 0. `suggestions` array length should be 6 (or close to), with mix of `source: "web"` and `source: "vendor"`.

If web is still 0, check Railway logs for the new diagnostic line:
`[surprise_me web] no images parsable from response. Raw text head: ...`

That tells us exactly what Haiku is producing and where to patch next.

## Deploy

```
unzip -o frost-dreamai-v1.5c.zip
cp -r deploy/* .
rm -rf deploy frost-dreamai-v1.5c.zip
node --check backend/server.js
git add -A
git commit -m "ZIP 5c: 4-tier web extraction + og:image fallback + raw-text logging"
git push
```
