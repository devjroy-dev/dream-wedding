#!/usr/bin/env node
/**
 * patch_vendor_today_fix_tier.js
 * Fixes GET /api/v2/vendor/today/:vendorId — removes 'tier' from vendor select.
 * vendors table has no 'tier' column — tier lives in vendor_subscriptions.
 * The unknown column causes .single() to return null → "Vendor not found".
 *
 * Run from: /workspaces/dream-wedding
 * Command:  node patch_vendor_today_fix_tier.js
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'backend', 'server.js');
const src = fs.readFileSync(FILE, 'utf8');

// Safety checks
const expressCount = (src.match(/const express = require/g) || []).length;
if (expressCount !== 1) { console.error(`ABORT: expected 1 express require`); process.exit(1); }

const OLD = `.select('id, name, category, tier')
      .eq('id', vendorId)
      .single();

    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });`;

const NEW = `.select('id, name, category')
      .eq('id', vendorId)
      .maybeSingle();

    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });`;

if (!src.includes(OLD)) {
  console.error('ABORT: target string not found — file may have changed');
  process.exit(1);
}

const patched = src.replace(OLD, NEW);
if (patched === src) { console.error('ABORT: replace had no effect'); process.exit(1); }

fs.writeFileSync(FILE, patched, 'utf8');
console.log('✅ Fixed: removed tier from vendor select, switched to maybeSingle()');
console.log('Next: git add backend/server.js && git commit -m "fix: vendor today - remove tier column, use maybeSingle" && git push');
