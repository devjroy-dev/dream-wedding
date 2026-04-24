"""
PHASE 5 — Discovery 3-level system
Repos: both

Changes:
  1. Backend (dream-wedding): GET /api/v2/vendor/profile-level/:vendorId
     — calculates Level 0/1/2 dynamically, returns what's missing + next step hint
  2. Frontend (tdw-2): Full rewrite of vendor/discovery/dash/page.tsx
     — real data from backend, all 6 status states, next step hint, submit button

Run from: /workspaces/dream-wedding  (for backend change)
     then: /workspaces/tdw-2         (for frontend change)

This script detects which repo it's in and applies the correct change.

Command (backend terminal):  python3 phase5_discovery.py
Command (frontend terminal): python3 phase5_discovery.py

SQL: phase5.sql — run in Supabase SQL editor (confirms vendor_images columns exist)
"""

import os, sys

# Detect which repo we're in
CWD = os.getcwd()
IS_BACKEND  = os.path.exists('backend/server.js') and 'dream-wedding' in CWD
IS_FRONTEND = os.path.exists('web/app/vendor') and 'tdw-2' in CWD

if not IS_BACKEND and not IS_FRONTEND:
    print('✗ Run this from /workspaces/dream-wedding OR /workspaces/tdw-2')
    sys.exit(1)

changes = []

# ═════════════════════════════════════════════════════════════════════════════
# BACKEND CHANGE
# GET /api/v2/vendor/profile-level/:vendorId
#
# Returns which level the vendor is at (0, 1, or 2) and exactly what's missing.
# The frontend reads this to show the correct status banner and next step hint.
#
# Level 0: default — nothing done
# Level 1: 4+ photos uploaded, hero set, starting_price, city filled
# Level 2: Level 1 + about (80+ words), 3+ vibe tags, instagram set
#
# Also returns:
#   - completion_pct: from recomputeDiscoverCompletion (stored value, kept fresh)
#   - next_step: the single most important missing field (one at a time)
#   - submitted: whether vendor has submitted for review
#   - approved: whether vendor is live on couple feed
#   - rejected: whether vendor was rejected (with reason)
#   - pending_review: submitted but not yet reviewed
# ═════════════════════════════════════════════════════════════════════════════

if IS_BACKEND:
    BACKEND_PATH = 'backend/server.js'
    with open(BACKEND_PATH, 'r') as f:
        src = f.read()

    # Insert after the existing vendor-discover/status endpoint
    OLD_MARKER = """// ── Request access
app.post('/api/vendor-discover/request-access', async (req, res) => {"""

    NEW_PROFILE_LEVEL = """// ── Profile level calculator
// The single source of truth for where a vendor is in the discovery funnel.
// Frontend uses this to show the correct status banner and next step hint.
app.get('/api/v2/vendor/profile-level/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Fetch vendor row + image count in parallel
    const [{ data: vendor }, { count: imageCount }, { data: sub }] = await Promise.all([
      supabase.from('vendors').select('*').eq('id', vendorId).maybeSingle(),
      supabase.from('vendor_images').select('*', { count: 'exact', head: true }).eq('vendor_id', vendorId),
      supabase.from('vendor_subscriptions').select('tier').eq('vendor_id', vendorId).maybeSingle(),
    ]);

    if (!vendor) return res.status(404).json({ success: false, error: 'vendor not found' });

    const tier = sub?.tier || 'essential';
    const hasHero = Array.isArray(vendor.featured_photos) && vendor.featured_photos.length > 0;
    const photoCount = imageCount || 0;

    // ── Level thresholds ───────────────────────────────────────────────────
    // Level 1: basic info done
    const level1Done = (
      photoCount >= 4 &&
      hasHero &&
      !!vendor.starting_price &&
      !!vendor.city
    );

    // Level 2: full profile done (unlocks Submit button)
    const aboutWordCount = vendor.about ? vendor.about.trim().split(/\s+/).length : 0;
    const level2Done = level1Done && (
      aboutWordCount >= 80 &&
      Array.isArray(vendor.vibe_tags) && vendor.vibe_tags.length >= 3 &&
      !!(vendor.instagram_url || vendor.instagram)
    );

    const level = level2Done ? 2 : level1Done ? 1 : 0;

    // ── Next step hint — show the single most important missing item ────────
    let next_step = null;
    if (!hasHero) {
      next_step = { field: 'hero_photo', label: 'Add a hero photo', href: '/vendor/discovery/images' };
    } else if (photoCount < 4) {
      next_step = { field: 'photos', label: `Add ${4 - photoCount} more photo${4 - photoCount !== 1 ? 's' : ''}`, href: '/vendor/discovery/images' };
    } else if (!vendor.starting_price) {
      next_step = { field: 'pricing', label: 'Add your starting price', href: '/vendor/studio' };
    } else if (!vendor.city) {
      next_step = { field: 'city', label: 'Add your city', href: '/vendor/studio' };
    } else if (aboutWordCount < 80) {
      const wordsLeft = 80 - aboutWordCount;
      next_step = { field: 'about', label: `Write your bio (${wordsLeft} more word${wordsLeft !== 1 ? 's' : ''})`, href: '/vendor/studio' };
    } else if (!Array.isArray(vendor.vibe_tags) || vendor.vibe_tags.length < 3) {
      next_step = { field: 'vibe_tags', label: 'Add at least 3 vibe tags', href: '/vendor/studio' };
    } else if (!vendor.instagram_url && !vendor.instagram) {
      next_step = { field: 'instagram', label: 'Add your Instagram handle', href: '/vendor/studio' };
    }

    // ── Discovery state ────────────────────────────────────────────────────
    const isLive     = !!vendor.discover_listed && !!vendor.is_approved && !!vendor.vendor_discover_enabled;
    const isSubmitted = !!vendor.discover_submitted_at;
    const isApproved  = !!vendor.discover_approved_at;
    const isRejected  = !!vendor.discover_rejected_reason;
    const isPending   = isSubmitted && !isApproved && !isRejected;

    // Recompute completion % so it's always fresh
    await recomputeDiscoverCompletion(vendorId);
    const { data: fresh } = await supabase.from('vendors')
      .select('discover_completion_pct').eq('id', vendorId).maybeSingle();

    res.json({
      success: true,
      level,          // 0, 1, or 2
      tier,
      level1Done,
      level2Done,
      completion_pct: fresh?.discover_completion_pct || 0,
      next_step,      // null if nothing is missing
      // Discovery state flags
      is_live:         isLive,
      is_submitted:    isSubmitted,
      is_approved:     isApproved,
      is_rejected:     isRejected,
      is_pending:      isPending,
      rejection_reason: vendor.discover_rejected_reason || null,
      // Raw counts for frontend display
      photo_count:     photoCount,
      about_word_count: aboutWordCount,
    });
  } catch (err) {
    console.error('[profile-level] error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Request access
app.post('/api/vendor-discover/request-access', async (req, res) => {"""

    if OLD_MARKER in src:
        src = src.replace(OLD_MARKER, NEW_PROFILE_LEVEL)
        with open(BACKEND_PATH, 'w') as f:
            f.write(src)
        changes.append('✓ Backend: GET /api/v2/vendor/profile-level/:vendorId added')
    else:
        changes.append('✗ Backend FAILED — request-access marker not found')

    print('\nPhase 5 — Backend patch complete\n')
    for c in changes:
        print(c)
    print('\nNext: git add -A && git commit -m "Phase 5: profile-level endpoint" && git push')
    print('\nThen run this same script from /workspaces/tdw-2 for the frontend change.')


# ═════════════════════════════════════════════════════════════════════════════
# FRONTEND CHANGE
# Full rewrite of vendor/discovery/dash/page.tsx
#
# The old page was 100% hardcoded static data (65% ring, fake stats).
# This new version:
#   - Fetches real profile level from /api/v2/vendor/profile-level/:vendorId
#   - Fetches real weekly stats from /api/v2/vendor/today/:vendorId (snapshot)
#   - Shows correct status banner for all 6 states:
#       State 0: Level 0 — "Complete your profile to get discovered"
#       State 1: Level 1 — "Step 1 complete — finish your bio to submit"
#       State 2: Level 2 — "Your profile is ready. Submit for Discovery."
#       State 3: Submitted/Pending — "Under review. We'll be in touch within 48 hours."
#       State 4: Live — "You're live. Couples are discovering you."
#       State 5: Rejected — rejection reason shown, resubmit available
#   - Shows "next step" hint below the ring (Issue 14)
#   - Submit for Discovery button active at Level 2
#   - Prestige note for Prestige vendors
# ═════════════════════════════════════════════════════════════════════════════

if IS_FRONTEND:
    DASH_PATH = 'web/app/vendor/discovery/dash/page.tsx'

    DASH_PAGE = """\
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

// ─── Session ─────────────────────────────────────────────────────────────────
function getSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('vendor_session') || localStorage.getItem('vendor_web_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface ProfileLevel {
  level: 0 | 1 | 2;
  tier: string;
  completion_pct: number;
  next_step: { field: string; label: string; href: string } | null;
  is_live: boolean;
  is_submitted: boolean;
  is_approved: boolean;
  is_rejected: boolean;
  is_pending: boolean;
  rejection_reason: string | null;
  photo_count: number;
  about_word_count: number;
}
interface Snapshot {
  views: number; saves: number; enquiries: number;
  views_delta: number; saves_delta: number; enquiries_delta: number;
}

// ─── Circular progress ring ───────────────────────────────────────────────────
function ProfileRing({ percent }: { percent: number }) {
  const r = 30;
  const circumference = 2 * Math.PI * r;
  const filled = circumference * (percent / 100);
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="#2A2825" strokeWidth="5" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke="#C9A84C" strokeWidth="5"
        strokeDasharray={`${filled} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.22,1,0.36,1)' }}
      />
      <text x="36" y="36" textAnchor="middle" dominantBaseline="central"
        fontFamily="'Jost', sans-serif" fontSize="14" fontWeight="400" fill="#F8F7F5">
        {percent}%
      </text>
    </svg>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, delta }: { label: string; value: number; delta: number }) {
  const sign = delta > 0 ? '+' : '';
  const deltaColor = delta > 0 ? '#4CAF50' : delta < 0 ? '#E57373' : '#555250';
  return (
    <div style={{
      background: '#0C0A09', borderRadius: 12, padding: 16, border: '0.5px solid #2A2825',
    }}>
      <p style={{
        fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300,
        color: '#F8F7F5', margin: '0 0 4px', lineHeight: 1,
      }}>{value}</p>
      <p style={{
        fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
        letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8C8480', margin: '0 0 6px',
      }}>{label}</p>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 300,
        color: delta === 0 ? '#555250' : deltaColor, margin: 0,
      }}>{delta === 0 ? '—' : `${sign}${delta} vs last week`}</p>
    </div>
  );
}

// ─── Shimmer ─────────────────────────────────────────────────────────────────
function Shimmer({ h = 60, br = 12 }: { h?: number; br?: number }) {
  return (
    <div style={{
      height: h, borderRadius: br,
      background: 'linear-gradient(90deg, #1A1816 25%, #222 50%, #1A1816 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', marginBottom: 12,
    }} />
  );
}

// ─── Status banner — the heart of this page ───────────────────────────────────
// Shows exactly where the vendor is in the discovery funnel.
// 6 distinct states, each with a clear next action.
function StatusBanner({
  profile, tier, onSubmit, submitting,
}: {
  profile: ProfileLevel;
  tier: string;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const router = useRouter();
  const isPrestige = tier === 'prestige';

  // State 4: Live
  if (profile.is_live) {
    return (
      <div style={{
        background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)',
        borderRadius: 14, padding: '18px 20px',
      }}>
        <p style={{
          fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
          letterSpacing: '0.25em', textTransform: 'uppercase', color: '#4CAF50', margin: '0 0 6px',
        }}>● LIVE</p>
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
          color: '#F8F7F5', margin: '0 0 4px', lineHeight: 1.5,
        }}>You're live. Couples are discovering you.</p>
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
          color: '#555250', margin: 0,
        }}>Keep adding photos to stay top of the feed.</p>
      </div>
    );
  }

  // State 3: Pending review
  if (profile.is_pending) {
    return (
      <div style={{
        background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)',
        borderRadius: 14, padding: '18px 20px',
      }}>
        <p style={{
          fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
          letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 6px',
        }}>UNDER REVIEW</p>
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
          color: '#F8F7F5', margin: '0 0 4px', lineHeight: 1.5,
        }}>We personally review every Maker.</p>
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
          color: '#555250', margin: 0,
        }}>We'll reach out within 48 hours on WhatsApp or Instagram.</p>
      </div>
    );
  }

  // State 5: Rejected
  if (profile.is_rejected && !profile.is_live) {
    return (
      <div style={{
        background: 'rgba(229,115,115,0.08)', border: '1px solid rgba(229,115,115,0.25)',
        borderRadius: 14, padding: '18px 20px',
      }}>
        <p style={{
          fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
          letterSpacing: '0.25em', textTransform: 'uppercase', color: '#E57373', margin: '0 0 6px',
        }}>PROFILE NEEDS WORK</p>
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
          color: '#F8F7F5', margin: '0 0 8px', lineHeight: 1.5,
        }}>{profile.rejection_reason || 'Your profile needs some updates before going live.'}</p>
        <button onClick={onSubmit} disabled={submitting || profile.level < 2} style={{
          fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: '#C9A84C', background: 'none', border: 'none',
          padding: 0, cursor: 'pointer',
        }}>RESUBMIT →</button>
      </div>
    );
  }

  // State 2: Level 2 complete — Submit button active
  if (profile.level >= 2) {
    return (
      <div style={{
        background: 'rgba(201,168,76,0.08)', border: '1.5px solid #C9A84C',
        borderRadius: 14, padding: '18px 20px',
      }}>
        <p style={{
          fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
          letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 6px',
        }}>READY TO SUBMIT</p>
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
          color: '#F8F7F5', margin: '0 0 4px', lineHeight: 1.5,
        }}>Your profile is ready.{isPrestige ? ' As a Prestige Maker, you go live immediately.' : ' Submit for Discovery.'}</p>
        {!isPrestige && (
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
            color: '#555250', margin: '0 0 14px',
          }}>We review every submission personally. Within 48 hours.</p>
        )}
        <button
          onClick={onSubmit}
          disabled={submitting}
          style={{
            height: 44, padding: '0 24px',
            background: submitting ? '#2A2825' : '#C9A84C',
            color: submitting ? '#555250' : '#0C0A09',
            border: 'none', borderRadius: 100, cursor: submitting ? 'default' : 'pointer',
            fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 400,
            letterSpacing: '0.2em', textTransform: 'uppercase',
          }}
        >{submitting ? 'Submitting...' : isPrestige ? 'Go Live Now →' : 'Submit for Discovery →'}</button>
      </div>
    );
  }

  // State 1: Level 1 complete
  if (profile.level === 1) {
    return (
      <div style={{
        background: '#1A1816', border: '0.5px solid #2A2825',
        borderRadius: 14, padding: '18px 20px',
      }}>
        <p style={{
          fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
          letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 6px',
        }}>STEP 1 OF 2 COMPLETE</p>
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
          color: '#F8F7F5', margin: '0 0 4px', lineHeight: 1.5,
        }}>Basic info done. Finish your bio to unlock Submit.</p>
        <button onClick={() => router.push('/vendor/studio')} style={{
          fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: '#C9A84C', background: 'none', border: 'none',
          padding: 0, cursor: 'pointer', marginTop: 10,
        }}>COMPLETE PROFILE →</button>
      </div>
    );
  }

  // State 0: Level 0 — nothing done yet
  return (
    <div style={{
      background: '#1A1816', border: '0.5px solid #2A2825',
      borderRadius: 14, padding: '18px 20px',
    }}>
      <p style={{
        fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
        letterSpacing: '0.25em', textTransform: 'uppercase', color: '#8C8480', margin: '0 0 6px',
      }}>NOT YET DISCOVERABLE</p>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
        color: '#F8F7F5', margin: '0 0 4px', lineHeight: 1.5,
      }}>Complete your profile to get discovered by couples.</p>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
        color: '#555250', margin: '0 0 14px',
      }}>Add 4 photos, a hero image, your city, and a starting price to reach Level 1.</p>
      <button onClick={() => router.push('/vendor/discovery/images')} style={{
        fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
        letterSpacing: '0.2em', textTransform: 'uppercase',
        color: '#C9A84C', background: 'none', border: 'none',
        padding: 0, cursor: 'pointer',
      }}>ADD YOUR FIRST PHOTO →</button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DiscoveryDashPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(undefined);
  const [profile, setProfile] = useState<ProfileLevel | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // ─── Auth + data fetch ───────────────────────────────────────────────────
  useEffect(() => {
    const s = getSession();
    setSession(s);
    if (!s?.vendorId && !s?.id) {
      router.replace('/vendor/login');
      return;
    }
    const vendorId = s.vendorId || s.id;

    // Fetch profile level and weekly snapshot in parallel
    Promise.all([
      fetch(`${API}/api/v2/vendor/profile-level/${vendorId}`).then(r => r.json()),
      fetch(`${API}/api/v2/vendor/today/${vendorId}`).then(r => r.json()),
    ]).then(([levelData, todayData]) => {
      if (levelData.success) setProfile(levelData);
      if (todayData.snapshot) setSnapshot(todayData.snapshot);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  // ─── Submit for Discovery ────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const s = getSession();
    if (!s || submitting) return;
    const vendorId = s.vendorId || s.id;
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/api/vendor-discover/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId }),
      });
      const d = await r.json();
      if (d.success) {
        showToast(d.auto_approved
          ? '✓ You\'re live! Couples can discover you now.'
          : '✓ Submitted. We\'ll be in touch within 48 hours.');
        // Refresh profile level
        const fresh = await fetch(`${API}/api/v2/vendor/profile-level/${vendorId}`).then(r => r.json());
        if (fresh.success) setProfile(fresh);
      } else {
        showToast(d.error || 'Submission failed. Please try again.');
      }
    } catch {
      showToast('Could not submit — check your connection.');
    } finally {
      setSubmitting(false);
    }
  }, [submitting]);

  if (session === undefined) return null;
  if (!session) return null;

  const tier = profile?.tier || 'essential';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#111', color: '#F8F7F5',
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
          padding: '10px 18px', borderRadius: 8, zIndex: 300, whiteSpace: 'nowrap',
        }}>{toast}</div>
      )}

      <div style={{
        background: '#0C0A09', minHeight: '100dvh',
        paddingTop: 24,
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom) + 24px)',
      }}>

        {/* Header */}
        <div style={{ padding: '0 20px 24px' }}>
          <p style={{
            fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
            letterSpacing: '0.25em', textTransform: 'uppercase', color: '#8C8480', margin: '0 0 6px',
          }}>YOUR DISCOVERY</p>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300,
            color: '#F8F7F5', margin: 0, lineHeight: 1.1,
          }}>Discover Dash</h1>
        </div>

        {/* Profile completion ring + next step */}
        <div style={{ padding: '0 20px 20px' }}>
          {loading ? <Shimmer h={96} /> : (
            <div style={{
              background: '#111111', borderRadius: 16, padding: 20,
              border: '0.5px solid #2A2825',
              display: 'flex', alignItems: 'center', gap: 20,
            }}>
              <ProfileRing percent={profile?.completion_pct || 0} />
              <div style={{ flex: 1 }}>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 300,
                  color: '#F8F7F5', margin: '0 0 4px', lineHeight: 1.2,
                }}>Profile strength</p>

                {/* Next step hint — one actionable item at a time (Issue 14) */}
                {profile?.next_step ? (
                  <button
                    onClick={() => router.push(profile.next_step!.href)}
                    style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                      color: '#C9A84C', background: 'none', border: 'none',
                      padding: 0, cursor: 'pointer', textAlign: 'left',
                      margin: '0 0 8px', lineHeight: 1.4,
                    }}
                  >→ {profile.next_step.label}</button>
                ) : (
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                    color: '#4CAF50', margin: '0 0 8px',
                  }}>Profile complete ✓</p>
                )}

                {/* Level pill */}
                <span style={{
                  fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 300,
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 100,
                  background: 'rgba(201,168,76,0.12)', color: '#C9A84C',
                }}>
                  {profile?.is_live ? 'Live' : `Level ${profile?.level || 0} of 2`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Status banner */}
        <div style={{ padding: '0 20px 20px' }}>
          {loading ? <Shimmer h={110} /> : profile && (
            <StatusBanner
              profile={profile}
              tier={tier}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}
        </div>

        {/* Weekly stats */}
        <div style={{ padding: '0 20px 20px' }}>
          <p style={{
            fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
            letterSpacing: '0.25em', textTransform: 'uppercase', color: '#8C8480', margin: '0 0 12px',
          }}>THIS WEEK</p>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Shimmer h={88} /><Shimmer h={88} /><Shimmer h={88} /><Shimmer h={88} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCard label="Profile Views" value={snapshot?.views || 0}     delta={snapshot?.views_delta || 0} />
              <StatCard label="Saves"         value={snapshot?.saves || 0}      delta={snapshot?.saves_delta || 0} />
              <StatCard label="Enquiries"     value={snapshot?.enquiries || 0}  delta={snapshot?.enquiries_delta || 0} />
              <StatCard label="Photos"        value={profile?.photo_count || 0} delta={0} />
            </div>
          )}
        </div>

        {/* Preview CTA */}
        <div style={{ padding: '0 20px 20px' }}>
          <button
            onClick={() => router.push('/vendor/studio/discovery-preview')}
            style={{
              width: '100%', background: '#111111',
              borderRadius: 16, padding: '18px 20px', border: '0.5px solid #2A2825',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', boxSizing: 'border-box',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 300,
                color: '#F8F7F5', margin: '0 0 4px',
              }}>See your profile</p>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                color: '#8C8480', margin: 0,
              }}>Exactly how couples experience you</p>
            </div>
            <span style={{
              fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 400,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: '#C9A84C', whiteSpace: 'nowrap', marginLeft: 16,
            }}>PREVIEW →</span>
          </button>
        </div>

        {/* Trial / founding badge */}
        <div style={{ padding: '0 20px' }}>
          <div style={{
            background: 'rgba(201,168,76,0.07)', border: '0.5px solid rgba(201,168,76,0.2)',
            borderRadius: 12, padding: '14px 18px',
          }}>
            <p style={{
              fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
              letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 4px',
            }}>FOUNDING MAKER</p>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
              color: '#F8F7F5', margin: '0 0 2px', lineHeight: 1.5,
            }}>Signature free until 1 August 2026.</p>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
              color: '#555250', margin: 0,
            }}>After that, ₹1,999/month or Essential free.</p>
          </div>
        </div>

      </div>
    </>
  );
}
"""

    with open(DASH_PATH, 'w') as f:
        f.write(DASH_PAGE)
    changes.append(f'✓ Frontend: {DASH_PATH} fully rewritten — real data, all 6 states, next step hint, submit button')

    print('\nPhase 5 — Frontend patch complete\n')
    for c in changes:
        print(c)
    print('\nNext: git add -A && git commit -m "Phase 5: Discover Dash — real data, 3-level system, submit flow" && git push')
