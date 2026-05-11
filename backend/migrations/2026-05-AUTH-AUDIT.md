# 2026-05 — Auth / PIN / password_hash audit and cleanup

**Branch:** `test/v3-vendor-dreamai`
**Date:** 2026-05-11
**Reference:** P0 #5 — auth / PIN / password_hash migration

## Outcome: no data migration was run

The originally-planned data migration script (move legacy PINs from
`users.password_hash` → `users.pin_hash`) was **skipped**. The `users`
table was cleaned manually before code work began, leaving nothing to
migrate. The code changes below (Phases 3 + 4) reflect the new
post-cleanup invariants.

## Phase 1 — pre-cleanup audit

The originally-prepared audit SQL (count by `password_hash` /
`pin_hash` / overlap / `dreamer_type` / bcrypt length / vendor table)
was not executed from the backend Codespace: only the Supabase anon key
is configured in `backend/.env`, and RLS silently filters anon reads
to zero. The audit was bypassed in favour of manual cleanup performed
directly against the database.

What we do know about pre-cleanup state, reported by the operator:

- `users` rows with both `password_hash` AND `pin_hash` set: **1**
  (the bride, `id 97f3f358-1130-449d-bb65-2863d006c79a`).
- All other rows in `users` were dummy / test data and were removed.

If a numeric audit is required for posterity, run the P0 #5 query
set (queries A–G in the original migration prompt) against
`users_backup_2026_05_11` from the Supabase SQL editor.

## Cleanup performed (manual, before code changes)

- **`users` table:** all dummy / test rows deleted. Final state: 1 row
  (the bride, `Dev`, `id 97f3f358-1130-449d-bb65-2863d006c79a`).
- **Bride's legacy `password_hash`:** cleared. She was the C=1 user with
  both columns populated; the legacy PIN value is gone, only `pin_hash`
  remains.
- **`couple_planners`:** 2 cascading rows removed when their parent
  users were deleted. Verified by operator.
- **`vendors`:** untouched. Swati's row verified intact by operator.
- **Backup:** `users_backup_2026_05_11` exists in Supabase as a safety
  net before the cleanup.

## Schema change

Run manually before deploying Phase 3:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_set_at TIMESTAMPTZ;
```

Phase 3 `set-pin` writes `pin_set_at = NOW()` on every couple PIN write,
so this column must exist before that code path takes traffic.

## Phase 3 — endpoint hygiene (commit `93fcd08`)

`password_hash` references in `backend/server.js`:

- **Before:** 43
- **After:** 32

The 11 removals are all on couple PIN paths:

- `POST /api/v2/auth/set-pin` (couple branch): writes `pin_hash`,
  clears `password_hash` to `null`, stamps `pin_set_at = NOW()`. Vendor
  branch split out and behaviourally unchanged.
- `POST /api/v2/auth/verify-pin` (couple branch): reads `pin_hash`
  only. Removed the `password_hash` fallback and the fire-and-forget
  legacy-PIN migration block. Vendor branch untouched.
- `POST /api/v2/couple/auth/verify-otp`: dropped `password_hash` from
  the select; `pinSet = !!user.pin_hash`.
- Replaced the misleading 4586-4588 comment block with the new
  invariant ("`pin_hash` exclusively for couple PINs; `password_hash`
  is vendor-table-only").

### Remaining `password_hash` references (intentionally untouched)

The 32 surviving references are out of Phase 3 scope:

- **Vendor-side** (`vendors`, `vendor_logins`): vendor password login
  uses `password_hash` and stays as-is. Phase 3 step E explicitly
  excludes vendor endpoints.
- **Couple password (not PIN) login** at `~7159`, `~7239`, `~8642-8643`:
  separate password-based flow, not the PIN flow being migrated here.
- **`GET /api/v2/auth/pin-status`** at `~11644-11649`: still has the
  legacy `pin_hash || password_hash` fallback. Not listed in Phase 3
  A-E and so left alone. Worth tackling in a follow-up — with cleanup
  complete, the fallback can never fire for couples and is dead code.

## Phase 4 — rate limiting (commit `2f260df`)

- Added `express-rate-limit ^8.5.1` to `backend/package.json`.
- Defined `pinAttemptLimiter` at the top of `server.js`: 5 attempts per
  15 minutes per IP, returns 429 with
  `{ success: false, error: 'Too many PIN attempts. Try again in 15 minutes.' }`.
- Attached to `POST /api/v2/auth/verify-pin`. This is the only
  verify-pin route in the backend; both couple and vendor PIN
  verification flow through it (selected by `req.body.role`), so a
  single limiter covers both audiences as Phase 4 required.
- Verified by grep: no other `/verify-pin` routes exist.

## Verification checklist

- [x] `node -c backend/server.js` passes after each commit.
- [x] `grep -c password_hash backend/server.js`: 43 → 32.
- [x] `grep -n "verify-pin'" backend/server.js` shows exactly one route,
      and it has `pinAttemptLimiter` as middleware.
- [ ] **Operator action required:** run the `ALTER TABLE users ADD
      COLUMN IF NOT EXISTS pin_set_at TIMESTAMPTZ;` SQL in Supabase
      before this branch deploys, otherwise `set-pin` couple writes
      will 400 on the schema mismatch.
- [ ] **Operator action required:** verify rate-limit is live in prod
      by hitting `POST /api/v2/auth/verify-pin` with a bad PIN six
      times from one IP and confirming the sixth returns 429.

## Files changed

- `backend/server.js`
- `backend/package.json`
- `backend/package-lock.json`
- `backend/migrations/2026-05-AUTH-AUDIT.md` (this file)
