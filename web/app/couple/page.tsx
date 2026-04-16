'use client';

import { useState, useEffect } from 'react';
import {
  Home, Heart, Calendar, MessageCircle, User, Search, MapPin,
  Award, ChevronRight, ArrowLeft, PieChart, Users, CheckCircle,
  BookOpen, Briefcase, CreditCard, Gift, Globe, Zap, Star,
  Clock, Camera, Layout, Compass, Plus, X, Phone, Send,
  ArrowRight, Share2, Filter, Trash2, Lock,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

const API = 'https://dream-wedding-production-89ae.up.railway.app';

function getCoupleSession() {
  if (typeof window === 'undefined') return null;
  try { const s = localStorage.getItem('user_session'); return s ? JSON.parse(s) : null; }
  catch { return null; }
}

function getBudgetTier(budget: number): 'essential' | 'signature' | 'luxe' {
  if (budget >= 5000000) return 'luxe';
  if (budget >= 1500000) return 'signature';
  return 'essential';
}

const TIER_GREETINGS: Record<string, string> = {
  essential: 'Every detail matters, and it will be beautiful.',
  signature: 'Balance quality across every moment.',
  luxe: 'This will be remarkable.',
};

const TIER_PHASE_SUBS: Record<string, Record<string, string>> = {
  essential: {
    foundation: 'Set a realistic budget and start smart',
    search: 'Find vendors who deliver magic within your range',
    team: 'Every rupee counts — choose wisely',
    coordination: 'Streamline everything, waste nothing',
    final: 'You\'ve planned beautifully — now enjoy it',
    wedding_week: 'This is your moment',
  },
  signature: {
    foundation: 'The essentials that shape everything',
    search: 'Discover vendors who bring your vision to life',
    team: 'Assemble the people who make the dream real',
    coordination: 'Every detail, beautifully managed',
    final: 'Almost there — make it perfect',
    wedding_week: 'This is your moment',
  },
  luxe: {
    foundation: 'Architect an extraordinary celebration',
    search: 'Curate India\'s finest for your vision',
    team: 'Orchestrate with precision and taste',
    coordination: 'Every element, flawlessly composed',
    final: 'Perfection is in the details',
    wedding_week: 'Your legacy begins',
  },
};

const JOURNEY_PHASES = [
  { id: 'foundation', label: 'Set your foundation', icon: Compass, activatesAt: 999, tools: [
    { id: 'budget', label: 'Budget', icon: PieChart },
    { id: 'guests', label: 'Guest List', icon: Users },
    { id: 'checklist', label: 'Checklist', icon: CheckCircle },
  ]},
  { id: 'search', label: 'Begin the search', icon: Search, activatesAt: 365, tools: [
    { id: 'discover', label: 'Discover Vendors', icon: Compass },
    { id: 'moodboard', label: 'Moodboard', icon: Heart },
  ]},
  { id: 'team', label: 'Build your team', icon: Users, activatesAt: 300, tools: [
    { id: 'my-vendors', label: 'My Vendors', icon: Briefcase },
    { id: 'decision-log', label: 'Decision Log', icon: BookOpen },
    { id: 'payments', label: 'Payments', icon: CreditCard },
  ]},
  { id: 'coordination', label: 'Coordinate the details', icon: Calendar, activatesAt: 120, tools: [
    { id: 'registry', label: 'Registry', icon: Gift },
    { id: 'website', label: 'Wedding Website', icon: Globe },
    { id: 'dream-ai', label: 'DreamAi', icon: Zap, platinumOnly: true },
  ]},
  { id: 'final', label: 'Final touches', icon: Star, activatesAt: 30, tools: [
    { id: 'seating', label: 'Seating Chart', icon: Layout, comingSoon: true },
    { id: 'day-of', label: 'Day-of Timeline', icon: Clock, comingSoon: true },
  ]},
  { id: 'wedding_week', label: 'Your wedding week', icon: Heart, activatesAt: 7, tools: [
    { id: 'memory-box', label: 'Memory Box', icon: Camera, platinumOnly: true, comingSoon: true },
  ]},
];

const PROGRESS_LABELS = ['Engaged', 'Planning', 'Booking', 'Coordination', 'Wedding Week'];

function getProgressIndex(days: number) {
  if (days <= 7) return 4; if (days <= 30) return 3; if (days <= 120) return 3;
  if (days <= 270) return 2; if (days <= 365) return 1; return 0;
}

function getCurrentPhaseId(days: number) {
  if (days <= 7) return 'wedding_week'; if (days <= 30) return 'final';
  if (days <= 120) return 'coordination'; if (days <= 270) return 'team';
  if (days <= 365) return 'search'; return 'foundation';
}

const fmt = (n: number) => {
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n/100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n/1000).toFixed(0)}K`;
  return `₹${n}`;
};

// ── Styles ───────────────────────────────────────────────────────────────────

const css = {
  page: { minHeight: '100vh', background: '#FAF6F0', fontFamily: 'DM Sans, sans-serif' } as React.CSSProperties,
  content: { paddingBottom: '80px', maxWidth: '480px', margin: '0 auto' } as React.CSSProperties,
};

const btn = (active: boolean): React.CSSProperties => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 12px',
});

// ── Bottom Nav ───────────────────────────────────────────────────────────────

function BottomNav({ active, onNav }: { active: string; onNav: (s: string) => void }) {
  const tabs = [
    { id: 'discover', label: 'Discover', Icon: Compass },
    { id: 'moodboard', label: 'Moodboard', Icon: Heart },
    { id: 'planner', label: 'Planner', Icon: Calendar },
    { id: 'inbox', label: 'Inbox', Icon: MessageCircle },
  ];
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, background: '#FFFFFF',
      borderTop: '1px solid #EDE8E0', display: 'flex', justifyContent: 'space-around',
      padding: '8px 0 max(8px, env(safe-area-inset-bottom))', zIndex: 50,
    }}>
      {tabs.map(t => {
        const I = t.Icon;
        const a = active === t.id;
        return (
          <button key={t.id} onClick={() => onNav(t.id)} style={btn(a)}>
            <I size={20} color={a ? '#C9A84C' : '#B8ADA4'} />
            <span style={{ fontSize: '10px', fontWeight: a ? 500 : 300, color: a ? '#C9A84C' : '#B8ADA4' }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Back Header ──────────────────────────────────────────────────────────────

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px' }}>
      <button onClick={onBack} style={{
        width: 36, height: 36, borderRadius: 18, background: '#FFFFFF',
        border: '1px solid #EDE8E0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }}><ArrowLeft size={16} color="#2C2420" /></button>
      <span style={{ fontSize: '18px', color: '#2C2420', fontFamily: 'Playfair Display, serif' }}>{title}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════

export default function CoupleApp() {
  const [screen, setScreen] = useState('discover');
  const [session, setSession] = useState<any>(null);
  const [userName, setUserName] = useState('');
  const [daysToGo, setDaysToGo] = useState<number | null>(null);
  const [budgetTier, setBudgetTier] = useState<string>('signature');
  const [coupleTier, setCoupleTier] = useState<string>('free');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [plannerMode, setPlannerMode] = useState<'journey' | 'tools'>('journey');
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    const s = getCoupleSession();
    if (s) {
      setSession(s);
      setUserName(s.name?.split(' ')[0] || '');
      if (s.budget) setBudgetTier(getBudgetTier(s.budget));
      if (s.wedding_date) {
        const days = Math.max(0, Math.ceil((new Date(s.wedding_date).getTime() - Date.now()) / 86400000));
        setDaysToGo(days);
      }
    }
    try {
      const tier = localStorage.getItem('tdw_couple_tier');
      if (tier) setCoupleTier(tier);
    } catch {}
  }, []);

  const nav = (s: string) => { setActiveTool(null); setScreen(s); window.scrollTo(0, 0); };
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })();
  const progressIdx = daysToGo !== null ? getProgressIndex(daysToGo) : 0;
  const currentPhase = daysToGo !== null ? getCurrentPhaseId(daysToGo) : 'foundation';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={css.page}>
      <div style={css.content}>

        {/* ═══ DISCOVER ═══ */}
        {screen === 'discover' && (
          <div style={{ padding: '60px 24px 24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h1 style={{ fontSize: '24px', color: '#2C2420', fontFamily: 'Playfair Display, serif', margin: 0 }}>
                  {greeting}{userName ? `, ${userName}` : ''}
                </h1>
                {daysToGo !== null ? (
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#8C7B6E', fontWeight: 300 }}>
                    <span style={{ fontSize: '18px', color: '#C9A84C', fontFamily: 'Playfair Display, serif', fontWeight: 600 }}>{daysToGo}</span> days to your wedding
                  </p>
                ) : (
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#8C7B6E', fontWeight: 300 }}>Find your dream wedding team</p>
                )}
              </div>
              <button onClick={() => nav('profile')} style={{
                width: 36, height: 36, borderRadius: 18, background: '#2C2420', border: 'none',
                color: '#C9A84C', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
              }}>{userName?.[0]?.toUpperCase() || 'D'}</button>
            </div>

            {/* Tier greeting */}
            <div style={{ textAlign: 'center', margin: '0 16px 20px', padding: '0' }}>
              <div style={{ width: 24, height: 1, background: '#C9A84C', opacity: 0.35, margin: '0 auto 10px' }} />
              <p style={{ fontSize: '13px', color: '#8C7B6E', fontFamily: 'Playfair Display, serif', fontStyle: 'italic', margin: 0 }}>
                {TIER_GREETINGS[budgetTier] || TIER_GREETINGS.signature}
              </p>
              <div style={{ width: 24, height: 1, background: '#C9A84C', opacity: 0.35, margin: '10px auto 0' }} />
            </div>

            {/* Discover hero */}
            <div onClick={() => {}} style={{
              display: 'flex', alignItems: 'center', gap: '16px', background: '#FFFBF3',
              borderRadius: '16px', padding: '20px', border: '1px solid #E8D9B5', cursor: 'pointer', marginBottom: '10px',
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FFF8EC', border: '1px solid #E8D9B5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Compass size={20} color="#C9A84C" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '16px', color: '#2C2420', fontFamily: 'Playfair Display, serif', margin: 0 }}>Discover Vendors</p>
                <p style={{ fontSize: '11px', color: '#8C7B6E', fontWeight: 300, margin: '3px 0 0' }}>Swipe through India's finest wedding professionals</p>
              </div>
              <ArrowRight size={16} color="#C9A84C" />
            </div>

            {/* Couture */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '14px', background: '#FFFFFF',
              borderRadius: '14px', padding: '16px', border: '1px solid #EDE8E0', cursor: 'pointer', marginBottom: '10px',
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FFF8EC', border: '1px solid #E8D9B5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={16} color="#C9A84C" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', color: '#2C2420', fontFamily: 'Playfair Display, serif', margin: 0 }}>Couture</p>
                <p style={{ fontSize: '11px', color: '#8C7B6E', fontWeight: 300, margin: '2px 0 0' }}>India's most distinguished wedding professionals</p>
              </div>
              <ChevronRight size={14} color="#C9A84C" />
            </div>

            {/* Destination */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '14px', background: '#FFFFFF',
              borderRadius: '14px', padding: '16px', border: '1px solid #EDE8E0', cursor: 'pointer', marginBottom: '28px',
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FFF8EC', border: '1px solid #E8D9B5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={16} color="#C9A84C" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', color: '#2C2420', fontFamily: 'Playfair Display, serif', margin: 0 }}>Destination Weddings</p>
                <p style={{ fontSize: '11px', color: '#8C7B6E', fontWeight: 300, margin: '2px 0 0' }}>Udaipur, Goa, Jaipur, Mussoorie</p>
              </div>
              <ChevronRight size={14} color="#C9A84C" />
            </div>

            {/* Explore grid */}
            <p style={{ fontSize: '10px', color: '#8C7B6E', fontWeight: 500, letterSpacing: '4px', textAlign: 'center', marginBottom: '14px' }}>E X P L O R E</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { title: 'Get Inspired', sub: 'Venues, decor, ideas', Icon: Compass },
                { title: 'Look Book', sub: 'Designers, MUAs', Icon: BookOpen },
                { title: 'Spotlight', sub: 'Top vendors this month', Icon: Award },
                { title: 'Special Offers', sub: 'Exclusive deals', Icon: Gift },
              ].map(item => (
                <div key={item.title} style={{
                  background: '#FFFFFF', borderRadius: '14px', border: '1px solid #EDE8E0',
                  padding: '18px', cursor: 'pointer',
                }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: '#FFF8EC', border: '1px solid #E8D9B5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                    <item.Icon size={15} color="#C9A84C" />
                  </div>
                  <p style={{ fontSize: '13px', color: '#2C2420', fontFamily: 'Playfair Display, serif', margin: '0 0 4px' }}>{item.title}</p>
                  <p style={{ fontSize: '10px', color: '#8C7B6E', fontWeight: 300, margin: 0, lineHeight: '15px' }}>{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ MOODBOARD ═══ */}
        {screen === 'moodboard' && (
          <div style={{ padding: '60px 24px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h1 style={{ fontSize: '24px', color: '#2C2420', fontFamily: 'Playfair Display, serif', margin: 0 }}>Moodboard</h1>
                <p style={{ fontSize: '12px', color: '#8C7B6E', fontWeight: 300, margin: '3px 0 0' }}>Your wedding inspiration</p>
              </div>
              <button style={{ width: 36, height: 36, borderRadius: 18, background: '#FFFFFF', border: '1px solid #EDE8E0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Plus size={16} color="#C9A84C" />
              </button>
            </div>
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Heart size={32} color="#E8D9B5" />
              <p style={{ fontSize: '18px', color: '#2C2420', fontFamily: 'Playfair Display, serif', marginTop: '12px' }}>Start pinning inspiration</p>
              <p style={{ fontSize: '13px', color: '#8C7B6E', fontWeight: 300, lineHeight: '20px', marginTop: '8px' }}>
                Save vendors from Discover, add your own ideas, or pin from anywhere
              </p>
            </div>
          </div>
        )}

        {/* ═══ PLANNER ═══ */}
        {screen === 'planner' && !activeTool && (
          <div style={{ padding: '60px 24px 24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h1 style={{ fontSize: '24px', color: '#2C2420', fontFamily: 'Playfair Display, serif', margin: 0 }}>Planner</h1>
                {daysToGo !== null && (
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#8C7B6E', fontWeight: 300 }}>
                    <span style={{ fontSize: '18px', color: '#C9A84C', fontFamily: 'Playfair Display, serif', fontWeight: 600 }}>{daysToGo}</span> days to your wedding
                  </p>
                )}
              </div>
              <button onClick={() => nav('profile')} style={{
                width: 36, height: 36, borderRadius: 18, background: '#2C2420', border: 'none',
                color: '#C9A84C', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
              }}>{userName?.[0]?.toUpperCase() || 'D'}</button>
            </div>

            {/* Progress strip */}
            {daysToGo !== null && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ height: 2, background: '#EDE8E0', borderRadius: 1, marginBottom: '8px', position: 'relative' }}>
                  <div style={{ height: 2, background: '#C9A84C', borderRadius: 1, width: `${((progressIdx + 0.5) / PROGRESS_LABELS.length) * 100}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {PROGRESS_LABELS.map((l, i) => (
                    <div key={l} style={{ textAlign: 'center' }}>
                      <div style={{ width: 6, height: 6, borderRadius: 3, background: i <= progressIdx ? '#C9A84C' : '#EDE8E0', margin: '0 auto 4px' }} />
                      <span style={{ fontSize: '9px', color: i <= progressIdx ? '#C9A84C' : '#C4B8AC', fontWeight: i <= progressIdx ? 500 : 300 }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mode toggle */}
            <div style={{ display: 'flex', background: '#FFFFFF', borderRadius: 10, border: '1px solid #EDE8E0', padding: 3, marginBottom: '16px' }}>
              {(['journey', 'tools'] as const).map(m => (
                <button key={m} onClick={() => setPlannerMode(m)} style={{
                  flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: plannerMode === m ? '#FAF6F0' : 'transparent',
                  color: plannerMode === m ? '#C9A84C' : '#B8ADA4',
                  fontSize: '12px', fontWeight: plannerMode === m ? 500 : 400, letterSpacing: '0.5px',
                }}>{m === 'journey' ? 'Journey' : 'Tools'}</button>
              ))}
            </div>

            {/* Journey phases */}
            {plannerMode === 'journey' ? (
              JOURNEY_PHASES.map(phase => {
                const active = daysToGo === null || daysToGo <= phase.activatesAt;
                const isCurrent = phase.id === currentPhase;
                const I = phase.icon;
                return (
                  <div key={phase.id} style={{
                    background: isCurrent ? '#FFFBF3' : '#FFFFFF', borderRadius: '16px',
                    border: `1px solid ${isCurrent ? '#E8D9B5' : '#EDE8E0'}`,
                    padding: '20px', marginBottom: '14px', opacity: active ? 1 : 0.45,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: active ? '16px' : '0' }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: isCurrent ? '#FFF8EC' : '#FAF6F0',
                        border: `1px solid ${isCurrent ? '#E8D9B5' : '#EDE8E0'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><I size={16} color={isCurrent ? '#C9A84C' : '#8C7B6E'} /></div>
                      <div>
                        <p style={{ fontSize: '16px', color: active ? '#2C2420' : '#B8ADA4', fontFamily: 'Playfair Display, serif', margin: 0 }}>{phase.label}</p>
                        <p style={{ fontSize: '11px', color: '#8C7B6E', fontWeight: 300, margin: '2px 0 0' }}>
                          {(TIER_PHASE_SUBS[budgetTier] || TIER_PHASE_SUBS.signature)[phase.id] || ''}
                        </p>
                      </div>
                    </div>
                    {active && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {phase.tools.map(tool => {
                          const TI = tool.icon;
                          return (
                            <button key={tool.id} onClick={() => {
                              if ((tool as any).comingSoon) return;
                              if ((tool as any).platinumOnly && coupleTier !== 'elite') { setShowUpgrade(true); return; }
                              if (tool.id === 'discover') { nav('discover'); return; }
                              if (tool.id === 'moodboard') { nav('moodboard'); return; }
                              setActiveTool(tool.id);
                            }} style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                              padding: '10px', border: 'none', background: 'none', cursor: (tool as any).comingSoon ? 'default' : 'pointer',
                              opacity: (tool as any).comingSoon ? 0.4 : 1, width: '30%',
                            }}>
                              <div style={{
                                width: 40, height: 40, borderRadius: 12, background: '#FFF8EC',
                                border: '1px solid #E8D9B5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}><TI size={15} color="#C9A84C" /></div>
                              <span style={{ fontSize: '11px', color: '#2C2420', textAlign: 'center' }}>{tool.label}</span>
                              {(tool as any).platinumOnly && (
                                <span style={{ fontSize: '8px', color: '#C9A84C', background: '#FFF8EC', border: '1px solid #E8D9B5', borderRadius: 50, padding: '2px 6px', fontWeight: 500 }}>Platinum</span>
                              )}
                              {(tool as any).comingSoon && (
                                <span style={{ fontSize: '9px', color: '#C4B8AC', fontStyle: 'italic' }}>Coming soon</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {!active && (
                      <p style={{ fontSize: '11px', color: '#C4B8AC', fontStyle: 'italic', textAlign: 'center', margin: '8px 0 0' }}>Coming soon in your journey</p>
                    )}
                  </div>
                );
              })
            ) : (
              /* Quick Access Grid */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { id: 'budget', label: 'Budget', Icon: PieChart },
                  { id: 'guests', label: 'Guest List', Icon: Users },
                  { id: 'checklist', label: 'Checklist', Icon: CheckCircle },
                  { id: 'my-vendors', label: 'My Vendors', Icon: Briefcase },
                  { id: 'decision-log', label: 'Decision Log', Icon: BookOpen },
                  { id: 'payments', label: 'Payments', Icon: CreditCard },
                  { id: 'registry', label: 'Registry', Icon: Gift },
                  { id: 'website', label: 'Website', Icon: Globe },
                  { id: 'dream-ai', label: 'DreamAi', Icon: Zap },
                ].map(tool => (
                  <button key={tool.id} onClick={() => setActiveTool(tool.id)} style={{
                    background: '#FFFFFF', borderRadius: '16px', border: '1px solid #EDE8E0',
                    padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '10px', cursor: 'pointer',
                  }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FFF8EC', border: '1px solid #E8D9B5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <tool.Icon size={18} color="#C9A84C" />
                    </div>
                    <span style={{ fontSize: '13px', color: '#2C2420' }}>{tool.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ TOOL VIEW ═══ */}
        {screen === 'planner' && activeTool && (
          <div style={{ padding: '60px 0 24px' }}>
            <BackHeader title={
              activeTool === 'budget' ? 'Budget' :
              activeTool === 'guests' ? 'Guest List' :
              activeTool === 'checklist' ? 'Checklist' :
              activeTool === 'decision-log' ? 'Decision Log' :
              activeTool === 'my-vendors' ? 'My Vendors' :
              activeTool === 'payments' ? 'Payments' :
              activeTool === 'registry' ? 'Registry' :
              activeTool === 'website' ? 'Wedding Website' :
              activeTool === 'dream-ai' ? 'DreamAi' : 'Tool'
            } onBack={() => setActiveTool(null)} />
            <div style={{ padding: '0 24px', textAlign: 'center', paddingTop: '40px' }}>
              <Zap size={28} color="#E8D9B5" />
              <p style={{ fontSize: '15px', color: '#2C2420', fontFamily: 'Playfair Display, serif', marginTop: '12px' }}>
                {activeTool === 'dream-ai' ? 'DreamAi' : 'This tool'} works best on the mobile app
              </p>
              <p style={{ fontSize: '13px', color: '#8C7B6E', fontWeight: 300, lineHeight: '20px', marginTop: '8px' }}>
                Download The Dream Wedding app for the full experience with all planning tools.
              </p>
            </div>
          </div>
        )}

        {/* ═══ INBOX ═══ */}
        {screen === 'inbox' && (
          <div style={{ padding: '60px 24px 24px' }}>
            <h1 style={{ fontSize: '24px', color: '#2C2420', fontFamily: 'Playfair Display, serif', margin: '0 0 16px' }}>Inbox</h1>
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <MessageCircle size={32} color="#E8D9B5" />
              <p style={{ fontSize: '18px', color: '#2C2420', fontFamily: 'Playfair Display, serif', marginTop: '12px' }}>No messages yet</p>
              <p style={{ fontSize: '13px', color: '#8C7B6E', fontWeight: 300, lineHeight: '20px', marginTop: '8px' }}>
                Vendor conversations and enquiry replies will appear here
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Upgrade Modal */}
      {showUpgrade && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '32px', zIndex: 100,
        }} onClick={() => setShowUpgrade(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#FAF6F0', borderRadius: '20px', padding: '28px', maxWidth: '320px',
            width: '100%', textAlign: 'center',
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: '#FFF8EC', border: '1px solid #E8D9B5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Zap size={24} color="#C9A84C" />
            </div>
            <p style={{ fontSize: '20px', color: '#2C2420', fontFamily: 'Playfair Display, serif', margin: '0 0 8px' }}>Unlock with Platinum</p>
            <p style={{ fontSize: '13px', color: '#8C7B6E', fontWeight: 300, lineHeight: '20px', margin: '0 0 12px' }}>
              DreamAi, Memory Box, and premium planning tools are available with the Platinum plan.
            </p>
            <p style={{ margin: '0 0 16px' }}>
              <span style={{ fontSize: '22px', color: '#C9A84C', fontFamily: 'Playfair Display, serif', fontWeight: 600 }}>Rs.2,999</span>
              <span style={{ fontSize: '13px', color: '#8C7B6E', fontWeight: 300 }}> one-time</span>
            </p>
            <button onClick={() => setShowUpgrade(false)} style={{
              width: '100%', background: '#2C2420', border: 'none', borderRadius: '12px',
              padding: '14px', color: '#FAF6F0', fontSize: '13px', fontWeight: 300, letterSpacing: '1.5px',
              textTransform: 'uppercase' as const, cursor: 'pointer', marginBottom: '8px',
            }}>View Plans</button>
            <button onClick={() => setShowUpgrade(false)} style={{
              background: 'none', border: 'none', color: '#8C7B6E', fontSize: '13px',
              fontWeight: 300, cursor: 'pointer', padding: '8px',
            }}>Maybe later</button>
          </div>
        </div>
      )}

      <BottomNav active={screen} onNav={nav} />
    </div>
  );
}
