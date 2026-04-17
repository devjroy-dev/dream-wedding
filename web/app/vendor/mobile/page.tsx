'use client';

import { useState, useEffect } from 'react';
import {
  Grid, MessageCircle, Calendar, Tool, User, Plus, Phone, Send,
  FileText, CreditCard, Clock, Users, TrendingDown, Percent,
  Share2, BarChart2, Package, Gift, Globe, Award, ChevronRight,
  LogOut, Settings as SettingsIcon, Lock, Briefcase, MapPin, Zap,
  CheckCircle, AlertCircle, X, Search, Mail,
} from 'react-feather';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

// ── Types ────────────────────────────────────────────────────────────────

type Tab = 'Dashboard' | 'Inquiries' | 'Calendar' | 'Tools' | 'Profile';
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
  { id: 'overview',     icon: Grid,         label: 'Overview',     tab: 'Dashboard' as Tab },
  { id: 'inquiries',    icon: Mail,         label: 'Enquiries',    tab: 'Inquiries' as Tab },
  { id: 'calendar',     icon: Calendar,     label: 'Calendar',     tab: 'Calendar' as Tab },
  { id: 'clients',      icon: Users,        label: 'Clients',      tab: 'Tools' as Tab, sub: 'clients' },
  { id: 'invoices',     icon: FileText,     label: 'Invoices',     tab: 'Tools' as Tab, sub: 'invoices' },
  { id: 'contracts',    icon: Briefcase,    label: 'Contracts',    tab: 'Tools' as Tab, sub: 'contracts' },
  { id: 'payments',     icon: CreditCard,   label: 'Payments',     tab: 'Tools' as Tab, sub: 'payments' },
  { id: 'availability', icon: Clock,        label: 'Availability', tab: 'Calendar' as Tab },
];

const SIGNATURE_TOOLS = [
  { id: 'expenses',  icon: TrendingDown,  label: 'Expenses',  tab: 'Tools' as Tab, sub: 'expenses' },
  { id: 'tax',       icon: Percent,       label: 'Tax & TDS', tab: 'Tools' as Tab, sub: 'tax' },
  { id: 'team',      icon: Users,         label: 'My Team',   tab: 'Tools' as Tab, sub: 'team' },
  { id: 'referral',  icon: Share2,        label: 'Referrals', tab: 'Tools' as Tab, sub: 'referral' },
  { id: 'whatsapp',  icon: MessageCircle, label: 'Broadcast', tab: 'Tools' as Tab, sub: 'whatsapp' },
  { id: 'analytics', icon: BarChart2,     label: 'Analytics', tab: 'Tools' as Tab, sub: 'analytics' },
];

// ── Brand Tokens (match React Native theme) ──────────────────────────────

const C = {
  cream: '#FAF6F0',
  ivory: '#FFFFFF',
  card: '#FFFFFF',
  dark: '#2C2420',
  gold: '#C9A84C',
  goldSoft: '#FFF8EC',
  goldBorder: '#E8D9B5',
  muted: '#8C7B6E',
  light: '#B8ADA4',
  border: '#EDE8E0',
  green: '#4CAF50',
  red: '#E57373',
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
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard');
  const [activeSubTool, setActiveSubTool] = useState<string | null>(null);

  // Data
  const [bookings, setBookings] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [paymentSchedules, setPaymentSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        const [bRes, iRes, cRes, blockRes, schedRes] = await Promise.all([
          fetch(`${API}/api/bookings/vendor/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/invoices/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/vendor-clients/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/availability/${vId}`).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/api/payment-schedules/${vId}`).then(r => r.json()).catch(() => ({})),
        ]);
        if (bRes.success) setBookings(bRes.data || []);
        if (iRes.success) setInvoices(iRes.data || []);
        if (cRes.success) setClients(cRes.data || []);
        if (blockRes.success) setBlockedDates(blockRes.data || []);
        if (schedRes.success) setPaymentSchedules(schedRes.data || []);
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
      {/* ── HEADER ── */}
      <Header session={session} tier={tier} />

      {/* ── BODY ── */}
      <div style={{ padding: '8px 16px 24px' }}>
        {activeTab === 'Dashboard' && (
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
        {activeTab === 'Tools' && (
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
        {activeTab === 'Profile' && <ProfileTab session={session} tier={tier} />}
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
          padding: '4px 10px',
          borderRadius: '50px',
          background: tier === 'prestige' ? C.dark : C.goldSoft,
          border: tier === 'prestige' ? 'none' : `1px solid ${C.goldBorder}`,
        }}>
          <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '1.5px', color: tier === 'prestige' ? C.gold : tierColor }}>
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

function DashboardTab({ session, tier, bookings, invoices, clients, leads, paymentSchedules, loading, onJumpToTab }: any) {
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

  if (loading) {
    return <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted }}>Loading your business…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '8px' }}>

      {/* ── TODAY CARD ── */}
      <div style={{
        background: C.dark,
        borderRadius: '16px',
        padding: '20px',
        color: C.cream,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '14px', fontFamily: 'Playfair Display, serif', color: '#F5F0E8' }}>{today}</span>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: C.green }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {[
            { num: todayBookings.length, label: 'Today' },
            { num: upcomingBookings, label: 'Upcoming' },
            { num: pendingPayments, label: 'Unpaid', highlight: pendingPayments > 0 },
            { num: clients.length, label: 'Clients' },
          ].map((stat, i, arr) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
              <div style={{ fontSize: '24px', fontFamily: 'Playfair Display, serif', color: stat.highlight ? C.red : C.gold }}>
                {stat.num}
              </div>
              <div style={{ fontSize: '10px', letterSpacing: '1px', color: '#F5F0E8', marginTop: '2px', textTransform: 'uppercase' }}>
                {stat.label}
              </div>
              {i < arr.length - 1 && (
                <div style={{ position: 'absolute', right: 0, top: '20%', height: '60%', width: 1, background: 'rgba(245,240,232,0.15)' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── PENDING BOOKINGS ALERT ── */}
      {leads.length > 0 && (
        <button
          onClick={() => onJumpToTab('Inquiries')}
          style={{
            background: C.goldSoft,
            border: `1px solid ${C.goldBorder}`,
            borderRadius: '14px',
            padding: '16px',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontFamily: 'inherit',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={14} color={C.gold} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: C.dark }}>
              {leads.length} {leads.length === 1 ? 'enquiry' : 'enquiries'} waiting
            </span>
          </div>
          <span style={{ fontSize: '12px', color: C.muted }}>Respond within 48 hours or token is auto-refunded</span>
          <span style={{ fontSize: '11px', color: C.gold, fontWeight: 600, marginTop: '2px' }}>Review now →</span>
        </button>
      )}

      {/* ── REVENUE SNAPSHOT (Signature/Prestige) ── */}
      {tier !== 'essential' && (
        <div style={{ background: C.card, borderRadius: '14px', padding: '18px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: C.muted, fontWeight: 600 }}>REVENUE THIS MONTH</div>
          <div style={{ fontSize: '28px', fontFamily: 'Playfair Display, serif', color: C.dark, marginTop: '4px' }}>
            ₹{fmtINR(totalRevenue)}
          </div>
          <div style={{ fontSize: '11px', color: C.muted, marginTop: '4px' }}>
            From {invoices.filter((i: any) => i.status === 'paid').length} paid invoice{invoices.filter((i: any) => i.status === 'paid').length === 1 ? '' : 's'}
          </div>
        </div>
      )}

      {/* ── ATTENTION NEEDED (overdue payments) ── */}
      {overdueSchedules.length > 0 && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: C.red, fontWeight: 600 }}>ATTENTION NEEDED</div>
          {overdueSchedules.slice(0, 3).map((sched: any) => (
            <div key={sched.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={14} color={C.red} />
              <span style={{ fontSize: '13px', color: C.dark, flex: 1 }}>{sched.client_name} — overdue</span>
              <a
                href={`https://wa.me/91${(sched.client_phone || '').replace(/\D/g, '')}?text=${encodeURIComponent('Hi ' + (sched.client_name || '') + '! Gentle reminder about your pending payment.')}`}
                target="_blank"
                rel="noreferrer"
                style={{ background: '#25D366', borderRadius: '6px', padding: '6px 10px', textDecoration: 'none' }}
              >
                <MessageCircle size={11} color="#FFFFFF" />
              </a>
            </div>
          ))}
        </div>
      )}

      {/* ── QUICK ACTIONS BAR ── */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }}>
        {[
          { icon: Plus, label: 'Invoice', onClick: () => { onJumpToTab('Tools'); } },
          { icon: Calendar, label: 'Block Date', onClick: () => { onJumpToTab('Calendar'); } },
          { icon: Users, label: 'Add Client', onClick: () => { onJumpToTab('Tools'); } },
          { icon: MessageCircle, label: 'WhatsApp', onClick: () => {
              if (clients.length > 0) window.open(`https://wa.me/91${(clients[0].phone || '').replace(/\D/g, '')}`, '_blank');
              else alert('Add clients first.');
          } },
        ].map((a, i) => {
          const I = a.icon;
          return (
            <button
              key={i}
              onClick={a.onClick}
              style={{
                background: C.dark, color: C.gold, border: 'none', borderRadius: '12px',
                padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: 'inherit', flexShrink: 0,
              }}
            >
              <I size={13} color={C.gold} />
              {a.label}
            </button>
          );
        })}
      </div>

      {/* ── TODAY'S EVENTS ── */}
      {todayBookings.length > 0 && (
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: C.muted, fontWeight: 600, marginBottom: '8px' }}>TODAY</div>
          <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            {todayBookings.map((b: any, idx: number) => (
              <div key={b.id} style={{ padding: '14px 16px', borderBottom: idx < todayBookings.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ fontSize: '14px', color: C.dark, fontWeight: 500 }}>{b.users?.name || b.client_name || 'Client'}</div>
                <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{b.event_type || 'Event'} · {b.venue || 'Venue TBC'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RECENT CLIENTS ── */}
      {clients.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: C.muted, fontWeight: 600 }}>RECENT CLIENTS</div>
            <button onClick={() => onJumpToTab('Tools')} style={{ background: 'none', border: 'none', fontSize: '11px', color: C.gold, fontWeight: 600, cursor: 'pointer' }}>
              View all →
            </button>
          </div>
          <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            {clients.slice(0, 4).map((c: any, idx: number) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderBottom: idx < Math.min(clients.length, 4) - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, background: C.goldSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold, fontWeight: 600, fontSize: '13px' }}>
                  {(c.name || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: C.dark, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ fontSize: '11px', color: C.muted }}>{c.event_date ? new Date(c.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date TBC'}</div>
                </div>
                {c.phone && (
                  <a href={`tel:${c.phone}`} style={{ background: C.goldSoft, border: `1px solid ${C.goldBorder}`, borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                    <Phone size={13} color={C.gold} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {bookings.length === 0 && clients.length === 0 && (
        <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '32px 20px', textAlign: 'center' }}>
          <Briefcase size={32} color={C.light} />
          <div style={{ fontSize: '15px', fontWeight: 600, color: C.dark, marginTop: '12px' }}>Your business starts here</div>
          <div style={{ fontSize: '12px', color: C.muted, marginTop: '6px', lineHeight: 1.5 }}>
            Add your first client or wait for an enquiry. Everything you do flows into this dashboard.
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
                    <button onClick={() => handleConfirm(b.id)} style={{ flex: 1, background: C.dark, color: C.gold, border: 'none', borderRadius: '8px', padding: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Confirm
                    </button>
                    <button onClick={() => handleDecline(b.id)} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 14px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
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
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => onAddClient && onAddClient()} style={{ background: C.gold, color: C.dark, border: 'none', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={13} /> Event
          </button>
          <button onClick={() => setShowBlock(!showBlock)} style={{ background: C.dark, color: C.gold, border: 'none', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Lock size={12} /> Block
          </button>
        </div>
      </div>

      {showBlock && (
        <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)} style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: C.dark, fontFamily: 'inherit' }} />
          <input type="text" placeholder="Reason (optional)" value={blockReason} onChange={e => setBlockReason(e.target.value)} style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px 14px', fontSize: '14px', color: C.dark, fontFamily: 'inherit' }} />
          <button onClick={handleBlock} style={{ background: C.gold, color: C.dark, border: 'none', borderRadius: '8px', padding: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
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

      {/* Tier upsell */}
      {tier === 'essential' && (
        <div style={{ background: C.dark, borderRadius: '14px', padding: '20px', color: C.cream }}>
          <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: C.gold, fontWeight: 600, marginBottom: '8px' }}>UPGRADE TO SIGNATURE</div>
          <div style={{ fontSize: '14px', color: '#F5F0E8', lineHeight: 1.5, marginBottom: '12px' }}>
            Unlock Expenses, Tax & TDS, Team management, Referrals, WhatsApp Broadcast, and Analytics.
          </div>
          <a href="/vendor/dashboard" style={{ display: 'inline-block', background: C.gold, color: C.dark, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
            View plans
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
      <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '32px 20px', textAlign: 'center' }}>
        <Lock size={28} color={C.light} />
        <div style={{ fontSize: '15px', fontWeight: 600, color: C.dark, marginTop: '12px' }}>{titles[sub]} works best on desktop</div>
        <div style={{ fontSize: '12px', color: C.muted, marginTop: '6px', lineHeight: 1.5 }}>
          The full {titles[sub].toLowerCase()} experience is on the business portal. Open vendor.thedreamwedding.in on a laptop or tablet for the complete view.
        </div>
        <a href="/vendor/dashboard" style={{ display: 'inline-block', background: C.dark, color: C.gold, textDecoration: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, marginTop: '14px' }}>
          Open business portal
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

function ProfileTab({ session, tier }: { session: VendorSession; tier: Tier }) {
  const handleLogout = () => {
    if (!confirm('Sign out?')) return;
    localStorage.removeItem('vendor_web_session');
    window.location.href = '/vendor/mobile/login';
  };

  const tierLabel = tier === 'prestige' ? 'Prestige' : tier === 'signature' ? 'Signature' : 'Essential';
  const tierPrice = tier === 'prestige' ? '₹3,999/mo' : tier === 'signature' ? '₹1,999/mo' : '₹499/mo';

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

      {/* Menu */}
      <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        {[
          { icon: SettingsIcon, label: 'Settings (full edit)', href: '/vendor/dashboard' },
          { icon: Briefcase, label: 'Open business portal', href: '/vendor/dashboard' },
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
    { id: 'Dashboard', label: 'Dashboard', icon: Grid },
    { id: 'Inquiries', label: 'Inquiries', icon: Mail },
    { id: 'Calendar',  label: 'Calendar',  icon: Calendar },
    { id: 'Tools',     label: 'Tools',     icon: Tool },
    { id: 'Profile',   label: 'Profile',   icon: User },
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
                  background: p.eventType === type ? C.dark : C.cream,
                  color: p.eventType === type ? C.gold : C.muted,
                  border: `1px solid ${p.eventType === type ? C.dark : C.border}`,
                  borderRadius: '50px',
                  padding: '7px 14px',
                  fontSize: '12px', fontWeight: p.eventType === type ? 600 : 500,
                  cursor: 'pointer', fontFamily: 'inherit',
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
              background: (p.submitting || !p.name.trim()) ? C.border : C.dark,
              color: (p.submitting || !p.name.trim()) ? C.light : C.gold,
              border: 'none', borderRadius: '10px',
              padding: '13px', fontSize: '13px', fontWeight: 600,
              cursor: (p.submitting || !p.name.trim()) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >{p.submitting ? 'Saving…' : 'Save Client'}</button>
        </div>
      </div>
    </div>
  );
}
