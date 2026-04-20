'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Grid, MessageCircle, Calendar, Tool, User, Plus, Phone, Send,
  FileText, CreditCard, Clock, Users, TrendingDown, Percent,
  Share2, BarChart2, Package, Gift, Globe, Award, ChevronRight, ChevronDown,
  LogOut, Settings as SettingsIcon, Lock, Briefcase, MapPin, Zap,
  CheckCircle, AlertCircle, X, Search, Mail, MoreHorizontal,
  Minus, Edit2, DollarSign, Tag, Trash2, Camera, Upload, Image as ImageIcon,
} from 'react-feather';
import { Sparkles } from 'lucide-react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const CLOUDINARY_CLOUD = 'dccso5ljv';
const CLOUDINARY_PRESET = 'dream_wedding_uploads';

// Upload a File to Cloudinary, returns secure_url or null on failure.
async function uploadToCloudinary(file: File): Promise<string | null> {
  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
      method: 'POST', body: fd,
    });
    const data = await res.json();
    return data?.secure_url || null;
  } catch {
    return null;
  }
}

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
  { id: 'expenses',  icon: Package,  label: 'Expense Tracker',  tab: 'Power' as Tab, sub: 'expenses' },
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

// ── Mobile keyboard fix ──────────────────────────────────────────────────
function scrollIntoViewOnFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  const target = e.target;
  if (!target) return;
  setTimeout(() => {
    try { target.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch {}
  }, 300);
}

// ── WhatsApp opener: works on PWA + mobile + desktop, forces English locale ──
// Format: digits only, prepend 91 if 10-digit Indian
function phoneForWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (digits.length === 10) return '91' + digits;
  return digits;
}
function openWhatsApp(phone: string | null | undefined, message: string) {
  const p = phoneForWhatsApp(phone);
  const params = new URLSearchParams();
  if (p) params.set('phone', p);
  params.set('text', message);
  const url = `https://api.whatsapp.com/send?${params.toString()}&lang=en`;
  if (typeof window !== 'undefined') {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

// ── Reusable SearchBar (pinned at top of list tools) ─────────────────────
function SearchBar({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div style={{
      position: 'sticky' as const, top: 0, zIndex: 5,
      background: 'rgba(250,246,240,0.92)', backdropFilter: 'blur(8px)' as const,
      WebkitBackdropFilter: 'blur(8px)' as const,
      padding: '8px 14px', borderBottom: '1px solid rgba(232,224,213,0.6)',
    }}>
      <div style={{
        display: 'flex' as const, alignItems: 'center' as const, gap: 8,
        background: '#FFFFFF', border: '1px solid #E8E0D5', borderRadius: 10,
        padding: '8px 12px',
      }}>
        <Search size={14} color="#8C7B6E" />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={scrollIntoViewOnFocus}
          placeholder={placeholder}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#2C2420',
          }}
        />
        {value && (
          <button onClick={() => onChange('')} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 2,
            display: 'flex' as const, alignItems: 'center' as const,
          }}>
            <X size={12} color="#8C7B6E" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function VendorMobilePage() {
  const [session, setSession] = useState<VendorSession | null>(null);
  const [mode, setMode] = useState<Mode>('Business');
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [activeSubTool, setActiveSubTool] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // ── Back-swipe / browser back / Android hardware back ─────────────────
  // Uses a ref-based stack so the popstate handler always reads current state.
  const navStackRef = useRef<string[]>([]);
  const backExitRef = useRef(false);
  const backTimerRef = useRef<any>(null);

  // Helpers to push/pop browser history in sync with nav stack
  const navPush = (layer: string) => {
    navStackRef.current.push(layer);
    window.history.pushState({ tdw: layer }, '');
  };
  const navReplace = (layers: string[]) => {
    navStackRef.current = layers;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Seed one entry so first back triggers popstate instead of leaving
    window.history.pushState({ tdw: 'root' }, '');

    const handlePop = () => {
      const layer = navStackRef.current.pop();
      if (!layer) {
        // At root — double-tap to exit
        if (backExitRef.current) return; // let browser navigate away
        backExitRef.current = true;
        setToast('Tap back again to exit');
        if (backTimerRef.current) clearTimeout(backTimerRef.current);
        backTimerRef.current = setTimeout(() => { backExitRef.current = false; }, 2000);
        window.history.pushState({ tdw: 'root' }, '');
        return;
      }
      // Prevent browser from actually going back — push a replacement entry
      window.history.pushState({ tdw: 'restore' }, '');

      if (layer === 'profile') setShowProfile(false);
      else if (layer === 'addClient') { resetAddClient(); setShowAddClient(false); }
      else if (layer === 'invoice') setShowQuickInvoice(false);
      else if (layer === 'block') setShowQuickBlock(false);
      else if (layer === 'reminder') setShowQuickReminder(false);
      else if (layer === 'todo') setShowQuickTodo(false);
      else if (layer === 'event') setShowQuickEvent(false);
      else if (layer === 'aiModal') setShowAiModal(false);
      else if (layer === 'subtool') setActiveSubTool(null);
      else if (layer.startsWith('tab:')) setActiveTab('Overview');
    };

    window.addEventListener('popstate', handlePop);
    return () => {
      window.removeEventListener('popstate', handlePop);
      if (backTimerRef.current) clearTimeout(backTimerRef.current);
    };
  }, []);

  // Data
  const [bookings, setBookings] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [paymentSchedules, setPaymentSchedules] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
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

  // ── Nav-aware openers (push to back stack when opening) ───────────────
  const openProfile = () => { setShowProfile(true); navPush('profile'); };
  const openAddClient = () => { setShowAddClient(true); navPush('addClient'); };
  const openInvoice = () => { setShowQuickInvoice(true); navPush('invoice'); };
  const openBlock = () => { setShowQuickBlock(true); navPush('block'); };
  const openReminder = () => { setShowQuickReminder(true); navPush('reminder'); };
  const openTodo = () => { setShowQuickTodo(true); navPush('todo'); };
  const openEvent = () => { setShowQuickEvent(true); navPush('event'); };
  const openAiModal = () => { setShowAiModal(true); navPush('aiModal'); };
  const openSubTool = (sub: string) => { setActiveSubTool(sub); navPush('subtool'); };
  const switchTab = (t: Tab) => {
    if (t !== activeTab) {
      setActiveTab(t);
      if (t !== 'Overview') navPush('tab:' + t);
    }
  };

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
        const [bRes, iRes, cRes, blockRes, schedRes, vRes, aiRes, tRes, eRes, remRes, teamRes] = await Promise.all([
          fetch(`${API}/api/bookings/vendor/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/invoices/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/vendor-clients/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/availability/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/payment-schedules/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/vendors/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/ai-tokens/status/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/todos/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/events/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/reminders/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/team/${vId}`).then(r => r.json()).catch(() => ({})),
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
        if (remRes.success) setReminders(remRes.data || []);
        if (teamRes.success) setTeamMembers(teamRes.data || []);
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
        onOpenProfile={() => openProfile()}
      />

      {/* ── BODY ── */}
      <div style={{ padding: '8px 16px 24px' }}>
        {mode === 'Discovery' && <DiscoveryRouter session={session} />}

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
            reminders={reminders}
            events={events}
            loading={loading}
            onJumpToTab={(t: Tab) => {
              switchTab(t);
              if (typeof window !== 'undefined') {
                const pending = localStorage.getItem('tdw_pwa_open_sub');
                if (t === 'Power' && pending) {
                  openSubTool(pending);
                  localStorage.removeItem('tdw_pwa_open_sub');
                }
              }
            }}
            vendorData={vendorData}
            onOpenAiModal={() => openAiModal()}
            checklistDismissed={checklistDismissed}
            onDismissChecklist={dismissChecklist}
            onAddClient={() => openAddClient()}
            onOpenInvoice={() => openInvoice()}
            onOpenBlockDate={() => openBlock()}
            onOpenReminder={() => openReminder()}
            onOpenTodo={() => openTodo()}
            onOpenEvent={() => openEvent()}
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
              openSubTool(s);
            }}
            clients={clients}
            invoices={invoices}
            bookings={bookings}
            leads={leads}
            paymentSchedules={paymentSchedules}
            todos={todos}
            events={events}
            onAddClient={() => openAddClient()}
            onOpenInvoice={() => openInvoice()}
            onOpenTodo={() => openTodo()}
            onOpenEvent={() => openEvent()}
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
          <TeamPanel
            session={session}
            vendorName={session.vendorName}
            bookings={bookings}
            todos={todos}
            clients={clients}
          />
        )}

        {mode === 'Business' && activeTab === 'Power' && (
          <ToolsTab
            session={session}
            tier={tier}
            activeSubTool={activeSubTool}
            setActiveSubTool={openSubTool}
            clients={clients}
            invoices={invoices}
            bookings={bookings}
            leads={leads}
            paymentSchedules={paymentSchedules}
            todos={todos}
            events={events}
            blockedDates={blockedDates}
            onAddClient={() => openAddClient()}
            onOpenInvoice={() => openInvoice()}
            onOpenTodo={() => openTodo()}
            onOpenEvent={() => openEvent()}
            onOpenBlockDate={() => openBlock()}
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
            switchTab(t);
            if (typeof window !== 'undefined') {
              const pending = localStorage.getItem('tdw_pwa_open_sub');
              if (t === 'Power' && pending) {
                openSubTool(pending);
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

      {/* ── FLOATING AI BUTTON ──
          Overview shows Dream AI (WhatsApp chat).
          All other Business pages show PAi (action assistant).
          Both draggable on Y-axis, right-edge-snapped, position persists.
          Hidden entirely in Discovery mode. */}
      {mode === 'Business' && (
        <FloatingAssistant
          kind={activeTab === 'Overview' ? 'dreamai' : 'pai'}
          userType="vendor"
          userId={session.vendorId}
          onDreamAiClick={() => setShowAiModal(true)}
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
            // Don't close — sheet shows confirmation + WhatsApp share screen
          }}
          onClientCreated={(newClient: any) => {
            setClients(prev => [newClient, ...prev]);
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
          vendorName={session.vendorName}
          clients={clients}
          teamMembers={teamMembers}
          onClose={() => setShowQuickTodo(false)}
          onSaved={(newTodo: any) => { setTodos(prev => [newTodo, ...prev]); }}
          onClientCreated={(newClient: any) => {
            setClients(prev => [newClient, ...prev]);
          }}
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
  const name = session.vendorName || 'Vendor';
  const initial = (name[0] || 'V').toUpperCase();

  return (
    <div style={{
      padding: 'calc(env(safe-area-inset-top) + 12px) 16px 10px',
      background: C.cream,
      borderBottom: '1px solid rgba(201,168,76,0.18)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}>
      {/* Left — TDW wordmark */}
      <span style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 16, color: C.gold,
        fontWeight: 500, letterSpacing: '2px',
        flexShrink: 0,
      }}>TDW</span>

      {/* Center — ModeToggle */}
      <ModeToggle mode={mode} onChange={onModeChange} />

      {/* Right — Profile circle (single initial, dark + gold border) */}
      <button
        onClick={onOpenProfile}
        aria-label="Open profile"
        style={{
          width: 32, height: 32, borderRadius: 16,
          background: C.dark, border: `1px solid ${C.gold}`,
          cursor: 'pointer', flexShrink: 0,
          fontFamily: "'Playfair Display', serif",
          fontSize: 14, fontWeight: 500, color: C.gold,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0,
        }}
      >{initial}</button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// DASHBOARD TAB (mirrors React Native Overview)
// ══════════════════════════════════════════════════════════════════════════

function DashboardTab({ session, tier, bookings, invoices, clients, leads, paymentSchedules, todos, reminders, events, loading, onJumpToTab, vendorData, onOpenAiModal, checklistDismissed, onDismissChecklist, onAddClient, onOpenInvoice, onOpenBlockDate, onOpenReminder, onOpenTodo, onOpenEvent, onToggleTodo }: any) {
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

  // ── Computed: this week bookings ──
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const thisWeekCount = bookings.filter((b: any) => {
    if (!b.event_date) return false;
    const d = new Date(b.event_date);
    return d >= new Date() && d <= weekEnd;
  }).length;

  const hasAnyToday = todayBookings.length > 0 || thisWeekCount > 0 || pendingPayments > 0 || leads.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '8px' }}>

      {/* ══════════════════════════════════════════════════════════════════
          1. TODAY RIBBON — always visible (unless ALL stats zero for new vendor)
         ══════════════════════════════════════════════════════════════════ */}
      {hasAnyToday && (
        <div style={{
          background: `linear-gradient(180deg, ${C.champagne} 0%, ${C.goldSoft} 100%)`,
          borderRadius: '18px',
          padding: '22px 22px 20px',
          border: `1px solid ${C.goldBorder}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '18px' }}>
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '15px', fontWeight: 400,
              color: C.goldDeep, letterSpacing: '0.4px',
            }}>{today}</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.25)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', alignItems: 'end' }}>
            {[
              { num: todayBookings.length, label: 'Today',     highlight: todayBookings.length > 0 },
              { num: thisWeekCount,        label: 'This Wk',   highlight: thisWeekCount > 0 },
              { num: totalOwed > 0 ? fmtINR(totalOwed) : 0, prefix: totalOwed > 0 ? 'Rs.' : null, label: 'Pending', highlight: false, warn: totalOwed > 0 },
              { num: leads.length,         label: 'Enquiries', highlight: leads.length > 0 },
            ].map((stat: any, i: number, arr: any[]) => (
              <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
                <div style={{
                  display: 'inline-flex' as const,
                  alignItems: 'baseline' as const,
                  gap: 3,
                  color: stat.warn ? C.red : (stat.highlight ? C.gold : C.dark),
                  lineHeight: 1,
                }}>
                  {stat.prefix && (
                    <span style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '11px', fontWeight: 500,
                      letterSpacing: '0.5px',
                      opacity: 0.85,
                    }}>{stat.prefix}</span>
                  )}
                  <span style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '26px', fontWeight: 400,
                    letterSpacing: '-0.5px',
                    fontVariantNumeric: 'tabular-nums' as const,
                  }}>{stat.num}</span>
                </div>
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
      )}

      {/* ══════════════════════════════════════════════════════════════════
          2. QUICK ACTIONS — 7 actions, 4+3 grid, same for all tiers
         ══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const actions = [
          { icon: CheckCircle,   label: 'To-Do',      onClick: () => onOpenTodo && onOpenTodo() },
          { icon: Calendar,      label: 'Add Event',   onClick: () => onOpenEvent && onOpenEvent() },
          { icon: Users,         label: 'Add Client',  onClick: () => onAddClient && onAddClient() },
          { icon: Calendar,      label: 'Block Date',  onClick: () => onOpenBlockDate && onOpenBlockDate() },
          { icon: FileText,      label: 'Invoice',     onClick: () => onOpenInvoice && onOpenInvoice() },
          { icon: TrendingDown,  label: 'Expense',     onClick: () => { onJumpToTab('Power'); if (typeof window !== 'undefined') { localStorage.setItem('tdw_pwa_open_sub', 'expenses'); localStorage.setItem('tdw_pwa_open_create', '1'); } } },
          { icon: MessageCircle, label: 'Broadcast',   onClick: () => { onJumpToTab('Power'); if (typeof window !== 'undefined') localStorage.setItem('tdw_pwa_open_sub', 'whatsapp'); } },
        ];
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
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
          3. NEEDS ATTENTION HUB — only if items exist
         ══════════════════════════════════════════════════════════════════ */}
      <NeedsAttentionCard
        paymentSchedules={paymentSchedules}
        invoices={invoices}
        todos={todos}
        reminders={reminders}
        bookings={bookings}
        onJumpToTab={onJumpToTab}
      />

      {/* ══════════════════════════════════════════════════════════════════
          4. TODAY'S SCHEDULE — only if events/bookings today
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
          <div>
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
                    <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{it.time ? it.time + ' \u00b7 ' : ''}{it.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════
          5. TO-DO — pending tasks, top 5, with quick add
         ══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const todayDate = new Date(); todayDate.setHours(0,0,0,0);
        const pendingTodos = (todos || []).filter((t: any) => !t.done);
        if (pendingTodos.length === 0) return null;
        const overdueCountT = pendingTodos.filter((t: any) => t.due_date && new Date(t.due_date) < todayDate).length;
        const visible = pendingTodos.slice(0, 5);
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <SectionLabel>To-Do</SectionLabel>
              <button onClick={() => onOpenTodo && onOpenTodo()} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: '11px', color: C.goldDeep, fontWeight: 600, letterSpacing: '0.5px',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px',
              }}><Plus size={12} /> Add</button>
            </div>
            <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              {overdueCountT > 0 && (
                <div style={{
                  background: C.redSoft, padding: '8px 14px',
                  fontSize: '11px', color: C.red, fontWeight: 600,
                  borderBottom: `1px solid ${C.redBorder}`,
                }}>{overdueCountT} overdue</div>
              )}
              {visible.map((t: any, idx: number) => {
                const isOverdue = t.due_date && new Date(t.due_date) < todayDate;
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
                          {isOverdue ? 'Overdue \u00b7 ' : ''}{new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
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
                }}>View all {pendingTodos.length} \u2192</button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════
          6. PENDING ENQUIRIES — only if leads exist
         ══════════════════════════════════════════════════════════════════ */}
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
            display: 'flex', alignItems: 'center', gap: '12px',
            fontFamily: 'inherit',
            width: '100%',
          }}
        >
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
        </button>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          7. TEAM ACTIVITY FEED — Prestige only (moved up per Dev request)
         ══════════════════════════════════════════════════════════════════ */}
      {tier === 'prestige' && (
        <TeamActivityFeed vendorId={session?.vendorId} />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          8. NEXT EVENT — only if upcoming confirmed booking exists
         ══════════════════════════════════════════════════════════════════ */}
      {nextEvent && (
        <div style={{
          background: C.ivory,
          borderRadius: '18px',
          padding: '22px',
          border: `1px solid ${C.goldBorder}`,
          position: 'relative',
          overflow: 'hidden',
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
          }}>Your Next Event</div>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '26px', fontWeight: 400,
            color: C.dark, letterSpacing: '0.2px',
            marginBottom: '6px',
          }}>{nextEvent.users?.name || nextEvent.client_name || 'Client'}</div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px', color: C.muted, fontWeight: 400,
          }}>
            {nextEvent.event_date
              ? new Date(nextEvent.event_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
              : 'Date to be confirmed'}
            {nextEvent.venue ? ` \u00b7 ${nextEvent.venue}` : ''}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          9. OUTSTANDING — merged Money Owed + Overdue Schedules
         ══════════════════════════════════════════════════════════════════ */}
      {(unpaidInvoices.length > 0 || overdueSchedules.length > 0) && (
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
            }}>Outstanding</div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '22px', fontWeight: 400,
              color: C.dark, letterSpacing: '-0.3px',
            }}>{'\u20B9'}{fmtINR(totalOwed)}</div>
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
                }}>{'\u20B9'}{fmtINR(parseInt(inv.amount) || 0)}</div>
                {inv.client_phone && (
                  <a
                    href={`https://wa.me/91${String(inv.client_phone).replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${inv.client_name || ''}! Gentle reminder on invoice ${inv.invoice_number || ''} for \u20B9${(parseInt(inv.amount) || 0).toLocaleString('en-IN')}.`)}`}
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
            {overdueSchedules.length > 0 && unpaidInvoices.length > 0 && (
              <div style={{ height: 1, background: `rgba(201,168,76,0.18)`, margin: '4px 0' }} />
            )}
            {overdueSchedules.slice(0, 2).map((sched: any) => (
              <div key={sched.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: C.red, flexShrink: 0,
                }} />
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
          {(unpaidInvoices.length > 3 || overdueSchedules.length > 2) && (
            <button
              onClick={() => onJumpToTab('Power')}
              style={{
                background: 'none', border: 'none',
                fontSize: '11px', color: C.goldDeep, fontWeight: 600,
                letterSpacing: '1.5px', textTransform: 'uppercase',
                cursor: 'pointer', marginTop: '14px', padding: 0,
                fontFamily: 'inherit',
              }}
            >View all \u2192</button>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          10. BUSINESS PULSE — Signature & Prestige (15-day gate)
         ══════════════════════════════════════════════════════════════════ */}
      {(tier === 'signature' || tier === 'prestige') && hasEnoughData && (
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
            <div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '26px', color: C.dark, fontWeight: 400,
                letterSpacing: '-0.3px', lineHeight: 1,
              }}>{'\u20B9'}{fmtINR(revenueThisMonth)}</div>
              <div style={{
                fontSize: '9px', color: C.muted, marginTop: '4px',
                letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500,
              }}>Revenue</div>
            </div>
            <div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '26px', fontWeight: 400,
                color: revenueDelta == null ? C.muted : revenueDelta >= 0 ? C.green : C.red,
                letterSpacing: '-0.3px', lineHeight: 1,
              }}>
                {revenueDelta == null ? '\u2014' : (revenueDelta >= 0 ? '\u2197' : '\u2198') + ' ' + Math.abs(revenueDelta) + '%'}
              </div>
              <div style={{
                fontSize: '9px', color: C.muted, marginTop: '4px',
                letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500,
              }}>Vs Last Month</div>
            </div>
            <div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '22px', color: totalOwed > 0 ? C.dark : C.muted, fontWeight: 400,
                letterSpacing: '-0.3px', lineHeight: 1,
              }}>{'\u20B9'}{fmtINR(totalOwed)}</div>
              <div style={{
                fontSize: '9px', color: C.muted, marginTop: '4px',
                letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500,
              }}>Outstanding</div>
            </div>
            <div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '22px', color: C.dark, fontWeight: 400,
                letterSpacing: '-0.3px', lineHeight: 1,
              }}>{conversionRate == null ? '\u2014' : conversionRate + '%'}</div>
              <div style={{
                fontSize: '9px', color: C.muted, marginTop: '4px',
                letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500,
              }}>Conversion</div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          11. LEADS FOR YOU — Signature+ placeholder
         ══════════════════════════════════════════════════════════════════ */}
      {(tier === 'signature' || tier === 'prestige') && (
        <div style={{
          background: C.ivory,
          borderRadius: '18px',
          padding: '22px',
          border: `1px dashed ${C.goldBorder}`,
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '9px', fontWeight: 600,
            letterSpacing: '2.5px', textTransform: 'uppercase',
            color: C.goldDeep, marginBottom: '10px',
          }}>Leads for You</div>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '18px', color: C.dark, fontWeight: 400,
            letterSpacing: '0.2px', lineHeight: 1.4, marginBottom: '6px',
          }}>
            Coming soon.
          </div>
          <div style={{
            fontSize: '11px', color: C.muted, lineHeight: 1.55,
            maxWidth: '280px', margin: '0 auto',
          }}>
            Couples matching your budget and category, delivered to your dashboard.
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          12. PIPELINE — Signature & Prestige
         ══════════════════════════════════════════════════════════════════ */}
      {(tier === 'signature' || tier === 'prestige') && (newLeads.length > 0 || quotedBookings.length > 0 || confirmedThisMonth > 0) && (
        <div>
          <SectionLabel>Pipeline</SectionLabel>
          <div style={{
            background: C.ivory,
            borderRadius: '16px',
            border: `1px solid ${C.border}`,
            padding: '16px',
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px',
          }}>
            {[
              { label: 'New', count: newLeads.length, tone: C.goldSoft, border: C.goldBorder, text: C.goldDeep },
              { label: 'Quoted', count: quotedBookings.length, tone: C.pearl, border: C.border, text: C.muted },
              { label: 'Confirmed', count: confirmedThisMonth, tone: C.greenSoft || C.pearl, border: C.border, text: C.green || C.muted },
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
          13. REVENUE TREND — Signature & Prestige, last 6 months
         ══════════════════════════════════════════════════════════════════ */}
      {(tier === 'signature' || tier === 'prestige') && monthlyRevenue.some(m => m.amount > 0) && (
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
                    {i === 5 && m.amount > 0 && (
                      <div style={{
                        fontSize: '9px', color: C.goldDeep, fontWeight: 600,
                        textAlign: 'center', marginBottom: '4px',
                        letterSpacing: '0.5px',
                      }}>{'\u20B9'}{fmtINR(m.amount)}</div>
                    )}
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

      {/* ══════════════════════════════════════════════════════════════════
          14. ACTIVE EVENTS — Prestige only
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
          15. PROFILE COMPLETION — only if < 100%
         ══════════════════════════════════════════════════════════════════ */}
      {profileIncomplete && !checklistDismissed && vendorData && (
        <ProfileCompletionCard
          percent={profilePercent}
          steps={profileSteps}
          onDismiss={onDismissChecklist}
        />
      )}

      {/* ── CONTEXTUAL UPGRADE NUDGE — fires once per trigger ── */}
      {activeTrigger && (
        <UpgradeNudge
          trigger={activeTrigger}
          onDismiss={() => dismissNudge(activeTrigger!.key)}
        />
      )}

      {/* ── EMPTY STATE — new vendors with zero data ── */}
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
                    href={`https://api.whatsapp.com/send?phone=91${(b.users?.phone || b.client_phone).replace(/\D/g, '')}&text=${encodeURIComponent('Hi ' + (b.users?.name || b.client_name || '') + '! Thanks for your enquiry.')}&lang=en`}
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
          <input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)} style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: C.dark, fontFamily: 'inherit' }} onFocus={scrollIntoViewOnFocus} />
          <input type="text" placeholder="Reason" value={blockReason} onChange={e => setBlockReason(e.target.value)} style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: C.dark, fontFamily: 'inherit' }} onFocus={scrollIntoViewOnFocus} />
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
      title: 'Daily',
      tools: [
        { id: 'todos',  label: 'To-Do',  icon: CheckCircle, sub: 'todos',  minTier: 'essential', desc: 'Personal task list. Quick reminders, things to do today.' },
        { id: 'events', label: 'Events', icon: Calendar,    sub: 'events', minTier: 'essential', desc: 'Schedule trials, venue visits, prep meetings — anything not a booking.' },
      ],
    },
    {
      title: 'Money',
      tools: [
        { id: 'invoices',  label: 'Invoices',  icon: FileText,     sub: 'invoices',  minTier: 'essential', desc: 'Create, send, and track invoices. GST auto-calculated.' },
        { id: 'payments',  label: 'Payments',  icon: CreditCard,   sub: 'payments',  minTier: 'essential', desc: 'Payment schedules and outstanding amounts.' },
        { id: 'contracts', label: 'Contracts', icon: Briefcase,    sub: 'contracts', minTier: 'essential', desc: 'Service agreements, generated and tracked per client.' },
        { id: 'expenses',  label: 'Expense Tracker',  icon: Package, sub: 'expenses',  minTier: 'signature', desc: 'Track every expense, tag to clients, see what you profited after costs.' },
        { id: 'tax',       label: 'Tax & TDS', icon: Percent,      sub: 'tax',       minTier: 'signature', desc: 'GST invoices. Quarterly TDS summary. CA-ready exports.' },
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
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: C.muted, marginTop: '4px' }}>Every tool to run your business, in one place.</div>
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
    expenses: 'Expense Tracker', tax: 'Tax & TDS', team: 'My Team', referral: 'Referrals',
    whatsapp: 'Broadcast', analytics: 'Analytics', chat: 'Team Chat', todos: 'To-Do',
    inquiries: 'Enquiries', calendar: 'Calendar', events: 'Events',
  };

  // Invoice action sheet state (Turn 9H)
  const [activeInvoice, setActiveInvoice] = useState<any>(null);
  const [invoicesLocal, setInvoicesLocal] = useState<any[]>(invoices || []);
  useEffect(() => { setInvoicesLocal(invoices || []); }, [invoices]);

  // Search state (per-tool, resets when sub changes)
  const [search, setSearch] = useState('');
  useEffect(() => { setSearch(''); }, [sub]);
  const matches = (s: string | null | undefined) => !search || (s || '').toLowerCase().includes(search.toLowerCase());

  const handleInvoiceUpdate = (updated: any) => {
    setInvoicesLocal(prev => prev.map((i: any) => i.id === updated.id ? { ...i, ...updated } : i));
  };
  const handleInvoiceDelete = (id: string) => {
    setInvoicesLocal(prev => prev.filter((i: any) => i.id !== id));
  };

  const renderContent = () => {
    if (sub === 'clients') {
      const filteredClients = clients.filter((c: any) => matches(c.name) || matches(c.phone) || matches(c.email) || matches(c.event_type));
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
        <>
          <SearchBar value={search} onChange={setSearch} placeholder="Search clients by name, phone, email…" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {filteredClients.length === 0 ? (
              <div style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '20px', textAlign: 'center' as const, fontSize: '13px', color: C.muted }}>
                No clients match "{search}"
              </div>
            ) : filteredClients.map((c: any) => (
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
        </>
      );
    }

    if (sub === 'invoices') {
      const total = invoicesLocal.reduce((s: number, i: any) => s + (parseInt(i.amount) || 0), 0);
      const paid = invoicesLocal.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (parseInt(i.amount) || 0), 0);
      const unpaidCount = invoicesLocal.filter((i: any) => i.status !== 'paid').length;
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
            <>
              <SearchBar value={search} onChange={setSearch} placeholder="Search invoices by number, client, status…" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {invoicesLocal
                  .filter((inv: any) => matches(inv.client_name) || matches(inv.invoice_number) || matches(inv.status) || matches(String(inv.amount)))
                  .slice(0, 20).map((inv: any) => {
                const waMsg = `Hi ${inv.client_name || 'there'}, sharing your invoice from ${vendorName || 'our studio'} — ${inv.invoice_number || 'Invoice'} for ₹${fmtINR(parseInt(inv.amount) || 0)}${inv.status === 'paid' ? ' (paid)' : ''}. Please let me know if you have any questions.`;
                const waUrl = inv.client_phone
                  ? `https://wa.me/91${(inv.client_phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(waMsg)}`
                  : null;
                return (
                  <button
                    key={inv.id}
                    onClick={() => setActiveInvoice(inv)}
                    style={{
                      background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`,
                      padding: '14px', textAlign: 'left' as const, cursor: 'pointer',
                      fontFamily: 'inherit', width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', color: C.dark, fontWeight: 500 }}>{inv.client_name || 'Client'}</div>
                        <div style={{ fontSize: '11px', color: C.muted }}>{inv.invoice_number || `INV-${inv.id?.substring(0, 8)}`}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 600, color: C.dark, fontFamily: "'Playfair Display', serif", fontVariantNumeric: 'tabular-nums' as const }}>₹{fmtINR(parseInt(inv.amount) || 0)}</span>
                          <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase' as const, padding: '2px 8px', borderRadius: '50px', background: inv.status === 'paid' ? `${C.green}15` : C.goldSoft, color: inv.status === 'paid' ? C.green : C.goldDeep, border: `1px solid ${inv.status === 'paid' ? `${C.green}40` : C.goldBorder}` }}>{inv.status || 'unpaid'}</span>
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
                  </button>
                );
              })}
              </div>
            </>
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
      const matchEvent = (e: any) => matches(e.title) || matches(e.notes) || matches(e.event_type) || matches(e.linked_client_name);
      const upcoming = (events || [])
        .filter((e: any) => e.event_date && new Date(e.event_date) >= today)
        .filter(matchEvent)
        .sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
      const past = (events || [])
        .filter((e: any) => e.event_date && new Date(e.event_date) < today)
        .filter(matchEvent)
        .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
      return (
        <>
          {(events || []).length > 0 && (
            <SearchBar value={search} onChange={setSearch} placeholder="Search events by title, type, client…" />
          )}
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
        </>
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
      return <LegacyTeamPanel session={session} tier={tier} />;
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

      {/* ── Invoice Action Sheet (Turn 9H) ── */}
      {activeInvoice && (
        <InvoiceActionSheet
          invoice={activeInvoice}
          vendorName={vendorName}
          onClose={() => setActiveInvoice(null)}
          onUpdated={(upd: any) => {
            handleInvoiceUpdate(upd);
            setActiveInvoice(null);
          }}
          onDeleted={(id: string) => {
            handleInvoiceDelete(id);
            setActiveInvoice(null);
          }}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// INVOICE ACTION SHEET (Turn 9H)
// Tappable invoice opens this. Actions: Mark Paid/Unpaid, Share WhatsApp, Delete.
// Mark Paid on ≥ ₹30,000 triggers TDS prompt.
// ══════════════════════════════════════════════════════════════════════════

function InvoiceActionSheet({ invoice, vendorName, onClose, onUpdated, onDeleted }: {
  invoice: any;
  vendorName: string;
  onClose: () => void;
  onUpdated: (inv: any) => void;
  onDeleted: (id: string) => void;
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [showTds, setShowTds] = useState(false);
  const amt = parseInt(invoice.amount) || 0;
  const isPaid = invoice.status === 'paid';
  const TDS_THRESHOLD = 30000;

  const handleMarkPaid = async (opts?: { tds_deducted?: boolean; tds_rate?: number; tds_amount?: number }) => {
    setWorking(true); setError('');
    try {
      const r = await fetch(`${API}/api/invoices/${invoice.id}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts || {}),
      });
      const d = await r.json();
      if (d.success) onUpdated(d.data);
      else setError(d.error || 'Could not update.');
    } catch { setError('Network error.'); } finally { setWorking(false); }
  };

  const handleMarkUnpaid = async () => {
    if (!confirm('Mark as unpaid? Any TDS record will remain but can be edited in Tax & TDS.')) return;
    setWorking(true); setError('');
    try {
      const r = await fetch(`${API}/api/invoices/${invoice.id}/mark-unpaid`, { method: 'POST' });
      const d = await r.json();
      if (d.success) onUpdated(d.data);
      else setError(d.error || 'Could not update.');
    } catch { setError('Network error.'); } finally { setWorking(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this invoice? This cannot be undone.')) return;
    setWorking(true); setError('');
    try {
      const r = await fetch(`${API}/api/invoices/${invoice.id}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.success) onDeleted(invoice.id);
      else setError(d.error || 'Could not delete.');
    } catch { setError('Network error.'); } finally { setWorking(false); }
  };

  const waMsg = [
    `*Invoice from ${vendorName || 'our studio'}*`,
    invoice.invoice_number ? `Invoice no: ${invoice.invoice_number}` : '',
    `Issued: ${invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}`,
    invoice.client_name ? `Bill to: ${invoice.client_name}` : '',
    '',
    invoice.description ? `_${invoice.description}_` : '',
    invoice.description ? '' : '',
    `Amount: ₹${(amt).toLocaleString('en-IN')}`,
    isPaid ? `Status: ✓ PAID${invoice.paid_date ? ' on ' + new Date(invoice.paid_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}` : `Status: Pending`,
    '',
    isPaid ? 'Thank you for your payment.' : 'Please clear at your convenience. Reply here for any questions.',
  ].filter(Boolean).join('\n');
  const waUrl = invoice.client_phone
    ? `https://wa.me/91${(invoice.client_phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(waMsg)}`
    : `https://wa.me/?text=${encodeURIComponent(waMsg)}`;

  // If TDS prompt is open, render it instead
  if (showTds) {
    return (
      <TdsPromptSheet
        invoice={invoice}
        onClose={() => setShowTds(false)}
        onConfirm={(opts) => {
          setShowTds(false);
          handleMarkPaid(opts);
        }}
        onSkip={() => {
          setShowTds(false);
          handleMarkPaid({ tds_deducted: false });
        }}
      />
    );
  }

  return (
    <SheetOverlay onClose={onClose}>
      <SheetHeader
        eyebrow={invoice.invoice_number || 'Invoice'}
        title={invoice.client_name || 'Client'}
        onClose={onClose}
      />

      {/* INVOICE PREVIEW CARD — full document style */}
      <div style={{
        background: '#FFFFFF', border: `1px solid ${C.gold}`,
        borderRadius: 12, padding: '18px 18px 16px', marginBottom: 14,
        boxShadow: '0 2px 12px rgba(201,168,76,0.08)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.borderSoft}` }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' as const, color: C.goldDeep, marginBottom: 4 }}>Invoice</div>
            <div style={{ fontSize: 14, fontFamily: 'Playfair Display, serif', color: C.dark }}>{vendorName || '—'}</div>
          </div>
          <div style={{ textAlign: 'right' as const }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>{invoice.invoice_number || '—'}</div>
            <div style={{ fontSize: 10, color: C.light, marginTop: 2 }}>
              {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </div>
          </div>
        </div>

        {/* Bill to */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: C.muted, marginBottom: 3 }}>Bill to</div>
          <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>{invoice.client_name || 'Client'}</div>
          {invoice.client_phone && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>+91 {invoice.client_phone}</div>
          )}
        </div>

        {/* Description */}
        {invoice.description && (
          <div style={{
            background: C.pearl, borderRadius: 8, padding: '10px 12px',
            fontSize: 12, color: C.dark, marginBottom: 12, lineHeight: 1.5,
            fontStyle: 'italic' as const,
          }}>{invoice.description}</div>
        )}

        {/* Total + Status */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: C.muted, marginBottom: 2 }}>Amount due</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: C.dark, lineHeight: 1 }}>
              ₹{amt.toLocaleString('en-IN')}
            </div>
          </div>
          <span style={{
            fontSize: 9, fontWeight: 600, letterSpacing: '0.8px',
            textTransform: 'uppercase' as const,
            padding: '4px 12px', borderRadius: 50,
            background: isPaid ? `${C.green}15` : C.goldSoft,
            color: isPaid ? C.green : C.goldDeep,
            border: `1px solid ${isPaid ? `${C.green}40` : C.goldBorder}`,
          }}>{invoice.status || 'unpaid'}</span>
        </div>
        {isPaid && invoice.paid_date && (
          <div style={{ fontSize: 10, color: C.green, marginTop: 6, textAlign: 'right' as const }}>
            ✓ Paid on {new Date(invoice.paid_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        )}
      </div>

      {error && (
        <div style={{
          background: C.redSoft, border: `1px solid ${C.redBorder}`,
          borderRadius: 8, padding: '10px 12px',
          fontSize: 11, color: C.red, marginBottom: 12,
        }}>{error}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 10 }}>
        {!isPaid ? (
          <button
            onClick={() => {
              if (amt >= TDS_THRESHOLD) setShowTds(true);
              else handleMarkPaid({ tds_deducted: false });
            }}
            disabled={working}
            style={{
              padding: 14, borderRadius: 12,
              background: working ? C.pearl : C.dark, color: C.gold,
              border: 'none', cursor: working ? 'default' : 'pointer',
              fontSize: 12, fontWeight: 600, letterSpacing: '1.5px',
              textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <CheckCircle size={14} /> {working ? 'Updating…' : 'Mark as Paid'}
          </button>
        ) : (
          <button
            onClick={handleMarkUnpaid}
            disabled={working}
            style={{
              padding: 14, borderRadius: 12,
              background: 'transparent', color: C.muted,
              border: `1px solid ${C.border}`, cursor: working ? 'default' : 'pointer',
              fontSize: 12, fontWeight: 500, letterSpacing: '1.5px',
              textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {working ? 'Updating…' : 'Mark as Unpaid'}
          </button>
        )}

        <a
          href={waUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            padding: 14, borderRadius: 12,
            background: '#25D366', color: '#fff',
            textDecoration: 'none', textAlign: 'center' as const,
            fontSize: 12, fontWeight: 600, letterSpacing: '1.5px',
            textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Send size={14} /> Share on WhatsApp
        </a>

        <button
          onClick={handleDelete}
          disabled={working}
          style={{
            padding: 12, borderRadius: 12,
            background: 'transparent', color: '#C65757',
            border: `1px solid ${C.redBorder}`, cursor: working ? 'default' : 'pointer',
            fontSize: 11, fontWeight: 500, letterSpacing: '1.2px',
            textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Trash2 size={13} /> Delete Invoice
        </button>
      </div>
    </SheetOverlay>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TDS PROMPT SHEET (Turn 9H)
// Asks vendor whether TDS was deducted on a ≥ ₹30K invoice being marked paid.
// Rate chips: 10% (default), 2%, Custom. TDS amount is editable too.
// ══════════════════════════════════════════════════════════════════════════

function TdsPromptSheet({ invoice, onClose, onConfirm, onSkip }: {
  invoice: any;
  onClose: () => void;
  onConfirm: (opts: { tds_deducted: true; tds_rate: number; tds_amount: number }) => void;
  onSkip: () => void;
}) {
  const amt = parseInt(invoice.amount) || 0;
  const [rateMode, setRateMode] = useState<'10' | '2' | 'custom'>('10');
  const [customRate, setCustomRate] = useState('');
  const rate = rateMode === '10' ? 10 : rateMode === '2' ? 2 : (parseFloat(customRate) || 0);
  const autoTds = Math.round((amt * rate) / 100);
  const [tdsAmount, setTdsAmount] = useState<string>(String(autoTds));

  // Keep TDS amount in sync when rate changes
  useEffect(() => {
    setTdsAmount(String(autoTds));
  }, [rateMode, autoTds]);

  const net = amt - (parseInt(tdsAmount) || 0);

  const handleConfirm = () => {
    const finalRate = rate || 0;
    const finalAmount = parseInt(tdsAmount) || 0;
    onConfirm({ tds_deducted: true, tds_rate: finalRate, tds_amount: finalAmount });
  };

  return (
    <SheetOverlay onClose={onClose}>
      <SheetHeader
        eyebrow="TDS Deduction"
        title="Was TDS deducted?"
        onClose={onClose}
      />

      <div style={{
        background: C.champagne, border: `1px solid ${C.goldBorder}`,
        borderRadius: 12, padding: '14px 16px', marginBottom: 16,
        fontSize: 12, color: C.dark, lineHeight: 1.6,
      }}>
        This ₹{fmtINR(amt)} invoice is large enough that the client may have deducted TDS.
        If they did, log it here so your Tax & TDS ledger stays accurate.
      </div>

      {/* Rate chips */}
      <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: C.muted, fontWeight: 500, marginBottom: 8 }}>
        TDS Rate
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { v: '10' as const, label: '10%', hint: 'Default (194J)' },
          { v: '2' as const, label: '2%', hint: '194C' },
          { v: 'custom' as const, label: 'Custom', hint: '' },
        ].map(opt => (
          <button
            key={opt.v}
            onClick={() => setRateMode(opt.v)}
            style={{
              flex: 1, padding: '10px 8px', borderRadius: 10,
              background: rateMode === opt.v ? C.goldSoft : C.pearl,
              border: `1px solid ${rateMode === opt.v ? C.gold : C.border}`,
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2,
            }}
          >
            <span style={{
              fontSize: 13, fontWeight: rateMode === opt.v ? 600 : 500,
              color: rateMode === opt.v ? C.goldDeep : C.dark,
            }}>{opt.label}</span>
            {opt.hint && (
              <span style={{ fontSize: 9, color: C.muted }}>{opt.hint}</span>
            )}
          </button>
        ))}
      </div>

      {rateMode === 'custom' && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: C.muted, fontWeight: 500, marginBottom: 6 }}>Custom Rate</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: C.ivory, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '10px 12px',
          }}>
            <input
              type="text"
              inputMode="decimal"
              value={customRate}
              onChange={e => setCustomRate(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="e.g. 5"
              style={{
                flex: 1, background: 'transparent', border: 'none',
                fontSize: 15, color: C.dark, outline: 'none',
                fontFamily: "'Playfair Display', serif",
              }}
            onFocus={scrollIntoViewOnFocus} />
            <span style={{ color: C.muted, fontSize: 13 }}>%</span>
          </div>
        </div>
      )}

      {/* TDS amount — editable */}
      <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: C.muted, fontWeight: 500, marginBottom: 6 }}>
        TDS Amount (editable)
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: C.ivory, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: '10px 12px', marginBottom: 8,
      }}>
        <span style={{ color: C.goldDeep, fontFamily: "'Playfair Display', serif", fontSize: 16 }}>₹</span>
        <input
          type="text"
          inputMode="numeric"
          value={tdsAmount ? parseInt(tdsAmount).toLocaleString('en-IN') : ''}
          onChange={e => setTdsAmount(e.target.value.replace(/[^0-9]/g, ''))}
          style={{
            flex: 1, background: 'transparent', border: 'none',
            fontSize: 16, color: C.dark, outline: 'none',
            fontFamily: "'Playfair Display', serif",
          }}
        onFocus={scrollIntoViewOnFocus} />
      </div>

      <div style={{
        background: C.pearl, borderRadius: 10, padding: '10px 12px',
        marginBottom: 18, fontSize: 11, color: C.muted, lineHeight: 1.6,
      }}>
        Gross: <strong style={{ color: C.dark }}>₹{fmtINR(amt)}</strong>
        {' · '}TDS: <strong style={{ color: '#C65757' }}>−₹{fmtINR(parseInt(tdsAmount) || 0)}</strong>
        {' · '}Net Received: <strong style={{ color: C.green }}>₹{fmtINR(net)}</strong>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onSkip}
          style={{
            flex: 1, padding: 13, borderRadius: 12,
            background: 'transparent', color: C.muted,
            border: `1px solid ${C.border}`, cursor: 'pointer',
            fontSize: 11, fontWeight: 500, letterSpacing: '1.3px',
            textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
          }}
        >
          No TDS
        </button>
        <button
          onClick={handleConfirm}
          style={{
            flex: 2, padding: 14, borderRadius: 12,
            background: C.dark, color: C.gold,
            border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 600, letterSpacing: '1.5px',
            textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
          }}
        >
          Save TDS & Mark Paid
        </button>
      </div>
    </SheetOverlay>
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

function NeedsAttentionCard({ paymentSchedules, invoices, todos, reminders, bookings, onJumpToTab }: {
  paymentSchedules: any[];
  invoices: any[];
  todos: any[];
  reminders?: any[];
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

  // ── Reminders — past due and not done (Turn 9H)
  for (const r of (reminders || [])) {
    if (r.done) continue;
    if (!r.remind_date) continue;
    const rd = new Date(r.remind_date);
    const rdIso = new Date(rd.getFullYear(), rd.getMonth(), rd.getDate());
    if (rdIso < today0) {
      items.push({
        id: `rem-${r.id}`,
        label: r.title || 'Reminder',
        sub: `Past due · ${rd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        severity: 'overdue',
        kind: 'todo', // reuse todo icon/styling
        target: 'Power',
        targetSub: 'todos',
      });
    } else if (rdIso.getTime() === today0.getTime()) {
      items.push({
        id: `rem-${r.id}`,
        label: r.title || 'Reminder',
        sub: `Reminder today${r.remind_time ? ` · ${r.remind_time}` : ''}`,
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
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: C.muted, marginTop: 4 }}>
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
        <div style={{ fontSize: 10, color: C.muted, textAlign: 'center' as const }}>
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
        <div style={{ fontSize: 12, color: C.muted, padding: '6px 0' }}>
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

// ══════════════════════════════════════════════════════════════════════════
// TEAM PANEL (Turn 9I) — landing grid with 6 cards + full-screen sub-panels
// ══════════════════════════════════════════════════════════════════════════

type TeamCard = 'landing' | 'roster' | 'assignments' | 'tasks' | 'bookings' | 'payments' | 'broadcast';

function TeamPanel({ session, vendorName, bookings, todos, clients }: {
  session: VendorSession;
  vendorName: string;
  bookings: any[];
  todos: any[];
  clients: any[];
}) {
  const [active, setActive] = useState<TeamCard>('landing');

  // Back-swipe for team sub-panels
  useEffect(() => {
    if (typeof window === 'undefined' || active === 'landing') return;
    window.history.pushState({ tdw: 'team-panel' }, '');
    const handlePop = () => { setActive('landing'); };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [active]);
  const [members, setMembers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const loadMembers = () => {
    if (!session?.vendorId) return;
    fetch(`${API}/api/team/${session.vendorId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setMembers(d.data || []); })
      .catch(() => {})
      .finally(() => setLoadingMembers(false));
  };

  const loadPayments = () => {
    if (!session?.vendorId) return;
    fetch(`${API}/api/team-payments/${session.vendorId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setPayments(d.data || []); })
      .catch(() => {});
  };

  useEffect(() => { loadMembers(); loadPayments(); }, [session?.vendorId]);

  // Derived metrics for landing card badges
  const activeMemberCount = members.filter(m => m.active !== false && m.status !== 'inactive').length;
  const pendingPaymentsAmount = payments
    .filter(p => p.status !== 'paid')
    .reduce((s, p) => s + (parseInt(p.amount) || 0), 0);
  const assignedTasksCount = todos.filter(t => {
    const a = t.assigned_to;
    return Array.isArray(a) && a.length > 0 && !t.done;
  }).length;

  // ── Sub-panel routing
  if (active === 'roster') {
    return <MyTeamPanel
      session={session}
      members={members}
      onBack={() => setActive('landing')}
      onChanged={loadMembers}
    />;
  }
  if (active === 'tasks') {
    return <TeamTasksPanel
      session={session}
      members={members}
      todos={todos}
      clients={clients}
      vendorName={vendorName}
      onBack={() => setActive('landing')}
    />;
  }
  if (active === 'assignments') {
    return <TeamAssignmentsPanel
      members={members}
      todos={todos}
      bookings={bookings}
      onBack={() => setActive('landing')}
    />;
  }
  if (active === 'bookings') {
    return <TeamBookingsPanel
      session={session}
      members={members}
      bookings={bookings}
      onBack={() => setActive('landing')}
    />;
  }
  if (active === 'payments') {
    return <TeamPaymentsPanel
      session={session}
      members={members}
      payments={payments}
      onBack={() => setActive('landing')}
      onChanged={loadPayments}
    />;
  }
  if (active === 'broadcast') {
    return <TeamBroadcastPanel
      session={session}
      members={members}
      vendorName={vendorName}
      onBack={() => setActive('landing')}
    />;
  }

  // ── Landing — 2x3 grid
  const cards: {
    id: TeamCard; label: string; desc: string;
    icon: any; count?: string | number; accent: 'gold' | 'neutral';
  }[] = [
    { id: 'roster',      label: 'My Team',     desc: 'Your crew, contacts, rates',  icon: Users,       count: loadingMembers ? '…' : activeMemberCount, accent: 'gold' },
    { id: 'assignments', label: 'Assignments', desc: 'Who is working what, when',   icon: Calendar,    count: '', accent: 'neutral' },
    { id: 'tasks',       label: 'Tasks',       desc: 'Delegate with accountability', icon: CheckCircle, count: assignedTasksCount || '', accent: 'neutral' },
    { id: 'bookings',    label: 'Bookings',    desc: 'Assign crew to weddings',      icon: Award,       count: '', accent: 'neutral' },
    { id: 'payments',    label: 'Payments',    desc: 'What you owe your team',       icon: CreditCard,  count: pendingPaymentsAmount ? `₹${fmtINR(pendingPaymentsAmount)}` : '', accent: pendingPaymentsAmount > 0 ? 'gold' : 'neutral' },
    { id: 'broadcast',   label: 'Broadcast',   desc: 'Announce on WhatsApp',         icon: Send,        count: '', accent: 'neutral' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '12px' }}>
      <div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 400, color: C.dark, letterSpacing: '0.2px' }}>
          Team
        </div>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: C.muted, marginTop: 4 }}>
          Your crew, assignments, and what you owe them.
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
      }}>
        {cards.map(card => {
          const Icon = card.icon;
          const isGold = card.accent === 'gold';
          return (
            <button
              key={card.id}
              onClick={() => setActive(card.id)}
              style={{
                background: C.ivory,
                border: `1px solid ${isGold ? C.goldBorder : C.border}`,
                borderRadius: 14,
                padding: '16px 14px',
                textAlign: 'left' as const,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                flexDirection: 'column' as const,
                gap: 8,
                minHeight: 120,
                position: 'relative' as const,
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: isGold ? C.goldSoft : C.pearl,
                border: `1px solid ${isGold ? C.goldBorder : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={16} color={isGold ? C.goldDeep : C.dark} />
              </div>
              <div>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 16, color: C.dark, fontWeight: 500,
                  letterSpacing: '0.2px',
                }}>{card.label}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>
                  {card.desc}
                </div>
              </div>
              {card.count !== '' && card.count !== undefined && (
                <div style={{
                  position: 'absolute' as const, top: 14, right: 14,
                  background: isGold ? C.goldDeep : C.dark, color: isGold ? '#fff' : C.gold,
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.5px',
                  padding: '3px 8px', borderRadius: 50,
                  fontFamily: 'DM Sans, sans-serif',
                }}>
                  {card.count}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div style={{
        marginTop: 8, padding: '10px 12px',
        background: C.pearl, borderRadius: 10,
        fontSize: 10, color: C.muted, lineHeight: 1.5,
      }}>
        Tip: Each card is a full workflow. Tap one to open it; tap back to return here.
      </div>
    </div>
  );
}

// ── Common back-button header
function SubPanelHeader({ title, onBack, rightAction }: {
  title: string;
  onBack: () => void;
  rightAction?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingTop: 6 }}>
      <button
        onClick={onBack}
        aria-label="Back"
        style={{
          background: C.pearl, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '8px 10px',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
        }}
      >
        <ChevronRight size={14} color={C.dark} style={{ transform: 'rotate(180deg)' }} />
      </button>
      <div style={{
        flex: 1, fontFamily: "'Playfair Display', serif",
        fontSize: 20, color: C.dark, fontWeight: 400,
      }}>{title}</div>
      {rightAction}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MY TEAM — roster CRUD with inline WhatsApp button
// ══════════════════════════════════════════════════════════════════════════

function MyTeamPanel({ session, members, onBack, onChanged }: {
  session: VendorSession;
  members: any[];
  onBack: () => void;
  onChanged: () => void;
}) {
  const [showSheet, setShowSheet] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this team member? They will no longer appear in your roster.')) return;
    try {
      await fetch(`${API}/api/team/${id}`, { method: 'DELETE' });
      onChanged();
    } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
      <SubPanelHeader
        title="My Team"
        onBack={onBack}
        rightAction={
          <button
            onClick={() => { setEditing(null); setShowSheet(true); }}
            style={{
              background: C.dark, color: C.gold, border: 'none',
              borderRadius: 10, padding: '8px 12px',
              display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
              fontSize: 11, fontWeight: 500, letterSpacing: '1px',
              textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <Plus size={12} /> Add
          </button>
        }
      />

      {members.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' as const, background: C.ivory, borderRadius: 14, border: `1px solid ${C.border}` }}>
          <Users size={32} color={C.light} style={{ marginBottom: 12 }} />
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: C.dark, marginBottom: 6 }}>
            No team members yet
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, maxWidth: 260, margin: '0 auto' }}>
            Add your assistants, editors, 2nd shooters, freelancers — anyone on your crew.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {members.map(m => {
            const isActive = m.active !== false && m.status !== 'inactive';
            const waPhone = (m.phone || '').replace(/\D/g, '');
            const waUrl = waPhone ? `https://wa.me/91${waPhone}` : null;
            return (
              <div
                key={m.id}
                style={{
                  background: C.ivory, borderRadius: 12,
                  border: `1px solid ${C.border}`, padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  opacity: isActive ? 1 : 0.6,
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 19,
                  background: C.goldSoft, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 600, color: C.goldDeep,
                  fontFamily: "'Playfair Display', serif",
                  flexShrink: 0,
                }}>{(m.name || '?')[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: C.dark, fontWeight: 500 }}>
                    {m.name}
                    {!isActive && <span style={{ fontSize: 9, color: C.muted, marginLeft: 6 }}>inactive</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {m.role || 'Team member'}
                    {m.rate ? ` · ₹${fmtINR(parseInt(m.rate))}/${m.rate_unit === 'per_day' ? 'day' : 'event'}` : ''}
                  </div>
                </div>
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`WhatsApp ${m.name}`}
                    style={{
                      width: 34, height: 34, borderRadius: 17,
                      background: '#25D366',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, textDecoration: 'none',
                    }}
                  >
                    <MessageCircle size={14} color="#fff" />
                  </a>
                )}
                <button
                  onClick={() => { setEditing(m); setShowSheet(true); }}
                  aria-label="Edit"
                  style={{
                    background: 'transparent', border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: 6, cursor: 'pointer',
                  }}
                >
                  <Edit2 size={12} color={C.muted} />
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  aria-label="Delete"
                  style={{
                    background: 'transparent', border: `1px solid ${C.redBorder}`,
                    borderRadius: 8, padding: 6, cursor: 'pointer',
                  }}
                >
                  <Trash2 size={12} color="#C65757" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showSheet && (
        <AddTeamMemberSheet
          vendorId={session.vendorId}
          initial={editing}
          onClose={() => { setShowSheet(false); setEditing(null); }}
          onSaved={() => {
            setShowSheet(false); setEditing(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function AddTeamMemberSheet({ vendorId, initial, onClose, onSaved }: {
  vendorId: string;
  initial: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [role, setRole] = useState(initial?.role || '');
  const [rate, setRate] = useState(initial?.rate ? String(initial.rate) : '');
  const [rateUnit, setRateUnit] = useState<'per_event' | 'per_day'>(initial?.rate_unit === 'per_day' ? 'per_day' : 'per_event');
  const [email, setEmail] = useState(initial?.email || '');
  const [active, setActive] = useState<boolean>(initial ? (initial.active !== false && initial.status !== 'inactive') : true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSave = name.trim() && phone.trim().length >= 10 && !submitting;

  const handleSave = async () => {
    if (!canSave) return;
    setError(''); setSubmitting(true);
    try {
      const payload = {
        vendor_id: vendorId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        role: role.trim() || null,
        rate: rate ? parseInt(rate) : null,
        rate_unit: rateUnit,
        active,
        status: active ? 'active' : 'inactive',
      };
      const url = initial ? `${API}/api/team/${initial.id}` : `${API}/api/team`;
      const method = initial ? 'PATCH' : 'POST';
      const r = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d.success) onSaved();
      else setError(d.error || 'Could not save.');
    } catch { setError('Network error.'); } finally { setSubmitting(false); }
  };

  return (
    <SheetOverlay onClose={onClose}>
      <SheetHeader
        eyebrow={initial ? 'Edit' : 'Add'}
        title={initial ? initial.name : 'New team member'}
        onClose={onClose}
      />

      <FieldLabel required>Name</FieldLabel>
      <input
        type="text" value={name} onChange={e => setName(e.target.value)}
        placeholder="e.g. Vivek Sharma"
        style={{
          width: '100%', boxSizing: 'border-box' as const,
          background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '13px 14px',
          fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif',
          outline: 'none', marginBottom: 12,
        }}
      onFocus={scrollIntoViewOnFocus} />

      <FieldLabel required>Phone</FieldLabel>
      <input
        type="tel" value={phone} inputMode="numeric"
        onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
        placeholder="10-digit mobile"
        style={{
          width: '100%', boxSizing: 'border-box' as const,
          background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '13px 14px',
          fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif',
          outline: 'none', marginBottom: 12,
        }}
      onFocus={scrollIntoViewOnFocus} />

      <FieldLabel>Role</FieldLabel>
      <input
        type="text" value={role} onChange={e => setRole(e.target.value)}
        placeholder="e.g. 2nd shooter, Editor, Assistant"
        style={{
          width: '100%', boxSizing: 'border-box' as const,
          background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '13px 14px',
          fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif',
          outline: 'none', marginBottom: 12,
        }}
      onFocus={scrollIntoViewOnFocus} />

      <FieldLabel>Rate</FieldLabel>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '10px 12px',
        }}>
          <span style={{ color: C.goldDeep, fontFamily: "'Playfair Display', serif", fontSize: 16 }}>₹</span>
          <input
            type="text" inputMode="numeric"
            value={rate ? parseInt(rate).toLocaleString('en-IN') : ''}
            onChange={e => setRate(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="5000"
            style={{
              flex: 1, background: 'transparent', border: 'none',
              fontSize: 15, color: C.dark, outline: 'none',
              fontFamily: "'Playfair Display', serif",
            }}
          onFocus={scrollIntoViewOnFocus} />
        </div>
        <select
          value={rateUnit}
          onChange={e => setRateUnit(e.target.value as any)}
          style={{
            background: C.ivory, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '10px 12px',
            fontSize: 12, color: C.dark,
            fontFamily: 'DM Sans, sans-serif', outline: 'none',
          }}
         onFocus={scrollIntoViewOnFocus}>
          <option value="per_event">per event</option>
          <option value="per_day">per day</option>
        </select>
      </div>

      <FieldLabel>Email</FieldLabel>
      <input
        type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="their@email.com"
        style={{
          width: '100%', boxSizing: 'border-box' as const,
          background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '13px 14px',
          fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif',
          outline: 'none', marginBottom: 12,
        }}
      onFocus={scrollIntoViewOnFocus} />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: C.pearl, borderRadius: 12, padding: '12px 14px', marginBottom: 16,
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.dark }}>Active</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
            Inactive members are hidden from assignments.
          </div>
        </div>
        <button
          onClick={() => setActive(!active)}
          style={{
            width: 40, height: 22, borderRadius: 11,
            background: active ? C.gold : C.border,
            border: 'none', cursor: 'pointer', padding: 0,
            position: 'relative' as const, transition: 'all 0.2s ease',
          }}
        >
          <div style={{
            position: 'absolute' as const, top: 2, left: active ? 20 : 2,
            width: 18, height: 18, borderRadius: 9, background: '#fff',
            transition: 'all 0.2s ease',
          }} />
        </button>
      </div>

      {error && (
        <div style={{
          background: C.redSoft, border: `1px solid ${C.redBorder}`,
          borderRadius: 8, padding: '10px 12px',
          fontSize: 11, color: C.red, marginBottom: 12,
        }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onClose} disabled={submitting}
          style={{
            flex: 1, padding: 13, borderRadius: 12,
            background: 'transparent', color: C.muted,
            border: `1px solid ${C.border}`, cursor: 'pointer',
            fontSize: 11, fontWeight: 500, letterSpacing: '1.5px',
            textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
          }}
        >Cancel</button>
        <button
          onClick={handleSave} disabled={!canSave}
          style={{
            flex: 2, padding: 14, borderRadius: 12,
            background: canSave ? C.dark : C.border,
            color: canSave ? C.gold : C.light,
            border: 'none', cursor: canSave ? 'pointer' : 'not-allowed',
            fontSize: 11, fontWeight: 600, letterSpacing: '1.8px',
            textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
          }}
        >{submitting ? 'Saving…' : initial ? 'Update' : 'Add to Team'}</button>
      </div>
    </SheetOverlay>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TASKS / ASSIGNMENTS / BOOKINGS / PAYMENTS / BROADCAST
// Remaining panels share a simpler list-view pattern.
// ══════════════════════════════════════════════════════════════════════════

function TeamTasksPanel({ session, members, todos, clients, vendorName, onBack }: any) {
  const assigned = todos.filter((t: any) => Array.isArray(t.assigned_to) && t.assigned_to.length > 0);
  const unassigned = todos.filter((t: any) => !Array.isArray(t.assigned_to) || t.assigned_to.length === 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
      <SubPanelHeader title="Team Tasks" onBack={onBack} />

      <div style={{
        padding: '14px 16px', background: C.pearl, borderRadius: 12,
        border: `1px solid ${C.border}`, fontSize: 12, color: C.muted, lineHeight: 1.55,
      }}>
        Tasks with team assignees — for delegation and accountability. Assign a task from the To-Do tool in Power Mode to add it here.
      </div>

      <div>
        <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: C.goldDeep, fontWeight: 600, marginBottom: 10 }}>
          Assigned ({assigned.length})
        </div>
        {assigned.length === 0 ? (
          <div style={{ padding: 20, background: C.ivory, borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 12, color: C.muted, textAlign: 'center' as const }}>
            No tasks assigned yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {assigned.map((t: any) => {
              const assigneeNames = (t.assigned_to || []).map((id: string) => {
                const m = members.find((mem: any) => mem.id === id);
                return m?.name || '—';
              }).join(', ');
              return (
                <div key={t.id} style={{ padding: 12, background: C.ivory, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>{t.title}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                    {assigneeNames}
                    {t.client_name ? ` · ${t.client_name}` : ''}
                    {t.due_date ? ` · Due ${new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {unassigned.length > 0 && (
        <div>
          <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: C.muted, fontWeight: 600, marginBottom: 10, marginTop: 8 }}>
            Unassigned ({unassigned.length})
          </div>
          <div style={{ padding: '10px 14px', background: C.pearl, borderRadius: 10, fontSize: 11, color: C.muted, lineHeight: 1.55 }}>
            {unassigned.length} task{unassigned.length === 1 ? '' : 's'} in your To-Do list without a team assignee. Edit them in Power Mode → To-Do to delegate.
          </div>
        </div>
      )}
    </div>
  );
}

function TeamAssignmentsPanel({ members, todos, bookings, onBack }: any) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const activeMembers = members.filter((m: any) => m.active !== false && m.status !== 'inactive');

  // Compose timeline of upcoming items per member (next 60 days)
  const buildTimeline = (memberId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const items: { date: Date; kind: 'task' | 'booking'; label: string; sub: string }[] = [];

    todos.forEach((t: any) => {
      if (!Array.isArray(t.assigned_to) || !t.assigned_to.includes(memberId)) return;
      if (t.done) return;
      if (!t.due_date) return;
      const d = new Date(t.due_date);
      if (isNaN(d.getTime())) return;
      items.push({
        date: d,
        kind: 'task',
        label: t.title || 'Task',
        sub: t.client_name ? `Client: ${t.client_name}` : 'To-do',
      });
    });

    bookings.forEach((b: any) => {
      if (!Array.isArray(b.assigned_to) || !b.assigned_to.includes(memberId)) return;
      if (!b.event_date) return;
      const d = new Date(b.event_date);
      if (isNaN(d.getTime())) return;
      items.push({
        date: d,
        kind: 'booking',
        label: b.client_name || b.users?.name || 'Booking',
        sub: b.event_type || 'Wedding',
      });
    });

    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
      <SubPanelHeader title="Assignments" onBack={onBack} />

      <div style={{
        padding: '14px 16px', background: C.pearl, borderRadius: 12,
        border: `1px solid ${C.border}`, fontSize: 12, color: C.muted, lineHeight: 1.55,
      }}>
        Tap a name to see what each member is working on next.
      </div>

      {activeMembers.length === 0 ? (
        <div style={{ padding: 30, background: C.ivory, borderRadius: 12, border: `1px solid ${C.border}`, textAlign: 'center' as const }}>
          <div style={{ fontSize: 13, color: C.muted }}>Add team members first to see their assignments.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {activeMembers.map((m: any) => {
            const memTasks = todos.filter((t: any) => Array.isArray(t.assigned_to) && t.assigned_to.includes(m.id) && !t.done);
            const memBookings = bookings.filter((b: any) => Array.isArray(b.assigned_to) && b.assigned_to.includes(m.id));
            const isExpanded = expandedId === m.id;
            const timeline = isExpanded ? buildTimeline(m.id) : [];

            return (
              <div key={m.id} style={{ background: C.ivory, borderRadius: 12, border: `1px solid ${isExpanded ? C.goldBorder : C.border}` }}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  style={{
                    width: '100%', padding: 14, background: 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left' as const,
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 16,
                      background: C.goldSoft, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 600, color: C.goldDeep, fontFamily: "'Playfair Display', serif",
                    }}>{(m.name || '?')[0].toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: C.dark, fontWeight: 500 }}>{m.name}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{m.role || 'Team member'}</div>
                    </div>
                    <ChevronRight size={14} color={C.muted} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: C.muted }}>
                    <span><strong style={{ color: C.dark }}>{memTasks.length}</strong> open task{memTasks.length === 1 ? '' : 's'}</span>
                    <span><strong style={{ color: C.dark }}>{memBookings.length}</strong> booking{memBookings.length === 1 ? '' : 's'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.borderSoft}`, marginTop: 4 }}>
                    {timeline.length === 0 ? (
                      <div style={{ padding: '14px 0', fontSize: 12, color: C.muted, textAlign: 'center' as const }}>
                        Nothing assigned yet
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, paddingTop: 12 }}>
                        {timeline.map((item, idx) => {
                          const isToday = item.date.toDateString() === new Date().toDateString();
                          const isPast = item.date < new Date(new Date().setHours(0, 0, 0, 0));
                          return (
                            <div key={idx} style={{
                              display: 'flex', gap: 10, alignItems: 'flex-start',
                              padding: '8px 10px',
                              background: isPast ? C.redSoft : isToday ? C.goldSoft : C.pearl,
                              borderRadius: 8,
                              border: `1px solid ${isPast ? C.redBorder : isToday ? C.goldBorder : C.border}`,
                            }}>
                              <div style={{
                                width: 38, textAlign: 'center' as const, flexShrink: 0,
                                paddingRight: 6, borderRight: `1px solid ${C.borderSoft}`,
                              }}>
                                <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: '1px' }}>
                                  {item.date.toLocaleDateString('en-IN', { month: 'short' })}
                                </div>
                                <div style={{ fontSize: 16, fontFamily: "'Playfair Display', serif", color: isPast ? C.red : C.dark, fontWeight: 500 }}>
                                  {item.date.getDate()}
                                </div>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, color: C.dark, fontWeight: 500 }}>{item.label}</div>
                                <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                                  {item.kind === 'booking' ? '🎉' : '✓'} {item.sub}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TeamBookingsPanel({ session, members, bookings, onBack }: any) {
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [bookingsLocal, setBookingsLocal] = useState<any[]>(bookings || []);
  useEffect(() => { setBookingsLocal(bookings || []); }, [bookings]);

  const handleAssignmentSaved = (bookingId: string, newAssignedTo: string[]) => {
    setBookingsLocal(prev => prev.map((b: any) => b.id === bookingId ? { ...b, assigned_to: newAssignedTo } : b));
    setActiveBooking(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
      <SubPanelHeader title="Bookings" onBack={onBack} />

      <div style={{
        padding: '14px 16px', background: C.pearl, borderRadius: 12,
        border: `1px solid ${C.border}`, fontSize: 12, color: C.muted, lineHeight: 1.55,
      }}>
        Tap any booking to assign team members. Track who's working which wedding.
      </div>

      {bookingsLocal.length === 0 ? (
        <div style={{ padding: 30, background: C.ivory, borderRadius: 12, border: `1px solid ${C.border}`, textAlign: 'center' as const, fontSize: 13, color: C.muted }}>
          No bookings to assign.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {bookingsLocal.slice(0, 20).map((b: any) => {
            const assignedIds = Array.isArray(b.assigned_to) ? b.assigned_to : [];
            const assignees = assignedIds.map((id: string) => members.find((m: any) => m.id === id)?.name).filter(Boolean);
            return (
              <button
                key={b.id}
                onClick={() => setActiveBooking(b)}
                style={{
                  padding: 12, background: C.ivory,
                  borderRadius: 12, border: `1px solid ${C.border}`,
                  textAlign: 'left' as const, cursor: 'pointer',
                  fontFamily: 'inherit', width: '100%',
                }}
              >
                <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>
                  {b.client_name || b.users?.name || 'Booking'}
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                  {b.event_date ? new Date(b.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'}
                  {b.event_type ? ` · ${b.event_type}` : ''}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.borderSoft}`,
                }}>
                  <div style={{ fontSize: 11, color: assignees.length ? C.goldDeep : C.light }}>
                    {assignees.length ? `Crew: ${assignees.join(', ')}` : 'Tap to assign crew'}
                  </div>
                  <ChevronRight size={12} color={C.muted} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {activeBooking && (
        <BookingAssignSheet
          booking={activeBooking}
          members={members}
          onClose={() => setActiveBooking(null)}
          onSaved={(ids) => handleAssignmentSaved(activeBooking.id, ids)}
        />
      )}
    </div>
  );
}

function BookingAssignSheet({ booking, members, onClose, onSaved }: {
  booking: any;
  members: any[];
  onClose: () => void;
  onSaved: (ids: string[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(Array.isArray(booking.assigned_to) ? booking.assigned_to : []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const activeMembers = members.filter((m: any) => m.active !== false && m.status !== 'inactive');

  const toggleMember = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    setSubmitting(true); setError('');
    try {
      const r = await fetch(`${API}/api/bookings/${booking.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: selectedIds }),
      });
      const d = await r.json();
      if (d.success) onSaved(selectedIds);
      else setError(d.error || 'Could not save.');
    } catch { setError('Network error.'); } finally { setSubmitting(false); }
  };

  return (
    <SheetOverlay onClose={onClose}>
      <SheetHeader
        eyebrow={booking.event_date ? new Date(booking.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Booking'}
        title={booking.client_name || booking.users?.name || 'Booking'}
        onClose={onClose}
      />

      <div style={{
        padding: '12px 14px', background: C.pearl, borderRadius: 10,
        marginBottom: 14, fontSize: 12, color: C.muted, lineHeight: 1.5,
      }}>
        Pick everyone who's working this booking. Tap names to toggle.
      </div>

      {activeMembers.length === 0 ? (
        <div style={{ padding: 20, background: C.ivory, borderRadius: 10, fontSize: 12, color: C.muted, textAlign: 'center' as const, border: `1px solid ${C.border}` }}>
          Add team members in My Team first.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 14 }}>
          {activeMembers.map((m: any) => {
            const checked = selectedIds.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleMember(m.id)}
                style={{
                  padding: '10px 12px', background: checked ? C.goldSoft : C.ivory,
                  border: `1px solid ${checked ? C.gold : C.border}`,
                  borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 10,
                  textAlign: 'left' as const,
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 4,
                  background: checked ? C.dark : 'transparent',
                  border: `1.5px solid ${checked ? C.dark : C.muted}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {checked && <CheckCircle size={11} color={C.gold} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{m.role || 'Team member'}{m.rate ? ` · ₹${fmtINR(parseInt(m.rate))}` : ''}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div style={{ background: C.redSoft, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: '10px 12px', fontSize: 11, color: C.red, marginBottom: 12 }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose} disabled={submitting} style={{
          flex: 1, padding: 13, borderRadius: 12,
          background: 'transparent', color: C.muted,
          border: `1px solid ${C.border}`, cursor: 'pointer',
          fontSize: 11, fontWeight: 500, letterSpacing: '1.5px',
          textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
        }}>Cancel</button>
        <button onClick={handleSave} disabled={submitting} style={{
          flex: 2, padding: 14, borderRadius: 12,
          background: submitting ? C.border : C.dark,
          color: submitting ? C.light : C.gold,
          border: 'none', cursor: submitting ? 'default' : 'pointer',
          fontSize: 11, fontWeight: 600, letterSpacing: '1.8px',
          textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
        }}>{submitting ? 'Saving…' : `Save (${selectedIds.length})`}</button>
      </div>
    </SheetOverlay>
  );
}

function TeamPaymentsPanel({ session, members, payments, onBack, onChanged }: any) {
  const [showSheet, setShowSheet] = useState(false);

  const pending = payments.filter((p: any) => p.status !== 'paid');
  const paid = payments.filter((p: any) => p.status === 'paid');
  const totalOwed = pending.reduce((s: number, p: any) => s + (parseInt(p.amount) || 0), 0);

  const memberName = (id: string) => members.find((m: any) => m.id === id)?.name || 'Unknown';

  const handleMarkPaid = async (p: any) => {
    try {
      await fetch(`${API}/api/team-payments/${p.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      });
      onChanged();
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this payment record?')) return;
    try {
      await fetch(`${API}/api/team-payments/${id}`, { method: 'DELETE' });
      onChanged();
    } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
      <SubPanelHeader
        title="Team Payments"
        onBack={onBack}
        rightAction={
          <button
            onClick={() => setShowSheet(true)}
            style={{
              background: C.dark, color: C.gold, border: 'none',
              borderRadius: 10, padding: '8px 12px',
              display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
              fontSize: 11, fontWeight: 500, letterSpacing: '1px',
              textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <Plus size={12} /> Log
          </button>
        }
      />

      <div style={{
        background: C.ivory, borderRadius: 14,
        border: `1px solid ${pending.length > 0 ? C.goldBorder : C.border}`,
        padding: 18,
      }}>
        <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: C.goldDeep, fontWeight: 600 }}>
          Pending Dues
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: C.dark, marginTop: 4 }}>
          ₹{fmtINR(totalOwed)}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
          Across {pending.length} record{pending.length === 1 ? '' : 's'} · {new Set(pending.map((p: any) => p.team_member_id)).size} member{new Set(pending.map((p: any) => p.team_member_id)).size === 1 ? '' : 's'}
        </div>
      </div>

      {pending.length > 0 && (
        <div>
          <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: C.muted, fontWeight: 600, marginBottom: 8 }}>
            Pending ({pending.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {pending.map((p: any) => (
              <div key={p.id} style={{ padding: 12, background: C.ivory, borderRadius: 12, border: `1px solid ${C.goldBorder}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>{memberName(p.team_member_id)}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                      {p.label || 'Payment'}
                      {p.notes ? ` · ${p.notes}` : ''}
                    </div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: C.dark, marginTop: 4 }}>
                      ₹{fmtINR(parseInt(p.amount) || 0)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                    <button
                      onClick={() => handleMarkPaid(p)}
                      style={{
                        background: C.dark, color: C.gold, border: 'none',
                        borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                        fontSize: 10, fontWeight: 500, letterSpacing: '1px',
                        textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
                      }}
                    >Mark Paid</button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      aria-label="Delete"
                      style={{
                        background: 'transparent', border: `1px solid ${C.redBorder}`,
                        borderRadius: 8, padding: 6, cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={11} color="#C65757" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {paid.length > 0 && (
        <div>
          <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: C.muted, fontWeight: 600, marginBottom: 8, marginTop: 8 }}>
            Paid ({paid.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
            {paid.slice(0, 20).map((p: any) => (
              <div key={p.id} style={{ padding: '10px 12px', background: C.pearl, borderRadius: 10, border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, color: C.dark }}>{memberName(p.team_member_id)}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{p.label}{p.paid_date ? ` · ${new Date(p.paid_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</div>
                </div>
                <div style={{ fontSize: 13, color: C.green, fontWeight: 500, fontFamily: "'Playfair Display', serif", fontVariantNumeric: 'tabular-nums' as const }}>₹{fmtINR(parseInt(p.amount) || 0)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSheet && (
        <TeamPaymentSheet
          vendorId={session.vendorId}
          members={members}
          onClose={() => setShowSheet(false)}
          onSaved={() => { setShowSheet(false); onChanged(); }}
        />
      )}
    </div>
  );
}

function TeamPaymentSheet({ vendorId, members, onClose, onSaved }: any) {
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const activeMembers = members.filter((m: any) => m.active !== false && m.status !== 'inactive');
  const canSave = memberId && amount && parseInt(amount) > 0 && !submitting;

  const save = async () => {
    if (!canSave) return;
    setSubmitting(true); setError('');
    try {
      const r = await fetch(`${API}/api/team-payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          team_member_id: memberId,
          amount: parseInt(amount),
          label: label.trim() || 'Payment',
          notes: notes.trim() || null,
          status: 'pending',
        }),
      });
      const d = await r.json();
      if (d.success) onSaved();
      else setError(d.error || 'Could not save.');
    } catch { setError('Network error.'); } finally { setSubmitting(false); }
  };

  return (
    <SheetOverlay onClose={onClose}>
      <SheetHeader eyebrow="New" title="Log payment owed" onClose={onClose} />

      <FieldLabel required>Team member</FieldLabel>
      <select
        value={memberId}
        onChange={e => setMemberId(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box' as const,
          background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '13px 14px',
          fontSize: 14, color: memberId ? C.dark : C.muted,
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          marginBottom: 12, appearance: 'none' as const,
        }}
       onFocus={scrollIntoViewOnFocus}>
        <option value="">Select someone…</option>
        {activeMembers.map((m: any) => (
          <option key={m.id} value={m.id}>{m.name}{m.role ? ` · ${m.role}` : ''}</option>
        ))}
      </select>

      <FieldLabel required>Amount</FieldLabel>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: C.ivory, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: '10px 14px', marginBottom: 12,
      }}>
        <span style={{ color: C.goldDeep, fontFamily: "'Playfair Display', serif", fontSize: 18 }}>₹</span>
        <input
          type="text" inputMode="numeric"
          value={amount ? parseInt(amount).toLocaleString('en-IN') : ''}
          onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="e.g. 5000"
          style={{
            flex: 1, background: 'transparent', border: 'none',
            fontSize: 17, color: C.dark, outline: 'none',
            fontFamily: "'Playfair Display', serif",
          }}
        onFocus={scrollIntoViewOnFocus} />
      </div>

      <FieldLabel>What for</FieldLabel>
      <input
        type="text" value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder="e.g. Sharma wedding, 2nd shoot"
        style={{
          width: '100%', boxSizing: 'border-box' as const,
          background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '13px 14px',
          fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif',
          outline: 'none', marginBottom: 12,
        }}
      onFocus={scrollIntoViewOnFocus} />

      <FieldLabel>Notes</FieldLabel>
      <input
        type="text" value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Anything else to remember"
        style={{
          width: '100%', boxSizing: 'border-box' as const,
          background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '13px 14px',
          fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif',
          outline: 'none', marginBottom: 16,
        }}
      onFocus={scrollIntoViewOnFocus} />

      {error && (
        <div style={{ background: C.redSoft, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: '10px 12px', fontSize: 11, color: C.red, marginBottom: 12 }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={{
          flex: 1, padding: 13, borderRadius: 12,
          background: 'transparent', color: C.muted,
          border: `1px solid ${C.border}`, cursor: 'pointer',
          fontSize: 11, fontWeight: 500, letterSpacing: '1.5px',
          textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
        }}>Cancel</button>
        <button onClick={save} disabled={!canSave} style={{
          flex: 2, padding: 14, borderRadius: 12,
          background: canSave ? C.dark : C.border,
          color: canSave ? C.gold : C.light,
          border: 'none', cursor: canSave ? 'pointer' : 'not-allowed',
          fontSize: 11, fontWeight: 600, letterSpacing: '1.8px',
          textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
        }}>{submitting ? 'Saving…' : 'Log Payment'}</button>
      </div>
    </SheetOverlay>
  );
}

function TeamBroadcastPanel({ session, members, vendorName, onBack }: any) {
  const [message, setMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [templateKey, setTemplateKey] = useState<string>('');
  const activeMembers = members.filter((m: any) => m.active !== false && m.status !== 'inactive');

  const TEMPLATES: { key: string; label: string; text: (vn: string) => string }[] = [
    { key: 'pre_event', label: 'Pre-event briefing', text: vn => `Hi team,\n\nJust a quick reminder for tomorrow's event:\n• Arrival time: ___\n• Venue: ___\n• Dress code: ___\n\nKindly reach 30 mins early. Any questions, message me.\n\n${vn}` },
    { key: 'post_event', label: 'Post-event thanks', text: vn => `Thanks team for today's work! It went really well. Payment for this event will be processed by ___.\n\nAppreciate all of you.\n\n${vn}` },
    { key: 'monthly', label: 'Monthly update', text: vn => `Hi team,\n\nQuick update on this month:\n• Events done: ___\n• Events coming up: ___\n• Anything else: ___\n\nKeep up the great work.\n\n${vn}` },
    { key: 'blank', label: 'Blank message', text: _ => '' },
  ];

  const applyTemplate = (key: string) => {
    setTemplateKey(key);
    const tpl = TEMPLATES.find(t => t.key === key);
    if (tpl) setMessage(tpl.text(vendorName || 'The Studio'));
  };

  const toggleMember = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const selectAll = () => setSelectedIds(activeMembers.map((m: any) => m.id));

  const recipients = activeMembers.filter((m: any) => selectedIds.includes(m.id));

  const sendWhatsAppIndividual = async (m: any) => {
    const phone = (m.phone || '').replace(/\D/g, '');
    if (!phone) { alert(`${m.name} has no phone on file.`); return; }
    const url = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    // Log the broadcast after first send
    try {
      await fetch(`${API}/api/team-broadcasts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: session.vendorId,
          message,
          recipient_ids: selectedIds,
          recipient_count: selectedIds.length,
          template_key: templateKey || null,
        }),
      });
    } catch {}
  };

  const sendWhatsAppGroup = async () => {
    // No phones — WhatsApp group picker opens with pre-filled message
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    try {
      await fetch(`${API}/api/team-broadcasts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: session.vendorId,
          message,
          recipient_ids: selectedIds,
          recipient_count: selectedIds.length,
          template_key: templateKey || null,
        }),
      });
    } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
      <SubPanelHeader title="Broadcast to Team" onBack={onBack} />

      <div style={{
        padding: '14px 16px', background: C.pearl, borderRadius: 12,
        border: `1px solid ${C.border}`, fontSize: 12, color: C.muted, lineHeight: 1.55,
      }}>
        Send an announcement to your team via WhatsApp. Pick a template, customize, then send as a group or individual messages.
      </div>

      {/* Templates */}
      <div>
        <FieldLabel>Pick a template</FieldLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
          {TEMPLATES.map(tpl => (
            <button
              key={tpl.key}
              onClick={() => applyTemplate(tpl.key)}
              style={{
                background: templateKey === tpl.key ? C.goldSoft : C.ivory,
                color: templateKey === tpl.key ? C.goldDeep : C.muted,
                border: `1px solid ${templateKey === tpl.key ? C.gold : C.border}`,
                borderRadius: 50, padding: '7px 12px',
                fontSize: 11, fontWeight: templateKey === tpl.key ? 600 : 500,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              }}
            >{tpl.label}</button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <FieldLabel required>Message</FieldLabel>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={7}
          placeholder="Type your announcement…"
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            background: C.ivory, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '12px 14px',
            fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif',
            outline: 'none', resize: 'vertical' as const, lineHeight: 1.55,
          }}
        onFocus={scrollIntoViewOnFocus} />
      </div>

      {/* Recipients */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <FieldLabel>Recipients ({selectedIds.length}/{activeMembers.length})</FieldLabel>
          <button
            onClick={selectAll}
            style={{
              background: 'transparent', border: 'none',
              color: C.goldDeep, cursor: 'pointer',
              fontSize: 11, fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
              padding: 0,
            }}
          >Select all</button>
        </div>
        {activeMembers.length === 0 ? (
          <div style={{ padding: 20, background: C.pearl, borderRadius: 10, fontSize: 12, color: C.muted, textAlign: 'center' as const }}>
            No active team members. Add some in My Team first.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
            {activeMembers.map((m: any) => {
              const checked = selectedIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMember(m.id)}
                  style={{
                    padding: '10px 12px', background: checked ? C.goldSoft : C.ivory,
                    border: `1px solid ${checked ? C.gold : C.border}`,
                    borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 10,
                    textAlign: 'left' as const,
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 4,
                    background: checked ? C.dark : 'transparent',
                    border: `1.5px solid ${checked ? C.dark : C.muted}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {checked && <CheckCircle size={11} color={C.gold} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>{m.name}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{m.phone || 'No phone'}{m.role ? ` · ${m.role}` : ''}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Send actions */}
      {message.trim() && selectedIds.length > 0 && (
        <div style={{
          background: C.champagne, border: `1px solid ${C.goldBorder}`,
          borderRadius: 12, padding: 14,
        }}>
          <div style={{ fontSize: 11, color: C.goldDeep, fontWeight: 500, letterSpacing: '1.2px', textTransform: 'uppercase' as const, marginBottom: 10 }}>
            Choose how to send
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            <button
              onClick={sendWhatsAppGroup}
              style={{
                padding: 13, borderRadius: 10,
                background: '#25D366', color: '#fff',
                border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, letterSpacing: '1.3px',
                textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Users size={14} /> As group
            </button>
            <div style={{ fontSize: 10, color: C.muted, textAlign: 'center' as const }}>
              Opens WhatsApp — you'll create the group and paste
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
              {recipients.map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => sendWhatsAppIndividual(m)}
                  style={{
                    padding: '10px 8px', borderRadius: 8,
                    background: C.ivory, color: '#25D366',
                    border: `1px solid ${C.border}`, cursor: 'pointer',
                    fontSize: 11, fontWeight: 500,
                    fontFamily: 'DM Sans, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}
                >
                  <Send size={10} /> {m.name.split(' ')[0]}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: C.muted, textAlign: 'center' as const, marginTop: 4 }}>
              Or tap a name to send direct 1-on-1
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: C.muted, marginTop: 4 }}>
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

      <FieldLabel required>Name</FieldLabel>
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
      onFocus={scrollIntoViewOnFocus} />

      <FieldLabel required>Phone</FieldLabel>
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
        onFocus={scrollIntoViewOnFocus} />
      </div>

      <FieldLabel>Role</FieldLabel>
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
      onFocus={scrollIntoViewOnFocus} />

      <FieldLabel>Notes</FieldLabel>
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
      onFocus={scrollIntoViewOnFocus} />

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

// ══════════════════════════════════════════════════════════════════════════
// FLOATING ASSISTANT (Turn 9E) — Dream AI on Overview, PAi elsewhere
// Both draggable on Y-axis, right-edge-snapped, position persists per user.
// PAi is invite-only during beta; non-granted users see a Request Access sheet.
// ══════════════════════════════════════════════════════════════════════════

interface PaiStatus {
  enabled: boolean;
  reason?: string;
  expires_at?: string | null;
  daily_cap?: number;
  daily_used?: number;
  daily_remaining?: number;
  pending_request?: any;
}

function FloatingAssistant({ kind, userType, userId, onDreamAiClick }: {
  kind: 'dreamai' | 'pai';
  userType: 'vendor' | 'couple';
  userId: string;
  onDreamAiClick?: () => void;
}) {
  // Position persists in localStorage as { x, y, edge: 'left'|'right'|'top'|'bottom' }.
  const storageKey = `tdw_${kind}_button_pos`;
  const BTN_SIZE = 52;
  const MARGIN = 16;
  const BOTTOM_NAV_HEIGHT = 72;

  const [pos, setPos] = useState<{ x: number; y: number; edge: 'left' | 'right' | 'top' | 'bottom' }>(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0, edge: 'right' };
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Default: bottom-right above bottom nav
    const w = window.innerWidth;
    const h = window.innerHeight;
    return { x: w - BTN_SIZE - MARGIN, y: h - BTN_SIZE - BOTTOM_NAV_HEIGHT - MARGIN, edge: 'right' };
  });
  const [dragging, setDragging] = useState(false);
  const [livePos, setLivePos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; btnX: number; btnY: number; moved: boolean }>({
    startX: 0, startY: 0, btnX: 0, btnY: 0, moved: false,
  });
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const [paiStatus, setPaiStatus] = useState<PaiStatus | null>(null);
  const [showPaiSheet, setShowPaiSheet] = useState(false);
  const [showRequestSheet, setShowRequestSheet] = useState(false);

  useEffect(() => {
    if (kind !== 'pai' || !userId) return;
    let cancelled = false;
    fetch(`${API}/api/pai/status?user_type=${userType}&user_id=${userId}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && d.success) setPaiStatus(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [kind, userType, userId]);

  // Re-center on window resize if out of bounds
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (pos.x > w - BTN_SIZE || pos.y > h - BTN_SIZE) {
        setPos({ x: w - BTN_SIZE - MARGIN, y: h - BTN_SIZE - BOTTOM_NAV_HEIGHT - MARGIN, edge: 'right' });
      }
    };
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [pos.x, pos.y]);

  const snapToEdge = (x: number, y: number) => {
    if (typeof window === 'undefined') return { x, y, edge: 'right' as const };
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Distance to each edge
    const distLeft = x;
    const distRight = w - (x + BTN_SIZE);
    const distTop = y;
    const distBottom = h - (y + BTN_SIZE);
    const min = Math.min(distLeft, distRight, distTop, distBottom);
    if (min === distLeft)   return { x: MARGIN, y: Math.min(Math.max(y, MARGIN), h - BTN_SIZE - MARGIN), edge: 'left' as const };
    if (min === distRight)  return { x: w - BTN_SIZE - MARGIN, y: Math.min(Math.max(y, MARGIN), h - BTN_SIZE - MARGIN), edge: 'right' as const };
    if (min === distTop)    return { x: Math.min(Math.max(x, MARGIN), w - BTN_SIZE - MARGIN), y: MARGIN + 60, edge: 'top' as const }; // avoid header
    return { x: Math.min(Math.max(x, MARGIN), w - BTN_SIZE - MARGIN), y: h - BTN_SIZE - BOTTOM_NAV_HEIGHT - MARGIN, edge: 'bottom' as const };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!btnRef.current) return;
    btnRef.current.setPointerCapture(e.pointerId);
    const rect = btnRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      btnX: rect.left, btnY: rect.top,
      moved: false,
    };
    setDragging(true);
    setLivePos({ x: rect.left, y: rect.top });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    // Raise threshold from 3 to 8 px — prevents accidental drag detection on jittery taps
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) dragRef.current.moved = true;
    setLivePos({
      x: dragRef.current.btnX + dx,
      y: dragRef.current.btnY + dy,
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    if (dragRef.current.moved && livePos) {
      const snapped = snapToEdge(livePos.x, livePos.y);
      setPos(snapped);
      if (typeof window !== 'undefined') {
        try { localStorage.setItem(storageKey, JSON.stringify(snapped)); } catch {}
      }
    } else {
      // Tap
      handleClick();
    }
    setLivePos(null);
    if (btnRef.current) btnRef.current.releasePointerCapture(e.pointerId);
  };

  const handleClick = () => {
    if (kind === 'dreamai') {
      onDreamAiClick && onDreamAiClick();
      return;
    }
    // Optimistic open: if paiStatus not yet loaded, show the PaiSheet which handles loading state.
    // If loaded and not enabled, show the request-access flow.
    if (paiStatus && !paiStatus.enabled) {
      setShowRequestSheet(true);
    } else {
      setShowPaiSheet(true);
    }
  };

  const bg = C.dark;
  const accent = C.gold;
  const showBetaChip = kind === 'pai' && paiStatus?.enabled;

  // Render position: during drag use livePos, otherwise use stored pos
  const renderX = dragging && livePos ? livePos.x : pos.x;
  const renderY = dragging && livePos ? livePos.y : pos.y;

  return (
    <>
      <button
        ref={btnRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={e => e.preventDefault()}
        aria-label={kind === 'dreamai' ? 'Open Dream AI' : 'Open PAi'}
        style={{
          position: 'fixed',
          top: renderY,
          left: renderX,
          width: BTN_SIZE, height: BTN_SIZE, borderRadius: BTN_SIZE / 2,
          background: bg, border: `2px solid ${accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: dragging ? 'grabbing' : 'pointer', zIndex: 40,
          boxShadow: dragging ? '0 10px 28px rgba(44,36,32,0.35)' : '0 6px 20px rgba(44,36,32,0.25)',
          transition: dragging ? 'none' : 'top 0.2s ease, left 0.2s ease, box-shadow 0.2s ease',
          touchAction: 'none',
          padding: 0,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          msUserSelect: 'none',
        } as any}
      >
        <span style={{
          position: 'absolute', inset: 0, borderRadius: BTN_SIZE / 2,
          border: `1px solid ${accent}`, opacity: 0.4,
          animation: 'tdwAiPulse 2.4s ease-in-out infinite',
          pointerEvents: 'none' as const,
        }} />
        {kind === 'dreamai' ? (
          <Zap size={20} color={accent} />
        ) : (
          <Sparkles size={20} color={accent} strokeWidth={1.75} />
        )}
        {showBetaChip && (
          <span style={{
            position: 'absolute', bottom: -6, right: -4,
            background: C.goldDeep, color: '#fff',
            fontSize: 8, fontWeight: 700, letterSpacing: '0.5px',
            padding: '2px 5px', borderRadius: 8,
            fontFamily: 'DM Sans, sans-serif',
            pointerEvents: 'none' as const,
          }}>BETA</span>
        )}
      </button>

      {showPaiSheet && (
        paiStatus === null ? (
          <PaiLoadingSheet onClose={() => setShowPaiSheet(false)} />
        ) : paiStatus.enabled ? (
          <PaiSheet
            userType={userType}
            userId={userId}
            status={paiStatus}
            onClose={() => setShowPaiSheet(false)}
            onSaved={() => {
              fetch(`${API}/api/pai/status?user_type=${userType}&user_id=${userId}`)
                .then(r => r.json()).then(d => { if (d.success) setPaiStatus(d); }).catch(() => {});
            }}
          />
        ) : (
          // Loaded but not enabled — redirect to request flow
          <PaiRequestSheet
            userType={userType}
            userId={userId}
            hasPending={!!paiStatus.pending_request}
            onClose={() => setShowPaiSheet(false)}
            onSubmitted={() => {
              fetch(`${API}/api/pai/status?user_type=${userType}&user_id=${userId}`)
                .then(r => r.json()).then(d => { if (d.success) setPaiStatus(d); }).catch(() => {});
            }}
          />
        )
      )}

      {showRequestSheet && paiStatus && !paiStatus.enabled && (
        <PaiRequestSheet
          userType={userType}
          userId={userId}
          hasPending={!!paiStatus?.pending_request}
          onClose={() => setShowRequestSheet(false)}
          onSubmitted={() => {
            fetch(`${API}/api/pai/status?user_type=${userType}&user_id=${userId}`)
              .then(r => r.json()).then(d => { if (d.success) setPaiStatus(d); }).catch(() => {});
          }}
        />
      )}
    </>
  );
}

// ── PAi input sheet + preview flow
// Loading bridge — shows while paiStatus fetch is in flight, keeps tap responsive.
function PaiLoadingSheet({ onClose }: { onClose: () => void }) {
  return (
    <SheetOverlay onClose={onClose}>
      <SheetHeader eyebrow="PAi · Beta" title="Checking access…" onClose={onClose} />
      <div style={{
        padding: 24, textAlign: 'center' as const,
        fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif',
      }}>
        One moment.
      </div>
    </SheetOverlay>
  );
}

function PaiSheet({ userType, userId, status, onClose, onSaved }: {
  userType: 'vendor' | 'couple';
  userId: string;
  status: PaiStatus;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [input, setInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState<any>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [listening, setListening] = useState(false);
  const remaining = status.daily_remaining ?? 5;

  // Voice input via Web Speech API (if available)
  const startVoice = () => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Voice input is not supported on this browser.'); return; }
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput(prev => prev ? prev + ' ' + text : text);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const handleParse = async () => {
    if (!input.trim()) return;
    if (remaining <= 0) { setError('Daily cap reached. Come back tomorrow.'); return; }
    setParsing(true); setError(''); setParsed(null);
    try {
      const r = await fetch(`${API}/api/pai/parse`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_type: userType, user_id: userId, input_text: input.trim() }),
      });
      const d = await r.json();
      if (!d.success) {
        setError(d.error || 'Could not parse. Try rephrasing.');
        setParsing(false); return;
      }
      if (d.parsed?.intent === 'unknown') {
        setError(d.parsed.preview_summary || 'I need more details. Try being more specific.');
        setParsing(false); return;
      }
      setParsed(d.parsed);
      setEventId(d.event_id || null);
    } catch {
      setError('Network error. Try again.');
    } finally { setParsing(false); }
  };

  const handleConfirm = async () => {
    if (!parsed) return;
    setConfirming(true); setError('');
    try {
      const r = await fetch(`${API}/api/pai/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId, user_type: userType, user_id: userId,
          intent: parsed.intent, data: parsed.data,
        }),
      });
      const d = await r.json();
      if (!d.success) {
        setError(d.error === 'daily_cap_reached' ? 'Daily cap reached. Come back tomorrow.' : (d.error || 'Could not save.'));
        setConfirming(false); return;
      }
      onSaved();
      onClose();
    } catch {
      setError('Network error.');
      setConfirming(false);
    }
  };

  return (
    <SheetOverlay onClose={onClose}>
      <SheetHeader
        eyebrow={`PAi · Beta${typeof remaining === 'number' ? ` · ${remaining}/5 today` : ''}`}
        title="What would you like to add?"
        onClose={onClose}
      />

      {!parsed ? (
        <>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              placeholder={userType === 'vendor'
                ? 'e.g. Create task for Vivek to collect consignment on 25 April'
                : 'e.g. Add toothbrushes to my checklist'}
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box' as const,
                padding: '12px 44px 12px 14px', borderRadius: 10,
                border: `1px solid ${C.border}`, background: C.pearl,
                fontSize: 14, fontFamily: 'inherit',
                outline: 'none', resize: 'none' as const,
              }}
            onFocus={scrollIntoViewOnFocus} />
            <button
              onClick={startVoice}
              disabled={listening}
              aria-label="Voice input"
              style={{
                position: 'absolute' as const, top: 10, right: 10,
                width: 28, height: 28, borderRadius: 14,
                background: listening ? C.gold : 'transparent',
                border: `1px solid ${listening ? C.goldDeep : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0,
              }}
            >
              <MessageCircle size={13} color={listening ? C.dark : C.muted} />
            </button>
          </div>

          {error && (
            <div style={{
              padding: '10px 12px', borderRadius: 8, marginBottom: 12,
              background: C.redSoft, border: `1px solid ${C.redBorder}`,
              color: C.red, fontSize: 12,
            }}>{error}</div>
          )}

          <button
            onClick={handleParse}
            disabled={parsing || !input.trim() || remaining <= 0}
            style={{
              width: '100%', padding: 14, borderRadius: 10,
              background: (parsing || !input.trim() || remaining <= 0) ? C.pearl : C.dark,
              color: C.gold, border: 'none',
              cursor: (parsing || !input.trim() || remaining <= 0) ? 'default' : 'pointer',
              fontSize: 12, fontWeight: 500, letterSpacing: '2px',
              textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
              opacity: (parsing || !input.trim() || remaining <= 0) ? 0.6 : 1,
            }}
          >
            {parsing ? 'Thinking…' : 'Parse'}
          </button>

          <div style={{
            marginTop: 12, padding: '10px 12px',
            background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
            borderRadius: 10,
            fontSize: 10, color: C.goldDeep, lineHeight: 1.5,
          }}>
            <strong>PAi is in Beta.</strong> 5 confirmed actions per day, 5-day access. We're watching how it works and fixing bugs. Your inputs help us improve.
          </div>
        </>
      ) : (
        <PaiPreviewCard
          parsed={parsed}
          onEdit={() => setParsed(null)}
          onConfirm={handleConfirm}
          confirming={confirming}
          error={error}
        />
      )}
    </SheetOverlay>
  );
}

function PaiPreviewCard({ parsed, onEdit, onConfirm, confirming, error }: {
  parsed: any;
  onEdit: () => void;
  onConfirm: () => void;
  confirming: boolean;
  error: string;
}) {
  const { intent, data, preview_summary } = parsed;
  const intentLabel: Record<string, string> = {
    create_todo: 'Task',
    create_event: 'Event',
    create_reminder: 'Reminder',
    create_payment_schedule: 'Payment Schedule',
    create_invoice: 'Invoice',
    create_checklist_item: 'Checklist Item',
    create_expense: data?.kind === 'shagun' ? 'Shagun' : 'Expense',
    create_guest: 'Guest',
    create_moodboard_pin: 'Moodboard Pin',
    update_vendor_stage: 'Vendor Stage Update',
  };

  // Render data fields as a simple key-value list
  const fields = Object.entries(data || {}).filter(([, v]) => v !== null && v !== undefined && v !== '');

  return (
    <>
      <div style={{
        padding: '14px 16px', borderRadius: 12,
        background: C.champagne, border: `1px solid ${C.goldBorder}`,
        marginBottom: 14,
      }}>
        <div style={{
          fontSize: 9, fontWeight: 600, letterSpacing: '2px',
          color: C.goldDeep, textTransform: 'uppercase' as const, marginBottom: 6,
        }}>{intentLabel[intent] || intent}</div>
        <div style={{
          fontFamily: "'Playfair Display', serif", fontSize: 15,
          color: C.dark, fontWeight: 500, lineHeight: 1.4,
        }}>{preview_summary || 'Confirm to save'}</div>
      </div>

      <div style={{
        background: C.ivory, border: `1px solid ${C.border}`,
        borderRadius: 10, overflow: 'hidden', marginBottom: 14,
      }}>
        {fields.map(([k, v], i) => (
          <div key={k} style={{
            padding: '10px 14px',
            borderBottom: i < fields.length - 1 ? `1px solid ${C.borderSoft}` : 'none',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <span style={{
              fontSize: 10, color: C.muted, fontWeight: 500, letterSpacing: '0.5px',
              textTransform: 'uppercase' as const, flexShrink: 0, minWidth: 90,
            }}>{k.replace(/_/g, ' ')}</span>
            <span style={{ fontSize: 12, color: C.dark, flex: 1, wordBreak: 'break-word' as const }}>
              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div style={{
          padding: '10px 12px', borderRadius: 8, marginBottom: 12,
          background: C.redSoft, border: `1px solid ${C.redBorder}`,
          color: C.red, fontSize: 12,
        }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onEdit} disabled={confirming} style={{
          flex: 1, padding: 12, borderRadius: 10,
          background: 'transparent', color: C.muted,
          border: `1px solid ${C.border}`, cursor: 'pointer',
          fontSize: 11, fontWeight: 500, letterSpacing: '1.5px',
          textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
        }}>Edit</button>
        <button onClick={onConfirm} disabled={confirming} style={{
          flex: 2, padding: 12, borderRadius: 10,
          background: confirming ? C.pearl : C.dark, color: C.gold,
          border: 'none', cursor: confirming ? 'default' : 'pointer',
          fontSize: 11, fontWeight: 500, letterSpacing: '1.5px',
          textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
          opacity: confirming ? 0.6 : 1,
        }}>{confirming ? 'Saving…' : 'Confirm & Save'}</button>
      </div>
    </>
  );
}

function PaiRequestSheet({ userType, userId, hasPending, onClose, onSubmitted }: {
  userType: 'vendor' | 'couple';
  userId: string;
  hasPending: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(hasPending);

  const submit = async () => {
    setSubmitting(true);
    try {
      await fetch(`${API}/api/pai/request-access`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_type: userType, user_id: userId, reason: reason.trim() || null }),
      });
      setDone(true);
      onSubmitted();
    } catch {} finally { setSubmitting(false); }
  };

  return (
    <SheetOverlay onClose={onClose}>
      <SheetHeader
        eyebrow="PAi · Beta"
        title={done ? 'Request received' : 'Request access to PAi'}
        onClose={onClose}
      />

      {done ? (
        <>
          <div style={{
            padding: '14px 16px', borderRadius: 12, marginBottom: 14,
            background: C.champagne, border: `1px solid ${C.goldBorder}`,
          }}>
            <div style={{
              fontFamily: "'Playfair Display', serif", fontSize: 15,
              color: C.dark, fontWeight: 500, marginBottom: 4,
            }}>Thanks — we'll be in touch.</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
              PAi is currently invite-only. We're granting access to a small group of founding {userType === 'vendor' ? 'vendors' : 'couples'} during the beta.
            </div>
          </div>
          <button onClick={onClose} style={{
            width: '100%', padding: 14, borderRadius: 10,
            background: C.dark, color: C.gold, border: 'none',
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
            letterSpacing: '2px', textTransform: 'uppercase' as const,
            fontFamily: 'DM Sans, sans-serif',
          }}>Close</button>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 14, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
            <strong style={{ color: C.dark }}>PAi</strong> is your personal assistant. Type or speak what you want, and PAi creates the record for you.
            <br /><br />
            "Create task for Vivek to collect consignment on 25 April"
            <br />
            "Add ₹50,000 payment due from Sharma on May 3"
            <br /><br />
            It's invite-only during beta. Tell us why you'd like early access.
          </div>

          <FieldLabel>Why you'd like PAi</FieldLabel>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="I juggle 8-10 weddings a month and want to log things faster…"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box' as const,
              padding: '12px 14px', borderRadius: 10,
              border: `1px solid ${C.border}`, background: C.pearl,
              fontSize: 14, fontFamily: 'inherit',
              outline: 'none', resize: 'none' as const, marginBottom: 14,
            }}
          onFocus={scrollIntoViewOnFocus} />

          <button onClick={submit} disabled={submitting} style={{
            width: '100%', padding: 14, borderRadius: 10,
            background: submitting ? C.pearl : C.dark, color: C.gold,
            border: 'none', cursor: submitting ? 'default' : 'pointer',
            fontSize: 12, fontWeight: 500, letterSpacing: '2px',
            textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
            opacity: submitting ? 0.6 : 1,
          }}>{submitting ? 'Submitting…' : 'Request access'}</button>
        </>
      )}
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
  // ──────────── ALL HOOKS DECLARED BEFORE ANY EARLY RETURNS ────────────
  const [accessStatus, setAccessStatus] = useState<'loading' | 'granted' | 'pending' | 'denied' | 'expired'>('loading');
  const [requestSent, setRequestSent] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [photoApprovals, setPhotoApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [listed, setListed] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [completionPct, setCompletionPct] = useState(0);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [servesCities, setServesCities] = useState<string[]>([]);
  const [servesFlexible, setServesFlexible] = useState(false);
  const [yearsActive, setYearsActive] = useState('');
  const [weddingsDelivered, setWeddingsDelivered] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [teamSize, setTeamSize] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [about, setAbout] = useState('');
  const [vibeTags, setVibeTags] = useState<string[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [featuredPhotos, setFeaturedPhotos] = useState<string[]>([]);
  const [cancellationPolicy, setCancellationPolicy] = useState('');

  // Build 3: Lock Date preferences
  const [acceptsLockDate, setAcceptsLockDate] = useState(false);
  const [lockDateAmount, setLockDateAmount] = useState<number>(0);          // in paise
  const [showWhatsappPublic, setShowWhatsappPublic] = useState(false);
  const [categoryDetails, setCategoryDetails] = useState<any>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<any>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [showRejectionDetails, setShowRejectionDetails] = useState(false);

  // Constants
  const CITIES_FULL = ['Delhi NCR', 'Mumbai', 'Bangalore', 'Jaipur', 'Udaipur', 'Kolkata', 'Chennai', 'Hyderabad', 'Lucknow', 'Goa', 'Chandigarh', 'Pune', 'Ahmedabad', 'Surat', 'Indore', 'Kochi', 'Gurugram', 'Noida'];
  const LANGUAGES = ['Hindi', 'English', 'Punjabi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Urdu', 'Odia'];
  const VIBE_TAGS_ALL = ['Candid', 'Luxury', 'Traditional', 'Cinematic', 'Minimalist', 'Destination', 'Royal', 'Bohemian', 'Editorial', 'Modern', 'Intimate', 'Grand'];

  const showToast = (m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  // Effects
  useEffect(() => {
    if (!session?.vendorId) { setAccessStatus('denied'); return; }
    fetch(`${API}/api/vendor-discover/status?vendor_id=${session.vendorId}`)
      .then(r => r.json())
      .then(d => {
        if (d.enabled) {
          setAccessStatus('granted');
          setListed(d.listed || false);
          setSubmittedAt(d.submitted_at || null);
          setRejectionReason(d.rejection_reason || null);
          setCompletionPct(d.completion_pct || 0);
        } else if (d.pending_request) setAccessStatus('pending');
        else if (d.reason === 'expired') setAccessStatus('expired');
        else setAccessStatus('denied');
      })
      .catch(() => setAccessStatus('denied'));
  }, [session?.vendorId]);

  useEffect(() => {
    if (accessStatus === 'granted' && session?.vendorId) loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessStatus, session?.vendorId]);

  const loadProfile = async () => {
    if (!session?.vendorId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/vendor-discover/profile/${session.vendorId}`);
      const d = await res.json();
      if (d.success) {
        const v = d.data.vendor;
        setProfile(v);
        setPackages(d.data.packages || []);
        setBlocks(d.data.blocked_dates || []);
        setPhotoApprovals(d.data.photo_approvals || []);
        setListed(!!v.discover_listed);
        setCompletionPct(v.discover_completion_pct || 0);
        setSubmittedAt(v.discover_submitted_at);
        setRejectionReason(v.discover_rejected_reason);
        setOwnerName(v.owner_name || '');
        setServesCities(Array.isArray(v.serves_cities) ? v.serves_cities : []);
        setServesFlexible(!!v.serves_flexible);
        setYearsActive(v.years_active || '');
        setWeddingsDelivered(v.weddings_delivered || '');
        setLanguages(Array.isArray(v.languages) ? v.languages : []);
        setTeamSize(v.team_size || '');
        setStartingPrice(v.starting_price ? String(v.starting_price) : '');
        setAbout(v.about || '');
        setVibeTags(Array.isArray(v.vibe_tags) ? v.vibe_tags : []);
        setPortfolioImages(Array.isArray(v.portfolio_images) ? v.portfolio_images : []);
        setFeaturedPhotos(Array.isArray(v.featured_photos) ? v.featured_photos : []);
        setCancellationPolicy(v.cancellation_policy || '');
        // Build 3: Lock Date prefs
        setAcceptsLockDate(!!v.accepts_lock_date);
        setLockDateAmount(v.lock_date_amount || 0);
        setShowWhatsappPublic(!!v.show_whatsapp_public);
        setCategoryDetails(v.category_details || {});
      }
    } catch {}
    setLoading(false);
  };

  const saveFields = async (updates: any) => {
    if (!session?.vendorId) return;
    try {
      const res = await fetch(`${API}/api/vendor-discover/profile/${session.vendorId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const d = await res.json();
      if (d.success) {
        showToast('Saved');
        loadProfile();
      } else showToast('Save failed');
    } catch { showToast('Save failed'); }
  };

  const submitAccessRequest = async () => {
    if (!session?.vendorId) return;
    try {
      await fetch(`${API}/api/vendor-discover/request-access`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: session.vendorId, reason: requestReason || null }),
      });
      setRequestSent(true);
      setAccessStatus('pending');
    } catch {}
  };

  const submitForReview = async () => {
    if (!session?.vendorId) return;
    if (completionPct < 70) {
      alert('Complete at least 70% of your profile before submitting. Current: ' + completionPct + '%');
      return;
    }
    if (!confirm('Submit your profile for review?\n\nOur team will review your photos and packages within 24-48 hours. You\'ll get notified once approved.')) return;
    try {
      const res = await fetch(`${API}/api/vendor-discover/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: session.vendorId }),
      });
      const d = await res.json();
      if (d.success) {
        showToast(d.auto_approved ? 'Your profile is live!' : 'Submitted for review');
        loadProfile();
      }
    } catch { showToast('Submission failed'); }
  };

  // Check image dimensions + file size before upload (Build 3)
  const inspectImage = (file: File): Promise<{ ok: boolean; reason?: string; width?: number; height?: number }> => {
    return new Promise(resolve => {
      if (file.size < 150 * 1024) {
        resolve({ ok: false, reason: 'Image looks compressed (likely from WhatsApp) — try a fresh copy from your camera or gallery.' });
        return;
      }
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const { width, height } = img;
        if (width < 900 || height < 900) {
          resolve({ ok: false, reason: `This photo is ${width}×${height}. We recommend at least 900×900 for a crisp display.`, width, height });
          return;
        }
        resolve({ ok: true, width, height });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ ok: false, reason: 'Could not read this image file.' });
      };
      img.src = url;
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingPhoto(true);
    const uploaded: string[] = [];
    const skipped: string[] = [];
    for (const f of files) {
      const check = await inspectImage(f);
      if (!check.ok) {
        skipped.push(`${f.name}: ${check.reason}`);
        continue;
      }
      const url = await uploadToCloudinary(f);
      if (url) uploaded.push(url);
    }
    if (uploaded.length > 0) {
      const next = [...portfolioImages, ...uploaded];
      setPortfolioImages(next);
      await saveFields({ portfolio_images: next });
    }
    if (skipped.length > 0) {
      showToast(`${skipped.length} photo${skipped.length > 1 ? 's' : ''} skipped — try higher resolution`);
    }
    setUploadingPhoto(false);
    e.target.value = '';
  };

  const removePhoto = async (url: string) => {
    const next = portfolioImages.filter(u => u !== url);
    setPortfolioImages(next);
    const nextFeat = featuredPhotos.filter(u => u !== url);
    setFeaturedPhotos(nextFeat);
    await saveFields({ portfolio_images: next, featured_photos: nextFeat });
  };

  const toggleFeatured = async (url: string) => {
    let next: string[];
    if (featuredPhotos.includes(url)) {
      next = featuredPhotos.filter(u => u !== url);
    } else {
      if (featuredPhotos.length >= 5) { showToast('Max 5 featured photos'); return; }
      next = [...featuredPhotos, url];
    }
    setFeaturedPhotos(next);
    await saveFields({ featured_photos: next });
  };

  const openNewPackage = () => {
    setEditingPackage({ id: null, name: '', price: '', duration: '', ideal_for: '', deliverables: [''], included: '' });
  };

  const savePackage = async () => {
    if (!editingPackage || !editingPackage.name) { showToast('Name required'); return; }
    const body = {
      vendor_id: session.vendorId,
      name: editingPackage.name,
      price: editingPackage.price ? parseInt(String(editingPackage.price)) : null,
      duration: editingPackage.duration || null,
      ideal_for: editingPackage.ideal_for || null,
      deliverables: (editingPackage.deliverables || []).filter((d: string) => d.trim()),
      included: editingPackage.included || null,
      sort_order: editingPackage.sort_order || packages.length,
    };
    try {
      let res;
      if (editingPackage.id) {
        res = await fetch(`${API}/api/vendor-discover/packages/${editingPackage.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${API}/api/vendor-discover/packages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      const d = await res.json();
      if (d.success) {
        showToast('Package saved');
        setEditingPackage(null);
        loadProfile();
      } else showToast('Save failed');
    } catch { showToast('Save failed'); }
  };

  const deletePackage = async (id: string) => {
    if (!confirm('Delete this package?')) return;
    try {
      await fetch(`${API}/api/vendor-discover/packages/${id}`, { method: 'DELETE' });
      showToast('Deleted');
      loadProfile();
    } catch {}
  };

  const blockedSet = new Set(blocks.map((b: any) => b.blocked_date));

  const toggleDateBlock = async (dateStr: string) => {
    try {
      if (blockedSet.has(dateStr)) {
        await fetch(`${API}/api/vendor-discover/availability`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendor_id: session.vendorId, dates: [dateStr] }),
        });
      } else {
        await fetch(`${API}/api/vendor-discover/availability`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendor_id: session.vendorId, dates: [dateStr] }),
        });
      }
      loadProfile();
    } catch {}
  };

  // ──────────── EARLY RETURNS ────────────

  if (accessStatus === 'loading') {
    return (
      <div style={{ padding: '120px 28px', textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: `2px solid ${C.goldBorder}`, borderTopColor: C.gold, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (accessStatus !== 'granted') {
    return (
      <div style={{ padding: '80px 28px 100px', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Globe size={28} color={C.gold} />
        </div>
        <h2 style={{
          fontFamily: 'Playfair Display, serif', fontSize: 26,
          color: C.dark, margin: '0 0 10px', fontWeight: 400,
        }}>Your storefront, by invitation.</h2>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: C.muted,
          fontWeight: 300, lineHeight: '22px', margin: '0 0 28px',
        }}>
          Discover is where India's most discerning brides find you. We're hand-picking vendors in this phase to keep the catalogue curated.
        </p>

        {accessStatus === 'pending' || requestSent ? (
          <div style={{
            background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
            borderRadius: 12, padding: '14px 20px', maxWidth: 300, margin: '0 auto',
          }}>
            <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}>
              You're on the list. We'll notify you when access is ready.
            </p>
          </div>
        ) : (
          <div style={{ maxWidth: 320, margin: '0 auto' }}>
            <textarea
              value={requestReason}
              onChange={e => setRequestReason(e.target.value)}
              placeholder="Tell us briefly about your work (optional)"
              rows={2}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: `1px solid ${C.border}`, background: C.ivory,
                fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                color: C.dark, outline: 'none', resize: 'none', marginBottom: 12,
                boxSizing: 'border-box' as const,
              }}
            onFocus={scrollIntoViewOnFocus} />
            <button onClick={submitAccessRequest} style={{
              width: '100%', padding: '14px', borderRadius: 10, background: C.dark,
              border: 'none', cursor: 'pointer', color: C.gold,
              fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500,
              letterSpacing: '0.5px',
            }}>Request Invitation</button>
          </div>
        )}
      </div>
    );
  }

  // ──────────── GRANTED: Dashboard ────────────

  const rejectedPhotos = photoApprovals.filter(p => p.approval_status === 'rejected');
  const pendingPhotos = photoApprovals.filter(p => p.approval_status === 'pending');
  const hasAlerts = !!rejectionReason || rejectedPhotos.length > 0;

  // Styles
  const phaseHeader: React.CSSProperties = {
    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
    cursor: 'pointer' as const, background: 'transparent',
    border: 'none', width: '100%', textAlign: 'left' as const,
  };
  const phaseBody: React.CSSProperties = {
    padding: '4px 16px 16px', borderTop: `1px solid ${C.border}`,
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${C.border}`, background: C.cream,
    fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.dark,
    outline: 'none', boxSizing: 'border-box' as const,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif',
    fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase' as const,
    display: 'block', marginBottom: 6, marginTop: 12,
  };
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: 20, fontSize: 12,
    fontFamily: 'DM Sans, sans-serif', fontWeight: 400, cursor: 'pointer' as const,
    background: active ? C.dark : C.cream,
    color: active ? C.gold : C.dark,
    border: `1px solid ${active ? C.dark : C.border}`,
  });
  const goldBtn: React.CSSProperties = {
    width: '100%', padding: '12px', borderRadius: 10, background: C.dark,
    border: 'none', cursor: 'pointer', color: C.gold, fontSize: 13,
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500, marginTop: 16,
  };

  const togglePhase = (id: string) => setExpandedPhase(expandedPhase === id ? null : id);

  // Phase completion signals
  const phase1Done = !!(profile?.name && profile?.category && profile?.city && portfolioImages.length >= 3);
  const phase2Done = !!(about && about.length >= 100 && vibeTags.length >= 3 && portfolioImages.length >= 10);
  const phase3Done = packages.length >= 1;
  const phase4Done = profile?.category && Object.keys(categoryDetails).length >= 2;
  const phase5Done = blocks.length > 0;
  const phase6Done = !!(cancellationPolicy && profile?.studio_address);

  const phaseDot = (done: boolean) => (
    <div style={{
      width: 22, height: 22, borderRadius: 11,
      background: done ? C.gold : 'transparent',
      border: done ? 'none' : `1.5px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {done && <CheckCircle size={12} color={C.dark} />}
    </div>
  );

  // Category-specific fields
  const updateCD = (k: string, v: any) => setCategoryDetails((prev: any) => ({ ...prev, [k]: v }));
  const toggleCDArr = (k: string, opt: string) => {
    const arr = categoryDetails[k] || [];
    const next = arr.includes(opt) ? arr.filter((x: string) => x !== opt) : [...arr, opt];
    updateCD(k, next);
  };

  const renderCategorySpecific = () => {
    const cat = profile?.category || '';
    const cd = categoryDetails || {};

    if (cat === 'venues') {
      return (
        <>
          <label style={labelStyle}>Capacity (guests)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Min" value={cd.capacity_min || ''} onChange={e => updateCD('capacity_min', e.target.value)} style={inputStyle} type="number" onFocus={scrollIntoViewOnFocus} />
            <input placeholder="Max" value={cd.capacity_max || ''} onChange={e => updateCD('capacity_max', e.target.value)} style={inputStyle} type="number" onFocus={scrollIntoViewOnFocus} />
          </div>
          <label style={labelStyle}>Setting</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {['indoor', 'outdoor', 'both'].map(opt => (
              <button key={opt} onClick={() => updateCD('setting', opt)} style={chip(cd.setting === opt)}>{opt}</button>
            ))}
          </div>
          <label style={labelStyle}>Features</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {['In-house catering', 'Parking', 'Rooms onsite', 'Vegetarian kitchen', 'Liquor license', 'Mandap setup', 'Pet-friendly', 'Poolside'].map(opt => {
              const active = (cd.features || []).includes(opt);
              return <button key={opt} onClick={() => toggleCDArr('features', opt)} style={chip(active)}>{opt}</button>;
            })}
          </div>
        </>
      );
    }
    if (cat === 'photographers' || cat === 'content-creators') {
      return (
        <>
          <label style={labelStyle}>Equipment</label>
          <input placeholder="e.g. Sony A1, Leica Q2" value={cd.equipment || ''} onChange={e => updateCD('equipment', e.target.value)} style={inputStyle} onFocus={scrollIntoViewOnFocus} />
          <label style={labelStyle}>Team on wedding day</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {['1 shooter', '2 shooters', '3+ shooters'].map(opt => (
              <button key={opt} onClick={() => updateCD('shooters', opt)} style={chip(cd.shooters === opt)}>{opt}</button>
            ))}
          </div>
          <label style={labelStyle}>Delivery time</label>
          <input placeholder="e.g. 6-8 weeks" value={cd.delivery_time || ''} onChange={e => updateCD('delivery_time', e.target.value)} style={inputStyle} onFocus={scrollIntoViewOnFocus} />
          <label style={labelStyle}>Add-ons available</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {['Drone', 'Same-day edit', 'Pre-wedding shoot', 'Cinematic video', 'Raw files included'].map(opt => {
              const active = (cd.addons || []).includes(opt);
              return <button key={opt} onClick={() => toggleCDArr('addons', opt)} style={chip(active)}>{opt}</button>;
            })}
          </div>
        </>
      );
    }
    if (cat === 'mua') {
      return (
        <>
          <label style={labelStyle}>Products used</label>
          <input placeholder="e.g. MAC, Huda, Bobbi Brown" value={cd.products || ''} onChange={e => updateCD('products', e.target.value)} style={inputStyle} onFocus={scrollIntoViewOnFocus} />
          <label style={labelStyle}>Services offered</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {['Trial session', 'Hair styling', 'Airbrush', 'HD makeup', 'Family makeup', 'Draping', 'Groom styling'].map(opt => {
              const active = (cd.services || []).includes(opt);
              return <button key={opt} onClick={() => toggleCDArr('services', opt)} style={chip(active)}>{opt}</button>;
            })}
          </div>
          <label style={labelStyle}>Travel radius included (km)</label>
          <input placeholder="e.g. 50" value={cd.travel_km || ''} onChange={e => updateCD('travel_km', e.target.value)} style={inputStyle} type="number" onFocus={scrollIntoViewOnFocus} />
        </>
      );
    }
    if (cat === 'designers' || cat === 'jewellery') {
      return (
        <>
          <label style={labelStyle}>Type</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {['Bespoke', 'Ready-to-wear', 'Both'].map(opt => (
              <button key={opt} onClick={() => updateCD('type', opt)} style={chip(cd.type === opt)}>{opt}</button>
            ))}
          </div>
          <label style={labelStyle}>Rental available</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Yes', 'No'].map(opt => (
              <button key={opt} onClick={() => updateCD('rental', opt)} style={chip(cd.rental === opt)}>{opt}</button>
            ))}
          </div>
          <label style={labelStyle}>Categories</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {['Bridal lehenga', 'Groom sherwani', 'Trousseau', 'Cocktail', 'Reception gowns', 'Pret', 'Fine jewellery', 'Kundan', 'Polki', 'Diamond'].map(opt => {
              const active = (cd.categories || []).includes(opt);
              return <button key={opt} onClick={() => toggleCDArr('categories', opt)} style={chip(active)}>{opt}</button>;
            })}
          </div>
        </>
      );
    }
    if (cat === 'choreographers' || cat === 'dj') {
      return (
        <>
          <label style={labelStyle}>Genres / Styles</label>
          <input placeholder="e.g. Bollywood, Hip-hop, Classical" value={cd.genres || ''} onChange={e => updateCD('genres', e.target.value)} style={inputStyle} onFocus={scrollIntoViewOnFocus} />
          <label style={labelStyle}>Equipment</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {['Provided', 'Client provides', 'Both options'].map(opt => (
              <button key={opt} onClick={() => updateCD('equipment_mode', opt)} style={chip(cd.equipment_mode === opt)}>{opt}</button>
            ))}
          </div>
          <label style={labelStyle}>Add-ons</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {['Live music', 'Special effects', 'Lights', 'Confetti', 'Smoke', 'LED screens'].map(opt => {
              const active = (cd.addons || []).includes(opt);
              return <button key={opt} onClick={() => toggleCDArr('addons', opt)} style={chip(active)}>{opt}</button>;
            })}
          </div>
        </>
      );
    }
    if (cat === 'event-managers') {
      return (
        <>
          <label style={labelStyle}>Package tiers offered</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {['Day-of coordination', 'Partial planning', 'Full planning', 'Destination weddings'].map(opt => {
              const active = (cd.tiers || []).includes(opt);
              return <button key={opt} onClick={() => toggleCDArr('tiers', opt)} style={chip(active)}>{opt}</button>;
            })}
          </div>
          <label style={labelStyle}>Minimum event budget (Rs)</label>
          <input placeholder="e.g. 2500000" value={cd.min_event_budget || ''} onChange={e => updateCD('min_event_budget', e.target.value)} style={inputStyle} type="number" onFocus={scrollIntoViewOnFocus} />
        </>
      );
    }
    if (cat === 'bridal-wellness') {
      return (
        <>
          <label style={labelStyle}>Session types</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {['Yoga', 'Skin care', 'Diet / Nutrition', 'Therapy', 'Fitness', 'Meditation'].map(opt => {
              const active = (cd.sessions || []).includes(opt);
              return <button key={opt} onClick={() => toggleCDArr('sessions', opt)} style={chip(active)}>{opt}</button>;
            })}
          </div>
          <label style={labelStyle}>Program duration</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {['4 weeks', '8 weeks', '12 weeks', 'Custom'].map(opt => (
              <button key={opt} onClick={() => updateCD('duration', opt)} style={chip(cd.duration === opt)}>{opt}</button>
            ))}
          </div>
          <label style={labelStyle}>Home visits available</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Yes', 'No'].map(opt => (
              <button key={opt} onClick={() => updateCD('home_visits', opt)} style={chip(cd.home_visits === opt)}>{opt}</button>
            ))}
          </div>
        </>
      );
    }
    return <p style={{ fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>Category-specific fields coming soon for {cat}.</p>;
  };

  // ──────────── Calendar grid ────────────
  const renderCalendar = () => {
    const { year, month } = calendarMonth;
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startWeekday = firstDay.getDay();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const monthName = firstDay.toLocaleString('en-US', { month: 'long' });
    const fmtDate = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <button onClick={() => setCalendarMonth(m => m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><ChevronRight size={18} color={C.dark} style={{ transform: 'rotate(180deg)' }} /></button>
          <span style={{ fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>{monthName} {year}</span>
          <button onClick={() => setCalendarMonth(m => m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><ChevronRight size={18} color={C.dark} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const ds = fmtDate(d);
            const isBlocked = blockedSet.has(ds);
            const isPast = new Date(year, month, d) < new Date(new Date().toDateString());
            return (
              <button key={i} disabled={isPast} onClick={() => toggleDateBlock(ds)} style={{
                aspectRatio: '1', borderRadius: 8,
                background: isBlocked ? '#C65757' : (isPast ? 'transparent' : C.cream),
                color: isBlocked ? '#fff' : (isPast ? C.light : C.dark),
                border: isBlocked ? 'none' : `1px solid ${isPast ? 'transparent' : C.border}`,
                fontSize: 12, fontFamily: 'DM Sans, sans-serif',
                cursor: isPast ? 'default' : 'pointer',
                opacity: isPast ? 0.4 : 1,
              }}>{d}</button>
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, marginTop: 10, textAlign: 'center' as const }}>
          Tap a date to mark unavailable. Blocked dates won't show your profile to couples planning weddings on those days.
        </p>
      </div>
    );
  };

  // ──────────── Main render ────────────
  return (
    <div style={{ padding: '16px 16px 100px' }}>

      {/* Status banner */}
      {listed && !hasAlerts && (
        <div style={{
          background: C.goldSoft, border: `1px solid ${C.goldBorder}`, borderRadius: 12,
          padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <CheckCircle size={16} color={C.gold} />
          <div>
            <p style={{ margin: 0, fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>You're live on Discovery</p>
            <p style={{ margin: 0, fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>Couples can see your profile now.</p>
          </div>
        </div>
      )}

      {submittedAt && !listed && !hasAlerts && (
        <div style={{
          background: '#FFF5E0', border: `1px solid #F0D89A`, borderRadius: 12,
          padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Clock size={16} color="#A6782A" />
          <div>
            <p style={{ margin: 0, fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>Pending image resolution verification</p>
            <p style={{ margin: 0, fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>Our team will get back within 24-48 hours.</p>
          </div>
        </div>
      )}

      {hasAlerts && (
        <div style={{
          background: '#FFF0F0', border: `1px solid #F0A8A8`, borderRadius: 12,
          padding: '12px 16px', marginBottom: 14, cursor: 'pointer',
        }} onClick={() => setShowRejectionDetails(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <AlertCircle size={16} color="#C65757" />
            <p style={{ margin: 0, fontSize: 13, color: '#B24646', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              Resolution needed {rejectedPhotos.length > 0 && `— ${rejectedPhotos.length} photo${rejectedPhotos.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>
            Tap to see details and re-submit
          </p>
        </div>
      )}

      {/* Completion meter */}
      <div style={{
        background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: 16, marginBottom: 14,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const }}>Your profile</span>
          <span style={{ fontSize: 22, color: C.gold, fontFamily: 'Playfair Display, serif', fontWeight: 400 }}>{completionPct}%</span>
        </div>
        <div style={{ height: 6, background: C.cream, borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ width: `${completionPct}%`, height: '100%', background: C.gold, transition: 'width 0.3s ease' }} />
        </div>
        <p style={{ margin: 0, fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '18px' }}>
          {completionPct < 70 ? `Complete at least 70% to submit for review. ${70 - completionPct}% to go.` :
            listed ? 'Your profile is live. Keep it updated to stay competitive.' :
            submittedAt ? 'Profile submitted. We\'ll review shortly.' :
            'You\'re ready to submit your profile for review.'}
        </p>
        {completionPct >= 70 && !submittedAt && !listed && (
          <button onClick={submitForReview} style={goldBtn}>Submit for review</button>
        )}
        {hasAlerts && (
          <button onClick={submitForReview} style={{ ...goldBtn, background: '#C65757', color: '#fff' }}>Re-submit for review</button>
        )}
      </div>

      {/* PHASE 1: Essentials */}
      <div style={{ background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
        <button onClick={() => togglePhase('essentials')} style={phaseHeader}>
          {phaseDot(phase1Done)}
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>Essentials</p>
            <p style={{ margin: 0, fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>Business basics, cities, languages</p>
          </div>
          <ChevronDown size={16} color={C.muted} style={{ transform: expandedPhase === 'essentials' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        {expandedPhase === 'essentials' && (
          <div style={phaseBody}>
            <label style={labelStyle}>Owner name</label>
            <input value={ownerName} onChange={e => setOwnerName(e.target.value)} onBlur={() => saveFields({ owner_name: ownerName })} placeholder="Your full name" style={inputStyle} onFocus={scrollIntoViewOnFocus} />

            <label style={labelStyle}>Serves cities (select up to 10 — or mark flexible)</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 8 }}>
              <button onClick={() => { const n = !servesFlexible; setServesFlexible(n); saveFields({ serves_flexible: n }); }} style={chip(servesFlexible)}>Flexible (any location)</button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
              {CITIES_FULL.map(c => {
                const active = servesCities.includes(c);
                return <button key={c} onClick={() => {
                  const next = active ? servesCities.filter(x => x !== c) : (servesCities.length >= 10 ? servesCities : [...servesCities, c]);
                  setServesCities(next); saveFields({ serves_cities: next });
                }} style={chip(active)}>{c}</button>;
              })}
            </div>

            <label style={labelStyle}>Years in business</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
              {['<1yr', '1-3yrs', '3-7yrs', '7+yrs'].map(opt => (
                <button key={opt} onClick={() => { setYearsActive(opt); saveFields({ years_active: opt }); }} style={chip(yearsActive === opt)}>{opt}</button>
              ))}
            </div>

            <label style={labelStyle}>Weddings delivered</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
              {['<10', '10-50', '50-200', '200+'].map(opt => (
                <button key={opt} onClick={() => { setWeddingsDelivered(opt); saveFields({ weddings_delivered: opt }); }} style={chip(weddingsDelivered === opt)}>{opt}</button>
              ))}
            </div>

            <label style={labelStyle}>Languages spoken</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
              {LANGUAGES.map(l => {
                const active = languages.includes(l);
                return <button key={l} onClick={() => {
                  const next = active ? languages.filter(x => x !== l) : [...languages, l];
                  setLanguages(next); saveFields({ languages: next });
                }} style={chip(active)}>{l}</button>;
              })}
            </div>

            <label style={labelStyle}>Team size</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
              {['solo', '2-5', '6-10', '10+'].map(opt => (
                <button key={opt} onClick={() => { setTeamSize(opt); saveFields({ team_size: opt }); }} style={chip(teamSize === opt)}>{opt}</button>
              ))}
            </div>

            <label style={labelStyle}>Starting price (Rs)</label>
            <input value={startingPrice} onChange={e => setStartingPrice(e.target.value)} onBlur={() => saveFields({ starting_price: startingPrice ? parseInt(startingPrice) : null })} placeholder="e.g. 150000" type="number" style={inputStyle} onFocus={scrollIntoViewOnFocus} />
          </div>
        )}
      </div>

      {/* PHASE 2: Profile content */}
      <div style={{ background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
        <button onClick={() => togglePhase('profile')} style={phaseHeader}>
          {phaseDot(phase2Done)}
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>Your story & portfolio</p>
            <p style={{ margin: 0, fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>Bio, vibe tags, photos</p>
          </div>
          <ChevronDown size={16} color={C.muted} style={{ transform: expandedPhase === 'profile' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        {expandedPhase === 'profile' && (
          <div style={phaseBody}>
            <label style={labelStyle}>About you / your business (150-500 chars)</label>
            <textarea value={about} onChange={e => setAbout(e.target.value)} onBlur={() => saveFields({ about })} placeholder="Tell couples what makes your work special..." rows={5} style={{ ...inputStyle, resize: 'none' as const, fontFamily: 'DM Sans, sans-serif' }} maxLength={500} onFocus={scrollIntoViewOnFocus} />
            <p style={{ margin: '4px 0 0', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', textAlign: 'right' as const }}>{about.length}/500</p>

            <label style={labelStyle}>Vibe tags (pick 3-5)</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
              {VIBE_TAGS_ALL.map(v => {
                const active = vibeTags.includes(v);
                return <button key={v} onClick={() => {
                  const next = active ? vibeTags.filter(x => x !== v) : (vibeTags.length >= 5 ? vibeTags : [...vibeTags, v]);
                  setVibeTags(next); saveFields({ vibe_tags: next });
                }} style={chip(active)}>{v}</button>;
              })}
            </div>

            <label style={labelStyle}>Portfolio ({portfolioImages.length} photos — 10+ recommended)</label>

            {/* Build 3: Coaching pill — framed as insight, not rule */}
            <div style={{
              background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
              borderRadius: 10, padding: '10px 14px', marginBottom: 12,
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <Sparkles size={12} color={C.gold} style={{ marginTop: 2, flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 11, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 400, lineHeight: '16px' }}>
                Couples tend to spend 3x longer on profiles with vertical, high-resolution photos.
              </p>
            </div>

            {portfolioImages.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
                {portfolioImages.map((url, i) => {
                  const approval = photoApprovals.find(p => p.image_url === url && p.context === 'portfolio');
                  const rejected = approval?.approval_status === 'rejected';
                  const isFeatured = featuredPhotos.includes(url);
                  return (
                    <div key={i} style={{
                      aspectRatio: '1', position: 'relative' as const,
                      borderRadius: 8, overflow: 'hidden',
                      background: `url(${url}) center/cover`,
                      border: rejected ? '2px solid #C65757' : (isFeatured ? `2px solid ${C.gold}` : `1px solid ${C.border}`),
                    }}>
                      <button onClick={() => toggleFeatured(url)} style={{
                        position: 'absolute', top: 4, left: 4,
                        background: isFeatured ? C.gold : 'rgba(0,0,0,0.5)',
                        border: 'none', borderRadius: 4, padding: '2px 5px',
                        fontSize: 9, color: isFeatured ? C.dark : '#fff',
                        fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer',
                      }}>{isFeatured ? '★' : '☆'}</button>
                      <button onClick={() => removePhoto(url)} style={{
                        position: 'absolute', top: 4, right: 4,
                        background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 10,
                        width: 20, height: 20, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><X size={10} color="#fff" /></button>
                      {rejected && (
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          background: '#C65757', color: '#fff',
                          fontSize: 9, padding: '2px 4px',
                          fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                          textAlign: 'center' as const,
                        }}>Rejected</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <label style={{
              display: 'block', padding: '16px', borderRadius: 10,
              border: `2px dashed ${C.border}`, background: C.cream,
              textAlign: 'center' as const, cursor: 'pointer',
              fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif',
            }}>
              <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} style={{ display: 'none' }} />
              {uploadingPhoto ? 'Uploading...' : (
                <>
                  <Upload size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Upload photos
                </>
              )}
            </label>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              Tap ★ to mark a photo as featured (max 5 — these appear in your hero)
            </p>
          </div>
        )}
      </div>

      {/* PHASE 3: Packages */}
      <div style={{ background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
        <button onClick={() => togglePhase('packages')} style={phaseHeader}>
          {phaseDot(phase3Done)}
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>Packages</p>
            <p style={{ margin: 0, fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>Tiered offerings with pricing ({packages.length} added)</p>
          </div>
          <ChevronDown size={16} color={C.muted} style={{ transform: expandedPhase === 'packages' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        {expandedPhase === 'packages' && (
          <div style={phaseBody}>
            {packages.map(pkg => (
              <div key={pkg.id} style={{
                background: C.cream, borderRadius: 10, padding: '12px 14px', marginBottom: 8,
                border: `1px solid ${C.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 2px', fontSize: 14, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 500 }}>{pkg.name}</p>
                    {pkg.price && <p style={{ margin: 0, fontSize: 13, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>Rs {(pkg.price / 100000).toFixed(pkg.price % 100000 === 0 ? 0 : 1)}L</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setEditingPackage({ ...pkg })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Edit2 size={14} color={C.muted} /></button>
                    <button onClick={() => deletePackage(pkg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Trash2 size={14} color="#C65757" /></button>
                  </div>
                </div>
                {pkg.duration && <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>{pkg.duration}</p>}
                {pkg.deliverables && pkg.deliverables.length > 0 && (
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>{pkg.deliverables.join(' · ')}</p>
                )}
              </div>
            ))}
            <button onClick={openNewPackage} style={{
              width: '100%', padding: '12px', borderRadius: 10,
              background: 'transparent', border: `1.5px dashed ${C.border}`,
              cursor: 'pointer', color: C.muted, fontSize: 13,
              fontFamily: 'DM Sans, sans-serif', fontWeight: 400,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Plus size={14} /> Add package
            </button>
          </div>
        )}
      </div>

      {/* PHASE 4: Category-specific */}
      <div style={{ background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
        <button onClick={() => togglePhase('category')} style={phaseHeader}>
          {phaseDot(phase4Done)}
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>Category details</p>
            <p style={{ margin: 0, fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>What couples need to match you</p>
          </div>
          <ChevronDown size={16} color={C.muted} style={{ transform: expandedPhase === 'category' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        {expandedPhase === 'category' && (
          <div style={phaseBody}>
            {renderCategorySpecific()}
            <button onClick={() => saveFields({ category_details: categoryDetails })} style={goldBtn}>Save category details</button>
          </div>
        )}
      </div>

      {/* PHASE 5: Availability */}
      <div style={{ background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
        <button onClick={() => togglePhase('availability')} style={phaseHeader}>
          {phaseDot(phase5Done)}
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>Availability</p>
            <p style={{ margin: 0, fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>Block dates you're unavailable</p>
          </div>
          <ChevronDown size={16} color={C.muted} style={{ transform: expandedPhase === 'availability' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        {expandedPhase === 'availability' && (
          <div style={phaseBody}>
            {renderCalendar()}
          </div>
        )}
      </div>

      {/* PHASE 6: Trust */}
      <div style={{ background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
        <button onClick={() => togglePhase('trust')} style={phaseHeader}>
          {phaseDot(phase6Done)}
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>Trust & policies</p>
            <p style={{ margin: 0, fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>Cancellation, studio address</p>
          </div>
          <ChevronDown size={16} color={C.muted} style={{ transform: expandedPhase === 'trust' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        {expandedPhase === 'trust' && (
          <div style={phaseBody}>
            <label style={labelStyle}>Cancellation policy</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
              {['flexible', 'moderate', 'strict'].map(opt => (
                <button key={opt} onClick={() => { setCancellationPolicy(opt); saveFields({ cancellation_policy: opt }); }} style={chip(cancellationPolicy === opt)}>{opt}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PHASE 7: Lock Date preferences (Build 3) */}
      {(() => {
        const tier = (session?.tier || 'essential').toLowerCase();
        const bands: Record<string, [number, number, string]> = {
          essential: [100000, 300000, 'Rs 1,000 – 3,000'],
          signature: [300000, 1000000, 'Rs 3,000 – 10,000'],
          prestige: [1000000, 5000000, 'Rs 10,000 – 50,000'],
        };
        const [minAmt, maxAmt, bandLabel] = bands[tier] || bands.essential;
        const currentAmt = lockDateAmount || minAmt;
        const phase7Done = acceptsLockDate && currentAmt >= minAmt;

        const saveLockPrefs = async (updates: any) => {
          try {
            const res = await fetch(`${API}/api/vendor-discover/lock-prefs/${session?.vendorId}`, {
              method: 'PATCH', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates),
            });
            const d = await res.json();
            if (!d.success) showToast(d.error || 'Failed to save');
            else showToast('Saved');
          } catch {
            showToast('Failed to save');
          }
        };

        return (
          <div style={{ background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
            <button onClick={() => togglePhase('lockdate')} style={phaseHeader}>
              {phaseDot(phase7Done)}
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                  Lock Date & WhatsApp
                  <span style={{ marginLeft: 6, fontSize: 8, fontWeight: 600, color: C.dark, background: C.gold, padding: '1px 5px', borderRadius: 3, letterSpacing: '0.5px', verticalAlign: 'middle' }}>BETA</span>
                </p>
                <p style={{ margin: 0, fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                  Accept date locks, set amount, WhatsApp visibility
                </p>
              </div>
              <ChevronDown size={16} color={C.muted} style={{ transform: expandedPhase === 'lockdate' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {expandedPhase === 'lockdate' && (
              <div style={phaseBody}>
                <div style={{
                  padding: '10px 12px', background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                  borderRadius: 8, marginBottom: 14,
                }}>
                  <p style={{ margin: 0, fontSize: 11, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 400, lineHeight: '16px' }}>
                    Vendors who accept Lock Date tend to receive higher-intent enquiries. When a couple pays this amount, they're committing to your 7-day response window.
                  </p>
                </div>

                {/* Accept Lock Date toggle */}
                <label style={labelStyle}>Accept Lock Date bookings?</label>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <button onClick={() => { setAcceptsLockDate(true); saveLockPrefs({ accepts_lock_date: true, lock_date_amount: currentAmt }); }} style={{
                    flex: 1, padding: '10px 14px', borderRadius: 10,
                    background: acceptsLockDate ? C.dark : C.cream,
                    color: acceptsLockDate ? C.gold : C.dark,
                    border: `1px solid ${acceptsLockDate ? C.dark : C.border}`,
                    fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer',
                  }}>Yes, accept</button>
                  <button onClick={() => { setAcceptsLockDate(false); saveLockPrefs({ accepts_lock_date: false }); }} style={{
                    flex: 1, padding: '10px 14px', borderRadius: 10,
                    background: !acceptsLockDate ? C.dark : C.cream,
                    color: !acceptsLockDate ? C.gold : C.dark,
                    border: `1px solid ${!acceptsLockDate ? C.dark : C.border}`,
                    fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer',
                  }}>Not now</button>
                </div>

                {/* Lock amount slider */}
                {acceptsLockDate && (
                  <>
                    <label style={labelStyle}>Lock amount (your tier: {tier}, {bandLabel})</label>
                    <div style={{
                      padding: '14px 16px', background: C.cream, border: `1px solid ${C.border}`,
                      borderRadius: 10, marginBottom: 6,
                    }}>
                      <p style={{ margin: '0 0 8px', fontSize: 22, color: C.gold, fontFamily: 'Playfair Display, serif', fontWeight: 500, textAlign: 'center' as const }}>
                        Rs {(currentAmt / 100).toLocaleString('en-IN')}
                      </p>
                      <input type="range"
                        min={minAmt} max={maxAmt} step={10000}
                        value={currentAmt}
                        onChange={e => setLockDateAmount(parseInt(e.target.value))}
                        onMouseUp={e => saveLockPrefs({ lock_date_amount: parseInt((e.target as HTMLInputElement).value) })}
                        onTouchEnd={e => saveLockPrefs({ lock_date_amount: parseInt((e.target as HTMLInputElement).value) })}
                        style={{ width: '100%', accentColor: C.gold }}
                      onFocus={scrollIntoViewOnFocus} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>Rs {(minAmt / 100).toLocaleString('en-IN')}</span>
                        <span style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>Rs {(maxAmt / 100).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <p style={{ margin: '0 0 16px', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontStyle: 'italic' as const, lineHeight: '14px' }}>
                      When a couple locks, this amount is held in escrow. If they book within 7 days, it applies to your fee. If not, they get refunded.
                    </p>
                  </>
                )}

                {/* WhatsApp toggle */}
                <label style={labelStyle}>Show WhatsApp on your public profile?</label>
                <div style={{
                  padding: '10px 12px', background: C.cream, border: `1px solid ${C.border}`,
                  borderRadius: 8, marginBottom: 12,
                }}>
                  <p style={{ margin: 0, fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '16px' }}>
                    If ON: any couple can WhatsApp you directly. If OFF: couples must enquire in-app first, and WhatsApp becomes available only after Lock Date.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setShowWhatsappPublic(true); saveLockPrefs({ show_whatsapp_public: true }); }} style={{
                    flex: 1, padding: '10px 14px', borderRadius: 10,
                    background: showWhatsappPublic ? C.dark : C.cream,
                    color: showWhatsappPublic ? C.gold : C.dark,
                    border: `1px solid ${showWhatsappPublic ? C.dark : C.border}`,
                    fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer',
                  }}>Show WhatsApp</button>
                  <button onClick={() => { setShowWhatsappPublic(false); saveLockPrefs({ show_whatsapp_public: false }); }} style={{
                    flex: 1, padding: '10px 14px', borderRadius: 10,
                    background: !showWhatsappPublic ? C.dark : C.cream,
                    color: !showWhatsappPublic ? C.gold : C.dark,
                    border: `1px solid ${!showWhatsappPublic ? C.dark : C.border}`,
                    fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer',
                  }}>Keep in-app only</button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Package editor modal */}
      {editingPackage && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end',
        }} onClick={() => setEditingPackage(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 480, margin: '0 auto',
            background: C.cream, borderRadius: '20px 20px 0 0',
            padding: '20px 20px max(24px, env(safe-area-inset-bottom))',
            maxHeight: '90vh', overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontFamily: 'Playfair Display, serif', color: C.dark, fontWeight: 400 }}>
                {editingPackage.id ? 'Edit package' : 'New package'}
              </h3>
              <button onClick={() => setEditingPackage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color={C.muted} /></button>
            </div>

            <label style={labelStyle}>Package name</label>
            <input value={editingPackage.name} onChange={e => setEditingPackage({ ...editingPackage, name: e.target.value })} placeholder='e.g. "Signature Wedding"' style={inputStyle} onFocus={scrollIntoViewOnFocus} />

            <label style={labelStyle}>Price (Rs)</label>
            <input value={editingPackage.price || ''} onChange={e => setEditingPackage({ ...editingPackage, price: e.target.value })} placeholder="e.g. 450000" type="number" style={inputStyle} onFocus={scrollIntoViewOnFocus} />

            <label style={labelStyle}>Duration</label>
            <input value={editingPackage.duration || ''} onChange={e => setEditingPackage({ ...editingPackage, duration: e.target.value })} placeholder="e.g. 8-10 hours" style={inputStyle} onFocus={scrollIntoViewOnFocus} />

            <label style={labelStyle}>Ideal for</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['intimate', 'medium', 'grand'].map(opt => (
                <button key={opt} onClick={() => setEditingPackage({ ...editingPackage, ideal_for: opt })} style={chip(editingPackage.ideal_for === opt)}>{opt}</button>
              ))}
            </div>

            <label style={labelStyle}>Deliverables (one per line)</label>
            {(editingPackage.deliverables || ['']).map((d: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input value={d} onChange={e => {
                  const next = [...editingPackage.deliverables];
                  next[i] = e.target.value;
                  setEditingPackage({ ...editingPackage, deliverables: next });
                }} placeholder="e.g. 500 edited images" style={inputStyle} onFocus={scrollIntoViewOnFocus} />
                {editingPackage.deliverables.length > 1 && (
                  <button onClick={() => {
                    const next = editingPackage.deliverables.filter((_: any, idx: number) => idx !== i);
                    setEditingPackage({ ...editingPackage, deliverables: next });
                  }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={14} color={C.muted} /></button>
                )}
              </div>
            ))}
            <button onClick={() => setEditingPackage({ ...editingPackage, deliverables: [...(editingPackage.deliverables || []), ''] })} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: C.gold, fontFamily: 'DM Sans, sans-serif',
            }}>+ Add deliverable</button>

            <button onClick={savePackage} style={goldBtn}>Save package</button>
          </div>
        </div>
      )}

      {/* Rejection details modal */}
      {showRejectionDetails && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end',
        }} onClick={() => setShowRejectionDetails(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 480, margin: '0 auto',
            background: C.cream, borderRadius: '20px 20px 0 0',
            padding: '20px 20px max(24px, env(safe-area-inset-bottom))',
            maxHeight: '80vh', overflow: 'auto',
          }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 18, fontFamily: 'Playfair Display, serif', color: C.dark, fontWeight: 400 }}>Feedback from review</h3>

            {rejectionReason && (
              <div style={{ background: '#FFF0F0', border: '1px solid #F0A8A8', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: '#B24646', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase' as const }}>Overall note</p>
                <p style={{ margin: 0, fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '20px' }}>{rejectionReason}</p>
              </div>
            )}

            {rejectedPhotos.length > 0 && (
              <>
                <p style={{ margin: '0 0 10px', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase' as const }}>Rejected photos ({rejectedPhotos.length})</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {rejectedPhotos.map(p => (
                    <div key={p.id} style={{
                      borderRadius: 8, overflow: 'hidden', border: '2px solid #C65757',
                    }}>
                      <div style={{ aspectRatio: '1', background: `url(${p.image_url}) center/cover` }} />
                      {p.rejection_reason && (
                        <div style={{ padding: 8, background: '#FFF0F0' }}>
                          <p style={{ margin: 0, fontSize: 10, color: '#B24646', fontFamily: 'DM Sans, sans-serif', fontWeight: 400, lineHeight: '14px' }}>{p.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p style={{ margin: '14px 0 0', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '18px' }}>
                  Remove or replace rejected photos from the Portfolio section above, then re-submit.
                </p>
              </>
            )}

            <button onClick={() => setShowRejectionDetails(false)} style={goldBtn}>Got it</button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 'max(90px, calc(env(safe-area-inset-bottom) + 80px))',
          left: '50%', transform: 'translateX(-50%)', zIndex: 200,
          background: C.dark, borderRadius: 12, padding: '10px 20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <span style={{ fontSize: 13, color: '#fff', fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}>{toast}</span>
        </div>
      )}
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

        {/* Quick import row — phonebook (Android) + WhatsApp (DreamAi gated) */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <button onClick={() => {
            const supported = typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;
            if (!supported) {
              alert('Phonebook import is launching soon. Currently supported only on Android Chrome — we are bringing it to iOS too.');
              return;
            }
            (async () => {
              try {
                // @ts-ignore — Contact Picker API
                const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: false });
                if (!contacts || contacts.length === 0) return;
                const c = contacts[0];
                const name = (c.name?.[0] || '').trim();
                const phone = (c.tel?.[0] || '').replace(/\D/g, '').slice(-10);
                if (name) p.setName(name);
                if (phone) p.setPhone(phone);
              } catch {}
            })();
          }} style={{
            flex: 1, background: C.cream, border: `1px solid ${C.goldBorder}`,
            borderRadius: '10px', padding: '10px 12px',
            fontSize: '11px', color: C.goldDeep, fontWeight: 500,
            fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
            display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6,
          }}>
            <Phone size={12} />
            <span>From phonebook</span>
          </button>
          <button onClick={() => {
            const hasDreamAi = (p as any)?.session?.hasDreamAi || false;
            if (hasDreamAi) {
              alert('WhatsApp client import: coming in the next build. For now, copy the contact details from WhatsApp into the form below.');
            } else {
              alert('WhatsApp client import is included with DreamAi. Unlock from the DreamAi floating button.');
            }
          }} style={{
            flex: 1, background: C.cream, border: `1px solid ${C.goldBorder}`,
            borderRadius: '10px', padding: '10px 12px',
            fontSize: '11px', color: C.goldDeep, fontWeight: 500,
            fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
            display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6,
          }}>
            <MessageCircle size={12} />
            <span>From WhatsApp</span>
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
          onFocus={scrollIntoViewOnFocus} />
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
            onFocus={scrollIntoViewOnFocus} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>EMAIL</label>
            <input
              type="email" style={input}
              placeholder="Optional"
              value={p.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => p.setEmail(e.target.value)}
            onFocus={scrollIntoViewOnFocus} />
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
          onFocus={scrollIntoViewOnFocus} />
        </div>

        <div>
          <label style={labelStyle}>VENUE</label>
          <input
            type="text" style={input}
            placeholder="e.g. The Leela Palace, Delhi"
            value={p.venue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => p.setVenue(e.target.value)}
          onFocus={scrollIntoViewOnFocus} />
        </div>

        <div>
          <label style={labelStyle}>BUDGET (₹)</label>
          <input
            type="tel" style={input}
            placeholder="e.g. 500000"
            value={p.budget}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => p.setBudget(e.target.value.replace(/\D/g, ''))}
          onFocus={scrollIntoViewOnFocus} />
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
          fontSize: '18px', color: '#FAF6F0', fontWeight: 300,
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
  { id: 'expenses',  label: 'Expense Tracker',   icon: Package,  minTier: 'signature', href: '/vendor/mobile?sub=expenses',   desc: 'Track every expense. Tag to clients. See profit per wedding.' },
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
              textAlign: 'center', marginTop: '10px',
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

function FieldLabel({ children, style, required }: { children: React.ReactNode; style?: React.CSSProperties; required?: boolean }) {
  return (
    <div style={{
      fontFamily: 'DM Sans, sans-serif',
      fontSize: '10px', fontWeight: 500,
      letterSpacing: '1.5px', textTransform: 'uppercase',
      color: C.muted, marginBottom: '6px',
      ...style,
    }}>
      {children}
      {required && <span style={{ color: '#C65757', marginLeft: 4, letterSpacing: 0 }}>*</span>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// QUICK INVOICE SHEET — create a simple invoice for an existing client
// ══════════════════════════════════════════════════════════════════════════

function QuickInvoiceSheet({
  vendorId, vendorName, clients, onClose, onSaved, onClientCreated,
}: {
  vendorId: string; vendorName: string; clients: any[];
  onClose: () => void; onSaved: (invoice: any) => void;
  onClientCreated?: (client: any) => void;
}) {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [gstEnabled, setGstEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [savedInvoice, setSavedInvoice] = useState<any>(null);

  // Autocomplete: filter clients by name match (minimum 2 chars typed, no exact match)
  const matches = clientName.trim().length >= 2 && !selectedClient
    ? clients.filter(c => c.name?.toLowerCase().includes(clientName.trim().toLowerCase())).slice(0, 5)
    : [];

  const canSave = clientName.trim().length > 0 && amount && parseInt(amount) > 0 && !submitting;

  const pickClient = (c: any) => {
    setSelectedClient(c);
    setClientName(c.name || '');
    setClientPhone(c.phone || '');
    setShowSuggestions(false);
  };

  const clearClient = () => {
    setSelectedClient(null);
    setClientName('');
    setClientPhone('');
  };

  const handleSave = async () => {
    if (!canSave) return;
    setError('');
    setSubmitting(true);
    try {
      let clientId = selectedClient?.id || null;
      let clientWasCreated = false;

      // If no client selected and no match, auto-create an incomplete client
      if (!clientId) {
        const autoClient = {
          vendor_id: vendorId,
          name: clientName.trim(),
          phone: clientPhone.trim() || null,
          profile_incomplete: true,
        };
        try {
          const cr = await fetch(API + '/api/vendor-clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(autoClient),
          });
          const cd = await cr.json();
          if (cd.success && cd.data) {
            clientId = cd.data.id;
            clientWasCreated = true;
            onClientCreated && onClientCreated(cd.data);
          }
        } catch { /* non-fatal — continue without client_id */ }
      }

      const amt = parseInt(amount);
      const d = new Date();
      const yymmdd = d.toISOString().slice(2, 10).replace(/-/g, '');
      const invoice_number = `INV-${yymmdd}-${Math.floor(Math.random() * 900 + 100)}`;

      const r = await fetch(API + '/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          client_id: clientId,
          client_name: clientName.trim(),
          client_phone: clientPhone.trim() || null,
          client_email: selectedClient?.email || null,
          amount: amt,
          description: description.trim() || `Services by ${vendorName}`,
          invoice_number,
          status: 'unpaid',
          issue_date: new Date().toISOString().slice(0, 10),
          gst_enabled: gstEnabled,
        }),
      });
      const d2 = await r.json();
      if (d2.success && d2.data) {
        setSavedInvoice({ ...d2.data, _clientWasCreated: clientWasCreated });
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

  const handleWhatsApp = () => {
    if (!savedInvoice) return;
    const amt = parseInt(amount);
    const gstPart = gstEnabled ? `\nGST (18%): ₹${(amt * 0.18).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '';
    const total = gstEnabled ? amt * 1.18 : amt;
    const msg = `Hi ${clientName.trim()},\n\nInvoice from ${vendorName}:\n*${savedInvoice.invoice_number}*\n\nAmount: ₹${amt.toLocaleString('en-IN')}${gstPart}\n*Total: ₹${total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}*\n\n${description.trim() || 'Services rendered'}\n\nKindly process payment at your earliest convenience.\n\nThank you,\n${vendorName}`;
    const phone = (clientPhone || '').replace(/\D/g, '');
    const waUrl = phone
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  // Post-save confirmation screen
  if (savedInvoice) {
    return (
      <SheetOverlay onClose={onClose}>
        <SheetHeader eyebrow="Invoice Created" title={savedInvoice.invoice_number} onClose={onClose} />
        <div style={{
          padding: '18px 16px', borderRadius: 12, marginBottom: 14,
          background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
        }}>
          <div style={{ fontSize: 11, color: C.goldDeep, fontWeight: 500, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 4 }}>Client</div>
          <div style={{ fontSize: 15, color: C.dark, fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>
            {clientName}
            {savedInvoice._clientWasCreated && (
              <span style={{
                display: 'inline-block', marginLeft: 8, width: 6, height: 6, borderRadius: 3,
                background: '#E57373', verticalAlign: 'middle',
              }} />
            )}
          </div>
          {savedInvoice._clientWasCreated && (
            <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
              New client added — complete profile in Clients tab.
            </div>
          )}
          <div style={{ fontSize: 11, color: C.goldDeep, fontWeight: 500, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginTop: 12, marginBottom: 4 }}>Total</div>
          <div style={{ fontSize: 22, color: C.dark, fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>
            ₹{(gstEnabled ? parseInt(amount) * 1.18 : parseInt(amount)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          {gstEnabled && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Includes 18% GST</div>}
        </div>

        <button
          onClick={handleWhatsApp}
          style={{
            width: '100%', padding: 14, borderRadius: 12, marginBottom: 10,
            background: '#25D366', color: '#fff', border: 'none',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            letterSpacing: '1.5px', textTransform: 'uppercase' as const,
            fontFamily: 'DM Sans, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Send size={14} /> Share on WhatsApp
        </button>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: 12, borderRadius: 12,
            background: 'transparent', color: C.muted,
            border: `1px solid ${C.border}`, cursor: 'pointer',
            fontSize: 11, fontWeight: 500, letterSpacing: '1.5px',
            textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
          }}
        >Done</button>
      </SheetOverlay>
    );
  }

  return (
    <SheetOverlay onClose={onClose}>
      <SheetHeader eyebrow="Quick Action" title="Create Invoice" onClose={onClose} />

      <FieldLabel required>Client Name</FieldLabel>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <input
          type="text"
          value={clientName}
          onChange={(e) => {
            setClientName(e.target.value);
            if (selectedClient && e.target.value !== selectedClient.name) setSelectedClient(null);
            setShowSuggestions(true);
            setError('');
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Type client name…"
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            background: C.ivory, border: `1px solid ${selectedClient ? C.goldBorder : C.border}`,
            borderRadius: 12, padding: '13px 14px',
            fontSize: 14, color: C.dark,
            fontFamily: 'DM Sans, sans-serif', outline: 'none',
          }}
        />
        {selectedClient && (
          <button
            onClick={clearClient}
            style={{
              position: 'absolute' as const, top: 10, right: 10,
              background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
              borderRadius: 12, padding: '4px 10px',
              fontSize: 10, color: C.goldDeep,
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            ✓ From list
          </button>
        )}
        {showSuggestions && matches.length > 0 && (
          <div style={{
            position: 'absolute' as const, top: '100%', left: 0, right: 0,
            marginTop: 4, background: C.ivory,
            border: `1px solid ${C.border}`, borderRadius: 10,
            boxShadow: '0 6px 18px rgba(44,36,32,0.1)',
            maxHeight: 200, overflowY: 'auto' as const, zIndex: 10,
          }}>
            {matches.map(c => (
              <button
                key={c.id}
                onClick={() => pickClient(c)}
                style={{
                  width: '100%', padding: '10px 14px',
                  background: 'transparent', border: 'none',
                  borderBottom: `1px solid ${C.borderSoft}`,
                  textAlign: 'left' as const, cursor: 'pointer',
                  fontFamily: 'inherit', display: 'flex',
                  alignItems: 'center', gap: 10,
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 15,
                  background: C.goldSoft, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600, color: C.goldDeep,
                  fontFamily: "'Playfair Display', serif",
                }}>
                  {(c.name || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>
                    {c.event_type || 'Client'}{c.phone ? ` · ${c.phone}` : ''}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        {showSuggestions && clientName.trim().length >= 2 && matches.length === 0 && !selectedClient && (
          <div style={{
            position: 'absolute' as const, top: '100%', left: 0, right: 0,
            marginTop: 4, padding: '10px 14px',
            background: C.champagne, border: `1px solid ${C.goldBorder}`,
            borderRadius: 10, fontSize: 11, color: C.muted, zIndex: 10,
          }}>
            No match in your client list. Will be added as a new client when you save.
          </div>
        )}
      </div>

      {!selectedClient && (
        <>
          <FieldLabel>Client Phone</FieldLabel>
          <input
            type="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
            placeholder="10-digit mobile"
            style={{
              width: '100%', boxSizing: 'border-box' as const,
              background: C.ivory, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: '13px 14px',
              fontSize: 14, color: C.dark,
              fontFamily: 'DM Sans, sans-serif', outline: 'none',
              marginBottom: 14,
            }}
          onFocus={scrollIntoViewOnFocus} />
        </>
      )}

      <FieldLabel>Amount (₹)</FieldLabel>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: C.ivory, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: '13px 14px', marginBottom: 14,
      }}>
        <span style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 18, color: C.goldDeep, fontWeight: 400,
        }}>₹</span>
        <input
          type="text"
          inputMode="numeric"
          value={amount ? parseInt(amount).toLocaleString('en-IN') : ''}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="e.g. 50000"
          style={{
            flex: 1, background: 'transparent', border: 'none',
            fontSize: 18, fontFamily: "'Playfair Display', serif",
            color: C.dark, fontWeight: 400, outline: 'none',
          }}
        onFocus={scrollIntoViewOnFocus} />
      </div>

      <FieldLabel required>Description</FieldLabel>
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="e.g. Wedding photography — Sangeet + Reception"
        style={{
          width: '100%', boxSizing: 'border-box' as const,
          background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '13px 14px',
          fontSize: 13, color: C.dark,
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          marginBottom: 14,
        }}
      onFocus={scrollIntoViewOnFocus} />

      {/* GST toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: gstEnabled ? C.goldSoft : C.pearl,
        border: `1px solid ${gstEnabled ? C.goldBorder : C.border}`,
        borderRadius: 12, padding: '12px 14px', marginBottom: 16,
        transition: 'all 0.2s ease',
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.dark, fontFamily: 'DM Sans, sans-serif' }}>
            Add GST (18%)
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
            Total: ₹{amount ? ((gstEnabled ? parseInt(amount) * 1.18 : parseInt(amount)).toLocaleString('en-IN', { maximumFractionDigits: 0 })) : '0'}
          </div>
        </div>
        <button
          onClick={() => setGstEnabled(!gstEnabled)}
          style={{
            width: 40, height: 22, borderRadius: 11,
            background: gstEnabled ? C.gold : C.border,
            border: 'none', cursor: 'pointer', padding: 0,
            position: 'relative' as const, transition: 'all 0.2s ease',
          }}
        >
          <div style={{
            position: 'absolute' as const,
            top: 2, left: gstEnabled ? 20 : 2,
            width: 18, height: 18, borderRadius: 9,
            background: '#fff',
            transition: 'all 0.2s ease',
          }} />
        </button>
      </div>

      {error && (
        <div style={{
          background: C.redSoft, border: `1px solid ${C.redBorder}`,
          borderRadius: 10, padding: '10px 12px',
          fontSize: 11, color: C.red, marginBottom: 12,
        }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            background: 'transparent', color: C.muted,
            border: `1px solid ${C.border}`, borderRadius: 12,
            padding: 13, fontSize: 11, fontWeight: 500,
            letterSpacing: '1.5px', textTransform: 'uppercase' as const,
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}
        >Cancel</button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            flex: 2,
            background: canSave ? C.dark : C.border,
            color: canSave ? C.gold : C.light,
            border: 'none', borderRadius: 12,
            padding: 14, fontSize: 11, fontWeight: 600,
            letterSpacing: '1.8px', textTransform: 'uppercase' as const,
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

      // Step 2: if vendor linked a client, auto-create the client + a calendar event
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

      <FieldLabel required>Date</FieldLabel>
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
      onFocus={scrollIntoViewOnFocus} />

      <FieldLabel required>Reason / Title</FieldLabel>
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
      onFocus={scrollIntoViewOnFocus} />

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
        {linkClient ? '✓ Linked to a client (will create calendar event)' : '+ Link to a client'}
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
          onFocus={scrollIntoViewOnFocus} />
          <FieldLabel>Client phone</FieldLabel>
          <input
            type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)}
            placeholder="e.g. 9876543210"
            style={{
              width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
              borderRadius: '12px', padding: '12px 14px', fontSize: '13px', color: C.dark,
              fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box',
            }}
          onFocus={scrollIntoViewOnFocus} />
          <div style={{ fontSize: '10px', color: C.light, marginTop: '6px' }}>
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
    openWhatsApp(cleanPhone, msg);
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
    openWhatsApp(cleanPhone, msg);
    setEventTemplateOpen(null);
  };

  // ── CUSTOM ──
  const sendCustom = () => {
    const c = clients.find((x: any) => x.id === customClientId);
    if (!c || !c.phone || !customMessage.trim()) return;
    const cleanPhone = String(c.phone).replace(/\D/g, '');
    openWhatsApp(cleanPhone, customMessage.trim());
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
            marginBottom: '14px',
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
           onFocus={scrollIntoViewOnFocus}>
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
          onFocus={scrollIntoViewOnFocus} />

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
  vendorId, vendorName, clients, teamMembers, onClose, onSaved, onClientCreated,
}: {
  vendorId: string;
  vendorName: string;
  clients: any[];
  teamMembers: any[];
  onClose: () => void;
  onSaved: (todo: any) => void;
  onClientCreated?: (client: any) => void;
}) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'med' | 'high'>('med');
  const [clientName, setClientName] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [savedTodo, setSavedTodo] = useState<any>(null);

  const activeMembers = teamMembers.filter((m: any) => m.active !== false && m.status !== 'inactive');

  const matches = clientName.trim().length >= 2 && !selectedClient
    ? clients.filter((c: any) => c.name?.toLowerCase().includes(clientName.trim().toLowerCase())).slice(0, 5)
    : [];

  const canSave = !!title.trim() && !submitting;

  const pickClient = (c: any) => {
    setSelectedClient(c);
    setClientName(c.name || '');
    setShowSuggestions(false);
  };
  const clearClient = () => {
    setSelectedClient(null);
    setClientName('');
  };

  const toggleAssignee = (id: string) => {
    setAssignedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setError(''); setSubmitting(true);
    try {
      let clientId = selectedClient?.id || null;
      let clientNameFinal = selectedClient?.name || clientName.trim() || null;

      // Auto-create incomplete client if name typed but no match
      if (!clientId && clientName.trim()) {
        try {
          const cr = await fetch(API + '/api/vendor-clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vendor_id: vendorId,
              name: clientName.trim(),
              profile_incomplete: true,
            }),
          });
          const cd = await cr.json();
          if (cd.success && cd.data) {
            clientId = cd.data.id;
            onClientCreated && onClientCreated(cd.data);
          }
        } catch { /* non-fatal */ }
      }

      const r = await fetch(API + '/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          title: title.trim(),
          due_date: dueDate || null,
          done: false,
          assigned_to: assignedIds,
          client_id: clientId,
          client_name: clientNameFinal,
          notes: priority === 'high' ? 'High priority' : (priority === 'low' ? 'Low priority' : null),
        }),
      });
      const d = await r.json();
      if (d.success && d.data) {
        onSaved(d.data);
        // If WhatsApp toggle on AND assignees, show post-save screen
        if (sendWhatsApp && assignedIds.length > 0) {
          setSavedTodo(d.data);
        } else {
          onClose();
        }
      } else {
        setError(d.error || 'Could not create to-do');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally { setSubmitting(false); }
  };

  // ── Post-save WhatsApp send screen
  if (savedTodo) {
    const recipients = activeMembers.filter((m: any) => assignedIds.includes(m.id));
    const taskMsg = `📋 New task from ${vendorName || 'studio'}:\n\n*${title.trim()}*${dueDate ? `\n📅 Due: ${new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}${selectedClient || clientName ? `\n👤 Client: ${selectedClient?.name || clientName.trim()}` : ''}${priority === 'high' ? '\n⚠️ High priority' : ''}`;

    const sendIndividual = (m: any) => {
      const phone = (m.phone || '').replace(/\D/g, '');
      if (!phone) { alert(`${m.name} has no phone on file.`); return; }
      const url = `https://wa.me/91${phone}?text=${encodeURIComponent(taskMsg)}`;
      window.open(url, '_blank');
    };

    const sendAsGroup = () => {
      const url = `https://wa.me/?text=${encodeURIComponent(taskMsg)}`;
      window.open(url, '_blank');
      // Log broadcast
      fetch(`${API}/api/team-broadcasts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          message: taskMsg,
          recipient_ids: assignedIds,
          recipient_count: assignedIds.length,
          template_key: 'task_assignment',
        }),
      }).catch(() => {});
    };

    return (
      <SheetOverlay onClose={onClose}>
        <SheetHeader eyebrow="Task Created" title="Send to team?" onClose={onClose} />

        <div style={{
          padding: '14px 16px', borderRadius: 12, marginBottom: 14,
          background: C.champagne, border: `1px solid ${C.goldBorder}`,
        }}>
          <div style={{ fontSize: 11, color: C.goldDeep, fontWeight: 500, letterSpacing: '1.2px', textTransform: 'uppercase' as const, marginBottom: 6 }}>Task</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: C.dark, fontWeight: 500, marginBottom: 4 }}>{title.trim()}</div>
          <div style={{ fontSize: 11, color: C.muted }}>
            Assigned to: {recipients.map((m: any) => m.name).join(', ')}
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <button
            onClick={sendAsGroup}
            style={{
              width: '100%', padding: 14, borderRadius: 12, marginBottom: 8,
              background: '#25D366', color: '#fff', border: 'none',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              letterSpacing: '1.5px', textTransform: 'uppercase' as const,
              fontFamily: 'DM Sans, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Users size={14} /> Send as group
          </button>
          <div style={{ fontSize: 10, color: C.muted, textAlign: 'center' as const, marginBottom: 14 }}>
            Opens WhatsApp — you'll create the group
          </div>

          <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: C.muted, fontWeight: 500, marginBottom: 8 }}>
            Or send individually
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {recipients.map((m: any) => (
              <button
                key={m.id}
                onClick={() => sendIndividual(m)}
                style={{
                  padding: '10px 8px', borderRadius: 8,
                  background: C.ivory, color: '#25D366',
                  border: `1px solid ${C.border}`, cursor: 'pointer',
                  fontSize: 11, fontWeight: 500,
                  fontFamily: 'DM Sans, sans-serif',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                <Send size={10} /> {m.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <button onClick={onClose} style={{
          width: '100%', padding: 12, borderRadius: 12,
          background: 'transparent', color: C.muted,
          border: `1px solid ${C.border}`, cursor: 'pointer',
          fontSize: 11, fontWeight: 500, letterSpacing: '1.5px',
          textTransform: 'uppercase' as const, fontFamily: 'DM Sans, sans-serif',
          marginTop: 12,
        }}>Skip — Done</button>
      </SheetOverlay>
    );
  }

  return (
    <SheetOverlay onClose={onClose}>
      <SheetHeader eyebrow="Quick Action" title="Add a To-Do" onClose={onClose} />

      <FieldLabel required>What needs doing?</FieldLabel>
      <input
        type="text" value={title} onChange={e => setTitle(e.target.value)}
        placeholder="e.g. Confirm Saturday's venue"
        style={{
          width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '13px 14px', fontSize: '14px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          marginBottom: '14px', boxSizing: 'border-box',
        }}
      onFocus={scrollIntoViewOnFocus} />

      {/* Client autocomplete */}
      <FieldLabel>Client</FieldLabel>
      <div style={{ position: 'relative' as const, marginBottom: 14 }}>
        <input
          type="text"
          value={clientName}
          onChange={(e) => {
            setClientName(e.target.value);
            if (selectedClient && e.target.value !== selectedClient.name) setSelectedClient(null);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Type client name…"
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            background: C.ivory, border: `1px solid ${selectedClient ? C.goldBorder : C.border}`,
            borderRadius: 12, padding: '13px 14px',
            fontSize: 14, color: C.dark, fontFamily: 'DM Sans, sans-serif',
            outline: 'none',
          }}
        />
        {selectedClient && (
          <button
            onClick={clearClient}
            style={{
              position: 'absolute' as const, top: 10, right: 10,
              background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
              borderRadius: 12, padding: '4px 10px',
              fontSize: 10, color: C.goldDeep,
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}
          >✓ From list</button>
        )}
        {showSuggestions && matches.length > 0 && (
          <div style={{
            position: 'absolute' as const, top: '100%', left: 0, right: 0,
            marginTop: 4, background: C.ivory,
            border: `1px solid ${C.border}`, borderRadius: 10,
            boxShadow: '0 6px 18px rgba(44,36,32,0.1)',
            maxHeight: 200, overflowY: 'auto' as const, zIndex: 10,
          }}>
            {matches.map((c: any) => (
              <button
                key={c.id}
                onClick={() => pickClient(c)}
                style={{
                  width: '100%', padding: '10px 14px',
                  background: 'transparent', border: 'none',
                  borderBottom: `1px solid ${C.borderSoft}`,
                  textAlign: 'left' as const, cursor: 'pointer',
                  fontFamily: 'inherit', display: 'flex',
                  alignItems: 'center', gap: 10,
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 15,
                  background: C.goldSoft, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600, color: C.goldDeep,
                  fontFamily: "'Playfair Display', serif",
                }}>{(c.name || '?')[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>{c.name}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {showSuggestions && clientName.trim().length >= 2 && matches.length === 0 && !selectedClient && (
          <div style={{
            position: 'absolute' as const, top: '100%', left: 0, right: 0,
            marginTop: 4, padding: '10px 14px',
            background: C.champagne, border: `1px solid ${C.goldBorder}`,
            borderRadius: 10, fontSize: 11, color: C.muted, zIndex: 10,
          }}>
            No match. Will be added as a new client.
          </div>
        )}
      </div>

      {/* Team assignees */}
      {activeMembers.length > 0 && (
        <>
          <FieldLabel>Assign to team</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 14 }}>
            {activeMembers.map((m: any) => {
              const checked = assignedIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleAssignee(m.id)}
                  style={{
                    padding: '8px 12px', borderRadius: 50,
                    background: checked ? C.dark : C.ivory,
                    color: checked ? C.gold : C.dark,
                    border: `1px solid ${checked ? C.dark : C.border}`,
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    fontSize: 11, fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  {checked && <CheckCircle size={11} color={C.gold} />}
                  {m.name}
                </button>
              );
            })}
          </div>
        </>
      )}

      <FieldLabel>Due date</FieldLabel>
      <input
        type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
        style={{
          width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '13px 14px', fontSize: '14px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          marginBottom: '14px', boxSizing: 'border-box',
        }}
      onFocus={scrollIntoViewOnFocus} />

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
              fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '1px',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}
          >{p === 'med' ? 'Medium' : p}</button>
        ))}
      </div>

      {/* WhatsApp toggle — only shows when assignees > 0 */}
      {assignedIds.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: sendWhatsApp ? C.goldSoft : C.pearl,
          border: `1px solid ${sendWhatsApp ? C.goldBorder : C.border}`,
          borderRadius: 12, padding: '12px 14px', marginBottom: 16,
          transition: 'all 0.2s ease',
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.dark, fontFamily: 'DM Sans, sans-serif' }}>
              Notify on WhatsApp
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
              You'll get send options after saving
            </div>
          </div>
          <button
            onClick={() => setSendWhatsApp(!sendWhatsApp)}
            style={{
              width: 40, height: 22, borderRadius: 11,
              background: sendWhatsApp ? C.gold : C.border,
              border: 'none', cursor: 'pointer', padding: 0,
              position: 'relative' as const, transition: 'all 0.2s ease',
            }}
          >
            <div style={{
              position: 'absolute' as const, top: 2, left: sendWhatsApp ? 20 : 2,
              width: 18, height: 18, borderRadius: 9, background: '#fff',
              transition: 'all 0.2s ease',
            }} />
          </button>
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
            flex: 1, background: 'transparent', color: C.muted,
            border: `1px solid ${C.border}`, borderRadius: '12px',
            padding: '13px', fontSize: '11px', fontWeight: 500,
            letterSpacing: '1.5px', textTransform: 'uppercase' as const,
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}
        >Cancel</button>
        <button
          onClick={handleSave} disabled={!canSave}
          style={{
            flex: 2,
            background: canSave ? C.dark : C.border,
            color: canSave ? C.gold : C.light,
            border: 'none', borderRadius: '12px', padding: '14px',
            fontSize: '11px', fontWeight: 600, letterSpacing: '1.8px', textTransform: 'uppercase' as const,
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
        style={{
          width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '13px 14px', fontSize: '14px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          marginBottom: '12px', boxSizing: 'border-box',
        }}
      onFocus={scrollIntoViewOnFocus} />

      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <FieldLabel required>Date</FieldLabel>
          <input
            type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
            style={{
              width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
              borderRadius: '12px', padding: '13px 14px', fontSize: '13px', color: C.dark,
              fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box',
            }}
          onFocus={scrollIntoViewOnFocus} />
        </div>
        <div style={{ flex: 1 }}>
          <FieldLabel>Time</FieldLabel>
          <input
            type="time" value={eventTime} onChange={e => setEventTime(e.target.value)}
            style={{
              width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
              borderRadius: '12px', padding: '13px 14px', fontSize: '13px', color: C.dark,
              fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box',
            }}
          onFocus={scrollIntoViewOnFocus} />
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
       onFocus={scrollIntoViewOnFocus}>
        <option value="generic">General</option>
        <option value="booking">Booking / Wedding day</option>
        <option value="trial">Outfit / Dress trial</option>
        <option value="briefing">Briefing</option>
        <option value="venue_visit">Venue visit</option>
      </select>

      <FieldLabel>Link to client</FieldLabel>
      <select
        value={clientId} onChange={e => setClientId(e.target.value)}
        style={{
          width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '12px 14px', fontSize: '13px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          marginBottom: '12px', boxSizing: 'border-box',
        }}
       onFocus={scrollIntoViewOnFocus}>
        <option value="">— No client —</option>
        {clients.map((c: any) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <FieldLabel>Notes</FieldLabel>
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
      onFocus={scrollIntoViewOnFocus} />

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
          fontSize: '12px',
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
            fontSize: '15px', color: C.dark, fontWeight: 400, marginBottom: '4px',
          }}>Quiet day so far.</div>
          <div style={{
            fontSize: '11px', color: C.muted,
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
                      href={`https://api.whatsapp.com/send?phone=91${s.client_phone.replace(/\D/g, '')}&text=${encodeURIComponent('Hi ' + (s.client_name || 'there') + '! Gentle reminder about pending payment.')}&lang=en`}
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
  const [milestones, setMilestones] = useState<{ label: string; amount: string; due_date: string }[]>([
    { label: 'Advance',   amount: '', due_date: '' },
    { label: 'Pre-Event', amount: '', due_date: '' },
    { label: 'Final',     amount: '', due_date: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const totalEntered = milestones.reduce((s, m) => s + (parseInt(m.amount) || 0), 0);
  const validCount = milestones.filter(m => parseInt(m.amount) > 0).length;
  const canSave = !!clientName && validCount > 0 && !submitting;

  const updateMilestone = (idx: number, patch: Partial<{ label: string; amount: string; due_date: string }>) => {
    setMilestones(prev => prev.map((m, i) => i === idx ? { ...m, ...patch } : m));
  };
  const addMilestone = () => {
    setMilestones(prev => [...prev, { label: `Milestone ${prev.length + 1}`, amount: '', due_date: '' }]);
  };
  const removeMilestone = (idx: number) => {
    setMilestones(prev => prev.filter((_, i) => i !== idx));
  };

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
    const instalments = milestones
      .filter(m => parseInt(m.amount) > 0)
      .map(m => ({ label: m.label || 'Milestone', amount: parseInt(m.amount), due_date: m.due_date || null, paid: false }));
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

  return (
    <SheetOverlay onClose={onClose}>
      <SheetHeader eyebrow="Payment Schedule" title="Stage your payments" onClose={onClose} />

      <FieldLabel>Client</FieldLabel>
      {clients.length > 0 ? (
        <select value={clientId} onChange={e => handleClientPick(e.target.value)} style={{
          width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '13px 14px', fontSize: '14px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif', outline: 'none',
          marginBottom: '8px', boxSizing: 'border-box',
        }} onFocus={scrollIntoViewOnFocus}>
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
      onFocus={scrollIntoViewOnFocus} />
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
      onFocus={scrollIntoViewOnFocus} />

      {milestones.map((m, idx) => (
        <div key={idx} style={{
          background: C.pearl, border: `1px solid ${C.border}`,
          borderRadius: '12px', padding: '14px', marginBottom: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text" value={m.label} onChange={e => updateMilestone(idx, { label: e.target.value })}
              placeholder="Milestone label"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: '11px', fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                color: C.muted, letterSpacing: '1px', textTransform: 'uppercase' as const,
              }}
            onFocus={scrollIntoViewOnFocus} />
            {milestones.length > 1 && (
              <button onClick={() => removeMilestone(idx)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer', padding: 4,
                display: 'flex' as const, alignItems: 'center' as const,
              }} title="Remove milestone">
                <Trash2 size={12} color={C.muted} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <FieldLabel>Amount (₹)</FieldLabel>
              <input
                type="number" inputMode="numeric"
                value={m.amount} onChange={e => updateMilestone(idx, { amount: e.target.value })}
                placeholder="0"
                style={{
                  width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '11px 12px',
                  fontSize: '14px', color: C.dark, fontFamily: 'DM Sans, sans-serif',
                  outline: 'none', boxSizing: 'border-box',
                }}
              onFocus={scrollIntoViewOnFocus} />
            </div>
            <div style={{ flex: 1 }}>
              <FieldLabel>Due date</FieldLabel>
              <input
                type="date" value={m.due_date}
                onChange={e => updateMilestone(idx, { due_date: e.target.value })}
                style={{
                  width: '100%', background: C.ivory, border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '11px 12px',
                  fontSize: '14px', color: C.dark, fontFamily: 'DM Sans, sans-serif',
                  outline: 'none', boxSizing: 'border-box',
                }}
              onFocus={scrollIntoViewOnFocus} />
            </div>
          </div>
        </div>
      ))}

      <button onClick={addMilestone} style={{
        width: '100%', background: 'transparent', border: `1px dashed ${C.goldBorder}`,
        borderRadius: '10px', padding: '12px',
        fontSize: '12px', color: C.goldDeep, fontWeight: 500,
        fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
        marginBottom: '14px',
        display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6,
      }}>
        <Plus size={12} />
        <span>Add milestone</span>
      </button>

      <div style={{
        background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
        borderRadius: '10px', padding: '12px 14px',
        fontSize: '12px', color: C.goldDeep, fontWeight: 600,
        marginBottom: '14px', display: 'flex', justifyContent: 'space-between',
      }}>
        <span>Total · {validCount} milestone{validCount === 1 ? '' : 's'}</span>
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
    </SheetOverlay>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TO-DO PANEL — Personal task list, prioritized + due-date sorted
// ══════════════════════════════════════════════════════════════════════════

function TodoPanel({ todos, onOpenTodo, onToggleTodo, onDeleteTodo }: any) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending');
  const [search, setSearch] = useState('');
  const matches = (s: string | null | undefined) => !search || (s || '').toLowerCase().includes(search.toLowerCase());

  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const visible = (todos || []).filter((t: any) => {
    if (filter === 'pending' && t.done) return false;
    if (filter === 'done' && !t.done) return false;
    if (search && !matches(t.title) && !matches(t.notes) && !matches(t.linked_client_name)) return false;
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
      {todos && todos.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search to-do by title, notes, client…" />
        </div>
      )}
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
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showProfitInfo, setShowProfitInfo] = useState(false);
  const [filter, setFilter] = useState<'month' | 'ytd' | 'all'>('month');
  const [search, setSearch] = useState('');
  const matches = (s: string | null | undefined) => !search || (s || '').toLowerCase().includes(search.toLowerCase());

  useEffect(() => {
    if (!session?.vendorId) { setLoading(false); return; }
    Promise.all([
      fetch(`${API}/api/expenses/${session.vendorId}`).then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`${API}/api/invoices/${session.vendorId}`).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([ex, inv]) => {
      if (ex.success) setExpenses(ex.data || []);
      if (inv.success) setInvoices(inv.data || []);
    }).finally(() => setLoading(false));
  }, [session?.vendorId]);

  // Auto-open create modal when arriving from Quick Action
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('tdw_pwa_open_create') === '1') {
      localStorage.removeItem('tdw_pwa_open_create');
      setShowAddSheet(true);
    }
  }, []);

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
    let dateOk = filter === 'all';
    if (d) {
      if (filter === 'month') dateOk = d >= monthStart;
      else if (filter === 'ytd') dateOk = d >= fyStart;
      else dateOk = true;
    }
    if (!dateOk) return false;
    if (search && !matches(e.description) && !matches(e.category) && !matches(e.vendor_name) && !matches(String(e.amount))) return false;
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

  // ── Per-client profit computation ──────────────────────────────────
  // Formula: Paid invoices for client − tagged expenses for client = profit
  // Unpaid invoices shown separately as "Expected"
  const clientProfits = (() => {
    const map: Record<string, {
      clientId: string | null;
      name: string;
      paidInvoiced: number;
      unpaidInvoiced: number;
      expensesLinked: number;
      profit: number;
      expectedProfit: number;
    }> = {};

    for (const inv of invoices) {
      const key = inv.client_id || `name:${(inv.client_name || 'Unknown').toLowerCase()}`;
      if (!map[key]) {
        map[key] = {
          clientId: inv.client_id || null,
          name: inv.client_name || 'Unknown',
          paidInvoiced: 0,
          unpaidInvoiced: 0,
          expensesLinked: 0,
          profit: 0,
          expectedProfit: 0,
        };
      }
      const amt = parseInt(inv.amount) || 0;
      if (inv.status === 'paid') map[key].paidInvoiced += amt;
      else map[key].unpaidInvoiced += amt;
    }
    for (const e of expenses) {
      const key = e.client_id || (e.client_name ? `name:${e.client_name.toLowerCase()}` : null);
      if (!key || !map[key]) continue;
      map[key].expensesLinked += parseInt(e.amount) || 0;
    }
    for (const k of Object.keys(map)) {
      const m = map[k];
      m.profit = m.paidInvoiced - m.expensesLinked;
      m.expectedProfit = (m.paidInvoiced + m.unpaidInvoiced) - m.expensesLinked;
    }
    return Object.values(map)
      .filter(m => m.paidInvoiced > 0 || m.expensesLinked > 0)
      .sort((a, b) => b.profit - a.profit);
  })();

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

      {/* ── Per-client profit ── */}
      {clientProfits.length > 0 && (
        <div style={{
          background: C.ivory, border: `1px solid ${C.goldBorder}`,
          borderRadius: 16, padding: 18, marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: C.goldDeep, fontWeight: 600 }}>
                Profit per Wedding
              </div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: C.dark, marginTop: 2 }}>
                What you've actually made
              </div>
            </div>
            <button
              onClick={() => setShowProfitInfo(!showProfitInfo)}
              style={{
                background: C.pearl, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: '4px 10px',
                fontSize: 10, color: C.muted, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <AlertCircle size={10} /> How is this calculated?
            </button>
          </div>

          {showProfitInfo && (
            <div style={{
              background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
              borderRadius: 10, padding: '12px 14px', marginBottom: 14,
              fontSize: 11, color: C.dark, lineHeight: 1.6,
            }}>
              <strong style={{ color: C.goldDeep }}>Formula:</strong> Profit = Paid Invoices − Tagged Expenses.
              <br /><br />
              Only invoices marked <strong>paid</strong> count toward profit.
              Expenses must be <strong>tagged to the client</strong> (via the "Link to client" field when adding an expense) to be deducted.
              <br /><br />
              <strong>"Expected"</strong> adds your unpaid invoices, showing what the total profit will be once they're paid.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {clientProfits.slice(0, 6).map((m, i) => {
              const profit = m.profit;
              const isProfitable = profit > 0;
              const isLoss = profit < 0;
              const color = isProfitable ? '#2E7D32' : isLoss ? '#C65757' : C.muted;
              return (
                <div key={i} style={{
                  padding: '12px 14px', background: C.pearl,
                  border: `1px solid ${C.border}`, borderRadius: 12,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 16,
                    background: C.goldSoft, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 600, color: C.goldDeep,
                    fontFamily: "'Playfair Display', serif",
                    flexShrink: 0,
                  }}>{m.name[0]?.toUpperCase() || '?'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: C.dark, fontWeight: 500, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const }}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                      ₹{fmtINR(m.paidInvoiced)} paid − ₹{fmtINR(m.expensesLinked)} costs
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' as const }}>
                    <div style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 16, color, fontWeight: 500,
                      fontVariantNumeric: 'tabular-nums' as const,
                    }}>
                      {isLoss ? '−' : ''}₹{fmtINR(Math.abs(profit))}
                    </div>
                    {m.unpaidInvoiced > 0 && (
                      <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>
                        +₹{fmtINR(m.unpaidInvoiced)} expected
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {clientProfits.length > 6 && (
              <div style={{ fontSize: 10, color: C.muted, textAlign: 'center' as const, paddingTop: 4 }}>
                Showing top 6 of {clientProfits.length} clients
              </div>
            )}
          </div>
        </div>
      )}

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
      {expenses.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search expenses by description, category, vendor…" />
        </div>
      )}
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
                <div style={{ fontSize: '14px', fontWeight: 600, color: C.dark, fontFamily: "'Playfair Display', serif", fontVariantNumeric: 'tabular-nums' as const }}>₹{fmtINR(parseInt(exp.amount) || 0)}</div>
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
  const [clientName, setClientName] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const matches = clientName.trim().length >= 2 && !selectedClient
    ? clients.filter((c: any) => c.name?.toLowerCase().includes(clientName.trim().toLowerCase())).slice(0, 5)
    : [];

  const canSave = amount && parseInt(amount) > 0 && description.trim() && !submitting && !uploading;

  const pickClient = (c: any) => {
    setSelectedClient(c);
    setClientName(c.name || '');
    setShowSuggestions(false);
  };
  const clearClient = () => {
    setSelectedClient(null);
    setClientName('');
  };

  const onFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadToCloudinary(file);
      if (url) setReceiptUrl(url);
      else setError('Upload failed. Try again.');
    } catch {
      setError('Upload failed. Check your connection.');
    } finally {
      setUploading(false);
      // Reset input so same file can be picked again
      if (e.target) e.target.value = '';
    }
  };

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
          client_id: selectedClient?.id || null,
          client_name: selectedClient?.name || (clientName.trim() || null),
          receipt_url: receiptUrl || null,
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
            onFocus={scrollIntoViewOnFocus} />
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
          onFocus={scrollIntoViewOnFocus} />
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

        {/* Client — autocomplete */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: C.muted, fontWeight: 500, marginBottom: '6px' }}>
            Link to client
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value);
                if (selectedClient && e.target.value !== selectedClient.name) setSelectedClient(null);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Start typing client name…"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: C.ivory,
                border: `1px solid ${selectedClient ? C.goldBorder : C.border}`,
                borderRadius: '12px',
                padding: '13px 14px',
                fontSize: '14px', color: C.dark,
                fontFamily: 'DM Sans, sans-serif',
                outline: 'none',
              }}
            />
            {selectedClient && (
              <button
                onClick={clearClient}
                style={{
                  position: 'absolute', top: 10, right: 10,
                  background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                  borderRadius: 12, padding: '4px 10px',
                  fontSize: 10, color: C.goldDeep,
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                }}
              >✓ From list</button>
            )}
            {showSuggestions && matches.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                marginTop: 4, background: C.ivory,
                border: `1px solid ${C.border}`, borderRadius: 10,
                boxShadow: '0 6px 18px rgba(44,36,32,0.1)',
                maxHeight: 200, overflowY: 'auto', zIndex: 10,
              }}>
                {matches.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => pickClient(c)}
                    style={{
                      width: '100%', padding: '10px 14px',
                      background: 'transparent', border: 'none',
                      borderBottom: `1px solid ${C.borderSoft}`,
                      textAlign: 'left', cursor: 'pointer',
                      fontFamily: 'inherit', display: 'flex',
                      alignItems: 'center', gap: 10,
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 15,
                      background: C.goldSoft, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 600, color: C.goldDeep,
                      fontFamily: "'Playfair Display', serif",
                    }}>{(c.name || '?')[0].toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: C.dark, fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>
                        {c.event_type || 'Client'}{c.phone ? ` · ${c.phone}` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedClient && (
            <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
              This expense will count against {selectedClient.name}'s profit calculation.
            </div>
          )}
        </div>

        {/* Receipt upload */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: C.muted, fontWeight: 500, marginBottom: '6px' }}>
            Receipt
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onFilePick}
            style={{ display: 'none' }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFilePick}
            style={{ display: 'none' }}
          />
          {receiptUrl ? (
            <div style={{
              position: 'relative', borderRadius: 12, overflow: 'hidden',
              border: `1px solid ${C.goldBorder}`, background: C.pearl,
            }}>
              <img
                src={receiptUrl}
                alt="Receipt"
                style={{ width: '100%', maxHeight: 200, objectFit: 'contain', display: 'block' }}
              />
              <button
                onClick={() => setReceiptUrl(null)}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 28, height: 28, borderRadius: 14,
                  background: 'rgba(44,36,32,0.75)', color: '#fff',
                  border: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={14} />
              </button>
            </div>
          ) : uploading ? (
            <div style={{
              padding: '20px 14px', borderRadius: 12, textAlign: 'center',
              background: C.pearl, border: `1px dashed ${C.goldBorder}`,
              fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif',
            }}>Uploading…</div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => cameraInputRef.current?.click()}
                style={{
                  flex: 1, padding: '13px 14px', borderRadius: 12,
                  background: C.pearl, border: `1px dashed ${C.goldBorder}`,
                  color: C.goldDeep, cursor: 'pointer',
                  fontSize: 11, fontWeight: 500, letterSpacing: '1.2px',
                  textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              ><Camera size={14} /> Camera</button>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  flex: 1, padding: '13px 14px', borderRadius: 12,
                  background: C.pearl, border: `1px dashed ${C.goldBorder}`,
                  color: C.goldDeep, cursor: 'pointer',
                  fontSize: 11, fontWeight: 500, letterSpacing: '1.2px',
                  textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              ><Upload size={14} /> Gallery</button>
            </div>
          )}
        </div>

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

function LegacyTeamPanel({ session, tier }: { session: VendorSession; tier: Tier }) {
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
          <div style={{ fontSize: '10px', color: C.muted, textAlign: 'right', maxWidth: '140px' }}>
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
        onFocus={scrollIntoViewOnFocus} />

        <FormLabel>Role</FormLabel>
        <select
          value={role} onChange={(e) => setRole(e.target.value)}
          style={{ width: '100%', background: C.pearl, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '13px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: C.dark, outline: 'none', boxSizing: 'border-box', marginBottom: '14px', appearance: 'none' }}
         onFocus={scrollIntoViewOnFocus}>
          {TEAM_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <FormLabel>Phone</FormLabel>
        <input
          type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98765 43210"
          style={{ width: '100%', background: C.pearl, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '13px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: C.dark, outline: 'none', boxSizing: 'border-box', marginBottom: '14px' }}
        onFocus={scrollIntoViewOnFocus} />

        <FormLabel>Email</FormLabel>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          autoCapitalize="none"
          style={{ width: '100%', background: C.pearl, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '13px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: C.dark, outline: 'none', boxSizing: 'border-box', marginBottom: '14px' }}
        onFocus={scrollIntoViewOnFocus} />

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
  const [recipientSearch, setRecipientSearch] = useState('');

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
  const canProceed = message.trim().length >= 1 && recipients.length > 0;

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
          <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.55 }}>
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
      onFocus={scrollIntoViewOnFocus} />
      <div style={{ fontSize: '10px', color: C.muted, marginBottom: '14px' }}>
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
        <>
          <div style={{ marginBottom: '8px' }}>
            <SearchBar value={recipientSearch} onChange={setRecipientSearch} placeholder="Search clients by name, phone…" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px', maxHeight: '320px', overflowY: 'auto' }}>
            {clients
              .filter((c: any) => !recipientSearch || (c.name || '').toLowerCase().includes(recipientSearch.toLowerCase()) || (c.phone || '').includes(recipientSearch))
              .map((c: any) => {
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
        </>
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
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: '12px' }}>
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
        onFocus={scrollIntoViewOnFocus} />
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

function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{
      fontFamily: 'DM Sans, sans-serif',
      fontSize: '9px', fontWeight: 600,
      letterSpacing: '2px', textTransform: 'uppercase',
      color: C.muted, marginBottom: '6px',
    }}>
      {children}
      {required && <span style={{ color: '#C65757', marginLeft: 4, letterSpacing: 0 }}>*</span>}
    </div>
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
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '3px' }}>
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
                  <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{item.desc}</div>
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

// ═══════════════════════════════════════════════════════════════════════════
// BUILD 4: DiscoveryRouter — handles access check, onboarding wall, 4-tab nav
// ═══════════════════════════════════════════════════════════════════════════

type DiscoveryTab = 'dash' | 'leads' | 'images' | 'power';

interface ModeState {
  vendor_id: string;
  tier: string;
  basics_completed: boolean;
  basics_completed_at: string | null;
  missing_basics: string[];
  trial_started_at: string | null;
  trial_deadline: string | null;
  trial_status: 'not_started' | 'active' | 'paused' | 'complete' | 'exempt';
  days_left: number | null;
  completion_pct: number;
  discover_listed: boolean;
}

function DiscoveryRouter({ session }: { session: VendorSession }) {
  const [accessStatus, setAccessStatus] = useState<'loading' | 'granted' | 'pending' | 'denied' | 'expired'>('loading');
  const [modeState, setModeState] = useState<ModeState | null>(null);
  const [activeTab, setActiveTab] = useState<DiscoveryTab>('dash');
  const [requestReason, setRequestReason] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  // Check access
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API}/api/vendor-discover/status?vendor_id=${session.vendorId}`);
        const d = await res.json();
        if (!mounted) return;
        if (d.success) {
          if (d.enabled) {
            setAccessStatus('granted');
          } else if (d.reason === 'expired') {
            setAccessStatus('expired');
          } else if (d.pending_request) {
            setAccessStatus('pending');
          } else {
            setAccessStatus('denied');
          }
        } else {
          setAccessStatus('denied');
        }
      } catch {
        if (mounted) setAccessStatus('denied');
      }
    })();
    return () => { mounted = false; };
  }, [session.vendorId]);

  // Load mode state whenever granted
  const loadModeState = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/vendor-discover/mode-state/${session.vendorId}`);
      const d = await res.json();
      if (d.success) setModeState(d.data);
    } catch {}
  }, [session.vendorId]);

  useEffect(() => {
    if (accessStatus === 'granted') loadModeState();
  }, [accessStatus, loadModeState]);

  // Loading state
  if (accessStatus === 'loading') {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: `2px solid ${C.goldBorder}`, borderTopColor: C.gold, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>Loading Discovery…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Access not granted — show the request screen (DreamAi-pattern unified design)
  if (accessStatus !== 'granted') {
    const isPending = accessStatus === 'pending' || requestSent;
    return (
      <div style={{ minHeight: 'calc(100vh - 200px)', padding: '28px 20px', background: C.cream }}>
        <div style={{
          background: C.ivory, border: `1px solid ${C.goldBorder}`, borderRadius: 16,
          padding: '24px 22px',
        }}>
          {/* Eyebrow + Title row (DreamAi pattern) */}
          <p style={{ margin: '0 0 6px', fontSize: 10, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase' as const }}>
            Discovery · Beta
          </p>
          <h2 style={{ margin: '0 0 16px', fontSize: 22, color: C.dark, fontFamily: "'Playfair Display', serif", fontWeight: 500, lineHeight: '28px' }}>
            {isPending ? 'Request received' : 'Request access to Discovery'}
          </h2>

          {isPending ? (
            <>
              <div style={{
                padding: '14px 16px', borderRadius: 12, marginBottom: 14,
                background: C.champagne || C.goldSoft, border: `1px solid ${C.goldBorder}`,
              }}>
                <div style={{
                  fontFamily: "'Playfair Display', serif", fontSize: 15,
                  color: C.dark, fontWeight: 500, marginBottom: 4,
                }}>Thanks — we'll be in touch.</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif' }}>
                  Discovery is currently invite-only. We're granting access to a small group of founding vendors during the beta.
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16, fontSize: 13, color: C.muted, lineHeight: 1.6, fontFamily: 'DM Sans, sans-serif' }}>
                <strong style={{ color: C.dark }}>Discovery</strong> puts you in front of couples actively searching for vendors. Your profile, photos, and availability live in our curated marketplace.
                <br /><br />
                It's invite-only during beta. Tell us why you'd like early access.
              </div>

              <p style={{ margin: '0 0 6px', fontSize: 11, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '0.3px' }}>
                Why you'd like Discovery
              </p>
              <textarea value={requestReason} onChange={e => setRequestReason(e.target.value)}
                placeholder="Briefly tell us about your business (optional)"
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box' as const,
                  padding: '12px 14px', borderRadius: 10,
                  border: `1px solid ${C.border}`, background: C.pearl || C.cream,
                  fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.dark,
                  outline: 'none', resize: 'none' as const, marginBottom: 14,
                }} onFocus={scrollIntoViewOnFocus} />

              <button onClick={async () => {
                if (!session?.vendorId) { alert('Session error. Please refresh.'); return; }
                try {
                  const res = await fetch(`${API}/api/vendor-discover/request-access`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ vendor_id: session.vendorId, reason: requestReason.trim() || null }),
                  });
                  const d = await res.json();
                  if (d.success) {
                    setRequestSent(true);
                    setAccessStatus('pending');
                  } else {
                    alert(d.error || 'Could not send request. Please try again.');
                  }
                } catch (err) {
                  alert('Network error. Please try again.');
                }
              }} style={{
                width: '100%', padding: 14, borderRadius: 10,
                background: C.dark, color: C.gold, border: 'none',
                cursor: 'pointer', fontSize: 12, fontWeight: 500,
                letterSpacing: '2px', textTransform: 'uppercase' as const,
                fontFamily: 'DM Sans, sans-serif',
              }}>Request access</button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Access granted — check onboarding state
  if (!modeState) {
    return <div style={{ padding: 40, textAlign: 'center' as const, color: C.muted, fontSize: 12 }}>Loading…</div>;
  }

  // First-time or incomplete basics → Onboarding wall
  if (!modeState.basics_completed || modeState.missing_basics.length > 0) {
    return <DiscoveryOnboardingWall session={session} modeState={modeState} onDone={loadModeState} />;
  }

  // Trial paused → lock screen
  if (modeState.trial_status === 'paused') {
    return (
      <div style={{ minHeight: 'calc(100vh - 200px)', padding: '28px 20px', background: C.cream }}>
        <div style={{
          background: C.ivory, border: `1px solid #F0A8A8`, borderRadius: 16,
          padding: '24px 20px', textAlign: 'center' as const,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: '#FFF0F0', border: `1px solid #F0A8A8`,
            display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
            margin: '0 auto 14px',
          }}>
            <Lock size={22} color="#C65757" />
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 400 }}>
            Your Discovery trial has paused.
          </h2>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '20px' }}>
            You didn't complete your profile within the {modeState.tier === 'signature' ? '10-day' : '7-day'} trial window. Complete your profile to resume Discovery, or contact us to upgrade manually.
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
            Your profile is {modeState.completion_pct}% complete.
          </p>
          <button onClick={async () => {
            // Unpause if vendor hits 100% — let them in
            try {
              await fetch(`${API}/api/vendor-discover/mode-state/${session.vendorId}`);
              loadModeState();
            } catch {}
          }} style={{
            width: '100%', padding: '12px', borderRadius: 10, background: C.dark,
            border: 'none', color: C.gold, fontSize: 13,
            fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer',
          }}>Check again</button>
        </div>
      </div>
    );
  }

  // Main 4-tab content
  return (
    <>
      {activeTab === 'dash'   && <DiscoveryDash session={session} modeState={modeState} onReload={loadModeState} onGoTab={setActiveTab} />}
      {activeTab === 'leads'  && <DiscoveryLeads session={session} />}
      {activeTab === 'images' && <DiscoveryImageHub session={session} onReload={loadModeState} />}
      {activeTab === 'power'  && <DiscoveryPower session={session} modeState={modeState} onReload={loadModeState} />}
      <DiscoveryBottomNav active={activeTab} onTab={setActiveTab} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DiscoveryBottomNav — 4 tabs
// ═══════════════════════════════════════════════════════════════════════════
function DiscoveryBottomNav({ active, onTab }: { active: DiscoveryTab; onTab: (t: DiscoveryTab) => void }) {
  const tabs: { id: DiscoveryTab; label: string; Icon: any }[] = [
    { id: 'dash',   label: 'Dash',      Icon: Grid },
    { id: 'leads',  label: 'Leads',     Icon: Mail },
    { id: 'images', label: 'Image Hub', Icon: ImageIcon },
    { id: 'power',  label: 'Studio',    Icon: Zap },
  ];
  return (
    <div style={{
      position: 'fixed' as const, bottom: 0, left: 0, right: 0,
      background: C.ivory, borderTop: `1px solid ${C.border}`,
      display: 'flex' as const, justifyContent: 'space-around' as const,
      padding: 'max(8px, env(safe-area-inset-bottom)) 0 8px',
      zIndex: 50, maxWidth: 480, margin: '0 auto',
    }}>
      {tabs.map(t => {
        const a = active === t.id;
        return (
          <button key={t.id} onClick={() => onTab(t.id)} style={{
            display: 'flex' as const, flexDirection: 'column' as const,
            alignItems: 'center' as const, gap: 2,
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 16px',
          }}>
            <t.Icon size={20} color={a ? C.gold : C.muted} />
            <span style={{
              fontSize: 10, fontWeight: a ? 500 : 300,
              color: a ? C.gold : C.muted, fontFamily: 'DM Sans, sans-serif',
            }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DiscoveryOnboardingWall — forced first-time entry
// ═══════════════════════════════════════════════════════════════════════════
function DiscoveryOnboardingWall({ session, modeState, onDone }: {
  session: VendorSession; modeState: ModeState; onDone: () => void;
}) {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [instagram, setInstagram] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [responseTime, setResponseTime] = useState<string>('');
  const [images, setImages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Preload any existing values
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API}/api/vendors/${session.vendorId}`);
        const d = await res.json();
        if (!mounted) return;
        const v = d.success ? d.data : {};
        setPhone(v.phone || '');
        setEmail(v.email || '');
        setCategory(v.category || '');
        setCity(v.city || '');
        setInstagram(v.instagram || '');
        setStartingPrice(v.starting_price ? String(v.starting_price / 100) : '');
        setResponseTime(v.response_time_commitment || '');
        // Load images
        const imgRes = await fetch(`${API}/api/vendor-images/${session.vendorId}`);
        const imgD = await imgRes.json();
        if (imgD.success) setImages(imgD.data || []);
      } catch {}
      setLoaded(true);
    })();
    return () => { mounted = false; };
  }, [session.vendorId]);

  const missing = modeState.missing_basics;
  const needsPhone    = missing.includes('phone');
  const needsEmail    = missing.includes('email');
  const needsCategory = missing.includes('category');
  const needsCity     = missing.includes('city');
  const needsIG       = missing.includes('instagram');
  const needsPrice    = missing.includes('starting_price');
  const needsRT       = missing.includes('response_time_commitment');
  const needsPhotos   = missing.includes('three_photos');

  const allOk = (!needsPhone || phone.trim().length >= 10)
             && (!needsEmail || /.+@.+\..+/.test(email))
             && (!needsCategory || category.trim().length > 0)
             && (!needsCity || city.trim().length > 0)
             && (!needsIG || instagram.trim().length > 0)
             && (!needsPrice || parseInt(startingPrice) > 0)
             && (!needsRT || responseTime.length > 0)
             && (!needsPhotos || images.length >= 3);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    for (const f of files) {
      // Simple inline check: 150KB min, 900x900 min
      if (f.size < 150 * 1024) continue;
      const url = await uploadToCloudinary(f);
      if (!url) continue;
      try {
        await fetch(`${API}/api/vendor-images`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendor_id: session.vendorId, url, tags: ['portfolio'] }),
        });
      } catch {}
    }
    // Reload
    try {
      const imgRes = await fetch(`${API}/api/vendor-images/${session.vendorId}`);
      const imgD = await imgRes.json();
      if (imgD.success) setImages(imgD.data || []);
    } catch {}
    setUploading(false);
    e.target.value = '';
  };

  const submit = async () => {
    setSubmitting(true);
    const payload: any = {};
    if (needsPhone) payload.phone = phone.trim();
    if (needsEmail) payload.email = email.trim();
    if (needsCategory) payload.category = category.trim();
    if (needsCity) payload.city = city.trim();
    if (needsIG) payload.instagram = instagram.trim().replace(/^@/, '');
    if (needsPrice) payload.starting_price = parseInt(startingPrice) * 100;
    if (needsRT) payload.response_time_commitment = responseTime;
    try {
      const res = await fetch(`${API}/api/vendor-discover/onboard/${session.vendorId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.success) {
        if (d.skipped && d.skipped.length > 0) {
          console.warn('[onboard] Some columns skipped (DB missing migration):', d.skipped);
        }
        onDone();
      } else {
        alert('Could not save: ' + (d.error || 'unknown error'));
      }
    } catch (e: any) {
      alert('Network error: ' + (e?.message || 'failed to reach server'));
    }
    setSubmitting(false);
  };

  if (!loaded) return <div style={{ padding: 40, textAlign: 'center' as const, color: C.muted, fontSize: 12 }}>Loading…</div>;

  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', background: C.cream, padding: '20px 20px 80px' }}>
      <p style={{ margin: '0 0 4px', fontSize: 11, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase' as const }}>
        Discovery · Quick setup
      </p>
      <h2 style={{ margin: '0 0 8px', fontSize: 24, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 400, lineHeight: '30px' }}>
        Let's get you on the feed.
      </h2>
      <p style={{ margin: '0 0 22px', fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '19px' }}>
        A few essentials so couples can find you. You can polish the rest later.
      </p>

      {needsPhone && (
        <Field label="Phone">
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210"
            style={inputStyle} onFocus={scrollIntoViewOnFocus} />
        </Field>
      )}
      {needsEmail && (
        <Field label="Email">
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
            style={inputStyle} onFocus={scrollIntoViewOnFocus} />
        </Field>
      )}
      {needsCategory && (
        <Field label="Category">
          <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle} onFocus={scrollIntoViewOnFocus}>
            <option value="">Choose</option>
            {['photographers','venues','mua','designers','choreographers','dj','event-managers','bridal-wellness'].map(c => (
              <option key={c} value={c}>{c.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
            ))}
          </select>
        </Field>
      )}
      {needsCity && (
        <Field label="City">
          <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Mumbai"
            style={inputStyle} onFocus={scrollIntoViewOnFocus} />
        </Field>
      )}
      {needsIG && (
        <Field label="Instagram handle">
          <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@yourhandle"
            style={inputStyle} onFocus={scrollIntoViewOnFocus} />
        </Field>
      )}
      {needsPrice && (
        <Field label="Starting price (Rs)">
          <input type="number" value={startingPrice} onChange={e => setStartingPrice(e.target.value)} placeholder="e.g. 50000"
            style={inputStyle} onFocus={scrollIntoViewOnFocus} />
        </Field>
      )}
      {needsRT && (
        <Field label="Response time commitment">
          <div style={{ display: 'flex' as const, gap: 6, flexWrap: 'wrap' as const }}>
            {[
              { id: 'under_1hr', label: 'Under 1 hr' },
              { id: '1_to_4hr', label: '1-4 hrs' },
              { id: 'same_day', label: 'Same day' },
              { id: 'within_24hr', label: 'Within 24 hrs' },
              { id: '1_to_2day', label: '1-2 days' },
            ].map(o => (
              <button key={o.id} onClick={() => setResponseTime(o.id)} style={{
                padding: '7px 12px', borderRadius: 20,
                background: responseTime === o.id ? C.dark : C.ivory,
                color: responseTime === o.id ? C.gold : C.dark,
                border: `1px solid ${responseTime === o.id ? C.dark : C.border}`,
                fontSize: 12, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              }}>{o.label}</button>
            ))}
          </div>
        </Field>
      )}
      {needsPhotos && (
        <Field label={`Photos (${images.length}/3 minimum)`}>
          <div style={{
            background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: 10, marginBottom: 6,
          }}>
            {images.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
                {images.slice(0, 9).map((img: any) => (
                  <div key={img.id} style={{
                    aspectRatio: '1', background: `url(${img.url}) center/cover`,
                    borderRadius: 6, border: `1px solid ${C.border}`,
                  }} />
                ))}
              </div>
            )}
            <label style={{
              display: 'block' as const, padding: '10px 12px', borderRadius: 8,
              background: C.dark, color: C.gold, fontSize: 12,
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
              textAlign: 'center' as const, cursor: uploading ? 'wait' : 'pointer',
              opacity: uploading ? 0.7 : 1,
            }}>
              {uploading ? 'Uploading…' : '+ Add photos'}
              <input type="file" multiple accept="image/*" onChange={handleImageUpload}
                disabled={uploading} style={{ display: 'none' }} />
            </label>
            <p style={{ margin: '8px 0 0', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontStyle: 'italic' as const, lineHeight: '14px' }}>
              Vertical (3:4 or 4:5), high-res photos tend to keep couples engaged 3x longer.
            </p>
          </div>
        </Field>
      )}

      <button onClick={submit} disabled={!allOk || submitting} style={{
        width: '100%', padding: '14px', borderRadius: 10,
        background: allOk ? C.dark : '#CFC5B8',
        border: 'none', color: C.gold, fontSize: 14,
        fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
        cursor: allOk ? 'pointer' : 'not-allowed', marginTop: 12,
      }}>
        {submitting ? 'Saving…' : 'Open Discovery'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DiscoveryDash — completion meter, trial countdown, activity feed, next action
// ═══════════════════════════════════════════════════════════════════════════
function DiscoveryDash({ session, modeState, onReload, onGoTab }: {
  session: VendorSession; modeState: ModeState; onReload: () => void; onGoTab: (t: DiscoveryTab) => void;
}) {
  const [activity, setActivity] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({ impressions: 0, saves: 0, enquiries: 0, lock_interests: 0 });
  const [prevTotals, setPrevTotals] = useState<any>({ impressions: 0, saves: 0, enquiries: 0, lock_interests: 0 });
  const [unreadLeads, setUnreadLeads] = useState(0);
  const [imageCount, setImageCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [actRes, anRes, an14Res, enqRes, imgRes] = await Promise.all([
          fetch(`${API}/api/vendor-activity/${session.vendorId}?limit=6`).then(r => r.json()),
          fetch(`${API}/api/vendor-analytics/${session.vendorId}?days=7`).then(r => r.json()),
          fetch(`${API}/api/vendor-analytics/${session.vendorId}?days=14`).then(r => r.json()),
          fetch(`${API}/api/enquiries/vendor/${session.vendorId}`).then(r => r.json()),
          fetch(`${API}/api/vendor-images/${session.vendorId}`).then(r => r.json()).catch(() => ({ data: [] })),
        ]);
        if (!mounted) return;
        if (actRes.success) setActivity(actRes.data || []);
        if (anRes.success) setTotals(anRes.totals || {});
        if (an14Res.success) {
          const t14 = an14Res.totals || {};
          const t7 = anRes.totals || {};
          setPrevTotals({
            impressions: Math.max(0, (t14.impressions || 0) - (t7.impressions || 0)),
            saves: Math.max(0, (t14.saves || 0) - (t7.saves || 0)),
            enquiries: Math.max(0, (t14.enquiries || 0) - (t7.enquiries || 0)),
            lock_interests: Math.max(0, (t14.lock_interests || 0) - (t7.lock_interests || 0)),
          });
        }
        if (enqRes.success) {
          const unread = (enqRes.data || []).filter((e: any) => (e.vendor_unread_count || 0) > 0).length;
          setUnreadLeads(unread);
        }
        if (imgRes?.data) setImageCount(imgRes.data.length);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [session.vendorId]);

  const pct = modeState.completion_pct || 0;
  const daysLeft = modeState.days_left;
  const isExempt = modeState.trial_status === 'exempt';
  const listingStatus = modeState.discover_listed ? 'Live' : (pct >= 70 ? 'Under review' : 'Not listed');

  const weekLabel = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }).toUpperCase();

  // ── Stat ribbon helper ──
  const delta = (cur: number, prev: number): { text: string; color: string } => {
    if (prev === 0 && cur === 0) return { text: '— flat', color: C.muted };
    if (prev === 0) return { text: `↑ ${cur} new`, color: '#4CAF50' };
    const pctDelta = Math.round(((cur - prev) / prev) * 100);
    if (pctDelta === 0) return { text: '— flat', color: C.muted };
    if (pctDelta > 0) return { text: `↑ ${pctDelta}%`, color: '#4CAF50' };
    return { text: `↓ ${Math.abs(pctDelta)}%`, color: '#C65757' };
  };

  const impDelta = delta(totals.impressions || 0, prevTotals.impressions || 0);
  const savDelta = delta(totals.saves || 0, prevTotals.saves || 0);
  const enqDelta = delta(totals.enquiries || 0, prevTotals.enquiries || 0);
  const lkDelta  = delta(totals.lock_interests || 0, prevTotals.lock_interests || 0);

  // ── Next Move computation ──
  let nextMove: { label: string; body: string; cta: string; onTap: () => void } | null = null;
  if (unreadLeads > 0) {
    nextMove = {
      label: 'Unanswered enquiry',
      body: `You have ${unreadLeads} unread ${unreadLeads === 1 ? 'lead' : 'leads'}. Vendors who reply within 4 hours convert 3× more.`,
      cta: 'Reply in Leads',
      onTap: () => onGoTab('leads'),
    };
  } else if (imageCount < 12) {
    nextMove = {
      label: 'Add more photos',
      body: `Add ${12 - imageCount} more photos to reach 12. Vendors with 12+ get 4× more enquiries.`,
      cta: 'Open Image Hub',
      onTap: () => onGoTab('images'),
    };
  } else if (pct < 70) {
    nextMove = {
      label: 'Complete your profile',
      body: `You're at ${pct}% complete. Finish 2–3 more fields to go live on Discover.`,
      cta: 'Finish Profile',
      onTap: () => onGoTab('power'),
    };
  } else if (!modeState.discover_listed) {
    nextMove = {
      label: 'Submit for review',
      body: `Your profile is ready. Submit for review and we'll have you live within 24–48 hours.`,
      cta: 'Submit',
      onTap: () => onGoTab('power'),
    };
  } else {
    nextMove = {
      label: 'You\'re performing beautifully',
      body: `Keep replying within 4 hours. The algorithm favours vendors who show up.`,
      cta: 'View Insights',
      onTap: () => onGoTab('power'),
    };
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', background: C.cream, padding: '8px 20px 100px' }}>

      {/* ─── 1. Editorial hero ─── */}
      <p style={{ margin: '0 0 4px', fontSize: 10, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase' as const }}>
        Discovery · Week of {weekLabel}
      </p>
      <h2 style={{ margin: '0 0 22px', fontSize: 24, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 400, lineHeight: '30px', letterSpacing: '-0.2px' }}>
        {session.vendorName}
      </h2>

      {/* ─── 2. Stat ribbon ─── */}
      <div style={{
        background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 16,
        padding: '18px 14px', marginBottom: 18,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
      }}>
        {[
          { num: totals.impressions || 0, label: 'Impressions', d: impDelta },
          { num: totals.saves || 0,       label: 'Saves',       d: savDelta },
          { num: totals.enquiries || 0,   label: 'Enquiries',   d: enqDelta },
          { num: totals.lock_interests || 0, label: 'Lock dates', d: lkDelta },
        ].map((s, i) => (
          <div key={i} style={{
            textAlign: 'center' as const,
            borderRight: i < 3 ? `1px solid ${C.border}` : 'none',
            padding: '0 4px',
          }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: C.dark, fontWeight: 500, lineHeight: 1, fontVariantNumeric: 'tabular-nums' as const }}>
              {s.num}
            </div>
            <div style={{ fontSize: 8, color: C.muted, fontFamily: 'DM Sans, sans-serif', letterSpacing: '1.5px', textTransform: 'uppercase' as const, marginTop: 6 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 9, color: s.d.color, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, marginTop: 3 }}>
              {s.d.text}
            </div>
          </div>
        ))}
      </div>

      {/* ─── 3. Your Next Move ─── */}
      {nextMove && (
        <div style={{
          background: C.ivory, border: `1px solid ${C.goldBorder}`, borderRadius: 16,
          padding: '18px 18px', marginBottom: 22,
        }}>
          <p style={{ margin: '0 0 8px', fontSize: 9, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '2.5px', textTransform: 'uppercase' as const }}>
            Your Next Move
          </p>
          <h3 style={{ margin: '0 0 8px', fontSize: 17, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 500, lineHeight: '22px' }}>
            {nextMove.label}
          </h3>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '19px' }}>
            {nextMove.body}
          </p>
          <button onClick={nextMove.onTap} style={{
            padding: '10px 18px', borderRadius: 30, background: C.dark,
            border: 'none', color: C.gold, fontSize: 11,
            fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer',
            letterSpacing: '1.5px', textTransform: 'uppercase' as const,
            display: 'inline-flex' as const, alignItems: 'center' as const, gap: 6,
          }}>
            {nextMove.cta}
            <ChevronRight size={12} color={C.gold} />
          </button>
        </div>
      )}

      {/* ─── 4. This Week ledger ─── */}
      {activity.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <p style={{ margin: '0 0 10px', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase' as const }}>
            This Week
          </p>
          <div style={{ background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 14 }}>
            {activity.map((a: any, i: number) => {
              const ts = new Date(a.created_at);
              const hoursAgo = Math.floor((Date.now() - ts.getTime()) / 3600000);
              const daysAgo = Math.floor(hoursAgo / 24);
              const timeStr = hoursAgo < 1 ? 'now' : hoursAgo < 24 ? `${hoursAgo}h` : daysAgo === 1 ? '1d' : `${daysAgo}d`;
              return (
                <div key={i} style={{
                  padding: '14px 16px',
                  borderBottom: i === activity.length - 1 ? 'none' : `1px solid ${C.border}`,
                  display: 'flex' as const, alignItems: 'baseline' as const, gap: 12,
                }}>
                  <span style={{ flex: 1, fontSize: 13, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 400, lineHeight: '18px' }}>
                    {a.event_label || a.event_type}
                  </span>
                  <span style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', flexShrink: 0, letterSpacing: '0.5px' }}>
                    {timeStr}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 5. Quiet footer strip ─── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14,
        padding: '16px 0 0', borderTop: `1px solid ${C.border}`,
      }}>
        <div style={{ textAlign: 'center' as const }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: pct >= 70 ? C.dark : C.gold, fontWeight: 500, fontVariantNumeric: 'tabular-nums' as const }}>
            {pct}%
          </div>
          <div style={{ fontSize: 8, color: C.muted, fontFamily: 'DM Sans, sans-serif', letterSpacing: '1.5px', textTransform: 'uppercase' as const, marginTop: 4 }}>
            Profile
          </div>
        </div>
        <div style={{ textAlign: 'center' as const, borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: modeState.discover_listed ? '#4CAF50' : (pct >= 70 ? C.gold : '#C65757'), fontWeight: 500 }}>
            {listingStatus}
          </div>
          <div style={{ fontSize: 8, color: C.muted, fontFamily: 'DM Sans, sans-serif', letterSpacing: '1.5px', textTransform: 'uppercase' as const, marginTop: 4 }}>
            Status
          </div>
        </div>
        <div style={{ textAlign: 'center' as const }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: isExempt ? C.dark : (daysLeft !== null && daysLeft <= 2 ? '#C65757' : C.dark), fontWeight: 500, fontVariantNumeric: 'tabular-nums' as const }}>
            {isExempt ? '∞' : (daysLeft === null ? '—' : daysLeft)}
          </div>
          <div style={{ fontSize: 8, color: C.muted, fontFamily: 'DM Sans, sans-serif', letterSpacing: '1.5px', textTransform: 'uppercase' as const, marginTop: 4 }}>
            {isExempt ? 'Prestige' : 'Trial left'}
          </div>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// DiscoveryLeads / DiscoveryImageHub / DiscoveryPower — Placeholders for Parts B-E
// ═══════════════════════════════════════════════════════════════════════════
function DiscoveryLeads({ session }: { session: VendorSession }) {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeThread, setActiveThread] = useState<any>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [threadCouple, setThreadCouple] = useState<any>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'locked'>('all');

  const loadEnquiries = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/enquiries/vendor/${session.vendorId}`);
      const d = await res.json();
      if (d.success) {
        // Hydrate with couple info for display
        const list = d.data || [];
        // Quick couple fetch (names)
        const coupleIds = [...new Set(list.map((e: any) => e.couple_id).filter(Boolean))] as string[];
        const coupleMap: Record<string, any> = {};
        for (const cid of coupleIds) {
          try {
            const cRes = await fetch(`${API}/api/user/${cid}`);
            const cD = await cRes.json();
            if (cD.success) coupleMap[cid] = cD.data;
          } catch {}
        }
        setEnquiries(list.map((e: any) => ({ ...e, couple: coupleMap[e.couple_id] || null })));
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadEnquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openThread = async (enq: any) => {
    setActiveThread(enq);
    setThreadCouple(enq.couple || null);
    try {
      const res = await fetch(`${API}/api/enquiries/${enq.id}`);
      const d = await res.json();
      if (d.success) {
        setThreadMessages(d.data.messages || []);
        // Mark as read
        fetch(`${API}/api/enquiries/${enq.id}/read`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'vendor' }),
        }).catch(() => {});
      }
    } catch {}
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeThread) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/api/enquiries/${activeThread.id}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_role: 'vendor', content: input.trim() }),
      });
      const d = await res.json();
      if (d.success) {
        setThreadMessages(prev => [...prev, d.data]);
        setInput('');
      }
    } catch {}
    setSending(false);
  };

  // Thread view
  if (activeThread) {
    const coupleName = threadCouple?.name || 'Couple';
    const weddingDate = activeThread.wedding_date;
    const isLocked = activeThread.lock_date_paid;

    return (
      <div style={{ minHeight: 'calc(100vh - 60px)', background: C.cream, display: 'flex' as const, flexDirection: 'column' as const, paddingBottom: 'max(120px, calc(env(safe-area-inset-bottom) + 100px))' }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${C.border}`, background: C.cream,
          position: 'sticky' as const, top: 0, zIndex: 10,
          display: 'flex' as const, alignItems: 'center' as const, gap: 12,
        }}>
          <button onClick={() => { setActiveThread(null); setThreadMessages([]); loadEnquiries(); }} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          }}>
            <ChevronRight size={18} color={C.dark} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div style={{
            width: 36, height: 36, borderRadius: 18,
            background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
            display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
            flexShrink: 0,
          }}>
            <User size={16} color={C.gold} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 500 }}>{coupleName}</p>
            {weddingDate && (
              <p style={{ margin: 0, fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                Wedding · {new Date(weddingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
          {isLocked && threadCouple?.phone && (
            <button onClick={() => {
              const phone = threadCouple.phone?.replace(/\D/g, '').slice(-10);
              const prefill = `Hi ${coupleName}, reaching out from The Dream Wedding. Your Lock Date is confirmed — let's finalise the details for ${weddingDate ? new Date(weddingDate).toLocaleDateString('en-GB') : 'your wedding'}.`;
              if (phone) openWhatsApp(phone, prefill);
            }} style={{
              padding: '6px 12px', borderRadius: 20, background: '#25D366',
              border: 'none', cursor: 'pointer',
              display: 'flex' as const, alignItems: 'center' as const, gap: 4,
            }}>
              <Phone size={12} color="#fff" />
              <span style={{ fontSize: 11, color: '#fff', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>WhatsApp</span>
            </button>
          )}
        </div>

        {/* Locked banner */}
        {isLocked && (
          <div style={{
            margin: '12px 20px 0',
            padding: '10px 14px', background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
            borderRadius: 10, textAlign: 'center' as const,
          }}>
            <p style={{ margin: 0, fontSize: 12, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              🔒 Locked for {weddingDate ? new Date(weddingDate).toLocaleDateString('en-GB') : 'this wedding'}
              {activeThread.lock_date_amount && ` · Rs ${(activeThread.lock_date_amount / 100).toLocaleString('en-IN')}`}
            </p>
            {activeThread.lock_date_expires_at && (
              <p style={{ margin: '2px 0 0', fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>
                Respond by {new Date(activeThread.lock_date_expires_at).toLocaleDateString('en-GB')}
              </p>
            )}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, padding: '16px 20px', overflow: 'auto' as const }}>
          {threadMessages.map(m => {
            const isVendor = m.from_role === 'vendor';
            const isSystem = m.from_role === 'system';
            if (isSystem) {
              return (
                <div key={m.id} style={{ margin: '12px 0', textAlign: 'center' as const }}>
                  <span style={{
                    background: C.goldSoft, border: `1px solid ${C.goldBorder}`, borderRadius: 12,
                    padding: '6px 12px', fontSize: 11, color: C.dark,
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontStyle: 'italic' as const,
                  }}>{m.content}</span>
                </div>
              );
            }
            return (
              <div key={m.id} style={{ display: 'flex' as const, justifyContent: isVendor ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                <div style={{
                  maxWidth: '78%', padding: '10px 14px', borderRadius: 14,
                  background: isVendor ? C.dark : C.ivory,
                  color: isVendor ? C.gold : C.dark,
                  border: isVendor ? 'none' : `1px solid ${C.border}`,
                  fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '19px',
                }}>
                  {m.content}
                  <div style={{ fontSize: 9, opacity: 0.6, marginTop: 4, textAlign: 'right' as const }}>
                    {new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div style={{
          position: 'fixed' as const, bottom: 'max(60px, env(safe-area-inset-bottom))',
          left: 0, right: 0, maxWidth: 480, margin: '0 auto',
          padding: '10px 14px', background: C.cream,
          borderTop: `1px solid ${C.border}`,
          display: 'flex' as const, gap: 8, zIndex: 15,
        }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            placeholder="Reply to couple..." disabled={sending}
            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) sendMessage(); }}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 22,
              border: `1px solid ${C.border}`, background: C.ivory,
              fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.dark,
              outline: 'none',
            }} onFocus={scrollIntoViewOnFocus} />
          <button onClick={sendMessage} disabled={!input.trim() || sending} style={{
            width: 40, height: 40, borderRadius: 20, background: C.dark,
            border: 'none', cursor: 'pointer',
            display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
            opacity: input.trim() ? 1 : 0.4,
          }}>
            <Send size={14} color={C.gold} />
          </button>
        </div>
      </div>
    );
  }

  // Filter logic
  const filtered = enquiries.filter(e => {
    if (filter === 'unread') return (e.vendor_unread_count || 0) > 0;
    if (filter === 'locked') return !!e.lock_date_paid;
    return true;
  });
  const unreadCount = enquiries.filter(e => (e.vendor_unread_count || 0) > 0).length;
  const lockedCount = enquiries.filter(e => !!e.lock_date_paid).length;

  // List view
  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', background: C.cream, padding: '20px 20px 100px' }}>
      <p style={{ margin: '0 0 4px', fontSize: 11, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase' as const }}>
        Leads
      </p>
      <h2 style={{ margin: '0 0 18px', fontSize: 22, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 400 }}>
        Messages & enquiries
      </h2>

      {/* Filter chips */}
      <div style={{ display: 'flex' as const, gap: 8, marginBottom: 16, overflow: 'auto' as const, scrollbarWidth: 'none' as const }}>
        {[
          { id: 'all', label: `All (${enquiries.length})` },
          { id: 'unread', label: `Unread (${unreadCount})` },
          { id: 'locked', label: `🔒 Locked (${lockedCount})` },
        ].map(opt => (
          <button key={opt.id} onClick={() => setFilter(opt.id as any)} style={{
            padding: '6px 14px', borderRadius: 20, whiteSpace: 'nowrap' as const,
            background: filter === opt.id ? C.dark : C.ivory,
            color: filter === opt.id ? C.gold : C.dark,
            border: `1px solid ${filter === opt.id ? C.dark : C.border}`,
            fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 400, cursor: 'pointer',
          }}>{opt.label}</button>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign: 'center' as const, padding: '40px 0', color: C.muted, fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center' as const }}>
          <Mail size={28} color={C.goldBorder} />
          <p style={{ margin: '12px 0 6px', fontSize: 15, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 400 }}>
            {enquiries.length === 0 ? 'No enquiries yet' : 'No matching enquiries'}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
            {enquiries.length === 0 ? 'Couples who enquire will show up here.' : 'Change filter to see others.'}
          </p>
        </div>
      ) : (
        <div style={{ background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' as const }}>
          {filtered.map((e, i) => {
            const coupleName = e.couple?.name || 'Couple';
            const unread = e.vendor_unread_count || 0;
            return (
              <button key={e.id} onClick={() => openThread(e)} style={{
                display: 'flex' as const, alignItems: 'center' as const, gap: 12,
                width: '100%', padding: '14px 16px',
                background: 'transparent' as const, border: 'none' as const,
                borderBottom: i === filtered.length - 1 ? 'none' : `1px solid ${C.border}`,
                cursor: 'pointer', textAlign: 'left' as const,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 22,
                  background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                  display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
                  flexShrink: 0,
                }}>
                  <User size={18} color={C.gold} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex' as const, justifyContent: 'space-between' as const, alignItems: 'baseline' as const, marginBottom: 2 }}>
                    <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: unread > 0 ? 600 : 500 }}>
                      {coupleName}
                    </p>
                    {e.last_message_at && (
                      <span style={{ fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', flexShrink: 0, marginLeft: 8 }}>
                        {new Date(e.last_message_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: unread > 0 ? 500 : 300, whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const }}>
                    {e.last_message_preview || e.initial_message}
                  </p>
                  {e.lock_date_paid && (
                    <div style={{ marginTop: 4, display: 'inline-flex' as const, alignItems: 'center' as const, gap: 4 }}>
                      <span style={{
                        background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
                        borderRadius: 4, padding: '2px 6px', fontSize: 9,
                        color: C.dark, fontFamily: 'DM Sans, sans-serif',
                        fontWeight: 500, letterSpacing: '0.5px',
                      }}>🔒 LOCKED {e.lock_date_amount ? `· Rs ${(e.lock_date_amount / 100).toLocaleString('en-IN')}` : ''}</span>
                    </div>
                  )}
                </div>
                {unread > 0 && (
                  <div style={{
                    width: 20, height: 20, borderRadius: 10, background: C.gold,
                    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
                    fontSize: 10, color: C.dark, fontWeight: 600, flexShrink: 0,
                  }}>{unread > 9 ? '9+' : unread}</div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DiscoveryImageHub({ session, onReload }: { session: VendorSession; onReload: () => void }) {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Mode: 'view' = tap photo to delete, 'hero' = tap photo to set as hero, 'carousel' = tap photo to toggle carousel
  const [mode, setMode] = useState<'view' | 'hero' | 'carousel'>('view');
  const [editingImage, setEditingImage] = useState<any>(null);

  const loadImages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/vendor-images/${session.vendorId}`);
      const d = await res.json();
      if (d.success) setImages(d.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadImages(); /* eslint-disable-next-line */ }, []);

  // Pre-upload quality check
  const inspectFile = (file: File): Promise<{ ok: boolean; reason?: string; width?: number; height?: number }> => new Promise(resolve => {
    if (file.size < 150 * 1024) {
      resolve({ ok: false, reason: 'Image looks compressed — try a fresh copy' });
      return;
    }
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      if (width < 900 || height < 900) {
        resolve({ ok: false, reason: `${width}×${height} — need at least 900×900`, width, height });
        return;
      }
      resolve({ ok: true, width, height });
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ ok: false, reason: 'Cannot read file' }); };
    img.src = url;
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    let uploaded = 0, skipped = 0;
    for (const f of files) {
      const check = await inspectFile(f);
      if (!check.ok) { skipped++; continue; }
      const url = await uploadToCloudinary(f);
      if (!url) continue;
      try {
        await fetch(`${API}/api/vendor-images`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendor_id: session.vendorId, url,
            width: check.width, height: check.height, file_size: f.size,
            tags: [],
          }),
        });
        uploaded++;
      } catch {}
    }
    await loadImages();
    onReload();
    setUploading(false);
    e.target.value = '';
    if (skipped > 0) alert(`${uploaded} uploaded · ${skipped} skipped (low quality)`);
  };

  const setAsHero = async (imageId: string) => {
    try {
      const res = await fetch(`${API}/api/vendor-images/set-hero`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: session.vendorId, image_id: imageId }),
      });
      const d = await res.json();
      if (d.success) {
        await loadImages();
        onReload();
      } else {
        alert(d.error || 'Could not set hero');
      }
    } catch { alert('Network error'); }
  };

  const toggleCarousel = async (imageId: string) => {
    try {
      const res = await fetch(`${API}/api/vendor-images/toggle-carousel`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: session.vendorId, image_id: imageId }),
      });
      const d = await res.json();
      if (d.success) {
        await loadImages();
        onReload();
      } else if (d.error === 'tier_cap') {
        alert(d.message || 'Carousel limit reached for your tier.');
      } else {
        alert(d.error || 'Could not toggle');
      }
    } catch { alert('Network error'); }
  };

  const deleteImage = async (id: string) => {
    if (!confirm('Delete this photo? This removes it everywhere.')) return;
    try {
      await fetch(`${API}/api/vendor-images/${id}`, { method: 'DELETE' });
      await loadImages();
      onReload();
      setEditingImage(null);
    } catch {}
  };

  // Detail sheet — only for delete now (no tag editing)
  if (editingImage) {
    return (
      <div style={{
        position: 'fixed' as const, inset: 0, zIndex: 70,
        background: 'rgba(0,0,0,0.85)', display: 'flex' as const,
        flexDirection: 'column' as const,
      }}>
        <div style={{
          padding: 'max(24px, env(safe-area-inset-top)) 16px 16px',
          display: 'flex' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const,
        }}>
          <button onClick={() => setEditingImage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
            <X size={22} color="#FFF" />
          </button>
          <div style={{ display: 'flex' as const, gap: 6 }}>
            {(editingImage.tags || []).includes('hero') && (
              <span style={{ padding: '4px 10px', borderRadius: 12, background: C.gold, fontSize: 9, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const }}>★ Hero</span>
            )}
            {(editingImage.tags || []).includes('carousel') && (
              <span style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.15)', fontSize: 9, color: '#FFF', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' as const }}>Carousel</span>
            )}
          </div>
          <button onClick={() => deleteImage(editingImage.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
            <Trash2 size={20} color="#FF8B8B" />
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: '20px' }}>
          <img src={editingImage.url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' as const, borderRadius: 12 }} />
        </div>
      </div>
    );
  }

  // Compute counts for header
  const tier = (session.tier || 'essential').toLowerCase();
  const cap = tier === 'prestige' ? 20 : tier === 'signature' ? 10 : 5;
  const hasHero = images.some(i => Array.isArray(i.tags) && i.tags.includes('hero'));
  const carouselCount = images.filter(i => Array.isArray(i.tags) && i.tags.includes('carousel')).length;

  // Main grid view
  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', background: C.cream, padding: '20px 20px 100px' }}>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase' as const }}>
          Image Hub
        </p>
        <h2 style={{ margin: 0, fontSize: 22, color: C.dark, fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>
          All your media.
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
          Hero {hasHero ? '✓' : '—'} · Carousel {carouselCount}/{cap - 1} · {tier}
        </p>
      </div>

      {/* TWO MODE BUTTONS */}
      <div style={{ display: 'flex' as const, gap: 10, marginBottom: 14 }}>
        <button onClick={() => setMode(mode === 'hero' ? 'view' : 'hero')} style={{
          flex: 1, padding: '14px 12px', borderRadius: 12,
          background: mode === 'hero' ? C.gold : C.ivory,
          color: mode === 'hero' ? C.dark : C.dark,
          border: `1px solid ${mode === 'hero' ? C.gold : C.goldBorder}`,
          fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
          letterSpacing: '0.5px', cursor: 'pointer' as const,
        }}>
          {mode === 'hero' ? '★ Tap a photo to set as Hero' : '★ Set Hero'}
        </button>
        <button onClick={() => setMode(mode === 'carousel' ? 'view' : 'carousel')} style={{
          flex: 1, padding: '14px 12px', borderRadius: 12,
          background: mode === 'carousel' ? C.dark : C.ivory,
          color: mode === 'carousel' ? C.gold : C.dark,
          border: `1px solid ${mode === 'carousel' ? C.dark : C.goldBorder}`,
          fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
          letterSpacing: '0.5px', cursor: 'pointer' as const,
        }}>
          {mode === 'carousel' ? '✓ Tap photos for Carousel' : '+ Carousel'}
        </button>
      </div>

      {/* Helper text — what tap does in current mode */}
      <p style={{ margin: '0 0 14px', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontStyle: 'italic' as const, textAlign: 'center' as const }}>
        {mode === 'view' && 'Tap a photo to view or delete.'}
        {mode === 'hero' && 'Hero is what couples see first on Discover. Choose one.'}
        {mode === 'carousel' && `Carousel shows when couples open your profile. Tap to add or remove. (${carouselCount}/${cap - 1} used)`}
      </p>

      {/* Upload button */}
      <label style={{
        display: 'block' as const, padding: '14px 16px', borderRadius: 10,
        background: C.dark, color: C.gold, fontSize: 13,
        fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
        textAlign: 'center' as const, cursor: uploading ? 'wait' : 'pointer',
        opacity: uploading ? 0.7 : 1, marginBottom: 16,
        letterSpacing: '0.3px',
      }}>
        {uploading ? 'Uploading…' : '+ Upload photos'}
        <input type="file" multiple accept="image/*" onChange={handleUpload}
          disabled={uploading} style={{ display: 'none' }} />
      </label>

      {/* Grid */}
      {loading ? (
        <p style={{ textAlign: 'center' as const, padding: '40px 0', color: C.muted, fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>Loading…</p>
      ) : images.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' as const }}>
          <ImageIcon size={28} color={C.goldBorder} />
          <p style={{ margin: '10px 0 4px', fontSize: 14, color: C.dark, fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>
            No photos yet
          </p>
          <p style={{ margin: 0, fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
            Upload to get started.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid' as const, gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {images.map(img => {
            const tags = Array.isArray(img.tags) ? img.tags : [];
            const isHero = tags.includes('hero');
            const inCarousel = tags.includes('carousel');
            const handleTap = () => {
              if (mode === 'hero') setAsHero(img.id);
              else if (mode === 'carousel') toggleCarousel(img.id);
              else setEditingImage(img);
            };
            return (
              <div key={img.id} onClick={handleTap} style={{
                aspectRatio: '1', position: 'relative' as const, cursor: 'pointer' as const,
                background: `url(${img.url}) center/cover`,
                border: isHero
                  ? `3px solid ${C.gold}`
                  : (inCarousel ? `2px solid ${C.dark}` : `1px solid ${C.border}`),
                borderRadius: 8, overflow: 'hidden' as const,
              }}>
                {/* Status badges in corner */}
                <div style={{ position: 'absolute' as const, top: 4, left: 4, display: 'flex' as const, gap: 3, flexDirection: 'column' as const }}>
                  {isHero && (
                    <div style={{ background: C.gold, borderRadius: 4, padding: '2px 6px', fontSize: 8, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 700, letterSpacing: '0.5px' }}>★ HERO</div>
                  )}
                  {inCarousel && !isHero && (
                    <div style={{ background: 'rgba(44,36,32,0.85)', borderRadius: 4, padding: '2px 6px', fontSize: 8, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, letterSpacing: '0.5px', backdropFilter: 'blur(4px)' as const }}>CAROUSEL</div>
                  )}
                </div>
                {/* Mode-active overlay hint */}
                {mode !== 'view' && (
                  <div style={{
                    position: 'absolute' as const, inset: 0,
                    background: mode === 'hero'
                      ? (isHero ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.15)')
                      : (inCarousel ? 'rgba(44,36,32,0.4)' : 'rgba(255,255,255,0.15)'),
                    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
                  }}>
                    {mode === 'hero' && isHero && (
                      <div style={{ background: C.gold, borderRadius: '50%', width: 32, height: 32, display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const }}>
                        <span style={{ fontSize: 18, color: C.dark }}>★</span>
                      </div>
                    )}
                    {mode === 'carousel' && inCarousel && (
                      <div style={{ background: C.dark, borderRadius: '50%', width: 32, height: 32, display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const }}>
                        <CheckCircle size={18} color={C.gold} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function DiscoveryPower({ session, modeState, onReload }: { session: VendorSession; modeState: ModeState; onReload: () => void }) {
  const [activeSection, setActiveSection] = useState<'none' | 'profile' | 'offers' | 'featured' | 'boost' | 'insights' | 'flex'>('none');

  // Counts for card subtitles
  const [offersCount, setOffersCount] = useState(0);
  const [featuredCount, setFeaturedCount] = useState(0);
  const [boostsCount, setBoostsCount] = useState(0);
  const [analyticsTotal, setAnalyticsTotal] = useState<any>({ impressions: 0, profile_views: 0, saves: 0, enquiries: 0, lock_interests: 0 });
  const [flexEnabled, setFlexEnabled] = useState(false);

  const loadCounts = async () => {
    try {
      const [oRes, fRes, bRes, anRes, vRes] = await Promise.all([
        fetch(`${API}/api/vendor-offers/${session.vendorId}`).then(r => r.json()),
        fetch(`${API}/api/vendor-featured/${session.vendorId}`).then(r => r.json()),
        fetch(`${API}/api/vendor-boosts/${session.vendorId}`).then(r => r.json()),
        fetch(`${API}/api/vendor-analytics/${session.vendorId}?days=30`).then(r => r.json()),
        fetch(`${API}/api/vendors/${session.vendorId}`).then(r => r.json()).catch(() => ({ data: null })),
      ]);
      if (oRes.success) setOffersCount((oRes.data || []).filter((x: any) => x.is_active).length);
      if (fRes.success) setFeaturedCount((fRes.data || []).filter((x: any) => x.status === 'approved' || x.status === 'pending').length);
      if (bRes.success) setBoostsCount((bRes.data || []).filter((x: any) => x.is_active).length);
      if (anRes.success) setAnalyticsTotal(anRes.totals || {});
      if (vRes?.data) setFlexEnabled(!!vRes.data.flex_leads_enabled);
    } catch {}
  };

  useEffect(() => { loadCounts(); /* eslint-disable-next-line */ }, [session.vendorId]);

  const toggleFlex = async () => {
    const next = !flexEnabled;
    setFlexEnabled(next); // optimistic
    try {
      await fetch(`${API}/api/vendor-discover/flex-leads`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: session.vendorId, enabled: next }),
      });
    } catch { setFlexEnabled(!next); }
  };

  // Sections render
  if (activeSection === 'profile') return <PowerEditProfile session={session} onClose={() => { setActiveSection('none'); onReload(); loadCounts(); }} />;
  if (activeSection === 'offers')  return <PowerOffers session={session} onClose={() => { setActiveSection('none'); loadCounts(); }} />;
  if (activeSection === 'featured') return <PowerFeatured session={session} onClose={() => { setActiveSection('none'); loadCounts(); }} />;
  if (activeSection === 'boost')   return <PowerBoosts session={session} onClose={() => { setActiveSection('none'); loadCounts(); }} />;
  if (activeSection === 'insights') return <PowerInsights session={session} onClose={() => setActiveSection('none')} />;

  // 6 cards in a 2-col grid
  const cards: { id: 'boost' | 'offers' | 'featured' | 'flex' | 'insights' | 'profile'; title: string; body: string; meta: string; Icon: any; isToggle?: boolean }[] = [
    { id: 'boost',    title: 'Boost',         body: 'Promote your open dates.',             meta: boostsCount > 0 ? `${boostsCount} boosted` : 'Tap to boost',          Icon: TrendingDown },
    { id: 'offers',   title: 'Offers',        body: 'Create a limited-time discount.',      meta: offersCount > 0 ? `${offersCount} active` : 'No offers yet',         Icon: Percent },
    { id: 'featured', title: 'Featured',      body: 'Apply to editorial boards.',           meta: featuredCount > 0 ? `${featuredCount} submitted` : 'Apply now',       Icon: Award },
    { id: 'flex',     title: 'Flex Leads',    body: 'Accept leads 15% below your range.',   meta: flexEnabled ? 'ON' : 'OFF',                                           Icon: Zap, isToggle: true },
    { id: 'insights', title: 'Insights',      body: 'Track your 30-day performance.',       meta: `${analyticsTotal.profile_views || 0} views`,                         Icon: BarChart2 },
    { id: 'profile',  title: 'Edit Profile',  body: 'Complete your vendor details.',        meta: `${modeState.completion_pct}% complete`,                              Icon: Edit2 },
  ];

  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', background: C.cream, padding: '8px 20px 100px' }}>

      {/* Editorial header */}
      <p style={{ margin: '0 0 4px', fontSize: 10, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase' as const }}>
        Studio
      </p>
      <h2 style={{ margin: '0 0 6px', fontSize: 24, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 400, lineHeight: '30px' }}>
        Make your profile work harder.
      </h2>
      <p style={{ margin: '0 0 22px', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '18px' }}>
        Boost dates, run offers, apply for editorial placement — all in one place.
      </p>

      {/* 2-col grid of 6 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
        {cards.map(c => (
          <button
            key={c.id}
            onClick={() => {
              if (c.isToggle) { toggleFlex(); return; }
              setActiveSection(c.id as any);
            }}
            style={{
              display: 'flex' as const, flexDirection: 'column' as const,
              padding: '16px 14px', borderRadius: 14,
              background: C.ivory, border: `1px solid ${C.border}`,
              cursor: 'pointer' as const, textAlign: 'left' as const,
              minHeight: 130,
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: c.id === 'flex' && flexEnabled ? C.gold : C.goldSoft,
              border: `1px solid ${c.id === 'flex' && flexEnabled ? C.gold : C.goldBorder}`,
              display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
              marginBottom: 12,
            }}>
              <c.Icon size={15} color={c.id === 'flex' && flexEnabled ? C.dark : C.gold} />
            </div>
            <p style={{ margin: '0 0 4px', fontSize: 14, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 500, letterSpacing: '0.2px' }}>
              {c.title}
            </p>
            <p style={{ margin: '0 0 auto', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '15px' }}>
              {c.body}
            </p>
            <p style={{
              margin: '10px 0 0', fontSize: 9,
              color: c.id === 'flex' && flexEnabled ? '#4CAF50' : C.gold,
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '1.5px',
              textTransform: 'uppercase' as const,
            }}>
              {c.meta}
            </p>
          </button>
        ))}
      </div>

      {/* Collab Hub teaser — DreamAi access pattern */}
      <div style={{
        background: C.ivory, border: `1px solid ${C.goldBorder}`, borderRadius: 16,
        padding: '20px 22px', marginBottom: 24, position: 'relative' as const,
      }}>
        {/* Coming Soon badge top-right */}
        <div style={{
          position: 'absolute' as const, top: 16, right: 18,
          padding: '3px 10px', borderRadius: 20,
          background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
          fontSize: 8, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
          letterSpacing: '1.8px', textTransform: 'uppercase' as const,
        }}>
          Coming Soon
        </div>

        {/* Eyebrow + Title */}
        <p style={{ margin: '0 0 6px', fontSize: 10, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase' as const }}>
          Collab · Hub
        </p>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, color: C.dark, fontFamily: "'Playfair Display', serif", fontWeight: 500, lineHeight: '24px' }}>
          Collaborate with other vendors.
        </h3>

        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, fontFamily: 'DM Sans, sans-serif' }}>
          Post a brief — <strong style={{ color: C.dark }}>"Looking for an MUA in Jaipur, Rs. 40K"</strong> — and get matched with the right people.
          <br /><br />
          A marketplace built by vendors, for vendors.
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PowerEditProfile — wraps existing DiscoveryComingSoon as a full sheet
// ═══════════════════════════════════════════════════════════════════════════
function PowerEditProfile({ session, onClose }: { session: VendorSession; onClose: () => void }) {
  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', background: C.cream, paddingBottom: 100 }}>
      <div style={{
        position: 'sticky' as const, top: 0, zIndex: 10,
        background: C.cream, padding: '14px 16px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex' as const, alignItems: 'center' as const, gap: 12,
      }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ChevronRight size={18} color={C.dark} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 15, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 500 }}>Edit Profile</p>
          <p style={{ margin: 0, fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>All your profile sections</p>
        </div>
      </div>
      <DiscoveryComingSoon session={session} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PowerOffers — create/manage limited-time offers
// ═══════════════════════════════════════════════════════════════════════════
function PowerOffers({ session, onClose }: { session: VendorSession; onClose: () => void }) {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<any>({ title: '', description: '', discount_type: 'percent', discount_value: 10, ends_at: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/vendor-offers/${session.vendorId}`);
      const d = await res.json();
      if (d.success) setOffers(d.data || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const createOffer = async () => {
    if (!form.title.trim()) return;
    try {
      await fetch(`${API}/api/vendor-offers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: session.vendorId,
          title: form.title.trim(),
          description: form.description.trim() || null,
          discount_type: form.discount_type,
          discount_value: form.discount_type === 'freebie' ? null : parseInt(form.discount_value),
          freebie_text: form.discount_type === 'freebie' ? form.description.trim() : null,
          ends_at: form.ends_at || null,
          is_active: true,
        }),
      });
      setCreating(false);
      setForm({ title: '', description: '', discount_type: 'percent', discount_value: 10, ends_at: '' });
      load();
    } catch {}
  };

  const toggleActive = async (o: any) => {
    try {
      await fetch(`${API}/api/vendor-offers/${o.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !o.is_active }),
      });
      load();
    } catch {}
  };

  const deleteOffer = async (id: string) => {
    if (!confirm('Delete this offer?')) return;
    try {
      await fetch(`${API}/api/vendor-offers/${id}`, { method: 'DELETE' });
      load();
    } catch {}
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', background: C.cream, paddingBottom: 100 }}>
      <div style={{ position: 'sticky' as const, top: 0, zIndex: 10, background: C.cream, padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex' as const, alignItems: 'center' as const, gap: 12 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ChevronRight size={18} color={C.dark} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <p style={{ margin: 0, fontSize: 15, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 500, flex: 1 }}>Offers</p>
        {!creating && (
          <button onClick={() => setCreating(true)} style={{
            padding: '6px 12px', borderRadius: 8, background: C.dark, border: 'none' as const,
            color: C.gold, fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer',
          }}>+ New</button>
        )}
      </div>

      <div style={{ padding: '16px 20px' }}>
        {creating && (
          <div style={{ background: C.ivory, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 500 }}>New offer</p>
            <Field label="Title">
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. 15% off until Dec 31" style={inputStyle} onFocus={scrollIntoViewOnFocus} />
            </Field>
            <Field label="Type">
              <div style={{ display: 'flex' as const, gap: 6 }}>
                {['percent', 'flat', 'freebie'].map(t => (
                  <button key={t} onClick={() => setForm({ ...form, discount_type: t })} style={{
                    padding: '7px 12px', borderRadius: 20,
                    background: form.discount_type === t ? C.dark : C.cream,
                    color: form.discount_type === t ? C.gold : C.dark,
                    border: `1px solid ${form.discount_type === t ? C.dark : C.border}`,
                    fontSize: 12, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                  }}>{t}</button>
                ))}
              </div>
            </Field>
            {form.discount_type !== 'freebie' && (
              <Field label={form.discount_type === 'percent' ? 'Percent off' : 'Amount (Rs)'}>
                <input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} style={inputStyle} onFocus={scrollIntoViewOnFocus} />
              </Field>
            )}
            <Field label={form.discount_type === 'freebie' ? 'Freebie description' : 'Description (optional)'}>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={form.discount_type === 'freebie' ? 'e.g. Free highlight reel with Premium' : 'Optional'} style={inputStyle} onFocus={scrollIntoViewOnFocus} />
            </Field>
            <Field label="Ends on (optional)">
              <input type="date" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} style={inputStyle} onFocus={scrollIntoViewOnFocus} />
            </Field>
            <div style={{ display: 'flex' as const, gap: 8, marginTop: 12 }}>
              <button onClick={() => setCreating(false)} style={{ flex: 1, padding: 12, borderRadius: 10, background: C.cream, border: `1px solid ${C.border}`, color: C.dark, fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 400, cursor: 'pointer' }}>Cancel</button>
              <button onClick={createOffer} disabled={!form.title.trim()} style={{ flex: 2, padding: 12, borderRadius: 10, background: C.dark, border: 'none' as const, color: C.gold, fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer', opacity: form.title.trim() ? 1 : 0.5 }}>Publish</button>
            </div>
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: 'center' as const, padding: 40, color: C.muted, fontSize: 13 }}>Loading…</p>
        ) : offers.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' as const }}>
            <Percent size={28} color={C.goldBorder} />
            <p style={{ margin: '10px 0 4px', fontSize: 14, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 400 }}>No offers yet</p>
            <p style={{ margin: 0, fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>Create limited-time offers to attract more enquiries.</p>
          </div>
        ) : offers.map(o => (
          <div key={o.id} style={{ background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 500 }}>{o.title}</p>
                {o.description && <p style={{ margin: '4px 0 0', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>{o.description}</p>}
                <div style={{ display: 'flex' as const, gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: o.is_active ? '#2E7D32' : C.muted, fontWeight: 500 }}>{o.is_active ? '● Active' : '○ Inactive'}</span>
                  {o.ends_at && <span style={{ fontSize: 10, color: C.muted }}>Ends {new Date(o.ends_at).toLocaleDateString('en-GB')}</span>}
                </div>
              </div>
              <div style={{ display: 'flex' as const, flexDirection: 'column' as const, gap: 6 }}>
                <button onClick={() => toggleActive(o)} style={{ padding: '4px 10px', fontSize: 10, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer', color: C.dark }}>{o.is_active ? 'Pause' : 'Activate'}</button>
                <button onClick={() => deleteOffer(o.id)} style={{ padding: '4px 10px', fontSize: 10, background: 'transparent', border: '1px solid #FFCDD2', borderRadius: 4, cursor: 'pointer', color: '#C65757' }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PowerFeatured — apply for featured placements
// ═══════════════════════════════════════════════════════════════════════════
function PowerFeatured({ session, onClose }: { session: VendorSession; onClose: () => void }) {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [pitch, setPitch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/vendor-featured/${session.vendorId}`);
      const d = await res.json();
      if (d.success) setApps(d.data || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const submitApp = async () => {
    if (!applying || !pitch.trim()) return;
    try {
      await fetch(`${API}/api/vendor-featured`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: session.vendorId,
          board_type: applying,
          pitch: pitch.trim(),
        }),
      });
      setApplying(null); setPitch('');
      load();
    } catch {}
  };

  const BOARDS = [
    { id: 'spotlight', label: 'Spotlight', desc: 'Top of home screen hero slot' },
    { id: 'get_inspired', label: 'Get Inspired', desc: 'Editorial inspiration row' },
    { id: 'look_book', label: 'Look Book', desc: 'Curated style collection' },
    { id: 'special_offers', label: 'Special Offers', desc: 'Offer-focused featured row' },
  ];

  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', background: C.cream, paddingBottom: 100 }}>
      <div style={{ position: 'sticky' as const, top: 0, zIndex: 10, background: C.cream, padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex' as const, alignItems: 'center' as const, gap: 12 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ChevronRight size={18} color={C.dark} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <p style={{ margin: 0, fontSize: 15, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 500, flex: 1 }}>Featured placements</p>
      </div>

      <div style={{ padding: '16px 20px' }}>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '18px' }}>
          Apply for a featured spot. Our team reviews every application. Approvals typically last 2 weeks.
        </p>

        {applying && (
          <div style={{ background: C.ivory, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 500 }}>
              Apply for {BOARDS.find(b => b.id === applying)?.label}
            </p>
            <p style={{ margin: '0 0 12px', fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>
              Why should we feature you? One to three sentences.
            </p>
            <textarea value={pitch} onChange={e => setPitch(e.target.value)} rows={4}
              placeholder="e.g. I've shot 30+ weddings this year. My signature style is warm, unposed, cinematic."
              style={{ ...inputStyle, resize: 'none' as const }} onFocus={scrollIntoViewOnFocus} />
            <div style={{ display: 'flex' as const, gap: 8, marginTop: 12 }}>
              <button onClick={() => { setApplying(null); setPitch(''); }} style={{ flex: 1, padding: 12, borderRadius: 10, background: C.cream, border: `1px solid ${C.border}`, color: C.dark, fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>Cancel</button>
              <button onClick={submitApp} disabled={!pitch.trim()} style={{ flex: 2, padding: 12, borderRadius: 10, background: C.dark, border: 'none' as const, color: C.gold, fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer', opacity: pitch.trim() ? 1 : 0.5 }}>Submit</button>
            </div>
          </div>
        )}

        <p style={{ margin: '10px 0', fontSize: 10, color: C.muted, fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const }}>Apply for</p>
        {BOARDS.map(b => {
          const existing = apps.find(a => a.board_type === b.id);
          return (
            <div key={b.id} style={{ background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex' as const, alignItems: 'center' as const, gap: 12 }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 500 }}>{b.label}</p>
                <p style={{ margin: 0, fontSize: 11, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>{b.desc}</p>
              </div>
              {existing ? (
                <span style={{ padding: '4px 8px', fontSize: 10, borderRadius: 4,
                  background: existing.status === 'approved' ? '#E8F5E9' : existing.status === 'pending' ? '#FFF3DB' : '#FFEBEE',
                  color: existing.status === 'approved' ? '#2E7D32' : existing.status === 'pending' ? '#B8963A' : '#C65757',
                  fontWeight: 500, letterSpacing: 0.5, textTransform: 'uppercase' as const,
                }}>{existing.status}</span>
              ) : (
                <button onClick={() => setApplying(b.id)} style={{ padding: '6px 12px', fontSize: 11, background: C.dark, border: 'none' as const, color: C.gold, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, borderRadius: 6, cursor: 'pointer' }}>Apply</button>
              )}
            </div>
          );
        })}

        {apps.length > 0 && (
          <>
            <p style={{ margin: '20px 0 10px', fontSize: 10, color: C.muted, fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const }}>Recent applications</p>
            {apps.map(a => (
              <div key={a.id} style={{ background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 6 }}>
                <p style={{ margin: 0, fontSize: 12, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                  {BOARDS.find(b => b.id === a.board_type)?.label || a.board_type} — <span style={{ color: a.status === 'approved' ? '#2E7D32' : a.status === 'rejected' ? '#C65757' : C.muted }}>{a.status}</span>
                </p>
                {a.admin_notes && <p style={{ margin: '4px 0 0', fontSize: 10, color: C.muted, fontStyle: 'italic' as const }}>{a.admin_notes}</p>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PowerBoosts — highlight unbooked dates
// ═══════════════════════════════════════════════════════════════════════════
function PowerBoosts({ session, onClose }: { session: VendorSession; onClose: () => void }) {
  const [boosts, setBoosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<any>({ boost_date: '', rate_override: '', message: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/vendor-boosts/${session.vendorId}`);
      const d = await res.json();
      if (d.success) setBoosts(d.data || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const create = async () => {
    if (!form.boost_date) return;
    try {
      await fetch(`${API}/api/vendor-boosts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: session.vendorId,
          boost_date: form.boost_date,
          rate_override: form.rate_override ? parseInt(form.rate_override) * 100 : null,
          message: form.message.trim() || null,
          is_active: true,
        }),
      });
      setCreating(false); setForm({ boost_date: '', rate_override: '', message: '' });
      load();
    } catch {}
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this boost?')) return;
    try {
      await fetch(`${API}/api/vendor-boosts/${id}`, { method: 'DELETE' });
      load();
    } catch {}
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', background: C.cream, paddingBottom: 100 }}>
      <div style={{ position: 'sticky' as const, top: 0, zIndex: 10, background: C.cream, padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex' as const, alignItems: 'center' as const, gap: 12 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ChevronRight size={18} color={C.dark} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <p style={{ margin: 0, fontSize: 15, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 500, flex: 1 }}>Boost unbooked dates</p>
        {!creating && (
          <button onClick={() => setCreating(true)} style={{ padding: '6px 12px', borderRadius: 8, background: C.dark, border: 'none' as const, color: C.gold, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>+ Add</button>
        )}
      </div>

      <div style={{ padding: '16px 20px' }}>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, lineHeight: '18px' }}>
          Highlight your available dates to couples. You can offer special rates or add a short message.
        </p>

        {creating && (
          <div style={{ background: C.ivory, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <Field label="Date"><input type="date" value={form.boost_date} onChange={e => setForm({ ...form, boost_date: e.target.value })} style={inputStyle} onFocus={scrollIntoViewOnFocus} /></Field>
            <Field label="Special rate (Rs, optional)"><input type="number" value={form.rate_override} onChange={e => setForm({ ...form, rate_override: e.target.value })} placeholder="Leave blank to show current rate" style={inputStyle} onFocus={scrollIntoViewOnFocus} /></Field>
            <Field label="Message (optional)"><input value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="e.g. Last slot in Q4" style={inputStyle} onFocus={scrollIntoViewOnFocus} /></Field>
            <div style={{ display: 'flex' as const, gap: 8, marginTop: 10 }}>
              <button onClick={() => setCreating(false)} style={{ flex: 1, padding: 12, borderRadius: 10, background: C.cream, border: `1px solid ${C.border}`, color: C.dark, fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>Cancel</button>
              <button onClick={create} disabled={!form.boost_date} style={{ flex: 2, padding: 12, borderRadius: 10, background: C.dark, border: 'none' as const, color: C.gold, fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer', opacity: form.boost_date ? 1 : 0.5 }}>Boost</button>
            </div>
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: 'center' as const, padding: 40, color: C.muted, fontSize: 13 }}>Loading…</p>
        ) : boosts.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' as const }}>
            <TrendingDown size={28} color={C.goldBorder} />
            <p style={{ margin: '10px 0 4px', fontSize: 14, color: C.dark, fontFamily: 'Playfair Display, serif' }}>No boosted dates</p>
            <p style={{ margin: 0, fontSize: 12, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>Highlight open dates to create urgency.</p>
          </div>
        ) : boosts.map(b => (
          <div key={b.id} style={{ background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 8, display: 'flex' as const, alignItems: 'center' as const, gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 500 }}>
                {new Date(b.boost_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              {b.rate_override && <p style={{ margin: '2px 0 0', fontSize: 12, color: C.gold, fontWeight: 500 }}>Rs {(b.rate_override / 100).toLocaleString('en-IN')}</p>}
              {b.message && <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted, fontStyle: 'italic' as const }}>{b.message}</p>}
            </div>
            <button onClick={() => remove(b.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Trash2 size={14} color="#C65757" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PowerInsights — analytics dashboard
// ═══════════════════════════════════════════════════════════════════════════
function PowerInsights({ session, onClose }: { session: VendorSession; onClose: () => void }) {
  const [days, setDays] = useState(30);
  const [totals, setTotals] = useState<any>({ impressions: 0, profile_views: 0, saves: 0, enquiries: 0, lock_interests: 0 });
  const [daily, setDaily] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/vendor-analytics/${session.vendorId}?days=${days}`);
      const d = await res.json();
      if (d.success) { setTotals(d.totals || {}); setDaily(d.daily || []); }
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [days]);

  // Funnel computations
  const conversionRate = totals.profile_views > 0 ? Math.round((totals.enquiries / totals.profile_views) * 100) : 0;
  const saveRate = totals.profile_views > 0 ? Math.round((totals.saves / totals.profile_views) * 100) : 0;

  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', background: C.cream, paddingBottom: 100 }}>
      <div style={{ position: 'sticky' as const, top: 0, zIndex: 10, background: C.cream, padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex' as const, alignItems: 'center' as const, gap: 12 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ChevronRight size={18} color={C.dark} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <p style={{ margin: 0, fontSize: 15, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 500, flex: 1 }}>Insights</p>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Range selector */}
        <div style={{ display: 'flex' as const, gap: 6, marginBottom: 18 }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} style={{
              padding: '6px 14px', borderRadius: 20,
              background: days === d ? C.dark : C.ivory,
              color: days === d ? C.gold : C.dark,
              border: `1px solid ${days === d ? C.dark : C.border}`,
              fontSize: 11, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
            }}>Last {d} days</button>
          ))}
        </div>

        {/* Totals grid */}
        <p style={{ margin: '0 0 10px', fontSize: 10, color: C.muted, fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const }}>Totals</p>
        <div style={{ display: 'grid' as const, gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8, marginBottom: 18 }}>
          {[
            { label: 'Feed impressions', value: totals.impressions || 0 },
            { label: 'Profile views', value: totals.profile_views || 0 },
            { label: 'Saves to Muse', value: totals.saves || 0 },
            { label: 'Enquiries', value: totals.enquiries || 0 },
            { label: 'Lock Date taps', value: totals.lock_interests || 0 },
          ].map(m => (
            <div key={m.label} style={{ background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 10px', textAlign: 'center' as const }}>
              <p style={{ margin: '0 0 4px', fontSize: 22, color: C.dark, fontFamily: 'Playfair Display, serif', fontWeight: 500 }}>{m.value}</p>
              <p style={{ margin: 0, fontSize: 9, color: C.muted, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' as const }}>{m.label}</p>
            </div>
          ))}
        </div>

        {/* Funnel */}
        <p style={{ margin: '0 0 10px', fontSize: 10, color: C.muted, fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const }}>Conversion funnel</p>
        <div style={{ background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 18 }}>
          <FunnelStep label="Feed impressions" value={totals.impressions || 0} pctOfTop={100} color={C.muted} />
          <FunnelStep label="Profile views" value={totals.profile_views || 0} pctOfTop={totals.impressions > 0 ? Math.round((totals.profile_views / totals.impressions) * 100) : 0} color={C.dark} />
          <FunnelStep label="Saves to Muse" value={totals.saves || 0} pctOfTop={saveRate} color={C.gold} sub={`${saveRate}% of viewers`} />
          <FunnelStep label="Enquiries" value={totals.enquiries || 0} pctOfTop={conversionRate} color={C.gold} sub={`${conversionRate}% of viewers`} last />
        </div>

        {/* Daily chart (simple bar list) */}
        {daily.length > 0 && (
          <>
            <p style={{ margin: '0 0 10px', fontSize: 10, color: C.muted, fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const }}>Daily views</p>
            <div style={{ background: C.ivory, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 14px' }}>
              {(() => {
                const max = Math.max(1, ...daily.map(d => d.profile_views || 0));
                return daily.map(d => (
                  <div key={d.day} style={{ display: 'flex' as const, alignItems: 'center' as const, gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 60, fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif' }}>
                      {new Date(d.day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                    <div style={{ flex: 1, height: 10, background: C.cream, borderRadius: 5, overflow: 'hidden' as const }}>
                      <div style={{
                        width: `${((d.profile_views || 0) / max) * 100}%`, height: '100%',
                        background: C.gold, transition: 'width 0.3s',
                      }} />
                    </div>
                    <span style={{ width: 30, fontSize: 11, color: C.dark, fontWeight: 500, textAlign: 'right' as const }}>{d.profile_views || 0}</span>
                  </div>
                ));
              })()}
            </div>
          </>
        )}

        {loading && <p style={{ textAlign: 'center' as const, padding: 20, color: C.muted, fontSize: 12 }}>Loading…</p>}
      </div>
    </div>
  );
}

function FunnelStep({ label, value, pctOfTop, color, sub, last }: { label: string; value: number; pctOfTop: number; color: string; sub?: string; last?: boolean }) {
  return (
    <div style={{ marginBottom: last ? 0 : 14 }}>
      <div style={{ display: 'flex' as const, justifyContent: 'space-between' as const, alignItems: 'baseline' as const, marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: C.dark, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 14, color, fontFamily: 'Playfair Display, serif', fontWeight: 500 }}>{value}</span>
      </div>
      <div style={{ height: 8, background: C.cream, borderRadius: 4, overflow: 'hidden' as const, marginBottom: 2 }}>
        <div style={{ width: `${Math.min(100, pctOfTop)}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
      </div>
      {sub && <p style={{ margin: 0, fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontStyle: 'italic' as const }}>{sub}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared field-style helpers for onboarding
// ═══════════════════════════════════════════════════════════════════════════
function Field({ label, children }: { label: string; children: any }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block' as const, fontSize: 10, color: C.muted, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' as const, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}
const inputStyle: any = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: `1px solid ${C.border}`, background: C.ivory,
  fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: C.dark,
  outline: 'none', boxSizing: 'border-box',
};
