#!/usr/bin/env python3
"""
patch_home_images_v2.py

CORRECTED TARGET. Railway is configured with Root Directory = `backend/`,
so the file actually being executed is `backend/server.js`, not the root
`server.js`. The earlier patch (patch_home_images.py) wrote to the wrong
file. This one writes to the correct file.

Adds ONLY `/api/v2/frost/home-images/:userId` to backend/server.js.
The public `/api/v2/discover-heroes` endpoint is already present in
backend/server.js at line ~15624 (no need to add it again).

Inserted directly above the FROST CIRCLE block (a stable anchor that
exists in both files).

Idempotent: refuses to apply if the home-images endpoint is already
present.
"""

import sys, pathlib, subprocess

PATH = pathlib.Path('/workspaces/dream-wedding/backend/server.js')

NEW_BLOCK = """
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v2/frost/home-images/:userId
// Composite picker for the Frost landing's two image boxes. Called on every
// home-screen entry (mount + focus). Returns one Muse image + one Discover
// hero image, anti-collision enforced.
//
// Behaviour:
//   - Discover image: random pick from active discover_heroes
//   - Muse image: random pick from moodboard_items.image_url where user_id = :userId
//   - If Muse is empty → fall back to a DIFFERENT hero than Discover picked
//   - If Discover heroes is also empty → both fields null (frontend shows cream)
//   - Anti-collision: muse_image_url !== discover_image_url, always
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/v2/frost/home-images/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    const now = new Date().toISOString();

    // ── Pull Discover heroes (active + in window) ──
    const { data: heroes } = await supabase
      .from('discover_heroes')
      .select('image_url')
      .eq('is_active', true)
      .or(`visible_from.is.null,visible_from.lte.${now}`)
      .or(`visible_to.is.null,visible_to.gte.${now}`)
      .order('sort_order', { ascending: true })
      .limit(50);

    const heroUrls = (heroes || []).map(h => h.image_url).filter(Boolean);

    // ── Pull bride's Muse saves ──
    const { data: museRows } = await supabase
      .from('moodboard_items')
      .select('image_url')
      .eq('user_id', userId)
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    const museUrls = (museRows || []).map(m => m.image_url).filter(Boolean);

    const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const pickRandomExcept = (arr, exclude) => {
      const filtered = arr.filter(u => u !== exclude);
      if (filtered.length === 0) return null;
      return filtered[Math.floor(Math.random() * filtered.length)];
    };

    // ── Discover slot first (always heroes, never falls back) ──
    let discoverUrl = heroUrls.length > 0 ? pickRandom(heroUrls) : null;

    // ── Muse slot: prefer real Muse, fall back to a *different* hero ──
    let museUrl = null;
    if (museUrls.length > 0) {
      // Prefer a Muse URL that isn't the chosen discoverUrl.
      museUrl = pickRandomExcept(museUrls, discoverUrl) || museUrls[0];
      // If we ended up with the same URL (single-item Muse that matches
      // discover), repick discover instead.
      if (museUrl === discoverUrl && heroUrls.length > 1) {
        discoverUrl = pickRandomExcept(heroUrls, museUrl);
      }
    } else if (heroUrls.length >= 2) {
      // Empty Muse → fall back to another hero, distinct from Discover's pick.
      museUrl = pickRandomExcept(heroUrls, discoverUrl);
    } else {
      museUrl = null;
    }

    res.json({
      success: true,
      muse_image_url: museUrl,
      discover_image_url: discoverUrl,
      muse_is_fallback: museUrls.length === 0,
    });
  } catch (err) {
    console.error('[frost/home-images]', err.message);
    res.status(500).json({
      success: false,
      muse_image_url: null,
      discover_image_url: null,
      error: err.message,
    });
  }
});

"""

ANCHOR = "// FROST CIRCLE ENDPOINTS — ZIP 8"

def main():
    if not PATH.exists():
        print(f"ERROR: {PATH} not found.", file=sys.stderr)
        sys.exit(1)

    src = PATH.read_text()

    if "/api/v2/frost/home-images/" in src:
        print("Patch already applied (home-images endpoint present in backend/server.js). No change.")
        sys.exit(0)

    if ANCHOR not in src:
        print(f"ERROR: anchor '{ANCHOR}' not found in {PATH}. Aborting.", file=sys.stderr)
        sys.exit(2)

    HEADER = "// ─────────────────────────────────────────────────────────────────────────────\n// FROST CIRCLE ENDPOINTS — ZIP 8"

    if HEADER not in src:
        new_src = src.replace(ANCHOR, NEW_BLOCK.lstrip() + "\n" + ANCHOR, 1)
    else:
        new_src = src.replace(HEADER, NEW_BLOCK.lstrip() + "\n" + HEADER, 1)

    if new_src == src:
        print("ERROR: replacement produced no change. Aborting.", file=sys.stderr)
        sys.exit(3)

    PATH.write_text(new_src)
    print(f"✓ Patch applied — added /api/v2/frost/home-images/:userId to {PATH}")

    try:
        result = subprocess.run(['node', '--check', str(PATH)], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"⚠ node --check FAILED:\n{result.stderr}", file=sys.stderr)
            sys.exit(4)
        print("✓ node --check passed")
    except FileNotFoundError:
        print("⚠ node not on PATH — skipping syntax check (run manually)")

if __name__ == '__main__':
    main()
