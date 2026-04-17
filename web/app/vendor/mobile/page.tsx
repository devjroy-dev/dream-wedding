'use client';

import { useState, useEffect } from 'react';
import {
  Grid, MessageCircle, Calendar, Tool, User, Plus, Phone, Send,
  FileText, CreditCard, Clock, Users, TrendingDown, Percent,
  Share2, BarChart2, Package, Gift, Globe, Award, ChevronRight,
  LogOut, Settings as SettingsIcon, Lock, Briefcase, MapPin, Zap,
  CheckCircle, AlertCircle, X, Search, Mail, MoreHorizontal,
  Minus, Edit2, DollarSign, Tag,
} from 'react-feather';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

// ── Types ────────────────────────────────────────────────────────────────

type Tab = 'Home' | 'Inquiries' | 'Calendar' | 'Clients' | 'More';
type Tier = 'essential' | 'signature' | 'prestige';

interface VendorSession {
  vendorId: string;
  vendorName: string;
  category?: string;
  city?: string;
  tier?: Tier;
  trialEnd?: string;
  teamRole?: string;
  isTeamMember?: boolean;
}

// ── Tier Tools (matches React Native ESSENTIAL_TOOLS / SIGNATURE_TOOLS) ──

const ESSENTIAL_TOOLS = [
  { id: 'overview',     icon: Grid,         label: 'Overview',     tab: 'Home' as Tab },
  { id: 'inquiries',    icon: Mail,         label: 'Enquiries',    tab: 'Inquiries' as Tab },
  { id: 'calendar',     icon: Calendar,     label: 'Calendar',     tab: 'Calendar' as Tab },
  { id: 'clients',      icon: Users,        label: 'Clients',      tab: 'Clients' as Tab, sub: 'clients' },
  { id: 'invoices',     icon: FileText,     label: 'Invoices',     tab: 'Clients' as Tab, sub: 'invoices' },
  { id: 'contracts',    icon: Briefcase,    label: 'Contracts',    tab: 'Clients' as Tab, sub: 'contracts' },
  { id: 'payments',     icon: CreditCard,   label: 'Payments',     tab: 'Clients' as Tab, sub: 'payments' },
  { id: 'availability', icon: Clock,        label: 'Availability', tab: 'Calendar' as Tab },
];

const SIGNATURE_TOOLS = [
  { id: 'expenses',  icon: TrendingDown,  label: 'Expenses',  tab: 'Clients' as Tab, sub: 'expenses' },
  { id: 'tax',       icon: Percent,       label: 'Tax & TDS', tab: 'Clients' as Tab, sub: 'tax' },
  { id: 'team',      icon: Users,         label: 'My Team',   tab: 'Clients' as Tab, sub: 'team' },
  { id: 'referral',  icon: Share2,        label: 'Referrals', tab: 'Clients' as Tab, sub: 'referral' },
  { id: 'whatsapp',  icon: MessageCircle, label: 'Broadcast', tab: 'Clients' as Tab, sub: 'whatsapp' },
  { id: 'analytics', icon: BarChart2,     label: 'Analytics', tab: 'Clients' as Tab, sub: 'analytics' },
];

// ── Brand Tokens (match React Native theme) ──────────────────────────────

const C = {
  // Surfaces (lightest → warmest)
  cream: '#FAF6F0',          // page background
  ivory: '#FFFFFF',          // card base
  card: '#FFFFFF',
  pearl: '#FBF8F2',          // subtle off-ivory for layered cards
  champagne: '#FFFDF7',      // whisper-warm gold-tinted cream
  goldSoft: '#FFF8EC',       // soft gold-cream (primary accent surface)
  goldMist: '#FFF3DB',       // deeper gold-cream for hero moments
  goldBorder: '#E8D9B5',     // warm gold border
  border: '#EDE8E0',         // neutral cream border
  borderSoft: '#F2EDE4',     // whisper border
  // Ink (text + deep accent)
  dark: '#2C2420',           // primary text (espresso) — still used for text, rarely for backgrounds
  gold: '#C9A84C',           // warm gold accent
  goldDeep: '#B8963A',       // deeper gold for small dense text
  muted: '#8C7B6E',          // muted brown-taupe
  light: '#B8ADA4',          // light taupe
  // Semantic
  green: '#4CAF50',
  greenSoft: 'rgba(76,175,80,0.08)',
  red: '#E57373',
  redSoft: 'rgba(229,115,115,0.06)',
  redBorder: 'rgba(229,115,115,0.22)',
};

// ── Helpers ──────────────────────────────────────────────────────────────

function getSession(): VendorSession | null {
  if (typeof window === 'undefined') return null;
  try { const s = localStorage.getItem('vendor_web_session'); return s ? JSON.parse(s) : null; } catch { return null; }
}

function fmtINR(n: number): string {
  if (!n || n === 0) return '0';
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function VendorMobilePage() {
  const [session, setSession] = useState<VendorSession | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Home');
  const [activeSubTool, setActiveSubTool] = useState<string | null>(null);

  // Data
  const [bookings, setBookings] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [paymentSchedules, setPaymentSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Dream Ai state ─────────────────────────────────────────────────────
  const [vendorData, setVendorData] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiRequestSent, setAiRequestSent] = useState(false);
  const [buyingTokens, setBuyingTokens] = useState<string | null>(null);

  // ── Essential onboarding checklist state ──────────────────────────────
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('tdw_checklist_dismissed') === '1') setChecklistDismissed(true);
  }, []);
  const dismissChecklist = () => {
    setChecklistDismissed(true);
    if (typeof window !== 'undefined') localStorage.setItem('tdw_checklist_dismissed', '1');
  };

  // ── Quick Action bottom sheets ────────────────────────────────────────
  const [showQuickInvoice, setShowQuickInvoice] = useState(false);
  const [showQuickBlock, setShowQuickBlock] = useState(false);
  const [showQuickReminder, setShowQuickReminder] = useState(false);

  // ── Add Client modal ───────────────────────────────────────────────────
  const [showAddClient, setShowAddClient] = useState(false);
  const [acName, setAcName] = useState('');
  const [acPhone, setAcPhone] = useState('');
  const [acEmail, setAcEmail] = useState('');
  const [acEventType, setAcEventType] = useState('Wedding');
  const [acEventDate, setAcEventDate] = useState('');
  const [acVenue, setAcVenue] = useState('');
  const [acBudget, setAcBudget] = useState('');
  const [acSubmitting, setAcSubmitting] = useState(false);
  const [acError, setAcError] = useState('');

  const resetAddClient = () => {
    setAcName(''); setAcPhone(''); setAcEmail('');
    setAcEventType('Wedding'); setAcEventDate('');
    setAcVenue(''); setAcBudget(''); setAcError('');
  };

  const handleSaveClient = async () => {
    if (!acName.trim()) { setAcError('Client name is required'); return; }
    if (!session?.vendorId) return;
    try {
      setAcSubmitting(true); setAcError('');
      const res = await fetch(`${API}/api/vendor-clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: session.vendorId,
          name: acName.trim(),
          phone: acPhone.trim() || null,
          email: acEmail.trim() || null,
          event_type: acEventType,
          event_date: acEventDate || null,
          venue: acVenue.trim() || null,
          budget: acBudget ? parseInt(acBudget) : null,
          status: 'upcoming',
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        // Optimistic update — prepend new client to list
        setClients(prev => [data.data, ...prev]);
        resetAddClient();
        setShowAddClient(false);
      } else {
        setAcError(data.error || 'Could not save client');
      }
    } catch {
      setAcError('Network error. Please try again.');
    } finally {
      setAcSubmitting(false);
    }
  };

  // ── Auth + redirect ────────────────────────────────────────────────────
  useEffect(() => {
    const s = getSession();
    if (!s || !s.vendorId) {
      window.location.href = '/vendor/mobile/login';
      return;
    }
    setSession(s);
  }, []);

  // ── Load core data on mount ────────────────────────────────────────────
  useEffect(() => {
    if (!session?.vendorId) return;
    const vId = session.vendorId;

    const loadAll = async () => {
      try {
        const [bRes, iRes, cRes, blockRes, schedRes, vRes, aiRes] = await Promise.all([
          fetch(`${API}/api/bookings/vendor/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/invoices/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/vendor-clients/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/availability/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/payment-schedules/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/vendors/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/ai-tokens/status/${vId}`).then(r => r.json()).catch(() => ({})),
        ]);
        if (bRes.success) setBookings(bRes.data || []);
        if (iRes.success) setInvoices(iRes.data || []);
        if (cRes.success) setClients(cRes.data || []);
        if (blockRes.success) setBlockedDates(blockRes.data || []);
        if (schedRes.success) setPaymentSchedules(schedRes.data || []);
        if (vRes.success) setVendorData(vRes.data);
        if (aiRes.success) setAiStatus(aiRes.data || aiRes);
        // Leads = bookings with pending_confirmation status
        if (bRes.success) setLeads((bRes.data || []).filter((b: any) => b.status === 'pending_confirmation' || b.status === 'pending'));
      } catch (e) {
        console.error('Load failed:', e);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [session?.vendorId]);

  if (!session) {
    return (
      <div style={{ minHeight: '100dvh', background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>Loading…</span>
      </div>
    );
  }

  const tier: Tier = session.tier || 'essential';
  const pendingBookings = bookings.filter((b: any) => b.status === 'pending_confirmation');

  return (
    <div style={{
      minHeight: '100dvh',
      background: C.cream,
      fontFamily: 'DM Sans, sans-serif',
      color: C.dark,
      paddingBottom: 'calc(72px + env(safe-area-inset-bottom))',
      maxWidth: '480px',
      margin: '0 auto',
      position: 'relative',
    }}>
      <style>{`
        @keyframes tdwAiPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
      {/* ── HEADER ── */}
      <Header session={session} tier={tier} />

      {/* ── BODY ── */}
      <div style={{ padding: '8px 16px 24px' }}>
        {activeTab === 'Home' && (
          <DashboardTab
            session={session}
            tier={tier}
            bookings={bookings}
            invoices={invoices}
            clients={clients}
            leads={leads}
            paymentSchedules={paymentSchedules}
            loading={loading}
            onJumpToTab={(t: Tab) => setActiveTab(t)}
            vendorData={vendorData}
            onOpenAiModal={() => setShowAiModal(true)}
            checklistDismissed={checklistDismissed}
            onDismissChecklist={dismissChecklist}
            onAddClient={() => setShowAddClient(true)}
            onOpenInvoice={() => setShowQuickInvoice(true)}
            onOpenBlockDate={() => setShowQuickBlock(true)}
            onOpenReminder={() => setShowQuickReminder(true)}
          />
        )}
        {activeTab === 'Inquiries' && (
          <InquiriesTab
            session={session}
            leads={leads}
            bookings={bookings}
            onRefresh={() => {
              fetch(`${API}/api/bookings/vendor/${session.vendorId}`).then(r => r.json()).then(d => {
                if (d.success) {
                  setBookings(d.data || []);
                  setLeads((d.data || []).filter((b: any) => b.status === 'pending_confirmation' || b.status === 'pending'));
                }
              });
            }}
          />
        )}
        {activeTab === 'Calendar' && (
          <CalendarTab
            session={session}
            bookings={bookings}
            blockedDates={blockedDates}
            onAddClient={() => setShowAddClient(true)}
            onRefresh={() => {
              fetch(`${API}/api/availability/${session.vendorId}`).then(r => r.json()).then(d => {
                if (d.success) setBlockedDates(d.data || []);
              });
            }}
          />
        )}
        {activeTab === 'Clients' && (
          <ToolsTab
            session={session}
            tier={tier}
            activeSubTool={activeSubTool}
            setActiveSubTool={setActiveSubTool}
            clients={clients}
            invoices={invoices}
            paymentSchedules={paymentSchedules}
            onAddClient={() => setShowAddClient(true)}
          />
        )}
        {activeTab === 'More' && (
          <MoreTab
            session={session}
            tier={tier}
            vendorData={vendorData}
            aiStatus={aiStatus}
            buyingTokens={buyingTokens}
            setBuyingTokens={setBuyingTokens}
            onAiStatusUpdate={(next: any) => setAiStatus(next)}
          />
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <BottomNav
        active={activeTab}
        pending={pendingBookings.length}
        onChange={(t) => { setActiveTab(t); setActiveSubTool(null); }}
      />

      {/* ── ADD CLIENT MODAL ── */}
      {showAddClient && (
        <AddClientModal
          name={acName} setName={setAcName}
          phone={acPhone} setPhone={setAcPhone}
          email={acEmail} setEmail={setAcEmail}
          eventType={acEventType} setEventType={setAcEventType}
          eventDate={acEventDate} setEventDate={setAcEventDate}
          venue={acVenue} setVenue={setAcVenue}
          budget={acBudget} setBudget={setAcBudget}
          submitting={acSubmitting}
          error={acError}
          onClose={() => { resetAddClient(); setShowAddClient(false); }}
          onSubmit={handleSaveClient}
        />
      )}

      {/* ── DREAM AI MODAL ── */}
      {showAiModal && (
        <DreamAiModal
          vendorData={vendorData}
          aiRequestSent={aiRequestSent}
          onClose={() => setShowAiModal(false)}
          onRequestSent={() => {
            setAiRequestSent(true);
            setVendorData((p: any) => p ? { ...p, ai_access_requested: true } : p);
          }}
        />
      )}

      {/* ── QUICK INVOICE SHEET ── */}
      {showQuickInvoice && (
        <QuickInvoiceSheet
          vendorId={session.vendorId}
          vendorName={session.vendorName}
          clients={clients}
          onClose={() => setShowQuickInvoice(false)}
          onSaved={(newInvoice: any) => {
            setInvoices(prev => [newInvoice, ...prev]);
            setShowQuickInvoice(false);
          }}
        />
      )}

      {/* ── QUICK BLOCK DATE SHEET ── */}
      {showQuickBlock && (
        <QuickBlockDateSheet
          vendorId={session.vendorId}
          onClose={() => setShowQuickBlock(false)}
          onSaved={(blocked: any) => {
            setBlockedDates(prev => [blocked, ...prev]);
            setShowQuickBlock(false);
          }}
        />
      )}

      {/* ── QUICK REMINDER SHEET ── */}
      {showQuickReminder && (
        <QuickReminderSheet
          invoices={invoices.filter((i: any) => i.status !== 'paid')}
          paymentSchedules={paymentSchedules.filter((s: any) =>
            (s.instalments || []).some((inst: any) => !inst.paid && inst.due_date && new Date(inst.due_date) < new Date())
          )}
          vendorName={session.vendorName}
          onClose={() => setShowQuickReminder(false)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// HEADER
// ══════════════════════════════════════════════════════════════════════════

function Header({ session, tier }: { session: VendorSession; tier: Tier }) {
  const tierLabel = tier === 'prestige' ? 'PRESTIGE' : tier === 'signature' ? 'SIGNATURE' : 'ESSENTIAL';
  const tierColor = tier === 'prestige' ? C.dark : C.gold;
  return (
    <div style={{
      padding: 'calc(env(safe-area-inset-top) + 16px) 20px 12px',
      background: C.cream,
      borderBottom: `1px solid ${C.border}`,
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '2px', color: C.gold, textTransform: 'uppercase' }}>
            THE DREAM WEDDING
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: C.dark, marginTop: '2px', fontFamily: 'Playfair Display, serif' }}>
            {session.vendorName || 'Vendor'}
          </div>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: '50px',
          background: tier === 'prestige' ? C.goldMist : C.goldSoft,
          border: `1px solid ${tier === 'prestige' ? C.gold : C.goldBorder}`,
        }}>
          <span style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '9px', fontWeight: 600, letterSpacing: '2px',
            color: tier === 'prestige' ? C.goldDeep : tierColor,
          }}>
            {tierLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// DASHBOARD TAB (mirrors React Native Overview)
// ══════════════════════════════════════════════════════════════════════════

function DashboardTab({ session, tier, bookings, invoices, clients, leads, paymentSchedules, loading, onJumpToTab, vendorData, onOpenAiModal, checklistDismissed, onDismissChecklist, onAddClient, onOpenInvoice, onOpenBlockDate, onOpenReminder }: any) {
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayBookings = bookings.filter((b: any) => {
    if (!b.event_date) return false;
    return new Date(b.event_date).toDateString() === new Date().toDateString();
  });
  const pendingPayments = invoices.filter((i: any) => i.status !== 'paid').length;
  const upcomingBookings = bookings.filter((b: any) => b.status === 'confirmed').length;
  const totalRevenue = invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (parseInt(i.amount) || 0), 0);
  const overdueSchedules = paymentSchedules.filter((s: any) =>
    (s.instalments || []).some((inst: any) => !inst.paid && inst.due_date && new Date(inst.due_date) < new Date())
  );
  const unpaidInvoices = invoices.filter((i: any) => i.status !== 'paid');
  const totalOwed = unpaidInvoices.reduce((s: number, i: any) => s + (parseInt(i.amount) || 0), 0);
  const nextEvent = bookings
    .filter((b: any) => b.status === 'confirmed' && b.event_date && new Date(b.event_date) >= new Date())
    .sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())[0];

  // ── Profile completion — real signals from vendorData ──────────────────
  const profileSteps = [
    { key: 'photos',   label: 'Upload 10+ portfolio photos', done: (vendorData?.portfolio_images?.length || 0) >= 10 },
    { key: 'featured', label: 'Select 3 featured photos',    done: (vendorData?.featured_photos?.length || 0) >= 3 },
    { key: 'price',    label: 'Set your starting price',     done: !!vendorData?.starting_price },
    { key: 'bio',      label: 'Write your bio',              done: !!vendorData?.about && (vendorData.about.length >= 100) },
    { key: 'tags',     label: 'Add 3 vibe tags',             done: (vendorData?.vibe_tags?.length || 0) >= 3 },
  ];
  const profileCompletedCount = profileSteps.filter(s => s.done).length;
  const profilePercent = Math.round((profileCompletedCount / profileSteps.length) * 100);
  const profileIncomplete = profilePercent < 100;

  // ── Contextual upgrade nudges — Pattern 4 ─────────────────────────────
  // Detect a trigger moment, show a single card, record it so it never fires again.
  // Only for Essential/Signature. Prestige vendors see nothing.
  const [nudgeDismissed, setNudgeDismissed] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const d = localStorage.getItem('tdw_nudge_dismissed');
    if (d) setNudgeDismissed(d);
  }, []);

  const shownNudges: string[] = Array.isArray(vendorData?.upgrade_nudges_shown) ? vendorData.upgrade_nudges_shown : [];

  // Trigger 1 — Essential: 5+ clients added in last 7 days → Signature / Analytics
  const clientsLast7Days = clients.filter((c: any) => {
    const created = c.created_at ? new Date(c.created_at) : null;
    if (!created) return false;
    return (Date.now() - created.getTime()) < 7 * 24 * 60 * 60 * 1000;
  }).length;
  const trigger_growth_analytics: NudgeTrigger = {
    key: 'growth_analytics',
    eyebrow: 'You\'re Growing Fast',
    title: `${clientsLast7Days} new clients this week — impressive.`,
    body: 'Signature unlocks Analytics so you can see which channels and events drive your best bookings. Plus Expenses, Tax, Team, and Broadcast.',
    cta: 'See Signature',
    href: '/vendor/dashboard',
  };

  // Trigger 2 — Essential: 3+ overdue payment schedules → Broadcast / Signature
  const overdueCount = overdueSchedules.length;
  const trigger_broadcast_reminders: NudgeTrigger = {
    key: 'broadcast_reminders',
    eyebrow: 'Recover Outstanding Faster',
    title: `You have ${overdueCount} overdue payments.`,
    body: 'Signature vendors use WhatsApp Broadcast to send polite bulk reminders — and recover 40% faster than one-by-one follow-ups.',
    cta: 'See Signature',
    href: '/vendor/dashboard',
  };

  let activeTrigger: NudgeTrigger | null = null;
  if (tier === 'essential' && vendorData?.id) {
    if (clientsLast7Days >= 5 && !shownNudges.includes('growth_analytics') && nudgeDismissed !== 'growth_analytics') {
      activeTrigger = trigger_growth_analytics;
    } else if (overdueCount >= 3 && !shownNudges.includes('broadcast_reminders') && nudgeDismissed !== 'broadcast_reminders') {
      activeTrigger = trigger_broadcast_reminders;
    }
  }

  const dismissNudge = (key: string) => {
    setNudgeDismissed(key);
    if (typeof window !== 'undefined') localStorage.setItem('tdw_nudge_dismissed', key);
    // Record on backend so it never fires again even on a different device
    if (vendorData?.id) {
      fetch(`${API}/api/vendors/${vendorData.id}/upgrade-nudge`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger_key: key }),
      }).catch(() => {});
    }
  };

  if (loading) {
    return <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted }}>Loading your business…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '8px' }}>

      {/* ── PROFILE COMPLETION CARD (sits above Dream Ai — dismissible, collapsable) ── */}
      {profileIncomplete && !checklistDismissed && vendorData && (
        <ProfileCompletionCard
          percent={profilePercent}
          steps={profileSteps}
          onDismiss={onDismissChecklist}
        />
      )}

      {/* ── CONTEXTUAL UPGRADE NUDGE (Pattern 4) ── */}
      {activeTrigger && (
        <UpgradeNudge
          trigger={activeTrigger}
          onDismiss={() => dismissNudge(activeTrigger!.key)}
        />
      )}

      {/* ── DREAM AI HERO CARD ── */}
      <div
        onClick={() => {
          if (vendorData?.ai_enabled) {
            const joinCode = 'join acres-eventually';
            window.open('https://wa.me/14155238886?text=' + encodeURIComponent(joinCode), '_blank');
          } else {
            onOpenAiModal();
          }
        }}
        style={{
          position: 'relative',
          background: 'linear-gradient(180deg, #FFFDF7 0%, #FFF8EC 100%)',
          borderRadius: '14px',
          padding: '22px 20px',
          border: vendorData?.ai_enabled ? '1.5px solid #C9A84C' : '1px solid rgba(201,168,76,0.32)',
          boxShadow: vendorData?.ai_enabled
            ? '0 4px 24px rgba(201,168,76,0.14)'
            : '0 2px 14px rgba(140,123,110,0.08)',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.4s ease',
        }}
      >
        {/* Pulsing gold dot (active only) */}
        {vendorData?.ai_enabled && (
          <div style={{
            position: 'absolute', top: '22px', right: '112px',
            width: '6px', height: '6px', borderRadius: '50%',
            background: C.gold,
            animation: 'tdwAiPulse 2s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )}

        {/* Status badge — outlined */}
        <div style={{
          position: 'absolute', top: '14px', right: '14px',
          background: 'transparent',
          border: '1px solid ' + (vendorData?.ai_enabled ? C.gold : 'rgba(201,168,76,0.45)'),
          borderRadius: '50px', padding: '4px 12px',
          fontFamily: 'DM Sans, sans-serif', fontSize: '9px', fontWeight: 600,
          letterSpacing: '2px',
          color: vendorData?.ai_enabled ? '#A88B3A' : 'rgba(168,139,58,0.85)',
        }}>
          {vendorData?.ai_enabled ? 'BETA · ACTIVE' : vendorData?.ai_access_requested ? 'BETA · WAITLIST' : 'BETA · INVITE ONLY'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 2 }}>
          {/* Sparkle icon */}
          <div style={{
            width: '54px', height: '54px',
            borderRadius: '16px',
            background: vendorData?.ai_enabled ? C.goldSoft : '#F5F0E8',
            border: '1px solid ' + (vendorData?.ai_enabled ? 'rgba(201,168,76,0.35)' : 'rgba(201,168,76,0.2)'),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.09 8.26L20.5 9L15.5 13.5L17 20L12 16.5L7 20L8.5 13.5L3.5 9L9.91 8.26L12 2Z"
                fill={C.gold} opacity={vendorData?.ai_enabled ? '1' : '0.6'} />
              <circle cx="5" cy="5" r="1.2" fill={C.gold} opacity={vendorData?.ai_enabled ? '0.8' : '0.4'} />
              <circle cx="19" cy="19" r="1.2" fill={C.gold} opacity={vendorData?.ai_enabled ? '0.8' : '0.4'} />
              <circle cx="19" cy="5" r="0.8" fill={C.gold} opacity={vendorData?.ai_enabled ? '0.6' : '0.3'} />
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '22px',
              color: vendorData?.ai_enabled ? C.dark : '#4A3F38',
              letterSpacing: '1.2px', marginBottom: '6px',
              fontWeight: 400,
            }}>Dream Ai</div>
            <div style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
              color: C.muted, fontWeight: 400, lineHeight: 1.55,
            }}>
              {vendorData?.ai_enabled
                ? "Run your business from WhatsApp. Tap to open."
                : vendorData?.ai_access_requested
                  ? "You're on the waitlist. We'll be in touch."
                  : "World's first wedding AI. By invitation only."}
            </div>
          </div>

          {/* Arrow / lock icon */}
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: vendorData?.ai_enabled ? 'rgba(201,168,76,0.12)' : 'rgba(140,123,110,0.06)',
            border: '1px solid ' + (vendorData?.ai_enabled ? 'rgba(201,168,76,0.25)' : 'rgba(140,123,110,0.15)'),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              {vendorData?.ai_enabled ? (
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              ) : (
                <path d="M19 11H17V7C17 4.24 14.76 2 12 2C9.24 2 7 4.24 7 7V11H5C3.9 11 3 11.9 3 13V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V13C21 11.9 20.1 11 19 11ZM9 7C9 5.34 10.34 4 12 4C13.66 4 15 5.34 15 7V11H9V7Z"
                  fill={C.muted} opacity="0.8"/>
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TIER-SPECIFIC DASHBOARD BODY
          - Essential: personal-assistant feel (onboarding, next event, money owed, enquiries, actions)
          - Signature: business-briefing (Turn 3 expands; placeholder uses Essential for now)
          - Prestige:  CEO command-feed (Turn 3 expands; placeholder uses Essential for now)
         ══════════════════════════════════════════════════════════════════ */}

      {/* ── TODAY RIBBON — editorial cream-gold, NOT dark ── */}
      <div style={{
        background: `linear-gradient(180deg, ${C.champagne} 0%, ${C.goldSoft} 100%)`,
        borderRadius: '18px',
        padding: '22px 22px 20px',
        border: `1px solid ${C.goldBorder}`,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '18px' }}>
          <span style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '15px', fontStyle: 'italic', fontWeight: 400,
            color: C.goldDeep, letterSpacing: '0.4px',
          }}>{today}</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.25)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', alignItems: 'end' }}>
          {[
            { num: todayBookings.length, label: 'Today',    highlight: todayBookings.length > 0 },
            { num: upcomingBookings,     label: 'Upcoming', highlight: false },
            { num: pendingPayments,      label: 'Unpaid',   highlight: pendingPayments > 0, warn: pendingPayments > 0 },
            { num: clients.length,       label: 'Clients',  highlight: false },
          ].map((stat: any, i: number, arr: any[]) => (
            <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '32px', fontWeight: 400,
                color: stat.warn ? C.red : (stat.highlight ? C.gold : C.dark),
                letterSpacing: '-0.5px', lineHeight: 1,
              }}>{stat.num}</div>
              <div style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '9px', fontWeight: 500,
                letterSpacing: '2px', textTransform: 'uppercase',
                color: C.muted, marginTop: '8px',
              }}>{stat.label}</div>
              {i < arr.length - 1 && (
                <div style={{
                  position: 'absolute', right: 0, top: '18%',
                  height: '55%', width: 1,
                  background: 'rgba(201,168,76,0.18)',
                }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ESSENTIAL — Personal Assistant
          (Used for Essential now. Signature & Prestige fall through to this
          in Turn 1; Turn 3 will add their distinct layouts.)
         ══════════════════════════════════════════════════════════════════ */}

      {/* ── NEXT EVENT (cream + gold, editorial) ── */}
      {nextEvent && (
        <div style={{
          background: C.ivory,
          borderRadius: '18px',
          padding: '22px',
          border: `1px solid ${C.goldBorder}`,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Whisper decorative diagonal line (gold) */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
            background: `linear-gradient(90deg, transparent 0%, ${C.gold} 50%, transparent 100%)`,
          }} />
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '9px', fontWeight: 600,
            letterSpacing: '2.5px', textTransform: 'uppercase',
            color: C.goldDeep, marginBottom: '10px',
          }}>Your Next Event</div>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '26px', fontWeight: 400,
            color: C.dark, letterSpacing: '0.2px',
            marginBottom: '6px',
          }}>{nextEvent.users?.name || nextEvent.client_name || 'Client'}</div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px', color: C.muted,
            fontStyle: 'italic', fontWeight: 400,
          }}>
            {nextEvent.event_date
              ? new Date(nextEvent.event_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
              : 'Date to be confirmed'}
            {nextEvent.venue ? ` · ${nextEvent.venue}` : ''}
          </div>
        </div>
      )}

      {/* ── PENDING ENQUIRIES ALERT (warm gold) ── */}
      {leads.length > 0 && (
        <button
          onClick={() => onJumpToTab('Inquiries')}
          style={{
            background: C.goldSoft,
            border: `1px solid ${C.goldBorder}`,
            borderRadius: '18px',
            padding: '18px 20px',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column', gap: '6px',
            fontFamily: 'inherit',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: C.ivory, border: `1px solid ${C.goldBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={13} color={C.gold} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '17px', color: C.dark, fontWeight: 400,
                letterSpacing: '0.2px',
              }}>
                {leads.length} {leads.length === 1 ? 'enquiry' : 'enquiries'} waiting
              </div>
              <div style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px', color: C.muted, marginTop: '2px',
              }}>Respond within 48 hours</div>
            </div>
            <ChevronRight size={16} color={C.gold} />
          </div>
        </button>
      )}

      {/* ── MONEY OWED (top 3 unpaid invoices with WhatsApp reminders) ── */}
      {unpaidInvoices.length > 0 && (
        <div style={{
          background: C.champagne,
          borderRadius: '18px',
          padding: '22px',
          border: `1px solid ${C.goldBorder}`,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginBottom: '16px', paddingBottom: '12px',
            borderBottom: `1px solid rgba(201,168,76,0.18)`,
          }}>
            <div style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '9px', fontWeight: 600,
              letterSpacing: '2.5px', textTransform: 'uppercase',
              color: C.goldDeep,
            }}>Money Owed to You</div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '22px', fontWeight: 400,
              color: C.dark, letterSpacing: '-0.3px',
            }}>₹{fmtINR(totalOwed)}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {unpaidInvoices.slice(0, 3).map((inv: any) => (
              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px', color: C.dark, fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{inv.client_name || 'Client'}</div>
                  <div style={{ fontSize: '11px', color: C.muted, marginTop: '1px' }}>
                    {inv.invoice_number || 'Invoice'}
                  </div>
                </div>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '15px', color: C.dark, fontWeight: 400,
                }}>₹{fmtINR(parseInt(inv.amount) || 0)}</div>
                {inv.client_phone && (
                  <a
                    href={`https://wa.me/91${String(inv.client_phone).replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${inv.client_name || ''}! Gentle reminder on invoice ${inv.invoice_number || ''} for ₹${(parseInt(inv.amount) || 0).toLocaleString('en-IN')}.`)}`}
                    target="_blank" rel="noreferrer"
                    style={{
                      background: 'transparent',
                      border: `1px solid ${C.goldBorder}`,
                      borderRadius: '50%', width: '32px', height: '32px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      textDecoration: 'none', flexShrink: 0,
                    }}
                  >
                    <MessageCircle size={13} color={C.gold} />
                  </a>
                )}
              </div>
            ))}
          </div>
          {unpaidInvoices.length > 3 && (
            <button
              onClick={() => onJumpToTab('Clients')}
              style={{
                background: 'none', border: 'none',
                fontSize: '11px', color: C.goldDeep, fontWeight: 600,
                letterSpacing: '1.5px', textTransform: 'uppercase',
                cursor: 'pointer', marginTop: '14px', padding: 0,
                fontFamily: 'inherit',
              }}
            >View all {unpaidInvoices.length} →</button>
          )}
        </div>
      )}

      {/* ── ATTENTION NEEDED (overdue payment schedules) ── */}
      {overdueSchedules.length > 0 && (
        <div style={{
          background: C.redSoft,
          borderRadius: '18px', padding: '18px 20px',
          border: `1px solid ${C.redBorder}`,
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '9px', fontWeight: 600,
            letterSpacing: '2.5px', textTransform: 'uppercase',
            color: C.red,
          }}>Attention Needed</div>
          {overdueSchedules.slice(0, 3).map((sched: any) => (
            <div key={sched.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: C.dark, flex: 1 }}>
                {sched.client_name} — overdue
              </span>
              {sched.client_phone && (
                <a
                  href={`https://wa.me/91${String(sched.client_phone).replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${sched.client_name || ''}! Gentle reminder about your pending payment.`)}`}
                  target="_blank" rel="noreferrer"
                  style={{
                    background: 'transparent',
                    border: `1px solid ${C.redBorder}`,
                    borderRadius: '50%', width: '28px', height: '28px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textDecoration: 'none',
                  }}
                >
                  <MessageCircle size={11} color={C.red} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── QUICK ACTIONS (real, all wired to bottom sheets) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {[
          { icon: FileText,   label: 'Invoice',    onClick: () => onOpenInvoice && onOpenInvoice() },
          { icon: Send,       label: 'Reminder',   onClick: () => onOpenReminder && onOpenReminder() },
          { icon: Calendar,   label: 'Block Date', onClick: () => onOpenBlockDate && onOpenBlockDate() },
          { icon: Users,      label: 'Add Client', onClick: () => onAddClient && onAddClient() },
        ].map((a: any, i: number) => {
          const I = a.icon;
          return (
            <button
              key={i}
              onClick={a.onClick}
              style={{
                background: C.ivory,
                border: `1px solid ${C.goldBorder}`,
                borderRadius: '14px',
                padding: '16px 6px 14px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.25s ease',
              }}
              onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.background = C.goldSoft; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.background = C.ivory; }}
            >
              <I size={16} color={C.gold} />
              <span style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '9px', fontWeight: 500,
                letterSpacing: '1.2px', textTransform: 'uppercase',
                color: C.dark, textAlign: 'center', lineHeight: 1.15,
              }}>{a.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TODAY'S EVENTS (if any) ── */}
      {todayBookings.length > 0 && (
        <div>
          <SectionLabel>Today</SectionLabel>
          <div style={{
            background: C.ivory, borderRadius: '14px',
            border: `1px solid ${C.border}`, overflow: 'hidden',
          }}>
            {todayBookings.map((b: any, idx: number) => (
              <div key={b.id} style={{
                padding: '14px 18px',
                borderBottom: idx < todayBookings.length - 1 ? `1px solid ${C.borderSoft}` : 'none',
              }}>
                <div style={{ fontSize: '14px', color: C.dark, fontWeight: 500 }}>
                  {b.users?.name || b.client_name || 'Client'}
                </div>
                <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>
                  {b.event_type || 'Event'}{b.venue ? ` · ${b.venue}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RECENT CLIENTS ── */}
      {clients.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <SectionLabel>Recent Clients</SectionLabel>
            <button
              onClick={() => onJumpToTab('Clients')}
              style={{
                background: 'none', border: 'none',
                fontSize: '10px', color: C.goldDeep, fontWeight: 600,
                letterSpacing: '1.5px', textTransform: 'uppercase',
                cursor: 'pointer', padding: 0, fontFamily: 'inherit',
              }}
            >View all →</button>
          </div>
          <div style={{
            background: C.ivory, borderRadius: '14px',
            border: `1px solid ${C.border}`, overflow: 'hidden',
          }}>
            {clients.slice(0, 4).map((c: any, idx: number) => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px',
                borderBottom: idx < Math.min(clients.length, 4) - 1 ? `1px solid ${C.borderSoft}` : 'none',
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: C.goldDeep, fontWeight: 600, fontSize: '14px',
                  fontFamily: "'Playfair Display', serif",
                  flexShrink: 0,
                }}>{(c.name || '?')[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px', color: C.dark, fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{c.name}</div>
                  <div style={{ fontSize: '11px', color: C.muted, marginTop: '1px' }}>
                    {c.event_date
                      ? new Date(c.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Date TBC'}
                  </div>
                </div>
                {c.phone && (
                  <a
                    href={`tel:${c.phone}`}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${C.goldBorder}`,
                      borderRadius: '50%', width: '32px', height: '32px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      textDecoration: 'none', flexShrink: 0,
                    }}
                  >
                    <Phone size={13} color={C.gold} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EMPTY STATE — editorial greeting for new vendors ── */}
      {bookings.length === 0 && clients.length === 0 && (
        <div style={{
          background: C.ivory, borderRadius: '18px',
          border: `1px solid ${C.goldBorder}`,
          padding: '40px 24px', textAlign: 'center',
        }}>
          <div style={{
            width: '54px', height: '54px', borderRadius: '16px',
            background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '16px',
          }}>
            <Briefcase size={22} color={C.gold} />
          </div>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '20px', color: C.dark,
            fontWeight: 400, letterSpacing: '0.2px',
            marginBottom: '8px',
          }}>Your business begins here</div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px', color: C.muted,
            lineHeight: 1.65, maxWidth: '260px', margin: '0 auto',
          }}>
            Add your first client, or wait for an enquiry. Everything you do flows into this dashboard.
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// INQUIRIES TAB (lead pipeline + booking actions)
// ══════════════════════════════════════════════════════════════════════════

function InquiriesTab({ session, leads, bookings, onRefresh }: any) {
  const [filter, setFilter] = useState<'pending' | 'confirmed' | 'all'>('pending');

  const handleConfirm = async (bookingId: string) => {
    if (!confirm('Confirm this booking?')) return;
    try {
      const res = await fetch(`${API}/api/bookings/${bookingId}/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.success) { onRefresh(); } else { alert(data.error || 'Could not confirm'); }
    } catch { alert('Network error'); }
  };

  const handleDecline = async (bookingId: string) => {
    if (!confirm('Decline this booking? The token will be refunded to the couple.')) return;
    try {
      const res = await fetch(`${API}/api/bookings/${bookingId}/decline`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.success) { onRefresh(); } else { alert(data.error || 'Could not decline'); }
    } catch { alert('Network error'); }
  };

  const filtered = filter === 'pending' ? leads
    : filter === 'confirmed' ? bookings.filter((b: any) => b.status === 'confirmed')
    : bookings;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '12px' }}>
      <div>
        <div style={{ fontSize: '20px', fontWeight: 600, color: C.dark, fontFamily: 'Playfair Display, serif' }}>Enquiries</div>
        <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>Couples reaching out to you</div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {[
          { id: 'pending' as const, label: `Pending (${leads.length})` },
          { id: 'confirmed' as const, label: `Confirmed (${bookings.filter((b: any) => b.status === 'confirmed').length})` },
          { id: 'all' as const, label: `All (${bookings.length})` },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '50px',
              border: filter === f.id ? `1.5px solid ${C.gold}` : `1px solid ${C.border}`,
              background: filter === f.id ? C.goldSoft : C.card,
              color: filter === f.id ? C.gold : C.muted,
              fontSize: '11px', fontWeight: filter === f.id ? 600 : 500, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >{f.label}</button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '40px 20px', textAlign: 'center' }}>
          <Mail size={28} color={C.light} />
          <div style={{ fontSize: '14px', color: C.dark, fontWeight: 600, marginTop: '12px' }}>
            {filter === 'pending' ? 'No pending enquiries' : filter === 'confirmed' ? 'No confirmed bookings yet' : 'No enquiries yet'}
          </div>
          <div style={{ fontSize: '12px', color: C.muted, marginTop: '6px' }}>Couples will reach out once your profile goes live.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((b: any) => (
            <div key={b.id} style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: C.dark }}>{b.users?.name || b.client_name || 'Couple'}</div>
                  <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>
                    {b.event_date ? new Date(b.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date TBC'}
                    {b.venue ? ` · ${b.venue}` : ''}
                  </div>
                </div>
                <span style={{
                  fontSize: '9px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: '50px',
                  background: b.status === 'confirmed' ? `${C.green}15` : b.status === 'declined' ? '#FEF2F2' : C.goldSoft,
                  color: b.status === 'confirmed' ? C.green : b.status === 'declined' ? C.red : C.gold,
                }}>{b.status?.replace('_', ' ') || 'pending'}</span>
              </div>
              {b.message && (
                <div style={{ background: C.cream, borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: C.dark, marginBottom: '12px', lineHeight: 1.5 }}>
                  {b.message}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                {(b.users?.phone || b.client_phone) && (
                  <a
                    href={`https://wa.me/91${(b.users?.phone || b.client_phone).replace(/\D/g, '')}?text=${encodeURIComponent('Hi ' + (b.users?.name || b.client_name || '') + '! Thanks for your enquiry.')}`}
                    target="_blank" rel="noreferrer"
                    style={{ flex: 1, background: '#25D366', color: '#fff', textDecoration: 'none', borderRadius: '8px', padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <MessageCircle size={13} /> WhatsApp
                  </a>
                )}
                {b.status === 'pending_confirmation' && (
                  <>
                    <button onClick={() => handleConfirm(b.id)} style={{ flex: 1, background: C.gold, color: C.ivory, border: 'none', borderRadius: '10px', padding: '12px', fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      Confirm
                    </button>
                    <button onClick={() => handleDecline(b.id)} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '12px 16px', fontSize: '11px', fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      Decline
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CALENDAR TAB
// ══════════════════════════════════════════════════════════════════════════

function CalendarTab({ session, bookings, blockedDates, onRefresh, onAddClient }: any) {
  const [showBlock, setShowBlock] = useState(false);
  const [blockDate, setBlockDate] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const handleBlock = async () => {
    if (!blockDate) { alert('Pick a date'); return; }
    try {
      const res = await fetch(`${API}/api/availability`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: session.vendorId, blocked_date: blockDate, reason: blockReason || 'Personal' }),
      });
      const data = await res.json();
      if (data.success) { onRefresh(); setShowBlock(false); setBlockDate(''); setBlockReason(''); }
      else { alert(data.error || 'Could not block date'); }
    } catch { alert('Network error'); }
  };

  const handleUnblock = async (id: string) => {
    if (!confirm('Unblock this date?')) return;
    try {
      const res = await fetch(`${API}/api/availability/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) onRefresh();
    } catch { alert('Network error'); }
  };

  const upcomingBookings = bookings
    .filter((b: any) => b.event_date && new Date(b.event_date) >= new Date())
    .sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: C.dark, fontFamily: 'Playfair Display, serif' }}>Calendar</div>
          <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>Bookings and blocked dates</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => onAddClient && onAddClient()} style={{ background: C.goldSoft, color: C.goldDeep, border: `1px solid ${C.goldBorder}`, borderRadius: '10px', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            <Plus size={12} /> Event
          </button>
          <button onClick={() => setShowBlock(!showBlock)} style={{ background: C.ivory, color: C.muted, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            <Lock size={11} /> Block
          </button>
        </div>
      </div>

      {showBlock && (
        <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)} style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: C.dark, fontFamily: 'inherit' }} />
          <input type="text" placeholder="Reason (optional)" value={blockReason} onChange={e => setBlockReason(e.target.value)} style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: C.dark, fontFamily: 'inherit' }} />
          <button onClick={handleBlock} style={{ background: C.gold, color: C.ivory, border: 'none', borderRadius: '10px', padding: '12px', fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            Block Date
          </button>
        </div>
      )}

      <div>
        <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: C.muted, fontWeight: 600, marginBottom: '8px' }}>UPCOMING EVENTS ({upcomingBookings.length})</div>
        {upcomingBookings.length === 0 ? (
          <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '24px', textAlign: 'center' }}>
            <span style={{ fontSize: '13px', color: C.muted }}>No upcoming bookings</span>
          </div>
        ) : (
          <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            {upcomingBookings.map((b: any, idx: number) => (
              <div key={b.id} style={{ padding: '14px 16px', borderBottom: idx < upcomingBookings.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '8px', background: C.goldSoft, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: C.gold, lineHeight: 1 }}>{new Date(b.event_date).getDate()}</span>
                  <span style={{ fontSize: '9px', color: C.gold, fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>{new Date(b.event_date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', color: C.dark, fontWeight: 500 }}>{b.users?.name || b.client_name || 'Client'}</div>
                  <div style={{ fontSize: '11px', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.event_type || 'Event'}{b.venue ? ` · ${b.venue}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: C.muted, fontWeight: 600, marginBottom: '8px' }}>BLOCKED DATES ({blockedDates.length})</div>
        {blockedDates.length === 0 ? (
          <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '13px', color: C.muted }}>No dates blocked</span>
          </div>
        ) : (
          <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            {blockedDates.map((d: any, idx: number) => (
              <div key={d.id} style={{ padding: '12px 16px', borderBottom: idx < blockedDates.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Lock size={13} color={C.muted} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: C.dark }}>{new Date(d.blocked_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  {d.reason && <div style={{ fontSize: '11px', color: C.muted }}>{d.reason}</div>}
                </div>
                <button onClick={() => handleUnblock(d.id)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TOOLS TAB (launcher grid → opens individual tool views)
// ══════════════════════════════════════════════════════════════════════════

function ToolsTab({ session, tier, activeSubTool, setActiveSubTool, clients, invoices, paymentSchedules, onAddClient }: any) {
  if (activeSubTool) {
    return <ToolDetailView session={session} tier={tier} sub={activeSubTool} clients={clients} invoices={invoices} paymentSchedules={paymentSchedules} onBack={() => setActiveSubTool(null)} onAddClient={onAddClient} />;
  }

  const allTools = [
    ...ESSENTIAL_TOOLS.filter(t => t.sub),
    ...(tier !== 'essential' ? SIGNATURE_TOOLS : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '12px' }}>
      <div>
        <div style={{ fontSize: '20px', fontWeight: 600, color: C.dark, fontFamily: 'Playfair Display, serif' }}>Tools</div>
        <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>Run your business</div>
      </div>

      {/* Tool grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {allTools.map((t: any) => {
          const I = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSubTool(t.sub)}
              style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px',
                padding: '18px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: '12px', background: C.goldSoft, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <I size={18} color={C.gold} />
              </div>
              <span style={{ fontSize: '11px', color: C.dark, fontWeight: 500, textAlign: 'center', lineHeight: 1.3 }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tier upsell — editorial invitation, not tech banner */}
      {tier === 'essential' && (
        <div style={{
          background: C.champagne,
          borderRadius: '18px', padding: '24px 22px',
          border: `1px solid ${C.goldBorder}`,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
            background: `linear-gradient(90deg, transparent 0%, ${C.gold} 50%, transparent 100%)`,
          }} />
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '9px', fontWeight: 600,
            letterSpacing: '2.5px', textTransform: 'uppercase',
            color: C.goldDeep, marginBottom: '10px',
          }}>Upgrade to Signature</div>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '20px', fontWeight: 400,
            color: C.dark, letterSpacing: '0.2px',
            lineHeight: 1.3, marginBottom: '10px',
          }}>Your business, uncompromised.</div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px', color: C.muted,
            lineHeight: 1.6, marginBottom: '18px',
          }}>
            Expenses, Tax &amp; TDS, Team, Referrals, WhatsApp Broadcast, and Analytics — all unlocked.
          </div>
          <a href="/vendor/dashboard" style={{
            display: 'inline-block',
            background: C.gold, color: C.ivory,
            textDecoration: 'none',
            padding: '10px 18px', borderRadius: '10px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px', fontWeight: 600,
            letterSpacing: '1.8px', textTransform: 'uppercase',
          }}>
            View Plans
          </a>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TOOL DETAIL VIEW (each tool's content)
// ══════════════════════════════════════════════════════════════════════════

function ToolDetailView({ session, tier, sub, clients, invoices, paymentSchedules, onBack, onAddClient }: any) {
  const titles: Record<string, string> = {
    clients: 'Clients', invoices: 'Invoices', contracts: 'Contracts', payments: 'Payments',
    expenses: 'Expenses', tax: 'Tax & TDS', team: 'My Team', referral: 'Referrals',
    whatsapp: 'Broadcast', analytics: 'Analytics',
  };

  const renderContent = () => {
    if (sub === 'clients') {
      return clients.length === 0 ? (
        <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '32px 20px', textAlign: 'center' }}>
          <Users size={28} color={C.light} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: C.dark, marginTop: '12px' }}>No clients yet</div>
          <div style={{ fontSize: '12px', color: C.muted, marginTop: '6px', lineHeight: 1.5 }}>Add clients manually or wait for confirmed bookings to populate.</div>
          {onAddClient && (
            <button onClick={onAddClient} style={{ background: C.gold, color: C.dark, border: 'none', borderRadius: '8px', padding: '10px 18px', marginTop: '16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={13} /> Add your first client
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {clients.map((c: any) => (
            <div key={c.id} style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: C.goldSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold, fontWeight: 600 }}>
                {(c.name || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', color: C.dark, fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: '11px', color: C.muted }}>{c.event_type || 'Event'}{c.event_date ? ` · ${new Date(c.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</div>
              </div>
              {c.phone && <a href={`tel:${c.phone}`} style={{ background: C.goldSoft, border: `1px solid ${C.goldBorder}`, borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}><Phone size={13} color={C.gold} /></a>}
            </div>
          ))}
        </div>
      );
    }

    if (sub === 'invoices') {
      const total = invoices.reduce((s: number, i: any) => s + (parseInt(i.amount) || 0), 0);
      const paid = invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (parseInt(i.amount) || 0), 0);
      return (
        <>
          <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '10px', letterSpacing: '1px', color: C.muted, fontWeight: 600 }}>TOTAL BILLED</div>
                <div style={{ fontSize: '20px', fontFamily: 'Playfair Display, serif', color: C.dark, marginTop: '2px' }}>₹{fmtINR(total)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', letterSpacing: '1px', color: C.muted, fontWeight: 600 }}>PAID</div>
                <div style={{ fontSize: '20px', fontFamily: 'Playfair Display, serif', color: C.green, marginTop: '2px' }}>₹{fmtINR(paid)}</div>
              </div>
            </div>
          </div>
          {invoices.length === 0 ? (
            <Empty icon={<FileText size={28} color={C.light} />} title="No invoices yet" sub="Create your first invoice from the desktop dashboard for full GST formatting." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {invoices.slice(0, 20).map((inv: any) => (
                <div key={inv.id} style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '14px', color: C.dark, fontWeight: 500 }}>{inv.client_name || 'Client'}</div>
                      <div style={{ fontSize: '11px', color: C.muted }}>{inv.invoice_number || `INV-${inv.id?.substring(0, 8)}`}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: C.dark }}>₹{fmtINR(parseInt(inv.amount) || 0)}</div>
                      <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '50px', background: inv.status === 'paid' ? `${C.green}15` : C.goldSoft, color: inv.status === 'paid' ? C.green : C.gold, marginTop: '4px', display: 'inline-block' }}>{inv.status || 'unpaid'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      );
    }

    if (sub === 'payments') {
      return paymentSchedules.length === 0 ? (
        <Empty icon={<CreditCard size={28} color={C.light} />} title="No payment schedules" sub="Set up payment schedules per client from the desktop dashboard." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {paymentSchedules.map((s: any) => {
            const overdue = (s.instalments || []).some((inst: any) => !inst.paid && inst.due_date && new Date(inst.due_date) < new Date());
            return (
              <div key={s.id} style={{ background: C.card, borderRadius: '12px', border: `1px solid ${overdue ? C.red : C.border}`, padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', color: C.dark, fontWeight: 500 }}>{s.client_name}</div>
                    <div style={{ fontSize: '11px', color: overdue ? C.red : C.muted }}>{(s.instalments || []).filter((i: any) => !i.paid).length} pending</div>
                  </div>
                  {s.client_phone && (
                    <a href={`https://wa.me/91${s.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent('Hi ' + s.client_name + '! Gentle reminder about pending payment.')}`} target="_blank" rel="noreferrer" style={{ background: '#25D366', borderRadius: '8px', padding: '8px 12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', color: '#fff', fontSize: '11px', fontWeight: 600 }}>
                      <MessageCircle size={11} /> Remind
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Default: complex tools redirect to desktop
    return (
      <div style={{
        background: C.ivory, borderRadius: '18px',
        border: `1px solid ${C.border}`,
        padding: '36px 22px', textAlign: 'center',
      }}>
        <div style={{
          width: '54px', height: '54px', borderRadius: '16px',
          background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '14px',
        }}>
          <Lock size={20} color={C.gold} />
        </div>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '18px', color: C.dark, fontWeight: 400,
          letterSpacing: '0.2px', marginBottom: '8px',
        }}>{titles[sub]} works best on desktop</div>
        <div style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px', color: C.muted,
          lineHeight: 1.65, maxWidth: '280px', margin: '0 auto 18px',
        }}>
          The full {titles[sub].toLowerCase()} experience lives on the business portal.
        </div>
        <a href="/vendor/dashboard" style={{
          display: 'inline-block',
          background: C.goldSoft, color: C.goldDeep,
          border: `1px solid ${C.goldBorder}`,
          textDecoration: 'none',
          padding: '11px 20px', borderRadius: '10px',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px', fontWeight: 600,
          letterSpacing: '1.8px', textTransform: 'uppercase',
        }}>
          Open Business Portal
        </a>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '12px' }}>
      <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: C.gold, fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-start', padding: 0, fontFamily: 'inherit' }}>
        ← Back to tools
      </button>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '20px', fontWeight: 600, color: C.dark, fontFamily: 'Playfair Display, serif' }}>{titles[sub]}</div>
        {sub === 'clients' && onAddClient && (
          <button onClick={onAddClient} style={{ background: C.gold, color: C.dark, border: 'none', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={13} /> Add
          </button>
        )}
      </div>
      {renderContent()}
    </div>
  );
}

function Empty({ icon, title, sub }: any) {
  return (
    <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '32px 20px', textAlign: 'center' }}>
      {icon}
      <div style={{ fontSize: '14px', fontWeight: 600, color: C.dark, marginTop: '12px' }}>{title}</div>
      <div style={{ fontSize: '12px', color: C.muted, marginTop: '6px', lineHeight: 1.5 }}>{sub}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PROFILE TAB
// ══════════════════════════════════════════════════════════════════════════

function MoreTab({ session, tier, vendorData, aiStatus, buyingTokens, setBuyingTokens, onAiStatusUpdate }: any) {
  const handleLogout = () => {
    if (!confirm('Sign out?')) return;
    localStorage.removeItem('vendor_web_session');
    window.location.href = '/vendor/mobile/login';
  };

  const tierLabel = tier === 'prestige' ? 'Prestige' : tier === 'signature' ? 'Signature' : 'Essential';
  const tierPrice = tier === 'prestige' ? '₹3,999/mo' : tier === 'signature' ? '₹1,999/mo' : '₹499/mo';

  const buyAiTokens = async (packKey: string) => {
    if (!vendorData?.id || buyingTokens) return;
    setBuyingTokens(packKey);
    try {
      const r = await fetch(API + '/api/ai-tokens/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorData.id, pack: packKey }),
      });
      const d = await r.json();
      if (!d.success) { alert(d.error || 'Could not create order'); return; }
      // Razorpay checkout — assumes script already loaded at page level
      const w: any = window;
      if (!w.Razorpay) { alert('Payment gateway not ready. Refresh and try again.'); return; }
      const rzp = new w.Razorpay({
        key: d.razorpay_key,
        order_id: d.order_id,
        amount: d.amount,
        currency: 'INR',
        name: 'The Dream Wedding',
        description: 'Dream Ai Tokens — ' + d.data?.label,
        handler: async (response: any) => {
          try {
            const vr = await fetch(API + '/api/ai-tokens/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                vendor_id: vendorData.id,
              }),
            });
            const vd = await vr.json();
            if (vd.success) {
              const st = await fetch(API + '/api/ai-tokens/status/' + vendorData.id).then(r => r.json());
              if (st.success) onAiStatusUpdate(st.data);
            }
          } catch {}
        },
        prefill: { name: session.vendorName, contact: '' },
        theme: { color: '#C9A84C' },
      });
      rzp.open();
    } catch {
      alert('Network error');
    } finally {
      setBuyingTokens(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '12px' }}>
      <div>
        <div style={{ fontSize: '20px', fontWeight: 600, color: C.dark, fontFamily: 'Playfair Display, serif' }}>Profile</div>
      </div>

      {/* Vendor card */}
      <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: 56, height: 56, borderRadius: 28, background: C.goldSoft, border: `1px solid ${C.goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold, fontWeight: 700, fontSize: '22px', fontFamily: 'Playfair Display, serif' }}>
          {(session.vendorName || '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: C.dark }}>{session.vendorName}</div>
          <div style={{ fontSize: '12px', color: C.muted }}>{session.category || 'Vendor'}{session.city ? ` · ${session.city}` : ''}</div>
        </div>
      </div>

      {/* Subscription */}
      <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '18px' }}>
        <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: C.muted, fontWeight: 600, marginBottom: '8px' }}>SUBSCRIPTION</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 600, color: C.dark, fontFamily: 'Playfair Display, serif' }}>{tierLabel}</div>
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>{tierPrice}</div>
          </div>
          {session.trialEnd && (
            <div style={{ background: C.goldSoft, border: `1px solid ${C.goldBorder}`, borderRadius: '50px', padding: '4px 10px' }}>
              <span style={{ fontSize: '10px', color: C.gold, fontWeight: 600 }}>Trial: {new Date(session.trialEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── DREAM AI USAGE CARD (active users only) ── */}
      {vendorData?.ai_enabled && aiStatus && (
        <div style={{
          background: 'linear-gradient(180deg, #FFFDF7 0%, #FFF8EC 100%)',
          borderRadius: '14px',
          border: '1px solid rgba(201,168,76,0.3)',
          padding: '20px',
        }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(22,163,74,0.08)',
            border: '1px solid rgba(22,163,74,0.25)',
            borderRadius: '50px', padding: '3px 10px',
            fontFamily: 'DM Sans, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '2px',
            color: '#16A34A', marginBottom: '10px',
          }}>BETA · ACTIVE</div>

          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: C.gold, letterSpacing: '1.2px', marginBottom: '4px' }}>Dream Ai Usage</div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: C.muted, marginBottom: '18px' }}>Your WhatsApp AI assistant usage and top-ups.</div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '18px' }}>
            <div style={{ padding: '14px 10px', background: 'rgba(201,168,76,0.06)', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: C.gold, fontWeight: 500 }}>
                {aiStatus.tier === 'prestige' ? '∞' : `${aiStatus.tier_remaining}/${aiStatus.allowance}`}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', color: C.muted, letterSpacing: '1px', textTransform: 'uppercase', marginTop: '3px' }}>Monthly</div>
            </div>
            <div style={{ padding: '14px 10px', background: 'rgba(201,168,76,0.06)', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: C.dark, fontWeight: 500 }}>{aiStatus.extra_tokens}</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', color: C.muted, letterSpacing: '1px', textTransform: 'uppercase', marginTop: '3px' }}>Extra</div>
            </div>
            <div style={{
              padding: '14px 10px',
              background: aiStatus.total_remaining <= 5 ? 'rgba(229,115,115,0.08)' : 'rgba(76,175,80,0.06)',
              borderRadius: '10px', textAlign: 'center',
            }}>
              <div style={{
                fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 500,
                color: aiStatus.total_remaining <= 5 ? C.red : C.green,
              }}>
                {aiStatus.tier === 'prestige' ? '∞' : aiStatus.total_remaining}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', color: C.muted, letterSpacing: '1px', textTransform: 'uppercase', marginTop: '3px' }}>Total Left</div>
            </div>
          </div>

          {/* Buy packs */}
          {aiStatus.packs && (
            <>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600, color: C.muted, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>Buy Extra Tokens</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {Object.entries(aiStatus.packs).map(([packKey, pack]: any) => {
                  const isLoading = buyingTokens === packKey;
                  const perToken = (pack.price / pack.tokens).toFixed(2);
                  return (
                    <button
                      key={packKey}
                      onClick={() => buyAiTokens(packKey)}
                      disabled={!!buyingTokens}
                      style={{
                        padding: '12px 10px', borderRadius: '10px',
                        cursor: buyingTokens ? 'wait' : 'pointer',
                        background: C.ivory, border: `1px solid ${C.border}`,
                        textAlign: 'left', opacity: buyingTokens && !isLoading ? 0.5 : 1,
                        fontFamily: 'DM Sans, sans-serif',
                      }}
                    >
                      <div style={{ fontSize: '9px', color: C.gold, letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>{pack.label}</div>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: C.dark, fontWeight: 500 }}>{pack.tokens}</div>
                      <div style={{ fontSize: '13px', color: C.dark, fontWeight: 600, marginTop: '2px' }}>₹{pack.price}</div>
                      <div style={{ fontSize: '9px', color: C.muted, marginTop: '2px' }}>₹{perToken}/token</div>
                      {isLoading && <div style={{ fontSize: '9px', color: C.gold, marginTop: '4px' }}>Loading…</div>}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', color: C.muted, textAlign: 'center', marginTop: '10px', lineHeight: 1.5 }}>
                Tokens never expire. Used after monthly allowance runs out.
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tools section with tier-locked tiles ── */}
      <ToolsGrid tier={tier} />

      {/* Menu */}
      <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        {[
          { icon: SettingsIcon, label: 'Edit profile',          href: '/vendor/mobile/profile/edit' },
          { icon: Briefcase,    label: 'Open business portal',  href: '/vendor/dashboard' },
        ].map((item, idx, arr) => {
          const I = item.icon;
          return (
            <a key={idx} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: idx < arr.length - 1 ? `1px solid ${C.border}` : 'none', color: C.dark, textDecoration: 'none' }}>
              <I size={16} color={C.muted} />
              <span style={{ flex: 1, fontSize: '14px' }}>{item.label}</span>
              <ChevronRight size={14} color={C.light} />
            </a>
          );
        })}
      </div>

      <button onClick={handleLogout} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '14px', padding: '14px', color: C.red, fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit' }}>
        <LogOut size={14} /> Sign Out
      </button>

      <div style={{ fontSize: '10px', color: C.light, textAlign: 'center', marginTop: '8px' }}>
        thedreamwedding.in · v2.0
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// BOTTOM NAV
// ══════════════════════════════════════════════════════════════════════════

function BottomNav({ active, pending, onChange }: { active: Tab; pending: number; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'Home',      label: 'Home',      icon: Grid },
    { id: 'Inquiries', label: 'Inquiries', icon: Mail },
    { id: 'Calendar',  label: 'Calendar',  icon: Calendar },
    { id: 'Clients',   label: 'Clients',   icon: Users },
    { id: 'More',      label: 'More',      icon: MoreHorizontal },
  ];

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: C.ivory, borderTop: `1px solid ${C.border}`,
      padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
      display: 'flex', justifyContent: 'space-around',
      zIndex: 50,
      maxWidth: '480px', margin: '0 auto',
    }}>
      {tabs.map(t => {
        const I = t.icon;
        const isActive = active === t.id;
        const showBadge = t.id === 'Inquiries' && pending > 0;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
              padding: '4px 0', fontFamily: 'inherit', position: 'relative',
            }}
          >
            <div style={{ position: 'relative' }}>
              <I size={20} color={isActive ? C.dark : C.muted} />
              {showBadge && (
                <div style={{ position: 'absolute', top: -4, right: -8, background: C.red, color: '#fff', borderRadius: '50%', minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, padding: '0 4px' }}>
                  {pending > 9 ? '9+' : pending}
                </div>
              )}
            </div>
            <span style={{ fontSize: '10px', color: isActive ? C.dark : C.light, fontWeight: isActive ? 600 : 400 }}>
              {t.label}
            </span>
            {isActive && <div style={{ width: 4, height: 4, borderRadius: 2, background: C.gold, marginTop: 2 }} />}
          </button>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ADD CLIENT / ADD EVENT MODAL
// ══════════════════════════════════════════════════════════════════════════

interface AddClientModalProps {
  name: string; setName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  eventType: string; setEventType: (v: string) => void;
  eventDate: string; setEventDate: (v: string) => void;
  venue: string; setVenue: (v: string) => void;
  budget: string; setBudget: (v: string) => void;
  submitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: () => void;
}

function AddClientModal(p: AddClientModalProps) {
  const EVENT_TYPES = ['Wedding', 'Engagement', 'Reception', 'Mehendi', 'Sangeet', 'Haldi', 'Pre-wedding Shoot', 'Other'];

  const input: React.CSSProperties = {
    width: '100%', padding: '12px 14px', fontSize: '14px',
    fontFamily: 'DM Sans, sans-serif',
    border: `1px solid ${C.border}`, borderRadius: '10px',
    backgroundColor: C.cream, color: C.dark, outline: 'none',
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 600, color: C.muted,
    display: 'block', marginBottom: '6px', letterSpacing: '0.3px',
  };

  return (
    <div
      onClick={p.onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(44,36,32,0.55)',
        zIndex: 100, display: 'flex',
        alignItems: 'flex-end', justifyContent: 'center',
        animation: 'tdwFadeIn 0.2s ease',
      }}
    >
      <style>{`
        @keyframes tdwFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tdwSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          background: C.ivory,
          borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
          padding: '8px 20px calc(env(safe-area-inset-bottom) + 24px)',
          maxHeight: '92dvh', overflowY: 'auto',
          animation: 'tdwSlideUp 0.25s ease',
          display: 'flex', flexDirection: 'column', gap: '14px',
        }}
      >
        {/* Handle bar */}
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: '8px auto 4px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: C.dark, fontFamily: 'Playfair Display, serif' }}>Add Client</div>
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>New client or event</div>
          </div>
          <button onClick={p.onClose} style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} color={C.muted} />
          </button>
        </div>

        {/* Name */}
        <div>
          <label style={labelStyle}>CLIENT NAME *</label>
          <input
            type="text" style={input}
            placeholder="e.g. Priya Sharma"
            value={p.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => p.setName(e.target.value)}
            autoFocus
          />
        </div>

        {/* Phone + Email row */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>PHONE</label>
            <input
              type="tel" style={input}
              placeholder="9876543210"
              value={p.phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => p.setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>EMAIL</label>
            <input
              type="email" style={input}
              placeholder="Optional"
              value={p.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => p.setEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Event type pills */}
        <div>
          <label style={labelStyle}>EVENT TYPE</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {EVENT_TYPES.map(type => (
              <button
                key={type}
                onClick={() => p.setEventType(type)}
                style={{
                  background: p.eventType === type ? C.goldSoft : C.ivory,
                  color: p.eventType === type ? C.goldDeep : C.muted,
                  border: `1px solid ${p.eventType === type ? C.gold : C.border}`,
                  borderRadius: '50px',
                  padding: '8px 14px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '11px', fontWeight: p.eventType === type ? 600 : 500,
                  letterSpacing: p.eventType === type ? '1.2px' : '0.8px',
                  cursor: 'pointer',
                }}
              >{type}</button>
            ))}
          </div>
        </div>

        {/* Event date + venue */}
        <div>
          <label style={labelStyle}>EVENT DATE</label>
          <input
            type="date" style={input}
            value={p.eventDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => p.setEventDate(e.target.value)}
          />
        </div>

        <div>
          <label style={labelStyle}>VENUE</label>
          <input
            type="text" style={input}
            placeholder="e.g. The Leela Palace, Delhi"
            value={p.venue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => p.setVenue(e.target.value)}
          />
        </div>

        <div>
          <label style={labelStyle}>BUDGET (₹)</label>
          <input
            type="tel" style={input}
            placeholder="e.g. 500000"
            value={p.budget}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => p.setBudget(e.target.value.replace(/\D/g, ''))}
          />
        </div>

        {p.error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: C.red }}>
            {p.error}
          </div>
        )}

        {/* Submit */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button
            onClick={p.onClose}
            disabled={p.submitting}
            style={{
              flex: 1, background: 'transparent', color: C.muted,
              border: `1px solid ${C.border}`, borderRadius: '10px',
              padding: '13px', fontSize: '13px', fontWeight: 500,
              cursor: p.submitting ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >Cancel</button>
          <button
            onClick={p.onSubmit}
            disabled={p.submitting || !p.name.trim()}
            style={{
              flex: 2,
              background: (p.submitting || !p.name.trim()) ? C.border : C.gold,
              color: (p.submitting || !p.name.trim()) ? C.light : C.ivory,
              border: 'none', borderRadius: '10px',
              padding: '14px', fontSize: '11px', fontWeight: 600,
              letterSpacing: '1.8px', textTransform: 'uppercase',
              cursor: (p.submitting || !p.name.trim()) ? 'not-allowed' : 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >{p.submitting ? 'Saving…' : 'Save Client'}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// DREAM AI MODAL — premium dark invitation (matches business portal)
// ══════════════════════════════════════════════════════════════════════════

function DreamAiModal({ vendorData, aiRequestSent, onClose, onRequestSent }: any) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleRequest = async () => {
    if (!vendorData?.id) return;
    setError('');
    setSubmitting(true);
    try {
      const r = await fetch(API + '/api/ai-access/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorData.id, use_case: 'Requested from PWA dashboard modal' }),
      });
      const d = await r.json();
      if (d.success) {
        onRequestSent();
      } else {
        setError(d.error || 'Could not submit request');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitted = aiRequestSent || vendorData?.ai_access_requested;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'tdwFadeIn 0.25s ease',
      }}
    >
      <style>{`
        @keyframes tdwFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #1A1410 0%, #2C2420 50%, #1A1410 100%)',
          borderRadius: '20px',
          maxWidth: '480px', width: '100%',
          padding: '28px 24px',
          border: '1px solid rgba(201,168,76,0.3)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(201,168,76,0.1)',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'rgba(255,255,255,0.08)', border: 'none',
            borderRadius: '50%', width: '30px', height: '30px',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Badge */}
        <div style={{
          display: 'inline-block',
          background: 'rgba(201,168,76,0.12)',
          border: '1px solid rgba(201,168,76,0.35)',
          borderRadius: '50px', padding: '4px 12px',
          fontFamily: 'DM Sans, sans-serif', fontSize: '9px', fontWeight: 600,
          letterSpacing: '2px', color: '#C9A84C',
          marginBottom: '18px',
        }}>BETA · INVITE ONLY</div>

        {/* Title */}
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '30px', color: '#C9A84C',
          letterSpacing: '1.5px', marginBottom: '8px', fontWeight: 400,
        }}>Dream Ai</div>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '18px', color: '#FAF6F0',
          fontStyle: 'italic', fontWeight: 300,
          marginBottom: '24px', lineHeight: 1.3,
        }}>Run your business from WhatsApp.</div>

        {/* Description */}
        <div style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
          color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: '24px',
        }}>
          The world's first AI assistant built exclusively for wedding professionals.
          Text natural language commands to run your entire business — no dashboards, no forms.
        </div>

        {/* Examples */}
        <div style={{ marginBottom: '28px' }}>
          {[
            { cmd: '"Create invoice for Swati Rs.5L"', result: 'GST-compliant invoice created' },
            { cmd: '"Nikhil ko payment reminder bhejo"', result: 'Hindi & Hinglish supported' },
            { cmd: '"Add Pooja as new client, 1st Jan outfit trial"', result: 'Client added with event details' },
            { cmd: '"Block Dec 15 for Kapoor wedding"', result: 'Calendar updated, client logged' },
          ].map((ex, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              padding: '10px 0',
              borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#C9A84C', marginTop: '7px', flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
                  color: '#FAF6F0', fontWeight: 400, marginBottom: '2px',
                }}>{ex.cmd}</div>
                <div style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
                  color: 'rgba(201,168,76,0.7)', fontWeight: 300,
                }}>→ {ex.result}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        {isSubmitted ? (
          <div style={{
            background: 'rgba(76,175,80,0.1)',
            border: '1px solid rgba(76,175,80,0.3)',
            borderRadius: '12px', padding: '14px',
            textAlign: 'center',
            fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#4CAF50',
            marginBottom: '12px',
          }}>
            ✓ Request submitted. We'll be in touch soon.
          </div>
        ) : (
          <button
            onClick={handleRequest}
            disabled={submitting}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #C9A84C 0%, #B8963A 100%)',
              color: '#1A1410', border: 'none', borderRadius: '12px',
              padding: '14px', fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px', fontWeight: 600, letterSpacing: '2px',
              textTransform: 'uppercase',
              cursor: submitting ? 'wait' : 'pointer',
              marginBottom: '12px',
              boxShadow: '0 4px 16px rgba(201,168,76,0.25)',
              opacity: submitting ? 0.7 : 1,
            }}
          >{submitting ? 'Submitting…' : 'Request Early Access'}</button>
        )}

        {error && (
          <div style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
            color: '#E57373', textAlign: 'center', marginBottom: '10px',
          }}>{error}</div>
        )}

        <div style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '10px',
          color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 1.6,
        }}>
          Currently available to select founding vendors.<br/>
          Compliant with Meta's WhatsApp Business API policies.
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PROFILE COMPLETION CARD — collapsable, editorial, honest progress
// ══════════════════════════════════════════════════════════════════════════

function ProfileCompletionCard({ percent, steps, onDismiss }: {
  percent: number;
  steps: { key: string; label: string; done: boolean }[];
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const completedCount = steps.filter(s => s.done).length;

  return (
    <div style={{
      background: C.ivory,
      borderRadius: '18px',
      border: `1px solid ${C.goldBorder}`,
      overflow: 'hidden',
    }}>
      {/* Collapsed head — tap to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          background: 'transparent', border: 'none',
          padding: '18px 20px',
          display: 'flex', alignItems: 'center', gap: '14px',
          cursor: 'pointer', fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        {/* Circular progress ring */}
        <div style={{
          width: '44px', height: '44px',
          position: 'relative', flexShrink: 0,
        }}>
          <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="22" cy="22" r="19" stroke={C.goldSoft} strokeWidth="3" fill="none" />
            <circle
              cx="22" cy="22" r="19"
              stroke={C.gold} strokeWidth="3" fill="none"
              strokeDasharray={`${(percent / 100) * 119.38} 119.38`}
              strokeLinecap="round"
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Playfair Display', serif",
            fontSize: '13px', color: C.dark, fontWeight: 500,
          }}>{percent}%</div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '16px', color: C.dark, fontWeight: 400,
            letterSpacing: '0.2px',
          }}>Complete your profile</div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px', color: C.muted, marginTop: '2px',
          }}>
            {completedCount} of {steps.length} complete · Tap to see what's left
          </div>
        </div>

        <ChevronRight
          size={16}
          color={C.muted}
          style={{
            transition: 'transform 0.25s ease',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Expanded body — step list + dismiss option */}
      {expanded && (
        <div style={{
          padding: '4px 20px 20px',
          borderTop: `1px solid ${C.borderSoft}`,
        }}>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '9px', fontWeight: 600,
            letterSpacing: '2.5px', textTransform: 'uppercase',
            color: C.goldDeep, marginTop: '16px', marginBottom: '12px',
          }}>What's next</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {steps.map((step) => (
              <div
                key={step.key}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  opacity: step.done ? 0.55 : 1,
                }}
              >
                {/* Check / empty circle */}
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: step.done ? C.goldSoft : 'transparent',
                  border: `1px solid ${step.done ? C.gold : C.goldBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {step.done && <CheckCircle size={12} color={C.gold} />}
                </div>
                <span style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px', color: C.dark,
                  textDecoration: step.done ? 'line-through' : 'none',
                  textDecorationColor: C.muted,
                  flex: 1,
                }}>{step.label}</span>
              </div>
            ))}
          </div>

          {/* CTA — route to in-PWA profile editor */}
          <div style={{
            marginTop: '18px', paddingTop: '16px',
            borderTop: `1px solid ${C.borderSoft}`,
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <a
              href="/vendor/mobile/profile/edit"
              style={{
                flex: 1,
                background: C.gold, color: C.ivory,
                border: 'none', borderRadius: '10px',
                padding: '12px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px', fontWeight: 600,
                letterSpacing: '1.8px', textTransform: 'uppercase',
                cursor: 'pointer', textAlign: 'center',
                textDecoration: 'none',
              }}
            >Complete Profile</a>
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              style={{
                background: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: '10px',
                padding: '12px 16px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '10px', color: C.muted, fontWeight: 500,
                letterSpacing: '1.5px', textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >Hide</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION LABEL — editorial all-caps section header
// ══════════════════════════════════════════════════════════════════════════

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'DM Sans, sans-serif',
      fontSize: '9px', fontWeight: 600,
      letterSpacing: '2.5px', textTransform: 'uppercase',
      color: C.goldDeep, marginBottom: '10px',
    }}>{children}</div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TOOLS GRID — shows all business tools with tier-locked state
// ══════════════════════════════════════════════════════════════════════════

type ToolDef = {
  id: string;
  label: string;
  icon: any;
  minTier: 'essential' | 'signature' | 'prestige';
  href?: string;
  desc: string;
};

const MORE_TOOLS: ToolDef[] = [
  { id: 'expenses',  label: 'Expenses',   icon: TrendingDown,  minTier: 'signature', href: '/vendor/dashboard', desc: 'Track every expense. See where your money goes. P&L view.' },
  { id: 'tax',       label: 'Tax & TDS',  icon: Percent,       minTier: 'signature', href: '/vendor/dashboard', desc: 'GST invoices. Quarterly TDS summary. CA-ready exports.' },
  { id: 'broadcast', label: 'Broadcast',  icon: Send,          minTier: 'signature', href: '/vendor/dashboard', desc: 'Send WhatsApp updates to client groups. Templates included.' },
  { id: 'analytics', label: 'Analytics',  icon: BarChart2,     minTier: 'signature', href: '/vendor/dashboard', desc: 'Revenue trends. Lead conversion. What\'s working.' },
  { id: 'team',      label: 'Team',       icon: Users,         minTier: 'signature', href: '/vendor/dashboard', desc: 'Add assistants. Assign roles. Team calendar.' },
  { id: 'referrals', label: 'Referrals',  icon: Share2,        minTier: 'signature', href: '/vendor/dashboard', desc: 'Past Client Discount Loop. 10% off per 10 clients who join.' },
  { id: 'deluxe',    label: 'Deluxe Suite', icon: Award,       minTier: 'prestige',  href: '/vendor/dashboard', desc: 'Tasks, procurement, deliveries, photo approvals, client sentiment. For ops teams.' },
];

const TIER_RANK: Record<string, number> = { essential: 1, signature: 2, prestige: 3 };

function ToolsGrid({ tier }: { tier: Tier }) {
  const [lockedModal, setLockedModal] = useState<ToolDef | null>(null);
  const vendorRank = TIER_RANK[tier] || 1;

  return (
    <>
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '9px', fontWeight: 600,
        letterSpacing: '2.5px', textTransform: 'uppercase',
        color: C.goldDeep, marginBottom: '10px', marginTop: '4px',
      }}>Your Tools</div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        marginBottom: '14px',
      }}>
        {MORE_TOOLS.map((tool) => {
          const required = TIER_RANK[tool.minTier] || 1;
          const locked = vendorRank < required;
          const I = tool.icon;
          if (locked) {
            return (
              <button
                key={tool.id}
                onClick={() => setLockedModal(tool)}
                style={{
                  position: 'relative',
                  background: C.pearl,
                  border: `1px solid ${C.borderSoft}`,
                  borderRadius: '14px',
                  padding: '18px 8px 16px',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '8px',
                  cursor: 'pointer', fontFamily: 'inherit',
                  overflow: 'hidden',
                }}
              >
                {/* Shimmer overlay on top edge */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                  background: `linear-gradient(90deg, transparent 0%, ${C.goldBorder} 50%, transparent 100%)`,
                }} />
                {/* Lock badge */}
                <div style={{
                  position: 'absolute', top: '6px', right: '6px',
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Lock size={9} color={C.goldDeep} />
                </div>
                <I size={18} color={C.goldBorder} />
                <span style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '10px', fontWeight: 500,
                  letterSpacing: '1.5px', textTransform: 'uppercase',
                  color: C.muted, textAlign: 'center', lineHeight: 1.3,
                }}>{tool.label}</span>
              </button>
            );
          }
          return (
            <a
              key={tool.id}
              href={tool.href}
              style={{
                background: C.ivory,
                border: `1px solid ${C.goldBorder}`,
                borderRadius: '14px',
                padding: '18px 8px 16px',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '8px',
                cursor: 'pointer', fontFamily: 'inherit',
                textDecoration: 'none',
              }}
            >
              <I size={18} color={C.gold} />
              <span style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '10px', fontWeight: 500,
                letterSpacing: '1.5px', textTransform: 'uppercase',
                color: C.dark, textAlign: 'center', lineHeight: 1.3,
              }}>{tool.label}</span>
            </a>
          );
        })}
      </div>

      {/* Upgrade modal */}
      {lockedModal && (
        <div
          onClick={() => setLockedModal(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(26,20,16,0.62)',
            zIndex: 200,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '480px',
              background: C.ivory,
              borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
              padding: '28px 24px calc(env(safe-area-inset-bottom) + 28px)',
              position: 'relative',
              boxShadow: '0 -8px 40px rgba(26,20,16,0.24)',
            }}
          >
            {/* Handle bar */}
            <div style={{
              width: '40px', height: '4px', borderRadius: '2px',
              background: C.border, margin: '0 auto 18px',
            }} />
            {/* Lock icon + Tier badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '14px',
                background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Lock size={18} color={C.gold} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '9px', fontWeight: 600,
                  letterSpacing: '2.5px', textTransform: 'uppercase',
                  color: C.goldDeep,
                }}>{lockedModal.minTier === 'prestige' ? 'Prestige Only' : 'Signature & Above'}</div>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '22px', color: C.dark, fontWeight: 400,
                  letterSpacing: '0.2px', marginTop: '2px',
                }}>{lockedModal.label}</div>
              </div>
              <button
                onClick={() => setLockedModal(null)}
                style={{
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', padding: '8px',
                }}
              ><X size={16} color={C.muted} /></button>
            </div>

            {/* Description */}
            <div style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px', color: C.muted,
              lineHeight: 1.65, marginBottom: '20px',
            }}>{lockedModal.desc}</div>

            {/* CTA */}
            <a
              href="/vendor/dashboard"
              style={{
                display: 'block', textAlign: 'center',
                background: C.gold, color: C.ivory,
                textDecoration: 'none',
                padding: '14px', borderRadius: '12px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px', fontWeight: 600,
                letterSpacing: '1.8px', textTransform: 'uppercase',
              }}
            >Upgrade to {lockedModal.minTier === 'prestige' ? 'Prestige' : 'Signature'}</a>

            <div style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '10px', color: C.light,
              textAlign: 'center', marginTop: '10px', fontStyle: 'italic',
            }}>
              Manage your subscription from the business portal.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// UPGRADE NUDGE — contextual upsell card (Pattern 4)
// ══════════════════════════════════════════════════════════════════════════

type NudgeTrigger = {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  href: string;
};

function UpgradeNudge({ trigger, onDismiss }: { trigger: NudgeTrigger; onDismiss: () => void }) {
  return (
    <div style={{
      background: C.champagne,
      border: `1px solid ${C.goldBorder}`,
      borderRadius: '18px',
      padding: '20px 22px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Gold top shimmer */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: `linear-gradient(90deg, transparent 0%, ${C.gold} 50%, transparent 100%)`,
      }} />
      {/* Close */}
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          position: 'absolute', top: '14px', right: '14px',
          background: 'transparent', border: 'none',
          cursor: 'pointer', padding: '4px',
        }}
      ><X size={14} color={C.muted} /></button>

      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '9px', fontWeight: 600,
        letterSpacing: '2.5px', textTransform: 'uppercase',
        color: C.goldDeep, marginBottom: '8px',
      }}>{trigger.eyebrow}</div>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: '18px', color: C.dark, fontWeight: 400,
        letterSpacing: '0.2px', lineHeight: 1.35, marginBottom: '8px',
        paddingRight: '20px',
      }}>{trigger.title}</div>
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '12px', color: C.muted,
        lineHeight: 1.6, marginBottom: '16px',
      }}>{trigger.body}</div>
      <a
        href={trigger.href}
        style={{
          display: 'inline-block',
          background: C.gold, color: C.ivory,
          textDecoration: 'none',
          padding: '10px 18px', borderRadius: '10px',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '10px', fontWeight: 600,
          letterSpacing: '1.8px', textTransform: 'uppercase',
        }}
      >{trigger.cta}</a>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// BOTTOM-SHEET SHELL — shared luxe overlay for all quick action sheets
// ══════════════════════════════════════════════════════════════════════════

function SheetOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(26,20,16,0.55)',
        zIndex: 200,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'tdwFadeIn 0.22s ease',
      }}
    >
      <style>{`
        @keyframes tdwFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tdwSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          background: C.ivory,
          borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
          padding: '8px 22px calc(env(safe-area-inset-bottom) + 24px)',
          boxShadow: '0 -8px 40px rgba(26,20,16,0.24)',
          maxHeight: '90dvh', overflowY: 'auto',
          animation: 'tdwSlideUp 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {/* Handle bar */}
        <div style={{
          width: '40px', height: '4px', borderRadius: '2px',
          background: C.border, margin: '10px auto 18px',
        }} />
        {children}
      </div>
    </div>
  );
}

function SheetHeader({ eyebrow, title, onClose }: { eyebrow: string; title: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '18px' }}>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '9px', fontWeight: 600,
          letterSpacing: '2.5px', textTransform: 'uppercase',
          color: C.goldDeep, marginBottom: '4px',
        }}>{eyebrow}</div>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '22px', color: C.dark, fontWeight: 400,
          letterSpacing: '0.2px',
        }}>{title}</div>
      </div>
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          background: C.pearl,
          border: 'none', borderRadius: '50%',
          width: '32px', height: '32px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      ><X size={14} color={C.muted} /></button>
    </div>
  );
}

function FieldLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontFamily: 'DM Sans, sans-serif',
      fontSize: '10px', fontWeight: 500,
      letterSpacing: '1.5px', textTransform: 'uppercase',
      color: C.muted, marginBottom: '6px',
      ...style,
    }}>{children}</div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// QUICK INVOICE SHEET — create a simple invoice for an existing client
// ══════════════════════════════════════════════════════════════════════════

function QuickInvoiceSheet({
  vendorId, vendorName, clients, onClose, onSaved,
}: {
  vendorId: string; vendorName: string; clients: any[];
  onClose: () => void; onSaved: (invoice: any) => void;
}) {
  const [clientId, setClientId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedClient = clients.find(c => c.id === clientId);
  const canSave = !!clientId && amount && parseInt(amount) > 0 && !submitting;

  const handleSave = async () => {
    if (!canSave) return;
    setError('');
    setSubmitting(true);
    try {
      // Generate a human-readable invoice number (INV-YYMMDD-NNN)
      const d = new Date();
      const yymmdd = d.toISOString().slice(2, 10).replace(/-/g, '');
      const invoice_number = `INV-${yymmdd}-${Math.floor(Math.random() * 900 + 100)}`;
      const r = await fetch(API + '/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          client_id: clientId,
          client_name: selectedClient?.name || '',
          client_phone: selectedClient?.phone || '',
          client_email: selectedClient?.email || '',
          amount: parseInt(amount),
          description: description.trim() || `Services by ${vendorName}`,
          invoice_number,
          status: 'unpaid',
          issue_date: new Date().toISOString().slice(0, 10),
        }),
      });
      const d2 = await r.json();
      if (d2.success && d2.data) {
        onSaved(d2.data);
      } else {
        setError(d2.error || 'Could not save invoice');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SheetOverlay onClose={onClose}>
      <SheetHeader eyebrow="Quick Action" title="Create Invoice" onClose={onClose} />

      {clients.length === 0 ? (
        <div style={{
          background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
          borderRadius: '12px', padding: '18px',
          fontSize: '13px', color: C.goldDeep, lineHeight: 1.55,
          marginBottom: '12px',
        }}>
          Add a client first, then you can invoice them. Tap <strong>Add Client</strong> on the Home tab.
        </div>
      ) : (
        <>
          <FieldLabel>Client</FieldLabel>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            style={{
              width: '100%',
              background: C.ivory,
              border: `1px solid ${C.border}`,
              borderRadius: '12px',
              padding: '13px 14px',
              fontSize: '14px', color: clientId ? C.dark : C.muted,
              fontFamily: 'DM Sans, sans-serif',
              outline: 'none', marginBottom: '14px',
              appearance: 'none', WebkitAppearance: 'none',
            }}
          >
            <option value="">Select a client…</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}{c.event_type ? ` · ${c.event_type}` : ''}
              </option>
            ))}
          </select>

          <FieldLabel>Amount (₹)</FieldLabel>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: C.ivory, border: `1px solid ${C.border}`,
            borderRadius: '12px', padding: '13px 14px', marginBottom: '14px',
          }}>
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '18px', color: C.goldDeep, fontWeight: 400,
            }}>₹</span>
            <input
              type="text"
              inputMode="numeric"
              value={amount ? parseInt(amount).toLocaleString('en-IN') : ''}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 50000"
              style={{
                flex: 1, background: 'transparent', border: 'none',
                fontSize: '18px', fontFamily: "'Playfair Display', serif",
                color: C.dark, fontWeight: 400, outline: 'none',
              }}
            />
          </div>

          <FieldLabel>Description (optional)</FieldLabel>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Wedding photography — Sangeet + Reception"
            style={{
              width: '100%',
              background: C.ivory, border: `1px solid ${C.border}`,
              borderRadius: '12px', padding: '13px 14px',
              fontSize: '13px', color: C.dark,
              fontFamily: 'DM Sans, sans-serif', outline: 'none',
              marginBottom: '14px', boxSizing: 'border-box',
            }}
          />

          <div style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
            color: C.muted, marginBottom: '16px', fontStyle: 'italic',
          }}>
            GST (18%) is added automatically. Total: ₹{amount ? (parseInt(amount) * 1.18).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'}
          </div>
        </>
      )}

      {error && (
        <div style={{
          background: C.redSoft, border: `1px solid ${C.redBorder}`,
          borderRadius: '10px', padding: '10px 12px',
          fontSize: '11px', color: C.red, marginBottom: '12px',
        }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            background: 'transparent', color: C.muted,
            border: `1px solid ${C.border}`, borderRadius: '12px',
            padding: '13px', fontSize: '11px', fontWeight: 500,
            letterSpacing: '1.5px', textTransform: 'uppercase',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}
        >Cancel</button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            flex: 2,
            background: canSave ? C.gold : C.border,
            color: canSave ? C.ivory : C.light,
            border: 'none', borderRadius: '12px',
            padding: '14px', fontSize: '11px', fontWeight: 600,
            letterSpacing: '1.8px', textTransform: 'uppercase',
            cursor: canSave ? 'pointer' : 'not-allowed',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >{submitting ? 'Saving…' : 'Save Invoice'}</button>
      </div>
    </SheetOverlay>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// QUICK BLOCK DATE SHEET — block a date so couples can't request it
// ══════════════════════════════════════════════════════════════════════════

function QuickBlockDateSheet({
  vendorId, onClose, onSaved,
}: {
  vendorId: string; onClose: () => void; onSaved: (blocked: any) => void;
}) {
  const [blockDate, setBlockDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSave = !!blockDate && !submitting;

  const handleSave = async () => {
    if (!canSave) return;
    setError('');
    setSubmitting(true);
    try {
      const r = await fetch(API + '/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          blocked_date: blockDate,
          reason: reason.trim() || null,
        }),
      });
      const d = await r.json();
      if (d.success && d.data) {
        onSaved(d.data);
      } else {
        setError(d.error || 'Could not block date');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SheetOverlay onClose={onClose}>
      <SheetHeader eyebrow="Quick Action" title="Block a Date" onClose={onClose} />

      <div style={{
        background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
        borderRadius: '10px', padding: '12px 14px',
        fontSize: '11px', color: C.goldDeep, lineHeight: 1.55,
        marginBottom: '14px',
      }}>
        Couples won't be able to request this date. Blocking is private — no one sees the reason.
      </div>

      <FieldLabel>Date</FieldLabel>
      <input
        type="date"
        value={blockDate}
        onChange={(e) => setBlockDate(e.target.value)}
        style={{
          width: '100%',
          background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '13px 14px',
          fontSize: '14px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          marginBottom: '14px', boxSizing: 'border-box',
        }}
      />

      <FieldLabel>Reason (optional, private)</FieldLabel>
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Personal travel, family event"
        style={{
          width: '100%',
          background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '13px 14px',
          fontSize: '13px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          marginBottom: '16px', boxSizing: 'border-box',
        }}
      />

      {error && (
        <div style={{
          background: C.redSoft, border: `1px solid ${C.redBorder}`,
          borderRadius: '10px', padding: '10px 12px',
          fontSize: '11px', color: C.red, marginBottom: '12px',
        }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            background: 'transparent', color: C.muted,
            border: `1px solid ${C.border}`, borderRadius: '12px',
            padding: '13px', fontSize: '11px', fontWeight: 500,
            letterSpacing: '1.5px', textTransform: 'uppercase',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}
        >Cancel</button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            flex: 2,
            background: canSave ? C.gold : C.border,
            color: canSave ? C.ivory : C.light,
            border: 'none', borderRadius: '12px',
            padding: '14px', fontSize: '11px', fontWeight: 600,
            letterSpacing: '1.8px', textTransform: 'uppercase',
            cursor: canSave ? 'pointer' : 'not-allowed',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >{submitting ? 'Blocking…' : 'Block Date'}</button>
      </div>
    </SheetOverlay>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// QUICK REMINDER SHEET — list of unpaid items with one-tap WhatsApp
// ══════════════════════════════════════════════════════════════════════════

function QuickReminderSheet({
  invoices, paymentSchedules, vendorName, onClose,
}: {
  invoices: any[]; paymentSchedules: any[]; vendorName: string; onClose: () => void;
}) {
  // Build a unified list of items that can have a reminder sent
  type ReminderItem = {
    id: string;
    client_name: string;
    client_phone: string;
    amount: number;
    label: string;
    source: 'invoice' | 'schedule';
    is_overdue: boolean;
  };

  const items: ReminderItem[] = [];
  for (const inv of invoices) {
    if (!inv.client_phone) continue;
    items.push({
      id: `inv-${inv.id}`,
      client_name: inv.client_name || 'Client',
      client_phone: inv.client_phone,
      amount: parseInt(inv.amount) || 0,
      label: inv.invoice_number || 'Invoice',
      source: 'invoice',
      is_overdue: false,
    });
  }
  for (const sched of paymentSchedules) {
    const overdueInst = (sched.instalments || []).filter((i: any) => !i.paid && i.due_date && new Date(i.due_date) < new Date());
    if (overdueInst.length === 0 || !sched.client_phone) continue;
    items.push({
      id: `sched-${sched.id}`,
      client_name: sched.client_name || 'Client',
      client_phone: sched.client_phone,
      amount: overdueInst.reduce((s: number, i: any) => s + (parseInt(i.amount) || 0), 0),
      label: `${overdueInst.length} overdue instalment${overdueInst.length > 1 ? 's' : ''}`,
      source: 'schedule',
      is_overdue: true,
    });
  }

  const sendReminder = (item: ReminderItem) => {
    const cleanPhone = String(item.client_phone).replace(/\D/g, '');
    const amountFmt = item.amount.toLocaleString('en-IN');
    const msg = item.is_overdue
      ? `Hi ${item.client_name}! Gentle reminder — ${item.label} totalling ₹${amountFmt} is pending. Please clear at your earliest convenience. — ${vendorName}`
      : `Hi ${item.client_name}! Gentle reminder regarding ${item.label} for ₹${amountFmt}. Please let me know once done! — ${vendorName}`;
    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <SheetOverlay onClose={onClose}>
      <SheetHeader eyebrow="Quick Action" title="Send Payment Reminder" onClose={onClose} />

      {items.length === 0 ? (
        <div style={{
          background: C.greenSoft, border: `1px solid rgba(76,175,80,0.22)`,
          borderRadius: '12px', padding: '20px',
          textAlign: 'center', marginBottom: '14px',
        }}>
          <CheckCircle size={28} color={C.green} />
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '18px', color: C.dark, fontWeight: 400,
            marginTop: '10px',
          }}>All clear.</div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px', color: C.muted, marginTop: '4px',
          }}>No outstanding invoices or overdue payments.</div>
        </div>
      ) : (
        <>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px', color: C.muted,
            marginBottom: '14px', fontStyle: 'italic',
          }}>
            Tap to open WhatsApp with a polite, pre-written message. Review before sending.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => sendReminder(item)}
                style={{
                  background: item.is_overdue ? C.redSoft : C.pearl,
                  border: `1px solid ${item.is_overdue ? C.redBorder : C.border}`,
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  textAlign: 'left', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px', color: C.dark, fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{item.client_name}</div>
                  <div style={{
                    fontSize: '11px', color: item.is_overdue ? C.red : C.muted,
                    marginTop: '2px',
                  }}>{item.label}{item.is_overdue ? ' · Overdue' : ''}</div>
                </div>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '15px', color: C.dark,
                }}>₹{item.amount.toLocaleString('en-IN')}</div>
                <div style={{
                  background: '#25D366', borderRadius: '50%',
                  width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <MessageCircle size={14} color="#FFFFFF" />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <button
        onClick={onClose}
        style={{
          width: '100%',
          background: 'transparent', color: C.muted,
          border: `1px solid ${C.border}`, borderRadius: '12px',
          padding: '13px', fontSize: '11px', fontWeight: 500,
          letterSpacing: '1.5px', textTransform: 'uppercase',
          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
        }}
      >Done</button>
    </SheetOverlay>
  );
}
