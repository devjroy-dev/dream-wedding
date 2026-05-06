# TDW V5 Deploy Instructions

## ZIP 1 — Drop-in files (tdw-2 repo)
These 4 files go directly into the repo. No editing.

| File in ZIP | Destination |
|---|---|
| couple_dreamai.tsx | app/(couple)/dreamai.tsx |
| vendor_dreamai.tsx | app/(vendor)/dreamai.tsx |
| couple_layout.tsx  | app/(couple)/_layout.tsx |
| vendor_layout.tsx  | app/(vendor)/_layout.tsx |

## ZIP 2 — Patcher scripts (run in Codespace terminal)

### For tdw-2 repo (plan.tsx patches):
1. Copy patch_plan.py to the tdw-2 repo root in Codespace
2. cd to tdw-2 repo root
3. Run: python3 patch_plan.py
4. Check output — it will confirm each patch or abort with an error message
5. If it aborts: backup is at app/(couple)/plan.tsx.bak, no damage done

### For dream-wedding repo (backend patches):
1. Copy patch_backend_v5.py and backend_v5_reference.md to dream-wedding repo root
2. cd to dream-wedding repo root
3. Run: python3 patch_backend_v5.py
4. Check output — any failed patches are listed with exact manual fallback
5. If any patches fail, use backend_v5_reference.md for exact code to insert manually

## Deploy sequence after all patches applied

### Backend first:
cd dream-wedding
git add -A && git commit -m "V5: web_search + get_muse_saves + multimodal DreamAi"
git push origin main
# Railway auto-deploys. Check Railway logs.
# Run verification curls from backend_v5_reference.md

### Then native OTA update:
cd tdw-2
git add -A && git commit -m "V5: DreamAi couple + vendor + SURPRISE ME + pill nav wired"
eas update --branch production --message "V5: DreamAi couple + vendor + SURPRISE ME"

## Test checklist on Galaxy S24

Couple DreamAi:
[ ] Tap ✦ AI pill from PLAN tab → opens DreamAi full page
[ ] PLAN pill in DreamAi → navigates back to PLAN
[ ] Status dot turns gold when context loads
[ ] 4 quick prompt chips show on empty state
[ ] Type message → send → reply renders with bold text support
[ ] 📷 button → Alert with Camera / Photo Library → attach image
[ ] Attach invoice image → DreamAi auto-logs as expense
[ ] Attach inspiration image → DreamAi auto-saves to Muse
[ ] "What are good florists in Lajpat Nagar?" → web search reply

Vendor DreamAi:
[ ] Navigates to vendor DreamAi (wire entry point — see note in delivery summary)
[ ] Proactive briefing appears if overdue invoices / pending enquiries
[ ] Suggestion chips show and fire on tap
[ ] Just Do It toggle persists across sessions
[ ] Type action request → action card appears → Confirm executes → context refreshes
[ ] Multi-action chain: extra actions queue correctly

Muse SURPRISE ME:
[ ] Button appears in Muse header (gold, ✦ SURPRISE ME)
[ ] Tap → loading state → results sheet appears
[ ] Tap result image → saves to board → toast confirms
[ ] Board reloads after save
