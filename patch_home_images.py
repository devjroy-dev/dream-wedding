#!/usr/bin/env python3
"""
patch_home_images.py

Adds two endpoints to ROOT server.js (Railway runs root, not backend/):

  1. GET /api/v2/discover-heroes
     Public, unauthenticated. Returns active hero rows ordered by sort_order.
     Reads from discover_heroes table (admin already managed via existing
     admin endpoints in backend/server.js — table is live in Supabase).

  2. GET /api/v2/frost/home-images/:userId
     Composite. Frost landing calls this every time the bride opens the home
     screen. Returns { muse_image_url, discover_image_url }.

     Logic:
       - Discover image: random row from active discover_heroes
       - Muse image: random row from moodboard_items where user_id = :userId
       - If Muse is empty → fallback to a different hero than Discover got
       - Anti-collision enforced (the two URLs are never equal)

Inserted directly above the FROST CIRCLE block (a stable, identifiable anchor).
Idempotent: refuses to apply if either endpoint string is already present.
"""

import sys, pathlib, subprocess

PATH = pathlib.Path('/workspaces/dream-wedding/server.js')

NEW_BLOCK = """
// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC: GET /api/v2/discover-heroes
// Frost native reads this — public, unauthenticated, only active rows.
// Mirror of the admin-only version in backend/server.js (which Railway does
// not run). Required for the Frost landing's Discover box image picker.
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/v2/discover-heroes', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('discover_heroes')
      .select('id, image_url, caption, category_tag, cta_url, sort_order')
      .eq('is_active', true)
      .or(`visible_from.is.null,visible_from.lte.${now}`)
      .or(`visible_to.is.null,visible_to.gte.${now}`)
      .order('sort_order', { ascending: true })
      .limit(20);
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[discover-heroes GET]', err.message);
    res.status(500).json({ success: false, data: [], error: err.message });
  }
});

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
      // (Statistically rare collision but enforced.)
      museUrl = pickRandomExcept(museUrls, discoverUrl) || museUrls[0];
      // If after filtering we ended up with the same URL (single-item Muse
      // that matches discover), repick discover instead.
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
        print("Patch already applied (home-images endpoint present). No change.")
        sys.exit(0)

    if "/api/v2/discover-heroes" in src and "app.get('/api/v2/discover-heroes'" in src:
        print("Patch already applied (discover-heroes endpoint present). No change.")
        sys.exit(0)

    if ANCHOR not in src:
        print(f"ERROR: anchor '{ANCHOR}' not found in server.js. Aborting.", file=sys.stderr)
        sys.exit(2)

    # Insert NEW_BLOCK directly above the FROST CIRCLE comment block.
    # The block comment line is preceded by "// ─────...─────"; we want our
    # block above the entire decorative header.
    HEADER = "// ─────────────────────────────────────────────────────────────────────────────\n// FROST CIRCLE ENDPOINTS — ZIP 8"

    if HEADER not in src:
        # Fallback: insert just before the bare anchor line
        new_src = src.replace(ANCHOR, NEW_BLOCK.lstrip() + "\n" + ANCHOR, 1)
    else:
        new_src = src.replace(HEADER, NEW_BLOCK.lstrip() + "\n" + HEADER, 1)

    if new_src == src:
        print("ERROR: replacement produced no change. Aborting.", file=sys.stderr)
        sys.exit(3)

    PATH.write_text(new_src)
    print("✓ Patch applied — added /api/v2/discover-heroes and /api/v2/frost/home-images/:userId")

    # Syntax check
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
