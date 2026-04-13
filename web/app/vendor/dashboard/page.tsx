'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Grid, MessageCircle, Settings, Star, Calendar, FileText,
  Users, CreditCard, TrendingUp, Send, Gift, BarChart2,
  Clock, CheckSquare, Cpu, Map, LogOut, Plus, Trash2,
  ChevronDown, ChevronUp, X, Check, AlertCircle, Download,
  Edit2, Phone, Lock, Activity, Zap, Image, Percent,
  MinusCircle, Share2, List, Package, Target,
  DollarSign, BookOpen, Tool, Truck, Coffee,
  Navigation, Upload, ArrowDownCircle
} from 'react-feather';

const API = 'https://dream-wedding-production-89ae.up.railway.app/api';

// ── Sidebar tabs ────────────────────────────────────────────────
const ACTIVE_TABS = [
  { id: 'overview', label: 'Overview', icon: Grid },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'inquiries', label: 'Inquiries', icon: MessageCircle },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'payments', label: 'Payment Schedules', icon: CreditCard },
  { id: 'outstanding', label: 'Outstanding Payments', icon: DollarSign },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'contracts', label: 'Contracts', icon: FileText },
  { id: 'expenses', label: 'Expense Tracker', icon: MinusCircle },
  { id: 'profit', label: 'Profit per Booking', icon: Target },
  { id: 'packages', label: 'Package Builder', icon: Package },
  { id: 'timeline', label: 'Client Timeline', icon: Activity },
  { id: 'delivery', label: 'Delivery Tracker', icon: Truck },
  { id: 'forecast', label: 'Revenue Forecast', icon: TrendingUp },
  { id: 'runsheet', label: 'Day-of Runsheet', icon: List },
  { id: 'checklist', label: 'Pre-Wedding Checklist', icon: CheckSquare },
  { id: 'equipment', label: 'Equipment Checklist', icon: Tool },
  { id: 'cash', label: 'Cash Payments', icon: DollarSign },
  { id: 'tax', label: 'Tax & Finance', icon: Percent },
  { id: 'advancetax', label: 'Advance Tax', icon: BookOpen },
  { id: 'referral', label: 'Referral Tracker', icon: Gift },
  { id: 'availability', label: 'Availability Calendar', icon: Calendar },
  { id: 'csvimport', label: 'Import / Export', icon: Upload },
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
            fontFamily: 'Inter, sans-serif',
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
          fontFamily: 'Inter, sans-serif',
          fontSize: '24px',
          fontWeight: 300,
          color: 'var(--dark)',
          marginBottom: '14px',
        }}>
          {tab.label}
        </h3>
        <p style={{
          fontFamily: 'Inter, sans-serif',
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
          fontFamily: 'Inter, sans-serif',
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
        fontFamily: 'Inter, sans-serif',
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
  const [toasts, setToasts] = useState<{id:number, msg:string, type:'success'|'error'|'info'}[]>([]);
  const toast = {
    success: (msg:string) => { const id = Date.now(); setToasts(p => [...p, {id, msg, type:'success'}]); setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500); },
    error: (msg:string) => { const id = Date.now(); setToasts(p => [...p, {id, msg, type:'error'}]); setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500); },
    info: (msg:string) => { const id = Date.now(); setToasts(p => [...p, {id, msg, type:'info'}]); setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500); },
  };
  const [comingSoonTab, setComingSoonTab] = useState<any>(null);
  const [vendorData, setVendorData] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([
    { id: '1', name: 'Silver', price: 80000, inclusions: ['1 day coverage', '300 edited photos', 'Online gallery'] },
    { id: '2', name: 'Gold', price: 150000, inclusions: ['2 day coverage', '600 edited photos', 'Highlight reel', 'Online gallery'] },
    { id: '3', name: 'Platinum', price: 300000, inclusions: ['3 day coverage', '1000+ edited photos', '2 highlight reels', 'Album', 'Online gallery'] },
  ]);
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgPrice, setNewPkgPrice] = useState('');
  const [newPkgInclusions, setNewPkgInclusions] = useState('');
  const [cashEntries, setCashEntries] = useState<any[]>([]);
  const [cashClient, setCashClient] = useState('Aisha & Kabir Malhotra');
  const [cashAmount, setCashAmount] = useState('50000');
  const [cashNote, setCashNote] = useState('Token payment received');
  const [deliveryItems, setDeliveryItems] = useState<any[]>([
    { id: '1', client: 'Priya & Rahul Sharma', stage: 'editing', stages: ['shoot_done', 'editing', 'first_cut', 'feedback', 'final_edit', 'delivered'] },
    { id: '2', client: 'Ananya & Vikram Singh', stage: 'first_cut', stages: ['shoot_done', 'editing', 'first_cut', 'feedback', 'final_edit', 'delivered'] },
    { id: '3', client: 'Sneha & Arjun Kapoor', stage: 'delivered', stages: ['shoot_done', 'editing', 'first_cut', 'feedback', 'final_edit', 'delivered'] },
  ]);
  const [checklists, setChecklists] = useState<any[]>([
    { id: '1', client: 'Priya & Rahul Sharma', items: [
      { text: 'Timeline call done', done: true },
      { text: 'Shot list shared with client', done: true },
      { text: 'Venue recce completed', done: false },
      { text: 'Second shooter briefed', done: false },
      { text: 'Equipment packed and checked', done: false },
      { text: 'Outfit details confirmed with bride', done: true },
      { text: 'Hotel/travel booked', done: false },
    ]},
    { id: '2', client: 'Ananya & Vikram Singh', items: [
      { text: 'Timeline call done', done: true },
      { text: 'Shot list shared with client', done: false },
      { text: 'Venue recce completed', done: true },
      { text: 'Second shooter briefed', done: false },
      { text: 'Equipment packed and checked', done: false },
      { text: 'Outfit details confirmed with bride', done: false },
      { text: 'Hotel/travel booked', done: true },
    ]},
  ]);
  const [runsheet, setRunsheet] = useState<any[]>([
    { id: '1', time: '07:00 AM', task: 'Arrive at venue — setup and lighting check', assignee: 'Full team' },
    { id: '2', time: '08:00 AM', task: 'Bridal prep begins — makeup and getting ready shots', assignee: 'Dev + Rahul' },
    { id: '3', time: '10:30 AM', task: 'Baraat arrival — full team on ground', assignee: 'Full team' },
    { id: '4', time: '12:00 PM', task: 'Jaimala ceremony', assignee: 'Dev' },
    { id: '5', time: '01:00 PM', task: 'Pheras — continuous coverage, no breaks', assignee: 'Dev + Vikram' },
    { id: '6', time: '03:00 PM', task: 'Family portraits — designated area', assignee: 'Rahul' },
    { id: '7', time: '04:00 PM', task: 'Couple portraits — golden hour', assignee: 'Dev' },
    { id: '8', time: '06:00 PM', task: 'Reception begins — candid coverage', assignee: 'Full team' },
    { id: '9', time: '09:00 PM', task: 'Wrap up — backup all cards before leaving venue', assignee: 'Dev' },
  ]);
  const [newRunItem, setNewRunItem] = useState({ time: '', task: '', assignee: '' });
  const [equipment, setEquipment] = useState<any[]>([
    { id: '1', item: 'Camera Body 1 (Sony A7IV)', checked: true },
    { id: '2', item: 'Camera Body 2 (Backup)', checked: true },
    { id: '3', item: '24-70mm f/2.8 lens', checked: false },
    { id: '4', item: '85mm f/1.4 portrait lens', checked: false },
    { id: '5', item: 'Drone (DJI Mini 3 Pro)', checked: true },
    { id: '6', item: 'Drone batteries x4', checked: false },
    { id: '7', item: 'SD cards x8 (formatted)', checked: false },
    { id: '8', item: 'Camera batteries x6 (charged)', checked: true },
    { id: '9', item: 'External flash x2', checked: false },
    { id: '10', item: 'Light stands x2', checked: false },
    { id: '11', item: 'Laptop + hard drive for backup', checked: true },
    { id: '12', item: 'Charger cables and adapters', checked: false },
  ]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
  const [confirmDelete, setConfirmDelete] = useState<{type:string, id:string, name:string} | null>(null);
  const [showContractForm, setShowContractForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showDateInput, setShowDateInput] = useState(false);
  const [showTDSForm, setShowTDSForm] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Invoice form
  const [invClient, setInvClient] = useState('Aisha & Kabir Malhotra');
  const [invPhone, setInvPhone] = useState('9871234560');
  const [invAmount, setInvAmount] = useState('300000');
  const [invDesc, setInvDesc] = useState('Wedding Photography — 3 Day Coverage');
  const [invTDS, setInvTDS] = useState(false);
  const [invTDSByClient, setInvTDSByClient] = useState(false);

  // Contract form
  const [conClient, setConClient] = useState('Aisha & Kabir Malhotra');
  const [conPhone, setConPhone] = useState('9871234560');
  const [conEventType, setConEventType] = useState('Wedding');
  const [conDate, setConDate] = useState('June 15, 2026');
  const [conVenue, setConVenue] = useState('The Leela Palace, Delhi NCR');
  const [conServices, setConServices] = useState('Full wedding photography — 2 days including Sangeet and Wedding. Candid + editorial style.');
  const [conDeliverables, setConDeliverables] = useState('600+ edited photos, 2 highlight reels, online gallery within 45 days');
  const [conTotal, setConTotal] = useState('300000');
  const [conAdvance, setConAdvance] = useState('150000');
  const [conCancellation, setConCancellation] = useState('Token amount is non-refundable. Balance refundable if cancelled 30+ days before event.');

  // Client form
  const [clientName, setClientName] = useState('Zara & Ayaan Khan');
  const [clientPhone, setClientPhone] = useState('9867543210');
  const [clientDate, setClientDate] = useState('November 20, 2026');
  const [clientNotes, setClientNotes] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editClientData, setEditClientData] = useState<any>({});
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editInvoiceData, setEditInvoiceData] = useState<any>({});
  const [noteText, setNoteText] = useState('');

  // Team form
  const [memberName, setMemberName] = useState('Rahul Sharma');
  const [memberPhone, setMemberPhone] = useState('9812345670');
  const [memberRole, setMemberRole] = useState('Second Shooter');

  // Expense form
  const [expDesc, setExpDesc] = useState('Travel to Jaipur for destination wedding');
  const [expAmount, setExpAmount] = useState('18500');
  const [expCategory, setExpCategory] = useState('Travel');
  const [expClient, setExpClient] = useState('Aisha & Kabir Malhotra');

  // Payment form
  const [payClient, setPayClient] = useState('Aisha & Kabir Malhotra');
  const [payPhone, setPayPhone] = useState('9871234560');
  const [payTotal, setPayTotal] = useState('300000');
  const [payInstalments, setPayInstalments] = useState([
    { label: 'Token', amount: '', due_date: '', paid: false },
    { label: 'Advance', amount: '', due_date: '', paid: false },
    { label: 'Final', amount: '', due_date: '', paid: false },
  ]);

  // TDS form
  const [tdsAmount, setTdsAmount] = useState('250000');
  const [tdsClient, setTdsClient] = useState('Meera & Dev Khanna');
  const [tdsBy, setTdsBy] = useState<'client' | 'self'>('client');
  const [tdsChallan, setTdsChallan] = useState('CHL2026042');

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

  const handleSaveClientEdit = async (id: string) => {
    try {
      const res = await fetch(`${API}/vendor-clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editClientData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Client updated');
        setEditingClientId(null);
        loadClients();
      } else { toast.error('Could not update client'); }
    } catch (e) { toast.error('Could not update client'); }
  };

  const handleSaveInvoiceEdit = async (id: string) => {
    try {
      const res = await fetch(`${API}/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editInvoiceData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Invoice updated');
        setEditingInvoiceId(null);
        loadInvoices();
      } else { toast.error('Could not update invoice'); }
    } catch (e) { toast.error('Could not update invoice'); }
  };

  const handleDelete = async (type:string, id:string) => {
    const endpoints: Record<string, string> = {
      invoice: 'invoices',
      contract: 'contracts',
      client: 'vendor-clients',
      expense: 'expenses',
      payment: 'payment-schedules',
      team: 'team',
      tds: 'tds',
    };
    const endpoint = endpoints[type];
    if (!endpoint) return;
    try {
      const res = await fetch(`${API}/${endpoint}/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Deleted successfully');
        setConfirmDelete(null);
        if (type === 'invoice') loadInvoices();
        if (type === 'contract') loadContracts();
        if (type === 'client') loadClients();
        if (type === 'expense') loadExpenses();
        if (type === 'payment') loadPayments();
        if (type === 'team') loadTeam();
        if (type === 'tds') loadTDS();
      } else {
        toast.error('Could not delete. Try again.');
      }
    } catch (e) { toast.error('Could not delete. Try again.'); }
  };

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
        loadClients(vendor.id);
        loadPayments(vendor.id);
        loadExpenses(vendor.id);
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

  const loadClients = async (id?: string) => {
    const vid = id || vendorData?.id;
    if (!vid) return;
    try {
      const res = await fetch(`${API}/vendor-clients/${vid}`);
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

  const loadExpenses = async (id?: string) => {
    const vid = id || vendorData?.id;
    if (!vid) return;
    try {
      const res = await fetch(`${API}/expenses/${vid}`);
      const data = await res.json();
      if (data.success) setExpenses(data.data || []);
    } catch (e) {}
  };

  const loadPayments = async (id?: string) => {
    const vid = id || vendorData?.id;
    if (!vid) return;
    try {
      const res = await fetch(`${API}/payment-schedules/${vid}`);
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
    if (!invClient || !invAmount) { toast.error('Please fill client name and amount'); return; };
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
      toast.success('Invoice saved');
    } catch (e) { toast.error('Could not save invoice'); }
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
    if (!conClient || !conTotal || !conDate) { toast.error('Please fill client name, event date and total amount'); return; };
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
      toast.success('Contract saved successfully');
    } catch (e) { toast.error('Could not save contract'); }
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
    if (!clientName || !clientPhone) { toast.error('Please fill name and phone'); return; };
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
    } catch (e) { toast.error('Could not add client'); }
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
    if (!memberName || !memberRole) { toast.error('Please fill name and role'); return; };
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
    } catch (e) { toast.error('Could not add team member'); }
  };

  const handleRemoveTeamMember = async (id: string) => {
    try {
      await fetch(`${API}/team/${id}`, { method: 'DELETE' });
      setTeamMembers(prev => prev.filter(m => m.id !== id));
    } catch (e) {}
  };

  const handleAddExpense = async () => {
    if (!expDesc || !expAmount) { toast.error('Please fill description and amount'); return; };
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
    } catch (e) { toast.error('Could not save expense'); }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await fetch(`${API}/expenses/${id}`, { method: 'DELETE' });
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (e) {}
  };

  const handleSavePaymentSchedule = async () => {
    if (!payClient || !payTotal) { toast.error('Please fill client name and total amount'); return; };
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
    } catch (e) { toast.error('Could not save payment schedule'); }
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
    if (!tdsAmount || !tdsClient) { toast.error('Please fill client and amount'); return; };
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
      toast.success('TDS entry added');
    } catch (e) { toast.error('Could not save TDS entry'); }
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
      toast.success('Profile updated successfully');
    } catch (e) { toast.error('Could not save profile'); }
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
        backgroundColor: 'var(--content-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '20px',
            fontWeight: 300,
            color: 'var(--dark)',
            marginBottom: '8px',
            letterSpacing: '2px',
          }}>
            THE DREAM WEDDING
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', fontWeight: 300 }}>
            Loading your dashboard...
          </div>
        </div>
      </div>
    );
  }

  // ── Input style helper
  const inp: React.CSSProperties = {
    background: '#F9FAFB',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '11px 14px',
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px',
    color: 'var(--dark)',
    width: '100%',
    outline: 'none',
  };

  const label: React.CSSProperties = {
    display: 'block',
    fontFamily: 'Inter, sans-serif',
    fontSize: '10px',
    fontWeight: 500,
    color: 'var(--grey)',
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
    marginBottom: '6px',
  };

  const formRow: React.CSSProperties = { marginBottom: '14px' };

  const goldBtn: React.CSSProperties = {
    background: 'var(--btn-primary)',
    color: 'var(--btn-primary-text)',
    fontFamily: 'Inter, sans-serif',
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
    fontFamily: 'Inter, sans-serif',
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
    fontFamily: 'Inter, sans-serif',
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
    fontFamily: 'Inter, sans-serif',
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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--content-bg)' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: sidebarCollapsed ? '64px' : '260px',
        minHeight: '100vh',
        backgroundColor: 'var(--sidebar-bg)',
        transition: 'width 0.2s ease',
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
          borderBottom: '1px solid var(--sidebar-border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {!sidebarCollapsed && (
              <div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--cream)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
                  THE DREAM WEDDING
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 300, color: 'var(--sidebar-text)', letterSpacing: '0.3px' }}>
                  {vendorData?.name || 'Vendor Dashboard'}
                </div>
              </div>
            )}
            <button onClick={() => setSidebarCollapsed((p: boolean) => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sidebar-text)', padding: '4px', display: 'flex', alignItems: 'center', flexShrink: 0, fontSize: '16px' }}>
              {sidebarCollapsed ? '→' : '←'}
            </button>
          </div>
        </div>

        {/* Live toggle */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--sidebar-border)' }}>
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
              fontFamily: 'Inter, sans-serif',
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
            fontFamily: 'Inter, sans-serif',
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
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px',
                  fontWeight: isActive ? 500 : 300,
                  color: isActive ? 'var(--gold)' : 'var(--grey)',
                  letterSpacing: '0.2px',
                }}>
                  {!sidebarCollapsed && tab.label}
                </span>
              </button>
            );
          })}

          {/* Coming soon tabs */}
          <div style={{
            padding: '16px 24px 6px',
            fontFamily: 'Inter, sans-serif',
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
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  fontWeight: 300,
                  color: 'var(--grey)',
                  flex: 1,
                }}>
                  {!sidebarCollapsed && tab.label}
                </span>
                <span style={{
                  fontFamily: 'Inter, sans-serif',
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
              fontFamily: 'Inter, sans-serif',
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
        marginLeft: sidebarCollapsed ? '64px' : '260px',
        flex: 1,
        transition: 'margin-left 0.2s ease',
        minHeight: '100vh',
        padding: '32px 40px',
        maxWidth: sidebarCollapsed ? 'calc(100vw - 64px)' : 'calc(100vw - 260px)',
        backgroundColor: 'var(--content-bg)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '36px',
          paddingBottom: '24px',
          borderBottom: '1px solid var(--header-border)',
        }}>
          <div>
            <h1 style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '28px',
              fontWeight: 300,
              color: 'var(--dark)',
              marginBottom: '4px',
              letterSpacing: '0.3px',
            }}>
              {vendorData?.name || 'Your Business'}
            </h1>
            <p style={{
              fontFamily: 'Inter, sans-serif',
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
                fontFamily: 'Inter, sans-serif',
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

            {/* Greeting */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {vendorData?.name?.split(' ')[0] || 'Dev'}
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 400 }}>
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>

            </div>

            {/* Key metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[
                { label: 'Total Revenue', value: `Rs.${(totalRevenue/100000).toFixed(1)}L`, sub: 'All time invoiced' },
                { label: 'Outstanding', value: `Rs.${(paymentSchedules.flatMap((s:any) => (s.instalments||[]).filter((i:any) => !i.paid)).reduce((sum:number, i:any) => sum + parseInt(i.amount||0), 0)/100000).toFixed(1)}L`, sub: 'Unpaid instalments' },
                { label: 'Active Clients', value: String(clients.filter((c:any) => c.status === 'upcoming').length), sub: 'Upcoming weddings' },
                { label: 'Pending Enquiries', value: String(pendingBookings.filter((b:any) => b.status === 'pending').length), sub: 'Awaiting response' },
              ].map(stat => (
                <div key={stat.label} className="card" style={{ padding: '20px 24px', minHeight: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '10px' }}>{stat.label}</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '4px' }}>{stat.value}</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)' }}>{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* Two column — upcoming events + outstanding payments */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

              {/* Upcoming events */}
              <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Upcoming Weddings</span>
                  <button onClick={() => setActiveTab('calendar')} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>View calendar →</button>
                </div>
                {clients.filter((c:any) => c.status === 'upcoming').slice(0, 4).map((client:any, idx:number, arr:any[]) => (
                  <div key={client.id} style={{ padding: '14px 20px', borderBottom: idx < arr.length - 1 ? '1px solid var(--card-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{client.name}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{client.wedding_date}</div>
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: '#16A34A', background: 'rgba(22,163,74,0.08)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(22,163,74,0.15)' }}>Upcoming</span>
                  </div>
                ))}
                {clients.filter((c:any) => c.status === 'upcoming').length === 0 && (
                  <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-muted)' }}>No upcoming weddings</div>
                    <button onClick={() => setActiveTab('clients')} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '8px', textDecoration: 'underline' }}>Add a client →</button>
                  </div>
                )}
              </div>

              {/* Outstanding payments */}
              <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Outstanding Payments</span>
                  <button onClick={() => setActiveTab('outstanding')} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
                </div>
                {paymentSchedules.flatMap((s:any) =>
                  (s.instalments||[]).filter((i:any) => !i.paid).map((inst:any, idx:number) => ({
                    client: s.client_name, phone: s.client_phone, label: inst.label, amount: parseInt(inst.amount||0), due: inst.due_date,
                    overdue: inst.due_date && new Date(inst.due_date) < new Date()
                  }))
                ).slice(0, 4).map((item:any, idx:number, arr:any[]) => (
                  <div key={idx} style={{ padding: '14px 20px', borderBottom: idx < arr.length - 1 ? '1px solid var(--card-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{item.client}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.label} · Due {item.due}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: item.overdue ? '#DC2626' : 'var(--text-primary)' }}>Rs.{item.amount.toLocaleString('en-IN')}</div>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: item.overdue ? '#DC2626' : '#D97706', background: item.overdue ? 'rgba(220,38,38,0.08)' : 'rgba(217,119,6,0.08)', padding: '2px 6px', borderRadius: '3px' }}>{item.overdue ? 'OVERDUE' : 'DUE'}</span>
                    </div>
                  </div>
                ))}
                {paymentSchedules.flatMap((s:any) => (s.instalments||[]).filter((i:any) => !i.paid)).length === 0 && (
                  <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-muted)' }}>All payments received</div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick actions — minimal text links */}
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '14px' }}>Quick Actions</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { label: 'New Invoice', tab: 'invoices' },
                  { label: 'New Contract', tab: 'contracts' },
                  { label: 'Add Client', tab: 'clients' },
                  { label: 'Log Expense', tab: 'expenses' },
                  { label: 'Block Date', tab: 'calendar' },
                  { label: 'Generate Web Login Code', tab: 'overview' },
                ].map(a => (
                  <button key={a.label} onClick={() => a.tab === 'overview' ? setActiveTab('overview') : setActiveTab(a.tab)} style={{
                    fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500,
                    color: '#fff', background: 'var(--dark)',
                    border: 'none', borderRadius: '6px',
                    padding: '9px 16px', cursor: 'pointer', transition: 'all 0.15s',
                    letterSpacing: '0.1px',
                  }}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Spotlight Score — minimal stat bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#FAFAFA', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>Spotlight Score</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>2,847</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--gold)', background: 'rgba(201,168,76,0.1)', padding: '2px 8px', borderRadius: '4px' }}>#3 This Month</span>
              </div>
              <div style={{ display: 'flex', gap: '24px' }}>
                {[{ n: '140', l: 'Saves' }, { n: '57', l: 'Enquiries' }, { n: '12', l: 'Bookings' }].map(s => (
                  <div key={s.l} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.n}</span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)' }}>{s.l}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}


        {/* ════ INVOICES ════ */}
        {activeTab === 'invoices' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Invoices</h2>
              <button style={goldBtn} onClick={() => setShowInvoiceForm(!showInvoiceForm)}>
                <Plus size={14} />
                {showInvoiceForm ? 'Cancel' : 'New Invoice'}
              </button>
            </div>

            {showInvoiceForm && (
              <div className="card" style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', fontWeight: 300, color: 'var(--dark)', marginBottom: '20px' }}>New Invoice</h3>
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
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', fontWeight: 300 }}>
                      GST (18%): <strong style={{ color: 'var(--dark)' }}>Rs.{(parseInt(invAmount) * 0.18).toLocaleString('en-IN')}</strong>
                    </span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', fontWeight: 300 }}>
                      Total: <strong style={{ color: 'var(--dark)' }}>Rs.{(parseInt(invAmount) * 1.18).toLocaleString('en-IN')}</strong>
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: invTDS ? '1px solid var(--border)' : 'none', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--dark)' }}>TDS Applicable (10%)</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>Is TDS deductible on this invoice?</div>
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
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--dark)' }}>Client deducted TDS</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>Did the client already deduct TDS?</div>
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
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--dark)' }}>
                  {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
                </span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 300, color: 'var(--gold)' }}>
                  Total: Rs.{invoices.reduce((s, i) => s + (i.total_amount || i.amount || 0), 0).toLocaleString('en-IN')}
                </span>
              </div>
              {invoices.length === 0 ? (
                <div style={{ padding: '64px 48px', textAlign: 'center' }}>
                  <FileText size={32} color="#E5E7EB" style={{ marginBottom: '16px' }} />
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>No invoices yet</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>Create your first invoice and send it directly to your client.</div>
                  <button onClick={() => setShowInvoiceForm(true)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: '#fff', background: 'var(--dark)', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer' }}>Create Invoice</button>
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
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 400, color: 'var(--dark)', marginBottom: '4px' }}>{inv.client_name}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
                        {inv.invoice_number} · {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-IN') : ''}
                        {inv.description ? ` · ${inv.description}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 500, color: 'var(--dark)' }}>
                          Rs.{(inv.total_amount || inv.amount || 0).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 300, color: 'var(--grey)' }}>
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
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: inv.status === 'paid' ? 'var(--green)' : 'var(--gold)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {inv.status === 'paid' ? '✓ Paid' : 'Mark Paid'}
                      </button>
                      <button onClick={() => { setEditingInvoiceId(inv.id); setEditInvoiceData({ client_name: inv.client_name, amount: inv.amount, description: inv.description }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }} title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete({ type: 'invoice', id: inv.id, name: `Invoice ${inv.invoice_number}` })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }} title="Delete">
                        <Trash2 size={14} />
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
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Contracts</h2>
              <button style={goldBtn} onClick={() => setShowContractForm(!showContractForm)}>
                <Plus size={14} />
                {showContractForm ? 'Cancel' : 'New Contract'}
              </button>
            </div>

            {showContractForm && (
              <div className="card" style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', fontWeight: 300, color: 'var(--dark)', marginBottom: '20px' }}>New Service Agreement</h3>
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
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', fontWeight: 300 }}>
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
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--dark)' }}>
                  {contracts.length} contract{contracts.length !== 1 ? 's' : ''}
                </span>
              </div>
              {contracts.length === 0 ? (
                <div style={{ padding: '64px 48px', textAlign: 'center' }}>
                  <FileText size={32} color="#E5E7EB" style={{ marginBottom: '16px' }} />
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>No contracts yet</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>A signed contract protects you and your client. Create one before every booking.</div>
                  <button onClick={() => setShowContractForm(true)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: '#fff', background: 'var(--dark)', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer' }}>Create Contract</button>
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
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 400, color: 'var(--dark)', marginBottom: '4px' }}>{con.client_name}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
                        {con.event_type} · {con.event_date}
                        {con.venue ? ` · ${con.venue}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 500, color: 'var(--dark)' }}>
                        Rs.{(con.total_amount || 0).toLocaleString('en-IN')}
                      </div>
                      <span className="badge-gold">Issued</span>
                      <button onClick={() => setConfirmDelete({ type: 'contract', id: con.id, name: `Contract — ${con.client_name}` })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }} title="Delete">
                        <Trash2 size={14} />
                      </button>
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
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Calendar</h2>
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
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 400, color: 'var(--dark)' }}>
                          {b.users?.name || 'Couple'}
                        </div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
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
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 300, color: 'var(--grey)' }}>No dates blocked yet.</p>
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
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 300, color: 'var(--dark)' }}>{d.blocked_date}</span>
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
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Payment Schedules</h2>
              <button style={goldBtn} onClick={() => setShowPaymentForm(!showPaymentForm)}>
                <Plus size={14} />
                {showPaymentForm ? 'Cancel' : 'New Schedule'}
              </button>
            </div>

            {showPaymentForm && (
              <div className="card" style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', fontWeight: 300, color: 'var(--dark)', marginBottom: '20px' }}>New Payment Schedule</h3>
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
              <div className="card" style={{ padding: '64px 48px', textAlign: 'center' }}>
                <CreditCard size={32} color="#E5E7EB" style={{ marginBottom: '16px' }} />
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>No payment schedules yet</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>Break down your booking fee into instalments. Never chase payments manually again.</div>
                <button onClick={() => setShowPaymentForm(true)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: '#fff', background: 'var(--dark)', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer' }}>Add Payment Schedule</button>
              </div>
            ) : (
              paymentSchedules.map(schedule => (
                <div key={schedule.id} className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '17px', fontWeight: 400, color: 'var(--dark)', marginBottom: '4px' }}>{schedule.client_name}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
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
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--dark)' }}>{inst.label}</div>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
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
                                fontFamily: 'Inter, sans-serif',
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
                              fontFamily: 'Inter, sans-serif',
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
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Expense Tracker</h2>
              <button style={goldBtn} onClick={() => setShowExpenseForm(!showExpenseForm)}>
                <Plus size={14} />
                {showExpenseForm ? 'Cancel' : 'Add Expense'}
              </button>
            </div>

            {expenses.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="card-dark" style={{ padding: '20px' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 300, color: 'var(--grey)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Total Expenses</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '32px', fontWeight: 300, color: 'var(--gold)' }}>
                    Rs.{totalExpenses.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="card-dark" style={{ padding: '20px' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 300, color: 'var(--grey)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Net Profit</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '32px', fontWeight: 300, color: totalRevenue - totalExpenses > 0 ? 'var(--green)' : 'var(--red)' }}>
                    Rs.{(totalRevenue - totalExpenses).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            )}

            {showExpenseForm && (
              <div className="card" style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', fontWeight: 300, color: 'var(--dark)', marginBottom: '20px' }}>New Expense</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {EXPENSE_CATS.map(cat => (
                    <button key={cat} onClick={() => setExpCategory(cat)} style={{
                      background: expCategory === cat ? 'var(--dark)' : 'var(--cream)',
                      border: `1px solid ${expCategory === cat ? 'var(--dark)' : 'var(--border)'}`,
                      borderRadius: '8px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif',
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
                <div style={{ padding: '64px 48px', textAlign: 'center' }}>
                  <MinusCircle size={32} color="#E5E7EB" style={{ marginBottom: '16px' }} />
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>No expenses recorded yet</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>Track every shoot cost, travel expense and equipment purchase. Know your real profit per booking.</div>
                  <button onClick={() => setShowExpenseForm(true)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: '#fff', background: 'var(--dark)', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer' }}>Log Expense</button>
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
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: 'var(--dark)', marginBottom: '3px' }}>{exp.description}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
                        {exp.category} · {exp.expense_date}
                        {exp.client_name ? ` · ${exp.client_name}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 500, color: 'var(--red)' }}>
                        −Rs.{(exp.amount || 0).toLocaleString('en-IN')}
                      </span>
                      <button onClick={() => setConfirmDelete({ type: 'expense', id: exp.id, name: exp.description })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
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
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Tax & Finance</h2>
              <button style={goldBtn} onClick={() => setShowTDSForm(!showTDSForm)}>
                <Plus size={14} />
                Add TDS Entry
              </button>
            </div>

            {tdsSummary && (
              <div className="card-dark" style={{ padding: '28px' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 300, color: 'var(--grey)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '20px' }}>
                  TDS Reconciliation · {tdsSummary.financial_year}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
                  {[
                    { label: 'Gross Income', val: `Rs.${(tdsSummary.total_gross_income || 0).toLocaleString('en-IN')}` },
                    { label: 'TDS Deducted', val: `Rs.${(tdsSummary.total_tds_deducted || 0).toLocaleString('en-IN')}` },
                    { label: 'Net Received', val: `Rs.${(tdsSummary.total_net_received || 0).toLocaleString('en-IN')}` },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '22px', fontWeight: 300, color: 'var(--gold)', marginBottom: '6px' }}>{s.val}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 300, color: 'var(--grey)', letterSpacing: '0.5px' }}>{s.label}</div>
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
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--cream)' }}>Rs.{s.val.toLocaleString('en-IN')}</div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 300, color: 'var(--grey)' }}>{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showTDSForm && (
              <div className="card" style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', fontWeight: 300, color: 'var(--dark)', marginBottom: '20px' }}>Add TDS Entry</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={formRow}><label style={label}>Client Name</label><input style={inp} placeholder="e.g. Priya & Rahul" value={tdsClient} onChange={e => setTdsClient(e.target.value)} /></div>
                  <div style={formRow}><label style={label}>Gross Amount (Rs.)</label><input style={inp} type="number" placeholder="e.g. 150000" value={tdsAmount} onChange={e => setTdsAmount(e.target.value)} /></div>
                </div>
                {tdsAmount && (
                  <div style={{ background: 'var(--cream)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', fontWeight: 300 }}>
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
                        fontFamily: 'Inter, sans-serif',
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
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 300, color: 'var(--grey)' }}>
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
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--dark)', marginBottom: '3px' }}>
                        {entry.transaction_type === 'platform_booking' ? 'Platform Booking' : 'Client Invoice'}
                      </div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
                        {new Date(entry.created_at).toLocaleDateString('en-IN')}
                        {entry.notes ? ` · ${entry.notes}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: 'var(--dark)' }}>
                        Rs.{(entry.gross_amount || 0).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--gold)' }}>
                        TDS: Rs.{(entry.tds_amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ background: 'var(--light-gold)', border: '1px solid var(--gold-border)', borderRadius: '10px', padding: '16px 20px', display: 'flex', gap: '10px' }}>
              <AlertCircle size={16} color="var(--gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 300, color: 'var(--grey)', lineHeight: 1.7 }}>
                Platform TDS appears in your Form 26AS under The Dream Wedding's TAN. Share this ledger with your CA before quarterly advance tax payment and annual ITR filing.
              </p>
            </div>
          </div>
        )}

        {/* ════ CLIENTS ════ */}
        {activeTab === 'clients' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Clients ({clients.length})</h2>
              <button style={goldBtn} onClick={() => setShowClientForm(!showClientForm)}>
                <Plus size={14} />
                {showClientForm ? 'Cancel' : 'Add Client'}
              </button>
            </div>

            <div className="card-dark" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Zap size={16} color="var(--gold)" style={{ flexShrink: 0 }} />
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 300, color: 'var(--grey-light)', lineHeight: 1.6 }}>
                Every client you add is a potential platform user. For every 10 past clients who join and send an enquiry — you earn 10% off your subscription. Up to 50% off.
              </p>
            </div>

            {showClientForm && (
              <div className="card" style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', fontWeight: 300, color: 'var(--dark)', marginBottom: '20px' }}>Add Client</h3>
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
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 300, color: 'var(--grey)' }}>No clients yet. Add your first client above.</p>
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
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', fontWeight: 400, color: 'var(--dark)', marginBottom: '4px' }}>{client.name}</div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
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
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: '#25D366',
                          }}>
                          {client.invited ? 'Invited ✓' : 'Send Invite'}
                        </a>
                        <button onClick={() => { setEditingClientId(client.id); setEditClientData({ name: client.name, phone: client.phone, wedding_date: client.wedding_date, status: client.status, notes: client.notes }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }} title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setConfirmDelete({ type: 'client', id: client.id, name: client.name })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {editingClientId === client.id && (
                      <div style={{ marginTop: '12px', padding: '16px', background: '#F9FAFB', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Name</label>
                            <input style={{ ...inp, fontSize: '13px' }} value={editClientData.name || ''} onChange={e => setEditClientData((p:any) => ({ ...p, name: e.target.value }))} />
                          </div>
                          <div>
                            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Phone</label>
                            <input style={{ ...inp, fontSize: '13px' }} value={editClientData.phone || ''} onChange={e => setEditClientData((p:any) => ({ ...p, phone: e.target.value }))} />
                          </div>
                          <div>
                            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Wedding Date</label>
                            <input style={{ ...inp, fontSize: '13px' }} value={editClientData.wedding_date || ''} onChange={e => setEditClientData((p:any) => ({ ...p, wedding_date: e.target.value }))} />
                          </div>
                          <div>
                            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Status</label>
                            <select style={{ ...inp, fontSize: '13px' }} value={editClientData.status || 'upcoming'} onChange={e => setEditClientData((p:any) => ({ ...p, status: e.target.value }))}>
                              <option value="upcoming">Upcoming</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditingClientId(null)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--dark)', background: '#E5E7EB', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
                          <button onClick={() => handleSaveClientEdit(client.id)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: '#fff', background: 'var(--dark)', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer' }}>Save Changes</button>
                        </div>
                      </div>
                    )}
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
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 300, color: client.notes ? 'var(--dark)' : 'var(--grey-light)', fontStyle: client.notes ? 'normal' : 'italic' }}>
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
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>My Team ({teamMembers.length})</h2>
              <button style={goldBtn} onClick={() => setShowTeamForm(!showTeamForm)}>
                <Plus size={14} />
                {showTeamForm ? 'Cancel' : 'Add Member'}
              </button>
            </div>

            {showTeamForm && (
              <div className="card" style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', fontWeight: 300, color: 'var(--dark)', marginBottom: '20px' }}>Add Team Member</h3>
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
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 300, color: 'var(--grey)' }}>No team members yet.</p>
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
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 400, color: 'var(--dark)', marginBottom: '4px' }}>{member.name}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
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
                          fontFamily: 'Inter, sans-serif',
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
                      <button onClick={() => setConfirmDelete({ type: 'team', id: member.id, name: member.name })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
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
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Inquiries</h2>

            {pendingBookings.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span className="section-label">Awaiting Confirmation</span>
                {pendingBookings.map(booking => (
                  <div key={booking.id} className="card" style={{ border: '1px solid var(--gold)', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '17px', fontWeight: 400, color: 'var(--dark)', marginBottom: '6px' }}>
                          {booking.users?.name || 'Couple'}
                        </div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
                          Token: Rs.{(booking.token_amount || 10000).toLocaleString('en-IN')} · Protection: Rs.999
                        </div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
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
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 400, color: 'var(--dark)', marginBottom: '4px' }}>
                          {booking.users?.name || 'Couple'}
                        </div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 300, color: 'var(--grey)' }}>
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
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 300, color: 'var(--grey)' }}>No bookings yet. Enquiries from couples will appear here.</p>
              </div>
            )}
          </div>
        )}

        {/* ════ SETTINGS ════ */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Profile Settings</h2>
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
                        fontFamily: 'Inter, sans-serif',
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
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', fontWeight: 400, color: 'var(--dark)', marginBottom: '4px' }}>Founding Partner Plan</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 300, color: 'var(--grey)' }}>Rs.2,999/month · Locked forever · Full platform access</div>
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
                fontFamily: 'Inter, sans-serif',
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

        {/* ════ OUTSTANDING PAYMENTS ════ */}
        {activeTab === 'outstanding' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Outstanding Payments</h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '-12px' }}>All unpaid amounts across every client, sorted by due date.</p>
            {paymentSchedules.flatMap((s: any) =>
              (s.instalments || []).filter((i: any) => !i.paid).map((inst: any, idx: number) => {
                const isOverdue = inst.due_date && new Date(inst.due_date) < new Date();
                const isDueSoon = inst.due_date && !isOverdue && (new Date(inst.due_date).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;
                const color = isOverdue ? '#B5303A' : isDueSoon ? '#C9A84C' : '#4CAF50';
                const status = isOverdue ? 'OVERDUE' : isDueSoon ? 'DUE SOON' : 'UPCOMING';
                return (
                  <div key={`${s.id}-${idx}`} className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${color}` }}>
                    <div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', color: 'var(--dark)', marginBottom: '4px' }}>{s.client_name}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--grey)' }}>{inst.label} · Due {inst.due_date || 'No date set'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', color: 'var(--dark)' }}>Rs.{parseInt(inst.amount || 0).toLocaleString('en-IN')}</span>
                      <span style={{ background: `${color}20`, color, fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, letterSpacing: '1px', padding: '4px 10px', borderRadius: '50px', border: `1px solid ${color}40` }}>{status}</span>
                      {s.client_phone && (
                        <a href={`https://wa.me/91${s.client_phone}?text=${encodeURIComponent(`Hi ${s.client_name.split('&')[0].trim()}! This is a friendly reminder that your ${inst.label} payment of Rs.${parseInt(inst.amount || 0).toLocaleString('en-IN')} is due on ${inst.due_date}. Request you to please transfer at your earliest convenience. Thank you! — ${vendorData?.name || 'Your Vendor'}, The Dream Wedding`)}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#25D36615', border: '1px solid #25D36640', borderRadius: '8px', padding: '8px 14px', color: '#25D366', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, textDecoration: 'none' }}>
                          Remind
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {paymentSchedules.every((s: any) => (s.instalments || []).every((i: any) => i.paid)) && (
              <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', color: 'var(--dark)', marginBottom: '8px' }}>All caught up</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)' }}>No outstanding payments. Every instalment is paid.</div>
              </div>
            )}
          </div>
        )}

        {/* ════ PROFIT PER BOOKING ════ */}
        {activeTab === 'profit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Profit per Booking</h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '-12px' }}>Invoice total minus all expenses logged against that client. Your actual margin, finally visible.</p>
            {clients.map((client: any) => {
              const clientInvoices = invoices.filter((i: any) => i.client_name === client.name);
              const clientExpenses = expenses.filter((e: any) => e.client_name === client.name);
              const revenue = clientInvoices.reduce((s: number, i: any) => s + (i.amount || 0), 0);
              const costs = clientExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
              const profit = revenue - costs;
              const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
              if (revenue === 0) return null;
              return (
                <div key={client.id} className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', color: 'var(--dark)', marginBottom: '4px' }}>{client.name}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--grey)' }}>{client.wedding_date}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: profit >= 0 ? '#4CAF50' : '#B5303A' }}>Rs.{profit.toLocaleString('en-IN')}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--grey)' }}>{margin}% margin</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    {[
                      { label: 'Revenue', value: revenue, color: 'var(--dark)' },
                      { label: 'Expenses', value: costs, color: '#B5303A' },
                      { label: 'Profit', value: profit, color: '#4CAF50' },
                    ].map(item => (
                      <div key={item.label} style={{ background: 'var(--cream)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', color: item.color }}>Rs.{item.value.toLocaleString('en-IN')}</div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--grey)', marginTop: '4px' }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '12px', background: 'var(--border)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(margin, 100)}%`, height: '100%', background: margin > 50 ? '#4CAF50' : margin > 25 ? 'var(--gold)' : '#B5303A', borderRadius: '4px', transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ════ CLIENT TIMELINE ════ */}
        {activeTab === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Client Timeline</h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '-12px' }}>Every interaction with every client, in one scroll.</p>
            {clients.map((client: any) => {
              const clientInvoices = invoices.filter((i: any) => i.client_name === client.name);
              const clientSchedules = paymentSchedules.filter((s: any) => s.client_name === client.name);
              const events = [
                { date: client.created_at, label: 'Client added to database', type: 'start' },
                ...clientInvoices.map((i: any) => ({ date: i.created_at, label: `Invoice generated — Rs.${(i.amount || 0).toLocaleString('en-IN')}`, type: 'invoice' })),
                ...clientSchedules.flatMap((s: any) => (s.instalments || []).filter((i: any) => i.paid).map((i: any) => ({ date: new Date().toISOString(), label: `${i.label} payment received — Rs.${parseInt(i.amount || 0).toLocaleString('en-IN')}`, type: 'payment' }))),
                { date: client.wedding_date, label: 'Wedding day', type: 'wedding' },
              ].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
              const typeColor: any = { start: 'var(--gold)', invoice: 'var(--dark)', payment: '#4CAF50', wedding: '#C9A84C' };
              return (
                <div key={client.id} className="card" style={{ padding: '24px' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', color: 'var(--dark)', marginBottom: '20px' }}>{client.name}</div>
                  <div style={{ position: 'relative', paddingLeft: '24px' }}>
                    <div style={{ position: 'absolute', left: '8px', top: 0, bottom: 0, width: '1px', background: 'var(--border)' }} />
                    {events.map((event, idx) => (
                      <div key={idx} style={{ position: 'relative', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ position: 'absolute', left: '-20px', width: '8px', height: '8px', borderRadius: '50%', background: typeColor[event.type] || 'var(--grey)', marginTop: '4px' }} />
                        <div>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--dark)', fontWeight: 400 }}>{event.label}</div>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--grey)', marginTop: '2px' }}>{event.date ? new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date TBD'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ════ DELIVERY TRACKER ════ */}
        {activeTab === 'delivery' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Delivery Tracker</h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '-12px' }}>Track every booking from shoot to final delivery. Clients stop chasing when they see the status.</p>
            {deliveryItems.map((item: any) => {
              const stageLabels: any = { shoot_done: 'Shoot Done', editing: 'Editing', first_cut: 'First Cut Sent', feedback: 'Feedback Received', final_edit: 'Final Edits', delivered: 'Delivered' };
              const currentIdx = item.stages.indexOf(item.stage);
              return (
                <div key={item.id} className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', color: 'var(--dark)' }}>{item.client}</div>
                    <span className="badge-gold">{stageLabels[item.stage]}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {item.stages.map((stage: string, idx: number) => (
                      <div key={stage} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <button onClick={() => setDeliveryItems(prev => prev.map(d => d.id === item.id ? { ...d, stage } : d))} style={{
                          width: '100%', padding: '8px 4px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, letterSpacing: '0.3px', textAlign: 'center',
                          background: idx <= currentIdx ? 'var(--dark)' : 'var(--cream)',
                          color: idx <= currentIdx ? 'var(--gold)' : 'var(--grey)',
                          transition: 'all 0.2s',
                        }}>
                          {stageLabels[stage]}
                        </button>
                        {idx < item.stages.length - 1 && <div style={{ width: '4px', height: '2px', background: idx < currentIdx ? 'var(--dark)' : 'var(--border)', flexShrink: 0 }} />}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ════ REVENUE FORECAST ════ */}
        {activeTab === 'forecast' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Revenue Forecast</h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '-12px' }}>Money coming in over the next 3 months, based on confirmed payment schedules.</p>
            {(() => {
              const months: any = {};
              paymentSchedules.forEach((s: any) => {
                (s.instalments || []).filter((i: any) => !i.paid && i.due_date).forEach((inst: any) => {
                  const d = new Date(inst.due_date);
                  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                  if (!months[key]) months[key] = { label, amount: 0, items: [] };
                  months[key].amount += parseInt(inst.amount || 0);
                  months[key].items.push({ client: s.client_name, label: inst.label, amount: parseInt(inst.amount || 0) });
                });
              });
              const sorted = Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(0, 3);
              const maxAmount = Math.max(...sorted.map(([, v]: any) => v.amount), 1);
              return sorted.length > 0 ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    {sorted.map(([key, data]: any) => (
                      <div key={key} className="card" style={{ padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>{data.label}</div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 500, color: 'var(--gold)', marginBottom: '4px' }}>Rs.{data.amount.toLocaleString('en-IN')}</div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--grey)' }}>{data.items.length} payment{data.items.length !== 1 ? 's' : ''}</div>
                        <div style={{ marginTop: '12px', background: 'var(--border)', borderRadius: '4px', height: '4px' }}>
                          <div style={{ width: `${(data.amount / maxAmount) * 100}%`, height: '100%', background: 'var(--gold)', borderRadius: '4px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="card" style={{ padding: '24px' }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--grey)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '16px' }}>Breakdown</div>
                    {sorted.flatMap(([, data]: any) => data.items.map((item: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--dark)' }}>{item.client}</div>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--grey)' }}>{item.label}</div>
                        </div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', color: 'var(--dark)' }}>Rs.{item.amount.toLocaleString('en-IN')}</div>
                      </div>
                    )))}
                  </div>
                </>
              ) : (
                <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', color: 'var(--dark)', marginBottom: '8px' }}>No upcoming payments</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)' }}>Add payment schedules to see your revenue forecast.</div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ════ PACKAGE BUILDER ════ */}
        {activeTab === 'packages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Package Builder</h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '-12px' }}>Define your packages once. Share a professional comparison card with every enquiry.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {packages.map((pkg: any) => (
                <div key={pkg.id} className="card" style={{ padding: '24px', position: 'relative' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '22px', color: 'var(--gold)', marginBottom: '8px' }}>{pkg.name}</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 500, color: 'var(--dark)', marginBottom: '16px' }}>Rs.{parseInt(pkg.price).toLocaleString('en-IN')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {pkg.inclusions.map((inc: string, idx: number) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Check size={12} color="var(--gold)" />
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)' }}>{inc}</span>
                      </div>
                    ))}
                  </div>
                  <a href={'https://wa.me/?text=' + encodeURIComponent('*' + pkg.name + ' Package — Rs.' + parseInt(pkg.price).toLocaleString('en-IN') + '*\n\n' + pkg.inclusions.map((i: string) => String.fromCharCode(10003) + ' ' + i).join('\n') + '\n\n\u2014 ' + (vendorData?.name || 'The Dream Wedding'))} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '16px', background: '#25D36615', border: '1px solid #25D36640', borderRadius: '8px', padding: '10px', color: '#25D366', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, textDecoration: 'none' }}>
                    Share via WhatsApp
                  </a>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--grey)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '16px' }}>Add New Package</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <input style={inp} placeholder="Package name (e.g. Diamond)" value={newPkgName} onChange={e => setNewPkgName(e.target.value)} />
                <input style={inp} placeholder="Price (Rs.)" type="number" value={newPkgPrice} onChange={e => setNewPkgPrice(e.target.value)} />
              </div>
              <textarea style={{ ...inp, width: '100%', height: '80px', resize: 'vertical', boxSizing: 'border-box' }} placeholder="Inclusions (one per line)" value={newPkgInclusions} onChange={e => setNewPkgInclusions(e.target.value)} />
              <button style={{ ...goldBtn, marginTop: '12px' }} onClick={() => {
                if (!newPkgName || !newPkgPrice) return;
                setPackages(prev => [...prev, { id: Date.now().toString(), name: newPkgName, price: newPkgPrice, inclusions: newPkgInclusions.split('\n').filter(Boolean) }]);
                setNewPkgName(''); setNewPkgPrice(''); setNewPkgInclusions('');
              }}>
                <Plus size={14} /> Add Package
              </button>
            </div>
          </div>
        )}

        {/* ════ ADVANCE TAX ════ */}
        {activeTab === 'advancetax' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Advance Tax Calculator</h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '-12px' }}>Based on your invoiced income this year. Never miss a due date again.</p>
            {(() => {
              const totalIncome = invoices.reduce((s: number, i: any) => s + (i.amount || 0), 0);
              const taxableIncome = totalIncome * 0.9;
              const estimatedTax = taxableIncome > 500000 ? (taxableIncome - 500000) * 0.2 + 12500 : taxableIncome > 250000 ? (taxableIncome - 250000) * 0.05 : 0;
              const quarters = [
                { label: 'Q1', due: 'June 15, 2026', percent: 15, status: 'upcoming' },
                { label: 'Q2', due: 'September 15, 2026', percent: 45, status: 'upcoming' },
                { label: 'Q3', due: 'December 15, 2026', percent: 75, status: 'upcoming' },
                { label: 'Q4', due: 'March 15, 2027', percent: 100, status: 'upcoming' },
              ];
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    {[
                      { label: 'Total Invoiced Income', value: `Rs.${totalIncome.toLocaleString('en-IN')}` },
                      { label: 'Estimated Taxable (after TDS)', value: `Rs.${Math.round(taxableIncome).toLocaleString('en-IN')}` },
                      { label: 'Estimated Annual Tax', value: `Rs.${Math.round(estimatedTax).toLocaleString('en-IN')}` },
                    ].map(item => (
                      <div key={item.label} className="card" style={{ padding: '20px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '22px', color: 'var(--gold)', marginBottom: '6px' }}>{item.value}</div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--grey)' }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="card" style={{ padding: '24px' }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--grey)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '16px' }}>Quarterly Due Dates</div>
                    {quarters.map((q, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: idx < quarters.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--dark)', fontWeight: 500 }}>{q.label} — Due {q.due}</div>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--grey)', marginTop: '2px' }}>Pay {q.percent}% of annual tax by this date</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', color: 'var(--dark)' }}>Rs.{Math.round(estimatedTax * q.percent / 100).toLocaleString('en-IN')}</div>
                          <span style={{ background: '#C9A84C20', color: 'var(--gold)', fontFamily: 'Inter, sans-serif', fontSize: '10px', padding: '3px 8px', borderRadius: '50px', border: '1px solid var(--gold-border)' }}>UPCOMING</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="card" style={{ padding: '20px', background: 'var(--cream)', border: '1px solid var(--gold-border)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <AlertCircle size={16} color="var(--gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', lineHeight: '1.6', margin: 0 }}>This is an estimate based on your invoiced income. Platform TDS will appear in Form 26AS under The Dream Wedding's TAN. Share these figures with your CA before filing. Missing advance tax deadlines attracts 1% interest per month under Section 234B/234C.</p>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ════ CASH PAYMENTS ════ */}
        {activeTab === 'cash' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Cash Payment Log</h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '-12px' }}>Record offline cash payments for your own records. Not processed by the platform.</p>
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <input style={inp} placeholder="Client name" value={cashClient} onChange={e => setCashClient(e.target.value)} />
                <input style={inp} placeholder="Amount received (Rs.)" type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} />
              </div>
              <input style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: '12px' }} placeholder="Note (e.g. Token payment, advance etc.)" value={cashNote} onChange={e => setCashNote(e.target.value)} />
              <button style={goldBtn} onClick={() => {
                if (!cashClient || !cashAmount) return;
                setCashEntries(prev => [{ id: Date.now().toString(), client: cashClient, amount: parseInt(cashAmount), note: cashNote, date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }, ...prev]);
                setCashAmount(''); setCashNote('Token payment received');
              }}>
                <Plus size={14} /> Log Cash Payment
              </button>
            </div>
            {cashEntries.length > 0 && (
              <div className="card" style={{ overflow: 'hidden' }}>
                {cashEntries.map((entry: any, idx: number) => (
                  <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: idx < cashEntries.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--dark)', fontWeight: 400 }}>{entry.client}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--grey)' }}>{entry.note} · {entry.date}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', color: '#4CAF50' }}>Rs.{entry.amount.toLocaleString('en-IN')}</span>
                      <button onClick={() => setCashEntries(prev => prev.filter(e => e.id !== entry.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey)', padding: '4px' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ padding: '16px 24px', background: 'var(--cream)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', fontWeight: 500 }}>Total Cash Logged</span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', color: 'var(--dark)' }}>Rs.{cashEntries.reduce((s: number, e: any) => s + e.amount, 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ PRE-WEDDING CHECKLIST ════ */}
        {activeTab === 'checklist' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Pre-Wedding Checklist</h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '-12px' }}>Per-client checklist to complete before every wedding. Never forget a critical step again.</p>
            {checklists.map((cl: any) => {
              const done = cl.items.filter((i: any) => i.done).length;
              const total = cl.items.length;
              return (
                <div key={cl.id} className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', color: 'var(--dark)' }}>{cl.client}</div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: done === total ? '#4CAF50' : 'var(--gold)', fontWeight: 500 }}>{done}/{total} complete</span>
                  </div>
                  <div style={{ background: 'var(--border)', borderRadius: '4px', height: '4px', marginBottom: '16px' }}>
                    <div style={{ width: `${(done / total) * 100}%`, height: '100%', background: done === total ? '#4CAF50' : 'var(--gold)', borderRadius: '4px', transition: 'width 0.3s' }} />
                  </div>
                  {cl.items.map((item: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: idx < cl.items.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                      onClick={() => setChecklists(prev => prev.map(c => c.id === cl.id ? { ...c, items: c.items.map((it: any, i: number) => i === idx ? { ...it, done: !it.done } : it) } : c))}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: `1.5px solid ${item.done ? 'var(--dark)' : 'var(--border)'}`, background: item.done ? 'var(--dark)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {item.done && <Check size={10} color="var(--gold)" />}
                      </div>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: item.done ? 'var(--grey)' : 'var(--dark)', textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* ════ AVAILABILITY CALENDAR ════ */}
        {activeTab === 'availability' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Availability Calendar</h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '-12px' }}>Your month at a glance. Screenshot and share with enquiring couples.</p>
            {(() => {
              const now = new Date();
              const year = now.getFullYear();
              const month = now.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
              const blockedSet = new Set(blockedDates.map((d: any) => {
                const date = new Date(d.blocked_date);
                return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
              }));
              const cells = [];
              for (let i = 0; i < firstDay; i++) cells.push(null);
              for (let d = 1; d <= daysInMonth; d++) cells.push(d);
              const isBlocked = (d: number) => blockedSet.has(`${year}-${month}-${d}`);
              const isToday = (d: number) => d === now.getDate();
              return (
                <div className="card" style={{ padding: '32px' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '22px', color: 'var(--dark)', textAlign: 'center', marginBottom: '24px' }}>{monthName}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '16px' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--grey)', textAlign: 'center', fontWeight: 500, letterSpacing: '0.5px' }}>{d}</div>
                    ))}
                    {cells.map((d, idx) => (
                      <div key={idx} style={{
                        height: '48px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: d && isToday(d) ? 600 : 300,
                        background: !d ? 'transparent' : isBlocked(d) ? 'var(--dark)' : '#4CAF5015',
                        color: !d ? 'transparent' : isBlocked(d) ? 'var(--gold)' : isToday(d) ? 'var(--dark)' : '#4CAF50',
                        border: d && isToday(d) ? '2px solid var(--gold)' : '1px solid transparent',
                      }}>
                        {d || ''}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                    {[{ color: '#4CAF5015', textColor: '#4CAF50', label: 'Available' }, { color: 'var(--dark)', textColor: 'var(--gold)', label: 'Blocked/Booked' }, { color: 'transparent', textColor: 'var(--dark)', label: 'Today', border: '2px solid var(--gold)' }].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: item.color, border: item.border || '1px solid transparent' }} />
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--grey)' }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ════ DAY-OF RUNSHEET ════ */}
        {activeTab === 'runsheet' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Day-of Runsheet</h2>
              <a href={'https://wa.me/?text=' + encodeURIComponent('*Wedding Day Runsheet*\n\n' + runsheet.map(r => r.time + ' — ' + r.task + '\nAssigned: ' + r.assignee).join('\n\n'))} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#25D36615', border: '1px solid #25D36640', borderRadius: '8px', padding: '10px 16px', color: '#25D366', fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
                Share with Team
              </a>
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '-12px' }}>Minute-by-minute timeline. Share with your full team via WhatsApp.</p>
            <div className="card" style={{ overflow: 'hidden' }}>
              {runsheet.map((item: any, idx: number) => (
                <div key={item.id} style={{ display: 'flex', gap: '16px', padding: '16px 24px', borderBottom: idx < runsheet.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--gold)', fontWeight: 500, minWidth: '80px', flexShrink: 0 }}>{item.time}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--dark)' }}>{item.task}</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--grey)', marginTop: '3px' }}>Assigned: {item.assignee}</div>
                  </div>
                  <button onClick={() => setRunsheet(prev => prev.filter(r => r.id !== item.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey)', padding: '4px', flexShrink: 0 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--grey)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '14px' }}>Add Entry</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <input style={inp} placeholder="Time (e.g. 09:00 AM)" value={newRunItem.time} onChange={e => setNewRunItem(p => ({ ...p, time: e.target.value }))} />
                <input style={inp} placeholder="Task description" value={newRunItem.task} onChange={e => setNewRunItem(p => ({ ...p, task: e.target.value }))} />
                <input style={inp} placeholder="Assigned to" value={newRunItem.assignee} onChange={e => setNewRunItem(p => ({ ...p, assignee: e.target.value }))} />
              </div>
              <button style={goldBtn} onClick={() => {
                if (!newRunItem.time || !newRunItem.task) return;
                setRunsheet(prev => [...prev, { id: Date.now().toString(), ...newRunItem }].sort((a, b) => a.time.localeCompare(b.time)));
                setNewRunItem({ time: '', task: '', assignee: '' });
              }}>
                <Plus size={14} /> Add to Runsheet
              </button>
            </div>
          </div>
        )}

        {/* ════ EQUIPMENT CHECKLIST ════ */}
        {activeTab === 'equipment' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Equipment Checklist</h2>
              <button style={goldBtn} onClick={() => setEquipment(prev => prev.map(e => ({ ...e, checked: false })))}>
                Reset All
              </button>
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '-12px' }}>Run through this before every shoot. Never forget critical equipment again.</p>
            {(() => {
              const checked = equipment.filter(e => e.checked).length;
              const total = equipment.length;
              return (
                <div className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)' }}>{checked}/{total} items checked</span>
                    {checked === total && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#4CAF50', fontWeight: 500 }}>Ready to shoot!</span>}
                  </div>
                  <div style={{ background: 'var(--border)', borderRadius: '4px', height: '4px', marginBottom: '20px' }}>
                    <div style={{ width: `${(checked / total) * 100}%`, height: '100%', background: checked === total ? '#4CAF50' : 'var(--gold)', borderRadius: '4px', transition: 'width 0.3s' }} />
                  </div>
                  {equipment.map((item: any, idx: number) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: idx < equipment.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                      onClick={() => setEquipment(prev => prev.map(e => e.id === item.id ? { ...e, checked: !e.checked } : e))}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: `1.5px solid ${item.checked ? '#4CAF50' : 'var(--border)'}`, background: item.checked ? '#4CAF50' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                        {item.checked && <Check size={11} color="white" />}
                      </div>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: item.checked ? 'var(--grey)' : 'var(--dark)', textDecoration: item.checked ? 'line-through' : 'none' }}>{item.item}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ════ CSV IMPORT / EXPORT ════ */}
        {activeTab === 'csvimport' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Import / Export</h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '-12px' }}>Bring your existing client data in. Take your data out anytime. Your data is always yours.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="card" style={{ padding: '32px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--light-gold)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <Upload size={20} color="var(--gold)" />
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', color: 'var(--dark)', marginBottom: '8px' }}>Import Clients</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', lineHeight: '1.6', marginBottom: '20px' }}>Upload a CSV or Excel file from any CRM, spreadsheet or WedMeGood export. We auto-map the columns.</div>
                <div style={{ border: '2px dashed var(--border)', borderRadius: '10px', padding: '32px', textAlign: 'center', marginBottom: '16px', cursor: 'pointer', background: 'var(--cream)' }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) toast.info(`${file.name} received — import coming in next update`);
                  }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)' }}>Drag and drop CSV here</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--grey)', marginTop: '4px', opacity: 0.6 }}>or</div>
                  <label style={{ display: 'inline-block', marginTop: '8px', cursor: 'pointer' }}>
                    <input type="file" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) toast.info(`${file.name} received — import coming in next update`);
                    }} />
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--gold)', fontWeight: 500, textDecoration: 'underline' }}>Browse files</span>
                  </label>
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--grey)', lineHeight: '1.6' }}>Expected columns: Name, Phone, Wedding Date, Notes (optional). Any extra columns are ignored.</div>
              </div>
              <div className="card" style={{ padding: '32px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--light-gold)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <ArrowDownCircle size={20} color="var(--gold)" />
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', color: 'var(--dark)', marginBottom: '8px' }}>Export Your Data</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', lineHeight: '1.6', marginBottom: '24px' }}>Download everything — clients, invoices, expenses, TDS records. Your data is always yours. No lock-in.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { label: 'Client Database', data: clients, fields: ['name', 'phone', 'wedding_date'] },
                    { label: 'Invoice History', data: invoices, fields: ['client_name', 'amount', 'description', 'invoice_number'] },
                    { label: 'Expense Records', data: expenses, fields: ['description', 'amount', 'category', 'client_name', 'expense_date'] },
                  ].map(item => (
                    <button key={item.label} style={{ ...goldBtn, justifyContent: 'space-between', background: 'var(--cream)', color: 'var(--dark)', border: '1px solid var(--border)' }}
                      onClick={() => {
                        const headers = item.fields.join(',');
                        const rows = item.data.map((d: any) => item.fields.map(f => `"${d[f] || ''}"`).join(','));
                        const csv = [headers, ...rows].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = `${item.label.toLowerCase().replace(/ /g, '_')}.csv`;
                        a.click(); URL.revokeObjectURL(url);
                      }}>
                      <span>{item.label}</span>
                      <Download size={14} />
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: '16px', fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--grey)', lineHeight: '1.6' }}>Exports are instant CSV downloads. Open in Excel, Google Sheets or any spreadsheet tool.</div>
              </div>
            </div>
          </div>
        )}


        {activeTab === 'referral' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)', marginBottom: '4px' }}>Referral Tracker</h2>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)' }}>Every 10 past clients who join and send an enquiry earns you 10% off your subscription. Up to 50% off.</p>
            </div>

            {/* Discount progress */}
            <div className="card" style={{ padding: '28px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>Current Discount Earned</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '40px', fontWeight: 700, color: 'var(--dark)', letterSpacing: '-1px' }}>10% <span style={{ fontSize: '16px', fontWeight: 400, color: 'var(--grey)' }}>off subscription</span></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Next milestone</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--dark)' }}>20% off at 20 clients</div>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ background: '#F3F4F6', borderRadius: '4px', height: '6px', marginBottom: '10px' }}>
                <div style={{ background: 'var(--gold)', borderRadius: '4px', height: '6px', width: '20%' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--grey)' }}>2 of 10 clients joined & sent enquiry</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--grey)' }}>8 more to next tier</span>
              </div>
            </div>

            {/* Milestone tiers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              {[
                { clients: 10, discount: '10%', reached: true },
                { clients: 20, discount: '20%', reached: false },
                { clients: 30, discount: '30%', reached: false },
                { clients: 40, discount: '40%', reached: false },
                { clients: 50, discount: '50%', reached: false },
              ].map(tier => (
                <div key={tier.clients} className="card" style={{ padding: '20px', textAlign: 'center', border: tier.reached ? '1px solid var(--gold)' : '1px solid var(--card-border)', background: tier.reached ? 'rgba(201,168,76,0.04)' : '#fff' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '22px', fontWeight: 700, color: tier.reached ? 'var(--gold)' : 'var(--text-muted)', marginBottom: '4px' }}>{tier.discount}</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)' }}>{tier.clients} clients</div>
                  {tier.reached && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 600, color: 'var(--gold)', marginTop: '6px', letterSpacing: '0.5px' }}>EARNED</div>}
                </div>
              ))}
            </div>

            {/* Past clients list */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Past Clients Status</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)' }}>{clients.length} total clients</span>
              </div>
              {clients.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>No clients added yet</div>
                  <button onClick={() => setActiveTab('clients')} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--dark)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Add your first client →</button>
                </div>
              ) : clients.map((client: any, idx: number) => (
                <div key={client.id} style={{ padding: '14px 20px', borderBottom: idx < clients.length - 1 ? '1px solid var(--card-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{client.name}</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{client.phone}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {client.invited ? (
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: '#16A34A', background: 'rgba(22,163,74,0.08)', padding: '3px 8px', borderRadius: '4px' }}>Joined</span>
                    ) : (
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', background: '#F3F4F6', padding: '3px 8px', borderRadius: '4px' }}>Not joined</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Invite CTA */}
            <div style={{ background: '#0F1117', borderRadius: '10px', padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>Invite your past clients to The Dream Wedding</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Share your unique link. Every couple who joins and enquires counts toward your discount.</div>
              </div>
              <button onClick={() => {
                const link = `https://thedreamwedding.in/join?ref=${vendorData?.id || ''}`;
                navigator.clipboard.writeText(link);
                toast.success('Invite link copied to clipboard');
              }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: '#0F1117', background: 'var(--gold)', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '24px' }}>
                Copy Invite Link
              </button>
            </div>
          </div>
        )}
      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '32px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', fontWeight: 600, color: 'var(--dark)', marginBottom: '8px' }}>Delete {confirmDelete.name}?</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginBottom: '24px', lineHeight: 1.6 }}>This action cannot be undone.</div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--dark)', background: '#F3F4F6', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.type, confirmDelete.id)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#fff', background: '#DC2626', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* Toast notifications */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: t.type === 'success' ? '#0F1117' : t.type === 'error' ? '#DC2626' : '#1D4ED8',
            color: '#fff', padding: '12px 18px', borderRadius: '8px',
            fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500,
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            minWidth: '280px', maxWidth: '380px',
            animation: 'slideIn 0.2s ease',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.type === 'success' ? '#C9A84C' : '#fff', flexShrink: 0 }} />
            {t.msg}
          </div>
        ))}
      </div>
      {/* Coming Soon Modal */}
      <ComingSoonModal tab={comingSoonTab} onClose={() => setComingSoonTab(null)} />

    </div>
  );
}
