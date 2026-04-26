#!/bin/bash
set -e
PATCH_DIR="$(dirname "$0")"
REPO="/workspaces/dream-wedding"
echo "Applying Session 21 — Just Exploring backend..."
cp "$PATCH_DIR/backend/server.js" "$REPO/backend/server.js"
echo "✓ server.js"
cd "$REPO"
git add -A
git commit -m "Feat: Just Exploring dedicated editorial photos — 5 new endpoints"
git push
echo "✓ Backend deployed. Wait for Railway redeploy before running frontend patch."
