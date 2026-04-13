'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Grid, MessageCircle, Settings, Star, Calendar, FileText,
  Users, CreditCard, TrendingUp, Send, Gift, BarChart2,
  Clock, CheckSquare, Cpu, Map, LogOut, Plus, Trash2,
  ChevronDown, ChevronUp, X, Check, AlertCircle, Download,
  Edit2, Phone, Lock, Activity, Zap, Image, Percent,
  MinusCircle, Share2, List
} from 'react-feather';

const API = 'https://dream-wedding-production-89ae.up.railway.app/api';

// ── Sidebar tabs ────────────────────────────────────────────────
const ACTIVE_TABS = [
  { id: 'overview', label: 'Overview', icon: Grid },
  { id: 'inquiries', label: 'Inquiries', icon: MessageCircle },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'contracts', label: 'Contracts', icon: FileText },
  { id: 'payments', label: 'Payment Schedules', icon: CreditCard },
  { id: 'expenses', label: 'Expense Tracker', icon: MinusCircle },
  { id: 'tax', label: 'Tax & Finance', icon: Percent },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'team', label: 'My Team', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const COMING_SOON_TABS = [
  { id: 'analytics', label: 'Analytics', icon: BarChart2, build: 'Build 2', desc: 'Deep performance insights, conversion rates, seasonal demand curves and revenue forecasting.' },
  { id: 'whatsapp', label: 'WhatsApp Broadcast', icon: Send, build: 'Build 2', desc: 'One tap sends a promotional message to all your past clients simultaneously. The most requested vendor feature in India.' },
  { id: 'spotlight', label: 'Spotlight Auction', icon: TrendingUp, build: 'Build 2', desc: 'Bid for Spotlight positions 4-10 at Rs.999/month. Top 3 always earned by algorithm — never sold.' },
  { id: 'portal', label: 'Client Portal', icon: Share2, build: 'Build 2', desc: 'A private link for your couples — they see their event timeline, deliverables and payment schedule without downloading anything.' },
  { id: 'tasks', label: 'Team Tasks', icon: CheckSquare, build: 'Build 2', desc: 'Assign tasks to team members per booking. Set deadlines, track completion, get photo confirmation.' },
  { id: 'ai', label: 'AI Brief Generator', icon: Cpu, build: 'Build 3', desc: 'Auto-generates a complete creative brief from the couple profile at the moment of booking. Zero briefing calls needed.' },
  { id: 'pricing', label: 'Pricing Intelligence', icon: TrendingUp, build: 'Build 3', desc: 'Dynamic pricing recommendations based on demand patterns, competitor rates and your booking velocity.' },
  { id: 'location', label: 'Team Location', icon: Map, build: 'Build 3', desc: 'Real-time opt-in location sharing for your team during active events. For event managers coordinating large teams.' },
];

// ── Coming Soon Modal ────────────────────────────────────────────
function ComingSoonModal({ tab, onClose }: { tab: any; onClose: () => void }) {
  if (!tab) return null;
  const Icon = tab.icon;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--white)',
        borderRadius: '20px',
        padding: '48px',
        maxWidth: '480px',
        width: '100%',
        border: '1px solid var(--border)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          width: '52px', height: '52px',
          borderRadius: '13px',
          backgroundColor: 'var(--light-gold)',
          border: '1px solid var(--gold-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '24px',
        }}>
          <Icon size={22} color="var(--gold)" />
        </div>
        <div style={{
          display: 'inline-block',
          background: tab.build === 'Build 2' ? 'rgba(201,168,76,0.12)' : 'rgba(140,123,110,0.12)',
          border: `1px solid ${tab.build === 'Build 2' ? 'rgba(201,168,76,0.3)' : 'rgba(140,123,110,0.3)'}`,
          borderRadius: '50px',
          padding: '4px 14px',
          marginBottom: '16px',
        }}>
          <span style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '10px',
            fontWeight: 500,
            color: tab.build === 'Build 2' ? 'var(--gold)' : 'var(--grey)',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}>
            {tab.build}
          </span>
        </div>
        <h3 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: '24px',
          fontWeight: 300,
          color: 'var(--dark)',
          marginBottom: '14px',
        }}>
          {tab.label}
        </h3>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '14px',
          fontWeight: 300,
          color: 'var(--grey)',
          lineHeight: 1.8,
          marginBottom: '32px',
        }}>
          {tab.desc}
        </p>
        <button onClick={onClose} style={{
          background: 'var(--dark)',
          color: 'var(--cream)',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px',
          fontWeight: 500,
          letterSpacing: '1px',
          padding: '14px 28px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          textTransform: 'uppercase',
        }}>
          Got it
        </button>
      </div>
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────
function StatCard({ num, label }: { num: string; label: string }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
      <div style={{
        fontFamily: 'Playfair Display, serif',
        fontSize: '32px',
        fontWeight: 300,
        color: 'var(--dark)',
        marginBottom: '6px',
      }}>
        {num}
      </div>
      <div className="section-label">{label}</div>
    </div>
  );
}

// ── Section Header ───────────────────────────────────────────────
function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <span className="section-label">{title}</span>
      {action}
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────
export default function VendorDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [comingSoonTab, setComingSoonTab] = useState<any>(null);
  const [vendorData, setVendorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);

  // Data states
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [paymentSchedules, setPaymentSchedules] = useState<any[]>([]);
  const [tdsLedger, setTdsLedger] = useState<any[]>([]);
  const [tdsSummary, setTdsSummary] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);

  // Form states
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showDateInput, setShowDateInput] = useState(false);
  const [showTDSForm, setShowTDSForm] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Invoice form
  const [invClient, setInvClient] = useState('');
  const [invPhone, setInvPhone] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invDesc, setInvDesc] = useState('');
  const [invTDS, setInvTDS] = useState(false);
  const [invTDSByClient, setInvTDSByClient] = useState(false);

  // Contract form
  const [conClient, setConClient] = useState('');
  const [conPhone, setConPhone] = useState('');
  const [conEventType, setConEventType] = useState('Wedding');
  const [conDate, setConDate] = useState('');
  const [conVenue, setConVenue] = useState('');
  const [conServices, setConServices] = useState('');
  const [conDeliverables, setConDeliverables] = useState('');
  const [conTotal, setConTotal] = useState('');
  const [conAdvance, setConAdvance] = useState('');
  const [conCancellation, setConCancellation] = useState('Token amount is non-refundable. Balance refundable if cancelled 30+ days before event.');

  // Client form
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientDate, setClientDate] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // Team form
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberRole, setMemberRole] = useState('');

  // Expense form
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Travel');
  const [expClient, setExpClient] = useState('');

  // Payment form
  const [payClient, setPayClient] = useState('');
  const [payPhone, setPayPhone] = useState('');
  const [payTotal, setPayTotal] = useState('');
  const [payInstalments, setPayInstalments] = useState([
    { label: 'Token', amount: '', due_date: '', paid: false },
    { label: 'Advance', amount: '', due_date: '', paid: false },
    { label: 'Final', amount: '', due_date: '', paid: false },
  ]);

  // TDS form
  const [tdsAmount, setTdsAmount] = useState('');
  const [tdsClient, setTdsClient] = useState('');
  const [tdsBy, setTdsBy] = useState<'client' | 'self'>('client');
  const [tdsChallan, setTdsChallan] = useState('');

  // Profile edit
  const [editName, setEditName] = useState('');
  const [editAbout, setEditAbout] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editVibes, setEditVibes] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);

  // Calendar
  const [newDate, setNewDate] = useState('');

  const session = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('vendor_web_session') || '{}')
    : {};

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (vendorData?.id) {
      if (activeTab === 'invoices') loadInvoices();
      if (activeTab === 'contracts') loadContracts();
      if (activeTab === 'calendar') loadBlockedDates();
      if (activeTab === 'clients') loadClients();
      if (activeTab === 'team') loadTeam();
      if (activeTab === 'expenses') loadExpenses();
      if (activeTab === 'payments') loadPayments();
      if (activeTab === 'tax') loadTDS();
    }
  }, [activeTab, vendorData]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const session = JSON.parse(localStorage.getItem('vendor_session') || '{}');
      const vendorId = session.vendorId || '4f78ee18-5728-4b80-a4db-f362ed117e4f';
      const res = await fetch(`${API}/vendors/${vendorId}`);
      const data = await res.json();
      if (data.success && data.data) {
        const vendor = data.data;
        setVendorData(vendor);
        setEditName(vendor.name || '');
        setEditAbout(vendor.about || '');
        setEditPrice(String(vendor.starting_price || ''));
        setEditInstagram(vendor.instagram_url || '');
        setEditCity(vendor.city || '');
        setEditVibes(vendor.vibe_tags || []);
        loadBookings(vendor.id);
        loadInvoices(vendor.id);
      }
    } catch (e) {} finally { setLoading(false); }
  };

  const loadBookings = async (id?: string) => {
    const vid = id || vendorData?.id;
    if (!vid) return;
    try {
      const res = await fetch(`${API}/bookings/vendor/${vid}`);
      const data = await res.json();
      if (data.success) setBookings(data.data || []);
    } catch (e) {}
  };

  const loadInvoices = async (id?: string) => {
    const vid = id || vendorData?.id;
    if (!vid) return;
    try {
      const res = await fetch(`${API}/invoices/${vid}`);
      const data = await res.json();
      if (data.success) setInvoices(data.data || []);
    } catch (e) {}
  };

  const loadContracts = async () => {
    try {
      const res = await fetch(`${API}/contracts/${vendorData.id}`);
      const data = await res.json();
      if (data.success) setContracts(data.data || []);
    } catch (e) {}
  };

  const loadBlockedDates = async () => {
    try {
      const res = await fetch(`${API}/availability/${vendorData.id}`);
      const data = await res.json();
      if (data.success) setBlockedDates(data.data || []);
    } catch (e) {}
  };

  const loadClients = async () => {
    try {
      const res = await fetch(`${API}/vendor-clients/${vendorData.id}`);
      const data = await res.json();
      if (data.success) setClients(data.data || []);
    } catch (e) {}
  };

  const loadTeam = async () => {
    try {
      const res = await fetch(`${API}/team/${vendorData.id}`);
      const data = await res.json();
      if (data.success) setTeamMembers(data.data || []);
    } catch (e) {}
  };

  const loadExpenses = async () => {
    try {
      const res = await fetch(`${API}/expenses/${vendorData.id}`);
      const data = await res.json();
      if (data.success) setExpenses(data.data || []);
    } catch (e) {}
  };

  const loadPayments = async () => {
    try {
      const res = await fetch(`${API}/payment-schedules/${vendorData.id}`);
      const data = await res.json();
      if (data.success) setPaymentSchedules(data.data || []);
    } catch (e) {}
  };

  const loadTDS = async () => {
    try {
      const [l, s] = await Promise.all([
        fetch(`${API}/tds/${vendorData.id}`).then(r => r.json()),
        fetch(`${API}/tds/${vendorData.id}/summary`).then(r => r.json()),
      ]);
      if (l.success) setTdsLedger(l.data || []);
      if (s.success) setTdsSummary(s.data);
    } catch (e) {}
  };

  const handleSaveInvoice = async () => {
    if (!invClient || !invAmount) return alert('Please fill client name and amount');
    try {
      await fetch(`${API}/invoices/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorData.id,
          client_name: invClient,
          client_phone: invPhone,
          amount: parseInt(invAmount),
          description: invDesc || 'Wedding Services',
          invoice_number: `INV-${Date.now()}`,
          tds_applicable: invTDS,
          tds_deducted_by_client: invTDSByClient,
        }),
      });
      setInvClient(''); setInvPhone(''); setInvAmount(''); setInvDesc('');
      setInvTDS(false); setInvTDSByClient(false);
      setShowInvoiceForm(false);
      loadInvoices();
      alert('Invoice saved successfully');
    } catch (e) { alert('Could not save invoice'); }
  };

  const handleMarkInvoicePaid = async (id: string) => {
    try {
      await fetch(`${API}/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      });
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'paid' } : i));
    } catch (e) {}
  };

  const handleSaveContract = async () => {
    if (!conClient || !conTotal || !conDate) return alert('Please fill client name, event date and total amount');
    try {
      const balance = parseInt(conTotal) - parseInt(conAdvance || '0');
      await fetch(`${API}/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorData.id,
          client_name: conClient,
          client_phone: conPhone,
          event_type: conEventType,
          event_date: conDate,
          venue: conVenue,
          service_description: conServices,
          total_amount: parseInt(conTotal),
          advance_amount: parseInt(conAdvance || '0'),
          balance_amount: balance,
          deliverables: conDeliverables,
          cancellation_policy: conCancellation,
          status: 'issued',
        }),
      });
      setConClient(''); setConDate(''); setConTotal(''); setConAdvance('');
      setShowContractForm(false);
      loadContracts();
      alert('Contract saved. Download PDF from the app for sharing via WhatsApp.');
    } catch (e) { alert('Could not save contract'); }
  };

  const handleBlockDate = async () => {
    if (!newDate.trim()) return;
    try {
      const res = await fetch(`${API}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorData.id, blocked_date: newDate }),
      });
      const data = await res.json();
      if (data.success) {
        setBlockedDates(prev => [...prev, data.data]);
        setNewDate('');
        setShowDateInput(false);
      }
    } catch (e) {}
  };

  const handleUnblockDate = async (id: string) => {
    try {
      await fetch(`${API}/availability/${id}`, { method: 'DELETE' });
      setBlockedDates(prev => prev.filter(d => d.id !== id));
    } catch (e) {}
  };

  const handleAddClient = async () => {
    if (!clientName || !clientPhone) return alert('Please fill name and phone');
    try {
      const res = await fetch(`${API}/vendor-clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorData.id,
          name: clientName,
          phone: clientPhone,
          wedding_date: clientDate,
          notes: clientNotes,
          invited: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setClients(prev => [data.data, ...prev]);
        setClientName(''); setClientPhone(''); setClientDate(''); setClientNotes('');
        setShowClientForm(false);
      }
    } catch (e) { alert('Could not add client'); }
  };

  const handleSaveNote = async (clientId: string) => {
    try {
      await fetch(`${API}/vendor-clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: noteText }),
      });
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, notes: noteText } : c));
      setEditingNoteId(null);
      setNoteText('');
    } catch (e) {}
  };

  const handleAddTeamMember = async () => {
    if (!memberName || !memberRole) return alert('Please fill name and role');
    try {
      const res = await fetch(`${API}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorData.id, name: memberName, phone: memberPhone, role: memberRole }),
      });
      const data = await res.json();
      if (data.success) {
        setTeamMembers(prev => [data.data, ...prev]);
        setMemberName(''); setMemberPhone(''); setMemberRole('');
        setShowTeamForm(false);
      }
    } catch (e) { alert('Could not add team member'); }
  };

  const handleRemoveTeamMember = async (id: string) => {
    try {
      await fetch(`${API}/team/${id}`, { method: 'DELETE' });
      setTeamMembers(prev => prev.filter(m => m.id !== id));
    } catch (e) {}
  };

  const handleAddExpense = async () => {
    if (!expDesc || !expAmount) return alert('Please fill description and amount');
    try {
      const res = await fetch(`${API}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorData.id,
          description: expDesc,
          amount: parseInt(expAmount),
          category: expCategory,
          client_name: expClient,
          expense_date: new Date().toLocaleDateString('en-IN'),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExpenses(prev => [data.data, ...prev]);
        setExpDesc(''); setExpAmount(''); setExpClient('');
        setShowExpenseForm(false);
      }
    } catch (e) { alert('Could not save expense'); }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await fetch(`${API}/expenses/${id}`, { method: 'DELETE' });
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (e) {}
  };

  const handleSavePaymentSchedule = async () => {
    if (!payClient || !payTotal) return alert('Please fill client name and total amount');
    try {
      const res = await fetch(`${API}/payment-schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorData.id,
          client_name: payClient,
          client_phone: payPhone,
          total_amount: parseInt(payTotal),
          instalments: payInstalments,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentSchedules(prev => [data.data, ...prev]);
        setPayClient(''); setPayPhone(''); setPayTotal('');
        setPayInstalments([
          { label: 'Token', amount: '', due_date: '', paid: false },
          { label: 'Advance', amount: '', due_date: '', paid: false },
          { label: 'Final', amount: '', due_date: '', paid: false },
        ]);
        setShowPaymentForm(false);
      }
    } catch (e) { alert('Could not save schedule'); }
  };

  const handleMarkInstalmentPaid = async (scheduleId: string, idx: number) => {
    const schedule = paymentSchedules.find(s => s.id === scheduleId);
    if (!schedule) return;
    const updated = [...schedule.instalments];
    updated[idx] = { ...updated[idx], paid: true };
    try {
      await fetch(`${API}/payment-schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instalments: updated }),
      });
      setPaymentSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, instalments: updated } : s));
    } catch (e) {}
  };

  const handleAddTDS = async () => {
    if (!tdsAmount || !tdsClient) return alert('Please fill client and amount');
    try {
      await fetch(`${API}/tds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorData.id,
          transaction_type: 'client_invoice',
          gross_amount: parseInt(tdsAmount),
          tds_deducted_by: tdsBy,
          challan_number: tdsChallan,
          notes: `Client: ${tdsClient}`,
        }),
      });
      setTdsAmount(''); setTdsClient(''); setTdsChallan('');
      setShowTDSForm(false);
      loadTDS();
      alert('TDS entry added');
    } catch (e) { alert('Could not save TDS entry'); }
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      await fetch(`${API}/vendors/${vendorData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          about: editAbout,
          starting_price: parseInt(editPrice) || 0,
          instagram_url: editInstagram,
          city: editCity,
          vibe_tags: editVibes,
        }),
      });
      setVendorData((prev: any) => ({ ...prev, name: editName, city: editCity }));
      setShowEditProfile(false);
      alert('Profile updated successfully');
    } catch (e) { alert('Could not save profile'); }
    finally { setSavingProfile(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('vendor_web_session');
    router.push('/vendor/login');
  };

  const pendingBookings = bookings.filter(b => b.status === 'pending_confirmation');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const totalRevenue = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const VIBES = ['Candid', 'Traditional', 'Luxury', 'Cinematic', 'Boho', 'Festive', 'Minimalist', 'Royal'];
  const EXPENSE_CATS = ['Travel', 'Equipment', 'Editing', 'Assistant', 'Food', 'Other'];

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--cream)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '20px',
            fontWeight: 300,
            color: 'var(--dark)',
            marginBottom: '8px',
            letterSpacing: '2px',
          }}>
            THE DREAM WEDDING
          </div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--grey)', fontWeight: 300 }}>
            Loading your dashboard...
          </div>
        </div>
      </div>
    );
  }

  // ── Input style helper
  const inp: React.CSSProperties = {
    background: 'var(--cream)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '11px 14px',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '14px',
    color: 'var(--dark)',
    width: '100%',
    outline: 'none',
  };

  const label: React.CSSProperties = {
    display: 'block',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '10px',
    fontWeight: 500,
    color: 'var(--grey)',
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
    marginBottom: '6px',
  };

  const formRow: React.CSSProperties = { marginBottom: '14px' };

  const goldBtn: React.CSSProperties = {
    background: 'var(--gold)',
    color: 'var(--dark)',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '1px',
    padding: '12px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    textTransform: 'uppercase',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  };

  const darkBtn: React.CSSProperties = {
    background: 'var(--dark)',
    color: 'var(--cream)',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '1px',
    padding: '12px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    textTransform: 'uppercase',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  };

  const outlineBtn: React.CSSProperties = {
    background: 'transparent',
    color: 'var(--gold)',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '11px',
    fontWeight: 400,
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid var(--gold)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  };

  const greyBtn: React.CSSProperties = {
    background: 'transparent',
    color: 'var(--grey)',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '11px',
    fontWeight: 300,
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--cream)' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: '260px',
        minHeight: '100vh',
        backgroundColor: 'var(--dark)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        overflowY: 'auto',
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{
          padding: '28px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '15px',
            fontWeight: 300,
            color: 'var(--cream)',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}>
            The Dream Wedding
          </div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            fontWeight: 300,
            color: 'var(--grey)',
            letterSpacing: '0.3px',
          }}>
            {vendorData?.name || 'Vendor Dashboard'}
          </div>
        </div>

        {/* Live toggle */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setIsLive(!isLive)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: isLive ? 'rgba(76,175,80,0.12)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${isLive ? 'rgba(76,175,80,0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '50px',
              padding: '8px 16px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <div style={{
              width: '7px', height: '7px',
              borderRadius: '50%',
              backgroundColor: isLive ? '#4CAF50' : 'var(--grey)',
            }} />
            <span style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 500,
              color: isLive ? '#4CAF50' : 'var(--grey)',
            }}>
              {isLive ? 'Live on Platform' : 'Paused'}
            </span>
          </button>
        </div>

        {/* Active tabs */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          <div style={{
            padding: '8px 24px 6px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '9px',
            fontWeight: 500,
            color: 'rgba(140,123,110,0.6)',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}>
            Active Tools
          </div>
          {ACTIVE_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '11px 24px',
                  background: isActive ? 'rgba(201,168,76,0.1)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
                  border: 'none',
                  borderRadius: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Icon size={14} color={isActive ? 'var(--gold)' : 'var(--grey)'} />
                <span style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  fontWeight: isActive ? 500 : 300,
                  color: isActive ? 'var(--gold)' : 'var(--grey)',
                  letterSpacing: '0.2px',
                }}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* Coming soon tabs */}
          <div style={{
            padding: '16px 24px 6px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '9px',
            fontWeight: 500,
            color: 'rgba(140,123,110,0.4)',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginTop: '8px',
          }}>
            Coming Soon
          </div>
          {COMING_SOON_TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setComingSoonTab(tab)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 24px',
                  background: 'transparent',
                  border: 'none',
                  borderLeft: '2px solid transparent',
                  borderRadius: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  opacity: 0.4,
                }}
              >
                <Icon size={13} color="var(--grey)" />
                <span style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  fontWeight: 300,
                  color: 'var(--grey)',
                  flex: 1,
                }}>
                  {tab.label}
                </span>
                <span style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '9px',
                  color: tab.build === 'Build 2' ? 'var(--gold)' : 'var(--grey)',
                  border: `1px solid ${tab.build === 'Build 2' ? 'rgba(201,168,76,0.4)' : 'rgba(140,123,110,0.3)'}`,
                  borderRadius: '50px',
                  padding: '2px 8px',
                }}>
                  {tab.build}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={handleLogout} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 0',
          }}>
            <LogOut size={14} color="var(--grey)" />
            <span style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              fontWeight: 300,
              color: 'var(--grey)',
            }}>
              Log Out
            </span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main style={{
        marginLeft: '260px',
        flex: 1,
        minHeight: '100vh',
        padding: '40px',
        maxWidth: 'calc(100vw - 260px)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '36px',
          paddingBottom: '24px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <h1 style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '28px',
              fontWeight: 300,
              color: 'var(--dark)',
              marginBottom: '4px',
              letterSpacing: '0.3px',
            }}>
              {vendorData?.name || 'Your Business'}
            </h1>
            <p style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              fontWeight: 300,
              color: 'var(--grey)',
            }}>
              {vendorData?.category?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              {vendorData?.city ? ` · ${vendorData.city}` : ''}
            </p>
          </div>
          {pendingBookings.length > 0 && (
            <div style={{
              background: 'var(--light-gold)',
              border: '1px solid var(--gold-border)',
              borderRadius: '10px',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }} onClick={() => setActiveTab('inquiries')}>
              <AlertCircle size={14} color="var(--gold)" />
              <span style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--dark)',
              }}>
                {pendingBookings.length} booking{pendingBookings.length > 1 ? 's' : ''} waiting · Review now →
              </span>
            </div>
          )}
        </div>

        {/* ════ OVERVIEW ════ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
              <StatCard num="2,847" label="Spotlight Score" />
              <StatCard num={`Rs.${(totalRevenue / 100000).toFixed(1)}L`} label="Total Revenue" />
              <StatCard num={String(confirmedBookings.length)} label="Confirmed Bookings" />
              <StatCard num={String(clients.length)} label="Clients" />
            </div>

            {/* Spotlight */}
            <div className="card-dark" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star size={14} color="var(--gold)" />
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--cream)' }}>
                    Spotlight Score
                  </span>
                </div>
                <span className="badge-gold">#3 This Month</span>
              </div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '56px', fontWeight: 300, color: 'var(--gold)', marginBottom: '20px', lineHeight: 1 }}>
                2,847
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', overflow: 'hidden' }}>
                {[
                  { num: '140', label: 'Saves × 3' },
                  { num: '57', label: 'Enquiries × 5' },
                  { num: '12', label: 'Bookings × 10' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '16px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 300, color: 'var(--cream)', marginBottom: '4px' }}>{s.num}</div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 300, color: 'var(--grey)', letterSpacing: '0.5px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 300, color: 'rgba(140,123,110,0.5)', marginTop: '14px', fontStyle: 'italic' }}>
                Refreshes 1st of every month. Earned, not bought.
              </p>
            </div>

            {/* Quick actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              {[
                { label: 'Create Invoice', icon: FileText, tab: 'invoices' },
                { label: 'Generate Contract', icon: FileText, tab: 'contracts' },
                { label: 'Add Client', icon: Users, tab: 'clients' },
                { label: 'Block Date', icon: Calendar, tab: 'calendar' },
                { label: 'Add Expense', icon: MinusCircle, tab: 'expenses' },
                { label: 'Edit Profile', icon: Edit2, tab: 'settings' },
              ].map(a => {
                const Icon = a.icon;
                return (
                  <button key={a.label} onClick={() => setActiveTab(a.tab)} style={{
                    ...greyBtn,
                    justifyContent: 'center',
                    padding: '16px',
                    width: '100%',
                    borderRadius: '10px',
                  }}>
                    <Icon size={14} />
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>{a.label}</span>
                  </button>
                );
              })}
            </div>

          </div>
        )}

        {/* ════ INVOICES ════ */}
        {activeTab === 'invoices' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 300, color: 'var(--dark)' }}>Invoices</h2>
              <button style={goldBtn} onClick={() => setShowInvoiceForm(!showInvoiceForm)}>
                <Plus size={14} />
                {showInvoiceForm ? 'Cancel' : 'New Invoice'}
              </button>
            </div>

            {showInvoiceForm && (
              <div className="card" style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 300, color: 'var(--dark)', marginBottom: '20px' }}>New Invoice</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={formRow}>
                    <label style={label}>Client Name</label>
                    <input style={inp} placeholder="e.g. Priya & Rahul" value={invClient} onChange={e => setInvClient(e.target.value)} />
                  </div>
                  <div style={formRow}>
                    <label style={label}>Client Phone</label>
                    <input style={inp} placeholder="10-digit number" value={invPhone} onChange={e => setInvPhone(e.target.value)} />
                  </div>
                  <div style={formRow}>
                    <label style={label}>Description</label>
                    <input style={inp} placeholder="e.g. Wedding Photography" value={invDesc} onChange={e => setInvDesc(e.target.value)} />
                  </div>
                  <div style={formRow}>
                    <label style={label}>Amount (Rs.)</label>
                    <input style={inp} type="number" placeholder="e.g. 150000" value={invAmount} onChange={e => setInvAmount(e.target.value)} />
                  </div>
                </div>
                {invAmount && (
                  <div style={{ background: 'var(--cream)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px', display: 'flex', gap: '24px' }}>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--grey)', fontWeight: 300 }}>
                      GST (18%): <strong style={{ color: 'var(--dark)' }}>Rs.{(parseInt(invAmount) * 0.18).toLocaleString('en-IN')}</strong>
                    </span>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--grey)', fontWeight: 300 }}>
                      Total: <strong style={{ color: 'var(--dark)' }}>Rs.{(parseInt(invAmount) * 1.18).toLocaleString('en-IN')}</strong>
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: invTDS ? '1px solid var(--border)' : 'none', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--dark)' }}>TDS Applicable (10%)</div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>Is TDS deductible on this invoice?</div>
                  </div>
                  <button onClick={() => setInvTDS(!invTDS)} style={{
                    width: '44px', height: '24px',
                    borderRadius: '12px',
                    background: invTDS ? 'var(--gold)' : 'var(--border)',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s',
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      left: invTDS ? '22px' : '2px',
                      width: '20px', height: '20px',
                      borderRadius: '50%',
                      background: 'white',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                </div>
                {invTDS && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--dark)' }}>Client deducted TDS</div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>Did the client already deduct TDS?</div>
                    </div>
                    <button onClick={() => setInvTDSByClient(!invTDSByClient)} style={{
                      width: '44px', height: '24px',
                      borderRadius: '12px',
                      background: invTDSByClient ? 'var(--gold)' : 'var(--border)',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.2s',
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '2px',
                        left: invTDSByClient ? '22px' : '2px',
                        width: '20px', height: '20px',
                        borderRadius: '50%',
                        background: 'white',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </button>
                  </div>
                )}
                <button style={goldBtn} onClick={handleSaveInvoice}>
                  <Check size={14} />
                  Generate & Save Invoice
                </button>
              </div>
            )}

            {/* Invoice list */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--dark)' }}>
                  {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
                </span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 300, color: 'var(--gold)' }}>
                  Total: Rs.{invoices.reduce((s, i) => s + (i.total_amount || i.amount || 0), 0).toLocaleString('en-IN')}
                </span>
              </div>
              {invoices.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <FileText size={28} color="var(--grey-light)" style={{ marginBottom: '12px' }} />
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 300, color: 'var(--grey)' }}>No invoices yet. Create your first invoice above.</p>
                </div>
              ) : (
                invoices.map((inv, i) => (
                  <div key={inv.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '18px 24px',
                    borderBottom: i < invoices.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '15px', fontWeight: 400, color: 'var(--dark)', marginBottom: '4px' }}>{inv.client_name}</div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
                        {inv.invoice_number} · {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-IN') : ''}
                        {inv.description ? ` · ${inv.description}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 500, color: 'var(--dark)' }}>
                          Rs.{(inv.total_amount || inv.amount || 0).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 300, color: 'var(--grey)' }}>
                          + GST included
                        </div>
                      </div>
                      <button
                        onClick={() => inv.status !== 'paid' && handleMarkInvoicePaid(inv.id)}
                        disabled={inv.status === 'paid'}
                        style={{
                          background: inv.status === 'paid' ? 'rgba(76,175,80,0.1)' : 'var(--light-gold)',
                          border: `1px solid ${inv.status === 'paid' ? 'rgba(76,175,80,0.3)' : 'var(--gold-border)'}`,
                          borderRadius: '8px',
                          padding: '8px 14px',
                          cursor: inv.status === 'paid' ? 'default' : 'pointer',
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: inv.status === 'paid' ? 'var(--green)' : 'var(--gold)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {inv.status === 'paid' ? '✓ Paid' : 'Mark Paid'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ════ CONTRACTS ════ */}
        {activeTab === 'contracts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 300, color: 'var(--dark)' }}>Contracts</h2>
              <button style={goldBtn} onClick={() => setShowContractForm(!showContractForm)}>
                <Plus size={14} />
                {showContractForm ? 'Cancel' : 'New Contract'}
              </button>
            </div>

            {showContractForm && (
              <div className="card" style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 300, color: 'var(--dark)', marginBottom: '20px' }}>New Service Agreement</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={formRow}><label style={label}>Client Name</label><input style={inp} placeholder="e.g. Priya & Rahul" value={conClient} onChange={e => setConClient(e.target.value)} /></div>
                  <div style={formRow}><label style={label}>Client Phone</label><input style={inp} placeholder="10-digit number" value={conPhone} onChange={e => setConPhone(e.target.value)} /></div>
                  <div style={formRow}><label style={label}>Event Type</label><input style={inp} placeholder="e.g. Wedding" value={conEventType} onChange={e => setConEventType(e.target.value)} /></div>
                  <div style={formRow}><label style={label}>Event Date</label><input style={inp} placeholder="e.g. March 15, 2026" value={conDate} onChange={e => setConDate(e.target.value)} /></div>
                  <div style={formRow}><label style={label}>Venue</label><input style={inp} placeholder="e.g. The Leela Palace, Delhi" value={conVenue} onChange={e => setConVenue(e.target.value)} /></div>
                  <div style={formRow}><label style={label}>Total Amount (Rs.)</label><input style={inp} type="number" placeholder="e.g. 200000" value={conTotal} onChange={e => setConTotal(e.target.value)} /></div>
                  <div style={formRow}><label style={label}>Advance Amount (Rs.)</label><input style={inp} type="number" placeholder="e.g. 50000" value={conAdvance} onChange={e => setConAdvance(e.target.value)} /></div>
                  {conTotal && conAdvance && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ background: 'var(--cream)', borderRadius: '8px', padding: '14px 16px', width: '100%' }}>
                        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--grey)', fontWeight: 300 }}>
                          Balance: <strong style={{ color: 'var(--dark)' }}>Rs.{(parseInt(conTotal) - parseInt(conAdvance)).toLocaleString('en-IN')}</strong>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div style={formRow}><label style={label}>Services Description</label><textarea style={{ ...inp, height: '80px', resize: 'vertical' }} placeholder="Describe your services..." value={conServices} onChange={e => setConServices(e.target.value)} /></div>
                <div style={formRow}><label style={label}>Deliverables</label><textarea style={{ ...inp, height: '80px', resize: 'vertical' }} placeholder="e.g. 500 edited photos, 2 highlight reels..." value={conDeliverables} onChange={e => setConDeliverables(e.target.value)} /></div>
                <div style={formRow}><label style={label}>Cancellation Policy</label><textarea style={{ ...inp, height: '80px', resize: 'vertical' }} value={conCancellation} onChange={e => setConCancellation(e.target.value)} /></div>
                <button style={goldBtn} onClick={handleSaveContract}>
                  <Check size={14} />
                  Save Contract
                </button>
              </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--dark)' }}>
                  {contracts.length} contract{contracts.length !== 1 ? 's' : ''}
                </span>
              </div>
              {contracts.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <FileText size={28} color="var(--grey-light)" style={{ marginBottom: '12px' }} />
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 300, color: 'var(--grey)' }}>No contracts yet. Create your first service agreement above.</p>
                </div>
              ) : (
                contracts.map((con, i) => (
                  <div key={con.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '18px 24px',
                    borderBottom: i < contracts.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '15px', fontWeight: 400, color: 'var(--dark)', marginBottom: '4px' }}>{con.client_name}</div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
                        {con.event_type} · {con.event_date}
                        {con.venue ? ` · ${con.venue}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 500, color: 'var(--dark)' }}>
                        Rs.{(con.total_amount || 0).toLocaleString('en-IN')}
                      </div>
                      <span className="badge-gold">Issued</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ════ CALENDAR ════ */}
        {activeTab === 'calendar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 300, color: 'var(--dark)' }}>Calendar</h2>
              <button style={goldBtn} onClick={() => setShowDateInput(!showDateInput)}>
                <Plus size={14} />
                Block a Date
              </button>
            </div>

            {showDateInput && (
              <div className="card" style={{ padding: '24px', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Date to Block</label>
                  <input style={inp} placeholder="e.g. March 15, 2026" value={newDate} onChange={e => setNewDate(e.target.value)} />
                </div>
                <button style={goldBtn} onClick={handleBlockDate}><Check size={14} /> Block</button>
                <button style={greyBtn} onClick={() => setShowDateInput(false)}><X size={14} /></button>
              </div>
            )}

            {confirmedBookings.length > 0 && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--light-gold)' }}>
                  <span className="section-label">Confirmed Bookings</span>
                </div>
                {confirmedBookings.map((b, i) => (
                  <div key={b.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
                    borderBottom: i < confirmedBookings.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckSquare size={14} color="var(--gold)" />
                      <div>
                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '14px', fontWeight: 400, color: 'var(--dark)' }}>
                          {b.users?.name || 'Couple'}
                        </div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
                          Token: Rs.{(b.token_amount || 10000).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                    <span className="badge-gold">Locked</span>
                  </div>
                ))}
              </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="section-label">Blocked Dates ({blockedDates.length})</span>
              </div>
              {blockedDates.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <Calendar size={28} color="var(--grey-light)" style={{ marginBottom: '12px' }} />
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 300, color: 'var(--grey)' }}>No dates blocked yet.</p>
                </div>
              ) : (
                blockedDates.map((d, i) => (
                  <div key={d.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
                    borderBottom: i < blockedDates.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Calendar size={14} color="var(--grey)" />
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 300, color: 'var(--dark)' }}>{d.blocked_date}</span>
                    </div>
                    <button onClick={() => handleUnblockDate(d.id)} style={{
                      ...greyBtn, padding: '6px 14px', fontSize: '12px',
                    }}>
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ════ PAYMENT SCHEDULES ════ */}
        {activeTab === 'payments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 300, color: 'var(--dark)' }}>Payment Schedules</h2>
              <button style={goldBtn} onClick={() => setShowPaymentForm(!showPaymentForm)}>
                <Plus size={14} />
                {showPaymentForm ? 'Cancel' : 'New Schedule'}
              </button>
            </div>

            {showPaymentForm && (
              <div className="card" style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 300, color: 'var(--dark)', marginBottom: '20px' }}>New Payment Schedule</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={formRow}><label style={label}>Client Name</label><input style={inp} placeholder="e.g. Priya & Rahul" value={payClient} onChange={e => setPayClient(e.target.value)} /></div>
                  <div style={formRow}><label style={label}>Client Phone</label><input style={inp} placeholder="10-digit number" value={payPhone} onChange={e => setPayPhone(e.target.value)} /></div>
                  <div style={{ ...formRow, gridColumn: '1 / -1' }}><label style={label}>Total Booking Amount (Rs.)</label><input style={inp} type="number" placeholder="e.g. 200000" value={payTotal} onChange={e => setPayTotal(e.target.value)} /></div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ ...label, marginBottom: '12px' }}>Payment Instalments</label>
                  {payInstalments.map((inst, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <input style={{ ...inp, background: 'var(--cream-dark)' }} value={inst.label} readOnly />
                      <input style={inp} type="number" placeholder="Amount (Rs.)" value={inst.amount} onChange={e => {
                        const u = [...payInstalments];
                        u[idx] = { ...u[idx], amount: e.target.value };
                        setPayInstalments(u);
                      }} />
                      <input style={inp} placeholder="Due date" value={inst.due_date} onChange={e => {
                        const u = [...payInstalments];
                        u[idx] = { ...u[idx], due_date: e.target.value };
                        setPayInstalments(u);
                      }} />
                    </div>
                  ))}
                </div>
                <button style={goldBtn} onClick={handleSavePaymentSchedule}><Check size={14} /> Save Schedule</button>
              </div>
            )}

            {paymentSchedules.length === 0 ? (
              <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
                <CreditCard size={28} color="var(--grey-light)" style={{ marginBottom: '12px' }} />
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 300, color: 'var(--grey)' }}>No payment schedules yet.</p>
              </div>
            ) : (
              paymentSchedules.map(schedule => (
                <div key={schedule.id} className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '17px', fontWeight: 400, color: 'var(--dark)', marginBottom: '4px' }}>{schedule.client_name}</div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
                        Total: Rs.{(schedule.total_amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(schedule.instalments || []).map((inst: any, idx: number) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: 'var(--cream)',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                      }}>
                        <div>
                          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--dark)' }}>{inst.label}</div>
                          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
                            Rs.{parseInt(inst.amount || '0').toLocaleString('en-IN')} · Due {inst.due_date || 'Not set'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {!inst.paid && schedule.client_phone && (
                            <a href={`https://wa.me/91${schedule.client_phone}?text=${encodeURIComponent(`Hi ${schedule.client_name}, this is a friendly reminder that your ${inst.label} payment of Rs.${parseInt(inst.amount || '0').toLocaleString('en-IN')} was due on ${inst.due_date}. Request you to please transfer at your earliest convenience. Thank you! — ${vendorData?.name || 'Your Vendor'}, The Dream Wedding`)}`}
                              target="_blank"
                              style={{
                                background: 'rgba(37,211,102,0.1)',
                                border: '1px solid rgba(37,211,102,0.3)',
                                borderRadius: '8px',
                                padding: '7px 14px',
                                textDecoration: 'none',
                                fontFamily: 'DM Sans, sans-serif',
                                fontSize: '11px',
                                fontWeight: 500,
                                color: '#25D366',
                              }}>
                              Remind
                            </a>
                          )}
                          <button
                            onClick={() => !inst.paid && handleMarkInstalmentPaid(schedule.id, idx)}
                            disabled={inst.paid}
                            style={{
                              background: inst.paid ? 'rgba(76,175,80,0.1)' : 'var(--light-gold)',
                              border: `1px solid ${inst.paid ? 'rgba(76,175,80,0.3)' : 'var(--gold-border)'}`,
                              borderRadius: '8px',
                              padding: '7px 14px',
                              cursor: inst.paid ? 'default' : 'pointer',
                              fontFamily: 'DM Sans, sans-serif',
                              fontSize: '11px',
                              fontWeight: 500,
                              color: inst.paid ? 'var(--green)' : 'var(--gold)',
                            }}
                          >
                            {inst.paid ? '✓ Paid' : 'Mark Paid'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ════ EXPENSES ════ */}
        {activeTab === 'expenses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 300, color: 'var(--dark)' }}>Expense Tracker</h2>
              <button style={goldBtn} onClick={() => setShowExpenseForm(!showExpenseForm)}>
                <Plus size={14} />
                {showExpenseForm ? 'Cancel' : 'Add Expense'}
              </button>
            </div>

            {expenses.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="card-dark" style={{ padding: '20px' }}>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 300, color: 'var(--grey)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Total Expenses</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: 300, color: 'var(--gold)' }}>
                    Rs.{totalExpenses.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="card-dark" style={{ padding: '20px' }}>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 300, color: 'var(--grey)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Net Profit</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: 300, color: totalRevenue - totalExpenses > 0 ? 'var(--green)' : 'var(--red)' }}>
                    Rs.{(totalRevenue - totalExpenses).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            )}

            {showExpenseForm && (
              <div className="card" style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 300, color: 'var(--dark)', marginBottom: '20px' }}>New Expense</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {EXPENSE_CATS.map(cat => (
                    <button key={cat} onClick={() => setExpCategory(cat)} style={{
                      background: expCategory === cat ? 'var(--dark)' : 'var(--cream)',
                      border: `1px solid ${expCategory === cat ? 'var(--dark)' : 'var(--border)'}`,
                      borderRadius: '8px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '12px',
                      fontWeight: expCategory === cat ? 500 : 300,
                      color: expCategory === cat ? 'var(--cream)' : 'var(--dark)',
                    }}>
                      {cat}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={formRow}><label style={label}>Description</label><input style={inp} placeholder="e.g. Equipment rental" value={expDesc} onChange={e => setExpDesc(e.target.value)} /></div>
                  <div style={formRow}><label style={label}>Amount (Rs.)</label><input style={inp} type="number" placeholder="e.g. 15000" value={expAmount} onChange={e => setExpAmount(e.target.value)} /></div>
                  <div style={{ ...formRow, gridColumn: '1 / -1' }}><label style={label}>Client (optional)</label><input style={inp} placeholder="Link to a specific client" value={expClient} onChange={e => setExpClient(e.target.value)} /></div>
                </div>
                <button style={goldBtn} onClick={handleAddExpense}><Check size={14} /> Save Expense</button>
              </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                <span className="section-label">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</span>
              </div>
              {expenses.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <MinusCircle size={28} color="var(--grey-light)" style={{ marginBottom: '12px' }} />
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 300, color: 'var(--grey)' }}>No expenses recorded yet.</p>
                </div>
              ) : (
                expenses.map((exp, i) => (
                  <div key={exp.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
                    borderBottom: i < expenses.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 500, color: 'var(--dark)', marginBottom: '3px' }}>{exp.description}</div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
                        {exp.category} · {exp.expense_date}
                        {exp.client_name ? ` · ${exp.client_name}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 500, color: 'var(--red)' }}>
                        −Rs.{(exp.amount || 0).toLocaleString('en-IN')}
                      </span>
                      <button onClick={() => handleDeleteExpense(exp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={14} color="var(--grey)" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ════ TAX & FINANCE ════ */}
        {activeTab === 'tax' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 300, color: 'var(--dark)' }}>Tax & Finance</h2>
              <button style={goldBtn} onClick={() => setShowTDSForm(!showTDSForm)}>
                <Plus size={14} />
                Add TDS Entry
              </button>
            </div>

            {tdsSummary && (
              <div className="card-dark" style={{ padding: '28px' }}>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 300, color: 'var(--grey)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '20px' }}>
                  TDS Reconciliation · {tdsSummary.financial_year}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
                  {[
                    { label: 'Gross Income', val: `Rs.${(tdsSummary.total_gross_income || 0).toLocaleString('en-IN')}` },
                    { label: 'TDS Deducted', val: `Rs.${(tdsSummary.total_tds_deducted || 0).toLocaleString('en-IN')}` },
                    { label: 'Net Received', val: `Rs.${(tdsSummary.total_net_received || 0).toLocaleString('en-IN')}` },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 300, color: 'var(--gold)', marginBottom: '6px' }}>{s.val}</div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 300, color: 'var(--grey)', letterSpacing: '0.5px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {[
                    { label: 'Platform TDS', val: tdsSummary.platform_tds || 0, color: 'var(--gold)' },
                    { label: 'Client TDS', val: tdsSummary.client_tds || 0, color: 'var(--green)' },
                    { label: 'Self Declared', val: tdsSummary.self_declared_tds || 0, color: 'var(--grey)' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.color, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--cream)' }}>Rs.{s.val.toLocaleString('en-IN')}</div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 300, color: 'var(--grey)' }}>{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showTDSForm && (
              <div className="card" style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 300, color: 'var(--dark)', marginBottom: '20px' }}>Add TDS Entry</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={formRow}><label style={label}>Client Name</label><input style={inp} placeholder="e.g. Priya & Rahul" value={tdsClient} onChange={e => setTdsClient(e.target.value)} /></div>
                  <div style={formRow}><label style={label}>Gross Amount (Rs.)</label><input style={inp} type="number" placeholder="e.g. 150000" value={tdsAmount} onChange={e => setTdsAmount(e.target.value)} /></div>
                </div>
                {tdsAmount && (
                  <div style={{ background: 'var(--cream)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px' }}>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--grey)', fontWeight: 300 }}>
                      TDS (10%): <strong style={{ color: 'var(--dark)' }}>Rs.{(parseInt(tdsAmount) * 0.10).toLocaleString('en-IN')}</strong>
                    </span>
                  </div>
                )}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ ...label, marginBottom: '10px' }}>Deducted By</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['client', 'self'] as const).map(opt => (
                      <button key={opt} onClick={() => setTdsBy(opt)} style={{
                        background: tdsBy === opt ? 'var(--dark)' : 'var(--cream)',
                        border: `1px solid ${tdsBy === opt ? 'var(--dark)' : 'var(--border)'}`,
                        borderRadius: '8px',
                        padding: '10px 20px',
                        cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '13px',
                        fontWeight: tdsBy === opt ? 500 : 300,
                        color: tdsBy === opt ? 'var(--cream)' : 'var(--dark)',
                        textTransform: 'capitalize',
                      }}>
                        {opt === 'client' ? 'Client Deducted' : 'Self Declared'}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={formRow}><label style={label}>Challan Number (optional)</label><input style={inp} placeholder="e.g. CHL123456" value={tdsChallan} onChange={e => setTdsChallan(e.target.value)} /></div>
                <button style={goldBtn} onClick={handleAddTDS}><Check size={14} /> Save Entry</button>
              </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                <span className="section-label">TDS Ledger — {tdsLedger.length} entries</span>
              </div>
              {tdsLedger.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <Percent size={28} color="var(--grey-light)" style={{ marginBottom: '12px' }} />
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 300, color: 'var(--grey)' }}>
                    No TDS entries yet. Entries are created automatically when bookings are confirmed.
                  </p>
                </div>
              ) : (
                tdsLedger.map((entry, i) => (
                  <div key={entry.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
                    borderBottom: i < tdsLedger.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--dark)', marginBottom: '3px' }}>
                        {entry.transaction_type === 'platform_booking' ? 'Platform Booking' : 'Client Invoice'}
                      </div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
                        {new Date(entry.created_at).toLocaleDateString('en-IN')}
                        {entry.notes ? ` · ${entry.notes}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 500, color: 'var(--dark)' }}>
                        Rs.{(entry.gross_amount || 0).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--gold)' }}>
                        TDS: Rs.{(entry.tds_amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ background: 'var(--light-gold)', border: '1px solid var(--gold-border)', borderRadius: '10px', padding: '16px 20px', display: 'flex', gap: '10px' }}>
              <AlertCircle size={16} color="var(--gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 300, color: 'var(--grey)', lineHeight: 1.7 }}>
                Platform TDS appears in your Form 26AS under The Dream Wedding's TAN. Share this ledger with your CA before quarterly advance tax payment and annual ITR filing.
              </p>
            </div>
          </div>
        )}

        {/* ════ CLIENTS ════ */}
        {activeTab === 'clients' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 300, color: 'var(--dark)' }}>Clients ({clients.length})</h2>
              <button style={goldBtn} onClick={() => setShowClientForm(!showClientForm)}>
                <Plus size={14} />
                {showClientForm ? 'Cancel' : 'Add Client'}
              </button>
            </div>

            <div className="card-dark" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Zap size={16} color="var(--gold)" style={{ flexShrink: 0 }} />
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 300, color: 'var(--grey-light)', lineHeight: 1.6 }}>
                Every client you add is a potential platform user. For every 10 past clients who join and send an enquiry — you earn 10% off your subscription. Up to 50% off.
              </p>
            </div>

            {showClientForm && (
              <div className="card" style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 300, color: 'var(--dark)', marginBottom: '20px' }}>Add Client</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={formRow}><label style={label}>Client Names</label><input style={inp} placeholder="e.g. Priya & Rahul" value={clientName} onChange={e => setClientName(e.target.value)} /></div>
                  <div style={formRow}><label style={label}>Phone Number</label><input style={inp} placeholder="10-digit number" value={clientPhone} onChange={e => setClientPhone(e.target.value)} /></div>
                  <div style={formRow}><label style={label}>Wedding Date</label><input style={inp} placeholder="e.g. March 15, 2026" value={clientDate} onChange={e => setClientDate(e.target.value)} /></div>
                  <div style={formRow}><label style={label}>Notes</label><input style={inp} placeholder="e.g. Lehenga colour, skin tone, preferences" value={clientNotes} onChange={e => setClientNotes(e.target.value)} /></div>
                </div>
                <button style={goldBtn} onClick={handleAddClient}><Check size={14} /> Add Client</button>
              </div>
            )}

            {clients.length === 0 ? (
              <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
                <Users size={28} color="var(--grey-light)" style={{ marginBottom: '12px' }} />
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 300, color: 'var(--grey)' }}>No clients yet. Add your first client above.</p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {clients.map((client, i) => (
                  <div key={client.id} style={{
                    padding: '20px 24px',
                    borderBottom: i < clients.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', fontWeight: 400, color: 'var(--dark)', marginBottom: '4px' }}>{client.name}</div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
                          {client.phone}
                          {client.wedding_date ? ` · ${client.wedding_date}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <a href={`https://wa.me/91${client.phone}?text=${encodeURIComponent(`Hi ${client.name.split('&')[0].trim()}! I've added you to The Dream Wedding — India's premium wedding planning app. Download here: https://thedreamwedding.in`)}`}
                          target="_blank"
                          style={{
                            background: 'rgba(37,211,102,0.1)',
                            border: '1px solid rgba(37,211,102,0.3)',
                            borderRadius: '8px',
                            padding: '8px 14px',
                            textDecoration: 'none',
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: '#25D366',
                          }}>
                          {client.invited ? 'Invited ✓' : 'Send Invite'}
                        </a>
                      </div>
                    </div>
                    {editingNoteId === client.id ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <textarea
                          style={{ ...inp, height: '70px', resize: 'none', flex: 1 }}
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          placeholder="Add notes..."
                          autoFocus
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <button style={goldBtn} onClick={() => handleSaveNote(client.id)}><Check size={12} /></button>
                          <button style={greyBtn} onClick={() => { setEditingNoteId(null); setNoteText(''); }}><X size={12} /></button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingNoteId(client.id); setNoteText(client.notes || ''); }} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 0',
                      }}>
                        <Edit2 size={11} color="var(--grey)" />
                        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 300, color: client.notes ? 'var(--dark)' : 'var(--grey-light)', fontStyle: client.notes ? 'normal' : 'italic' }}>
                          {client.notes || 'Add notes — lehenga colour, skin tone, preferences...'}
                        </span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ TEAM ════ */}
        {activeTab === 'team' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 300, color: 'var(--dark)' }}>My Team ({teamMembers.length})</h2>
              <button style={goldBtn} onClick={() => setShowTeamForm(!showTeamForm)}>
                <Plus size={14} />
                {showTeamForm ? 'Cancel' : 'Add Member'}
              </button>
            </div>

            {showTeamForm && (
              <div className="card" style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 300, color: 'var(--dark)', marginBottom: '20px' }}>Add Team Member</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                  <div style={formRow}><label style={label}>Name</label><input style={inp} placeholder="e.g. Ankit Sharma" value={memberName} onChange={e => setMemberName(e.target.value)} /></div>
                  <div style={formRow}><label style={label}>Phone</label><input style={inp} placeholder="10-digit number" value={memberPhone} onChange={e => setMemberPhone(e.target.value)} /></div>
                  <div style={formRow}><label style={label}>Role</label><input style={inp} placeholder="e.g. Second Shooter" value={memberRole} onChange={e => setMemberRole(e.target.value)} /></div>
                </div>
                <button style={goldBtn} onClick={handleAddTeamMember}><Check size={14} /> Add Member</button>
              </div>
            )}

            {teamMembers.length === 0 ? (
              <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
                <Users size={28} color="var(--grey-light)" style={{ marginBottom: '12px' }} />
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 300, color: 'var(--grey)' }}>No team members yet.</p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {teamMembers.map((member, i) => (
                  <div key={member.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '18px 24px',
                    borderBottom: i < teamMembers.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '15px', fontWeight: 400, color: 'var(--dark)', marginBottom: '4px' }}>{member.name}</div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
                        {member.role}{member.phone ? ` · ${member.phone}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {member.phone && (
                        <a href={`https://wa.me/91${member.phone}`} target="_blank" style={{
                          background: 'rgba(37,211,102,0.1)',
                          border: '1px solid rgba(37,211,102,0.3)',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          textDecoration: 'none',
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: '#25D366',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <MessageCircle size={12} /> WhatsApp
                        </a>
                      )}
                      <button onClick={() => handleRemoveTeamMember(member.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <Trash2 size={14} color="var(--grey)" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ INQUIRIES ════ */}
        {activeTab === 'inquiries' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 300, color: 'var(--dark)' }}>Inquiries</h2>

            {pendingBookings.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span className="section-label">Awaiting Confirmation</span>
                {pendingBookings.map(booking => (
                  <div key={booking.id} className="card" style={{ border: '1px solid var(--gold)', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '17px', fontWeight: 400, color: 'var(--dark)', marginBottom: '6px' }}>
                          {booking.users?.name || 'Couple'}
                        </div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
                          Token: Rs.{(booking.token_amount || 10000).toLocaleString('en-IN')} · Protection: Rs.999
                        </div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
                          Booked: {new Date(booking.created_at).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                      <span className="badge-gold">In Escrow</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button style={{ ...greyBtn, flex: 1, justifyContent: 'center' }}>
                        Decline
                      </button>
                      <button style={{ ...darkBtn, flex: 2, justifyContent: 'center' }}>
                        <Check size={14} color="var(--gold)" />
                        Confirm & Lock Date
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {confirmedBookings.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span className="section-label">Confirmed Bookings</span>
                {confirmedBookings.map(booking => (
                  <div key={booking.id} className="card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '15px', fontWeight: 400, color: 'var(--dark)', marginBottom: '4px' }}>
                          {booking.users?.name || 'Couple'}
                        </div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
                          Confirmed · Token received
                        </div>
                      </div>
                      <span className="badge-green">Confirmed</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {bookings.length === 0 && (
              <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
                <MessageCircle size={28} color="var(--grey-light)" style={{ marginBottom: '12px' }} />
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 300, color: 'var(--grey)' }}>No bookings yet. Enquiries from couples will appear here.</p>
              </div>
            )}
          </div>
        )}

        {/* ════ SETTINGS ════ */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 300, color: 'var(--dark)' }}>Profile Settings</h2>
              <button style={goldBtn} onClick={handleSaveProfile} disabled={savingProfile}>
                <Check size={14} />
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <div className="card" style={{ padding: '32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={formRow}>
                  <label style={label}>Business Name</label>
                  <input style={inp} value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your business name" />
                </div>
                <div style={formRow}>
                  <label style={label}>Starting Price (Rs.)</label>
                  <input style={inp} type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="e.g. 80000" />
                </div>
                <div style={formRow}>
                  <label style={label}>Instagram Handle</label>
                  <input style={inp} value={editInstagram} onChange={e => setEditInstagram(e.target.value)} placeholder="@yourbusiness" />
                </div>
                <div style={formRow}>
                  <label style={label}>Primary City</label>
                  <input style={inp} value={editCity} onChange={e => setEditCity(e.target.value)} placeholder="e.g. Delhi NCR" />
                </div>
                <div style={{ ...formRow, gridColumn: '1 / -1' }}>
                  <label style={label}>About</label>
                  <textarea style={{ ...inp, height: '100px', resize: 'vertical' }} value={editAbout} onChange={e => setEditAbout(e.target.value)} placeholder="Tell couples what makes you special..." />
                </div>
                <div style={{ ...formRow, gridColumn: '1 / -1' }}>
                  <label style={{ ...label, marginBottom: '12px' }}>Vibe Tags</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {VIBES.map(vibe => (
                      <button key={vibe} onClick={() => setEditVibes(prev => prev.includes(vibe) ? prev.filter(v => v !== vibe) : [...prev, vibe])} style={{
                        background: editVibes.includes(vibe) ? 'var(--gold)' : 'var(--cream)',
                        border: `1px solid ${editVibes.includes(vibe) ? 'var(--gold)' : 'var(--border)'}`,
                        borderRadius: '50px',
                        padding: '8px 18px',
                        cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '13px',
                        fontWeight: editVibes.includes(vibe) ? 500 : 300,
                        color: editVibes.includes(vibe) ? 'var(--dark)' : 'var(--dark)',
                        transition: 'all 0.15s',
                      }}>
                        {vibe}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', fontWeight: 400, color: 'var(--dark)', marginBottom: '4px' }}>Founding Partner Plan</div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 300, color: 'var(--grey)' }}>Rs.2,999/month · Locked forever · Full platform access</div>
              </div>
              <span className="badge-gold">Active</span>
            </div>

            <div style={{ paddingTop: '8px' }}>
              <button onClick={handleLogout} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'transparent',
                border: '1px solid rgba(181,48,58,0.3)',
                borderRadius: '8px',
                padding: '12px 20px',
                cursor: 'pointer',
                color: 'var(--red)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                fontWeight: 300,
              }}>
                <LogOut size={14} color="var(--red)" />
                Log Out
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Coming Soon Modal */}
      <ComingSoonModal tab={comingSoonTab} onClose={() => setComingSoonTab(null)} />

    </div>
  );
}
