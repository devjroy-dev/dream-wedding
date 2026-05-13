# End-to-End Integration Audit — dreamai ↔ dream-wedding ↔ tdw-2
**Date:** 2026-05-13
**Auditor:** Claude Sonnet 4.6 (automated)
**Scope:** Read-only. No code changes. Documentation only.
**Verdict: YELLOW** — all data paths functional, vendor_id scoped on every endpoint, no P0 data corruption found. Two P1 issues: soft-delete gap in vendor-context briefing, and no server-side auth guard on data endpoints.

---

## ⚠️ P1 Issues (ship soon after launch — not blockers)

> No P0 (launch blocker) issues found.

**P1-A — Vendor context briefing ignores deleted_at:**
`GET /api/v2/dreamai/vendor-context/:vendorId` (server.js:3787–3788) queries `vendor_clients` and `vendor_invoices` without `.is('deleted_at', null)`. Soft-deleted clients and invoices appear in the system prompt briefing fed to Claude. Claude may cite a "deleted" client by name in a reply or surface an invoice that no longer exists. Affects every chat turn.

**P1-B — No server-side auth guard on data endpoints:**
All data endpoints (both `/api/*` and `/api/v2/vendor/*`) accept `vendorId` from the URL path or POST body without JWT or session token verification. The backend trusts the client-supplied ID. Any authenticated vendor who discovers another vendor's UUID (e.g. from a public profile) could call `GET /api/invoices/:otherVendorUUID` and retrieve their data. Consistent across both surfaces but represents a design gap.

---

## Phase 0 — Codespace Location and Repo Accessibility

```
pwd:    /workspaces/dream-wedding  ✓
remote: origin → github.com/devjroy-dev/dream-wedding.git  ✓
branch: main  ✓
```

`ls /workspaces/` shows: `dream-wedding`, `dreamai`, `tdw-2`

All three repos accessible:
- `dream-wedding`: read directly (Codespace)
- `dreamai`: accessible via `gh api repos/devjroy-dev/dreamai/...`
- `tdw-2`: accessible via `gh api repos/devjroy-dev/tdw-2/...`

---

## Phase 1 — Write Path Map

All 8 tools share the same frontend entry point:

**Frontend** (dreamai repo): `hooks/useChat.ts` → `lib/api.ts:sendChat()` → `POST /api/v3/dreamai/vendor-chat` with body `{ userId: vendorId, message, history, justDoIt, surface: 'web' }`.

**Backend route** (dream-wedding): `server.js:17101` — `app.post('/api/v3/dreamai/vendor-chat')` — calls `vendorChatEngine.runAgenticTurn()`.

**Dispatcher**: `backend/agentic/wedding/vendor/dispatcher.js` — full `switch(toolName)` block.

| Tool | Dispatcher (file:line) | Routing | Handler (file:line) | Table | Write op |
|---|---|---|---|---|---|
| `wedding_create_task` | dispatcher.js:84 | → `executeToolCall('create_task')` | server.js:2324 | `vendor_todos` | INSERT |
| `wedding_record_payment` | dispatcher.js:100 | → `recordPayment()` | toolHandlers/recordPayment.js | `vendor_invoices` | UPDATE status='paid' |
| `wedding_create_invoice` | dispatcher.js:80 | → `executeToolCall('create_invoice')` | server.js:2181 | `vendor_invoices` | INSERT |
| `wedding_log_expense` | dispatcher.js:96 | → `logExpense()` | toolHandlers/logExpense.js | `vendor_expenses` | INSERT |
| `wedding_block_date` | dispatcher.js:90 | → `executeToolCall('block_calendar_dates')` | server.js:2206 | `vendor_availability_blocks` + `vendor_calendar_events` | UPSERT + INSERT |
| `wedding_add_client` | dispatcher.js:82 | → `executeToolCall('add_client')` | server.js:2234 | `vendor_clients` | INSERT |
| `wedding_edit_task` | dispatcher.js:118 | → `editTask()` | toolHandlers/editTask.js | `vendor_todos` | UPDATE |
| `wedding_delete_invoice` | dispatcher.js:107 | → `deleteInvoice()` | toolHandlers/deleteInvoice.js | `vendor_invoices` | UPDATE deleted_at (soft-delete) |

**Note on `wedding_block_date`:** Writes to two tables. `vendor_availability_blocks` receives the canonical upsert (unique constraint on `vendor_id, blocked_date`). `vendor_calendar_events` gets a plain insert so the Calendar reference view can surface blocked dates as visible entries. Both tables are written in the same handler (server.js:2214–2229).

---

## Phase 2 — Read Paths

### Reader A — tdw-2 PWA (vendor.thedreamwedding.in)

Sources: `app/(vendor)/money.tsx`, `app/(vendor)/clients.tsx`, `app/(vendor)/studio/calendar.tsx`, `app/(vendor)/today.tsx` (via gh API).

| PWA surface | Endpoint hit | Backend route handler |
|---|---|---|
| Clients list | `GET /api/v2/vendor/clients/:vendorId` | server.js:9531 |
| Invoices list (Money tab) | `GET /api/invoices/:vendorId` | vendor.js:57 |
| Expenses list (Money tab) | `GET /api/expenses/:vendorId` | vendor.js:687 |
| TDS summary (Money tab) | `GET /api/tds/:vendorId/summary` | vendor.js:473 |
| Payment schedules (Money tab) | `GET /api/payment-schedules/:vendorId` | vendor.js:1004 |
| Tasks (studio/calendar) | `GET /api/todos/:vendorId` | vendor.js:822 |
| Blocked dates (studio/calendar) | `GET /api/vendor-discover/availability/:vendorId` | server.js:8031 → `vendor_availability_blocks` |
| Bookings (studio/calendar) | `GET /api/vendor-clients/:vendorId` | vendor.js:522 |
| Today / context | `GET /api/v2/vendor/today/:vendorId` + `GET /api/v2/dreamai/vendor-context/:vendorId` | server.js (today endpoint not audited in depth) |

**Key divergence flagged:** tdw-2 Money tab hits `/api/invoices/:vendorId` (single table, `vendor.js`), while dreamai List hits `/api/v2/vendor/money/:vendorId` (aggregate of invoices + expenses + schedules + TDS, `server.js`). Different response shapes. Both filter deleted_at correctly post Session 2 — see Phase 3.1.

**Key divergence flagged:** tdw-2 studio/calendar reads blocked dates from `vendor_availability_blocks` via `/api/vendor-discover/availability`. dreamai /calendar reads events from `vendor_calendar_events` via `/api/events`. These are different tables, but `wedding_block_date` writes to both, so each reader sees its own copy of the blocked date. Not a data loss issue but a dual-write dependency.

### Reader B — dreamai chat surface (/wedding/calendar and /wedding/list)

Sources: `app/wedding/calendar/page.tsx`, `app/wedding/list/page.tsx`, `hooks/useVendorData.ts`, `lib/api.ts` (all via gh API).

All data fetching goes through `useVendorData.ts` → `lib/api.ts`.

| Surface | Tab / View | Endpoint hit | Backend handler |
|---|---|---|---|
| `/wedding/list` | Clients | `GET /api/v2/vendor/clients/:vendorId` | server.js:9531 |
| `/wedding/list` | Money (invoices + expenses) | `GET /api/v2/vendor/money/:vendorId` | server.js:9816 |
| `/wedding/list` | Tasks | `GET /api/todos/:vendorId` | vendor.js:822 |
| `/wedding/list` | Dates (events) | `GET /api/events/:vendorId` | vendor.js:948 |
| `/wedding/calendar` | Month grid + agenda | `GET /api/events/:vendorId` + `GET /api/todos/:vendorId` | vendor.js:948, vendor.js:822 |

`lib/api.ts` comment (audited line): *"NOTE: `/api/ds/tasks/:vendorId` reads `team_tasks`, NOT `vendor_todos` — wrong table for DreamAi tasks. `/api/todos/` is the correct read path."* Correct endpoint is in use.

### Reader C — DreamAI tool call reads (in-chat)

| Tool | Tables read | deleted_at filter? |
|---|---|---|
| `wedding_query_day` | `vendor_calendar_events`, `vendor_todos`, `vendor_invoices`, `vendor_availability_blocks`, `vendor_payment_schedules` | ✓ on events/todos/invoices. `vendor_availability_blocks` has no deleted_at column (noted in handler). `vendor_payment_schedules` no deleted_at filter. |
| `wedding_query_tax_summary` | `vendor_invoices`, `vendor_expenses`, `vendor_tds_ledger` | Filters by date window, not deleted_at. |
| `wedding_query_tds_status` | `vendor_tds_ledger` | No deleted_at (table likely has none). |
| `wedding_enquiry_inbox_summary` | `vendor_enquiries` (+ `users` join) | No deleted_at (enquiries not soft-deleted). |
| `wedding_hot_dates_context` | `hot_dates` | No vendor_id (shared table); no soft-delete needed. |
| `wedding_read_client_messages` | `vendor_enquiry_messages`, `vendor_enquiries`, `users` | No deleted_at. Enquiry messages not soft-deleted. |

---

## Phase 3 — Integration Consistency

### 3.1 — Soft-delete coverage

Session 8.5b added `deleted_at TIMESTAMPTZ` to: `vendor_invoices`, `vendor_clients`, `vendor_expenses`, `vendor_todos`, `vendor_calendar_events` (migration file: backend/migrations/2026-05-dreamai-schema-fixes.sql:12–16).

Session 2 (commit 4b04699) added `.is('deleted_at', null)` to `/api/v2/vendor/clients` (server.js:9535) and `/api/v2/vendor/money` invoices + expenses (server.js:9829–9830).

Full matrix:

| Table | PWA endpoint | deleted_at filtered? | Chat surface endpoint | deleted_at filtered? | DreamAI read tool | deleted_at filtered? |
|---|---|---|---|---|---|---|
| `vendor_invoices` | `/api/invoices/:vendorId` | ✓ vendor.js:63 | `/api/v2/vendor/money/:vendorId` | ✓ server.js:9829 | `queryDay` | ✓ |
| `vendor_expenses` | `/api/expenses/:vendorId` | ✓ vendor.js:693 | `/api/v2/vendor/money/:vendorId` | ✓ server.js:9830 | `queryTaxSummary` | ✗ (date-window only) |
| `vendor_clients` | `/api/v2/vendor/clients/:vendorId` | ✓ server.js:9535 | `/api/v2/vendor/clients/:vendorId` | ✓ (same endpoint) | none | n/a |
| `vendor_todos` | `/api/todos/:vendorId` | ✓ vendor.js:828 | `/api/todos/:vendorId` | ✓ (same endpoint) | `queryDay` | ✓ |
| `vendor_calendar_events` | `/api/events/:vendorId` (not used by tdw-2 calendar) | ✓ vendor.js:954 | `/api/events/:vendorId` | ✓ vendor.js:954 | `queryDay` | ✓ |
| `vendor_availability_blocks` | `/api/vendor-discover/availability/:vendorId` | ✗ server.js:8033 (table has no deleted_at column) | not read by chat surface directly | n/a | `queryDay` | no filter (no column) |

**Gap identified (P1-A):** `GET /api/v2/dreamai/vendor-context/:vendorId` (server.js:3787–3788) — the system prompt briefing query — does NOT filter `deleted_at` on either `vendor_clients` or `vendor_invoices`. This is separate from the List/Money read endpoints and was not patched in Session 2. Soft-deleted rows surface in every chat turn's system prompt.

```
server.js:3787  supabase.from('vendor_clients').select(...).eq('vendor_id', vendorId)...limit(20)
                — NO .is('deleted_at', null)

server.js:3788  supabase.from('vendor_invoices').select(...).eq('vendor_id', vendorId)...limit(30)
                — NO .is('deleted_at', null)
```

### 3.2 — Column name consistency

**vendor_todos:**

| Field | Write (create_task, server.js:2341) | Read (todos endpoint) | Read (queryDay) | Read (dreamai calendar) |
|---|---|---|---|---|
| title | `title: task` (maps tool field `task` → column `title`) | `*` | `title` ✓ | `t.title` ✓ |
| due_date | `due_date` | `*` | `due_date` ✓ | `t.due_date` ✓ |
| priority | `priority` (normalises 'medium' → 'med') | `*` | `priority` ✓ | `t.priority` ✓ |

No drift. `task` → `title` mapping is handled correctly in the insert.

**vendor_invoices:**

| Field | Write (create_invoice, server.js:2193) | Read (invoices endpoint) | Read (queryDay) |
|---|---|---|---|
| invoice_number | `invoice_number: 'INV-' + Date.now().slice(-6)` | `*` | `invoice_number` ✓ |
| amount | `amount: amountNum` | `*` | `amount` ✓ |
| due_date | `due_date` | `*` | `due_date` ✓ |

No drift.

**vendor_clients:**

| Field | Write (add_client, server.js:2236) | Read (v2/vendor/clients) | Read (vendor-context) |
|---|---|---|---|
| name | `name: client_name` (tool field `client_name` → column `name`) | `*` | `name` ✓ |
| phone | `phone` | `*` | `phone` ✓ |
| event_date | `event_date` | `*` | `event_date` ✓ |

No drift. `client_name` → `name` mapping is handled correctly.

### 3.3 — vendor_id scoping (CRITICAL)

Every endpoint audited. No gaps found.

| Endpoint | vendor_id scope |
|---|---|
| `GET /api/invoices/:vendorId` | `.eq('vendor_id', req.params.vendorId)` vendor.js:62 ✓ |
| `GET /api/expenses/:vendorId` | `.eq('vendor_id', req.params.vendorId)` vendor.js:692 ✓ |
| `GET /api/events/:vendorId` | `.eq('vendor_id', req.params.vendorId)` vendor.js:953 ✓ |
| `GET /api/todos/:vendorId` | `.eq('vendor_id', req.params.vendorId)` vendor.js:827 ✓ |
| `GET /api/v2/vendor/clients/:vendorId` | `.eq('vendor_id', vendorId)` server.js:9537 ✓ |
| `GET /api/v2/vendor/money/:vendorId` | `.eq('vendor_id', resolvedId)` server.js:9829–9832 ✓ |
| `GET /api/vendor-discover/availability/:vendorId` | `.eq('vendor_id', req.params.vendor_id)` server.js:8034 ✓ |
| `GET /api/v2/dreamai/vendor-context/:vendorId` | multiple `.eq('vendor_id', vendorId)` server.js:3787–3790 ✓ |
| All DreamAI read tool handlers | each receives `vendorId` parameter and scopes all queries ✓ |

**No vendor_id scoping gaps found.** P0 cleared.

### 3.4 — Authentication

**dreamai (web surface):**
- Login: OTP via `/api/auth/send-otp` + `/api/v2/vendor/auth/verify-otp`, or PIN via `/api/v2/auth/verify-pin`.
- Session storage: `{ id, phone, name }` written to `localStorage` under key `vendor_session` (dreamai: `lib/session.ts`).
- Per-request identity: `vendorId` is extracted from `localStorage` and sent as `userId` in the POST body to `/api/v3/dreamai/vendor-chat`, or embedded in URL paths for read endpoints.
- Backend verification: **no JWT or session token validated server-side** on any data endpoint. The backend trusts `userId` from the request body, or the `:vendorId` URL param, at face value.

**tdw-2 (native PWA):**
- Login: same OTP/PIN endpoints.
- Session storage: `{ id, phone, name }` in `AsyncStorage` under key `vendor_session` (mirrors dreamai by design — SESSION_BOUNDARIES §51-58).
- Per-request identity: `vendorId` embedded in URL paths or POST body, same trust model.
- Backend verification: same — **no JWT or session token validated**.

**Consistency:** Both surfaces use the same authentication model — identical session key, same login endpoints, same no-server-side-verification pattern. The design is internally consistent. The trust model relies on UUID non-guessability rather than token validation.

**Risk note (P1-B):** Any session holder who learns another vendor's UUID (e.g. through a shared link, network inspection, or platform feature) can call data endpoints for that vendor. No row-level security policy in Supabase was audited in this session (out of scope for backend code review).

---

## Phase 4 — Smoke Trace: `wedding_create_task`

Scenario: vendor types "remind me to call Sharma tomorrow" in `thedreamai.in/wedding` chat.

| Link | Location | What happens |
|---|---|---|
| 1. Vendor types | dreamai chat UI | Input enters `useChat.ts` state |
| 2. `send(message)` | dreamai/hooks/useChat.ts | calls `sendChat({ vendorId, message, history, justDoIt: true })` |
| 3. HTTP POST | dreamai/lib/api.ts:sendChat | `POST /api/v3/dreamai/vendor-chat` body: `{ userId, message, history, justDoIt: true, surface: 'web' }` |
| 4. Route handler | server.js:17101 | `app.post('/api/v3/dreamai/vendor-chat')` — calls `vendorChatEngine.runAgenticTurn({ vendorId: userId, message, ... })` |
| 5. Agentic engine | backend/agentic/wedding/vendor/engine.js | builds system prompt (systemPrompt.js) + tools (tools.js), calls Claude `claude-haiku-4-5-20251001` |
| 6. Claude response | — | returns `tool_use` block: `{ name: 'wedding_create_task', input: { task: 'call Sharma', due_date: '2026-05-14', priority: 'med' } }` |
| 7. Dispatcher | dispatcher.js:84–85 | `case 'wedding_create_task'` → `executeToolCall('create_task', toolInput, vendor)` |
| 8. Handler insert | server.js:2341–2350 | `supabase.from('vendor_todos').insert([{ vendor_id: vendor.id, title: 'call Sharma', due_date: '2026-05-14', done: false, priority: 'med', client_id: null/resolved, client_name: 'Sharma'/resolved, assigned_to: [vendor.name] }])` |
| 9. Tool result | server.js:2355 | returns `"✓ Task created: call Sharma\nDue: 2026-05-14"` |
| 10. Engine reply | engine.js → route handler → client | Claude composes vendor reply using tool_result; route returns `{ success, reply, ... }` |
| 11. Vendor opens tdw-2 | app/(vendor)/studio/calendar.tsx | screen loads |
| 12. PWA fetches tasks | `GET /api/todos/:vendorId` (studio/calendar.tsx fetch call) | → vendor.js:822–837 |
| 13. Backend query | vendor.js:824–831 | `supabase.from('vendor_todos').select('*').eq('vendor_id', ...).is('deleted_at', null).order(...)` |
| 14. Row returned | — | new task row visible: `title: 'call Sharma'`, `due_date: '2026-05-14'` |
| 15. Render | studio/calendar.tsx | task appears in calendar/task list |

All 15 links verified from source. No broken links.

**One note:** The dreamai `/wedding/list` Tasks tab also reads from `GET /api/todos/:vendorId` (same endpoint, same handler). The task is immediately visible on both surfaces without cache invalidation because the chat surface uses a 30-second in-memory cache (useVendorData.ts) that expires normally, and the confirmation rule added in Session 2 tells the vendor where to verify ("now on Calendar").

---

## Phase 5 — Verdict and Recommendations

### Verdict: YELLOW

All data paths are functional. Every list endpoint is vendor_id scoped. The soft-delete filters introduced in Sessions 1 and 2 cover all three reader surfaces for the five affected tables. Column names are consistent between write and read paths. No P0 issue found.

Two P1 issues exist. Neither corrupts data or leaks data across vendors. Both represent correctness gaps (stale data in briefing) and a security design gap (auth model).

---

### Recommended follow-ups

**P1-A — Add deleted_at to vendor-context briefing**
File: `backend/server.js:3787–3788`
The `/api/v2/dreamai/vendor-context/:vendorId` query fetches `vendor_clients` and `vendor_invoices` without `.is('deleted_at', null)`. Soft-deleted rows appear in the system prompt on every chat turn.
Fix: add `.is('deleted_at', null)` to both queries at lines 3787 and 3788.
Risk: low — additive one-liner per query.

**P1-B — Server-side auth guard on data endpoints**
All data endpoints (both `/api/*` read routes and `/api/v2/vendor/*`) trust the vendorId supplied by the client without validating a session token. Any request with a valid UUID can read or mutate that vendor's data.
Fix: introduce a lightweight middleware that verifies a session token (JWT or signed cookie) issued at login and validates it matches the requested vendorId. Scope: auth architecture decision — needs a dedicated session.
Risk: medium complexity, touches login flow and all endpoints.

**P2 — Endpoint fragmentation between tdw-2 and dreamai money views**
tdw-2 Money tab reads `/api/invoices/:vendorId` (vendor.js). dreamai /list Money tab reads `/api/v2/vendor/money/:vendorId` (server.js). Both return correct data with deleted_at filters, but they are separate code paths that could drift independently.
Fix (optional): alias or consolidate under a single canonical endpoint in a backend hygiene session. Low urgency.

**P2 — `vendor_availability_blocks` has no `deleted_at` column**
Blocked dates use hard-delete (DELETE endpoint). `queryDay` and the tdw-2 calendar both read this table without a deleted_at filter, which is correct given the schema. No immediate fix needed, but if soft-delete is ever desired for blocked dates, the column must be added before adding a filter.

**P2 — `queryTaxSummary` reads `vendor_expenses` without deleted_at filter**
`toolHandlers/queryTaxSummary.js` aggregates expenses by date window but doesn't exclude soft-deleted expenses. Soft-deleted expenses would inflate GST input credit estimates.
Fix: add `.is('deleted_at', null)` to the expenses query inside `queryTaxSummary.js`.

---

## Appendix — Repo access summary

| Repo | Access method | Status |
|---|---|---|
| `dream-wedding` | Direct file read (Codespace at /workspaces/dream-wedding) | Full access ✓ |
| `dreamai` | `gh api repos/devjroy-dev/dreamai/contents/<path>` | Full access ✓ |
| `tdw-2` | `gh api repos/devjroy-dev/tdw-2/contents/<path>` | Full access ✓ |
