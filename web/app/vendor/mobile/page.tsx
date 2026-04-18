'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Grid, MessageCircle, Calendar, Tool, User, Plus, Phone, Send,
  FileText, CreditCard, Clock, Users, TrendingDown, Percent,
  Share2, BarChart2, Package, Gift, Globe, Award, ChevronRight, ChevronDown,
  LogOut, Settings as SettingsIcon, Lock, Briefcase, MapPin, Zap,
  CheckCircle, AlertCircle, X, Search, Mail, MoreHorizontal,
  Minus, Edit2, DollarSign, Tag, Trash2,
} from 'react-feather';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

// ── Types ────────────────────────────────────────────────────────────────

type Mode = 'Business' | 'Discovery';
type Tab = 'Overview' | 'Clients' | 'Teams' | 'Power';
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
  { id: 'overview',     icon: Grid,         label: 'Overview',     tab: 'Overview' as Tab },
  { id: 'inquiries',    icon: Mail,         label: 'Enquiries',    tab: 'Power' as Tab, sub: 'inquiries' },
  { id: 'calendar',     icon: Calendar,     label: 'Calendar',     tab: 'Power' as Tab, sub: 'calendar' },
  { id: 'clients',      icon: Users,        label: 'Clients',      tab: 'Clients' as Tab },
  { id: 'invoices',     icon: FileText,     label: 'Invoices',     tab: 'Power' as Tab, sub: 'invoices' },
  { id: 'contracts',    icon: Briefcase,    label: 'Contracts',    tab: 'Power' as Tab, sub: 'contracts' },
  { id: 'payments',     icon: CreditCard,   label: 'Payments',     tab: 'Power' as Tab, sub: 'payments' },
  { id: 'availability', icon: Clock,        label: 'Availability', tab: 'Power' as Tab, sub: 'calendar' },
];

const SIGNATURE_TOOLS = [
  { id: 'expenses',  icon: TrendingDown,  label: 'Expenses',  tab: 'Power' as Tab, sub: 'expenses' },
  { id: 'tax',       icon: Percent,       label: 'Tax & TDS', tab: 'Power' as Tab, sub: 'tax' },
  { id: 'team',      icon: Users,         label: 'Teams',     tab: 'Teams' as Tab },
  { id: 'referral',  icon: Share2,        label: 'Referrals', tab: 'Power' as Tab, sub: 'referral' },
  { id: 'whatsapp',  icon: MessageCircle, label: 'Broadcast', tab: 'Power' as Tab, sub: 'whatsapp' },
  { id: 'analytics', icon: BarChart2,     label: 'Analytics', tab: 'Power' as Tab, sub: 'analytics' },
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
  const [mode, setMode] = useState<Mode>('Business');
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [activeSubTool, setActiveSubTool] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Data
  const [bookings, setBookings] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [paymentSchedules, setPaymentSchedules] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
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

  // Respect ?sub=<subtool> query param — lets external entry points
  // deep-link into a specific Tools sub-tool
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const sub = params.get('sub');
      const validSubs = ['clients', 'invoices', 'contracts', 'payments', 'expenses', 'tax', 'team', 'referral', 'whatsapp', 'analytics', 'chat', 'todos', 'events', 'inquiries', 'calendar'];
      if (sub && validSubs.includes(sub)) {
        // Clients gets its own tab; everything else goes to Power
        if (sub === 'clients') {
          setActiveTab('Clients');
        } else if (sub === 'team') {
          setActiveTab('Teams');
        } else {
          setActiveTab('Power');
          setActiveSubTool(sub);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // ── Quick Action bottom sheets ────────────────────────────────────────
  const [showQuickInvoice, setShowQuickInvoice] = useState(false);
  const [showQuickBlock, setShowQuickBlock] = useState(false);
  const [showQuickReminder, setShowQuickReminder] = useState(false);
  const [showQuickExpense, setShowQuickExpense] = useState(false);
  const [showQuickBroadcast, setShowQuickBroadcast] = useState(false);
  const [showQuickTask, setShowQuickTask] = useState(false);
  const [showQuickTodo, setShowQuickTodo] = useState(false);
  const [showQuickEvent, setShowQuickEvent] = useState(false);

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
        const [bRes, iRes, cRes, blockRes, schedRes, vRes, aiRes, tRes, eRes] = await Promise.all([
          fetch(`${API}/api/bookings/vendor/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/invoices/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/vendor-clients/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/availability/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/payment-schedules/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/vendors/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/ai-tokens/status/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/todos/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/events/${vId}`).then(r => r.json()).catch(() => ({})),
        ]);
        if (bRes.success) setBookings(bRes.data || []);
        if (iRes.success) setInvoices(iRes.data || []);
        if (cRes.success) setClients(cRes.data || []);
        if (blockRes.success) setBlockedDates(blockRes.data || []);
        if (schedRes.success) setPaymentSchedules(schedRes.data || []);
        if (vRes.success) setVendorData(vRes.data);
        if (aiRes.success) setAiStatus(aiRes.data || aiRes);
        if (tRes.success) setTodos(tRes.data || []);
        if (eRes.success) setEvents(eRes.data || []);
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
      {/* ── HEADER (with embedded Mode toggle) ── */}
      <Header
        session={session}
        tier={tier}
        mode={mode}
        onModeChange={(m) => {
          setMode(m);
          setActiveSubTool(null);
          if (m === 'Business') setActiveTab('Overview');
        }}
        onOpenProfile={() => setShowProfile(true)}
      />

      {/* ── BODY ── */}
      <div style={{ padding: '8px 16px 24px' }}>
        {mode === 'Discovery' && <DiscoveryComingSoon session={session} />}

        {mode === 'Business' && activeTab === 'Overview' && (
          <DashboardTab
            session={session}
            tier={tier}
            bookings={bookings}
            invoices={invoices}
            clients={clients}
            leads={leads}
            paymentSchedules={paymentSchedules}
            todos={todos}
            events={events}
            loading={loading}
            onJumpToTab={(t: Tab) => {
              setActiveTab(t);
              if (typeof window !== 'undefined') {
                const pending = localStorage.getItem('tdw_pwa_open_sub');
                if (t === 'Power' && pending) {
                  setActiveSubTool(pending);
                  localStorage.removeItem('tdw_pwa_open_sub');
                }
              }
            }}
            vendorData={vendorData}
            onOpenAiModal={() => setShowAiModal(true)}
            checklistDismissed={checklistDismissed}
            onDismissChecklist={dismissChecklist}
            onAddClient={() => setShowAddClient(true)}
            onOpenInvoice={() => setShowQuickInvoice(true)}
            onOpenBlockDate={() => setShowQuickBlock(true)}
            onOpenReminder={() => setShowQuickReminder(true)}
            onOpenTodo={() => setShowQuickTodo(true)}
            onOpenEvent={() => setShowQuickEvent(true)}
            onToggleTodo={async (id: string, done: boolean) => {
              try {
                const res = await fetch(`${API}/api/todos/${id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({done}) });
                const d = await res.json();
                if (d.success) setTodos(prev => prev.map(t => t.id === id ? {...t, done} : t));
              } catch {}
            }}
          />
        )}

        {mode === 'Business' && activeTab === 'Clients' && (
          <ToolsTab
            session={session}
            tier={tier}
            activeSubTool="clients"
            setActiveSubTool={(s: string | null) => {
              // When the user backs out of the clients detail view,
              // they go back to the Clients tab root (not Power).
              if (s === null) return;
              setActiveSubTool(s);
            }}
            clients={clients}
            invoices={invoices}
            bookings={bookings}
            leads={leads}
            paymentSchedules={paymentSchedules}
            todos={todos}
            events={events}
            onAddClient={() => setShowAddClient(true)}
            onOpenInvoice={() => setShowQuickInvoice(true)}
            onOpenTodo={() => setShowQuickTodo(true)}
            onOpenEvent={() => setShowQuickEvent(true)}
            onToggleTodo={async (id: string, done: boolean) => {
              try {
                const res = await fetch(`${API}/api/todos/${id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({done}) });
                const d = await res.json();
                if (d.success) setTodos(prev => prev.map(t => t.id === id ? {...t, done} : t));
              } catch {}
            }}
            onDeleteTodo={async (id: string) => {
              try {
                const res = await fetch(`${API}/api/todos/${id}`, { method: 'DELETE' });
                const d = await res.json();
                if (d.success) setTodos(prev => prev.filter(t => t.id !== id));
              } catch {}
            }}
            onSavePaymentSchedule={(newSched: any) => setPaymentSchedules(prev => [newSched, ...prev])}
            vendorName={session?.vendorName}
            forcedSub="clients"
          />
        )}

        {mode === 'Business' && activeTab === 'Teams' && (
          <AssistantsPanel session={session} />
        )}

        {mode === 'Business' && activeTab === 'Power' && (
          <ToolsTab
            session={session}
            tier={tier}
            activeSubTool={activeSubTool}
            setActiveSubTool={setActiveSubTool}
            clients={clients}
            invoices={invoices}
            bookings={bookings}
            leads={leads}
            paymentSchedules={paymentSchedules}
            todos={todos}
            events={events}
            blockedDates={blockedDates}
            onAddClient={() => setShowAddClient(true)}
            onOpenInvoice={() => setShowQuickInvoice(true)}
            onOpenTodo={() => setShowQuickTodo(true)}
            onOpenEvent={() => setShowQuickEvent(true)}
            onOpenBlockDate={() => setShowQuickBlock(true)}
            onRefreshCalendar={() => {
              if (!session?.vendorId) return;
              fetch(`${API}/api/availability/${session.vendorId}`).then(r => r.json()).then(d => {
                if (d.success) setBlockedDates(d.data || []);
              }).catch(() => {});
              fetch(`${API}/api/events/${session.vendorId}`).then(r => r.json()).then(d => {
                if (d.success) setEvents(d.data || []);
              }).catch(() => {});
              fetch(`${API}/api/bookings/vendor/${session.vendorId}`).then(r => r.json()).then(d => {
                if (d.success) setBookings(d.data || []);
              }).catch(() => {});
            }}
            onToggleTodo={async (id: string, done: boolean) => {
              try {
                const res = await fetch(`${API}/api/todos/${id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({done}) });
                const d = await res.json();
                if (d.success) setTodos(prev => prev.map(t => t.id === id ? {...t, done} : t));
              } catch {}
            }}
            onDeleteTodo={async (id: string) => {
              try {
                const res = await fetch(`${API}/api/todos/${id}`, { method: 'DELETE' });
                const d = await res.json();
                if (d.success) setTodos(prev => prev.filter(t => t.id !== id));
              } catch {}
            }}
            onSavePaymentSchedule={(newSched: any) => setPaymentSchedules(prev => [newSched, ...prev])}
            vendorName={session?.vendorName}
          />
        )}
      </div>

      {/* ── BOTTOM NAV (only shown in Business mode) ── */}
      {mode === 'Business' && (
        <BottomNav
          active={activeTab}
          pending={pendingBookings.length}
          onChange={(t) => {
            setActiveTab(t);
            // Respect a pending sub-tool hint set by a Quick Action (e.g. "Expense")
            if (typeof window !== 'undefined') {
              const pending = localStorage.getItem('tdw_pwa_open_sub');
              if (t === 'Power' && pending) {
                setActiveSubTool(pending);
                localStorage.removeItem('tdw_pwa_open_sub');
              } else {
                setActiveSubTool(null);
              }
            } else {
              setActiveSubTool(null);
            }
          }}
        />
      )}

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

      {/* ── FLOATING DREAM AI BUTTON (Overview only) ── */}
      {mode === 'Business' && activeTab === 'Overview' && (
        <button
          onClick={() => setShowAiModal(true)}
          aria-label="Open Dream AI"
          style={{
            position: 'fixed', bottom: 'calc(72px + env(safe-area-inset-bottom))', right: 'max(20px, calc(50vw - 220px))',
            width: 52, height: 52, borderRadius: 26,
            background: C.dark, border: `2px solid ${C.gold}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 40,
            boxShadow: '0 6px 20px rgba(44,36,32,0.25)',
          }}
        >
          <span style={{ position: 'absolute', inset: 0, borderRadius: 26, border: `1px solid ${C.gold}`, opacity: 0.4, animation: 'tdwAiPulse 2.4s ease-in-out infinite' }} />
          <Zap size={20} color={C.gold} />
        </button>
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
          onClientCreated={(newClient: any) => setClients(prev => [newClient, ...prev])}
          onEventCreated={(newEvent: any) => setEvents(prev => [newEvent, ...prev])}
        />
      )}

      {/* ── QUICK REMINDER SHEET ── */}
      {showQuickReminder && (
        <QuickReminderSheet
          invoices={invoices.filter((i: any) => i.status !== 'paid')}
          paymentSchedules={paymentSchedules.filter((s: any) =>
            (s.instalments || []).some((inst: any) => !inst.paid && inst.due_date && new Date(inst.due_date) < new Date())
          )}
          clients={clients}
          events={events}
          bookings={bookings}
          vendorName={session.vendorName}
          onClose={() => setShowQuickReminder(false)}
        />
      )}

      {/* ── QUICK TO-DO SHEET ── */}
      {showQuickTodo && (
        <QuickTodoSheet
          vendorId={session.vendorId}
          onClose={() => setShowQuickTodo(false)}
          onSaved={(newTodo: any) => { setTodos(prev => [newTodo, ...prev]); setShowQuickTodo(false); }}
        />
      )}

      {/* ── QUICK EVENT SHEET ── */}
      {showQuickEvent && (
        <QuickEventSheet
          vendorId={session.vendorId}
          clients={clients}
          onClose={() => setShowQuickEvent(false)}
          onSaved={(newEvent: any) => { setEvents(prev => [newEvent, ...prev]); setShowQuickEvent(false); }}
        />
      )}

      {/* ── PROFILE OVERLAY ── */}
      {showProfile && (
        <ProfileScreen
          session={session}
          tier={tier}
          vendorData={vendorData}
          aiStatus={aiStatus}
          onClose={() => setShowProfile(false)}
          onToast={(msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); }}
        />
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 'calc(92px + env(safe-area-inset-bottom))', left: '50%',
          transform: 'translateX(-50%)',
          background: C.dark, color: C.ivory,
          padding: '11px 18px', borderRadius: '50px',
          fontSize: '12px', fontFamily: 'DM Sans, sans-serif',
          letterSpacing: '0.3px', maxWidth: 'calc(100% - 40px)',
          boxShadow: '0 4px 20px rgba(26,20,16,0.3)',
          zIndex: 300, textAlign: 'center',
        }}>{toast}</div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// HEADER
// ══════════════════════════════════════════════════════════════════════════

function Header({ session, tier, mode, onModeChange, onOpenProfile }: {
  session: VendorSession; tier: Tier;
  mode: Mode; onModeChange: (m: Mode) => void;
  onOpenProfile: () => void;
}) {
  const tierLabel = tier === 'prestige' ? 'PRESTIGE' : tier === 'signature' ? 'SIGNATURE' : 'ESSENTIAL';
  const name = session.vendorName || 'Vendor';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || 'V';

  // Tier-coloured avatar ring
  const avatarBg = tier === 'prestige' ? C.dark : tier === 'signature' ? C.goldSoft : C.pearl;
  const avatarBorder = tier === 'prestige' ? C.gold : tier === 'signature' ? C.goldBorder : C.border;
  const avatarText = tier === 'prestige' ? C.gold : tier === 'signature' ? C.goldDeep : C.muted;

  return (
    <div style={{
      padding: 'calc(env(safe-area-inset-top) + 16px) 20px 12px',
      background: C.cream,
      borderBottom: `1px solid ${C.border}`,
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <button
          onClick={onOpenProfile}
          aria-label="Open profile"
          style={{
            width: '42px', height: '42px', borderRadius: '50%',
            background: avatarBg, border: `1.5px solid ${avatarBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            fontFamily: "'Playfair Display', serif",
            fontSize: '15px', fontWeight: 500, color: avatarText,
            letterSpacing: '0.5px', padding: 0,
          }}
        >{initials}</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '2px', color: C.gold, textTransform: 'uppercase' }}>
            THE DREAM WEDDING
          </div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: C.dark, marginTop: '1px', fontFamily: 'Playfair Display, serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}
          </div>
        </div>
        <div style={{
          padding: '4px 10px',
          borderRadius: '50px',
          background: tier === 'prestige' ? C.goldMist : C.goldSoft,
          border: `1px solid ${tier === 'prestige' ? C.gold : C.goldBorder}`,
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '9px', fontWeight: 600, letterSpacing: '1.8px',
            color: tier === 'prestige' ? C.goldDeep : C.gold,
          }}>
            {tierLabel}
          </span>
        </div>
      </div>

      {/* Mode toggle row — centered below the identity row */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
        <ModeToggle mode={mode} onChange={onModeChange} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// DASHBOARD TAB (mirrors React Native Overview)
// ══════════════════════════════════════════════════════════════════════════

function DashboardTab({ session, tier, bookings, invoices, clients, leads, paymentSchedules, todos, events, loading, onJumpToTab, vendorData, onOpenAiModal, checklistDismissed, onDismissChecklist, onAddClient, onOpenInvoice, onOpenBlockDate, onOpenReminder, onOpenTodo, onOpenEvent, onToggleTodo }: any) {
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

  // ── Month boundaries ───────────────────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // ── Business Pulse signals (Signature & Prestige) ──────────────────────
  const paidInvoices = invoices.filter((i: any) => i.status === 'paid');
  const revenueThisMonth = paidInvoices
    .filter((i: any) => {
      const d = i.paid_at ? new Date(i.paid_at) : i.updated_at ? new Date(i.updated_at) : null;
      return d && d >= monthStart;
    })
    .reduce((s: number, i: any) => s + (parseInt(i.amount) || 0), 0);
  const revenueLastMonth = paidInvoices
    .filter((i: any) => {
      const d = i.paid_at ? new Date(i.paid_at) : i.updated_at ? new Date(i.updated_at) : null;
      return d && d >= lastMonthStart && d <= lastMonthEnd;
    })
    .reduce((s: number, i: any) => s + (parseInt(i.amount) || 0), 0);
  const revenueDelta: number | null = revenueLastMonth > 0
    ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
    : null;

  // Conversion: confirmed bookings this month / total leads this month
  const leadsThisMonth = leads.filter((l: any) =>
    l.created_at && new Date(l.created_at) >= monthStart
  ).length;
  const confirmedThisMonth = bookings.filter((b: any) =>
    b.status === 'confirmed' && b.confirmed_at && new Date(b.confirmed_at) >= monthStart
  ).length;
  const conversionRate: number | null = leadsThisMonth > 0
    ? Math.round((confirmedThisMonth / leadsThisMonth) * 100)
    : null;

  // Data sufficiency gate — 15 days minimum before showing metrics
  const vendorCreatedAt = vendorData?.created_at ? new Date(vendorData.created_at) : null;
  const vendorDays = vendorCreatedAt
    ? Math.floor((Date.now() - vendorCreatedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const hasEnoughData = vendorDays >= 15;
  const daysUntilPulseReady = Math.max(0, 15 - vendorDays);

  // ── Lead Pipeline (Signature) ─────────────────────────────────────────
  const newLeads = leads.filter((l: any) => !l.converted_to_booking);
  const quotedBookings = bookings.filter((b: any) => b.status === 'quoted');
  // confirmedThisMonth already computed above

  // ── Revenue Trend (Signature & Prestige) — last 6 months ──────────────
  const monthlyRevenue: { label: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const amt = paidInvoices
      .filter((inv: any) => {
        const d = inv.paid_at ? new Date(inv.paid_at) : inv.updated_at ? new Date(inv.updated_at) : null;
        return d && d >= mStart && d <= mEnd;
      })
      .reduce((s: number, inv: any) => s + (parseInt(inv.amount) || 0), 0);
    monthlyRevenue.push({
      label: mStart.toLocaleDateString('en-IN', { month: 'short' }),
      amount: amt,
    });
  }
  const maxMonthRevenue = Math.max(...monthlyRevenue.map(m => m.amount), 1);

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
    href: '/vendor/mobile/profile/edit',
  };

  // Trigger 2 — Essential: 3+ overdue payment schedules → Broadcast / Signature
  const overdueCount = overdueSchedules.length;
  const trigger_broadcast_reminders: NudgeTrigger = {
    key: 'broadcast_reminders',
    eyebrow: 'Recover Outstanding Faster',
    title: `You have ${overdueCount} overdue payments.`,
    body: 'Signature vendors use WhatsApp Broadcast to send polite bulk reminders — and recover 40% faster than one-by-one follow-ups.',
    cta: 'See Signature',
    href: '/vendor/mobile/profile/edit',
  };

  // Trigger 3 — Essential: 3+ bookings managed this month → Team / Signature
  const bookingsThisMonth = bookings.filter((b: any) =>
    b.created_at && new Date(b.created_at) >= monthStart
  ).length;
  const trigger_team_growth: NudgeTrigger = {
    key: 'team_growth',
    eyebrow: 'Running a Real Business',
    title: `${bookingsThisMonth} bookings this month. That's a team operation.`,
    body: 'Signature unlocks Team — add your assistants, assign roles, share the calendar. Plus Expenses, Tax, and Analytics.',
    cta: 'See Signature',
    href: '/vendor/mobile/profile/edit',
  };

  // Trigger 4 — Essential: 10+ completed bookings → Pricing / Analytics
  const completedBookings = bookings.filter((b: any) => b.status === 'confirmed' && b.event_date && new Date(b.event_date) < new Date()).length;
  const trigger_pricing_optimization: NudgeTrigger = {
    key: 'pricing_optimization',
    eyebrow: 'Your Data Has Stories',
    title: `${completedBookings} completed bookings — patterns are emerging.`,
    body: 'Signature Analytics shows which seasons, events, and channels drive your best revenue. Price with confidence, not guesses.',
    cta: 'See Signature',
    href: '/vendor/mobile/profile/edit',
  };

  // Trigger 5 — Essential: profile 100% + bio detailed → Brand maturity / Referrals
  const bioLength = (vendorData?.about || '').length;
  const trigger_brand_maturity: NudgeTrigger = {
    key: 'brand_maturity',
    eyebrow: 'You\'re Building Something',
    title: 'Your profile is complete and your story is rich.',
    body: 'Signature unlocks the Past Client Discount Loop — each past client who joins and enquires earns you up to 50% off your subscription. Your best marketing is already there.',
    cta: 'See Signature',
    href: '/vendor/mobile/profile/edit',
  };

  // Trigger 6 — Signature: 3+ concurrent active events → Ops scale / Prestige
  const activeEvents = bookings.filter((b: any) => {
    if (b.status !== 'confirmed' || !b.event_date) return false;
    const event = new Date(b.event_date);
    const daysUntil = (event.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntil >= -7 && daysUntil <= 45; // active = within 45 days ahead or 7 past
  }).length;
  const trigger_ops_scale: NudgeTrigger = {
    key: 'ops_scale',
    eyebrow: 'Wedding Season Is Here',
    title: `${activeEvents} active events. Ops mode.`,
    body: 'Prestige unlocks Deluxe Suite — team tasks, procurement tracking, deliveries, photo approvals, client sentiment. For teams running operations, not transactions.',
    cta: 'See Prestige',
    href: '/vendor/mobile/profile/edit',
  };

  // Trigger 7 — Signature: has team members → delegation / Prestige
  const trigger_delegation: NudgeTrigger = {
    key: 'delegation',
    eyebrow: 'Delegation At Scale',
    title: 'Your team is growing.',
    body: 'Prestige brings delegation templates — assign standard workflows (trial, shoot, edit, deliver) in one tap. Plus Team Chat, Check-ins, and Photo Approvals.',
    cta: 'See Prestige',
    href: '/vendor/mobile/profile/edit',
  };

  let activeTrigger: NudgeTrigger | null = null;
  if (vendorData?.id) {
    // Essential triggers (check in order of specificity — most specific first)
    if (tier === 'essential') {
      if (clientsLast7Days >= 5 && !shownNudges.includes('growth_analytics') && nudgeDismissed !== 'growth_analytics') {
        activeTrigger = trigger_growth_analytics;
      } else if (overdueCount >= 3 && !shownNudges.includes('broadcast_reminders') && nudgeDismissed !== 'broadcast_reminders') {
        activeTrigger = trigger_broadcast_reminders;
      } else if (bookingsThisMonth >= 3 && !shownNudges.includes('team_growth') && nudgeDismissed !== 'team_growth') {
        activeTrigger = trigger_team_growth;
      } else if (completedBookings >= 10 && !shownNudges.includes('pricing_optimization') && nudgeDismissed !== 'pricing_optimization') {
        activeTrigger = trigger_pricing_optimization;
      } else if (profilePercent === 100 && bioLength >= 500 && !shownNudges.includes('brand_maturity') && nudgeDismissed !== 'brand_maturity') {
        activeTrigger = trigger_brand_maturity;
      }
    }
    // Signature triggers
    else if (tier === 'signature') {
      if (activeEvents >= 3 && !shownNudges.includes('ops_scale') && nudgeDismissed !== 'ops_scale') {
        activeTrigger = trigger_ops_scale;
      }
      // Note: trigger_delegation requires team data from ds endpoint — activates in Prestige Home
      // once we have that data in parent. Skipped here for now.
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

      {/* ── NEEDS ATTENTION HUB (Turn 9D) — sits at the very top ── */}
      <NeedsAttentionCard
        paymentSchedules={paymentSchedules}
        invoices={invoices}
        todos={todos}
        bookings={bookings}
        onJumpToTab={onJumpToTab}
      />

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
          BUSINESS PULSE — Signature & Prestige only
          4-stat grid: Revenue this month, vs last month, outstanding, conversion
          Gated by 15-day data requirement
         ══════════════════════════════════════════════════════════════════ */}

      {(tier === 'signature' || tier === 'prestige') && (
        hasEnoughData ? (
          <div style={{
            background: C.ivory,
            borderRadius: '18px',
            padding: '22px',
            border: `1px solid ${C.goldBorder}`,
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 22, right: 22, height: '2px',
              background: `linear-gradient(90deg, transparent 0%, ${C.gold} 50%, transparent 100%)`,
            }} />
            <div style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '9px', fontWeight: 600,
              letterSpacing: '2.5px', textTransform: 'uppercase',
              color: C.goldDeep, marginBottom: '14px',
            }}>Business Pulse · This Month</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 16px' }}>
              {/* Revenue this month */}
              <div>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '26px', color: C.dark, fontWeight: 400,
                  letterSpacing: '-0.3px', lineHeight: 1,
                }}>₹{fmtINR(revenueThisMonth)}</div>
                <div style={{
                  fontSize: '9px', color: C.muted, marginTop: '4px',
                  letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500,
                }}>Revenue</div>
              </div>

              {/* Vs last month */}
              <div>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '26px', fontWeight: 400,
                  color: revenueDelta == null ? C.muted : revenueDelta >= 0 ? C.green : C.red,
                  letterSpacing: '-0.3px', lineHeight: 1,
                }}>
                  {revenueDelta == null ? '—' : (revenueDelta >= 0 ? '↗' : '↘') + ' ' + Math.abs(revenueDelta) + '%'}
                </div>
                <div style={{
                  fontSize: '9px', color: C.muted, marginTop: '4px',
                  letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500,
                }}>Vs Last Month</div>
              </div>

              {/* Outstanding */}
              <div>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '22px', color: totalOwed > 0 ? C.dark : C.muted, fontWeight: 400,
                  letterSpacing: '-0.3px', lineHeight: 1,
                }}>₹{fmtINR(totalOwed)}</div>
                <div style={{
                  fontSize: '9px', color: C.muted, marginTop: '4px',
                  letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500,
                }}>Outstanding</div>
              </div>

              {/* Conversion rate */}
              <div>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '22px', color: C.dark, fontWeight: 400,
                  letterSpacing: '-0.3px', lineHeight: 1,
                }}>{conversionRate == null ? '—' : conversionRate + '%'}</div>
                <div style={{
                  fontSize: '9px', color: C.muted, marginTop: '4px',
                  letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500,
                }}>Conversion</div>
              </div>
            </div>
          </div>
        ) : (
          // Data insufficient state — muted, builds anticipation
          <div style={{
            background: C.pearl,
            borderRadius: '18px',
            padding: '24px',
            border: `1px dashed ${C.borderSoft}`,
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '9px', fontWeight: 600,
              letterSpacing: '2.5px', textTransform: 'uppercase',
              color: C.muted, marginBottom: '10px',
            }}>Business Pulse</div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '18px', color: C.dark, fontWeight: 400,
              letterSpacing: '0.2px', lineHeight: 1.4, marginBottom: '6px',
            }}>
              Unlocking in {daysUntilPulseReady} {daysUntilPulseReady === 1 ? 'day' : 'days'}.
            </div>
            <div style={{
              fontSize: '11px', color: C.muted,
              fontStyle: 'italic', lineHeight: 1.55,
              maxWidth: '280px', margin: '0 auto',
            }}>
              We need at least 15 days of your data to tell you anything meaningful about your business.
            </div>
          </div>
        )
      )}

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
          onClick={() => { onJumpToTab('Power'); if (typeof window !== 'undefined') localStorage.setItem('tdw_pwa_open_sub', 'inquiries'); }}
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
              onClick={() => onJumpToTab('Power')}
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

      {/* ── QUICK ACTIONS (real, all wired to bottom sheets, tier-aware) ── */}
      {(() => {
        const essentialActions = [
          { icon: FileText,   label: 'Invoice',    onClick: () => onOpenInvoice && onOpenInvoice() },
          { icon: Send,       label: 'Reminder',   onClick: () => onOpenReminder && onOpenReminder() },
          { icon: Calendar,   label: 'Add Event',  onClick: () => onOpenEvent && onOpenEvent() },
          { icon: CheckCircle, label: 'To-Do',     onClick: () => onOpenTodo && onOpenTodo() },
          { icon: Users,      label: 'Add Client', onClick: () => onAddClient && onAddClient() },
          { icon: Calendar,   label: 'Block Date', onClick: () => onOpenBlockDate && onOpenBlockDate() },
        ];
        const signatureActions = [
          { icon: FileText,    label: 'Invoice',    onClick: () => onOpenInvoice && onOpenInvoice() },
          { icon: Send,        label: 'Reminder',   onClick: () => onOpenReminder && onOpenReminder() },
          { icon: Calendar,    label: 'Add Event',  onClick: () => onOpenEvent && onOpenEvent() },
          { icon: CheckCircle, label: 'To-Do',      onClick: () => onOpenTodo && onOpenTodo() },
          { icon: Users,       label: 'Add Client', onClick: () => onAddClient && onAddClient() },
          { icon: Calendar,    label: 'Block Date', onClick: () => onOpenBlockDate && onOpenBlockDate() },
          { icon: TrendingDown, label: 'Expense',   onClick: () => { onJumpToTab('Power'); if (typeof window !== 'undefined') { localStorage.setItem('tdw_pwa_open_sub', 'expenses'); } } },
          { icon: MessageCircle, label: 'Broadcast', onClick: () => { onJumpToTab('Power'); if (typeof window !== 'undefined') { localStorage.setItem('tdw_pwa_open_sub', 'whatsapp'); } } },
        ];
        const prestigeActions = [
          { icon: FileText,      label: 'Invoice',    onClick: () => onOpenInvoice && onOpenInvoice() },
          { icon: Send,          label: 'Reminder',   onClick: () => onOpenReminder && onOpenReminder() },
          { icon: Calendar,      label: 'Add Event',  onClick: () => onOpenEvent && onOpenEvent() },
          { icon: CheckCircle,   label: 'To-Do',      onClick: () => onOpenTodo && onOpenTodo() },
          { icon: Calendar,      label: 'Block Date', onClick: () => onOpenBlockDate && onOpenBlockDate() },
          { icon: TrendingDown,  label: 'Expense',    onClick: () => { onJumpToTab('Power'); if (typeof window !== 'undefined') { localStorage.setItem('tdw_pwa_open_sub', 'expenses'); } } },
          { icon: BarChart2,     label: 'Analytics',  onClick: () => { onJumpToTab('Power'); if (typeof window !== 'undefined') { localStorage.setItem('tdw_pwa_open_sub', 'analytics'); } } },
          { icon: MessageCircle, label: 'Broadcast',  onClick: () => { onJumpToTab('Power'); if (typeof window !== 'undefined') { localStorage.setItem('tdw_pwa_open_sub', 'whatsapp'); } } },
        ];
        const actions = tier === 'prestige' ? prestigeActions : tier === 'signature' ? signatureActions : essentialActions;
        const cols = 4;
        return (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '8px' }}>
            {actions.map((a: any, i: number) => {
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
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════
          TODAY'S SCHEDULE — events + bookings happening today
         ══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const todayStr = new Date().toDateString();
        const todaysEvents = (events || []).filter((e: any) => e.event_date && new Date(e.event_date).toDateString() === todayStr);
        const todaysBookings = bookings.filter((b: any) => b.event_date && new Date(b.event_date).toDateString() === todayStr);
        if (todaysEvents.length === 0 && todaysBookings.length === 0) return null;
        const items = [
          ...todaysBookings.map((b: any) => ({ id: 'b-'+b.id, title: b.users?.name || b.client_name || 'Booking', sub: b.event_type || 'Event', time: b.event_time || null, kind: 'booking' })),
          ...todaysEvents.map((e: any) => ({ id: 'e-'+e.id, title: e.title, sub: e.client_name || e.type || 'Personal', time: e.event_time || null, kind: 'event' })),
        ];
        return (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <SectionLabel>Today's Schedule</SectionLabel>
              <span style={{ fontSize: '10px', color: C.muted, fontWeight: 600, letterSpacing: '1px' }}>{items.length} ITEM{items.length === 1 ? '' : 'S'}</span>
            </div>
            <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              {items.map((it, idx) => (
                <div key={it.id} style={{ padding: '12px 14px', borderBottom: idx < items.length - 1 ? `1px solid ${C.borderSoft}` : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '6px', height: '36px', borderRadius: '3px',
                    background: it.kind === 'booking' ? C.gold : C.muted, flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', color: C.dark, fontWeight: 500, lineHeight: 1.4 }}>{it.title}</div>
                    <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{it.time ? it.time + ' · ' : ''}{it.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════
          TO-DO CARD — pending tasks, with quick add
         ══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const today = new Date(); today.setHours(0,0,0,0);
        const pendingTodos = (todos || []).filter((t: any) => !t.done);
        const overdueCount = pendingTodos.filter((t: any) => t.due_date && new Date(t.due_date) < today).length;
        const visible = pendingTodos.slice(0, 5);
        return (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <SectionLabel>To-Do</SectionLabel>
              <button onClick={() => onOpenTodo && onOpenTodo()} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: '11px', color: C.goldDeep, fontWeight: 600, letterSpacing: '0.5px',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px',
              }}><Plus size={12} /> Add</button>
            </div>
            {pendingTodos.length === 0 ? (
              <div style={{
                background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`,
                padding: '24px 20px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '13px', color: C.muted, fontStyle: 'italic' }}>All clear. Add a to-do to get started.</div>
              </div>
            ) : (
              <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                {overdueCount > 0 && (
                  <div style={{
                    background: C.redSoft, padding: '8px 14px',
                    fontSize: '11px', color: C.red, fontWeight: 600,
                    borderBottom: `1px solid ${C.redBorder}`,
                  }}>{overdueCount} overdue</div>
                )}
                {visible.map((t: any, idx: number) => {
                  const isOverdue = t.due_date && new Date(t.due_date) < today;
                  return (
                    <div key={t.id} style={{ padding: '12px 14px', borderBottom: idx < visible.length - 1 ? `1px solid ${C.borderSoft}` : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={() => onToggleTodo && onToggleTodo(t.id, true)}
                        style={{
                          width: '18px', height: '18px', flexShrink: 0,
                          borderRadius: '5px', border: `1.5px solid ${C.border}`,
                          background: 'transparent', cursor: 'pointer', padding: 0,
                        }} aria-label="Mark done" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: C.dark, fontWeight: 500, lineHeight: 1.35 }}>{t.title}</div>
                        {t.due_date && (
                          <div style={{ fontSize: '11px', color: isOverdue ? C.red : C.muted, marginTop: '2px', fontWeight: isOverdue ? 600 : 400 }}>
                            {isOverdue ? 'Overdue · ' : ''}{new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </div>
                      {t.priority === 'high' && <div style={{ width: '6px', height: '24px', borderRadius: '3px', background: C.red }} />}
                    </div>
                  );
                })}
                {pendingTodos.length > 5 && (
                  <button onClick={() => { onJumpToTab('Power'); if (typeof window !== 'undefined') localStorage.setItem('tdw_pwa_open_sub', 'todos'); }} style={{
                    width: '100%', padding: '10px',
                    background: C.pearl, color: C.muted,
                    border: 'none', borderTop: `1px solid ${C.borderSoft}`,
                    fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>View all {pendingTodos.length} →</button>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════
          LEAD PIPELINE — Signature & Prestige
          3-column horizontal visual: New Enquiries → Quoted → Confirmed
         ══════════════════════════════════════════════════════════════════ */}

      {(tier === 'signature' || tier === 'prestige') && (newLeads > 0 || quotedBookings > 0 || confirmedThisMonth > 0) && (
        <div>
          <SectionLabel>Pipeline</SectionLabel>
          <div style={{
            background: C.ivory,
            borderRadius: '16px',
            border: `1px solid ${C.border}`,
            padding: '16px',
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px',
            position: 'relative',
          }}>
            {[
              { label: 'New', count: newLeads, tone: C.goldSoft, border: C.goldBorder, text: C.goldDeep },
              { label: 'Quoted', count: quotedBookings, tone: C.pearl, border: C.border, text: C.muted },
              { label: 'Confirmed', count: confirmedThisMonth, tone: C.greenSoft, border: C.border, text: C.green },
            ].map((col, i) => (
              <div key={i}
                onClick={() => { onJumpToTab('Power'); if (typeof window !== 'undefined') localStorage.setItem('tdw_pwa_open_sub', 'inquiries'); }}
                style={{
                  background: col.tone,
                  border: `1px solid ${col.border}`,
                  borderRadius: '12px',
                  padding: '14px 10px',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '24px', color: col.text, fontWeight: 400,
                  letterSpacing: '-0.3px', lineHeight: 1,
                }}>{col.count}</div>
                <div style={{
                  fontSize: '9px', color: C.muted, marginTop: '6px',
                  letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500,
                }}>{col.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ACTIVE EVENTS — Prestige only
          Currently-in-progress weddings with stage markers
         ══════════════════════════════════════════════════════════════════ */}

      {tier === 'prestige' && (() => {
        const activeEventsList = bookings.filter((b: any) => {
          if (b.status !== 'confirmed' || !b.event_date) return false;
          const event = new Date(b.event_date);
          const daysUntil = (event.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          return daysUntil >= -7 && daysUntil <= 60;
        }).sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

        if (activeEventsList.length === 0) return null;

        return (
          <div>
            <SectionLabel>Active Events · {activeEventsList.length}</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeEventsList.slice(0, 3).map((ev: any) => {
                const eventDate = new Date(ev.event_date);
                const daysUntil = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const stage = daysUntil > 30 ? 'Procurement'
                            : daysUntil > 7  ? 'Trials'
                            : daysUntil >= 0 ? 'Event Week'
                                             : 'Delivery';
                const stageTone = daysUntil > 30 ? C.goldSoft
                                : daysUntil > 7  ? C.champagne
                                : daysUntil >= 0 ? C.goldMist
                                                 : C.pearl;
                return (
                  <div key={ev.id} style={{
                    background: C.ivory,
                    borderRadius: '14px',
                    border: `1px solid ${C.border}`,
                    padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: '12px',
                  }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '10px',
                      background: stageTone, border: `1px solid ${C.goldBorder}`,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <div style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: '16px', color: C.dark, fontWeight: 400, lineHeight: 1,
                      }}>{eventDate.getDate()}</div>
                      <div style={{
                        fontSize: '8px', color: C.muted, marginTop: '2px',
                        letterSpacing: '1px', textTransform: 'uppercase',
                      }}>{eventDate.toLocaleDateString('en-IN', { month: 'short' })}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: '15px', color: C.dark, fontWeight: 400,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{ev.couple_name || ev.user_name || 'Event'}</div>
                      <div style={{
                        fontSize: '10px', color: C.muted, marginTop: '3px',
                        letterSpacing: '1.2px', textTransform: 'uppercase', fontWeight: 500,
                      }}>{stage} · {daysUntil >= 0 ? `${daysUntil}d out` : `${Math.abs(daysUntil)}d ago`}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════
          TEAM ACTIVITY FEED — Prestige only
          Live feed from Deluxe Suite tables. Empty state with CTA.
         ══════════════════════════════════════════════════════════════════ */}

      {tier === 'prestige' && (
        <TeamActivityFeed vendorId={session?.vendorId} />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          REVENUE TREND — Signature & Prestige
          Last 6 months sparkline, simple SVG
         ══════════════════════════════════════════════════════════════════ */}

      {(tier === 'signature' || tier === 'prestige') && (totalRevenue > 0 || monthlyRevenue.some(m => m.amount > 0)) && (
        <div>
          <SectionLabel>Revenue Trend</SectionLabel>
          <div style={{
            background: C.ivory,
            borderRadius: '16px',
            border: `1px solid ${C.border}`,
            padding: '18px 16px 14px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', alignItems: 'end', height: '64px' }}>
              {monthlyRevenue.map((m, i) => {
                const pct = m.amount > 0 ? (m.amount / maxMonthRevenue) * 100 : 4;
                return (
                  <div key={i} style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'stretch', justifyContent: 'flex-end',
                    height: '100%',
                  }}>
                    <div style={{
                      height: `${pct}%`,
                      background: i === 5 ? C.gold : C.goldBorder,
                      borderRadius: '4px 4px 0 0',
                      minHeight: '3px',
                    }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', marginTop: '8px' }}>
              {monthlyRevenue.map((m, i) => (
                <div key={i} style={{
                  fontSize: '9px', color: C.muted,
                  letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 500,
                  textAlign: 'center',
                }}>{m.label}</div>
              ))}
            </div>
          </div>
        </div>
      )}

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
              onClick={() => onJumpToTab('Power')}
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

function CalendarTab({ session, bookings, blockedDates, events, onRefresh, onAddClient, onOpenEvent, onDeleteEvent }: any) {
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
          <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>Bookings, events and blocked dates</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => onOpenEvent && onOpenEvent()} style={{ background: C.goldSoft, color: C.goldDeep, border: `1px solid ${C.goldBorder}`, borderRadius: '10px', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
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
        <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: C.muted, fontWeight: 600, marginBottom: '8px' }}>YOUR EVENTS ({(events || []).filter((e: any) => e.event_date && new Date(e.event_date) >= new Date(new Date().setHours(0,0,0,0))).length})</div>
        {(() => {
          const upcomingEvents = (events || [])
            .filter((e: any) => e.event_date && new Date(e.event_date) >= new Date(new Date().setHours(0,0,0,0)))
            .sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
          if (upcomingEvents.length === 0) {
            return (
              <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '20px', textAlign: 'center' }}>
                <span style={{ fontSize: '13px', color: C.muted }}>No events. Tap Event to add one.</span>
              </div>
            );
          }
          return (
            <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              {upcomingEvents.map((e: any, idx: number) => (
                <div key={e.id} style={{ padding: '12px 16px', borderBottom: idx < upcomingEvents.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '8px', background: C.pearl, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: C.dark, lineHeight: 1 }}>{new Date(e.event_date).getDate()}</span>
                    <span style={{ fontSize: '9px', color: C.muted, fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>{new Date(e.event_date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', color: C.dark, fontWeight: 500, lineHeight: 1.4 }}>{e.title}</div>
                    <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>
                      {e.event_time ? e.event_time + ' · ' : ''}
                      {e.client_name || e.type || 'Personal'}
                    </div>
                  </div>
                  <button onClick={() => onDeleteEvent && onDeleteEvent(e.id)} style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', flexShrink: 0 }}>
                    <Trash2 size={14} color={C.light} />
                  </button>
                </div>
              ))}
            </div>
          );
        })()}
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

function ToolsTab({ session, tier, activeSubTool, setActiveSubTool, clients, invoices, bookings, leads, paymentSchedules, todos, events, blockedDates, onAddClient, onOpenInvoice, onOpenTodo, onOpenEvent, onOpenBlockDate, onToggleTodo, onDeleteTodo, onSavePaymentSchedule, vendorName, onToast, onRefreshCalendar, forcedSub }: any) {
  if (activeSubTool) {
    // If this is the Clients tab (forcedSub='clients'), the back button
    // should be a no-op because there's no grid to go back to — the tab
    // itself is the detail view.
    const handleBack = forcedSub ? () => { /* no-op — tab-rooted */ } : () => setActiveSubTool(null);
    const showBackButton = !forcedSub;
    return <ToolDetailView session={session} tier={tier} sub={activeSubTool} clients={clients} invoices={invoices} bookings={bookings} leads={leads} paymentSchedules={paymentSchedules} todos={todos} events={events} blockedDates={blockedDates} onBack={handleBack} showBack={showBackButton} onAddClient={onAddClient} onOpenInvoice={onOpenInvoice} onOpenTodo={onOpenTodo} onOpenEvent={onOpenEvent} onOpenBlockDate={onOpenBlockDate} onToggleTodo={onToggleTodo} onDeleteTodo={onDeleteTodo} onSavePaymentSchedule={onSavePaymentSchedule} vendorName={vendorName} onRefreshCalendar={onRefreshCalendar} />;
  }

  const [lockedModal, setLockedModal] = useState<any>(null);
  const vendorRank = TIER_RANK[tier] || 1;

  type ToolEntry = {
    id: string;
    label: string;
    icon: any;
    sub?: string;                   // PWA sub-tool id
    minTier: Tier;
    desc?: string;
  };

  // Power Mode grid — Inquiries + Calendar first (promoted from dedicated tabs),
  // then the rest. All external business-portal links stripped.
  const SECTIONS: { title: string; tools: ToolEntry[] }[] = [
    {
      title: 'Pipeline',
      tools: [
        { id: 'calendar',  label: 'Calendar',  icon: Calendar,   sub: 'calendar',  minTier: 'essential', desc: 'Your schedule. Bookings, DND days, events, hot dates — all together.' },
      ],
    },
    {
      title: 'Money',
      tools: [
        { id: 'invoices',  label: 'Invoices',  icon: FileText,     sub: 'invoices',  minTier: 'essential', desc: 'Create, send, and track invoices. GST auto-calculated.' },
        { id: 'payments',  label: 'Payments',  icon: CreditCard,   sub: 'payments',  minTier: 'essential', desc: 'Payment schedules and outstanding amounts.' },
        { id: 'contracts', label: 'Contracts', icon: Briefcase,    sub: 'contracts', minTier: 'essential', desc: 'Service agreements, generated and tracked per client.' },
        { id: 'expenses',  label: 'Expenses',  icon: TrendingDown, sub: 'expenses',  minTier: 'signature', desc: 'Track every expense. See where your money goes. P&L view.' },
        { id: 'tax',       label: 'Tax & TDS', icon: Percent,      sub: 'tax',       minTier: 'signature', desc: 'GST invoices. Quarterly TDS summary. CA-ready exports.' },
      ],
    },
    {
      title: 'Utility',
      tools: [
        { id: 'todos',  label: 'To-Do',  icon: CheckCircle, sub: 'todos',  minTier: 'essential', desc: 'Personal task list. Quick reminders, things to do today.' },
        { id: 'events', label: 'Events', icon: Calendar,    sub: 'events', minTier: 'essential', desc: 'Schedule trials, venue visits, prep meetings — anything not a booking.' },
      ],
    },
    {
      title: 'Growth',
      tools: [
        { id: 'whatsapp',  label: 'Broadcast', icon: Send,      sub: 'whatsapp',  minTier: 'signature', desc: 'Send WhatsApp updates to client groups. Templates included.' },
        { id: 'analytics', label: 'Analytics', icon: BarChart2, sub: 'analytics', minTier: 'signature', desc: 'Revenue trends. Lead conversion. What\'s working.' },
      ],
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '12px' }}>
      <div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: 400, color: C.dark, letterSpacing: '0.2px' }}>Power Mode</div>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: C.muted, marginTop: '4px', fontStyle: 'italic' }}>Every tool to run your business, in one place.</div>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.title}>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '9px', fontWeight: 600,
            letterSpacing: '2.5px', textTransform: 'uppercase',
            color: C.goldDeep, marginBottom: '10px', paddingLeft: '4px',
          }}>{section.title}</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
          }}>
            {section.tools.map((tool) => {
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
                      background: C.pearl, border: `1px solid ${C.borderSoft}`,
                      borderRadius: '14px', padding: '18px 8px 16px',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: '8px',
                      cursor: 'pointer', fontFamily: 'inherit', overflow: 'hidden',
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                      background: `linear-gradient(90deg, transparent 0%, ${C.goldBorder} 50%, transparent 100%)`,
                    }} />
                    <div style={{
                      position: 'absolute', top: '6px', right: '6px',
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><Lock size={9} color={C.goldDeep} /></div>
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

              const commonStyle: React.CSSProperties = {
                background: C.ivory, border: `1px solid ${C.goldBorder}`,
                borderRadius: '14px', padding: '18px 8px 16px',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '8px',
                cursor: 'pointer', fontFamily: 'inherit',
                textDecoration: 'none',
              };
              const inner = (
                <>
                  <I size={18} color={C.gold} />
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '10px', fontWeight: 500,
                    letterSpacing: '1.5px', textTransform: 'uppercase',
                    color: C.dark, textAlign: 'center', lineHeight: 1.3,
                  }}>{tool.label}</span>
                </>
              );

              if (tool.sub) {
                return (
                  <button key={tool.id} onClick={() => setActiveSubTool(tool.sub!)} style={commonStyle}>{inner}</button>
                );
              }
              // All tools now route internally — unreachable fallback
              return null;
            })}
          </div>
        </div>
      ))}

      {/* Tier upsell */}
      {tier === 'essential' && (
        <div style={{
          background: C.champagne, borderRadius: '18px', padding: '24px 22px',
          border: `1px solid ${C.goldBorder}`, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
            background: `linear-gradient(90deg, transparent 0%, ${C.gold} 50%, transparent 100%)`,
          }} />
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '9px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase',
            color: C.goldDeep, marginBottom: '10px',
          }}>Upgrade to Signature</div>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 400,
            color: C.dark, letterSpacing: '0.2px', lineHeight: 1.3, marginBottom: '10px',
          }}>Your business, uncompromised.</div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: C.muted, lineHeight: 1.6, marginBottom: '18px' }}>
            Expenses, Tax &amp; TDS, Team, Referrals, WhatsApp Broadcast, and Analytics — all unlocked.
          </div>
          <a href="/vendor/mobile/profile/edit" target="_blank" rel="noreferrer" style={{
            display: 'inline-block', background: C.gold, color: C.ivory,
            textDecoration: 'none', padding: '10px 18px', borderRadius: '10px',
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
            letterSpacing: '1.8px', textTransform: 'uppercase',
          }}>View Plans</a>
        </div>
      )}

      {/* Locked upgrade modal */}
      {lockedModal && (
        <div
          onClick={() => setLockedModal(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.62)', zIndex: 200,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '480px',
              background: C.ivory,
              borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
              padding: '28px 22px calc(env(safe-area-inset-bottom) + 22px)',
              boxShadow: '0 -8px 40px rgba(26,20,16,0.24)',
            }}
          >
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: C.border, margin: '0 auto 18px' }} />
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{
                width: '54px', height: '54px', borderRadius: '16px',
                background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '12px',
              }}>
                {lockedModal.icon && <lockedModal.icon size={20} color={C.gold} />}
              </div>
              <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.goldDeep, marginBottom: '4px' }}>
                {lockedModal.minTier === 'prestige' ? 'Prestige' : 'Signature'} Tool
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: C.dark, marginBottom: '10px' }}>{lockedModal.label}</div>
              <div style={{ fontSize: '13px', color: C.muted, lineHeight: 1.6, maxWidth: '320px', margin: '0 auto' }}>{lockedModal.desc}</div>
            </div>
            <a href="/vendor/mobile/profile/edit" target="_blank" rel="noreferrer" style={{
              display: 'block', textAlign: 'center',
              background: C.gold, color: C.ivory, textDecoration: 'none',
              padding: '14px', borderRadius: '12px',
              fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
              letterSpacing: '1.8px', textTransform: 'uppercase',
            }}>View Plans</a>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TOOL DETAIL VIEW (each tool's content)
// ══════════════════════════════════════════════════════════════════════════

function ToolDetailView({ session, tier, sub, clients, invoices, bookings, leads, paymentSchedules, todos, events, blockedDates, onBack, showBack = true, onAddClient, onOpenInvoice, onOpenTodo, onOpenEvent, onOpenBlockDate, onToggleTodo, onDeleteTodo, onSavePaymentSchedule, vendorName, onRefreshCalendar }: any) {
  const titles: Record<string, string> = {
    clients: 'Clients', invoices: 'Invoices', contracts: 'Contracts', payments: 'Payments',
    expenses: 'Expenses', tax: 'Tax & TDS', team: 'My Team', referral: 'Referrals',
    whatsapp: 'Broadcast', analytics: 'Analytics', chat: 'Team Chat', todos: 'To-Do',
    inquiries: 'Enquiries', calendar: 'Calendar', events: 'Events',
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
            <a
              key={c.id}
              href={`/vendor/mobile/clients/${c.id}`}
              style={{
                background: C.card, borderRadius: '12px',
                border: `1px solid ${C.border}`, padding: '14px',
                display: 'flex', alignItems: 'center', gap: '12px',
                textDecoration: 'none', color: 'inherit',
                cursor: 'pointer',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 20, background: C.goldSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.goldDeep, fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>
                {(c.name || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', color: C.dark, fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: '11px', color: C.muted }}>{c.event_type || 'Event'}{c.event_date ? ` · ${new Date(c.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</div>
              </div>
              <ChevronRight size={16} color={C.light} />
            </a>
          ))}
        </div>
      );
    }

    if (sub === 'invoices') {
      const total = invoices.reduce((s: number, i: any) => s + (parseInt(i.amount) || 0), 0);
      const paid = invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (parseInt(i.amount) || 0), 0);
      const unpaidCount = invoices.filter((i: any) => i.status !== 'paid').length;
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
            {unpaidCount > 0 && (
              <div style={{
                marginTop: '10px', paddingTop: '10px',
                borderTop: `1px solid ${C.borderSoft}`,
                fontSize: '11px', color: C.muted,
                fontStyle: 'italic',
              }}>
                {unpaidCount} unpaid invoice{unpaidCount === 1 ? '' : 's'} · ₹{fmtINR(total - paid)} outstanding
              </div>
            )}
          </div>

          {/* ── Create Invoice CTA ── */}
          {onOpenInvoice && (
            <button
              onClick={onOpenInvoice}
              style={{
                background: C.gold, color: C.ivory,
                border: 'none', borderRadius: '12px',
                padding: '14px', marginBottom: '14px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px', fontWeight: 600,
                letterSpacing: '1.8px', textTransform: 'uppercase',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                width: '100%',
              }}
            >
              <Plus size={14} /> Create Invoice
            </button>
          )}

          {invoices.length === 0 ? (
            <div style={{
              background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`,
              padding: '40px 20px', textAlign: 'center',
            }}>
              <FileText size={32} color={C.light} style={{ marginBottom: '14px' }} />
              <div style={{ fontSize: '15px', fontFamily: "'Playfair Display', serif", color: C.dark, marginBottom: '6px' }}>
                No invoices yet
              </div>
              <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.55, maxWidth: '260px', margin: '0 auto' }}>
                Tap "Create Invoice" above to bill a client.<br />GST is auto-calculated at 18%.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {invoices.slice(0, 20).map((inv: any) => {
                const waMsg = `Hi ${inv.client_name || 'there'}, sharing your invoice from ${vendorName || 'our studio'} — ${inv.invoice_number || 'Invoice'} for ₹${fmtINR(parseInt(inv.amount) || 0)}${inv.status === 'paid' ? ' (paid)' : ''}. Please let me know if you have any questions.`;
                const waUrl = inv.client_phone
                  ? `https://wa.me/91${(inv.client_phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(waMsg)}`
                  : null;
                return (
                  <div key={inv.id} style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', color: C.dark, fontWeight: 500 }}>{inv.client_name || 'Client'}</div>
                        <div style={{ fontSize: '11px', color: C.muted }}>{inv.invoice_number || `INV-${inv.id?.substring(0, 8)}`}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 600, color: C.dark }}>₹{fmtINR(parseInt(inv.amount) || 0)}</span>
                          <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '50px', background: inv.status === 'paid' ? `${C.green}15` : C.goldSoft, color: inv.status === 'paid' ? C.green : C.goldDeep, border: `1px solid ${inv.status === 'paid' ? `${C.green}40` : C.goldBorder}` }}>{inv.status || 'unpaid'}</span>
                        </div>
                      </div>
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Send on WhatsApp"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            background: '#25D366',
                            borderRadius: '50%',
                            width: '36px', height: '36px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            textDecoration: 'none',
                          }}
                        >
                          <MessageCircle size={16} color={C.ivory} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      );
    }

    if (sub === 'payments') {
      return (
        <PaymentSchedulesPanel
          session={session}
          paymentSchedules={paymentSchedules}
          clients={clients}
          onSavePaymentSchedule={onSavePaymentSchedule}
        />
      );
    }

    if (sub === 'expenses') {
      return <ExpensesPanel session={session} tier={tier} clients={clients} />;
    }

    if (sub === 'todos') {
      return <TodoPanel todos={todos} onOpenTodo={onOpenTodo} onToggleTodo={onToggleTodo} onDeleteTodo={onDeleteTodo} />;
    }

    if (sub === 'events') {
      const today = new Date(); today.setHours(0,0,0,0);
      const upcoming = (events || [])
        .filter((e: any) => e.event_date && new Date(e.event_date) >= today)
        .sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
      const past = (events || [])
        .filter((e: any) => e.event_date && new Date(e.event_date) < today)
        .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
      return (
        <div style={{ padding: '16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>Events</div>
              <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>Trials, venue visits, prep meetings — anything not a booking</div>
            </div>
            <button onClick={onOpenEvent} style={{
              background: C.gold, color: C.ivory, border: 'none',
              borderRadius: '50px', padding: '8px 14px',
              fontSize: '11px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px',
              letterSpacing: '0.5px',
            }}><Plus size={12} /> New</button>
          </div>

          {upcoming.length === 0 && past.length === 0 ? (
            <div style={{
              background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`,
              padding: '40px 20px', textAlign: 'center',
            }}>
              <Calendar size={28} color={C.light} style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '14px', fontFamily: "'Playfair Display', serif", color: C.dark, marginBottom: '4px' }}>
                No events yet
              </div>
              <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.55, maxWidth: '260px', margin: '0 auto' }}>
                Tap New to schedule trials, venue visits, prep meetings.
              </div>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <>
                  <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.muted, marginBottom: '10px' }}>
                    Upcoming · {upcoming.length}
                  </div>
                  <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: '20px' }}>
                    {upcoming.map((e: any, idx: number) => (
                      <div key={e.id} style={{ padding: '12px 14px', borderBottom: idx < upcoming.length - 1 ? `1px solid ${C.borderSoft}` : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '8px', background: C.goldSoft, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: C.goldDeep, lineHeight: 1 }}>{new Date(e.event_date).getDate()}</span>
                          <span style={{ fontSize: '9px', color: C.goldDeep, fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>{new Date(e.event_date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13.5px', color: C.dark, fontWeight: 500, lineHeight: 1.4 }}>{e.title}</div>
                          <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>
                            {e.event_time ? e.event_time + ' · ' : ''}
                            {e.client_name || e.type || 'Personal'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {past.length > 0 && (
                <>
                  <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.muted, marginBottom: '10px' }}>
                    Past · {past.length}
                  </div>
                  <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, overflow: 'hidden', opacity: 0.65 }}>
                    {past.slice(0, 10).map((e: any, idx: number) => (
                      <div key={e.id} style={{ padding: '12px 14px', borderBottom: idx < Math.min(past.length, 10) - 1 ? `1px solid ${C.borderSoft}` : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '8px', background: C.pearl, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: C.muted, lineHeight: 1 }}>{new Date(e.event_date).getDate()}</span>
                          <span style={{ fontSize: '9px', color: C.muted, fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>{new Date(e.event_date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13.5px', color: C.dark, fontWeight: 500, lineHeight: 1.4 }}>{e.title}</div>
                          <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{e.client_name || 'Personal'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      );
    }

    if (sub === 'analytics') {
      return <AnalyticsPanel session={session} tier={tier} bookings={bookings} invoices={invoices} leads={leads} clients={clients} paymentSchedules={paymentSchedules} />;
    }

    if (sub === 'tax') {
      return <TaxTdsPanel session={session} tier={tier} invoices={invoices} />;
    }

    if (sub === 'whatsapp') {
      return <BroadcastPanel session={session} tier={tier} clients={clients} />;
    }

    if (sub === 'team') {
      return <TeamPanel session={session} tier={tier} />;
    }

    if (sub === 'chat') {
      return <TeamChatPanel session={session} tier={tier} />;
    }

    // ── Power Mode additions (Turn 9B) ────────────────────────────────
    // These used to be their own bottom-nav tabs; now they live as
    // Power Mode cards and render the same underlying components.
    if (sub === 'inquiries') {
      return (
        <InquiriesTab
          session={session}
          leads={leads}
          bookings={bookings}
          onRefresh={() => {
            fetch(`${API}/api/bookings/vendor/${session.vendorId}`).then(r => r.json()).then(d => {
              if (d.success) { /* parent refreshes on next render */ }
            });
          }}
        />
      );
    }

    if (sub === 'calendar') {
      return (
        <CalendarPanel
          session={session}
          bookings={bookings}
          blockedDates={blockedDates}
          events={events}
          onOpenEvent={onOpenEvent}
          onOpenBlockDate={onOpenBlockDate}
          onRefresh={onRefreshCalendar}
        />
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
        <a href="/vendor/mobile/profile/edit" target="_blank" rel="noreferrer" style={{
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
      {showBack && (
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: C.gold, fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-start', padding: 0, fontFamily: 'inherit' }}>
          ← Back to tools
        </button>
      )}
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
          { icon: Briefcase,    label: 'Open business portal',  href: '/vendor/mobile/profile/edit' },
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

// ══════════════════════════════════════════════════════════════════════════
// NEEDS ATTENTION (Turn 9D)
// Cross-functional pending hub. Aggregates overdue/due-today items from
// payment schedules, invoices, todos, and bookings into one actionable
// card at the top of Overview.
//
// Severity buckets:
//  • Overdue   → red-rimmed   (past due date)
//  • Today     → gold-rimmed  (due today)
//  • This week → grey         (within 7 days)
// Shows up to 6 items + "View all" if more.
// Empty state: "You're all caught up ✨"
// ══════════════════════════════════════════════════════════════════════════

interface AttentionItem {
  id: string;
  label: string;
  sub: string;
  severity: 'overdue' | 'today' | 'week';
  kind: 'payment' | 'invoice' | 'todo' | 'booking';
  target: Tab;
  targetSub?: string;
}

function NeedsAttentionCard({ paymentSchedules, invoices, todos, bookings, onJumpToTab }: {
  paymentSchedules: any[];
  invoices: any[];
  todos: any[];
  bookings: any[];
  onJumpToTab?: (t: Tab) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const now = new Date();
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekFromNow = new Date(today0.getTime() + 7 * 24 * 60 * 60 * 1000);

  const items: AttentionItem[] = [];

  // ── Payment schedules — overdue instalments
  for (const sched of paymentSchedules) {
    for (const inst of (sched.instalments || [])) {
      if (inst.paid || !inst.due_date) continue;
      const due = new Date(inst.due_date);
      const dueIso = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      const name = sched.client_name || 'Client';
      const amt = `₹${fmtINR(parseInt(inst.amount) || 0)}`;
      if (dueIso < today0) {
        items.push({
          id: `ps-${sched.id}-${inst.label}`,
          label: `${amt} from ${name}`,
          sub: `${inst.label} · overdue since ${due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
          severity: 'overdue',
          kind: 'payment',
          target: 'Power',
          targetSub: 'payments',
        });
      } else if (dueIso.getTime() === today0.getTime()) {
        items.push({
          id: `ps-${sched.id}-${inst.label}`,
          label: `${amt} from ${name}`,
          sub: `${inst.label} · due today`,
          severity: 'today',
          kind: 'payment',
          target: 'Power',
          targetSub: 'payments',
        });
      } else if (dueIso <= weekFromNow) {
        items.push({
          id: `ps-${sched.id}-${inst.label}`,
          label: `${amt} from ${name}`,
          sub: `${inst.label} · due ${due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
          severity: 'week',
          kind: 'payment',
          target: 'Power',
          targetSub: 'payments',
        });
      }
    }
  }

  // ── Invoices — unpaid past due
  for (const inv of invoices) {
    if (inv.status === 'paid') continue;
    if (!inv.due_date) continue;
    const due = new Date(inv.due_date);
    const dueIso = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const name = inv.client_name || 'Client';
    const amt = `₹${fmtINR(parseInt(inv.amount) || 0)}`;
    if (dueIso < today0) {
      items.push({
        id: `inv-${inv.id}`,
        label: `Invoice unpaid · ${name}`,
        sub: `${amt} · overdue since ${due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        severity: 'overdue',
        kind: 'invoice',
        target: 'Power',
        targetSub: 'invoices',
      });
    } else if (dueIso.getTime() === today0.getTime()) {
      items.push({
        id: `inv-${inv.id}`,
        label: `Invoice due today · ${name}`,
        sub: amt,
        severity: 'today',
        kind: 'invoice',
        target: 'Power',
        targetSub: 'invoices',
      });
    }
  }

  // ── To-dos — past due and unchecked
  for (const todo of todos) {
    if (todo.done) continue;
    if (!todo.due_date) continue;
    const due = new Date(todo.due_date);
    const dueIso = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    if (dueIso < today0) {
      items.push({
        id: `todo-${todo.id}`,
        label: todo.title || 'Task',
        sub: `Past due · ${due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        severity: 'overdue',
        kind: 'todo',
        target: 'Power',
        targetSub: 'todos',
      });
    } else if (dueIso.getTime() === today0.getTime()) {
      items.push({
        id: `todo-${todo.id}`,
        label: todo.title || 'Task',
        sub: 'Due today',
        severity: 'today',
        kind: 'todo',
        target: 'Power',
        targetSub: 'todos',
      });
    }
  }

  // ── Bookings — unconfirmed that are approaching
  for (const b of bookings) {
    if (b.status !== 'pending' && b.status !== 'pending_confirmation') continue;
    if (!b.event_date) continue;
    const ev = new Date(b.event_date);
    const evIso = new Date(ev.getFullYear(), ev.getMonth(), ev.getDate());
    if (evIso <= weekFromNow && evIso >= today0) {
      items.push({
        id: `b-${b.id}`,
        label: `Unconfirmed · ${b.users?.name || b.client_name || 'Lead'}`,
        sub: `Event ${ev.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        severity: evIso.getTime() === today0.getTime() ? 'today' : 'week',
        kind: 'booking',
        target: 'Power',
        targetSub: 'calendar',
      });
    }
  }

  // Sort — overdue first, then today, then week
  const order = { overdue: 0, today: 1, week: 2 };
  items.sort((a, b) => order[a.severity] - order[b.severity]);

  const cap = expanded ? items.length : 6;
  const visible = items.slice(0, cap);
  const hiddenCount = items.length - visible.length;

  if (items.length === 0) {
    return (
      <div style={{
        background: C.champagne,
        border: `1px solid ${C.goldBorder}`,
        borderRadius: 18,
        padding: '18px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 18,
          background: C.goldSoft, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <CheckCircle size={18} color={C.goldDeep} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: 15,
            color: C.dark, fontWeight: 500,
          }}>You're all caught up ✨</div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: 11,
            color: C.muted, marginTop: 2,
          }}>Nothing overdue. Nothing urgent. Enjoy the calm.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: C.ivory, border: `1px solid ${C.border}`,
      borderRadius: 18, padding: '14px 16px 10px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div>
          <div style={{
            fontSize: 9, fontWeight: 600, letterSpacing: '2.5px',
            color: C.goldDeep, textTransform: 'uppercase' as const,
          }}>Needs Attention</div>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: 15,
            color: C.dark, fontWeight: 500, marginTop: 2,
          }}>
            {items.filter(i => i.severity === 'overdue').length > 0
              ? `${items.filter(i => i.severity === 'overdue').length} overdue · ${items.length} total`
              : `${items.length} item${items.length === 1 ? '' : 's'}`}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visible.map(item => {
          const rim = item.severity === 'overdue' ? '#E57373'
                    : item.severity === 'today' ? C.gold
                    : C.border;
          const badgeBg = item.severity === 'overdue' ? 'rgba(229,115,115,0.08)'
                       : item.severity === 'today' ? C.goldSoft
                       : C.pearl;
          const IconC: any = item.kind === 'payment' ? CreditCard
                          : item.kind === 'invoice' ? FileText
                          : item.kind === 'todo' ? CheckCircle
                          : Calendar;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (typeof window !== 'undefined' && item.targetSub) {
                  localStorage.setItem('tdw_pwa_open_sub', item.targetSub);
                }
                onJumpToTab && onJumpToTab(item.target);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10,
                background: badgeBg,
                border: `1px solid ${rim}`,
                cursor: 'pointer', fontFamily: 'inherit',
                textAlign: 'left' as const, width: '100%',
              }}
            >
              <IconC size={14} color={item.severity === 'overdue' ? '#C65757' : item.severity === 'today' ? C.goldDeep : C.muted} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: C.dark, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                  {item.sub}
                </div>
              </div>
              <ChevronRight size={13} color={C.light} />
            </button>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            width: '100%', padding: '8px 12px', marginTop: 8,
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 10, color: C.goldDeep, fontWeight: 600,
            letterSpacing: '1.5px', textTransform: 'uppercase' as const,
          }}
        >
          View all ({hiddenCount} more)
        </button>
      )}
    </div>
  );
}


// Month grid with dots for bookings / DND / events.
// Gold filled dot = confirmed booking. Gold ring = multiple bookings same day.
// Grey dot = DND (renamed from "blocked"). Pink dot = trials / other events.
// Hot Dates toggle overlays auspicious wedding dates (pink-tinted cells).
// Tap any day → detail panel shows what's on that day.
// ══════════════════════════════════════════════════════════════════════════

interface HotDate {
  id: string;
  date: string;
  tradition: string;
  region: string;
  note: string | null;
}

function CalendarPanel({ session, bookings, blockedDates, events, onOpenEvent, onOpenBlockDate, onRefresh }: {
  session: VendorSession;
  bookings: any[];
  blockedDates: any[];
  events: any[];
  onOpenEvent?: () => void;
  onOpenBlockDate?: () => void;
  onRefresh?: () => void;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [hotDatesOn, setHotDatesOn] = useState(false);
  const [hotDates, setHotDates] = useState<HotDate[]>([]);
  const [loadingHot, setLoadingHot] = useState(false);

  const year = cursor.getFullYear();
  const month = cursor.getMonth(); // 0-11
  const monthName = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Load hot dates for the current year when toggle flips on
  useEffect(() => {
    if (!hotDatesOn) return;
    let cancelled = false;
    setLoadingHot(true);
    fetch(`${API}/api/hot-dates?year=${year}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.success) setHotDates(d.data || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingHot(false); });
    return () => { cancelled = true; };
  }, [hotDatesOn, year]);

  // Build the 6-week grid (always 42 cells — fills prev/next month for alignment)
  const firstDayOfMonth = new Date(year, month, 1);
  const startWeekday = firstDayOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];
  // Prev month tail
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month, -i), inMonth: false });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  // Next month head
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }

  // Index everything by YYYY-MM-DD for fast lookup
  const iso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const bookingsByDay: Record<string, any[]> = {};
  for (const b of bookings) {
    if (b.status !== 'confirmed' || !b.event_date) continue;
    const k = iso(new Date(b.event_date));
    if (!bookingsByDay[k]) bookingsByDay[k] = [];
    bookingsByDay[k].push(b);
  }
  const blockedByDay: Record<string, any[]> = {};
  for (const bd of blockedDates) {
    if (!bd.blocked_date) continue;
    const k = iso(new Date(bd.blocked_date));
    if (!blockedByDay[k]) blockedByDay[k] = [];
    blockedByDay[k].push(bd);
  }
  const eventsByDay: Record<string, any[]> = {};
  for (const ev of events) {
    if (!ev.event_date) continue;
    const k = iso(new Date(ev.event_date));
    if (!eventsByDay[k]) eventsByDay[k] = [];
    eventsByDay[k].push(ev);
  }
  const hotDatesByDay: Record<string, HotDate> = {};
  for (const hd of hotDates) hotDatesByDay[hd.date] = hd;

  const todayIso = iso(today);
  const selectedData = selectedDay ? {
    bookings: bookingsByDay[selectedDay] || [],
    blocked: blockedByDay[selectedDay] || [],
    events: eventsByDay[selectedDay] || [],
    hot: hotDatesByDay[selectedDay] || null,
  } : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 400, color: C.dark, letterSpacing: '0.2px' }}>
            Calendar
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: C.muted, marginTop: 4, fontStyle: 'italic' }}>
            Your schedule at a glance.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => onOpenEvent && onOpenEvent()}
            style={{
              background: C.dark, color: C.gold, border: 'none',
              borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500,
              letterSpacing: '1.5px', textTransform: 'uppercase' as const,
            }}
          >
            <Plus size={12} /> Event
          </button>
          <button
            onClick={() => onOpenBlockDate && onOpenBlockDate()}
            style={{
              background: C.ivory, color: C.muted, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 500,
              letterSpacing: '1.5px', textTransform: 'uppercase' as const,
            }}
          >
            <Lock size={11} /> DND
          </button>
        </div>
      </div>

      {/* Hot Dates toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: hotDatesOn ? '#FCE8E8' : C.ivory,
        border: `1px solid ${hotDatesOn ? '#F5C5C5' : C.border}`,
        borderRadius: 12, padding: '10px 14px',
        transition: 'all 0.2s ease',
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.dark, fontFamily: 'DM Sans, sans-serif' }}>
            Hot Dates
          </div>
          <div style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', marginTop: 2 }}>
            Auspicious wedding days — don't underprice these.
          </div>
        </div>
        <button
          onClick={() => setHotDatesOn(!hotDatesOn)}
          style={{
            width: 40, height: 22, borderRadius: 11,
            background: hotDatesOn ? '#E57373' : C.border,
            border: 'none', cursor: 'pointer', padding: 0,
            position: 'relative' as const, transition: 'all 0.2s ease',
          }}
        >
          <div style={{
            position: 'absolute' as const,
            top: 2, left: hotDatesOn ? 20 : 2,
            width: 18, height: 18, borderRadius: 9,
            background: '#fff',
            transition: 'all 0.2s ease',
          }} />
        </button>
      </div>

      {/* Legend bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap' as const, gap: '6px 14px',
        padding: '10px 14px', background: C.pearl,
        borderRadius: 10, border: `1px solid ${C.borderSoft}`,
        fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif',
      }}>
        <LegendDot kind="booking" />
        <LegendDot kind="multiple" />
        <LegendDot kind="dnd" />
        <LegendDot kind="event" />
        {hotDatesOn && <LegendDot kind="hot" />}
      </div>

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
        <button
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, color: C.muted }}
          aria-label="Previous month"
        >
          <ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} />
        </button>
        <div style={{
          fontFamily: "'Playfair Display', serif", fontSize: 16,
          color: C.dark, fontWeight: 500, letterSpacing: '0.5px',
        }}>
          {monthName}
        </div>
        <button
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, color: C.muted }}
          aria-label="Next month"
        >
          <ChevronDown size={18} style={{ transform: 'rotate(-90deg)' }} />
        </button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} style={{
            textAlign: 'center' as const, fontSize: 10,
            color: C.light, fontFamily: 'DM Sans, sans-serif',
            letterSpacing: '1.5px', padding: '4px 0',
          }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((cell, i) => {
          const key = iso(cell.date);
          const dayNum = cell.date.getDate();
          const isToday = key === todayIso;
          const isSelected = key === selectedDay;
          const bs = bookingsByDay[key] || [];
          const bds = blockedByDay[key] || [];
          const evs = eventsByDay[key] || [];
          const hot = hotDatesByDay[key];
          const isHot = hotDatesOn && !!hot;

          const bg = isSelected
            ? C.dark
            : isHot
              ? '#FCE8E8'
              : isToday
                ? C.goldSoft
                : C.ivory;
          const borderColor = isSelected
            ? C.dark
            : isToday
              ? C.goldBorder
              : C.border;
          const dayColor = isSelected
            ? C.gold
            : cell.inMonth
              ? C.dark
              : C.light;

          return (
            <button
              key={i}
              onClick={() => setSelectedDay(isSelected ? null : key)}
              style={{
                aspectRatio: '1',
                background: bg,
                border: `1px solid ${borderColor}`,
                borderRadius: 8, padding: '4px 2px 2px',
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', flexDirection: 'column' as const,
                alignItems: 'center', justifyContent: 'space-between',
                opacity: cell.inMonth ? 1 : 0.5,
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{
                fontSize: 12, fontWeight: isToday ? 600 : 400,
                color: dayColor, fontFamily: 'DM Sans, sans-serif',
              }}>{dayNum}</span>
              <div style={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' as const, justifyContent: 'center', minHeight: 8 }}>
                {/* Bookings: filled dot if 1, ring if multiple */}
                {bs.length === 1 && <Dot color={C.gold} filled />}
                {bs.length > 1 && <Dot color={C.gold} ring />}
                {/* DND */}
                {bds.length > 0 && <Dot color={isSelected ? C.light : C.muted} filled />}
                {/* Events (trials etc) */}
                {evs.length > 0 && <Dot color="#E5A5A5" filled />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedData && (
        <SelectedDayPanel
          dateIso={selectedDay!}
          data={selectedData}
          onClose={() => setSelectedDay(null)}
          onRefresh={onRefresh}
        />
      )}

      {loadingHot && (
        <div style={{ fontSize: 10, color: C.muted, textAlign: 'center' as const, fontStyle: 'italic' }}>
          Loading hot dates…
        </div>
      )}
    </div>
  );
}

function Dot({ color, filled, ring }: { color: string; filled?: boolean; ring?: boolean }) {
  return (
    <span style={{
      width: 5, height: 5, borderRadius: '50%',
      background: filled ? color : 'transparent',
      border: ring ? `1.5px solid ${color}` : 'none',
      display: 'inline-block',
    }} />
  );
}

function LegendDot({ kind }: { kind: 'booking' | 'multiple' | 'dnd' | 'event' | 'hot' }) {
  const config = {
    booking:  { color: C.gold,   label: 'Booking',         filled: true  },
    multiple: { color: C.gold,   label: 'Multiple',        ring: true    },
    dnd:      { color: C.muted,  label: 'DND',             filled: true  },
    event:    { color: '#E5A5A5', label: 'Trial / Event',  filled: true  },
    hot:      { color: '#E57373', label: 'Hot date',       filled: true  },
  }[kind] as any;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <Dot color={config.color} filled={config.filled} ring={config.ring} />
      <span>{config.label}</span>
    </span>
  );
}

function SelectedDayPanel({ dateIso, data, onClose, onRefresh }: {
  dateIso: string;
  data: { bookings: any[]; blocked: any[]; events: any[]; hot: HotDate | null };
  onClose: () => void;
  onRefresh?: () => void;
}) {
  const d = new Date(dateIso + 'T00:00:00');
  const pretty = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const nothingOnDay = data.bookings.length === 0 && data.blocked.length === 0 && data.events.length === 0;

  const handleUnblock = async (id: string) => {
    if (!confirm('Unblock this date?')) return;
    try {
      const r = await fetch(`${API}/api/availability/${id}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.success && onRefresh) onRefresh();
    } catch {}
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      const r = await fetch(`${API}/api/events/${id}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.success && onRefresh) onRefresh();
    } catch {}
  };

  return (
    <div style={{
      background: C.ivory, borderRadius: 14,
      border: `1px solid ${C.border}`,
      padding: '16px 16px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: C.dark, fontWeight: 500 }}>
            {pretty}
          </div>
          {data.hot && (
            <div style={{ fontSize: 10, color: '#B91C1C', marginTop: 2, fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const }}>
              ● Hot date{data.hot.note ? ` · ${data.hot.note}` : ''}
            </div>
          )}
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: C.muted, padding: 4,
        }}>
          <X size={16} />
        </button>
      </div>

      {nothingOnDay ? (
        <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic', padding: '6px 0' }}>
          Nothing scheduled.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.bookings.map((b, i) => (
            <div key={'b-' + i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10,
              background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
            }}>
              <Dot color={C.gold} filled />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.dark }}>
                  {b.users?.name || b.client_name || 'Booking'}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  {b.event_type || 'Event'}{b.event_time ? ` · ${b.event_time}` : ''}{b.venue ? ` · ${b.venue}` : ''}
                </div>
              </div>
              {b.amount && (
                <div style={{ fontSize: 12, color: C.goldDeep, fontWeight: 600 }}>
                  ₹{fmtINR(b.amount)}
                </div>
              )}
            </div>
          ))}

          {data.events.map((ev, i) => (
            <div key={'e-' + i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10,
              background: '#FEF5F5', border: '1px solid #F5D5D5',
            }}>
              <Dot color="#E5A5A5" filled />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.dark }}>
                  {ev.title || 'Event'}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  {ev.event_type || 'Trial'}{ev.event_time ? ` · ${ev.event_time}` : ''}
                </div>
              </div>
              <button onClick={() => handleDeleteEvent(ev.id)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: C.muted, padding: 4,
              }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {data.blocked.map((bd, i) => (
            <div key={'bd-' + i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10,
              background: C.pearl, border: `1px solid ${C.border}`,
            }}>
              <Dot color={C.muted} filled />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.dark }}>DND</div>
                {bd.reason && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{bd.reason}</div>
                )}
              </div>
              <button onClick={() => handleUnblock(bd.id)} style={{
                background: 'transparent', border: `1px solid ${C.border}`,
                borderRadius: 6, padding: '4px 10px', fontSize: 10, color: C.muted,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// List + add assistants per vendor. Per-event assignment comes in 9C.
// Works for all tiers; usage caps come with pricing tier.
// ══════════════════════════════════════════════════════════════════════════

interface Assistant {
  id: string;
  vendor_id: string;
  name: string;
  phone: string;
  role: string | null;
  notes: string | null;
  invited_at: string | null;
  created_at: string;
}

function AssistantsPanel({ session }: { session: VendorSession }) {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Assistant | null>(null);

  const load = async () => {
    if (!session?.vendorId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/vendor/assistants/${session.vendorId}`);
      const d = await res.json();
      if (d.success) setAssistants(d.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [session?.vendorId]);

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this assistant? This will also unassign them from any events.')) return;
    try {
      const res = await fetch(`${API}/api/vendor/assistants/${id}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.success) setAssistants(prev => prev.filter(a => a.id !== id));
    } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 400, color: C.dark, letterSpacing: '0.2px' }}>
            Your Team
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: C.muted, marginTop: 4, fontStyle: 'italic' }}>
            Assistants and freelancers you work with.
          </div>
        </div>
        <button
          onClick={() => { setEditing(null); setShowAdd(true); }}
          style={{
            background: C.dark, color: C.gold,
            border: 'none', borderRadius: 10,
            padding: '10px 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 11, fontWeight: 500, letterSpacing: '1.5px',
            textTransform: 'uppercase' as const,
            flexShrink: 0,
          }}
        >
          <Plus size={13} /> Add
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' as const, color: C.muted, fontSize: 13 }}>
          Loading…
        </div>
      ) : assistants.length === 0 ? (
        <div style={{
          background: C.ivory, borderRadius: 18,
          border: `1px solid ${C.border}`,
          padding: '40px 24px', textAlign: 'center' as const,
        }}>
          <div style={{
            width: 54, height: 54, borderRadius: 16,
            background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <Users size={22} color={C.gold} />
          </div>
          <div style={{ fontSize: 16, color: C.dark, fontWeight: 500, fontFamily: "'Playfair Display', serif", marginBottom: 8 }}>
            No assistants yet
          </div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, maxWidth: 280, margin: '0 auto 20px' }}>
            Add the freelancers and helpers you work with on events. They'll get a WhatsApp invite, and you can assign them to specific weddings.
          </div>
          <button
            onClick={() => { setEditing(null); setShowAdd(true); }}
            style={{
              background: C.gold, color: C.dark, border: 'none',
              borderRadius: 10, padding: '10px 18px', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600,
              letterSpacing: '0.5px',
            }}
          >
            Add your first assistant
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {assistants.map(a => (
            <div
              key={a.id}
              style={{
                background: C.ivory, borderRadius: 14,
                border: `1px solid ${C.border}`,
                padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 20,
                background: C.goldSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.goldDeep, fontWeight: 600,
                fontFamily: "'Playfair Display', serif", fontSize: 16,
                flexShrink: 0,
              }}>
                {(a.name || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: C.dark, fontWeight: 500, fontFamily: 'DM Sans, sans-serif' }}>
                  {a.name}
                </div>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', marginTop: 2 }}>
                  {a.role ? a.role + ' · ' : ''}{a.phone}
                </div>
              </div>
              <button
                onClick={() => { setEditing(a); setShowAdd(true); }}
                style={{
                  background: 'transparent', border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: '6px 10px',
                  cursor: 'pointer', fontSize: 11,
                  color: C.muted, fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(a.id)}
                style={{
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', padding: 4,
                  color: C.muted,
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Helper card — explains Model B per-event logic */}
      {assistants.length > 0 && (
        <div style={{
          background: C.champagne, borderRadius: 14,
          border: `1px solid ${C.goldBorder}`,
          padding: '14px 16px',
          marginTop: 8,
        }}>
          <div style={{ fontSize: 10, color: C.goldDeep, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, marginBottom: 6 }}>
            How this works
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
            Assistants are recorded here. You'll be able to assign them to specific events (and their chats will auto-archive after the event). That's coming in the next update.
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {showAdd && (
        <AssistantSheet
          session={session}
          initial={editing}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSaved={(saved, isNew) => {
            if (isNew) setAssistants(prev => [saved, ...prev]);
            else setAssistants(prev => prev.map(a => a.id === saved.id ? saved : a));
            setShowAdd(false); setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function AssistantSheet({ session, initial, onClose, onSaved }: {
  session: VendorSession;
  initial: Assistant | null;
  onClose: () => void;
  onSaved: (a: Assistant, isNew: boolean) => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [phone, setPhone] = useState(initial ? initial.phone.replace(/^\+91/, '') : '');
  const [role, setRole] = useState(initial?.role || '');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [sendInvite, setSendInvite] = useState(!initial); // default ON for new
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!initial;

  const handleSave = async () => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!name.trim()) { setError('Name is required'); return; }
    if (cleanPhone.length !== 10) { setError('Enter a valid 10-digit phone'); return; }

    setSaving(true); setError('');
    try {
      if (isEdit) {
        const res = await fetch(`${API}/api/vendor/assistants/${initial.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), phone: cleanPhone, role: role.trim() || null, notes: notes.trim() || null }),
        });
        const d = await res.json();
        if (!d.success) { setError(d.error || 'Could not save'); setSaving(false); return; }
        onSaved(d.data, false);
      } else {
        const res = await fetch(`${API}/api/vendor/assistants`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendor_id: session.vendorId,
            name: name.trim(),
            phone: cleanPhone,
            role: role.trim() || null,
            notes: notes.trim() || null,
            send_invite: sendInvite,
          }),
        });
        const d = await res.json();
        if (!d.success) { setError(d.error || 'Could not save'); setSaving(false); return; }
        onSaved(d.data, true);
      }
    } catch {
      setError('Network error. Try again.');
      setSaving(false);
    }
  };

  return (
    <SheetOverlay onClose={onClose}>
      <SheetHeader
        eyebrow={isEdit ? 'Edit' : 'Add'}
        title={isEdit ? 'Edit Assistant' : 'Add Assistant'}
        onClose={onClose}
      />

      <FieldLabel>Name</FieldLabel>
      <input
        type="text" value={name} onChange={e => { setName(e.target.value); setError(''); }}
        placeholder="e.g. Priya Sharma"
        style={{
          width: '100%', boxSizing: 'border-box' as const,
          padding: '12px 14px', borderRadius: 10,
          border: `1px solid ${C.border}`, background: C.pearl,
          fontSize: 14, fontFamily: 'inherit', marginBottom: 14,
          outline: 'none',
        }}
      />

      <FieldLabel>Phone</FieldLabel>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          fontSize: 14, color: C.muted,
        }}>+91</span>
        <input
          type="tel" value={phone} onChange={e => { setPhone(e.target.value); setError(''); }}
          placeholder="98765 43210"
          autoComplete="tel"
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            padding: '12px 14px 12px 46px', borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.pearl,
            fontSize: 14, fontFamily: 'inherit', outline: 'none',
          }}
        />
      </div>

      <FieldLabel>Role (optional)</FieldLabel>
      <input
        type="text" value={role} onChange={e => setRole(e.target.value)}
        placeholder="e.g. Makeup assistant, Second shooter, Coordinator"
        style={{
          width: '100%', boxSizing: 'border-box' as const,
          padding: '12px 14px', borderRadius: 10,
          border: `1px solid ${C.border}`, background: C.pearl,
          fontSize: 14, fontFamily: 'inherit', marginBottom: 14,
          outline: 'none',
        }}
      />

      <FieldLabel>Notes (optional)</FieldLabel>
      <textarea
        value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Anything important about working with them"
        rows={2}
        style={{
          width: '100%', boxSizing: 'border-box' as const,
          padding: '12px 14px', borderRadius: 10,
          border: `1px solid ${C.border}`, background: C.pearl,
          fontSize: 14, fontFamily: 'inherit', marginBottom: 14,
          outline: 'none', resize: 'vertical' as const,
        }}
      />

      {!isEdit && (
        <label style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 10,
          background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
          cursor: 'pointer', marginBottom: 14,
        }}>
          <input
            type="checkbox"
            checked={sendInvite}
            onChange={e => setSendInvite(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: C.gold }}
          />
          <span style={{ fontSize: 12, color: C.dark, lineHeight: 1.4 }}>
            Send a WhatsApp invite introducing them to TDW
          </span>
        </label>
      )}

      {error && (
        <div style={{
          padding: '10px 12px', borderRadius: 8,
          background: C.redSoft, border: `1px solid ${C.redBorder}`,
          color: C.red, fontSize: 12, marginBottom: 12,
        }}>{error}</div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%', padding: 14, borderRadius: 10,
          background: saving ? C.pearl : C.dark, color: C.gold,
          border: 'none', cursor: saving ? 'default' : 'pointer',
          fontSize: 12, fontWeight: 500, letterSpacing: '2px',
          textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Add assistant')}
      </button>
    </SheetOverlay>
  );
}

function BottomNav({ active, pending, onChange }: { active: Tab; pending: number; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'Overview', label: 'Overview', icon: Grid },
    { id: 'Clients',  label: 'Clients',  icon: Users },
    { id: 'Teams',    label: 'Teams',    icon: Users },
    { id: 'Power',    label: 'Power',    icon: Zap },
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
        const showBadge = t.id === 'Power' && pending > 0;
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
// MODE TOGGLE (Business / Discovery)
// Top-strip segmented control matching couple-side Plan/Discover pattern.
// ══════════════════════════════════════════════════════════════════════════

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div style={{
      display: 'flex', background: C.cream,
      borderRadius: 20, border: `1px solid ${C.border}`, padding: 3,
    }}>
      {(['Business', 'Discovery'] as Mode[]).map(m => (
        <button key={m} onClick={() => onChange(m)} style={{
          padding: '5px 16px', borderRadius: 16, border: 'none',
          background: mode === m ? C.dark : 'transparent',
          color: mode === m ? C.gold : C.muted,
          fontSize: 12, fontWeight: mode === m ? 500 : 400,
          fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
          letterSpacing: '0.3px', transition: 'all 0.15s',
        }}>
          {m}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// DISCOVERY COMING SOON
// ══════════════════════════════════════════════════════════════════════════

function DiscoveryComingSoon({ session }: { session: VendorSession }) {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', textAlign: 'center' as const,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 28,
        background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <Globe size={22} color={C.gold} />
      </div>
      <p style={{
        margin: '0 0 4px', fontSize: 10, color: C.goldDeep, fontWeight: 500,
        letterSpacing: '3px', textTransform: 'uppercase' as const,
      }}>Coming soon</p>
      <h2 style={{
        fontFamily: 'Playfair Display, serif', fontSize: 26,
        color: C.dark, margin: '0 0 12px', fontWeight: 400,
      }}>Your storefront.</h2>
      <p style={{
        fontSize: 13, color: C.muted, lineHeight: '20px',
        fontWeight: 300, maxWidth: 320, margin: 0,
      }}>
        Get discovered by India's most discerning brides. Boost visibility, run offers, manage your profile — all coming to your pocket soon.
      </p>
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
  { id: 'expenses',  label: 'Expenses',   icon: TrendingDown,  minTier: 'signature', href: '/vendor/mobile?sub=expenses',   desc: 'Track every expense. See where your money goes. P&L view.' },
  { id: 'tax',       label: 'Tax & TDS',  icon: Percent,       minTier: 'signature', href: '/vendor/mobile?sub=tax',        desc: 'GST invoices. Quarterly TDS summary. CA-ready exports.' },
  { id: 'broadcast', label: 'Broadcast',  icon: Send,          minTier: 'signature', href: '/vendor/mobile?sub=whatsapp',   desc: 'Send WhatsApp updates to client groups. Templates included.' },
  { id: 'analytics', label: 'Analytics',  icon: BarChart2,     minTier: 'signature', href: '/vendor/mobile?sub=analytics',  desc: 'Revenue trends. Lead conversion. What\'s working.' },
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
              href="/vendor/mobile/profile/edit"
              target="_blank"
              rel="noreferrer"
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
  vendorId, onClose, onSaved, onClientCreated, onEventCreated,
}: {
  vendorId: string;
  onClose: () => void;
  onSaved: (blocked: any) => void;
  onClientCreated?: (client: any) => void;
  onEventCreated?: (event: any) => void;
}) {
  const [blockDate, setBlockDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  // Optional: link this blocked date to a client/event so it doubles as a calendar event
  const [linkClient, setLinkClient] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSave = !!blockDate && !submitting;

  const handleSave = async () => {
    if (!canSave) return;
    setError('');
    setSubmitting(true);
    try {
      // Step 1: block the availability date
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
      if (!d.success || !d.data) {
        setError(d.error || 'Could not block date');
        setSubmitting(false);
        return;
      }
      onSaved(d.data);

      // Step 2 (optional): if vendor linked a client, auto-create the client + a calendar event
      if (linkClient && clientName.trim()) {
        let createdClientId: string | null = null;
        if (clientPhone.trim()) {
          try {
            const cr = await fetch(API + '/api/vendor-clients', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                vendor_id: vendorId,
                name: clientName.trim(),
                phone: clientPhone.trim(),
              }),
            });
            const cd = await cr.json();
            if (cd.success && cd.data) {
              createdClientId = cd.data.id;
              if (onClientCreated) onClientCreated(cd.data);
            }
          } catch { /* non-fatal — date is already blocked */ }
        }

        try {
          const er = await fetch(API + '/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vendor_id: vendorId,
              title: reason.trim() || `${clientName.trim()} — Booked`,
              event_date: blockDate,
              client_id: createdClientId,
              client_name: clientName.trim(),
              type: 'booking',
            }),
          });
          const ed = await er.json();
          if (ed.success && ed.data && onEventCreated) onEventCreated(ed.data);
        } catch { /* non-fatal */ }
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
        Couples won't be able to request this date. Optionally link a client so it shows on your calendar.
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

      <FieldLabel>Reason / Title (optional)</FieldLabel>
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Pooja Wedding · Family event · Travel"
        style={{
          width: '100%',
          background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '13px 14px',
          fontSize: '13px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          marginBottom: '14px', boxSizing: 'border-box',
        }}
      />

      <button
        onClick={() => setLinkClient(v => !v)}
        style={{
          width: '100%', background: linkClient ? C.goldSoft : 'transparent',
          border: `1px solid ${linkClient ? C.goldBorder : C.border}`,
          borderRadius: '12px', padding: '11px 14px',
          fontSize: '12px', color: linkClient ? C.goldDeep : C.muted,
          fontFamily: 'DM Sans, sans-serif',
          textAlign: 'left', cursor: 'pointer',
          marginBottom: '10px',
        }}
      >
        {linkClient ? '✓ Linked to a client (will create calendar event)' : '+ Link to a client (optional)'}
      </button>

      {linkClient && (
        <div style={{ marginBottom: '14px' }}>
          <FieldLabel>Client name</FieldLabel>
          <input
            type="text" value={clientName} onChange={e => setClientName(e.target.value)}
            placeholder="e.g. Pooja Sharma"
            style={{
              width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
              borderRadius: '12px', padding: '12px 14px', fontSize: '13px', color: C.dark,
              fontFamily: 'DM Sans, sans-serif', outline: 'none', marginBottom: '10px', boxSizing: 'border-box',
            }}
          />
          <FieldLabel>Client phone (optional)</FieldLabel>
          <input
            type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)}
            placeholder="e.g. 9876543210"
            style={{
              width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
              borderRadius: '12px', padding: '12px 14px', fontSize: '13px', color: C.dark,
              fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: '10px', color: C.light, marginTop: '6px', fontStyle: 'italic' }}>
            If phone is provided, a new client will be added to your CRM.
          </div>
        </div>
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
        >{submitting ? 'Blocking…' : 'Block Date'}</button>
      </div>
    </SheetOverlay>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// QUICK REMINDER SHEET — list of unpaid items with one-tap WhatsApp
// ══════════════════════════════════════════════════════════════════════════

function QuickReminderSheet({
  invoices, paymentSchedules, clients, events, bookings, vendorName, onClose,
}: {
  invoices: any[]; paymentSchedules: any[];
  clients: any[]; events: any[]; bookings: any[];
  vendorName: string; onClose: () => void;
}) {
  // Branched flow: pick a category first, then pick a recipient + tap to send
  type Mode = 'menu' | 'payment' | 'event' | 'custom';
  const [mode, setMode] = useState<Mode>('menu');
  const [customClientId, setCustomClientId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');

  // ── PAYMENT items ──────────────────────────────────────────
  type PaymentItem = {
    id: string; client_name: string; client_phone: string;
    amount: number; label: string; is_overdue: boolean;
  };
  const paymentItems: PaymentItem[] = [];
  for (const inv of invoices) {
    if (!inv.client_phone) continue;
    paymentItems.push({
      id: `inv-${inv.id}`,
      client_name: inv.client_name || 'Client',
      client_phone: inv.client_phone,
      amount: parseInt(inv.amount) || 0,
      label: inv.invoice_number || 'Invoice',
      is_overdue: false,
    });
  }
  for (const sched of paymentSchedules) {
    const overdueInst = (sched.instalments || []).filter((i: any) => !i.paid && i.due_date && new Date(i.due_date) < new Date());
    if (overdueInst.length === 0 || !sched.client_phone) continue;
    paymentItems.push({
      id: `sched-${sched.id}`,
      client_name: sched.client_name || 'Client',
      client_phone: sched.client_phone,
      amount: overdueInst.reduce((s: number, i: any) => s + (parseInt(i.amount) || 0), 0),
      label: `${overdueInst.length} overdue instalment${overdueInst.length > 1 ? 's' : ''}`,
      is_overdue: true,
    });
  }

  const sendPaymentReminder = (item: PaymentItem) => {
    const cleanPhone = String(item.client_phone).replace(/\D/g, '');
    const amountFmt = item.amount.toLocaleString('en-IN');
    const msg = item.is_overdue
      ? `Hi ${item.client_name}! Gentle reminder — ${item.label} totalling ₹${amountFmt} is pending. Please clear at your earliest convenience. — ${vendorName}`
      : `Hi ${item.client_name}! Gentle reminder regarding ${item.label} for ₹${amountFmt}. Please let me know once done! — ${vendorName}`;
    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ── EVENT items: upcoming events from vendor_calendar_events + booked events ──
  type EventItem = {
    id: string; client_name: string; client_phone: string;
    event_title: string; event_date: string;
  };
  const eventItems: EventItem[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // From vendor_calendar_events (Turn 7b)
  for (const ev of events) {
    if (!ev.event_date || new Date(ev.event_date) < today) continue;
    const matchedClient = clients.find((c: any) => c.id === ev.client_id);
    const phone = matchedClient?.phone || '';
    if (!phone) continue;
    eventItems.push({
      id: `ev-${ev.id}`,
      client_name: ev.client_name || matchedClient?.name || 'Client',
      client_phone: phone,
      event_title: ev.title || 'Event',
      event_date: ev.event_date,
    });
  }
  // From bookings (existing data)
  for (const b of bookings) {
    if (!b.event_date || new Date(b.event_date) < today) continue;
    if (!b.client_phone) continue;
    eventItems.push({
      id: `bk-${b.id}`,
      client_name: b.client_name || 'Client',
      client_phone: b.client_phone,
      event_title: b.event_type || 'Wedding event',
      event_date: b.event_date,
    });
  }
  eventItems.sort((a, b) => a.event_date.localeCompare(b.event_date));

  const [eventTemplateOpen, setEventTemplateOpen] = useState<string | null>(null);
  const eventTemplates = ['Final Briefing', 'Dress / Outfit Trial', 'Venue Visit', 'Custom'];
  const sendEventReminder = (item: EventItem, template: string) => {
    const cleanPhone = String(item.client_phone).replace(/\D/g, '');
    const dateFmt = new Date(item.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    let msg = '';
    if (template === 'Final Briefing') {
      msg = `Hi ${item.client_name}! Just a reminder — your ${item.event_title} is on ${dateFmt}. Let's do a final briefing this week to align on everything. — ${vendorName}`;
    } else if (template === 'Dress / Outfit Trial') {
      msg = `Hi ${item.client_name}! Reminder — for your ${item.event_title} on ${dateFmt}, let's schedule the outfit trial soon. — ${vendorName}`;
    } else if (template === 'Venue Visit') {
      msg = `Hi ${item.client_name}! Reminder — your ${item.event_title} is on ${dateFmt}. Shall we plan a venue visit before the event? — ${vendorName}`;
    } else {
      msg = `Hi ${item.client_name}! Reminder regarding your ${item.event_title} on ${dateFmt}. Looking forward to it! — ${vendorName}`;
    }
    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    setEventTemplateOpen(null);
  };

  // ── CUSTOM ──
  const sendCustom = () => {
    const c = clients.find((x: any) => x.id === customClientId);
    if (!c || !c.phone || !customMessage.trim()) return;
    const cleanPhone = String(c.phone).replace(/\D/g, '');
    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(customMessage.trim())}`, '_blank');
  };

  return (
    <SheetOverlay onClose={onClose}>
      <SheetHeader
        eyebrow="Quick Action"
        title={mode === 'menu' ? 'Send a Reminder' :
               mode === 'payment' ? 'Payment Reminder' :
               mode === 'event' ? 'Event Reminder' : 'Custom Reminder'}
        onClose={onClose}
      />

      {mode === 'menu' && (
        <>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px', color: C.muted,
            marginBottom: '14px', fontStyle: 'italic',
          }}>
            What kind of reminder would you like to send?
          </div>
          {[
            { key: 'payment' as Mode, label: 'Payment Reminder', desc: 'Unpaid invoices · overdue instalments', icon: CreditCard },
            { key: 'event' as Mode, label: 'Event Reminder', desc: 'Trials · briefings · venue visits', icon: Calendar },
            { key: 'custom' as Mode, label: 'Custom Reminder', desc: 'Pick a client · write your own', icon: Edit2 },
          ].map(opt => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                onClick={() => setMode(opt.key)}
                style={{
                  width: '100%', background: C.pearl, border: `1px solid ${C.border}`,
                  borderRadius: '14px', padding: '16px',
                  display: 'flex', alignItems: 'center', gap: '14px',
                  textAlign: 'left', cursor: 'pointer', marginBottom: '10px',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={16} color={C.goldDeep} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', color: C.dark, fontWeight: 500 }}>{opt.label}</div>
                  <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{opt.desc}</div>
                </div>
                <ChevronRight size={16} color={C.light} />
              </button>
            );
          })}
        </>
      )}

      {mode === 'payment' && (
        <>
          {paymentItems.length === 0 ? (
            <div style={{
              background: C.greenSoft, border: `1px solid rgba(76,175,80,0.22)`,
              borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '14px',
            }}>
              <CheckCircle size={28} color={C.green} />
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: C.dark, fontWeight: 400, marginTop: '10px' }}>All clear.</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: C.muted, marginTop: '4px' }}>No outstanding invoices or overdue payments.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {paymentItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => sendPaymentReminder(item)}
                  style={{
                    background: item.is_overdue ? C.redSoft : C.pearl,
                    border: `1px solid ${item.is_overdue ? C.redBorder : C.border}`,
                    borderRadius: '12px', padding: '14px',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: C.dark, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.client_name}</div>
                    <div style={{ fontSize: '11px', color: item.is_overdue ? C.red : C.muted, marginTop: '2px' }}>{item.label}{item.is_overdue ? ' · Overdue' : ''}</div>
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', color: C.dark }}>₹{item.amount.toLocaleString('en-IN')}</div>
                  <div style={{ background: '#25D366', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MessageCircle size={14} color="#FFFFFF" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {mode === 'event' && (
        <>
          {eventItems.length === 0 ? (
            <div style={{
              background: C.pearl, border: `1px solid ${C.border}`,
              borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '14px',
            }}>
              <Calendar size={28} color={C.muted} />
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: C.dark, fontWeight: 400, marginTop: '10px' }}>No upcoming events.</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: C.muted, marginTop: '4px' }}>Add events from your Calendar tab to send reminders.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {eventItems.map(item => (
                <div key={item.id}>
                  <button
                    onClick={() => setEventTemplateOpen(eventTemplateOpen === item.id ? null : item.id)}
                    style={{
                      width: '100%', background: C.pearl, border: `1px solid ${C.border}`,
                      borderRadius: '12px', padding: '14px',
                      display: 'flex', alignItems: 'center', gap: '12px',
                      textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: C.dark, fontWeight: 500 }}>{item.client_name}</div>
                      <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{item.event_title} · {new Date(item.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                    </div>
                    <ChevronDown size={14} color={C.light} style={{ transform: eventTemplateOpen === item.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>
                  {eventTemplateOpen === item.id && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', marginBottom: '8px', paddingLeft: '8px' }}>
                      {eventTemplates.map(tpl => (
                        <button
                          key={tpl}
                          onClick={() => sendEventReminder(item, tpl)}
                          style={{
                            background: C.ivory, border: `1px solid ${C.border}`,
                            borderRadius: '10px', padding: '10px 12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: C.dark,
                          }}
                        >
                          <span>{tpl}</span>
                          <div style={{ background: '#25D366', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MessageCircle size={11} color="#FFFFFF" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {mode === 'custom' && (
        <>
          <FieldLabel>Client</FieldLabel>
          <select
            value={customClientId}
            onChange={e => setCustomClientId(e.target.value)}
            style={{
              width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
              borderRadius: '12px', padding: '12px 14px', fontSize: '13px', color: C.dark,
              fontFamily: 'DM Sans, sans-serif', outline: 'none', marginBottom: '12px', boxSizing: 'border-box',
            }}
          >
            <option value="">Pick a client…</option>
            {clients.filter((c: any) => c.phone).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>
            ))}
          </select>

          <FieldLabel>Your message</FieldLabel>
          <textarea
            value={customMessage}
            onChange={e => setCustomMessage(e.target.value)}
            placeholder="Write what you want to say…"
            rows={5}
            style={{
              width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
              borderRadius: '12px', padding: '12px 14px', fontSize: '13px', color: C.dark,
              fontFamily: 'DM Sans, sans-serif', outline: 'none', marginBottom: '14px',
              boxSizing: 'border-box', resize: 'vertical',
            }}
          />

          <button
            onClick={sendCustom}
            disabled={!customClientId || !customMessage.trim()}
            style={{
              width: '100%',
              background: customClientId && customMessage.trim() ? '#25D366' : C.border,
              color: customClientId && customMessage.trim() ? C.ivory : C.light,
              border: 'none', borderRadius: '12px', padding: '14px',
              fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase',
              cursor: customClientId && customMessage.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'DM Sans, sans-serif', marginBottom: '10px',
            }}
          >
            Send via WhatsApp
          </button>
        </>
      )}

      <button
        onClick={() => mode === 'menu' ? onClose() : setMode('menu')}
        style={{
          width: '100%',
          background: 'transparent', color: C.muted,
          border: `1px solid ${C.border}`, borderRadius: '12px',
          padding: '13px', fontSize: '11px', fontWeight: 500,
          letterSpacing: '1.5px', textTransform: 'uppercase',
          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
        }}
      >{mode === 'menu' ? 'Done' : '← Back'}</button>
    </SheetOverlay>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// QUICK TO-DO SHEET (Turn 7b) — inline to-do creation
// ══════════════════════════════════════════════════════════════════════════

function QuickTodoSheet({
  vendorId, onClose, onSaved,
}: {
  vendorId: string; onClose: () => void; onSaved: (todo: any) => void;
}) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'med' | 'high'>('med');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSave = !!title.trim() && !submitting;

  const handleSave = async () => {
    if (!canSave) return;
    setError(''); setSubmitting(true);
    try {
      const r = await fetch(API + '/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          title: title.trim(),
          due_date: dueDate || null,
          priority,
          done: false,
        }),
      });
      const d = await r.json();
      if (d.success && d.data) onSaved(d.data);
      else setError(d.error || 'Could not create to-do');
    } catch {
      setError('Network error. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <SheetOverlay onClose={onClose}>
      <SheetHeader eyebrow="Quick Action" title="Add a To-Do" onClose={onClose} />

      <FieldLabel>What needs doing?</FieldLabel>
      <input
        type="text" value={title} onChange={e => setTitle(e.target.value)}
        placeholder="e.g. Confirm Saturday's venue"
        autoFocus
        style={{
          width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '13px 14px', fontSize: '14px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          marginBottom: '14px', boxSizing: 'border-box',
        }}
      />

      <FieldLabel>Due date (optional)</FieldLabel>
      <input
        type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
        style={{
          width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '13px 14px', fontSize: '14px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          marginBottom: '14px', boxSizing: 'border-box',
        }}
      />

      <FieldLabel>Priority</FieldLabel>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        {(['low', 'med', 'high'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPriority(p)}
            style={{
              flex: 1,
              background: priority === p ? (p === 'high' ? C.redSoft : p === 'med' ? C.goldSoft : C.pearl) : C.ivory,
              color: priority === p ? (p === 'high' ? C.red : p === 'med' ? C.goldDeep : C.dark) : C.muted,
              border: `1px solid ${priority === p ? (p === 'high' ? C.redBorder : p === 'med' ? C.goldBorder : C.border) : C.border}`,
              borderRadius: '10px', padding: '10px',
              fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}
          >{p === 'med' ? 'Medium' : p}</button>
        ))}
      </div>

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
            flex: 1, background: 'transparent', color: C.muted,
            border: `1px solid ${C.border}`, borderRadius: '12px',
            padding: '13px', fontSize: '11px', fontWeight: 500,
            letterSpacing: '1.5px', textTransform: 'uppercase',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}
        >Cancel</button>
        <button
          onClick={handleSave} disabled={!canSave}
          style={{
            flex: 2,
            background: canSave ? C.gold : C.border,
            color: canSave ? C.ivory : C.light,
            border: 'none', borderRadius: '12px', padding: '14px',
            fontSize: '11px', fontWeight: 600, letterSpacing: '1.8px', textTransform: 'uppercase',
            cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif',
          }}
        >{submitting ? 'Saving…' : 'Add To-Do'}</button>
      </div>
    </SheetOverlay>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// QUICK EVENT SHEET (Turn 7b) — inline calendar event creation
// ══════════════════════════════════════════════════════════════════════════

function QuickEventSheet({
  vendorId, clients, onClose, onSaved,
}: {
  vendorId: string; clients: any[];
  onClose: () => void; onSaved: (event: any) => void;
}) {
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [clientId, setClientId] = useState('');
  const [type, setType] = useState<'generic' | 'booking' | 'trial' | 'briefing' | 'venue_visit'>('generic');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSave = !!title.trim() && !!eventDate && !submitting;

  const handleSave = async () => {
    if (!canSave) return;
    setError(''); setSubmitting(true);
    try {
      const matchedClient = clients.find((c: any) => c.id === clientId);
      const r = await fetch(API + '/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          title: title.trim(),
          event_date: eventDate,
          event_time: eventTime || null,
          client_id: clientId || null,
          client_name: matchedClient?.name || null,
          notes: notes.trim() || null,
          type,
        }),
      });
      const d = await r.json();
      if (d.success && d.data) onSaved(d.data);
      else setError(d.error || 'Could not create event');
    } catch {
      setError('Network error. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <SheetOverlay onClose={onClose}>
      <SheetHeader eyebrow="Quick Action" title="Create Event" onClose={onClose} />

      <FieldLabel>Event title</FieldLabel>
      <input
        type="text" value={title} onChange={e => setTitle(e.target.value)}
        placeholder="e.g. Pooja's outfit trial"
        autoFocus
        style={{
          width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '13px 14px', fontSize: '14px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          marginBottom: '12px', boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <FieldLabel>Date</FieldLabel>
          <input
            type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
            style={{
              width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
              borderRadius: '12px', padding: '13px 14px', fontSize: '13px', color: C.dark,
              fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <FieldLabel>Time (optional)</FieldLabel>
          <input
            type="time" value={eventTime} onChange={e => setEventTime(e.target.value)}
            style={{
              width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
              borderRadius: '12px', padding: '13px 14px', fontSize: '13px', color: C.dark,
              fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      <FieldLabel>Type</FieldLabel>
      <select
        value={type} onChange={e => setType(e.target.value as any)}
        style={{
          width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '12px 14px', fontSize: '13px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          marginBottom: '12px', boxSizing: 'border-box',
        }}
      >
        <option value="generic">General</option>
        <option value="booking">Booking / Wedding day</option>
        <option value="trial">Outfit / Dress trial</option>
        <option value="briefing">Briefing</option>
        <option value="venue_visit">Venue visit</option>
      </select>

      <FieldLabel>Link to client (optional)</FieldLabel>
      <select
        value={clientId} onChange={e => setClientId(e.target.value)}
        style={{
          width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '12px 14px', fontSize: '13px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          marginBottom: '12px', boxSizing: 'border-box',
        }}
      >
        <option value="">— No client —</option>
        {clients.map((c: any) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <FieldLabel>Notes (optional)</FieldLabel>
      <textarea
        value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Anything to remember…"
        rows={2}
        style={{
          width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '12px 14px', fontSize: '13px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          marginBottom: '14px', boxSizing: 'border-box', resize: 'vertical',
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
            flex: 1, background: 'transparent', color: C.muted,
            border: `1px solid ${C.border}`, borderRadius: '12px',
            padding: '13px', fontSize: '11px', fontWeight: 500,
            letterSpacing: '1.5px', textTransform: 'uppercase',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}
        >Cancel</button>
        <button
          onClick={handleSave} disabled={!canSave}
          style={{
            flex: 2,
            background: canSave ? C.gold : C.border,
            color: canSave ? C.ivory : C.light,
            border: 'none', borderRadius: '12px', padding: '14px',
            fontSize: '11px', fontWeight: 600, letterSpacing: '1.8px', textTransform: 'uppercase',
            cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif',
          }}
        >{submitting ? 'Saving…' : 'Create Event'}</button>
      </div>
    </SheetOverlay>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TEAM ACTIVITY FEED — Prestige only
// Pulls recent team + task activity from Deluxe Suite endpoints.
// Shows empty state with CTA when no team yet.
// ══════════════════════════════════════════════════════════════════════════

function TeamActivityFeed({ vendorId }: { vendorId: string }) {
  const [team, setTeam] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendorId) { setLoading(false); return; }
    let cancelled = false;
    Promise.all([
      fetch(`${API}/api/ds/team/${vendorId}`).then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`${API}/api/ds/tasks/${vendorId}`).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([teamRes, tasksRes]) => {
      if (cancelled) return;
      setTeam(teamRes?.data || []);
      setTasks(tasksRes?.data || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [vendorId]);

  // Build a unified activity feed — tasks completed, photos approved, etc.
  // For now, just task activity (most reliable signal).
  type Activity = {
    id: string;
    actor: string;
    action: string;
    detail: string;
    when: Date;
  };
  const activities: Activity[] = [];

  // Tasks: recent updates
  for (const t of tasks) {
    if (!t.updated_at) continue;
    const assignee = team.find(m => m.id === t.assigned_to);
    const actorName = assignee?.name || 'Team';
    if (t.status === 'completed' && t.completed_at) {
      activities.push({
        id: `task-done-${t.id}`,
        actor: actorName,
        action: 'completed',
        detail: t.title || 'a task',
        when: new Date(t.completed_at),
      });
    } else if (t.status === 'in_progress') {
      activities.push({
        id: `task-prog-${t.id}`,
        actor: actorName,
        action: 'started',
        detail: t.title || 'a task',
        when: new Date(t.updated_at),
      });
    }
  }

  activities.sort((a, b) => b.when.getTime() - a.when.getTime());
  const recent = activities.slice(0, 6);

  if (loading) {
    return (
      <div>
        <SectionLabel>Team Activity</SectionLabel>
        <div style={{
          background: C.ivory, borderRadius: '16px',
          border: `1px solid ${C.border}`, padding: '24px',
          textAlign: 'center', color: C.muted,
          fontSize: '12px', fontStyle: 'italic',
        }}>Loading…</div>
      </div>
    );
  }

  // ── Empty state — no team yet ────────────────────────────────────────
  if (team.length === 0) {
    return (
      <div>
        <SectionLabel>Team Activity</SectionLabel>
        <div style={{
          background: C.ivory,
          borderRadius: '18px',
          border: `1px solid ${C.goldBorder}`,
          padding: '24px 22px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
            background: `linear-gradient(90deg, transparent 0%, ${C.gold} 50%, transparent 100%)`,
          }} />
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '52px', height: '52px', borderRadius: '50%',
            background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
            margin: '0 auto 16px',
          }}>
            <Users size={20} color={C.gold} />
          </div>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '20px', color: C.dark, fontWeight: 400,
            letterSpacing: '0.2px', lineHeight: 1.35,
            textAlign: 'center', marginBottom: '8px',
          }}>Your team activity lives here.</div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px', color: C.muted, lineHeight: 1.6,
            textAlign: 'center', marginBottom: '18px',
            maxWidth: '300px', marginLeft: 'auto', marginRight: 'auto',
          }}>
            Invite your first team member to see tasks, photos, deliveries, and check-ins as they happen.
          </div>
          <a
            href="/vendor/mobile/profile/edit"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'block', textAlign: 'center',
              background: C.gold, color: C.ivory,
              padding: '12px 18px', borderRadius: '10px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '11px', fontWeight: 600,
              letterSpacing: '1.8px', textTransform: 'uppercase',
              textDecoration: 'none',
              maxWidth: '260px', marginLeft: 'auto', marginRight: 'auto',
            }}
          >Invite Team Member</a>
        </div>
      </div>
    );
  }

  // ── No recent activity yet ──────────────────────────────────────────
  if (recent.length === 0) {
    return (
      <div>
        <SectionLabel>Team Activity</SectionLabel>
        <div style={{
          background: C.ivory, borderRadius: '16px',
          border: `1px solid ${C.border}`, padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '15px', color: C.dark, fontWeight: 400,
            fontStyle: 'italic', marginBottom: '4px',
          }}>Quiet day so far.</div>
          <div style={{
            fontSize: '11px', color: C.muted, fontStyle: 'italic',
          }}>{team.length} team member{team.length === 1 ? '' : 's'} on standby.</div>
        </div>
      </div>
    );
  }

  // ── Active feed ─────────────────────────────────────────────────────
  return (
    <div>
      <SectionLabel>Team Activity</SectionLabel>
      <div style={{
        background: C.ivory, borderRadius: '16px',
        border: `1px solid ${C.border}`, padding: '8px 0', overflow: 'hidden',
      }}>
        {recent.map((a, idx) => {
          const isLast = idx === recent.length - 1;
          const ago = formatTimeAgo(a.when);
          return (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              padding: '12px 16px',
              borderBottom: isLast ? 'none' : `1px solid ${C.borderSoft}`,
            }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: '2px',
                fontFamily: "'Playfair Display', serif",
                fontSize: '11px', color: C.goldDeep, fontWeight: 500,
              }}>{a.actor.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '12px', color: C.dark, lineHeight: 1.45,
                  fontFamily: 'DM Sans, sans-serif',
                }}>
                  <span style={{ fontWeight: 600 }}>{a.actor}</span>
                  {' '}<span style={{ color: C.muted }}>{a.action}</span>
                  {' '}{a.detail}
                </div>
                <div style={{
                  fontSize: '10px', color: C.light, marginTop: '2px',
                  letterSpacing: '0.5px',
                }}>{ago}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTimeAgo(d: Date): string {
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / (1000 * 60));
  const hrs = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ══════════════════════════════════════════════════════════════════════════
// EXPENSES PANEL — full PWA implementation (Signature+)
// ══════════════════════════════════════════════════════════════════════════

const EXPENSE_CATEGORIES = [
  'Travel', 'Equipment', 'Assistant', 'Venue', 'Supplies',
  'Props', 'Food', 'Software', 'Marketing', 'Other',
];

// ══════════════════════════════════════════════════════════════════════════
// PAYMENT SCHEDULES PANEL — list view + 3-stage creator
// ══════════════════════════════════════════════════════════════════════════

function PaymentSchedulesPanel({ session, paymentSchedules, clients, onSavePaymentSchedule }: any) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Header + new button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>Payment Schedules</div>
          <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>Stage payments across the booking journey</div>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          background: C.gold, color: C.ivory, border: 'none',
          borderRadius: '50px', padding: '8px 14px',
          fontSize: '11px', fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px',
          letterSpacing: '0.5px',
        }}><Plus size={12} /> New</button>
      </div>

      {/* List */}
      {paymentSchedules.length === 0 ? (
        <div style={{
          background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`,
          padding: '40px 20px', textAlign: 'center',
        }}>
          <CreditCard size={28} color={C.light} style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '14px', fontFamily: "'Playfair Display', serif", color: C.dark, marginBottom: '4px' }}>
            No payment schedules
          </div>
          <div style={{ fontSize: '12px', color: C.muted }}>
            Tap New to stage payments per client.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {paymentSchedules.map((s: any) => {
            const insts = s.instalments || [];
            const overdue = insts.some((inst: any) => !inst.paid && inst.due_date && new Date(inst.due_date) < new Date());
            const totalAmt = insts.reduce((sum: number, i: any) => sum + (parseInt(i.amount) || 0), 0);
            const paidAmt = insts.filter((i: any) => i.paid).reduce((sum: number, i: any) => sum + (parseInt(i.amount) || 0), 0);
            return (
              <div key={s.id} style={{
                background: C.card, borderRadius: '12px',
                border: `1px solid ${overdue ? C.redBorder : C.border}`,
                padding: '14px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', color: C.dark, fontWeight: 500 }}>{s.client_name || 'Client'}</div>
                    <div style={{ fontSize: '11px', color: overdue ? C.red : C.muted, marginTop: '2px' }}>
                      {insts.filter((i: any) => !i.paid).length} of {insts.length} pending
                      {overdue && ' · OVERDUE'}
                    </div>
                  </div>
                  {s.client_phone && (
                    <a
                      href={`https://wa.me/91${s.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent('Hi ' + (s.client_name || 'there') + '! Gentle reminder about pending payment.')}`}
                      target="_blank" rel="noreferrer"
                      style={{
                        background: '#25D366', borderRadius: '50%',
                        width: '32px', height: '32px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, textDecoration: 'none',
                      }}>
                      <MessageCircle size={14} color="#fff" />
                    </a>
                  )}
                </div>
                {/* Mini progress bar */}
                <div style={{ height: '6px', background: C.borderSoft, borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ height: '100%', width: totalAmt > 0 ? `${(paidAmt / totalAmt) * 100}%` : '0%', background: overdue ? C.red : C.green, transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: '11px', color: C.muted, display: 'flex', justifyContent: 'space-between' }}>
                  <span>₹{paidAmt.toLocaleString('en-IN')} paid</span>
                  <span>₹{totalAmt.toLocaleString('en-IN')} total</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer hint */}
      <div style={{
        marginTop: '16px', padding: '12px 14px',
        background: C.pearl, borderRadius: '10px',
        fontSize: '11px', color: C.muted, lineHeight: 1.55,
        textAlign: 'center', fontStyle: 'italic',
      }}>
        Need more than 3 instalments? Use the
        <a href="/vendor/mobile/profile/edit" target="_blank" rel="noreferrer" style={{ color: C.goldDeep, textDecoration: 'underline', marginLeft: '4px' }}>business portal →</a>
      </div>

      {/* Create modal */}
      {showCreate && (
        <PaymentScheduleCreator
          session={session}
          clients={clients}
          onClose={() => setShowCreate(false)}
          onSaved={(newSched: any) => { onSavePaymentSchedule && onSavePaymentSchedule(newSched); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function PaymentScheduleCreator({ session, clients, onClose, onSaved }: any) {
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [advance, setAdvance] = useState({ amount: '', due_date: '' });
  const [preEvent, setPreEvent] = useState({ amount: '', due_date: '' });
  const [final, setFinal] = useState({ amount: '', due_date: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const totalEntered = (parseInt(advance.amount) || 0) + (parseInt(preEvent.amount) || 0) + (parseInt(final.amount) || 0);
  const canSave = !!clientName && (parseInt(advance.amount) > 0 || parseInt(preEvent.amount) > 0 || parseInt(final.amount) > 0) && !submitting;

  const handleClientPick = (id: string) => {
    setClientId(id);
    const c = clients.find((cl: any) => cl.id === id);
    if (c) {
      setClientName(c.name || '');
      setClientPhone(c.phone || '');
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setError(''); setSubmitting(true);
    const instalments: any[] = [];
    if (parseInt(advance.amount) > 0)   instalments.push({ label: 'Advance',   amount: parseInt(advance.amount),   due_date: advance.due_date || null,   paid: false });
    if (parseInt(preEvent.amount) > 0)  instalments.push({ label: 'Pre-Event', amount: parseInt(preEvent.amount),  due_date: preEvent.due_date || null,  paid: false });
    if (parseInt(final.amount) > 0)     instalments.push({ label: 'Final',     amount: parseInt(final.amount),     due_date: final.due_date || null,     paid: false });
    try {
      const r = await fetch(API + '/api/payment-schedules', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: session.vendorId,
          client_id: clientId || null,
          client_name: clientName,
          client_phone: clientPhone || null,
          instalments,
        }),
      });
      const d = await r.json();
      if (d.success && d.data) onSaved(d.data);
      else setError(d.error || 'Could not create schedule');
    } catch {
      setError('Network error. Please try again.');
    } finally { setSubmitting(false); }
  };

  const stage = (label: string, val: any, set: any, hint: string) => (
    <div style={{
      background: C.pearl, border: `1px solid ${C.border}`,
      borderRadius: '12px', padding: '14px', marginBottom: '10px',
    }}>
      <div style={{ fontSize: '11px', color: C.muted, fontWeight: 600, letterSpacing: '1px', marginBottom: '4px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '10px', color: C.light, marginBottom: '10px', fontStyle: 'italic' }}>{hint}</div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <FieldLabel>Amount (₹)</FieldLabel>
          <input
            type="number" inputMode="numeric"
            value={val.amount} onChange={e => set({ ...val, amount: e.target.value })}
            placeholder="0"
            style={{
              width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '11px 12px',
              fontSize: '14px', color: C.dark, fontFamily: 'DM Sans, sans-serif',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <FieldLabel>Due date</FieldLabel>
          <input
            type="date" value={val.due_date}
            onChange={e => set({ ...val, due_date: e.target.value })}
            style={{
              width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '11px 12px',
              fontSize: '14px', color: C.dark, fontFamily: 'DM Sans, sans-serif',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <SheetOverlay onClose={onClose}>
      <SheetHeader eyebrow="Payment Schedule" title="Stage 3 payments" onClose={onClose} />

      <FieldLabel>Client</FieldLabel>
      {clients.length > 0 ? (
        <select value={clientId} onChange={e => handleClientPick(e.target.value)} style={{
          width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '13px 14px', fontSize: '14px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          marginBottom: '8px', boxSizing: 'border-box',
        }}>
          <option value="">— Pick existing client —</option>
          {clients.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}{c.phone ? ' · ' + c.phone : ''}</option>
          ))}
        </select>
      ) : null}
      <input
        type="text" value={clientName} onChange={e => setClientName(e.target.value)}
        placeholder="…or type a name"
        style={{
          width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '13px 14px', fontSize: '14px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          marginBottom: '8px', boxSizing: 'border-box',
        }}
      />
      <input
        type="tel" inputMode="tel" value={clientPhone}
        onChange={e => setClientPhone(e.target.value)}
        placeholder="Phone (for WhatsApp reminders)"
        style={{
          width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '13px 14px', fontSize: '14px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          marginBottom: '18px', boxSizing: 'border-box',
        }}
      />

      {stage('Advance', advance, setAdvance, 'Booking confirmation deposit')}
      {stage('Pre-Event', preEvent, setPreEvent, 'Due 7-30 days before event')}
      {stage('Final', final, setFinal, 'Balance after the event')}

      <div style={{
        background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
        borderRadius: '10px', padding: '12px 14px',
        fontSize: '12px', color: C.goldDeep, fontWeight: 600,
        marginBottom: '14px', display: 'flex', justifyContent: 'space-between',
      }}>
        <span>Total</span>
        <span>₹{totalEntered.toLocaleString('en-IN')}</span>
      </div>

      {error && <div style={{ fontSize: '12px', color: C.red, marginBottom: '12px' }}>{error}</div>}

      <button
        onClick={handleSave}
        disabled={!canSave}
        style={{
          width: '100%', background: canSave ? C.dark : C.border,
          color: canSave ? C.ivory : C.light,
          border: 'none', borderRadius: '12px', padding: '14px',
          fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px',
          textTransform: 'uppercase', cursor: canSave ? 'pointer' : 'not-allowed',
          fontFamily: 'DM Sans, sans-serif',
        }}>{submitting ? 'Creating…' : 'Create Schedule'}</button>

      <div style={{
        marginTop: '12px',
        fontSize: '10px', color: C.light, textAlign: 'center',
        fontStyle: 'italic', lineHeight: 1.5,
      }}>
        More instalments? Use the business portal →
      </div>
    </SheetOverlay>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TO-DO PANEL — Personal task list, prioritized + due-date sorted
// ══════════════════════════════════════════════════════════════════════════

function TodoPanel({ todos, onOpenTodo, onToggleTodo, onDeleteTodo }: any) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending');

  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const visible = (todos || []).filter((t: any) => {
    if (filter === 'pending') return !t.done;
    if (filter === 'done') return t.done;
    return true;
  });

  const grouped = {
    overdue: visible.filter((t: any) => !t.done && t.due_date && new Date(t.due_date) < today),
    today: visible.filter((t: any) => !t.done && t.due_date && new Date(t.due_date).toDateString() === today.toDateString()),
    upcoming: visible.filter((t: any) => !t.done && t.due_date && new Date(t.due_date) > today),
    someday: visible.filter((t: any) => !t.done && !t.due_date),
    done: visible.filter((t: any) => t.done),
  };

  const renderTodoCard = (t: any) => {
    const isOverdue = !t.done && t.due_date && new Date(t.due_date) < today;
    const priorityColor = t.priority === 'high' ? C.red : t.priority === 'low' ? C.light : C.gold;
    return (
      <div key={t.id} style={{
        background: C.ivory, border: `1px solid ${isOverdue ? C.redBorder : C.border}`,
        borderRadius: '12px', padding: '14px',
        display: 'flex', alignItems: 'flex-start', gap: '12px',
        opacity: t.done ? 0.55 : 1,
      }}>
        <button
          onClick={() => onToggleTodo && onToggleTodo(t.id, !t.done)}
          style={{
            width: '20px', height: '20px', flexShrink: 0,
            borderRadius: '6px',
            border: `1.5px solid ${t.done ? C.green : C.border}`,
            background: t.done ? C.green : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0, marginTop: '2px',
          }}>
          {t.done && <CheckCircle size={12} color="#fff" />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '13.5px', color: C.dark, fontWeight: 500,
            textDecoration: t.done ? 'line-through' : 'none',
            lineHeight: 1.4, marginBottom: t.due_date ? '4px' : 0,
            wordBreak: 'break-word',
          }}>{t.title}</div>
          {t.due_date && (
            <div style={{ fontSize: '11px', color: isOverdue ? C.red : C.muted, fontWeight: isOverdue ? 600 : 400 }}>
              {isOverdue ? 'Overdue · ' : ''}
              {new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </div>
          )}
        </div>
        <div style={{
          width: '6px', height: '40px', borderRadius: '3px',
          background: priorityColor, flexShrink: 0,
        }} />
        <button
          onClick={() => { if (confirm('Delete this to-do?') && onDeleteTodo) onDeleteTodo(t.id); }}
          style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', flexShrink: 0 }}>
          <Trash2 size={14} color={C.light} />
        </button>
      </div>
    );
  };

  const sectionHeader = (label: string, count: number) => count > 0 && (
    <div style={{
      fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px',
      textTransform: 'uppercase', color: C.muted,
      marginTop: '20px', marginBottom: '10px',
    }}>{label} · {count}</div>
  );

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Filter pills + Add button */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', alignItems: 'center' }}>
        {(['pending', 'all', 'done'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter === f ? C.dark : 'transparent',
            color: filter === f ? C.ivory : C.muted,
            border: `1px solid ${filter === f ? C.dark : C.border}`,
            borderRadius: '50px', padding: '6px 14px',
            fontSize: '11px', fontWeight: 500, cursor: 'pointer',
            fontFamily: 'inherit', textTransform: 'capitalize',
          }}>{f}</button>
        ))}
        <button onClick={onOpenTodo} style={{
          marginLeft: 'auto',
          background: C.gold, color: C.ivory, border: 'none',
          borderRadius: '50px', padding: '8px 14px',
          fontSize: '11px', fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px',
          letterSpacing: '0.5px',
        }}><Plus size={12} /> New</button>
      </div>

      {/* Empty state */}
      {visible.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
          <CheckCircle size={32} color={C.light} style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '14px', fontFamily: "'Playfair Display', serif", color: C.dark, marginBottom: '4px' }}>
            {filter === 'done' ? 'Nothing completed yet' : 'All clear'}
          </div>
          <div style={{ fontSize: '12px' }}>
            {filter === 'done' ? 'Finished to-dos will appear here.' : 'Tap New to add your first to-do.'}
          </div>
        </div>
      )}

      {/* Sections */}
      {sectionHeader('Overdue', grouped.overdue.length)}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{grouped.overdue.map(renderTodoCard)}</div>

      {sectionHeader('Today', grouped.today.length)}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{grouped.today.map(renderTodoCard)}</div>

      {sectionHeader('Upcoming', grouped.upcoming.length)}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{grouped.upcoming.map(renderTodoCard)}</div>

      {sectionHeader('Someday', grouped.someday.length)}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{grouped.someday.map(renderTodoCard)}</div>

      {sectionHeader('Done', grouped.done.length)}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{grouped.done.map(renderTodoCard)}</div>
    </div>
  );
}

function ExpensesPanel({ session, tier, clients }: any) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [filter, setFilter] = useState<'month' | 'ytd' | 'all'>('month');

  useEffect(() => {
    if (!session?.vendorId) { setLoading(false); return; }
    fetch(`${API}/api/expenses/${session.vendorId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setExpenses(d.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.vendorId]);

  // ── Computed ──────────────────────────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const fyStart = now.getMonth() >= 3
    ? new Date(now.getFullYear(), 3, 1)
    : new Date(now.getFullYear() - 1, 3, 1);

  const parseExpenseDate = (exp: any): Date | null => {
    // expense_date stored as en-IN string "DD/MM/YYYY"
    if (exp.created_at) return new Date(exp.created_at);
    return null;
  };

  const filteredExpenses = expenses.filter(e => {
    const d = parseExpenseDate(e);
    if (!d) return filter === 'all';
    if (filter === 'month') return d >= monthStart;
    if (filter === 'ytd')   return d >= fyStart;
    return true;
  });

  const totalFiltered = filteredExpenses.reduce((s, e) => s + (parseInt(e.amount) || 0), 0);
  const totalThisMonth = expenses.filter(e => {
    const d = parseExpenseDate(e);
    return d && d >= monthStart;
  }).reduce((s, e) => s + (parseInt(e.amount) || 0), 0);
  const totalYTD = expenses.filter(e => {
    const d = parseExpenseDate(e);
    return d && d >= fyStart;
  }).reduce((s, e) => s + (parseInt(e.amount) || 0), 0);

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  for (const e of filteredExpenses) {
    const cat = e.category || 'Other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (parseInt(e.amount) || 0);
  }
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const maxCatAmount = sortedCategories[0]?.[1] || 1;

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this expense?')) return;
    try {
      await fetch(`${API}/api/expenses/${id}`, { method: 'DELETE' });
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch { /* ignore */ }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: C.muted, fontSize: '13px' }}>Loading expenses…</div>;
  }

  return (
    <>
      {/* ── Summary card ── */}
      <div style={{
        background: C.ivory,
        borderRadius: '16px',
        border: `1px solid ${C.goldBorder}`,
        padding: '18px',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '14px',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: `linear-gradient(90deg, transparent 0%, ${C.gold} 50%, transparent 100%)`,
        }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: C.muted, fontWeight: 600 }}>This Month</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: C.dark, marginTop: '4px' }}>₹{fmtINR(totalThisMonth)}</div>
          </div>
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: C.muted, fontWeight: 600 }}>Year to Date</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: C.dark, marginTop: '4px' }}>₹{fmtINR(totalYTD)}</div>
          </div>
        </div>
      </div>

      {/* ── Add Expense CTA ── */}
      <button
        onClick={() => setShowAddSheet(true)}
        style={{
          background: C.gold, color: C.ivory,
          border: 'none', borderRadius: '12px',
          padding: '14px', marginBottom: '14px',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px', fontWeight: 600,
          letterSpacing: '1.8px', textTransform: 'uppercase',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          width: '100%',
        }}
      ><Plus size={14} /> Add Expense</button>

      {/* ── Filter chips ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        {([
          { k: 'month', label: 'This Month' },
          { k: 'ytd',   label: 'Year to Date' },
          { k: 'all',   label: 'All Time' },
        ] as const).map(f => {
          const active = filter === f.k;
          return (
            <button
              key={f.k}
              onClick={() => setFilter(f.k as any)}
              style={{
                background: active ? C.goldSoft : C.ivory,
                color: active ? C.goldDeep : C.muted,
                border: `1px solid ${active ? C.gold : C.border}`,
                borderRadius: '50px',
                padding: '7px 14px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '10px', fontWeight: active ? 600 : 500,
                letterSpacing: active ? '1.2px' : '0.8px',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >{f.label}</button>
          );
        })}
      </div>

      {/* ── Category breakdown ── */}
      {sortedCategories.length > 0 && (
        <div style={{
          background: C.ivory,
          borderRadius: '14px',
          border: `1px solid ${C.border}`,
          padding: '16px',
          marginBottom: '14px',
        }}>
          <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: C.goldDeep, fontWeight: 600, marginBottom: '12px' }}>
            By Category · ₹{fmtINR(totalFiltered)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sortedCategories.slice(0, 6).map(([cat, amt]) => (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: C.dark }}>{cat}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: C.dark }}>₹{fmtINR(amt)}</span>
                </div>
                <div style={{
                  height: '4px', background: C.pearl, borderRadius: '2px', overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${(amt / maxCatAmount) * 100}%`,
                    height: '100%',
                    background: C.gold,
                    borderRadius: '2px',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Expense list ── */}
      {filteredExpenses.length === 0 ? (
        <Empty
          icon={<TrendingDown size={28} color={C.light} />}
          title="No expenses logged"
          sub={filter === 'month' ? 'No expenses this month yet.' : 'Tap Add Expense to log your first one.'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredExpenses.slice(0, 30).map((exp: any) => (
            <div key={exp.id} style={{
              background: C.ivory,
              border: `1px solid ${C.border}`,
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '10px',
                background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <TrendingDown size={13} color={C.goldDeep} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', color: C.dark, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {exp.description || 'Expense'}
                </div>
                <div style={{ fontSize: '10px', color: C.muted, marginTop: '2px', letterSpacing: '0.3px' }}>
                  {exp.category || 'Other'}
                  {exp.client_name ? ` · ${exp.client_name}` : ''}
                  {exp.expense_date ? ` · ${exp.expense_date}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: C.dark }}>₹{fmtINR(parseInt(exp.amount) || 0)}</div>
                <button
                  onClick={() => handleDelete(exp.id)}
                  style={{
                    background: 'transparent', border: 'none',
                    color: C.light, fontSize: '9px', letterSpacing: '1px',
                    textTransform: 'uppercase', cursor: 'pointer',
                    marginTop: '2px', padding: 0, fontFamily: 'inherit',
                  }}
                >Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Expense bottom sheet ── */}
      {showAddSheet && (
        <AddExpenseSheet
          vendorId={session?.vendorId}
          clients={clients}
          onClose={() => setShowAddSheet(false)}
          onSaved={(newExp: any) => {
            setExpenses(prev => [newExp, ...prev]);
            setShowAddSheet(false);
          }}
        />
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ADD EXPENSE SHEET — bottom sheet to log a new expense
// ══════════════════════════════════════════════════════════════════════════

function AddExpenseSheet({ vendorId, clients, onClose, onSaved }: {
  vendorId: string;
  clients: any[];
  onClose: () => void;
  onSaved: (exp: any) => void;
}) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Travel');
  const [clientId, setClientId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedClient = clients.find(c => c.id === clientId);
  const canSave = amount && parseInt(amount) > 0 && description.trim() && !submitting;

  const handleSave = async () => {
    if (!canSave) return;
    setError('');
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          description: description.trim(),
          amount: parseInt(amount),
          category,
          client_name: selectedClient?.name || '',
          expense_date: new Date().toLocaleDateString('en-IN'),
        }),
      });
      const d = await r.json();
      if (d.success && d.data) {
        onSaved(d.data);
      } else {
        setError(d.error || 'Could not save expense');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
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
          padding: '24px 20px calc(env(safe-area-inset-bottom) + 24px)',
          maxHeight: '92dvh',
          overflowY: 'auto',
          boxShadow: '0 -8px 40px rgba(26,20,16,0.24)',
        }}
      >
        {/* Handle bar */}
        <div style={{
          width: '40px', height: '4px', borderRadius: '2px',
          background: C.border, margin: '0 auto 18px',
        }} />

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <TrendingDown size={14} color={C.goldDeep} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '9px', letterSpacing: '2.5px', textTransform: 'uppercase', color: C.goldDeep, fontWeight: 600 }}>New</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: C.dark, marginTop: '2px' }}>Add Expense</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}>
            <X size={16} color={C.muted} />
          </button>
        </div>

        {/* Amount */}
        <label style={{ display: 'block', marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: C.muted, fontWeight: 500, marginBottom: '6px' }}>Amount</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: C.ivory,
            border: `1px solid ${C.border}`,
            borderRadius: '12px',
            padding: '13px 14px',
          }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: C.goldDeep }}>₹</span>
            <input
              type="text"
              inputMode="numeric"
              value={amount ? parseInt(amount).toLocaleString('en-IN') : ''}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 5000"
              style={{
                flex: 1, background: 'transparent', border: 'none',
                fontSize: '18px', fontFamily: "'Playfair Display', serif",
                color: C.dark, outline: 'none',
              }}
              autoFocus
            />
          </div>
        </label>

        {/* Description */}
        <label style={{ display: 'block', marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: C.muted, fontWeight: 500, marginBottom: '6px' }}>What was this for?</div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Taxi to Goa shoot"
            style={{
              width: '100%', background: C.ivory,
              border: `1px solid ${C.border}`, borderRadius: '12px',
              padding: '13px 14px',
              fontSize: '14px', color: C.dark,
              fontFamily: 'DM Sans, sans-serif',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </label>

        {/* Category chips */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: C.muted, fontWeight: 500, marginBottom: '8px' }}>Category</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {EXPENSE_CATEGORIES.map(cat => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    background: active ? C.goldSoft : C.ivory,
                    color: active ? C.goldDeep : C.muted,
                    border: `1px solid ${active ? C.gold : C.border}`,
                    borderRadius: '50px',
                    padding: '7px 12px',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '10px', fontWeight: active ? 600 : 500,
                    letterSpacing: active ? '1.2px' : '0.5px',
                    textTransform: active ? 'uppercase' : 'none',
                    cursor: 'pointer',
                  }}
                >{cat}</button>
              );
            })}
          </div>
        </div>

        {/* Client (optional) */}
        {clients.length > 0 && (
          <label style={{ display: 'block', marginBottom: '18px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: C.muted, fontWeight: 500, marginBottom: '6px' }}>Link to client <span style={{ textTransform: 'none', letterSpacing: 0, fontStyle: 'italic', color: C.light }}>(optional)</span></div>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              style={{
                width: '100%', background: C.ivory,
                border: `1px solid ${C.border}`, borderRadius: '12px',
                padding: '13px 14px',
                fontSize: '14px', color: clientId ? C.dark : C.muted,
                fontFamily: 'DM Sans, sans-serif',
                outline: 'none', boxSizing: 'border-box',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238C7B6E' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                paddingRight: '36px',
              }}
            >
              <option value="">No client</option>
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name || 'Client'}</option>
              ))}
            </select>
          </label>
        )}

        {error && (
          <div style={{
            background: C.redSoft,
            border: `1px solid ${C.redBorder}`,
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '11px', color: C.red,
            marginBottom: '14px', lineHeight: 1.5,
          }}>{error}</div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{
              flex: '0 0 auto',
              background: 'transparent',
              border: `1px solid ${C.border}`, color: C.muted,
              borderRadius: '12px', padding: '13px 20px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '11px', fontWeight: 600,
              letterSpacing: '1.5px', textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              flex: 1,
              background: canSave ? C.gold : C.pearl,
              color: canSave ? C.ivory : C.light,
              border: 'none', borderRadius: '12px',
              padding: '13px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '11px', fontWeight: 600,
              letterSpacing: '1.8px', textTransform: 'uppercase',
              cursor: canSave ? 'pointer' : 'not-allowed',
            }}
          >{submitting ? 'Saving…' : 'Save Expense'}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAX & TDS PANEL — Signature+, shows GST summary + TDS ledger + CSV export
// ══════════════════════════════════════════════════════════════════════════

function TaxTdsPanel({ session, tier, invoices }: { session: VendorSession; tier: Tier; invoices: any[] }) {
  const [tdsEntries, setTdsEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFY, setSelectedFY] = useState<string>('');

  // Build list of financial years from invoices + tds data
  const now = new Date();
  const currentFYYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const currentFY = `FY ${currentFYYear}-${String(currentFYYear + 1).slice(-2)}`;

  useEffect(() => {
    if (!session?.vendorId) return;
    setSelectedFY(currentFY);
    let cancelled = false;
    fetch(`${API}/api/tds/${session.vendorId}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setTdsEntries(d?.data || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session?.vendorId]);

  // GST computation — from paid invoices in selected FY
  const fyStart = new Date(parseInt(selectedFY.slice(3, 7)), 3, 1);
  const fyEnd = new Date(parseInt(selectedFY.slice(3, 7)) + 1, 2, 31, 23, 59, 59);
  const fyInvoices = invoices.filter((i: any) => {
    const d = i.paid_at ? new Date(i.paid_at) : i.issue_date ? new Date(i.issue_date) : null;
    return d && d >= fyStart && d <= fyEnd;
  });
  const gstCollected = fyInvoices
    .filter((i: any) => i.status === 'paid')
    .reduce((s: number, i: any) => s + (parseInt(i.gst_amount) || Math.round((parseInt(i.amount) || 0) * 0.18)), 0);
  const totalRevenue = fyInvoices
    .filter((i: any) => i.status === 'paid')
    .reduce((s: number, i: any) => s + (parseInt(i.amount) || 0), 0);

  // Quarterly breakdown
  const quarters = ['Q1 (Apr-Jun)', 'Q2 (Jul-Sep)', 'Q3 (Oct-Dec)', 'Q4 (Jan-Mar)'];
  const quarterStarts = [[3, 5], [6, 8], [9, 11], [0, 2]];
  const quarterData = quarters.map((label, idx) => {
    const [qStartMonth, qEndMonth] = quarterStarts[idx];
    const qYear = idx === 3 ? parseInt(selectedFY.slice(3, 7)) + 1 : parseInt(selectedFY.slice(3, 7));
    const qStart = new Date(qYear, qStartMonth, 1);
    const qEnd = new Date(qYear, qEndMonth + 1, 0, 23, 59, 59);
    const qRevenue = fyInvoices
      .filter((i: any) => {
        const d = i.paid_at ? new Date(i.paid_at) : null;
        return d && i.status === 'paid' && d >= qStart && d <= qEnd;
      })
      .reduce((s: number, i: any) => s + (parseInt(i.amount) || 0), 0);
    return { label, revenue: qRevenue, gst: Math.round(qRevenue * 0.18) };
  });

  // TDS totals for FY
  const fyTdsEntries = tdsEntries.filter(e => e.financial_year === selectedFY);
  const totalTdsDeducted = fyTdsEntries.reduce((s, e) => s + (parseInt(e.tds_amount) || 0), 0);

  const exportCsv = () => {
    if (!session?.vendorId) return;
    const url = `${API}/api/tds/${session.vendorId}/export?financial_year=${encodeURIComponent(selectedFY)}`;
    window.location.href = url;
  };

  if (loading) return <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted, fontSize: '12px' }}>Loading tax data…</div>;

  return (
    <>
      {/* FY selector */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '14px',
        overflowX: 'auto', paddingBottom: '4px',
      }}>
        {[currentFY, `FY ${currentFYYear - 1}-${String(currentFYYear).slice(-2)}`].map(fy => {
          const active = selectedFY === fy;
          return (
            <button
              key={fy}
              onClick={() => setSelectedFY(fy)}
              style={{
                background: active ? C.goldSoft : C.ivory,
                border: `1px solid ${active ? C.goldBorder : C.border}`,
                borderRadius: '50px', padding: '8px 14px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '10px', fontWeight: active ? 600 : 500,
                letterSpacing: '1.5px', textTransform: 'uppercase',
                color: active ? C.goldDeep : C.muted,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >{fy}</button>
          );
        })}
      </div>

      {/* GST summary card */}
      <div style={{
        background: C.ivory, borderRadius: '18px',
        border: `1px solid ${C.goldBorder}`, padding: '20px',
        marginBottom: '12px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: `linear-gradient(90deg, transparent 0%, ${C.gold} 50%, transparent 100%)`,
        }} />
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.goldDeep, marginBottom: '14px' }}>GST Summary · {selectedFY}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 14px' }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: C.dark, letterSpacing: '-0.2px', lineHeight: 1 }}>₹{fmtINR(totalRevenue)}</div>
            <div style={{ fontSize: '9px', color: C.muted, marginTop: '4px', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500 }}>Total Revenue</div>
          </div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: C.goldDeep, letterSpacing: '-0.2px', lineHeight: 1 }}>₹{fmtINR(gstCollected)}</div>
            <div style={{ fontSize: '9px', color: C.muted, marginTop: '4px', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500 }}>GST Collected (18%)</div>
          </div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: C.red, letterSpacing: '-0.2px', lineHeight: 1 }}>₹{fmtINR(totalTdsDeducted)}</div>
            <div style={{ fontSize: '9px', color: C.muted, marginTop: '4px', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500 }}>TDS Deducted</div>
          </div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: C.green, letterSpacing: '-0.2px', lineHeight: 1 }}>₹{fmtINR(totalRevenue - totalTdsDeducted)}</div>
            <div style={{ fontSize: '9px', color: C.muted, marginTop: '4px', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500 }}>Net Receipts</div>
          </div>
        </div>
      </div>

      {/* Quarterly breakdown */}
      <div style={{ background: C.ivory, borderRadius: '16px', border: `1px solid ${C.border}`, padding: '18px', marginBottom: '12px' }}>
        <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.goldDeep, marginBottom: '14px' }}>Quarterly Breakdown</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {quarterData.map(q => (
            <div key={q.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.borderSoft}` }}>
              <span style={{ fontSize: '12px', color: C.dark, fontWeight: 500 }}>{q.label}</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', color: C.dark, fontFamily: "'Playfair Display', serif" }}>₹{fmtINR(q.revenue)}</div>
                <div style={{ fontSize: '10px', color: C.goldDeep, marginTop: '2px' }}>GST: ₹{fmtINR(q.gst)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CSV export CTA */}
      <button
        onClick={exportCsv}
        style={{
          background: C.gold, color: C.ivory, border: 'none', borderRadius: '12px',
          padding: '14px', marginBottom: '14px',
          fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
          letterSpacing: '1.8px', textTransform: 'uppercase',
          cursor: 'pointer', width: '100%',
        }}
      >Download CSV for CA</button>

      {/* TDS ledger entries */}
      <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.goldDeep, marginBottom: '8px' }}>TDS Ledger</div>
      {fyTdsEntries.length === 0 ? (
        <Empty icon={<Percent size={28} color={C.light} />} title="No TDS entries yet" sub="TDS entries auto-populate when platform bookings are confirmed." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {fyTdsEntries.slice(0, 30).map((e: any) => (
            <div key={e.id} style={{ background: C.ivory, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: C.dark, fontWeight: 500 }}>{e.transaction_type?.replace(/_/g, ' ') || 'Transaction'}</div>
                  <div style={{ fontSize: '10px', color: C.muted, marginTop: '2px' }}>{e.created_at ? new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', color: C.dark, fontFamily: "'Playfair Display', serif" }}>₹{fmtINR(parseInt(e.gross_amount) || 0)}</div>
                  <div style={{ fontSize: '10px', color: C.red, marginTop: '2px' }}>−₹{fmtINR(parseInt(e.tds_amount) || 0)} TDS</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ANALYTICS PANEL — Signature+, revenue/conversion/top-clients
// ══════════════════════════════════════════════════════════════════════════

function AnalyticsPanel({ session, tier, bookings, invoices, leads, clients, paymentSchedules }: {
  session: VendorSession; tier: Tier;
  bookings: any[]; invoices: any[]; leads: any[]; clients: any[]; paymentSchedules: any[];
}) {
  const now = new Date();

  // 12-month revenue trend
  const monthlyRevenue: { label: string; amount: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const amt = invoices
      .filter((inv: any) => {
        if (inv.status !== 'paid') return false;
        const d = inv.paid_at ? new Date(inv.paid_at) : inv.updated_at ? new Date(inv.updated_at) : null;
        return d && d >= mStart && d <= mEnd;
      })
      .reduce((s: number, inv: any) => s + (parseInt(inv.amount) || 0), 0);
    monthlyRevenue.push({
      label: mStart.toLocaleDateString('en-IN', { month: 'short' }),
      amount: amt,
    });
  }
  const maxMonthRevenue = Math.max(...monthlyRevenue.map(m => m.amount), 1);
  const totalRevenue12m = monthlyRevenue.reduce((s, m) => s + m.amount, 0);

  // Conversion funnel (lifetime)
  const leadsCount = leads.length;
  const quotedCount = bookings.filter((b: any) => b.status === 'quoted').length;
  const confirmedCount = bookings.filter((b: any) => b.status === 'confirmed').length;
  const paidCount = invoices.filter((i: any) => i.status === 'paid').length;

  // Top clients by revenue
  const clientRevenue: Record<string, { name: string; revenue: number }> = {};
  for (const inv of invoices) {
    if (inv.status !== 'paid') continue;
    const key = inv.client_id || inv.client_name || 'unknown';
    const name = inv.client_name || 'Unknown client';
    if (!clientRevenue[key]) clientRevenue[key] = { name, revenue: 0 };
    clientRevenue[key].revenue += parseInt(inv.amount) || 0;
  }
  const topClients = Object.values(clientRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Top event types by revenue
  const eventTypeRevenue: Record<string, number> = {};
  for (const b of bookings) {
    if (b.status !== 'confirmed') continue;
    const evt = b.event_type || 'Other';
    const matchingInvoice = invoices.find((i: any) => i.client_name === b.client_name && i.status === 'paid');
    eventTypeRevenue[evt] = (eventTypeRevenue[evt] || 0) + (matchingInvoice ? parseInt(matchingInvoice.amount) || 0 : 0);
  }
  const topEventTypes = Object.entries(eventTypeRevenue)
    .filter(([, r]) => r > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Average deal size
  const paidInvoices = invoices.filter((i: any) => i.status === 'paid');
  const avgDealSize = paidInvoices.length ? Math.round(totalRevenue12m / paidInvoices.length) : 0;

  return (
    <>
      {/* 12-month revenue */}
      <div style={{ background: C.ivory, borderRadius: '18px', border: `1px solid ${C.goldBorder}`, padding: '20px', marginBottom: '12px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent 0%, ${C.gold} 50%, transparent 100%)` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
          <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.goldDeep }}>12-Month Revenue</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: C.dark, letterSpacing: '-0.2px' }}>₹{fmtINR(totalRevenue12m)}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '3px', alignItems: 'end', height: '80px' }}>
          {monthlyRevenue.map((m, i) => {
            const pct = m.amount > 0 ? (m.amount / maxMonthRevenue) * 100 : 3;
            return (
              <div key={i} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ height: `${pct}%`, background: i === 11 ? C.gold : C.goldBorder, borderRadius: '3px 3px 0 0', minHeight: '2px' }} />
              </div>
            );
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '3px', marginTop: '6px' }}>
          {monthlyRevenue.map((m, i) => (
            <div key={i} style={{ fontSize: '8px', color: C.muted, textAlign: 'center', letterSpacing: '0.3px' }}>
              {i % 2 === 0 ? m.label : ''}
            </div>
          ))}
        </div>
      </div>

      {/* Conversion funnel */}
      <div style={{ background: C.ivory, borderRadius: '16px', border: `1px solid ${C.border}`, padding: '18px', marginBottom: '12px' }}>
        <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.goldDeep, marginBottom: '14px' }}>Conversion Funnel</div>
        {[
          { label: 'Leads', count: leadsCount, color: C.muted },
          { label: 'Quoted', count: quotedCount, color: C.goldDeep },
          { label: 'Confirmed', count: confirmedCount, color: C.green },
          { label: 'Paid', count: paidCount, color: C.gold },
        ].map((stage, idx, arr) => {
          const maxCount = arr[0].count || 1;
          const pct = (stage.count / maxCount) * 100;
          const prevCount = idx > 0 ? arr[idx - 1].count : null;
          const dropPct = prevCount && prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : 100;
          return (
            <div key={stage.label} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span style={{ color: C.dark, fontWeight: 500 }}>{stage.label}</span>
                <span style={{ color: C.muted }}>
                  {stage.count}{idx > 0 && ` · ${dropPct}% of prev`}
                </span>
              </div>
              <div style={{ height: '5px', background: C.pearl, borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: stage.color, borderRadius: '3px' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div style={{ background: C.ivory, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '14px 16px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: C.muted, fontWeight: 500 }}>Avg Deal Size</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: C.dark, marginTop: '4px' }}>₹{fmtINR(avgDealSize)}</div>
        </div>
        <div style={{ background: C.ivory, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '14px 16px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: C.muted, fontWeight: 500 }}>Active Clients</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: C.dark, marginTop: '4px' }}>{clients.length}</div>
        </div>
      </div>

      {/* Top clients */}
      {topClients.length > 0 && (
        <div style={{ background: C.ivory, borderRadius: '16px', border: `1px solid ${C.border}`, padding: '18px', marginBottom: '12px' }}>
          <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.goldDeep, marginBottom: '12px' }}>Top Clients by Revenue</div>
          {topClients.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < topClients.length - 1 ? `1px solid ${C.borderSoft}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '14px', color: C.goldDeep, width: '20px', flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: '13px', color: C.dark, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
              </div>
              <span style={{ fontSize: '13px', fontFamily: "'Playfair Display', serif", color: C.dark }}>₹{fmtINR(c.revenue)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top event types */}
      {topEventTypes.length > 0 && (
        <div style={{ background: C.ivory, borderRadius: '16px', border: `1px solid ${C.border}`, padding: '18px' }}>
          <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.goldDeep, marginBottom: '12px' }}>Top Event Types</div>
          {topEventTypes.map(([label, revenue], i) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < topEventTypes.length - 1 ? `1px solid ${C.borderSoft}` : 'none' }}>
              <span style={{ fontSize: '13px', color: C.dark, fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: '13px', fontFamily: "'Playfair Display', serif", color: C.dark }}>₹{fmtINR(revenue)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TEAM PANEL — Signature (basic) / Prestige (full), manages team members
// ══════════════════════════════════════════════════════════════════════════

const TEAM_ROLES = [
  'Assistant', 'Photographer', 'Editor', 'Coordinator',
  'Makeup Artist', 'Technician', 'Account Manager', 'Other',
];

const TEAM_SIZE_LIMIT: Record<string, number> = { essential: 0, signature: 5, prestige: 999 };

function TeamPanel({ session, tier }: { session: VendorSession; tier: Tier }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);

  useEffect(() => {
    if (!session?.vendorId) return;
    let cancelled = false;
    fetch(`${API}/api/ds/team/${session.vendorId}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setMembers(d?.data || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session?.vendorId]);

  const addMember = async (payload: any) => {
    const r = await fetch(`${API}/api/ds/team`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, vendor_id: session.vendorId, is_active: true }),
    });
    const d = await r.json();
    if (d.success && d.data) {
      setMembers(prev => [d.data, ...prev]);
      return true;
    }
    return false;
  };

  const updateMember = async (id: string, payload: any) => {
    const r = await fetch(`${API}/api/ds/team/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (d.success && d.data) {
      setMembers(prev => prev.map(m => m.id === id ? d.data : m));
      return true;
    }
    return false;
  };

  const removeMember = async (id: string) => {
    if (!confirm('Remove this team member? They lose access immediately.')) return;
    try {
      await fetch(`${API}/api/ds/team/${id}`, { method: 'DELETE' });
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch { /* silent */ }
  };

  if (loading) return <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted, fontSize: '12px' }}>Loading team…</div>;

  const limit = TEAM_SIZE_LIMIT[tier] || 0;
  const canAddMore = members.length < limit;

  return (
    <>
      {/* Summary */}
      <div style={{
        background: C.ivory, borderRadius: '16px',
        border: `1px solid ${C.border}`, padding: '16px',
        marginBottom: '14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: C.dark, letterSpacing: '-0.2px' }}>
            {members.length}<span style={{ fontSize: '14px', color: C.muted }}>{tier !== 'prestige' && ` / ${limit}`}</span>
          </div>
          <div style={{ fontSize: '9px', color: C.muted, marginTop: '4px', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500 }}>Team Members</div>
        </div>
        {tier !== 'prestige' && (
          <div style={{ fontSize: '10px', color: C.muted, fontStyle: 'italic', textAlign: 'right', maxWidth: '140px' }}>
            Upgrade to Prestige for unlimited team
          </div>
        )}
      </div>

      {/* Add button */}
      <button
        onClick={() => { if (canAddMore) setShowAdd(true); }}
        disabled={!canAddMore}
        style={{
          background: canAddMore ? C.gold : C.border,
          color: canAddMore ? C.ivory : C.muted,
          border: 'none', borderRadius: '12px',
          padding: '14px', marginBottom: '14px',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px', fontWeight: 600,
          letterSpacing: '1.8px', textTransform: 'uppercase',
          cursor: canAddMore ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          width: '100%',
        }}
      >
        <Plus size={14} /> {canAddMore ? 'Add Team Member' : `Limit reached (${limit})`}
      </button>

      {/* List */}
      {members.length === 0 ? (
        <Empty icon={<Users size={28} color={C.light} />} title="No team members yet" sub="Add your first team member to collaborate on clients, events, and tasks." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {members.map((m: any) => (
            <div key={m.id} style={{
              background: C.ivory, borderRadius: '12px',
              border: `1px solid ${C.border}`, padding: '14px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%',
                background: m.is_active === false ? C.pearl : C.goldSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Playfair Display', serif",
                fontSize: '16px', color: C.goldDeep, flexShrink: 0,
              }}>{(m.name || '?')[0].toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', color: C.dark, fontWeight: 500 }}>{m.name}</div>
                <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>
                  {m.role || 'Team'}
                  {m.phone && ` · ${m.phone}`}
                  {m.is_active === false && ' · inactive'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {m.phone && (
                  <a href={`tel:${m.phone}`} aria-label="Call" style={{
                    background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                    borderRadius: '50%', width: '32px', height: '32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textDecoration: 'none',
                  }}><Phone size={12} color={C.goldDeep} /></a>
                )}
                <button
                  onClick={() => setEditingMember(m)}
                  aria-label="Edit"
                  style={{
                    background: 'transparent', border: `1px solid ${C.border}`,
                    borderRadius: '50%', width: '32px', height: '32px',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                ><Edit2 size={12} color={C.muted} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add sheet */}
      {showAdd && (
        <TeamMemberSheet
          title="Add Team Member"
          initial={{}}
          onClose={() => setShowAdd(false)}
          onSave={async (payload) => {
            const ok = await addMember(payload);
            if (ok) setShowAdd(false);
            return ok;
          }}
        />
      )}

      {/* Edit sheet */}
      {editingMember && (
        <TeamMemberSheet
          title="Edit Team Member"
          initial={editingMember}
          onClose={() => setEditingMember(null)}
          onSave={async (payload) => {
            const ok = await updateMember(editingMember.id, payload);
            if (ok) setEditingMember(null);
            return ok;
          }}
          onDelete={async () => {
            await removeMember(editingMember.id);
            setEditingMember(null);
          }}
        />
      )}
    </>
  );
}

function TeamMemberSheet({ title, initial, onClose, onSave, onDelete }: {
  title: string;
  initial: any;
  onClose: () => void;
  onSave: (payload: any) => Promise<boolean>;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [role, setRole] = useState(initial?.role || TEAM_ROLES[0]);
  const [phone, setPhone] = useState(initial?.phone || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [isActive, setIsActive] = useState(initial?.is_active !== false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSave = name.trim() && !submitting;

  const handleSave = async () => {
    if (!canSave) return;
    setError('');
    setSubmitting(true);
    const ok = await onSave({
      name: name.trim(),
      role,
      phone: phone.trim() || null,
      email: email.trim() || null,
      is_active: isActive,
    });
    if (!ok) { setError('Could not save. Please try again.'); setSubmitting(false); }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(26,20,16,0.62)', zIndex: 200,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          background: C.ivory,
          borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
          padding: '24px 22px calc(env(safe-area-inset-bottom) + 22px)',
          maxHeight: '92dvh', overflowY: 'auto',
          boxShadow: '0 -8px 40px rgba(26,20,16,0.24)',
        }}
      >
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: C.border, margin: '0 auto 18px' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: C.dark }}>{title}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }}>
            <X size={16} color={C.muted} />
          </button>
        </div>

        <FormLabel>Name</FormLabel>
        <input
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          style={{ width: '100%', background: C.pearl, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '13px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: C.dark, outline: 'none', boxSizing: 'border-box', marginBottom: '14px' }}
        />

        <FormLabel>Role</FormLabel>
        <select
          value={role} onChange={(e) => setRole(e.target.value)}
          style={{ width: '100%', background: C.pearl, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '13px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: C.dark, outline: 'none', boxSizing: 'border-box', marginBottom: '14px', appearance: 'none' }}
        >
          {TEAM_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <FormLabel>Phone (optional)</FormLabel>
        <input
          type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98765 43210"
          style={{ width: '100%', background: C.pearl, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '13px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: C.dark, outline: 'none', boxSizing: 'border-box', marginBottom: '14px' }}
        />

        <FormLabel>Email (optional)</FormLabel>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          autoCapitalize="none"
          style={{ width: '100%', background: C.pearl, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '13px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: C.dark, outline: 'none', boxSizing: 'border-box', marginBottom: '14px' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <input
            type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
            id="member-active"
            style={{ width: '16px', height: '16px', accentColor: C.gold }}
          />
          <label htmlFor="member-active" style={{ fontSize: '13px', color: C.dark }}>Active</label>
        </div>

        {error && <div style={{ background: C.redSoft, border: `1px solid ${C.redBorder}`, borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: C.red, marginBottom: '14px' }}>{error}</div>}

        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            width: '100%',
            background: canSave ? C.gold : C.border,
            color: canSave ? C.ivory : C.muted,
            border: 'none', borderRadius: '12px', padding: '14px',
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
            letterSpacing: '1.8px', textTransform: 'uppercase',
            cursor: canSave ? 'pointer' : 'not-allowed',
            marginBottom: onDelete ? '10px' : 0,
          }}
        >{submitting ? 'Saving…' : 'Save'}</button>

        {onDelete && (
          <button
            onClick={() => { if (confirm('Remove this team member?')) onDelete(); }}
            style={{
              width: '100%', background: 'transparent',
              color: C.red, border: `1px solid ${C.redBorder}`,
              borderRadius: '12px', padding: '12px',
              fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
              letterSpacing: '1.5px', textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >Remove Member</button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// BROADCAST PANEL — Signature+, compose + recipient picker + one-at-a-time send
// ══════════════════════════════════════════════════════════════════════════

const BROADCAST_TEMPLATES = [
  { id: 'custom',     label: 'Custom', body: '' },
  { id: 'reminder',   label: 'Payment Reminder', body: 'Hi {{name}}, gentle reminder — there\'s a pending payment on your account. Please let me know if you have any questions. Thanks!' },
  { id: 'confirm',    label: 'Event Confirmation', body: 'Hi {{name}}, confirming your event is on schedule. I\'m looking forward to working with you. Let me know if anything changes.' },
  { id: 'seasonal',   label: 'Seasonal Greeting', body: 'Hi {{name}}, wishing you and your family a beautiful festive season. Looking forward to celebrating your special moments!' },
  { id: 'portfolio',  label: 'Portfolio Update', body: 'Hi {{name}}, just refreshed my portfolio with recent work. Would love your thoughts. More soon!' },
  { id: 'feedback',   label: 'Feedback Request', body: 'Hi {{name}}, hope you loved the photos / services! Would mean the world if you could share a quick review.' },
];

function BroadcastPanel({ session, tier, clients }: { session: VendorSession; tier: Tier; clients: any[] }) {
  const [template, setTemplate] = useState('custom');
  const [message, setMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [step, setStep] = useState<'compose' | 'send'>('compose');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!session?.vendorId) return;
    fetch(`${API}/api/broadcasts/${session.vendorId}`)
      .then(r => r.json())
      .then(d => setHistory(d?.data || []))
      .catch(() => {});
  }, [session?.vendorId]);

  const chooseTemplate = (id: string) => {
    setTemplate(id);
    const def = BROADCAST_TEMPLATES.find(t => t.id === id);
    if (def && def.body) setMessage(def.body);
  };

  const toggleClient = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const recipients = clients.filter((c: any) => selectedIds.includes(c.id) && c.phone);
  const canProceed = message.trim().length > 10 && recipients.length > 0;

  const startSending = () => {
    if (!canProceed) return;
    setSentIds([]);
    setStep('send');
  };

  const sendToClient = (c: any) => {
    const personalized = message.replace(/\{\{name\}\}/g, c.name || 'there');
    const phoneDigits = (c.phone || '').replace(/\D/g, '').slice(-10);
    window.location.href = `https://wa.me/91${phoneDigits}?text=${encodeURIComponent(personalized)}`;
    setSentIds(prev => prev.includes(c.id) ? prev : [...prev, c.id]);
  };

  const logBroadcast = async () => {
    if (sentIds.length === 0) { setStep('compose'); return; }
    try {
      await fetch(`${API}/api/broadcasts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: session.vendorId,
          template: template === 'custom' ? null : template,
          message,
          recipient_count: recipients.length,
          sent_count: sentIds.length,
        }),
      });
      const r = await fetch(`${API}/api/broadcasts/${session.vendorId}`);
      const d = await r.json();
      setHistory(d?.data || []);
    } catch { /* silent */ }
    // Reset
    setMessage(''); setTemplate('custom'); setSelectedIds([]); setSentIds([]);
    setStep('compose');
  };

  if (step === 'send') {
    return (
      <>
        <div style={{ background: C.ivory, borderRadius: '16px', border: `1px solid ${C.goldBorder}`, padding: '16px 18px', marginBottom: '12px' }}>
          <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.goldDeep, marginBottom: '8px' }}>Sending · {sentIds.length} / {recipients.length}</div>
          <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.55, fontStyle: 'italic' }}>
            Tap each recipient below — WhatsApp opens with the personalized message. Send it, then return and tap the next.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
          {recipients.map((c: any) => {
            const sent = sentIds.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => sendToClient(c)}
                style={{
                  background: sent ? C.greenSoft : C.ivory,
                  border: `1px solid ${sent ? 'rgba(76,175,80,0.3)' : C.border}`,
                  borderRadius: '12px', padding: '14px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  textAlign: 'left', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: sent ? C.green : '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {sent ? <CheckCircle size={14} color={C.ivory} /> : <MessageCircle size={14} color={C.ivory} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: C.dark, fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: '11px', color: C.muted }}>{c.phone}</div>
                </div>
                <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: sent ? C.green : C.goldDeep }}>
                  {sent ? 'Sent' : 'Send'}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={logBroadcast}
          style={{
            background: C.gold, color: C.ivory, border: 'none', borderRadius: '12px',
            padding: '14px', width: '100%',
            fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
            letterSpacing: '1.8px', textTransform: 'uppercase', cursor: 'pointer',
          }}
        >Done · Log Broadcast</button>
      </>
    );
  }

  return (
    <>
      {/* Template picker */}
      <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.goldDeep, marginBottom: '10px' }}>Template</div>
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '14px' }}>
        {BROADCAST_TEMPLATES.map(t => {
          const active = template === t.id;
          return (
            <button
              key={t.id}
              onClick={() => chooseTemplate(t.id)}
              style={{
                background: active ? C.goldSoft : C.ivory,
                border: `1px solid ${active ? C.goldBorder : C.border}`,
                borderRadius: '50px', padding: '8px 14px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '10px', fontWeight: active ? 600 : 500,
                letterSpacing: '1.5px', textTransform: 'uppercase',
                color: active ? C.goldDeep : C.muted,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >{t.label}</button>
          );
        })}
      </div>

      {/* Message composer */}
      <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.goldDeep, marginBottom: '10px' }}>Message</div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        placeholder="Type your message. Use {{name}} to personalize with each client's name."
        style={{
          width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '14px', fontSize: '13px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif', lineHeight: 1.55,
          resize: 'vertical', outline: 'none', boxSizing: 'border-box',
          marginBottom: '8px',
        }}
      />
      <div style={{ fontSize: '10px', color: C.muted, marginBottom: '14px', fontStyle: 'italic' }}>
        Tip: {'{{name}}'} becomes each client's name automatically.
      </div>

      {/* Recipient picker */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
        <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.goldDeep }}>Recipients · {selectedIds.length}</div>
        <button
          onClick={() => setSelectedIds(selectedIds.length === clients.length ? [] : clients.filter((c: any) => c.phone).map((c: any) => c.id))}
          style={{
            background: 'transparent', border: 'none',
            fontSize: '10px', color: C.goldDeep, fontWeight: 600,
            letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer',
            padding: 0,
          }}
        >{selectedIds.length === clients.length ? 'Clear' : 'Select All'}</button>
      </div>
      {clients.length === 0 ? (
        <Empty icon={<Users size={28} color={C.light} />} title="No clients" sub="Add clients first to send broadcasts." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px', maxHeight: '320px', overflowY: 'auto' }}>
          {clients.map((c: any) => {
            const selected = selectedIds.includes(c.id);
            const hasPhone = !!c.phone;
            return (
              <button
                key={c.id}
                onClick={() => hasPhone && toggleClient(c.id)}
                disabled={!hasPhone}
                style={{
                  background: selected ? C.goldSoft : (hasPhone ? C.ivory : C.pearl),
                  border: `1px solid ${selected ? C.goldBorder : C.border}`,
                  borderRadius: '10px', padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: hasPhone ? 'pointer' : 'not-allowed',
                  opacity: hasPhone ? 1 : 0.5,
                  fontFamily: 'inherit', textAlign: 'left',
                }}
              >
                <div style={{
                  width: '18px', height: '18px', borderRadius: '4px',
                  background: selected ? C.gold : 'transparent',
                  border: `1.5px solid ${selected ? C.gold : C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {selected && <CheckCircle size={10} color={C.ivory} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: C.dark, fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: '10px', color: C.muted }}>
                    {c.phone || 'No phone — cannot broadcast'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Send button */}
      <button
        onClick={startSending}
        disabled={!canProceed}
        style={{
          background: canProceed ? C.gold : C.border,
          color: canProceed ? C.ivory : C.muted,
          border: 'none', borderRadius: '12px', padding: '14px',
          fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600,
          letterSpacing: '1.8px', textTransform: 'uppercase',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          width: '100%', marginBottom: '14px',
        }}
      >
        Review · Send to {recipients.length} {recipients.length === 1 ? 'Client' : 'Clients'}
      </button>

      {/* Past broadcasts */}
      {history.length > 0 && (
        <>
          <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.goldDeep, marginBottom: '10px' }}>Recent Broadcasts</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {history.slice(0, 10).map((h: any) => (
              <div key={h.id} style={{ background: C.pearl, borderRadius: '10px', border: `1px solid ${C.borderSoft}`, padding: '10px 14px' }}>
                <div style={{ fontSize: '12px', color: C.dark, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {(h.message || '').substring(0, 80)}{h.message?.length > 80 ? '…' : ''}
                </div>
                <div style={{ fontSize: '10px', color: C.muted, marginTop: '3px' }}>
                  {h.sent_count || 0}/{h.recipient_count || 0} sent · {h.sent_at ? new Date(h.sent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TEAM CHAT PANEL — Prestige only, polling-based 3s interval
// ══════════════════════════════════════════════════════════════════════════

function TeamChatPanel({ session, tier }: { session: VendorSession; tier: Tier }) {
  const [team, setTeam] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [composerText, setComposerText] = useState('');
  const [activeChannel, setActiveChannel] = useState<{ type: 'group'; id: 'general' } | { type: 'direct'; id: string }>({ type: 'group', id: 'general' });
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load team
  useEffect(() => {
    if (!session?.vendorId) return;
    fetch(`${API}/api/ds/team/${session.vendorId}`)
      .then(r => r.json())
      .then(d => setTeam(d?.data || []))
      .catch(() => {});
  }, [session?.vendorId]);

  // Polling — 3s interval, pauses when page is backgrounded
  useEffect(() => {
    if (!session?.vendorId) return;
    let cancelled = false;
    const fetchMessages = async () => {
      try {
        const params = new URLSearchParams();
        params.set('channel_type', activeChannel.type);
        params.set('channel_id', activeChannel.id);
        const r = await fetch(`${API}/api/ds/messages/${session.vendorId}?${params.toString()}`);
        const d = await r.json();
        if (!cancelled && d?.success) setMessages(d.data || []);
      } catch { /* silent */ }
    };
    fetchMessages();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchMessages();
      }
    }, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [session?.vendorId, activeChannel.type, activeChannel.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const sendMessage = async () => {
    const text = composerText.trim();
    if (!text || !session?.vendorId || sending) return;
    setSending(true);
    try {
      const r = await fetch(`${API}/api/ds/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: session.vendorId,
          sender_id: session.vendorId,
          sender_name: session.vendorName || 'Owner',
          channel_type: activeChannel.type,
          channel_id: activeChannel.id,
          message: text,
          message_type: 'text',
        }),
      });
      const d = await r.json();
      if (d?.success && d.data) {
        setMessages(prev => [...prev, d.data]);
        setComposerText('');
      }
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  // Channel list: General + each team member
  const channels: { key: string; label: string; meta: any }[] = [
    { key: 'group:general', label: '# general', meta: { type: 'group', id: 'general' } },
    ...team.map(m => ({
      key: `direct:${m.id}`,
      label: m.name,
      meta: { type: 'direct', id: m.id },
    })),
  ];

  const activeKey = `${activeChannel.type}:${activeChannel.id}`;

  if (team.length === 0) {
    return (
      <div style={{ background: C.champagne, border: `1px solid ${C.goldBorder}`, borderRadius: '18px', padding: '24px 22px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent 0%, ${C.gold} 50%, transparent 100%)` }} />
        <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: C.goldDeep, marginBottom: '10px' }}>Team Chat</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: C.dark, lineHeight: 1.4, marginBottom: '8px' }}>Invite team members first.</div>
        <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.55, maxWidth: '320px', margin: '0 auto 16px' }}>Chat needs at least one teammate. Add them from the Team tool.</div>
      </div>
    );
  }

  return (
    <>
      {/* Channel selector (horizontal chips) */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '12px' }}>
        {channels.map(ch => {
          const active = activeKey === ch.key;
          return (
            <button
              key={ch.key}
              onClick={() => setActiveChannel(ch.meta)}
              style={{
                background: active ? C.goldSoft : C.ivory,
                border: `1px solid ${active ? C.goldBorder : C.border}`,
                borderRadius: '50px', padding: '8px 14px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px', fontWeight: active ? 600 : 500,
                color: active ? C.goldDeep : C.muted,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >{ch.label}</button>
          );
        })}
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        style={{
          background: C.ivory, border: `1px solid ${C.border}`, borderRadius: '16px',
          height: '52dvh', overflowY: 'auto', padding: '14px',
          display: 'flex', flexDirection: 'column', gap: '10px',
          marginBottom: '10px',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: '12px', fontStyle: 'italic' }}>
            No messages in this channel yet.
          </div>
        ) : (
          messages.map((m: any) => {
            const isOwner = m.sender_id === session.vendorId;
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: isOwner ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%',
                  background: isOwner ? C.goldSoft : C.pearl,
                  border: `1px solid ${isOwner ? C.goldBorder : C.borderSoft}`,
                  borderRadius: '14px',
                  borderTopRightRadius: isOwner ? '4px' : '14px',
                  borderTopLeftRadius: isOwner ? '14px' : '4px',
                  padding: '10px 14px',
                }}>
                  {!isOwner && (
                    <div style={{ fontSize: '10px', color: C.goldDeep, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {m.sender_name || 'Team'}
                    </div>
                  )}
                  <div style={{ fontSize: '13px', color: C.dark, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {m.message}
                  </div>
                  <div style={{ fontSize: '9px', color: C.light, marginTop: '4px', textAlign: isOwner ? 'right' : 'left' }}>
                    {m.created_at ? new Date(m.created_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : ''}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea
          value={composerText}
          onChange={(e) => setComposerText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          rows={1}
          placeholder="Type a message…"
          style={{
            flex: 1, background: C.ivory, border: `1px solid ${C.border}`,
            borderRadius: '22px', padding: '11px 16px',
            fontSize: '14px', color: C.dark,
            fontFamily: 'DM Sans, sans-serif', lineHeight: 1.4,
            resize: 'none', outline: 'none', boxSizing: 'border-box',
            maxHeight: '100px',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!composerText.trim() || sending}
          aria-label="Send"
          style={{
            background: composerText.trim() ? C.gold : C.border,
            border: 'none', borderRadius: '50%',
            width: '42px', height: '42px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: composerText.trim() ? 'pointer' : 'not-allowed',
            flexShrink: 0,
          }}
        >
          <Send size={16} color={composerText.trim() ? C.ivory : C.muted} />
        </button>
      </div>
    </>
  );
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'DM Sans, sans-serif',
      fontSize: '9px', fontWeight: 600,
      letterSpacing: '2px', textTransform: 'uppercase',
      color: C.muted, marginBottom: '6px',
    }}>{children}</div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PROFILE SCREEN — full-screen overlay opened by tapping the avatar
// Replaces the old More tab. Contains: identity, subscription, key actions,
// beta mocks for Dream Ai / Power Mode, sign out.
// ══════════════════════════════════════════════════════════════════════════

function ProfileScreen({
  session, tier, vendorData, aiStatus,
  onClose, onToast,
}: {
  session: VendorSession;
  tier: Tier;
  vendorData: any;
  aiStatus: any;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const tierLabel = tier === 'prestige' ? 'Prestige' : tier === 'signature' ? 'Signature' : 'Essential';
  const tierPrice = tier === 'prestige' ? '₹3,999/mo' : tier === 'signature' ? '₹1,999/mo' : '₹499/mo';
  const name = session.vendorName || 'Vendor';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || 'V';

  const handleLogout = () => {
    if (!confirm('Sign out?')) return;
    localStorage.removeItem('vendor_web_session');
    window.location.href = '/vendor/mobile/login';
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: C.cream,
      zIndex: 250,
      overflowY: 'auto',
      maxWidth: '480px', margin: '0 auto',
      paddingBottom: 'calc(40px + env(safe-area-inset-bottom))',
    }}>
      {/* Header */}
      <div style={{
        padding: 'calc(env(safe-area-inset-top) + 14px) 18px 12px',
        background: C.cream,
        borderBottom: `1px solid ${C.borderSoft}`,
        position: 'sticky', top: 0, zIndex: 2,
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          onClick={onClose}
          aria-label="Close profile"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px',
            display: 'flex', alignItems: 'center',
          }}
        ><X size={20} color={C.dark} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '10px', color: C.muted, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 500 }}>Profile</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: C.dark, lineHeight: 1.15, letterSpacing: '0.2px' }}>Settings & Account</div>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Identity card */}
        <div style={{
          background: C.ivory, borderRadius: '18px',
          border: `1px solid ${C.goldBorder}`, padding: '22px 20px',
          display: 'flex', alignItems: 'center', gap: '16px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
            background: `linear-gradient(90deg, transparent 0%, ${C.gold} 50%, transparent 100%)`,
          }} />
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: tier === 'prestige' ? C.dark : tier === 'signature' ? C.goldSoft : C.pearl,
            border: `2px solid ${tier === 'prestige' ? C.gold : tier === 'signature' ? C.goldBorder : C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            fontFamily: "'Playfair Display', serif",
            fontSize: '22px', fontWeight: 500,
            color: tier === 'prestige' ? C.gold : tier === 'signature' ? C.goldDeep : C.muted,
          }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: C.dark, letterSpacing: '0.2px', lineHeight: 1.2 }}>{name}</div>
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '3px', fontStyle: 'italic' }}>
              {(session.category || 'Vendor').replace(/-/g, ' ')}{session.city ? ` · ${session.city}` : ''}
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div style={{
          background: C.ivory, borderRadius: '16px',
          border: `1px solid ${C.border}`, padding: '18px 20px',
        }}>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '9px', fontWeight: 600,
            letterSpacing: '2.5px', textTransform: 'uppercase',
            color: C.goldDeep, marginBottom: '10px',
          }}>Subscription</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: C.dark }}>{tierLabel}</div>
              <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>{tierPrice}</div>
            </div>
            {session.trialEnd && (
              <div style={{ background: C.goldSoft, border: `1px solid ${C.goldBorder}`, borderRadius: '50px', padding: '4px 10px' }}>
                <span style={{ fontSize: '10px', color: C.goldDeep, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Trial ends {new Date(session.trialEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions list */}
        <div style={{ background: C.ivory, borderRadius: '16px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          {[
            { icon: SettingsIcon, label: 'Edit profile',          href: '/vendor/mobile/profile/edit',       external: false },
            { icon: Briefcase,    label: 'Open business portal', href: '/vendor/mobile/profile/edit',    external: true },
          ].map((item, idx, arr) => {
            const I = item.icon;
            return (
              <a
                key={idx}
                href={item.href}
                {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '16px 18px',
                  borderBottom: idx < arr.length - 1 ? `1px solid ${C.borderSoft}` : 'none',
                  color: C.dark, textDecoration: 'none',
                }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}><I size={14} color={C.goldDeep} /></div>
                <span style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>{item.label}</span>
                <ChevronRight size={14} color={C.light} />
              </a>
            );
          })}
        </div>

        {/* Beta features (mock) */}
        <div style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '9px', fontWeight: 600,
          letterSpacing: '2.5px', textTransform: 'uppercase',
          color: C.goldDeep, marginTop: '4px', paddingLeft: '4px',
        }}>Beta Features</div>
        <div style={{ background: C.ivory, borderRadius: '16px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          {[
            { icon: Zap,          label: 'Dream Ai',   desc: 'WhatsApp AI assistant' },
            { icon: TrendingDown, label: 'Power Mode', desc: 'Boost discoverability' },
          ].map((item, idx, arr) => {
            const I = item.icon;
            return (
              <button
                key={idx}
                onClick={() => onToast(`${item.label} — coming soon. We'll notify you when it's live.`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '16px 18px', width: '100%',
                  borderBottom: idx < arr.length - 1 ? `1px solid ${C.borderSoft}` : 'none',
                  color: C.dark, textDecoration: 'none',
                  background: 'transparent', border: 'none', textAlign: 'left',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}><I size={14} color={C.goldDeep} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.label}
                    <span style={{
                      background: C.dark, color: C.gold,
                      fontSize: '8px', fontWeight: 700,
                      letterSpacing: '1.2px', textTransform: 'uppercase',
                      padding: '2px 6px', borderRadius: '3px',
                    }}>Beta</span>
                  </div>
                  <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px', fontStyle: 'italic' }}>{item.desc}</div>
                </div>
                <ChevronRight size={14} color={C.light} />
              </button>
            );
          })}
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent',
            border: `1px solid ${C.redBorder}`,
            borderRadius: '14px', padding: '14px',
            color: C.red, fontWeight: 600, fontSize: '11px',
            letterSpacing: '1.8px', textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontFamily: 'DM Sans, sans-serif', marginTop: '6px',
          }}
        ><LogOut size={14} /> Sign Out</button>

        <div style={{ fontSize: '10px', color: C.light, textAlign: 'center', marginTop: '4px' }}>
          thedreamwedding.in · v2.1
        </div>
      </div>
    </div>
  );
}
