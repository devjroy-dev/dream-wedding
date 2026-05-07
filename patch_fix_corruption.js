#!/usr/bin/env node
/**
 * patch_fix_corruption.js
 * Removes lines 11296-11532 from backend/server.js:
 *   - Line 11296: corrupted "app.listen()." line
 *   - Lines 11297-11532: duplicate V8 endpoints injected at wrong position
 * Keeps:
 *   - Lines 1-11295: all original content + vendor today endpoint
 *   - Lines 11533+: auth endpoints, health check, all original tail content
 *
 * Run from: /workspaces/dream-wedding
 * Command:  node patch_fix_corruption.js
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'backend', 'server.js');
const src = fs.readFileSync(FILE, 'utf8');
const lines = src.split('\n');

// Safety checks
const expressCount = (src.match(/const express = require/g) || []).length;
if (expressCount !== 1) { console.error(`ABORT: expected 1 express require, found ${expressCount}`); process.exit(1); }

const corruptLine = lines[11295];
if (!corruptLine || !corruptLine.startsWith('app.listen().')) {
  console.error(`ABORT: line 11296 is not the expected corruption. Found: ${JSON.stringify(corruptLine)}`);
  process.exit(1);
}

const resumeLine = lines[11532];
if (!resumeLine || !resumeLine.includes('V9 login fix')) {
  console.error(`ABORT: line 11533 is not the expected resume point. Found: ${JSON.stringify(resumeLine)}`);
  process.exit(1);
}

// Build fixed file: keep lines 1-11295 and lines 11533-end
const fixedLines = lines.slice(0, 11295).concat(lines.slice(11532));
const fixed = fixedLines.join('\n');

// Verify
const moneyCount = (fixed.match(/app\.get\('\/api\/v2\/couple\/money\/:userId'/g) || []).length;
if (moneyCount !== 1) { console.error(`ABORT: ${moneyCount} couple/money registrations`); process.exit(1); }
if (!fixed.includes('TDW_VENDOR_TODAY_V1')) { console.error('ABORT: vendor today missing'); process.exit(1); }
if (!fixed.includes('api/v3/admin/system/health')) { console.error('ABORT: health check missing'); process.exit(1); }
if (fixed.includes('app.listen().')) { console.error('ABORT: corruption still present'); process.exit(1); }

fs.writeFileSync(FILE, fixed, 'utf8');
console.log('✅ Corruption fixed.');
console.log(`   Original: ${lines.length} lines | Fixed: ${fixedLines.length} lines | Removed: ${lines.length - fixedLines.length} lines`);
console.log('   couple/money: once ✓ | Vendor today: present ✓ | Health check: present ✓');
console.log('\nNext: git add backend/server.js && git commit -m "fix: remove corrupted app.listen and duplicate endpoints" && git push');
