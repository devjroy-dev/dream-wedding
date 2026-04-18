'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Home, BookOpen, Users, Heart, ChevronRight, X,
  Compass, CheckSquare, PieChart, Briefcase, Bell,
  Zap, ArrowRight, Sparkles, Phone, Eye, EyeOff,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const API = 'https://dream-wedding-production-89ae.up.railway.app';

const C = {
  cream:      '#FAF6F0',
  ivory:      '#FFFFFF',
  pearl:      '#FBF8F2',
  goldSoft:   '#FFF8EC',
  goldBorder: '#E8D9B5',
  border:     '#EDE8E0',
  dark:       '#2C2420',
  gold:       '#C9A84C',
  goldDeep:   '#B8963A',
  muted:      '#8C7B6E',
  mutedLight: '#C4B8AC',
  blush:      '#FDF6F0',
};

// ─────────────────────────────────────────────────────────────
// COSHARE PERMISSION MATRIX
// All tool screens in future turns call canEdit() / canView().
// Never gate manually inside a tool — always use these helpers.
// ─────────────────────────────────────────────────────────────

type CoShareRole = 'owner' | 'core_duo' | 'inner_circle' | 'bridesmaid' | 'viewer';

const PERMISSIONS: Record<CoShareRole, Record<string, { view: boolean; edit: boolean }>> = {
  owner: {
    checklist:     { view: true,  edit: true  },
    budget:        { view: true,  edit: true  },
    shagun:        { view: true,  edit: true  },
    payment_trail: { view: true,  edit: true  },
    guests:        { view: true,  edit: true  },
    moodboard:     { view: true,  edit: true  },
    vendors:       { view: true,  edit: true  },
    circle:        { view: true,  edit: true  },
  },
  core_duo: {
    checklist:     { view: true,  edit: true  },
    budget:        { view: true,  edit: true  },
    shagun:        { view: true,  edit: true  },
    payment_trail: { view: true,  edit: true  },
    guests:        { view: true,  edit: true  },
    moodboard:     { view: true,  edit: true  },
    vendors:       { view: true,  edit: true  },
    circle:        { view: true,  edit: false },
  },
  inner_circle: {
    checklist:     { view: true,  edit: true  },
    budget:        { view: true,  edit: false },
    shagun:        { view: false, edit: false },
    payment_trail: { view: true,  edit: true  },
    guests:        { view: true,  edit: true  },
    moodboard:     { view: true,  edit: false },
    vendors:       { view: true,  edit: false },
    circle:        { view: true,  edit: false },
  },
  bridesmaid: {
    checklist:     { view: true,  edit: false },
    budget:        { view: false, edit: false },
    shagun:        { view: false, edit: false },
    payment_trail: { view: false, edit: false },
    guests:        { view: false, edit: false },
    moodboard:     { view: true,  edit: false },
    vendors:       { view: false, edit: false },
    circle:        { view: true,  edit: false },
  },
  viewer: {
    checklist:     { view: true,  edit: false },
    budget:        { view: false, edit: false },
    shagun:        { view: false, edit: false },
    payment_trail: { view: false, edit: false },
    guests:        { view: false, edit: false },
    moodboard:     { view: true,  edit: false },
    vendors:       { view: false, edit: false },
    circle:        { view: true,  edit: false },
  },
};

function canEdit(role: CoShareRole, tool: string): boolean {
  return PERMISSIONS[role]?.[tool]?.edit ?? false;
}
function canView(role: CoShareRole, tool: string): boolean {
  return PERMISSIONS[role]?.[tool]?.view ?? false;
}

// ─────────────────────────────────────────────────────────────
// SESSION
// ─────────────────────────────────────────────────────────────

interface CoupleSession {
  id: string;
  name: string;
  partnerName: string;
  weddingDate: string;
  events: string[];
  couple_tier: string;
  coShareRole: CoShareRole;
  foundingBride: boolean;
  token_balance: number;
}

function getSession(): CoupleSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('couple_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSession(s: CoupleSession) {
  try { localStorage.setItem('couple_session', JSON.stringify(s)); } catch {}
}

function clearSession() {
  try { localStorage.removeItem('couple_session'); } catch {}
}

function daysToGo(weddingDate: string): number {
  const d = new Date(weddingDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((d.getTime() - now.getTime()) / 86400000));
}

// ─────────────────────────────────────────────────────────────
// GREETING COPY
// ─────────────────────────────────────────────────────────────

function getGreetingCopy(name: string, days: number): { line1: string; line2: string } {
  const n = name || 'there';
  if (days >= 365) return {
    line1: `The journey begins, ${n}.`,
    line2: "No rush — but let's start well. Here's what matters today.",
  };
  if (days >= 180) return {
    line1: `You're in the planning sweet spot, ${n}.`,
    line2: 'Plenty of time, but momentum matters. Here\'s what to focus on.',
  };
  if (days >= 90) return {
    line1: `Things are picking up, ${n}.`,
    line2: "Let's keep you ahead of it. Here's what needs your attention.",
  };
  if (days >= 30) return {
    line1: `It's getting close, ${n}.`,
    line2: 'The final stretch. Here\'s what still needs to happen.',
  };
  if (days >= 7) return {
    line1: `Almost there, ${n}.`,
    line2: "Just the final pieces now. You've got this.",
  };
  return {
    line1: `This is it, ${n}.`,
    line2: 'Everything else can wait. Today is what matters.',
  };
}

// ─────────────────────────────────────────────────────────────
// TOOL DEFINITIONS
// ─────────────────────────────────────────────────────────────

const TOOLS = [
  { id: 'checklist', label: 'Checklist',   Icon: CheckSquare, tool: 'checklist', tagline: 'Tasks across all your events'       },
  { id: 'budget',    label: 'Budget',       Icon: PieChart,    tool: 'budget',    tagline: 'Envelopes, expenses, Payment Trail' },
  { id: 'guests',    label: 'Guest Ledger', Icon: Users,       tool: 'guests',    tagline: "Who's coming to what"               },
  { id: 'moodboard', label: 'Moodboard',    Icon: Heart,       tool: 'moodboard', tagline: 'Per-event inspiration boards'       },
  { id: 'vendors',   label: 'My Vendors',   Icon: Briefcase,   tool: 'vendors',   tagline: 'Booked, confirmed, paid'            },
];

// ─────────────────────────────────────────────────────────────
// SHARED UI
// ─────────────────────────────────────────────────────────────

function GoldButton({ label, onTap, fullWidth = false }: {
  label: string; onTap: () => void; fullWidth?: boolean;
}) {
  return (
    <button onClick={onTap} style={{
      width: fullWidth ? '100%' : 'auto',
      background: C.dark, border: 'none', borderRadius: 12, cursor: 'pointer',
      padding: '14px 28px', color: C.gold,
      fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 400,
      letterSpacing: '1.5px', textTransform: 'uppercase' as const,
    }}>{label}</button>
  );
}

function GhostButton({ label, onTap }: { label: string; onTap: () => void }) {
  return (
    <button onClick={onTap} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      color: C.muted, fontFamily: 'DM Sans, sans-serif',
      fontSize: 13, fontWeight: 300, padding: '8px',
    }}>{label}</button>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  const [showPw, setShowPw] = useState(false);
  const isPw = type === 'password';
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', fontSize: 11, color: C.muted,
        fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
        letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: 6,
      }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={isPw && !showPw ? 'password' : isPw ? 'text' : type}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            padding: isPw ? '12px 44px 12px 16px' : '12px 16px',
            borderRadius: 10, border: `1px solid ${C.border}`,
            background: C.ivory, fontFamily: 'DM Sans, sans-serif',
            fontSize: 15, color: C.dark, outline: 'none',
          }}
        />
        {isPw && (
          <button onClick={() => setShowPw(p => !p)} style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          }}>
            {showPw ? <EyeOff size={16} color={C.muted} /> : <Eye size={16} color={C.muted} />}
          </button>
        )}
      </div>
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div style={{
      background: '#FEF2F2', border: '1px solid #FECACA',
      borderRadius: 10, padding: '10px 14px', marginBottom: 16,
    }}>
      <p style={{ margin: 0, fontSize: 13, color: '#B91C1C', fontFamily: 'DM Sans, sans-serif' }}>{msg}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────────────────────────

type MainTab = 'home' | 'plan' | 'circle';

function BottomNav({ active, onNav }: { active: MainTab; onNav: (t: MainTab) => void }) {
  const tabs: { id: MainTab; label: string; Icon: any }[] = [
    { id: 'home',   label: 'Home',       Icon: Home     },
    { id: 'plan',   label: 'My Wedding', Icon: BookOpen },
    { id: 'circle', label: 'Circle',     Icon: Users    },
  ];
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: C.ivory, borderTop: `1px solid ${C.border}`,
      display: 'flex', justifyContent: 'space-around',
      padding: 'max(8px, env(safe-area-inset-bottom)) 0 8px',
      zIndex: 50, maxWidth: 480, margin: '0 auto',
    }}>
      {tabs.map(t => {
        const a = active === t.id;
        return (
          <button key={t.id} onClick={() => onNav(t.id)} style={{
            display: 'flex', flexDirection: 'column' as const,
            alignItems: 'center', gap: 2,
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 16px',
          }}>
            <t.Icon size={20} color={a ? C.gold : C.mutedLight} />
            <span style={{
              fontSize: 10, fontWeight: a ? 500 : 300,
              color: a ? C.gold : C.mutedLight,
              fontFamily: 'DM Sans, sans-serif',
            }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODE TOGGLE
// Plan = full planner. Discover = Phase 3 (launching soon).
// Architecture note: when Discover is built, this toggle will
// switch the entire nav + UI. The wiring stays identical —
// only DiscoverTeaser gets replaced with the real browse UI.
// ─────────────────────────────────────────────────────────────

type AppMode = 'plan' | 'discover';

function ModeToggle({ mode, onSwitch }: { mode: AppMode; onSwitch: (m: AppMode) => void }) {
  return (
    <div style={{
      display: 'flex', background: C.cream,
      borderRadius: 20, border: `1px solid ${C.border}`, padding: 3,
    }}>
      {(['plan', 'discover'] as AppMode[]).map(m => (
        <button key={m} onClick={() => onSwitch(m)} style={{
          padding: '5px 16px', borderRadius: 16, border: 'none',
          background: mode === m ? C.dark : 'transparent',
          color: mode === m ? C.gold : C.muted,
          fontSize: 12, fontWeight: mode === m ? 500 : 400,
          fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
          letterSpacing: '0.3px', transition: 'all 0.15s',
        }}>
          {m === 'plan' ? 'Plan' : 'Discover'}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TOP BAR
// ─────────────────────────────────────────────────────────────

function TopBar({ mode, onSwitch, session, onProfileTap }: {
  mode: AppMode; onSwitch: (m: AppMode) => void;
  session: CoupleSession | null; onProfileTap: () => void;
}) {
  const initial = session?.name?.[0]?.toUpperCase() || '?';
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
      background: C.cream, borderBottom: `1px solid ${C.border}`,
      padding: 'max(12px, env(safe-area-inset-top)) 20px 10px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      maxWidth: 480, margin: '0 auto',
    }}>
      <span style={{
        fontFamily: 'Playfair Display, serif', fontSize: 15,
        color: C.gold, fontWeight: 400, letterSpacing: '1px',
      }}>TDW</span>
      <ModeToggle mode={mode} onSwitch={onSwitch} />
      <button onClick={onProfileTap} style={{
        width: 32, height: 32, borderRadius: 16,
        background: C.dark, border: 'none', cursor: 'pointer',
        color: C.gold, fontSize: 13, fontWeight: 500,
        fontFamily: 'DM Sans, sans-serif',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{initial}</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DISCOVER TEASER
// ─────────────────────────────────────────────────────────────

function DiscoverTeaser({ session }: { session: CoupleSession | null }) {
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNotify = async () => {
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length < 10) return;
    setLoading(true);
    try {
      await fetch(`${API}/api/couple/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+91' + clean, user_id: session?.id || null }),
      });
    } catch {}
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div style={{ padding: '80px 28px 100px', textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
      }}>
        <Compass size={28} color={C.gold} />
      </div>
      <h2 style={{
        fontFamily: 'Playfair Display, serif', fontSize: 26,
        color: C.dark, margin: '0 0 10px', fontWeight: 400,
      }}>Discover is coming.</h2>
      <p style={{
        fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: C.muted,
        fontWeight: 300, lineHeight: '22px', margin: '0 0 28px',
      }}>
        India's finest wedding professionals — photographers, decorators,
        mehendi artists, caterers — curated and verified, right here.
        You'll be the first to know when we open.
      </p>
      {!submitted ? (
        <div>
          <div style={{ display: 'flex', gap: 8, maxWidth: 320, margin: '0 auto' }}>
            <input
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="Your phone number"
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 10,
                border: `1px solid ${C.border}`, background: C.ivory,
                fontFamily: 'DM Sans, sans-serif', fontSize: 14,
                color: C.dark, outline: 'none',
              }}
            />
            <button onClick={handleNotify} disabled={loading} style={{
              padding: '12px 16px', borderRadius: 10, background: C.dark,
              border: 'none', cursor: 'pointer', color: C.gold,
              fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500,
              whiteSpace: 'nowrap' as const,
            }}>{loading ? '...' : 'Notify me'}</button>
          </div>
          <p style={{
            margin: '10px 0 0', fontSize: 11, color: C.mutedLight,
            fontFamily: 'DM Sans, sans-serif',
          }}>No spam. Just a message when we're ready.</p>
        </div>
      ) : (
        <div style={{
          background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
          borderRadius: 12, padding: '14px 20px', maxWidth: 280, margin: '0 auto',
        }}>
          <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif' }}>
            You're on the list. 💛
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────────────────────

function HomeScreen({ session, onNavTo }: {
  session: CoupleSession; onNavTo: (tab: MainTab, tool?: string) => void;
}) {
  const days = daysToGo(session.weddingDate);
  const copy = getGreetingCopy(session.name?.split(' ')[0] || '', days);

  return (
    <div style={{ padding: '72px 24px 100px' }}>

      {session.foundingBride && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
          borderRadius: 20, padding: '4px 12px', marginBottom: 20,
        }}>
          <Sparkles size={12} color={C.gold} />
          <span style={{ fontSize: 11, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
            Founding Bride
          </span>
        </div>
      )}

      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'Playfair Display, serif', fontSize: 26,
          color: C.dark, margin: '0 0 6px', fontWeight: 400, lineHeight: '34px',
        }}>{copy.line1}</h1>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: C.muted,
          fontWeight: 300, lineHeight: '22px', margin: 0,
        }}>{copy.line2}</p>
      </div>

      {/* Days to go */}
      <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, marginBottom: 28 }}>
        <span style={{
          fontFamily: 'Playfair Display, serif', fontSize: 36,
          color: C.gold, fontWeight: 600,
        }}>{days}</span>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.muted, fontWeight: 300 }}>
          days to your wedding
        </span>
      </div>

      {/* Today tasks placeholder */}
      <p style={{
        fontSize: 10, color: C.muted, fontWeight: 500, letterSpacing: '3px',
        textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif', margin: '0 0 10px',
      }}>Today</p>
      <div style={{
        background: C.ivory, borderRadius: 14, border: `1px solid ${C.border}`,
        padding: '16px 18px', marginBottom: 24,
      }}>
        <p style={{
          margin: 0, fontSize: 14, color: C.muted,
          fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '22px',
        }}>
          Set up your checklist and we'll show your top tasks for today here.
        </p>
        <button onClick={() => onNavTo('plan', 'checklist')} style={{
          marginTop: 12, display: 'flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}>
          <span style={{ fontSize: 12, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
            Start checklist
          </span>
          <ArrowRight size={12} color={C.gold} />
        </button>
      </div>

      {/* Pulse strip */}
      <p style={{
        fontSize: 10, color: C.muted, fontWeight: 500, letterSpacing: '3px',
        textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif', margin: '0 0 10px',
      }}>At a glance</p>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 24 }}>
        {[
          { label: 'Budget',  sub: 'Set your budget to track spending',          tool: 'budget'  as const },
          { label: 'Guests',  sub: 'Add guests to track confirmations',          tool: 'guests'  as const },
          { label: 'Vendors', sub: 'Log your vendors to track confirmations',    tool: 'vendors' as const },
        ].map(item => (
          <button key={item.tool} onClick={() => onNavTo('plan', item.tool)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: C.ivory, borderRadius: 12, border: `1px solid ${C.border}`,
            padding: '14px 16px', cursor: 'pointer', textAlign: 'left' as const,
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif' }}>{item.label}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>{item.sub}</p>
            </div>
            <ChevronRight size={14} color={C.mutedLight} />
          </button>
        ))}
      </div>

      {/* Events ribbon */}
      {session.events?.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{
            fontSize: 10, color: C.muted, fontWeight: 500, letterSpacing: '3px',
            textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif', margin: '0 0 10px',
          }}>Your events</p>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
            {session.events.map(ev => (
              <span key={ev} style={{
                padding: '5px 12px', borderRadius: 16,
                background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                fontSize: 12, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif',
              }}>{ev}</span>
            ))}
          </div>
        </div>
      )}

      {/* DreamAi */}
      <div style={{
        background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
        borderRadius: 14, padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: C.ivory, border: `1px solid ${C.goldBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Zap size={18} color={C.gold} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 2px', fontSize: 14, color: C.dark, fontFamily: 'Playfair Display, serif' }}>Need help?</p>
          <p style={{ margin: 0, fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
            Ask DreamAi anything on WhatsApp.
          </p>
        </div>
        <a
          href="https://wa.me/14155238886?text=Hi%20DreamAi%2C%20I%20need%20help%20with%20my%20wedding%20planning"
          target="_blank" rel="noreferrer"
          style={{
            width: 32, height: 32, borderRadius: 16, background: C.dark,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, textDecoration: 'none',
          }}
        >
          <ArrowRight size={14} color={C.gold} />
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MY WEDDING SCREEN
// ─────────────────────────────────────────────────────────────

function MyWeddingScreen({ session, onToolOpen }: {
  session: CoupleSession; onToolOpen: (id: string) => void;
}) {
  const days = daysToGo(session.weddingDate);
  return (
    <div style={{ padding: '72px 24px 100px' }}>
      <h1 style={{
        fontFamily: 'Playfair Display, serif', fontSize: 24,
        color: C.dark, margin: '0 0 4px', fontWeight: 400,
      }}>My Wedding</h1>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
        <span style={{ fontSize: 18, color: C.gold, fontFamily: 'Playfair Display, serif', fontWeight: 600 }}>{days}</span>
        {' '}days to go
      </p>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => canView(session.coShareRole, t.tool) ? onToolOpen(t.id) : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              background: C.ivory, borderRadius: 16,
              border: `1px solid ${C.border}`, padding: '18px 20px',
              cursor: canView(session.coShareRole, t.tool) ? 'pointer' : 'default',
              textAlign: 'left' as const,
              opacity: canView(session.coShareRole, t.tool) ? 1 : 0.4,
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 13,
              background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <t.Icon size={20} color={C.gold} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{
                margin: '0 0 3px', fontSize: 16, color: C.dark,
                fontFamily: 'Playfair Display, serif', fontWeight: 400,
              }}>{t.label}</p>
              <p style={{ margin: 0, fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                {t.tagline}
              </p>
            </div>
            {!canEdit(session.coShareRole, t.tool) && canView(session.coShareRole, t.tool) && (
              <span style={{ fontSize: 10, color: C.mutedLight, fontFamily: 'DM Sans, sans-serif' }}>View only</span>
            )}
            <ChevronRight size={14} color={C.mutedLight} />
          </button>
        ))}
      </div>
      <div style={{
        marginTop: 20, padding: '14px 18px',
        background: C.pearl, border: `1px solid ${C.border}`, borderRadius: 12,
      }}>
        <p style={{
          margin: 0, fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif',
          fontWeight: 300, lineHeight: '20px',
        }}>
          {'💛 Tap '}
          <strong style={{ fontWeight: 500, color: C.dark }}>Circle</strong>
          {' to invite your partner, parents, or bridesmaids to collaborate.'}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TOOL PLACEHOLDER (replaced turn by turn)
// ─────────────────────────────────────────────────────────────

function ToolPlaceholder({ toolId, session, onBack }: {
  toolId: string; session: CoupleSession; onBack: () => void;
}) {
  const tool = TOOLS.find(t => t.id === toolId);
  if (!tool) return null;

  const msgs: Record<string, { title: string; body: string }> = {
    checklist: { title: 'Your checklist is ready.',      body: "We'll pre-fill tasks based on your wedding date. Coming in the next update."                               },
    budget:    { title: 'Budget tracking, coming next.', body: 'Set envelopes per event, track every expense, and keep your Payment Trail in one place.'                  },
    guests:    { title: 'Your guest ledger.',            body: "Everyone in one place — who's coming to what, and who still needs a nudge."                                },
    moodboard: { title: 'Your moodboard.',               body: 'Per-event inspiration boards. Pin images, URLs, or just ideas in words.'                                  },
    vendors:   { title: 'Your vendors.',                 body: 'Every person making your wedding happen — their status, payments, and notes, all here.'                   },
  };
  const msg = msgs[toolId] || { title: tool.label, body: 'Coming soon.' };

  return (
    <div style={{ padding: '0 0 100px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '72px 20px 16px', borderBottom: `1px solid ${C.border}`,
      }}>
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: 18, background: C.ivory,
          border: `1px solid ${C.border}`, display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <ChevronRight size={16} color={C.dark} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span style={{ fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>{tool.label}</span>
      </div>
      <div style={{ padding: '48px 28px', textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 18,
          background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <tool.Icon size={24} color={C.gold} />
        </div>
        <h2 style={{
          fontFamily: 'Playfair Display, serif', fontSize: 20,
          color: C.dark, margin: '0 0 8px', fontWeight: 400,
        }}>{msg.title}</h2>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 14,
          color: C.muted, fontWeight: 300, lineHeight: '22px', margin: 0,
        }}>{msg.body}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CIRCLE SCREEN
// ─────────────────────────────────────────────────────────────

function CircleScreen({ session }: { session: CoupleSession }) {
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/co-planner/list/${session.id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setCollaborators(d.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session.id]);

  const roleLabels: Record<string, string> = {
    core_duo: 'Core Duo', inner_circle: 'Inner Circle',
    bridesmaid: 'Bridesmaid', viewer: 'Viewer',
  };

  return (
    <div style={{ padding: '72px 24px 100px' }}>
      <h1 style={{
        fontFamily: 'Playfair Display, serif', fontSize: 24,
        color: C.dark, margin: '0 0 4px', fontWeight: 400,
      }}>Your Circle</h1>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
        The people helping you plan.
      </p>

      <div style={{
        background: C.pearl, border: `1px solid ${C.border}`,
        borderRadius: 14, padding: '16px 18px', marginBottom: 24,
      }}>
        <p style={{
          margin: '0 0 10px', fontSize: 11, color: C.muted, fontWeight: 500,
          letterSpacing: '2px', textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
        }}>Roles</p>
        {[
          { role: 'Core Duo',     desc: 'Full access. For your partner.'                                        },
          { role: 'Inner Circle', desc: 'Most things, not your budget details. For parents and siblings.'       },
          { role: 'Bridesmaid',   desc: 'Moodboard suggestions and checklist view. For friends.'               },
        ].map(r => (
          <div key={r.role} style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 12, color: C.goldDeep, fontWeight: 500, fontFamily: 'DM Sans, sans-serif', minWidth: 100 }}>{r.role}</span>
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 300, fontFamily: 'DM Sans, sans-serif' }}>{r.desc}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>Loading...</p>
      ) : collaborators.length === 0 ? (
        <div style={{
          background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: '28px 20px', textAlign: 'center',
        }}>
          <Users size={28} color={C.goldBorder} style={{ marginBottom: 10 }} />
          <p style={{ margin: '0 0 6px', fontSize: 16, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
            No one in your Circle yet.
          </p>
          <p style={{ margin: 0, fontSize: 13, color: C.muted, fontWeight: 300, fontFamily: 'DM Sans, sans-serif', lineHeight: '20px' }}>
            Invite your partner first — they get full access to everything.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {collaborators.map((c: any) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: C.ivory, borderRadius: 12,
              border: `1px solid ${C.border}`, padding: '14px 16px',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 18,
                background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
              }}>{(c.name || '?')[0].toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif' }}>{c.name || 'Invited'}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                  {roleLabels[c.role] || 'Co-planner'} · {c.status === 'active' ? 'Active' : 'Invite sent'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: 16, padding: '12px 16px',
        background: C.goldSoft, border: `1px solid ${C.goldBorder}`, borderRadius: 12,
      }}>
        <p style={{ margin: 0, fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '20px' }}>
          💛 Invite links coming in the next update. For now, share your planning progress directly from each tool.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PROFILE OVERLAY
// ─────────────────────────────────────────────────────────────

function ProfileOverlay({ session, onClose, onLogout }: {
  session: CoupleSession; onClose: () => void; onLogout: () => void;
}) {
  const tierLabel: Record<string, string> = { free: 'Basic', premium: 'Gold', elite: 'Platinum' };
  const days = daysToGo(session.weddingDate);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(44,36,32,0.5)',
      zIndex: 200, display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.cream, borderRadius: '20px 20px 0 0',
        padding: 'max(24px, env(safe-area-inset-bottom)) 24px 24px',
        width: '100%', maxWidth: 480, margin: '0 auto',
        boxSizing: 'border-box' as const,
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 26, background: C.dark,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
          }}>{session.name?.[0]?.toUpperCase() || '?'}</div>
          <div>
            <p style={{ margin: 0, fontSize: 18, color: C.dark, fontFamily: 'Playfair Display, serif' }}>
              {session.name}{session.partnerName ? ` & ${session.partnerName}` : ''}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              {tierLabel[session.couple_tier] || 'Basic'} · {days} days to go
            </p>
          </div>
        </div>
        {session.foundingBride && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
            borderRadius: 20, padding: '4px 12px', marginBottom: 16,
          }}>
            <Sparkles size={12} color={C.gold} />
            <span style={{ fontSize: 11, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              Founding Bride · Platinum Lifetime
            </span>
          </div>
        )}
        {session.events?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{
              fontSize: 10, color: C.muted, letterSpacing: '2px',
              textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, margin: '0 0 8px',
            }}>Your events</p>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
              {session.events.map(ev => (
                <span key={ev} style={{
                  padding: '4px 10px', borderRadius: 14,
                  background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                  fontSize: 12, color: C.goldDeep, fontFamily: 'DM Sans, sans-serif',
                }}>{ev}</span>
              ))}
            </div>
          </div>
        )}
        <div style={{ height: 1, background: C.border, margin: '4px 0 16px' }} />
        <GhostButton label="Sign out" onTap={onLogout} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────────────────────

const DEFAULT_EVENTS = ['Mehendi', 'Haldi', 'Sangeet', 'Baraat', 'Reception'];

function OnboardingFlow({ prefillCode, onComplete }: {
  prefillCode: string | null; onComplete: (s: CoupleSession) => void;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([...DEFAULT_EVENTS]);
  const [customEvent, setCustomEvent] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeData, setCodeData] = useState<any>(null);

  useEffect(() => {
    if (!prefillCode) return;
    fetch(`${API}/api/couple-codes/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: prefillCode }),
    }).then(r => r.json()).then(d => { if (d.success) setCodeData(d.data); }).catch(() => {});
  }, [prefillCode]);

  const toggleEvent = (ev: string) =>
    setSelectedEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);

  const addCustomEvent = () => {
    const t = customEvent.trim();
    if (t && !selectedEvents.includes(t)) setSelectedEvents(prev => [...prev, t]);
    setCustomEvent('');
  };

  const [sessionInfo, setSessionInfo] = useState('');

  const handleSendOtp = async () => {
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) { setError('Please enter a valid 10-digit phone number'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean }),
      });
      const d = await res.json();
      if (d.success) { setSessionInfo(d.sessionInfo || ''); setOtpSent(true); }
      else setError(d.error || 'Could not send OTP. Please try again.');
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) { setError('Please enter the OTP'); return; }
    setLoading(true); setError('');
    const clean = phone.replace(/\D/g, '').slice(-10);
    try {
      const verRes = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionInfo, code: otp }),
      });
      const verD = await verRes.json();
      if (!verD.success) { setError(verD.error || 'Invalid OTP'); setLoading(false); return; }

      const isFoundingBride = !!(prefillCode && codeData?.couple_tier === 'elite');
      const userRes = await fetch(`${API}/api/couple/onboard`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), partner_name: partnerName.trim(),
          phone: '+91' + clean, wedding_date: weddingDate,
          events: selectedEvents,
          couple_tier: codeData?.couple_tier || 'free',
          founding_bride: isFoundingBride,
          access_code: prefillCode || null,
        }),
      });
      const ud = await userRes.json();
      if (!ud.success) { setError(ud.error || 'Could not create account'); setLoading(false); return; }

      const newSession: CoupleSession = {
        id: ud.data.id,
        name: name.trim(),
        partnerName: partnerName.trim(),
        weddingDate,
        events: selectedEvents,
        couple_tier: ud.data.couple_tier || 'free',
        coShareRole: 'owner',
        foundingBride: isFoundingBride || !!ud.data.founding_bride,
        token_balance: ud.data.token_balance || 0,
      };
      saveSession(newSession);
      onComplete(newSession);
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  };

  const progressPct = (step / 4) * 100;

  return (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ padding: '52px 24px 0', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ height: 2, background: C.border, borderRadius: 1, marginBottom: 36 }}>
          <div style={{ height: 2, background: C.gold, borderRadius: 1, width: `${progressPct}%`, transition: 'width 0.3s ease' }} />
        </div>

        {/* Step 1 — Name */}
        {step === 1 && (
          <div>
            <p style={{ fontSize: 10, color: C.muted, letterSpacing: '3px', textTransform: 'uppercase' as const, fontWeight: 500, margin: '0 0 12px' }}>Step 1 of 4</p>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: C.dark, margin: '0 0 8px', fontWeight: 400 }}>
              {"What's your name?"}
            </h2>
            <p style={{ fontSize: 14, color: C.muted, fontWeight: 300, margin: '0 0 28px', lineHeight: '22px' }}>
              Just your first name is fine.
            </p>
            <InputField label="Your name" value={name} onChange={setName} placeholder="Priya" />
            <ErrorBanner msg={error} />
            <GoldButton fullWidth label="Continue" onTap={() => {
              if (!name.trim()) { setError('Please tell us your name'); return; }
              setError(''); setStep(2);
            }} />
          </div>
        )}

        {/* Step 2 — Partner + Events */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 10, color: C.muted, letterSpacing: '3px', textTransform: 'uppercase' as const, fontWeight: 500, margin: '0 0 12px' }}>Step 2 of 4</p>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: C.dark, margin: '0 0 8px', fontWeight: 400 }}>
              {"And your partner's name?"}
            </h2>
            <p style={{ fontSize: 14, color: C.muted, fontWeight: 300, margin: '0 0 20px', lineHeight: '22px' }}>
              And which events are you planning?
            </p>
            <InputField label="Partner's name" value={partnerName} onChange={setPartnerName} placeholder="Arjun" />
            <p style={{ fontSize: 11, color: C.muted, fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const, margin: '4px 0 10px' }}>
              Your events
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 12 }}>
              {DEFAULT_EVENTS.map(ev => (
                <button key={ev} onClick={() => toggleEvent(ev)} style={{
                  padding: '7px 14px', borderRadius: 20,
                  background: selectedEvents.includes(ev) ? C.dark : C.ivory,
                  border: `1px solid ${selectedEvents.includes(ev) ? C.dark : C.border}`,
                  color: selectedEvents.includes(ev) ? C.gold : C.muted,
                  fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                }}>{ev}</button>
              ))}
              {selectedEvents.filter(e => !DEFAULT_EVENTS.includes(e)).map(ev => (
                <button key={ev} onClick={() => toggleEvent(ev)} style={{
                  padding: '7px 14px', borderRadius: 20, background: C.dark,
                  border: `1px solid ${C.dark}`, color: C.gold,
                  fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                }}>{ev} ×</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <input
                type="text" value={customEvent} onChange={e => setCustomEvent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCustomEvent(); }}
                placeholder="Add another event…"
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10,
                  border: `1px solid ${C.border}`, background: C.ivory,
                  fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.dark, outline: 'none',
                }}
              />
              <button onClick={addCustomEvent} style={{
                padding: '10px 14px', borderRadius: 10,
                background: C.ivory, border: `1px solid ${C.border}`,
                color: C.muted, fontFamily: 'DM Sans, sans-serif', fontSize: 13, cursor: 'pointer',
              }}>Add</button>
            </div>
            <ErrorBanner msg={error} />
            <div style={{ display: 'flex', gap: 10 }}>
              <GhostButton label="Back" onTap={() => setStep(1)} />
              <div style={{ flex: 1 }}>
                <GoldButton fullWidth label="Continue" onTap={() => {
                  if (!partnerName.trim()) { setError("Please add your partner's name"); return; }
                  if (selectedEvents.length === 0) { setError('Please select at least one event'); return; }
                  setError(''); setStep(3);
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Wedding date */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: 10, color: C.muted, letterSpacing: '3px', textTransform: 'uppercase' as const, fontWeight: 500, margin: '0 0 12px' }}>Step 3 of 4</p>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: C.dark, margin: '0 0 8px', fontWeight: 400 }}>
              {"When's the big day?"}
            </h2>
            <p style={{ fontSize: 14, color: C.muted, fontWeight: 300, margin: '0 0 28px', lineHeight: '22px' }}>
              We use this to personalise your checklist and plan ahead with you.
            </p>
            <InputField label="Wedding date" value={weddingDate} onChange={setWeddingDate} type="date" />
            <ErrorBanner msg={error} />
            <div style={{ display: 'flex', gap: 10 }}>
              <GhostButton label="Back" onTap={() => setStep(2)} />
              <div style={{ flex: 1 }}>
                <GoldButton fullWidth label="Continue" onTap={() => {
                  if (!weddingDate) { setError('Please select your wedding date'); return; }
                  setError(''); setStep(4);
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Step 4 — Phone + OTP */}
        {step === 4 && (
          <div>
            <p style={{ fontSize: 10, color: C.muted, letterSpacing: '3px', textTransform: 'uppercase' as const, fontWeight: 500, margin: '0 0 12px' }}>Step 4 of 4</p>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: C.dark, margin: '0 0 8px', fontWeight: 400 }}>
              {!otpSent ? 'Your phone number.' : 'Enter the code.'}
            </h2>
            <p style={{ fontSize: 14, color: C.muted, fontWeight: 300, margin: '0 0 28px', lineHeight: '22px' }}>
              {!otpSent
                ? "We'll send a one-time code to verify it's you."
                : `We sent a 6-digit code to +91 ${phone.replace(/\D/g, '').slice(-10)}.`}
            </p>
            {!otpSent ? (
              <>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 15, color: C.muted, fontFamily: 'DM Sans, sans-serif',
                  }}>+91</span>
                  <input
                    type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="98765 43210"
                    style={{
                      width: '100%', boxSizing: 'border-box' as const,
                      padding: '12px 16px 12px 46px', borderRadius: 10,
                      border: `1px solid ${C.border}`, background: C.ivory,
                      fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: C.dark, outline: 'none',
                    }}
                  />
                </div>
                <ErrorBanner msg={error} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <GhostButton label="Back" onTap={() => setStep(3)} />
                  <div style={{ flex: 1 }}>
                    <GoldButton fullWidth label={loading ? 'Sending…' : 'Send code'} onTap={handleSendOtp} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <InputField label="6-digit code" value={otp} onChange={setOtp} type="tel" placeholder="123456" />
                <ErrorBanner msg={error} />
                <GoldButton fullWidth label={loading ? 'Verifying…' : "Let's go"} onTap={handleVerifyOtp} />
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <button onClick={() => { setOtpSent(false); setOtp(''); setError(''); }} style={{
                    background: 'none', border: 'none', color: C.muted,
                    fontSize: 12, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                  }}>{"Didn't get it? Try again"}</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN APP — all hooks before any early return
// ─────────────────────────────────────────────────────────────

export default function CoupleApp() {
  const [session, setSession] = useState<CoupleSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [appMode, setAppMode] = useState<AppMode>('plan');
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [prefillCode, setPrefillCode] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) setPrefillCode(code.toUpperCase().trim());
    const s = getSession();
    setSession(s);
    setLoading(false);
  }, []);

  const navTo = (tab: MainTab, tool?: string) => {
    setActiveTab(tab);
    setActiveTool(tool || null);
    window.scrollTo(0, 0);
  };

  const handleTabNav = (tab: MainTab) => {
    setActiveTab(tab);
    setActiveTool(null);
    window.scrollTo(0, 0);
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setShowProfile(false);
  };

  // Early returns — ALL hooks already declared above
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: C.cream,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: C.gold }}>
          The Dream Wedding
        </p>
      </div>
    );
  }

  if (!session) {
    return <OnboardingFlow prefillCode={prefillCode} onComplete={s => setSession(s)} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', position: 'relative', minHeight: '100vh' }}>

        <TopBar
          mode={appMode}
          onSwitch={m => { setAppMode(m); setActiveTool(null); }}
          session={session}
          onProfileTap={() => setShowProfile(true)}
        />

        {appMode === 'discover' && <DiscoverTeaser session={session} />}

        {appMode === 'plan' && (
          <>
            {activeTool && (
              <ToolPlaceholder toolId={activeTool} session={session} onBack={() => setActiveTool(null)} />
            )}
            {!activeTool && activeTab === 'home' && (
              <HomeScreen session={session} onNavTo={navTo} />
            )}
            {!activeTool && activeTab === 'plan' && (
              <MyWeddingScreen session={session} onToolOpen={id => setActiveTool(id)} />
            )}
            {!activeTool && activeTab === 'circle' && (
              <CircleScreen session={session} />
            )}
          </>
        )}

        {/* Bottom nav — plan mode, no tool open */}
        {appMode === 'plan' && !activeTool && (
          <BottomNav active={activeTab} onNav={handleTabNav} />
        )}

        {/* Back bar — when inside a tool */}
        {appMode === 'plan' && activeTool && (
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: C.ivory, borderTop: `1px solid ${C.border}`,
            padding: 'max(8px, env(safe-area-inset-bottom)) 24px 8px',
            zIndex: 50, maxWidth: 480, margin: '0 auto',
          }}>
            <button onClick={() => setActiveTool(null)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}>
              <ChevronRight size={14} color={C.muted} style={{ transform: 'rotate(180deg)' }} />
              <span style={{ fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>My Wedding</span>
            </button>
          </div>
        )}

        {/* DreamAi FAB */}
        {appMode === 'plan' && !activeTool && (
          <a
            href="https://wa.me/14155238886?text=Hi%20DreamAi%2C%20I%20need%20help%20with%20my%20wedding%20planning"
            target="_blank" rel="noreferrer"
            style={{
              position: 'fixed',
              bottom: 'calc(max(8px, env(safe-area-inset-bottom)) + 64px)',
              right: 20, width: 48, height: 48, borderRadius: 24,
              background: C.dark, border: `1px solid ${C.goldBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(44,36,32,0.18)',
              textDecoration: 'none', zIndex: 45,
            }}
          >
            <Zap size={20} color={C.gold} />
          </a>
        )}

        {showProfile && (
          <ProfileOverlay session={session} onClose={() => setShowProfile(false)} onLogout={handleLogout} />
        )}
      </div>
    </div>
  );
}
