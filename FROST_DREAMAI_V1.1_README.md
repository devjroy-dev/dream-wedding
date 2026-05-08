# Frost · Bride DreamAi v1.1 — Schema Patch

This is a **patch ZIP** that corrects v1's column names against the live Supabase schema. Drop in, unzip, push.

## What was broken in v1

v1 was built against the column names used by the existing couple DreamAi tools elsewhere in `server.js`. Those tools have themselves drifted from the real schema and have been silently failing for a while. v1.1 fixes only the bride-side; the older couple tools (`add_expense`, `mark_expense_paid`, `update_vendor_status`, `query_tasks`) are still broken but that's not the bride engine's responsibility.

## What v1.1 fixes

### `book_vendor` composite tool
Now writes against the real schema:
- **`couple_vendors`**: uses `quoted_total` (not `quoted_price`), writes `events: jsonb`, sets `balance_due_date` calculated from the wedding date, uses `source: 'dreamai'` to mark the row's origin.
- **`couple_expenses`**: includes the required `event` column, uses `description` / `vendor_name` / `planned_amount` / `actual_amount` / `payment_status` (not the old `name`/`amount`/`status`).
- **Logs both an advance row (paid) AND a balance row (pending)** so the budget reflects total committed spend.
- **Wedding date lookup** now reads `users.wedding_date`, not `couple_profiles.wedding_date` (which doesn't have that column).

### `create_reminder` tool
Now writes to **`couple_checklist`**, not `couple_tasks` (which doesn't exist). Includes the required `event` column, uses `text` (not `title`), `is_complete` (not `status`), `is_custom: true`. Tool definition updated so Haiku knows about the optional `event` argument.

### `bride-chat` endpoint
Inherited tools list trimmed: `query_tasks` removed (it queries the non-existent `couple_tasks` table). Bride engine no longer pretends it can read tasks until we expose `couple_checklist` reads explicitly in v1.2.

### NEW: `GET /api/v2/dreamai/bride-schema-check/:userId`
**Drift-detection insurance.** Pings every table the bride engine touches with a minimal SELECT. Returns which tables are accessible and which throw. Run it after any Supabase migration:

```bash
curl https://dream-wedding-production-89ae.up.railway.app/api/v2/dreamai/bride-schema-check/97f3f358-1130-449d-bb65-2863d006c79a
```

Returns `{ allOk: true, checks: { ... } }` if everything's healthy. If `allOk: false`, the response shows which table failed and why.

## Install

```bash
cd /workspaces/dream-wedding
unzip -o frost-dreamai-v1.1.zip && cp -r deploy/* . && rm -rf deploy frost-dreamai-v1.1.zip

# Verify endpoints exist (expect 4):
grep -c "bride-chat\|bride-followup\|bride-idle\|bride-schema-check" backend/server.js | head -1

# Lint:
cd backend && node --check server.js && cd ..

# Deploy:
git add -A
git commit -m "fix: bride DreamAi v1.1 — real schema for couple_vendors, couple_expenses, couple_checklist + schema-check endpoint"
git push
```

Railway auto-deploys.

## Smoke test sequence (run after Railway redeploys)

```bash
RAILWAY=https://dream-wedding-production-89ae.up.railway.app
COUPLE_ID=97f3f358-1130-449d-bb65-2863d006c79a

# 1. Check schema health
curl -s "$RAILWAY/api/v2/dreamai/bride-schema-check/$COUPLE_ID" | head -100

# Expected: "allOk":true and bride_record showing your name + wedding date

# 2. Idle lines (real Haiku-generated against your context)
curl -s "$RAILWAY/api/v2/dreamai/bride-idle/$COUPLE_ID"

# Expected: two short Cormorant-italic-voice lines

# 3. The big test — book a vendor
curl -s -X POST "$RAILWAY/api/v2/dreamai/bride-chat" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$COUPLE_ID\",
    \"message\": \"Booked Swati Tomar as my MUA for 1 lakh, paid 30k advance\",
    \"history\": []
  }"

# Expected: success:true, summaryLines populated with vendor + price + advance + balance reminder,
# followupPrompts with 2 entries (thank-you note + share with Circle), toolsUsed:["book_vendor"]
```

## What this writes when test 3 passes

- 1 row inserted into `couple_vendors` (or 1 row updated if Swati already exists) with `status='booked'`, `quoted_total=100000`, `balance_due_date=2026-12-01` (assuming your wedding date is 2026-12-15)
- 1 row inserted into `couple_expenses` for the ₹30,000 advance with `payment_status='paid'`
- 1 row inserted into `couple_expenses` for the ₹70,000 balance with `payment_status='pending'`, `due_date=2026-12-01`
- 1 row inserted into `couple_checklist` for the balance reminder with `due_date=2026-12-01`, `priority='high'`

If you want to verify in Supabase:

```sql
SELECT * FROM couple_vendors WHERE couple_id = '97f3f358-1130-449d-bb65-2863d006c79a' ORDER BY created_at DESC LIMIT 5;
SELECT * FROM couple_expenses WHERE couple_id = '97f3f358-1130-449d-bb65-2863d006c79a' ORDER BY created_at DESC LIMIT 5;
SELECT * FROM couple_checklist WHERE couple_id = '97f3f358-1130-449d-bb65-2863d006c79a' ORDER BY created_at DESC LIMIT 5;
```

## What still needs work (v1.2+)

- Existing couple tools (`add_expense`, `mark_expense_paid`, `update_vendor_status`, `query_tasks`) still drift from real schema. Bride engine doesn't depend on them, but if you want them fixed for the older PWA app, that's a separate patch.
- A `query_reminders` tool to read `couple_checklist` rows (currently bride engine can write but not read reminders).
- Circle integration — `share_with_circle` follow-up currently emits a reply line but doesn't write to a Circle messages table yet.
