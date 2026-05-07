#!/usr/bin/env node
/**
 * patch_remove_duplicate_v8.js
 * Removes the duplicate "V8 BACKEND FIX 2" block from backend/server.js.
 * This block contains duplicate registrations of:
 *   - GET /api/v2/couple/money/:userId
 *   - GET /api/v2/couple/profile/:userId
 *   - GET /api/v2/couple/tokens/:userId
 *   - GET /api/v2/couple/guests/:userId
 * All four already exist earlier in the file. The duplicate block
 * causes a crash: "Cannot read properties of undefined (reading 'get')"
 *
 * Run from: /workspaces/dream-wedding
 * Command:  node patch_remove_duplicate_v8.js
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'backend', 'server.js');
const src = fs.readFileSync(FILE, 'utf8');

// ── Safety checks ─────────────────────────────────────────────────────────────

// Must have exactly 1 express instance
const expressCount = (src.match(/const express = require/g) || []).length;
if (expressCount !== 1) {
  console.error(`ABORT: expected 1 express require, found ${expressCount}`);
  process.exit(1);
}

// Must have exactly 2 couple/money registrations (we're removing one)
const moneyCount = (src.match(/app\.get\('\/api\/v2\/couple\/money\/:userId'/g) || []).length;
if (moneyCount !== 2) {
  console.error(`ABORT: expected 2 couple/money registrations, found ${moneyCount}. Patch may already be applied or file has changed.`);
  process.exit(1);
}

// ── Exact block to remove ─────────────────────────────────────────────────────
// This is the entire V8 BACKEND FIX 2 duplicate block.
// Starts at the ══ comment, ends after the guests endpoint closing });

const DUPLICATE_START = `// ══════════════════════════════════════════════════════════════════════════════
// V8 BACKEND FIX 2 — Plan tab endpoints
// Append to backend/server.js in dream-wedding repo before app.listen().
// No headers. No requires. No top-level const declarations.
// Route handlers only.
// ══════════════════════════════════════════════════════════════════════════════`;

if (!src.includes(DUPLICATE_START)) {
  console.error('ABORT: duplicate block marker not found — file may have already been fixed');
  process.exit(1);
}

// Find start index
const startIdx = src.indexOf(DUPLICATE_START);

// Find the end: after this block we have auth endpoints starting with pin-status
// The block ends after the duplicate couple/guests endpoint closes
// We find the second occurrence of couple/money and then find the closing of guests
const BLOCK_END_MARKER = `\n// ─────────────────────────────────────────────────────────────────────────────\n// V9 restore: pin-status endpoint`;

let endIdx = src.indexOf(BLOCK_END_MARKER, startIdx);

// If V9 marker not found, try the auth pin-status comment
if (endIdx === -1) {
  const ALT_END = `app.get('/api/v2/auth/pin-status'`;
  endIdx = src.indexOf(ALT_END, startIdx);
  if (endIdx === -1) {
    console.error('ABORT: could not find end boundary of duplicate block');
    process.exit(1);
  }
  // Don't include the alt end marker — it stays
}

// Extract what we're about to delete so Dev can verify
const toDelete = src.slice(startIdx, endIdx);
console.log('--- BLOCK TO BE DELETED (preview first 300 chars) ---');
console.log(toDelete.slice(0, 300));
console.log('--- END PREVIEW ---');
console.log(`\nTotal characters to delete: ${toDelete.length}`);

// Verify the block contains exactly what we expect
if (!toDelete.includes("GET /api/v2/couple/money/:userId")) {
  console.error('ABORT: block does not contain expected duplicate endpoint');
  process.exit(1);
}
if (!toDelete.includes("GET /api/v2/couple/guests/:userId")) {
  console.error('ABORT: block does not contain expected guests endpoint');
  process.exit(1);
}

// ── Apply ─────────────────────────────────────────────────────────────────────
const patched = src.slice(0, startIdx) + src.slice(endIdx);

// Verify result has exactly 1 couple/money registration
const newMoneyCount = (patched.match(/app\.get\('\/api\/v2\/couple\/money\/:userId'/g) || []).length;
if (newMoneyCount !== 1) {
  console.error(`ABORT: after patch would have ${newMoneyCount} couple/money registrations — expected 1. Not writing.`);
  process.exit(1);
}

fs.writeFileSync(FILE, patched, 'utf8');
console.log('\n✅ Duplicate V8 block removed. couple/money now registered exactly once.');
console.log('Next: git add backend/server.js && git commit -m "fix: remove duplicate V8 plan tab endpoints causing server crash" && git push');
