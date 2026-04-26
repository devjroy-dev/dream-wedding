#!/bin/bash
set -e
REPO="/workspaces/dream-wedding"
echo "Applying exploring photos bucket fix — backend..."
cp "$(dirname "$0")/backend/server.js" "$REPO/backend/server.js"
echo "✓ server.js"
cd "$REPO"
git add -A
git commit -m "Fix: exploring photos upload — use cover-photos bucket"
git push
echo "✓ Backend deployed"
