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
  Navigation, Upload, ArrowDownCircle, Shield, Search, Printer,
  Award, Layers, MessageSquare, Sunrise, Box, Camera,
  MapPin, ThumbsUp, Clipboard, UserCheck, Eye
} from 'react-feather';

const API = 'https://dream-wedding-production-89ae.up.railway.app/api';

// ── Sidebar tabs ────────────────────────────────────────────────
const SIDEBAR_SECTIONS = [
  { title: 'Overview', tabs: [
    { id: 'overview', label: 'Overview', icon: Grid },
  ]},
  { title: 'Daily Operations', tabs: [
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'inquiries', label: 'Inquiries', icon: MessageCircle },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'availability', label: 'Availability Calendar', icon: Calendar },
    { id: 'templates', label: 'Message Templates', icon: MessageCircle },
  ]},
  { title: 'Finance', tabs: [
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'payments', label: 'Payment Schedules', icon: CreditCard },
    { id: 'outstanding', label: 'Outstanding Payments', icon: DollarSign },
    { id: 'expenses', label: 'Expense Tracker', icon: MinusCircle },
    { id: 'profit', label: 'Profit per Booking', icon: Target },
    { id: 'cash', label: 'Cash Payments', icon: DollarSign },
    { id: 'tax', label: 'Tax & Finance', icon: Percent },
    { id: 'advancetax', label: 'Advance Tax', icon: BookOpen },
    { id: 'forecast', label: 'Revenue Forecast', icon: TrendingUp },
    { id: 'paymentshield', label: 'Payment Shield', icon: Shield },
  ]},
  { title: 'Planning', tabs: [
    { id: 'contracts', label: 'Contracts', icon: FileText },
    { id: 'packages', label: 'Package Builder', icon: Package },
    { id: 'timeline', label: 'Client Timeline', icon: Activity },
    { id: 'delivery', label: 'Delivery Tracker', icon: Truck },
    { id: 'runsheet', label: 'Day-of Runsheet', icon: List },
    { id: 'checklist', label: 'Pre-Wedding Checklist', icon: CheckSquare },
    { id: 'equipment', label: 'Equipment Checklist', icon: Tool },
  ]},
  { title: 'Growth', tabs: [
    { id: 'referral', label: 'Referral Tracker', icon: Gift },
    { id: 'whatsapp', label: 'WhatsApp Broadcast', icon: Send },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'portal', label: 'Client Portal', icon: Share2 },
    { id: 'csvimport', label: 'Import / Export', icon: Upload },
  ]},
  { title: 'Account', tabs: [
    { id: 'team', label: 'My Team', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]},
];

const ACTIVE_TABS = SIDEBAR_SECTIONS.flatMap(s => s.tabs);

const COMING_SOON_TABS = [

  { id: 'spotlight', label: 'Spotlight Auction', icon: TrendingUp, build: 'Build 2', desc: 'Bid for Spotlight positions 4-10 at Rs.999/month. Top 3 always earned by algorithm — never sold.' },

  { id: 'tasks', label: 'Team Tasks', icon: CheckSquare, build: 'Build 2', desc: 'Assign tasks to team members per booking. Set deadlines, track completion, get photo confirmation.' },
  { id: 'ai', label: 'AI Brief Generator', icon: Cpu, build: 'Build 3', desc: 'Auto-generates a complete creative brief from the couple profile at the moment of booking. Zero briefing calls needed.' },
  { id: 'pricing', label: 'Pricing Intelligence', icon: TrendingUp, build: 'Build 3', desc: 'Dynamic pricing recommendations based on demand patterns, competitor rates and your booking velocity.' },
  { id: 'location', label: 'Team Location', icon: Map, build: 'Build 3', desc: 'Real-time opt-in location sharing for your team during active events. For event managers coordinating large teams.' },
];

// ── Deluxe Suite Tabs ───────────────────────────────────────────
const DELUXE_SUITE_TABS = [
  { id: 'ds-event-dashboard', label: 'Event Dashboard', icon: Layers, desc: 'Your command centre. One view per booking — team, tasks, procurement, deliveries, payments, timeline. Everything in one place.' },
  { id: 'ds-team-hub', label: 'Team Hub', icon: Users, desc: 'Manage your entire workforce. Add members, assign roles, set permissions, track workload and availability across all events.' },
  { id: 'ds-team-chat', label: 'Team Chat', icon: MessageSquare, desc: 'Event-based group chats, direct messaging, and owner broadcasts. Your team communication lives here — not on WhatsApp.' },
  { id: 'ds-daily-briefing', label: 'Daily Briefing', icon: Sunrise, desc: 'Auto-generated morning overview. Active events, overdue tasks, upcoming trials, pending deliveries, outstanding payments — one glance.' },
  { id: 'ds-procurement', label: 'Procurement Tracker', icon: Box, desc: 'Track every order and purchase across events. Status from ordered to verified, linked to bookings and team members.' },
  { id: 'ds-deliveries', label: 'Delivery Tracker', icon: Truck, desc: 'Monitor all outgoing deliveries. Preparing to dispatched to delivered to client confirmed. Never miss a handoff.' },
  { id: 'ds-trials', label: 'Trial Schedule', icon: Calendar, desc: 'Fittings, consultations, tastings, walkthroughs — all scheduled, assigned, and tracked. Confirm or reschedule in one tap.' },
  { id: 'ds-photo-approvals', label: 'Photo Approvals', icon: Camera, desc: 'Your team uploads deliverables. You review and approve from your desk. Edited photos, video cuts, design renders — all in queue.' },
  { id: 'ds-checkin', label: 'Check-in Tracker', icon: MapPin, desc: 'Event day attendance. Team members check in on arrival. See who is on-site, who is en route. No more "where are you" messages.' },
  { id: 'ds-sentiment', label: 'Client Sentiment', icon: ThumbsUp, desc: 'After every milestone, your team logs client mood. Spot concerns before they escalate. Critical for luxury clients who talk.' },
  { id: 'ds-templates', label: 'Delegation Templates', icon: Clipboard, desc: 'Pre-built task bundles for event types. Select a template, apply to a booking — 30+ tasks auto-created with deadlines and assignees.' },
  { id: 'ds-performance', label: 'Team Performance', icon: UserCheck, desc: 'Weekly scorecard per team member. Tasks on time, overdue count, response time. See who delivers and who needs support.' },
];

// ── Tier Access Logic ────────────────────────────────────────────
const TIER_LEVEL: Record<string, number> = { essential: 1, signature: 2, prestige: 3 };

const TAB_TIER: Record<string, string> = {
  // Essential (all vendors)
  'overview': 'essential', 'clients': 'essential', 'inquiries': 'essential',
  'calendar': 'essential', 'availability': 'essential', 'templates': 'essential',
  'invoices': 'essential', 'contracts': 'essential', 'runsheet': 'essential',
  'checklist': 'essential', 'equipment': 'essential', 'packages': 'essential',
  // Signature
  'payments': 'signature', 'outstanding': 'signature', 'expenses': 'signature',
  'profit': 'signature', 'cash': 'signature', 'tax': 'signature',
  'advancetax': 'signature', 'forecast': 'signature', 'paymentshield': 'signature',
  'referral': 'signature', 'csvimport': 'signature', 'team': 'signature',
  'delivery': 'signature', 'timeline': 'signature',
  'whatsapp': 'signature', 'analytics': 'signature', 'portal': 'signature',
  // Prestige (Deluxe Suite)
  'ds-event-dashboard': 'prestige', 'ds-team-hub': 'prestige', 'ds-team-chat': 'prestige',
  'ds-daily-briefing': 'prestige', 'ds-procurement': 'prestige', 'ds-deliveries': 'prestige',
  'ds-trials': 'prestige', 'ds-photo-approvals': 'prestige', 'ds-checkin': 'prestige',
  'ds-sentiment': 'prestige', 'ds-templates': 'prestige', 'ds-performance': 'prestige',
};

function hasTabAccess(tier: string, tabId: string): boolean {
  const required = TAB_TIER[tabId] || 'essential';
  return (TIER_LEVEL[tier] || 1) >= (TIER_LEVEL[required] || 1);
}

// ── Deluxe Suite Preview Modal (for non-VV vendors) ─────────────
function DeluxeSuiteModal({ tab, onClose }: { tab: any; onClose: () => void }) {
  if (!tab) return null;
  const Icon = tab.icon;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }} onClick={onClose}>
      <div style={{
        background: '#0F1117',
        borderRadius: '20px',
        padding: '48px',
        maxWidth: '520px',
        width: '100%',
        border: '1px solid rgba(201,168,76,0.25)',
        position: 'relative',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        {/* Gold gradient accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
        }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px',
        }}>
          <div style={{
            width: '52px', height: '52px',
            borderRadius: '13px',
            background: 'rgba(201,168,76,0.1)',
            border: '1px solid rgba(201,168,76,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={22} color="#C9A84C" />
          </div>
          <div>
            <div style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '9px',
              fontWeight: 500,
              color: '#C9A84C',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}>
              Deluxe Suite
            </div>
            <h3 style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '20px',
              fontWeight: 500,
              color: '#F5F0E8',
              margin: 0,
            }}>
              {tab.label}
            </h3>
          </div>
        </div>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          fontWeight: 300,
          color: '#8C7B6E',
          lineHeight: 1.8,
          marginBottom: '32px',
        }}>
          {tab.desc}
        </p>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          marginBottom: '28px',
          padding: '12px 16px',
          background: 'rgba(201,168,76,0.06)',
          borderRadius: '10px',
          border: '1px solid rgba(201,168,76,0.12)',
        }}>
          <Award size={14} color="#C9A84C" />
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 400,
            color: '#C9A84C',
          }}>
            Available exclusively on the Deluxe plan
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            color: '#8C7B6E',
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 500,
            letterSpacing: '0.5px',
            padding: '14px 24px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
          }}>
            Close
          </button>
          <button onClick={onClose} style={{
            flex: 1,
            background: 'linear-gradient(135deg, #C9A84C, #B8963A)',
            color: '#0F1117',
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            padding: '14px 24px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
          }}>
            Upgrade to Deluxe
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [deluxeSuiteTab, setDeluxeSuiteTab] = useState<any>(null);

  // Deluxe Suite states
  const [dsTeam, setDsTeam] = useState<any[]>([]);
  const [dsTasks, setDsTasks] = useState<any[]>([]);
  const [dsTaskStats, setDsTaskStats] = useState<any>({ total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0 });
  const [dsMessages, setDsMessages] = useState<any[]>([]);
  const [dsProcurement, setDsProcurement] = useState<any[]>([]);
  const [dsDeliveries, setDsDeliveries] = useState<any[]>([]);
  const [dsTrials, setDsTrials] = useState<any[]>([]);
  const [dsPhotos, setDsPhotos] = useState<any[]>([]);
  const [dsCheckins, setDsCheckins] = useState<any[]>([]);
  const [dsSentiment, setDsSentiment] = useState<any[]>([]);
  const [dsTemplates, setDsTemplates] = useState<any[]>([]);
  const [dsBriefing, setDsBriefing] = useState<any>(null);
  const [dsPerformance, setDsPerformance] = useState<any[]>([]);
  const [dsChatChannel, setDsChatChannel] = useState('general');
  const [dsChatInput, setDsChatInput] = useState('');
  const [dsTaskFilter, setDsTaskFilter] = useState('all');
  const [dsShowTaskForm, setDsShowTaskForm] = useState(false);
  const [dsShowTeamForm, setDsShowTeamForm] = useState(false);
  const [dsShowProcForm, setDsShowProcForm] = useState(false);
  const [dsShowDeliveryForm, setDsShowDeliveryForm] = useState(false);
  const [dsShowTrialForm, setDsShowTrialForm] = useState(false);
  const [dsShowPhotoForm, setDsShowPhotoForm] = useState(false);
  const [dsShowCheckinForm, setDsShowCheckinForm] = useState(false);
  const [dsShowSentimentForm, setDsShowSentimentForm] = useState(false);
  const [dsShowTemplateForm, setDsShowTemplateForm] = useState(false);
  const [dsNewTeam, setDsNewTeam] = useState({ name: '', email: '', phone: '', role: 'staff' });
  const [dsNewTask, setDsNewTask] = useState({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '', related_client_name: '', category: 'general' });
  const [dsNewProc, setDsNewProc] = useState({ item_name: '', vendor_supplier: '', expected_date: '', cost: '', assigned_to: '', related_client_name: '', notes: '' });
  const [dsNewDelivery, setDsNewDelivery] = useState({ item_name: '', delivery_date: '', assigned_to: '', related_client_name: '', notes: '' });
  const [dsNewTrial, setDsNewTrial] = useState({ client_name: '', trial_type: 'consultation', scheduled_date: '', assigned_to: '', notes: '' });
  const [dsNewPhoto, setDsNewPhoto] = useState({ file_url: '', title: '', related_client_name: '', uploader_name: '' });
  const [dsNewCheckin, setDsNewCheckin] = useState({ member_id: '', member_name: '', related_client_name: '', notes: '' });
  const [dsNewSentiment, setDsNewSentiment] = useState({ client_name: '', milestone: '', rating: 'happy', logger_name: '', notes: '' });
  const [dsNewTemplate, setDsNewTemplate] = useState({ template_name: '', event_type: 'wedding', tasks: '[]' });
  const [dsEventView, setDsEventView] = useState<string | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [referralLink, setReferralLink] = useState('');
  const [vendorData, setVendorData] = useState<any>(null);
  const [vendorTier, setVendorTier] = useState<'essential' | 'signature' | 'prestige'>('essential');
  const [foundingBadge, setFoundingBadge] = useState(false);
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
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [contractFilter, setContractFilter] = useState('all');
  const [expenseFilter, setExpenseFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ 'Overview': false, 'Daily Operations': false, 'Finance': false, 'Planning': false, 'Growth': false, 'Account': false, 'Essential Tools': false, 'Signature': false, 'Deluxe Suite': false, 'Client Management': false, 'Calendar & Planning': false, 'Team & Packages': false, 'Coming Soon': false });

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
  const [interestAmount, setInterestAmount] = useState('');
  const [interestRate, setInterestRate] = useState('18');
  const [interestDays, setInterestDays] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [savingBusiness, setSavingBusiness] = useState(false);
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
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [editContractData, setEditContractData] = useState<any>({});
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseData, setEditExpenseData] = useState<any>({});
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

  // Deluxe Suite data loaders
  const loadDsTeam = async () => { try { const r = await fetch(`${API}/ds/team/${vendorData.id}`); const d = await r.json(); if (d.success) setDsTeam(d.data); } catch(e) {} };
  const loadDsTasks = async () => { try { const r = await fetch(`${API}/ds/tasks/${vendorData.id}`); const d = await r.json(); if (d.success) setDsTasks(d.data); } catch(e) {} };
  const loadDsTaskStats = async () => { try { const r = await fetch(`${API}/ds/tasks/${vendorData.id}/stats`); const d = await r.json(); if (d.success) setDsTaskStats(d.data); } catch(e) {} };
  const loadDsMessages = async (channel?: string) => { try { const ch = channel || dsChatChannel; const r = await fetch(`${API}/ds/messages/${vendorData.id}?channel_id=${ch}`); const d = await r.json(); if (d.success) setDsMessages(d.data); } catch(e) {} };
  const loadDsProcurement = async () => { try { const r = await fetch(`${API}/ds/procurement/${vendorData.id}`); const d = await r.json(); if (d.success) setDsProcurement(d.data); } catch(e) {} };
  const loadDsDeliveries = async () => { try { const r = await fetch(`${API}/ds/deliveries/${vendorData.id}`); const d = await r.json(); if (d.success) setDsDeliveries(d.data); } catch(e) {} };
  const loadDsTrials = async () => { try { const r = await fetch(`${API}/ds/trials/${vendorData.id}`); const d = await r.json(); if (d.success) setDsTrials(d.data); } catch(e) {} };
  const loadDsPhotos = async () => { try { const r = await fetch(`${API}/ds/photos/${vendorData.id}`); const d = await r.json(); if (d.success) setDsPhotos(d.data); } catch(e) {} };
  const loadDsCheckins = async () => { try { const r = await fetch(`${API}/ds/checkins/${vendorData.id}`); const d = await r.json(); if (d.success) setDsCheckins(d.data); } catch(e) {} };
  const loadDsSentiment = async () => { try { const r = await fetch(`${API}/ds/sentiment/${vendorData.id}`); const d = await r.json(); if (d.success) setDsSentiment(d.data); } catch(e) {} };
  const loadDsTemplates = async () => { try { const r = await fetch(`${API}/ds/templates/${vendorData.id}`); const d = await r.json(); if (d.success) setDsTemplates(d.data); } catch(e) {} };
  const loadDsBriefing = async () => { try { const r = await fetch(`${API}/ds/briefing/${vendorData.id}`); const d = await r.json(); if (d.success) setDsBriefing(d.data); } catch(e) {} };
  const loadDsPerformance = async () => { try { const r = await fetch(`${API}/ds/performance/${vendorData.id}`); const d = await r.json(); if (d.success) setDsPerformance(d.data); } catch(e) {} };

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
      if (activeTab === 'referral') { loadClients(); if (vendorData?.id) fetch(`${API}/referral-code/${vendorData.id}`).then(r => r.json()).then(d => { if (d.success) setReferralLink(`https://thedreamwedding.in/ref/${d.data.code}`); }).catch(() => {}); }
      if (activeTab === 'whatsapp') loadClients();
      if (activeTab === 'analytics') { loadBookings(); loadInvoices(); loadExpenses(); }
      if (activeTab === 'portal') loadClients();
      if (activeTab === 'ds-team-hub') loadDsTeam();
      if (activeTab === 'ds-event-dashboard') { loadDsTasks(); loadDsTaskStats(); loadDsTeam(); }
      if (activeTab === 'ds-team-chat') loadDsMessages();
      if (activeTab === 'ds-daily-briefing') loadDsBriefing();
      if (activeTab === 'ds-procurement') loadDsProcurement();
      if (activeTab === 'ds-deliveries') loadDsDeliveries();
      if (activeTab === 'ds-trials') loadDsTrials();
      if (activeTab === 'ds-photo-approvals') loadDsPhotos();
      if (activeTab === 'ds-checkin') loadDsCheckins();
      if (activeTab === 'ds-sentiment') loadDsSentiment();
      if (activeTab === 'ds-templates') loadDsTemplates();
      if (activeTab === 'ds-performance') { loadDsPerformance(); loadDsTeam(); }
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

  const handleSaveBusinessDetails = async () => {
    try {
      setSavingBusiness(true);
      const res = await fetch(`${API}/vendors/${vendorData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gst_number: gstNumber,
          bank_name: bankName,
          bank_account: bankAccount,
          bank_ifsc: bankIfsc,
          bank_holder: bankHolder,
        }),
      });
      const data = await res.json();
      if (data.success) toast.success('Business details saved');
      else toast.error('Could not save business details');
    } catch (e) { toast.error('Could not save business details'); }
    finally { setSavingBusiness(false); }
  };

  const handleSaveContractEdit = async (id: string) => {
    try {
      const res = await fetch(`${API}/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editContractData),
      });
      const data = await res.json();
      if (data.success) { toast.success('Contract updated'); setEditingContractId(null); loadContracts(); }
      else { toast.error('Could not update contract'); }
    } catch (e) { toast.error('Could not update contract'); }
  };

  const handleSaveExpenseEdit = async (id: string) => {
    try {
      const res = await fetch(`${API}/expenses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editExpenseData),
      });
      const data = await res.json();
      if (data.success) { toast.success('Expense updated'); setEditingExpenseId(null); loadExpenses(); }
      else { toast.error('Could not update expense'); }
    } catch (e) { toast.error('Could not update expense'); }
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
      let session: any = {};
      try {
        const ls = localStorage.getItem('vendor_web_session') || localStorage.getItem('vendor_session') || sessionStorage.getItem('vendor_session') || '{}';
        session = JSON.parse(ls);
      } catch(e) {}
      const isDemo = window.location.href.includes('demo=1') || window.location.href.includes('/vendor/demo');
      if (isDemo || !session.vendorId) {
        session = { vendorId: '20792c76-b265-4063-a356-133ea1c6933b', vendorName: 'Dev Roy Productions', category: 'content-creators', city: 'Delhi NCR', plan: 'premium' };
      }
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
        setGstNumber(vendor.gst_number || '');
        setBankName(vendor.bank_name || '');
        setBankAccount(vendor.bank_account || '');
        setBankIfsc(vendor.bank_ifsc || '');
        setBankHolder(vendor.bank_holder || '');
        loadBookings(vendor.id);
        loadInvoices(vendor.id);
        loadClients(vendor.id);
        loadPayments(vendor.id);
        loadExpenses(vendor.id);
        // Load subscription tier + founding badge
        try {
          const webSession = JSON.parse(localStorage.getItem('vendor_web_session') || '{}');
          if (webSession.tier && ['essential', 'signature', 'prestige'].includes(webSession.tier)) {
            setVendorTier(webSession.tier as any);
          }
        } catch(e) {}
        if (!isDemo) {
          try {
            const tierRes = await fetch(`${API}/subscriptions/${vendor.id}`);
            const tierData = await tierRes.json();
            if (tierData.success && tierData.data?.tier) setVendorTier(tierData.data.tier as any);
            if (tierData.success && tierData.data?.founding_badge) setFoundingBadge(true);
          } catch(e) {}
        }
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
    if (!clientName || !clientPhone) { toast.error('Please fill name and phone'); return; }
    if (clientDate) {
      const duplicate = clients.find((c: any) => c.wedding_date === clientDate);
      if (duplicate) {
        toast.error(`⚠️ ${duplicate.name} is already booked on ${clientDate}`);
        return;
      }
    }
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

  const exportToCSV = (data: any[], filename: string, columns: {key: string, label: string}[]) => {
    const header = columns.map(c => c.label).join(',');
    const rows = data.map(row => columns.map(c => {
      const val = String(row[c.key] || '').replace(/,/g, ' ');
      return '"' + val + '"';
    }).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename + '.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = (title: string) => {
    const el = document.querySelector('main');
    if (!el) return;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write('<html><head><title>' + title + '</title>');
      w.document.write('<style>body{font-family:Inter,sans-serif;padding:40px;color:#2C2420}button,nav,aside{display:none!important}</style>');
      w.document.write('</head><body>');
      w.document.write('<h1 style="font-size:14px;color:#8C7B6E;letter-spacing:3px">THE DREAM WEDDING</h1>');
      w.document.write('<h2 style="font-size:22px;margin-bottom:24px">' + title + '</h2>');
      w.document.write(el.innerHTML);
      w.document.write('</body></html>');
      w.document.close();
      w.print();
    }
  };

  const filterPill = (active: boolean): React.CSSProperties => ({
    padding: '6px 16px', borderRadius: '50px',
    border: active ? '1px solid var(--gold)' : '1px solid var(--card-border)',
    background: active ? 'rgba(201,168,76,0.08)' : 'transparent',
    cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px',
    fontWeight: active ? 500 : 400, color: active ? 'var(--gold)' : 'var(--text-muted)',
  });

  const actionBtnSmall: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--card-border)',
    background: '#fff', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
    fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)',
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
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {!sidebarCollapsed && (
            <div style={{ padding: '8px 16px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 12px' }}>
                <Search size={13} color="var(--grey)" />
                <input value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)} placeholder="Search tools..." style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--cream)', width: '100%' }} />
                {sidebarSearch && <button onClick={() => setSidebarSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X size={12} color="var(--grey)" /></button>}
              </div>
            </div>
          )}
          {/* ── TIER-AWARE SIDEBAR ── */}
          {(() => {
            const essentialTabs = [
              { id: 'overview', label: 'Overview', icon: Grid },
              { id: 'clients', label: 'Clients', icon: Users },
              { id: 'inquiries', label: 'Inquiries', icon: MessageCircle },
              { id: 'calendar', label: 'Calendar', icon: Calendar },
              { id: 'availability', label: 'Availability', icon: Calendar },
              { id: 'templates', label: 'Message Templates', icon: MessageCircle },
              { id: 'invoices', label: 'Invoices', icon: FileText },
              { id: 'contracts', label: 'Contracts', icon: FileText },
              { id: 'runsheet', label: 'Day-of Runsheet', icon: List },
              { id: 'checklist', label: 'Pre-Wedding Checklist', icon: CheckSquare },
              { id: 'equipment', label: 'Equipment Checklist', icon: Tool },
              { id: 'packages', label: 'Package Builder', icon: Package },
            ];
            const signatureSections = [
              { title: 'Client Management', tabs: [
                { id: 'overview', label: 'Overview', icon: Grid },
                { id: 'clients', label: 'Clients', icon: Users },
                { id: 'inquiries', label: 'Inquiries', icon: MessageCircle },
                { id: 'portal', label: 'Client Portal', icon: Share2 },
                { id: 'timeline', label: 'Client Timeline', icon: Activity },
                { id: 'templates', label: 'Message Templates', icon: MessageCircle },
              ]},
              { title: 'Calendar & Planning', tabs: [
                { id: 'calendar', label: 'Calendar', icon: Calendar },
                { id: 'availability', label: 'Availability', icon: Calendar },
                { id: 'runsheet', label: 'Day-of Runsheet', icon: List },
                { id: 'checklist', label: 'Pre-Wedding Checklist', icon: CheckSquare },
                { id: 'equipment', label: 'Equipment Checklist', icon: Tool },
              ]},
              { title: 'Finance', tabs: [
                { id: 'invoices', label: 'Invoices', icon: FileText },
                { id: 'payments', label: 'Payment Schedules', icon: CreditCard },
                { id: 'outstanding', label: 'Outstanding Payments', icon: DollarSign },
                { id: 'expenses', label: 'Expense Tracker', icon: MinusCircle },
                { id: 'profit', label: 'Profit per Booking', icon: Target },
                { id: 'cash', label: 'Cash Payments', icon: DollarSign },
                { id: 'tax', label: 'Tax & Finance', icon: Percent },
                { id: 'advancetax', label: 'Advance Tax', icon: BookOpen },
                { id: 'forecast', label: 'Revenue Forecast', icon: TrendingUp },
                { id: 'paymentshield', label: 'Payment Shield', icon: Shield },
              ]},
              { title: 'Growth', tabs: [
                { id: 'referral', label: 'Referral Tracker', icon: Gift },
                { id: 'whatsapp', label: 'WhatsApp Broadcast', icon: Send },
                { id: 'analytics', label: 'Analytics', icon: BarChart2 },
                { id: 'csvimport', label: 'Import / Export', icon: Upload },
              ]},
              { title: 'Team & Packages', tabs: [
                { id: 'team', label: 'My Team', icon: Users },
                { id: 'packages', label: 'Package Builder', icon: Package },
                { id: 'delivery', label: 'Delivery Tracker', icon: Truck },
                { id: 'contracts', label: 'Contracts', icon: FileText },
              ]},
            ];
            const dsSection = { title: 'Deluxe Suite', tabs: DELUXE_SUITE_TABS.map(t => ({ id: t.id, label: t.label, icon: t.icon })) };
            const accountSection = { title: 'Account', tabs: [{ id: 'settings', label: 'Settings', icon: Settings }] };
            const comingSoonSection = { title: 'Coming Soon', tabs: COMING_SOON_TABS.map(t => ({ id: t.id, label: t.label, icon: t.icon, build: t.build })) };

            // Build section rendering helper
            const renderSection = (section: any, opts?: { locked?: boolean; gold?: boolean; collapsed?: boolean }) => {
              const isOpen = openSections[section.title] === true;
              const filteredTabs = section.tabs.filter((tab: any) => !sidebarSearch || tab.label.toLowerCase().includes(sidebarSearch.toLowerCase()));
              if (sidebarSearch && filteredTabs.length === 0) return null;
              return (
                <div key={section.title} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <button onClick={() => setOpenSections(prev => ({ ...prev, [section.title]: !isOpen }))} style={{
                    display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
                    padding: '10px 24px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}>
                    {opts?.gold && <Award size={9} color="#C9A84C" />}
                    <span style={{
                      fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 500,
                      letterSpacing: '1.5px', textTransform: 'uppercase', flex: 1,
                      color: opts?.gold ? 'rgba(201,168,76,0.7)' : opts?.locked ? 'rgba(140,123,110,0.4)' : 'rgba(140,123,110,0.6)',
                    }}>{section.title}</span>
                    {opts?.locked && !sidebarCollapsed && <Lock size={8} color="#8C7B6E" />}
                    {!sidebarCollapsed && <ChevronDown size={10} color="rgba(140,123,110,0.3)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
                  </button>
                  {isOpen && filteredTabs.map((tab: any) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const tabLocked = opts?.locked || !hasTabAccess(vendorTier, tab.id);
                    return (
                      <button key={tab.id} onClick={() => {
                        if (opts?.locked && opts.gold) setDeluxeSuiteTab(DELUXE_SUITE_TABS.find(t => t.id === tab.id) || tab);
                        else if (tabLocked) {
                          const req = TAB_TIER[tab.id] || 'signature';
                          setDeluxeSuiteTab({ ...tab, desc: `This feature is available on the ${req.charAt(0).toUpperCase() + req.slice(1)} plan. Upgrade to unlock.` });
                        } else setActiveTab(tab.id);
                      }} style={{
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                        padding: '9px 24px 9px 36px', background: isActive ? 'rgba(201,168,76,0.1)' : 'transparent',
                        borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
                        border: 'none', borderRadius: 0, cursor: 'pointer', textAlign: 'left',
                        opacity: tabLocked ? 0.4 : 1,
                      }}>
                        <Icon size={13} color={isActive ? (opts?.gold ? '#C9A84C' : 'var(--gold)') : opts?.gold ? 'rgba(201,168,76,0.4)' : 'var(--grey)'} />
                        <span style={{
                          fontFamily: 'Inter, sans-serif', fontSize: '12px',
                          fontWeight: isActive ? 500 : 300, flex: 1,
                          color: isActive ? (opts?.gold ? '#C9A84C' : 'var(--gold)') : opts?.gold ? 'rgba(201,168,76,0.5)' : 'var(--grey)',
                        }}>{!sidebarCollapsed && tab.label}</span>
                        {tabLocked && !sidebarCollapsed && <Lock size={9} color={opts?.gold ? '#C9A84C' : '#8C7B6E'} />}
                        {!tabLocked && opts?.gold && !sidebarCollapsed && <Award size={9} color={isActive ? '#C9A84C' : 'rgba(201,168,76,0.35)'} />}
                      </button>
                    );
                  })}
                </div>
              );
            };

            // ESSENTIAL TIER SIDEBAR
            if (vendorTier === 'essential') return (<>
              {renderSection({ title: 'Essential Tools', tabs: essentialTabs })}
              {renderSection({ title: 'Signature', tabs: [...signatureSections.flatMap(s => s.tabs.filter(t => !essentialTabs.find(e => e.id === t.id)))] }, { locked: true })}
              {renderSection(dsSection, { locked: true, gold: true })}
              {renderSection(accountSection)}
              {comingSoonSection.tabs.length > 0 && renderSection(comingSoonSection, { locked: true })}
            </>);

            // SIGNATURE TIER SIDEBAR
            if (vendorTier === 'signature') return (<>
              {signatureSections.map(s => renderSection(s))}
              {renderSection(dsSection, { locked: true, gold: true })}
              {renderSection(accountSection)}
              {comingSoonSection.tabs.length > 0 && renderSection(comingSoonSection, { locked: true })}
            </>);

            // PRESTIGE TIER SIDEBAR
            return (<>
              {renderSection(dsSection, { gold: true })}
              {signatureSections.map(s => renderSection(s))}
              {renderSection(accountSection)}
              {comingSoonSection.tabs.length > 0 && renderSection(comingSoonSection, { locked: true })}
            </>);
          })()}
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
              {foundingBadge && <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#C9A84C', marginLeft: '8px', verticalAlign: 'middle', boxShadow: '0 0 0 2px rgba(201,168,76,0.2)' }} title="Founding Vendor" />}

            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <p style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
                fontWeight: 300,
                color: 'var(--grey)',
                margin: 0,
              }}>
                {vendorData?.category?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                {vendorData?.city ? ` · ${vendorData.city}` : ''}
              </p>
              <span style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                padding: '3px 10px',
                borderRadius: '50px',
                background: vendorTier === 'prestige' ? '#2C2420' : vendorTier === 'signature' ? 'rgba(201,168,76,0.1)' : 'rgba(140,123,110,0.08)',
                color: vendorTier === 'prestige' ? '#C9A84C' : vendorTier === 'signature' ? '#C9A84C' : '#8C7B6E',
                border: vendorTier === 'prestige' ? '1px solid rgba(201,168,76,0.3)' : vendorTier === 'signature' ? '1px solid rgba(201,168,76,0.25)' : '1px solid rgba(140,123,110,0.15)',
              }}>
                {vendorTier === 'prestige' ? 'Prestige' : vendorTier === 'signature' ? 'Signature' : 'Essential'}
              </span>
            </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Invoices</h2>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['all', 'paid', 'unpaid'].map(f => (
                    <button key={f} style={filterPill(invoiceFilter === f)} onClick={() => setInvoiceFilter(f)}>
                      {f === 'all' ? 'All' : f === 'paid' ? 'Paid' : 'Unpaid'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {hasTabAccess(vendorTier, 'payments') ? (<><button style={actionBtnSmall} onClick={() => exportToCSV(invoices, 'TDW_Invoices', [{key:'client_name',label:'Client'},{key:'amount',label:'Amount'},{key:'status',label:'Status'},{key:'invoice_number',label:'Invoice #'}])}><Download size={12} /> Export</button><button style={actionBtnSmall} onClick={() => handlePrint('Invoices')}><Printer size={12} /> Print</button></>) : (<button style={{ ...actionBtnSmall, opacity: 0.4, cursor: 'not-allowed' }} title="Upgrade to Signature"><Lock size={10} /> Export</button>)}
                <button style={goldBtn} onClick={() => setShowInvoiceForm(!showInvoiceForm)}>
                <Plus size={14} />
                {showInvoiceForm ? 'Cancel' : 'New Invoice'}
              </button>
              </div>
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
                {invAmount && hasTabAccess(vendorTier, 'tax') && (
                  <div style={{ background: 'var(--cream)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px', display: 'flex', gap: '24px' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', fontWeight: 300 }}>
                      GST (18%): <strong style={{ color: 'var(--dark)' }}>Rs.{(parseInt(invAmount) * 0.18).toLocaleString('en-IN')}</strong>
                    </span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', fontWeight: 300 }}>
                      Total: <strong style={{ color: 'var(--dark)' }}>Rs.{(parseInt(invAmount) * 1.18).toLocaleString('en-IN')}</strong>
                    </span>
                  </div>
                )}
                {invAmount && !hasTabAccess(vendorTier, 'tax') && (
                  <div style={{ background: 'rgba(140,123,110,0.04)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px', border: '1px dashed rgba(140,123,110,0.2)' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--grey)' }}>GST invoicing available on the Signature plan</span>
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
                  <div key={con.id}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '18px 24px',
                    borderBottom: editingContractId === con.id ? 'none' : (i < contracts.length - 1 ? '1px solid var(--border)' : 'none'),
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
                      <button onClick={() => { setEditingContractId(con.id); setEditContractData({ client_name: con.client_name, event_type: con.event_type, event_date: con.event_date, venue: con.venue, total_amount: con.total_amount }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }} title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete({ type: 'contract', id: con.id, name: `Contract — ${con.client_name}` })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {editingContractId === con.id && (
                    <div style={{ margin: '0 24px 16px', padding: '16px', background: '#F9FAFB', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div><label style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Client Name</label><input style={inp} value={editContractData.client_name || ''} onChange={e => setEditContractData((p:any) => ({ ...p, client_name: e.target.value }))} /></div>
                        <div><label style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Event Type</label><input style={inp} value={editContractData.event_type || ''} onChange={e => setEditContractData((p:any) => ({ ...p, event_type: e.target.value }))} /></div>
                        <div><label style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Event Date</label><input style={inp} value={editContractData.event_date || ''} onChange={e => setEditContractData((p:any) => ({ ...p, event_date: e.target.value }))} /></div>
                        <div><label style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Total Amount</label><input style={inp} type="number" value={editContractData.total_amount || ''} onChange={e => setEditContractData((p:any) => ({ ...p, total_amount: parseInt(e.target.value) }))} /></div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingContractId(null)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--dark)', background: '#E5E7EB', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => handleSaveContractEdit(con.id)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: '#fff', background: 'var(--dark)', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer' }}>Save Changes</button>
                      </div>
                    </div>
                  )}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Payment Schedules</h2>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['all', 'overdue', 'upcoming'].map(f => (
                    <button key={f} style={filterPill(paymentFilter === f)} onClick={() => setPaymentFilter(f)}>
                      {f === 'all' ? 'All' : f === 'overdue' ? 'Overdue' : 'Upcoming'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {hasTabAccess(vendorTier, 'payments') ? (<><button style={actionBtnSmall} onClick={() => exportToCSV(paymentSchedules, 'TDW_Payments', [{key:'client_name',label:'Client'},{key:'total_amount',label:'Total'},{key:'client_phone',label:'Phone'}])}><Download size={12} /> Export</button><button style={actionBtnSmall} onClick={() => handlePrint('Payment Schedules')}><Printer size={12} /> Print</button></>) : (<button style={{ ...actionBtnSmall, opacity: 0.4, cursor: 'not-allowed' }} title="Upgrade to Signature"><Lock size={10} /> Export</button>)}
                <button style={goldBtn} onClick={() => setShowPaymentForm(!showPaymentForm)}>
                <Plus size={14} />
                {showPaymentForm ? 'Cancel' : 'New Schedule'}
              </button>
              </div>
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
                  <div key={exp.id} style={{ borderBottom: i < expenses.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
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
                      <button onClick={() => { setEditingExpenseId(exp.id); setEditExpenseData({ description: exp.description, amount: exp.amount, category: exp.category }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }} title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete({ type: 'expense', id: exp.id, name: exp.description })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={14} color="var(--grey)" />
                      </button>
                    </div>
                  </div>
                  {editingExpenseId === exp.id && (
                    <div style={{ marginTop: '10px', padding: '14px', background: '#F9FAFB', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        <div><label style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Description</label><input style={inp} value={editExpenseData.description || ''} onChange={e => setEditExpenseData((p:any) => ({ ...p, description: e.target.value }))} /></div>
                        <div><label style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Amount</label><input style={inp} type="number" value={editExpenseData.amount || ''} onChange={e => setEditExpenseData((p:any) => ({ ...p, amount: parseInt(e.target.value) }))} /></div>
                        <div><label style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Category</label><input style={inp} value={editExpenseData.category || ''} onChange={e => setEditExpenseData((p:any) => ({ ...p, category: e.target.value }))} /></div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingExpenseId(null)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--dark)', background: '#E5E7EB', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => handleSaveExpenseEdit(exp.id)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: '#fff', background: 'var(--dark)', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer' }}>Save</button>
                      </div>
                    </div>
                  )}
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
              <div style={{ display: 'flex', gap: '8px' }}>
                {hasTabAccess(vendorTier, 'payments') ? (<><button style={actionBtnSmall} onClick={() => exportToCSV(tdsLedger, 'TDW_TDS', [{key:'transaction_type',label:'Type'},{key:'gross_amount',label:'Gross'},{key:'tds_amount',label:'TDS'},{key:'created_at',label:'Date'}])}><Download size={12} /> Export</button><button style={actionBtnSmall} onClick={() => handlePrint('Tax & Finance')}><Printer size={12} /> Print</button></>) : (<button style={{ ...actionBtnSmall, opacity: 0.4, cursor: 'not-allowed' }} title="Upgrade to Signature"><Lock size={10} /> Export</button>)}
                <button style={goldBtn} onClick={() => setShowTDSForm(!showTDSForm)}>
                <Plus size={14} />
                Add TDS Entry
              </button>
              </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Clients ({clients.length})</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '6px 12px', flex: 1, maxWidth: '280px' }}>
                  <Search size={14} color="var(--text-muted)" />
                  <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Search clients..." style={{ border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--dark)', width: '100%', background: 'transparent' }} />
                  {clientSearch && <button onClick={() => setClientSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X size={12} color="var(--text-muted)" /></button>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {hasTabAccess(vendorTier, 'payments') ? (<><button style={actionBtnSmall} onClick={() => exportToCSV(clients, 'TDW_Clients', [{key:'name',label:'Name'},{key:'phone',label:'Phone'},{key:'wedding_date',label:'Wedding Date'},{key:'notes',label:'Notes'}])}><Download size={12} /> Export</button><button style={actionBtnSmall} onClick={() => handlePrint('Clients')}><Printer size={12} /> Print</button></>) : (<button style={{ ...actionBtnSmall, opacity: 0.4, cursor: 'not-allowed' }} title="Upgrade to Signature"><Lock size={10} /> Export</button>)}
                <button style={goldBtn} onClick={() => setShowClientForm(!showClientForm)}>
                <Plus size={14} />
                {showClientForm ? 'Cancel' : 'Add Client'}
              </button>
              </div>
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
                      <span className="badge-gold">Payment Shield Active</span>
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

            <div className="card" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 600, color: 'var(--dark)', marginBottom: '4px' }}>Business & Tax Details</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)' }}>Appears on invoices and contracts sent to clients</div>
                </div>
                <button onClick={handleSaveBusinessDetails} disabled={savingBusiness} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: '#fff', background: 'var(--dark)', border: 'none', borderRadius: '6px', padding: '9px 18px', cursor: 'pointer' }}>
                  {savingBusiness ? 'Saving...' : 'Save'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={formRow}>
                  <label style={label}>GST Number</label>
                  <input style={inp} value={gstNumber} onChange={e => setGstNumber(e.target.value.toUpperCase())} placeholder="e.g. 07AABCU9603R1ZX" maxLength={15} />
                </div>
                <div style={formRow}>
                  <label style={label}>Account Holder Name</label>
                  <input style={inp} value={bankHolder} onChange={e => setBankHolder(e.target.value)} placeholder="As per bank records" />
                </div>
                <div style={formRow}>
                  <label style={label}>Bank Name</label>
                  <input style={inp} value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. HDFC Bank" />
                </div>
                <div style={formRow}>
                  <label style={label}>Account Number</label>
                  <input style={inp} value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="Your account number" />
                </div>
                <div style={formRow}>
                  <label style={label}>IFSC Code</label>
                  <input style={inp} value={bankIfsc} onChange={e => setBankIfsc(e.target.value.toUpperCase())} placeholder="e.g. HDFC0001234" maxLength={11} />
                </div>
              </div>
            </div>

            {/* Subscription Management */}
            <div className="card" style={{ padding: '32px', border: vendorTier === 'prestige' ? '1px solid rgba(201,168,76,0.3)' : '1px solid var(--card-border)' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 600, color: 'var(--dark)', marginBottom: '20px' }}>Subscription</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: vendorTier === 'prestige' ? '#2C2420' : vendorTier === 'signature' ? 'rgba(201,168,76,0.1)' : 'rgba(140,123,110,0.06)',
                  }}>
                    <Award size={22} color={vendorTier === 'prestige' ? '#C9A84C' : vendorTier === 'signature' ? '#C9A84C' : '#8C7B6E'} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', fontWeight: 500, color: 'var(--dark)' }}>
                      {vendorTier === 'prestige' ? 'Prestige' : vendorTier === 'signature' ? 'Signature' : 'Essential'}
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--grey)', marginTop: '2px' }}>
                      {vendorTier === 'prestige' ? 'Invite Only' : vendorTier === 'signature' ? 'Recommended for Established Businesses' : 'Recommended for Solo Vendors'}
                    </div>
                  </div>
                </div>
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase',
                  padding: '6px 14px', borderRadius: '50px',
                  background: 'rgba(76,175,80,0.08)', color: '#4CAF50',
                }}>Trial Active</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', padding: '16px 0', borderTop: '1px solid var(--card-border)' }}>
                <div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Plan</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--dark)' }}>Free Trial</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Trial Ends</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--dark)' }}>
                    {(() => { try { const s = JSON.parse(localStorage.getItem('vendor_web_session') || '{}'); return s.trialEnd ? new Date(s.trialEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Aug 1, 2026'; } catch(e) { return 'Aug 1, 2026'; } })()}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Status</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#4CAF50' }}>Active</div>
                </div>
              </div>
            </div>

            {/* Verify Account */}
            <div className="card" style={{ padding: '32px', background: 'linear-gradient(135deg, #FFFDF7, #FFF8EC)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 600, color: 'var(--dark)', marginBottom: '4px' }}>Verify Your Account</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--grey)', lineHeight: 1.6 }}>Link your phone number to secure your account. When the app launches, sign in with the same number.</div>
                </div>
                <button onClick={() => { toast.info('Phone verification coming soon. Your account is secure via your login credentials.'); }} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'var(--dark)', color: 'var(--cream)',
                  fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500,
                  padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  letterSpacing: '0.5px', whiteSpace: 'nowrap',
                }}>
                  <Phone size={14} /> Verify with Phone
                </button>
              </div>
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

            {/* Late Payment Interest Calculator */}
            <div className="card" style={{ padding: '28px 32px' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--dark)', marginBottom: '4px', letterSpacing: '0.1px' }}>Late Payment Interest Calculator</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>Calculate interest on overdue amounts at 18% p.a. (standard industry rate)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Overdue Amount (Rs.)</label>
                  <input style={inp} type="number" placeholder="e.g. 50000" value={interestAmount} onChange={e => setInterestAmount(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Annual Rate (%)</label>
                  <input style={inp} type="number" placeholder="18" value={interestRate} onChange={e => setInterestRate(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Days Overdue</label>
                  <input style={inp} type="number" placeholder="e.g. 30" value={interestDays} onChange={e => setInterestDays(e.target.value)} />
                </div>
              </div>
              {interestAmount && interestDays && interestRate && (
                <div style={{ background: '#F9FAFB', borderRadius: '8px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Interest Due</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 700, color: '#DC2626' }}>
                      Rs.{Math.round(parseInt(interestAmount) * (parseFloat(interestRate) / 100) * (parseInt(interestDays) / 365)).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Total to Recover</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 700, color: 'var(--dark)' }}>
                      Rs.{(parseInt(interestAmount) + Math.round(parseInt(interestAmount) * (parseFloat(interestRate) / 100) * (parseInt(interestDays) / 365))).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              )}
            </div>

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
        {activeTab === 'templates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)', marginBottom: '4px' }}>Message Templates</h2>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)' }}>One-tap copy. Paste directly into WhatsApp. Personalise before sending.</p>
            </div>
            {[
              {
                category: 'Payments',
                templates: [
                  { title: 'Payment Reminder', msg: `Hi [Client Name]! Hope you're doing well. This is a friendly reminder that your [Instalment Name] payment of Rs.[Amount] was due on [Date]. Request you to please transfer at your earliest convenience. Thank you! — ${vendorData?.name || 'Your Name'}, The Dream Wedding` },
                  { title: 'Payment Received', msg: `Hi [Client Name]! We've received your payment of Rs.[Amount]. Thank you! Your booking is confirmed. Looking forward to being part of your special day. — ${vendorData?.name || 'Your Name'}, The Dream Wedding` },
                  { title: 'Final Payment Due', msg: `Hi [Client Name]! Your final payment of Rs.[Amount] is due on [Date] — just [X] days before your wedding. Please transfer at your earliest so we can focus entirely on making your day perfect. — ${vendorData?.name || 'Your Name'}` },
                ]
              },
              {
                category: 'Bookings',
                templates: [
                  { title: 'Booking Confirmed', msg: `Hi [Client Name]! Your booking with ${vendorData?.name || 'us'} is now confirmed for [Wedding Date] at [Venue]. We're so excited to be part of your wedding! We'll be in touch soon to start planning. — The Dream Wedding` },
                  { title: 'Date Blocked', msg: `Hi [Client Name]! Great news — [Wedding Date] is now exclusively blocked for you in our calendar. No other bookings will be accepted for this date. Let's make it unforgettable! — ${vendorData?.name || 'Your Name'}` },
                  { title: 'Contract Sent', msg: `Hi [Client Name]! I've sent across our service contract for your review. Please go through it carefully and let me know if you have any questions. Once signed, we're officially set! — ${vendorData?.name || 'Your Name'}` },
                ]
              },
              {
                category: 'Delivery',
                templates: [
                  { title: 'Photos Ready', msg: `Hi [Client Name]! Your photos are ready! 🎉 I've shared the link to your gallery — please check your email/WhatsApp. Let me know your thoughts. It was a pleasure capturing your special day! — ${vendorData?.name || 'Your Name'}` },
                  { title: 'Delivery Delayed', msg: `Hi [Client Name]! I wanted to update you that your [Photos/Film] will be delivered by [New Date] instead of the original timeline. I'm giving it extra attention to make sure everything is perfect. Thank you for your patience! — ${vendorData?.name || 'Your Name'}` },
                  { title: 'Final Album Ready', msg: `Hi [Client Name]! Your final wedding album is ready for review! Please check and let me know if you'd like any changes before we go to print. This has been such a beautiful project — thank you for trusting us! — ${vendorData?.name || 'Your Name'}` },
                ]
              },
              {
                category: 'Follow Up',
                templates: [
                  { title: 'Post Wedding Feedback', msg: `Hi [Client Name]! It was such an honour to be part of your wedding day. We hope everything was perfect! If you have a moment, we'd really appreciate a review on The Dream Wedding app — it means the world to us. Thank you! — ${vendorData?.name || 'Your Name'}` },
                  { title: 'Referral Request', msg: `Hi [Client Name]! Hope married life is treating you wonderfully! If you know any couples planning their wedding, we'd love to work with them too. Feel free to share our details — it would mean a lot. Thank you! — ${vendorData?.name || 'Your Name'}` },
                ]
              },
            ].map(section => (
              <div key={section.category}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>{section.category}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {section.templates.map(t => (
                    <div key={t.title} className="card" style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>{t.title}</div>
                        <button onClick={() => { navigator.clipboard.writeText(t.msg); toast.success(`"${t.title}" copied to clipboard`); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--dark)', background: '#F3F4F6', border: 'none', borderRadius: '5px', padding: '5px 12px', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                          Copy
                        </button>
                      </div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.7 }}>{t.msg}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

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
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)' }}>Invite your past clients to download The Dream Wedding. The more couples join through you, the more you earn.</p>
            </div>

            {/* Your referral link */}
            <div className="card" style={{ padding: '28px 32px' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--dark)', marginBottom: '16px' }}>Your Referral Link</div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', background: '#FAFAFA', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--dark)', letterSpacing: '0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{referralLink || `https://thedreamwedding.in/ref/${vendorData?.id?.substring(0, 8) || 'loading'}`}</div>
                <button onClick={() => { const link = referralLink || `https://thedreamwedding.in/ref/${vendorData?.id || ''}`; navigator.clipboard.writeText(link); toast.success('Link copied'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--card-border)', background: '#fff', color: 'var(--dark)', cursor: 'pointer', whiteSpace: 'nowrap' }}>Copy Link</button>
                <a href={`https://wa.me/?text=${encodeURIComponent(`Hey! I use The Dream Wedding for all my wedding bookings. You should check it out too: ${referralLink || `https://thedreamwedding.in/ref/${vendorData?.id || ''}`}`)}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '12px 20px', borderRadius: '8px', border: 'none', background: '#25D366', color: '#fff', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}><Send size={12} /> Share</a>
              </div>
            </div>

            {/* Referral stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { num: String(clients.length), label: 'Total Clients', color: 'var(--dark)' },
                { num: String(selectedClients.length), label: 'Selected', color: 'var(--gold)' },
                { num: '0', label: 'Downloaded App', color: '#4CAF50' },
                { num: '0', label: 'Active on App', color: '#1D4ED8' },
              ].map((s, i) => (
                <div key={i} className="card" style={{ textAlign: 'center', padding: '20px 16px', borderTop: `3px solid ${s.color}` }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '28px', fontWeight: 300, color: s.color }}>{s.num}</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Client list with checkboxes */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="checkbox" checked={clients.length > 0 && selectedClients.length === clients.length} onChange={(e) => { if (e.target.checked) { setSelectedClients(clients.map((c: any) => c.id)); } else { setSelectedClients([]); } }} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#C9A84C' }} />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>Your Clients ({clients.length})</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedClients.length > 0 && (
                    <button onClick={() => {
                      const link = referralLink || `https://thedreamwedding.in/ref/${vendorData?.id || ''}`;
                      const msg = `Hi! This is ${vendorData?.name || 'your vendor'}. I use The Dream Wedding app to manage all my bookings. Download it here and find the best wedding vendors in your city: ${link}`;
                      navigator.clipboard.writeText(msg);
                      toast.success(`Message copied — send to ${selectedClients.length} clients via WhatsApp Broadcast`);
                    }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#25D366', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Send size={11} /> Send to {selectedClients.length} Selected</button>
                  )}
                </div>
              </div>
              {clients.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center' }}><Users size={32} color="var(--grey-light)" /><p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--grey)', marginTop: '12px' }}>No clients yet</p><button onClick={() => setActiveTab('clients')} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px' }}>Add your first client</button></div>
              ) : clients.map((c: any, idx: number) => (
                <div key={c.id} style={{ padding: '14px 20px', borderBottom: idx < clients.length - 1 ? '1px solid var(--card-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="checkbox" checked={selectedClients.includes(c.id)} onChange={(e) => { if (e.target.checked) { setSelectedClients(prev => [...prev, c.id]); } else { setSelectedClients(prev => prev.filter(id => id !== c.id)); } }} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#C9A84C' }} />
                    <div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: 'var(--dark)' }}>{c.name || c.client_name}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{c.phone} {c.wedding_date ? `· ${c.wedding_date}` : ''}</div>
                    </div>
                  </div>
                  <a href={`https://wa.me/91${c.phone}?text=${encodeURIComponent(`Hi ${(c.name || c.client_name || '').split('&')[0].trim()}! I use The Dream Wedding app for all my bookings. Download it and find the best vendors: ${referralLink || `https://thedreamwedding.in/ref/${vendorData?.id || ''}`}`)}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#25D36615', color: '#25D366', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}><Send size={11} /> Send</a>
                </div>
              ))}
            </div>

            {/* How it works */}
            <div style={{ background: '#0F1117', borderRadius: '10px', padding: '28px 32px' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>How Referrals Work</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                {[
                  { step: '1', title: 'Share your link', desc: 'Send your unique referral link to past clients via WhatsApp. Select clients above and broadcast.' },
                  { step: '2', title: 'They download', desc: 'Your clients download The Dream Wedding app using your link. They are automatically linked to you.' },
                  { step: '3', title: 'You earn rewards', desc: 'As your referrals become active on the platform, you unlock discounts and visibility boosts.' },
                ].map(s => (
                  <div key={s.step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, color: '#0F1117' }}>{s.step}</div>
                    <div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{s.title}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'paymentshield' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)', marginBottom: '4px' }}>Payment Shield</h2>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)' }}>Secure your final payment before the wedding day. Focus on the work, not the collection.</p>
            </div>
            <div className="card" style={{ padding: '28px 32px' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '20px' }}>Shield Configuration</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '6px' }}>Shield Amount</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['30%', '50%', '100%'].map(pct => (<button key={pct} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: pct === '50%' ? '2px solid var(--gold)' : '1px solid var(--card-border)', background: pct === '50%' ? 'rgba(201,168,76,0.06)' : '#fff', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: pct === '50%' ? 600 : 400, color: pct === '50%' ? 'var(--gold)' : 'var(--dark)' }}>{pct}</button>))}
                  </div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Percentage of final balance couple must deposit</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '6px' }}>Deposit Deadline</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['1 day', '3 days', '7 days'].map(d => (<button key={d} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: d === '3 days' ? '2px solid var(--gold)' : '1px solid var(--card-border)', background: d === '3 days' ? 'rgba(201,168,76,0.06)' : '#fff', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: d === '3 days' ? 600 : 400, color: d === '3 days' ? 'var(--gold)' : 'var(--dark)' }}>{d}</button>))}
                  </div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Days before event couple must deposit</p>
                </div>
              </div>
            </div>
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Active Shields</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)' }}>Demo data</span>
              </div>
              {[{client:'Priya & Rahul',amount:150000,deadline:'Mar 12, 2026',status:'deposited'},{client:'Ananya & Karan',amount:85000,deadline:'Apr 2, 2026',status:'pending'},{client:'Meera & Arjun',amount:200000,deadline:'Apr 18, 2026',status:'deposited'}].map((shield,idx) => (
                <div key={idx} style={{ padding: '18px 20px', borderBottom: idx < 2 ? '1px solid var(--card-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: 'var(--dark)', marginBottom: '4px' }}>{shield.client}</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)' }}>Rs.{shield.amount.toLocaleString('en-IN')} · Due by {shield.deadline}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {shield.status === 'deposited' ? (<><span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: '#16A34A', background: 'rgba(22,163,74,0.08)', padding: '4px 10px', borderRadius: '4px' }}>Deposited</span><button style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--gold)', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Confirm Cash</button><button style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: '#fff', background: 'var(--dark)', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Release to Me</button></>) : (<span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--gold)', background: 'rgba(201,168,76,0.08)', padding: '4px 10px', borderRadius: '4px' }}>Awaiting Deposit</span>)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: '#0F1117', borderRadius: '10px', padding: '28px 32px' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>How Payment Shield Works</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[{step:'1',title:'You set the terms',desc:'Choose shield amount (30-100%) and deposit deadline (1-7 days before event).'},{step:'2',title:'Couple deposits',desc:'Before the deadline, couple deposits the shield amount securely via Razorpay.'},{step:'3a',title:'Cash settlement',desc:'Couple pays in cash. You confirm. Digital deposit returns to couple.'},{step:'3b',title:'Digital release',desc:'Couple releases held amount to you. 1% convenience fee applies.'}].map(s => (
                  <div key={s.step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, color: '#0F1117' }}>{s.step}</div>
                    <div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{s.title}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* ── WhatsApp Broadcast ── */}
        {activeTab === 'whatsapp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)', marginBottom: '4px' }}>WhatsApp Broadcast</h2>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)' }}>Send a message to all your past clients in one tap. The most powerful growth tool for Indian vendors.</p>
            </div>

            {/* Custom message */}
            <div className="card" style={{ padding: '28px 32px' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--dark)', marginBottom: '16px' }}>Compose Message</div>
              <textarea
                value={(() => { try { return (window as any).__waBroadcastMsg || ''; } catch(e) { return ''; } })()}
                onChange={(e) => { (window as any).__waBroadcastMsg = e.target.value; setDsChatInput(e.target.value); }}
                placeholder={`Hi! This is ${vendorData?.name || 'your business'}. Write your broadcast message here...`}
                rows={4}
                style={{ width: '100%', padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px', resize: 'vertical', lineHeight: 1.6, marginBottom: '12px' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { const msg = (window as any).__waBroadcastMsg || ''; if (!msg.trim()) { toast.error('Write a message first'); return; } navigator.clipboard.writeText(msg); toast.success('Message copied'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '6px', border: '1px solid var(--card-border)', background: '#fff', color: 'var(--dark)', cursor: 'pointer' }}>Copy Message</button>
                <a href={`https://wa.me/?text=${encodeURIComponent((typeof window !== 'undefined' ? (window as any).__waBroadcastMsg : '') || '')}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#25D366', color: '#fff', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}><Send size={12} /> Open WhatsApp</a>
              </div>
            </div>

            {/* Quick templates - editable */}
            <div className="card" style={{ padding: '28px 32px' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--dark)', marginBottom: '6px' }}>Quick Templates</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--grey)', marginBottom: '20px' }}>Tap to load into composer. Edit before sending.</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[
                  { title: 'Seasonal Offer', msg: `Hi! This is ${vendorData?.name || 'your vendor'}. We have special rates for winter weddings (Nov-Feb). Limited slots available. Reply to know more or visit thedreamwedding.in` },
                  { title: 'Portfolio Update', msg: `Hi! We just wrapped up a stunning wedding and our new work is live. Check out our latest portfolio on The Dream Wedding app. Would love to work with anyone you know who is getting married!` },
                  { title: 'Referral Request', msg: `Hi! Hope married life is treating you wonderfully. If you know anyone planning their wedding, we would love to be part of their journey too. Share our profile on The Dream Wedding app — it means the world to us!` },
                  { title: 'Festival Greeting', msg: `Wishing you and your family a very happy festive season! If any friends or family are planning a wedding, do share our name. We are booking dates for the upcoming season. Thank you for your continued trust!` },
                  { title: 'Availability Alert', msg: `Hi! Quick update — we have a few premium dates still available for the upcoming wedding season. If you know anyone looking, please share our profile. Early bookings get priority. Thank you!` },
                ].map((tmpl, idx) => (
                  <button key={idx} onClick={() => { (window as any).__waBroadcastMsg = tmpl.msg; setDsChatInput(tmpl.msg); toast.info(`"${tmpl.title}" loaded — edit above`); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 18px', borderRadius: '50px', border: '1px solid var(--card-border)', background: '#fff', color: 'var(--dark)', cursor: 'pointer' }}>{tmpl.title}</button>
                ))}
              </div>
            </div>

            {/* Client list for broadcast */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>Your Clients ({clients.length})</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)' }}>Tap a name to open WhatsApp</span>
              </div>
              {clients.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center' }}><Users size={32} color="var(--grey-light)" /><p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--grey)', marginTop: '12px' }}>No clients yet. Add clients to start broadcasting.</p></div>
              ) : clients.map((c: any, idx: number) => (
                <a key={c.id || idx} href={`https://wa.me/91${c.phone}?text=${encodeURIComponent(`Hi ${(c.name || c.client_name || '').split('&')[0].trim()}! This is ${vendorData?.name || 'your vendor'} from The Dream Wedding.`)}`} target="_blank" rel="noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: idx < clients.length - 1 ? '1px solid var(--card-border)' : 'none', textDecoration: 'none', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: 'var(--dark)' }}>{c.name || c.client_name}</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)' }}>{c.phone} {c.wedding_date ? `· ${c.wedding_date}` : ''}</div>
                  </div>
                  <Send size={14} color="#25D366" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Analytics Dashboard ── */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)', marginBottom: '4px' }}>Analytics</h2>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)' }}>Performance insights across your bookings, revenue, and expenses.</p>
            </div>

            {/* Revenue metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { label: 'Total Revenue', value: `Rs.${invoices.reduce((sum: number, inv: any) => sum + (parseInt(inv.amount) || 0), 0).toLocaleString('en-IN')}`, color: 'var(--gold)' },
                { label: 'Total Bookings', value: String(bookings.length), color: 'var(--dark)' },
                { label: 'Total Expenses', value: `Rs.${expenses.reduce((sum: number, exp: any) => sum + (parseInt(exp.amount) || 0), 0).toLocaleString('en-IN')}`, color: '#DC2626' },
                { label: 'Net Profit', value: `Rs.${(invoices.reduce((sum: number, inv: any) => sum + (parseInt(inv.amount) || 0), 0) - expenses.reduce((sum: number, exp: any) => sum + (parseInt(exp.amount) || 0), 0)).toLocaleString('en-IN')}`, color: '#4CAF50' },
              ].map((m, i) => (
                <div key={i} className="card" style={{ textAlign: 'center', padding: '24px 16px', borderTop: `3px solid ${m.color}` }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '22px', fontWeight: 300, color: m.color }}>{m.value}</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '6px' }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Booking conversion */}
            <div className="card" style={{ padding: '28px 32px' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--dark)', marginBottom: '20px' }}>Booking Pipeline</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {[
                  { label: 'Inquiries', count: bookings.filter((b: any) => b.status === 'pending').length, color: 'var(--gold)' },
                  { label: 'Confirmed', count: bookings.filter((b: any) => b.status === 'confirmed').length, color: '#4CAF50' },
                  { label: 'Completed', count: bookings.filter((b: any) => b.status === 'completed').length, color: 'var(--dark)' },
                  { label: 'Declined', count: bookings.filter((b: any) => b.status === 'declined' || b.status === 'cancelled').length, color: '#DC2626' },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '28px', fontWeight: 300, color: s.color }}>{s.count}</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</div>
                    <div style={{ marginTop: '8px', height: '4px', borderRadius: '2px', background: 'rgba(140,123,110,0.1)' }}>
                      <div style={{ height: '100%', borderRadius: '2px', background: s.color, width: `${bookings.length > 0 ? (s.count / bookings.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly revenue breakdown */}
            <div className="card" style={{ padding: '28px 32px' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--dark)', marginBottom: '20px' }}>Revenue by Month</div>
              {(() => {
                const months: Record<string, number> = {};
                invoices.forEach((inv: any) => {
                  const d = new Date(inv.created_at);
                  const key = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
                  months[key] = (months[key] || 0) + (parseInt(inv.amount) || 0);
                });
                const entries = Object.entries(months).slice(-6);
                const max = Math.max(...entries.map(e => e[1]), 1);
                return entries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--grey)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>No invoice data yet</div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '160px' }}>
                    {entries.map(([month, amount], i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, color: 'var(--dark)' }}>Rs.{(amount / 1000).toFixed(0)}K</div>
                        <div style={{ width: '100%', borderRadius: '4px 4px 0 0', background: 'var(--gold)', height: `${(amount / max) * 120}px`, minHeight: '4px' }} />
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'var(--grey)' }}>{month}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Expense breakdown */}
            <div className="card" style={{ padding: '28px 32px' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--dark)', marginBottom: '20px' }}>Expense Breakdown by Category</div>
              {(() => {
                const cats: Record<string, number> = {};
                expenses.forEach((exp: any) => { cats[exp.category || 'Other'] = (cats[exp.category || 'Other'] || 0) + (parseInt(exp.amount) || 0); });
                const entries = Object.entries(cats).sort((a, b) => b[1] - a[1]);
                const total = entries.reduce((s, e) => s + e[1], 0) || 1;
                const colors = ['var(--gold)', '#1D4ED8', '#4CAF50', '#DC2626', '#8C7B6E', '#9C27B0'];
                return entries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--grey)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>No expense data yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {entries.map(([cat, amount], i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--dark)' }}>{cat}</span>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--dark)' }}>Rs.{amount.toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(140,123,110,0.08)' }}>
                          <div style={{ height: '100%', borderRadius: '3px', background: colors[i % colors.length], width: `${(amount / total) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── Client Portal ── */}
        {activeTab === 'portal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)', marginBottom: '4px' }}>Client Portal</h2>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)' }}>A private link for your couples. They see their timeline, deliverables, and payment schedule.</p>
            </div>

            {clients.length === 0 ? (
              <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
                <Share2 size={32} color="var(--grey-light)" />
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--grey)', marginTop: '12px' }}>No clients yet</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Add clients to generate their private portal links.</p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>Client Portals ({clients.length})</span>
                </div>
                {clients.map((c: any, idx: number) => {
                  const portalUrl = `https://thedreamwedding.in/portal/${vendorData?.id}/${c.id}`;
                  return (
                    <div key={c.id || idx} style={{ padding: '16px 20px', borderBottom: idx < clients.length - 1 ? '1px solid var(--card-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: 'var(--dark)' }}>{c.name || c.client_name}</div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{c.wedding_date || 'No date set'} {c.phone ? `· ${c.phone}` : ''}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => { navigator.clipboard.writeText(portalUrl); toast.success('Portal link copied'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--card-border)', background: '#fff', color: 'var(--dark)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Share2 size={11} /> Copy Link</button>
                        <a href={`https://wa.me/91${c.phone}?text=${encodeURIComponent(`Hi ${(c.name || c.client_name || '').split('&')[0].trim()}! Here is your private wedding portal: ${portalUrl} — You can see your timeline, payments, and deliverables anytime. — ${vendorData?.name || 'Your Vendor'}`)}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, padding: '8px 14px', borderRadius: '6px', border: 'none', background: '#25D366', color: '#fff', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}><Send size={11} /> Share</a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Portal features info */}
            <div style={{ background: '#0F1117', borderRadius: '10px', padding: '28px 32px' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>What Your Client Sees</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { title: 'Event Timeline', desc: 'Key dates and milestones for their wedding journey.' },
                  { title: 'Payment Schedule', desc: 'What has been paid, what is due, and when.' },
                  { title: 'Deliverables', desc: 'Photos, videos, and documents shared with them.' },
                  { title: 'Your Contact', desc: 'Direct line to you via the app. No middlemen.' },
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, color: '#0F1117' }}>{i + 1}</div>
                    <div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{f.title}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── DELUXE SUITE: Team Hub ── */}
        {activeTab === 'ds-team-hub' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Award size={14} color="var(--gold)" />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 500, color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase' }}>Deluxe Suite</span>
                </div>
                <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Team Hub</h2>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '2px' }}>Manage your workforce. Roles, permissions, availability — all in one place.</p>
              </div>
              <button onClick={() => { setDsNewTeam({ name: '', email: '', phone: '', role: 'staff' }); setDsShowTeamForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--dark)', color: 'var(--cream)', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}>
                <Plus size={14} /> Add Member
              </button>
            </div>

            {/* Team stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { num: String(dsTeam.length), label: 'Total Members' },
                { num: String(dsTeam.filter(m => m.status === 'active').length), label: 'Active' },
                { num: String(dsTeam.filter(m => m.status === 'invited').length), label: 'Invited' },
                { num: String(dsTeam.filter(m => m.role === 'manager').length), label: 'Managers' },
              ].map((s, i) => (
                <div key={i} className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '28px', fontWeight: 300, color: 'var(--dark)' }}>{s.num}</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Team list */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>Team Members</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)' }}>{dsTeam.length} members</span>
              </div>
              {dsTeam.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                  <Users size={32} color="var(--grey-light)" />
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--grey)', marginTop: '12px' }}>No team members yet</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Add your first team member to start delegating.</p>
                </div>
              ) : dsTeam.map((m, idx) => (
                <div key={m.id} style={{ padding: '16px 20px', borderBottom: idx < dsTeam.length - 1 ? '1px solid var(--card-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: m.role === 'owner' ? 'rgba(201,168,76,0.12)' : m.role === 'manager' ? 'rgba(44,36,32,0.08)' : 'rgba(140,123,110,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: m.role === 'owner' ? 'var(--gold)' : 'var(--dark)' }}>{m.name?.charAt(0)?.toUpperCase()}</div>
                    <div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: 'var(--dark)' }}>{m.name}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{m.phone || m.email || 'No contact'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '4px', background: m.role === 'owner' ? 'rgba(201,168,76,0.1)' : m.role === 'manager' ? 'rgba(44,36,32,0.06)' : 'rgba(140,123,110,0.06)', color: m.role === 'owner' ? 'var(--gold)' : 'var(--dark)' }}>{m.role}</span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, padding: '4px 10px', borderRadius: '4px', background: m.status === 'active' ? 'rgba(76,175,80,0.08)' : m.status === 'invited' ? 'rgba(201,168,76,0.08)' : 'rgba(229,115,115,0.08)', color: m.status === 'active' ? '#4CAF50' : m.status === 'invited' ? 'var(--gold)' : '#E57373' }}>{m.status}</span>
                    <select value={m.role} onChange={async (e) => { await fetch(`${API}/ds/team/${m.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: e.target.value }) }); loadDsTeam(); toast.success('Role updated'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--card-border)', background: '#fff', cursor: 'pointer' }}>
                      <option value="owner">Owner</option><option value="manager">Manager</option><option value="staff">Staff</option>
                    </select>
                    <button onClick={async () => { const newStatus = m.status === 'active' ? 'deactivated' : 'active'; await fetch(`${API}/ds/team/${m.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) }); loadDsTeam(); toast.success(newStatus === 'active' ? 'Member activated' : 'Member deactivated'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--card-border)', background: '#fff', cursor: 'pointer', color: m.status === 'active' ? '#E57373' : '#4CAF50' }}>{m.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                    <button onClick={async () => { if (confirm('Remove this team member?')) { await fetch(`${API}/ds/team/${m.id}`, { method: 'DELETE' }); loadDsTeam(); toast.success('Member removed'); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} color="var(--grey)" /></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add team member form */}
            {dsShowTeamForm && (
              <div className="card" style={{ padding: '28px 32px' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--dark)', marginBottom: '20px' }}>Add Team Member</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Name</label>
                    <input value={dsNewTeam.name} onChange={e => setDsNewTeam({ ...dsNewTeam, name: e.target.value })} placeholder="Full name" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Phone</label>
                    <input value={dsNewTeam.phone} onChange={e => setDsNewTeam({ ...dsNewTeam, phone: e.target.value })} placeholder="Phone number" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Email</label>
                    <input value={dsNewTeam.email} onChange={e => setDsNewTeam({ ...dsNewTeam, email: e.target.value })} placeholder="Email address" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Role</label>
                    <select value={dsNewTeam.role} onChange={e => setDsNewTeam({ ...dsNewTeam, role: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px', background: '#fff' }}>
                      <option value="staff">Staff</option><option value="manager">Manager</option><option value="owner">Owner</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setDsShowTeamForm(false)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--card-border)', background: '#fff', cursor: 'pointer', color: 'var(--grey)' }}>Cancel</button>
                  <button onClick={async () => { if (!dsNewTeam.name) { toast.error('Name is required'); return; } await fetch(`${API}/ds/team`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: vendorData.id, ...dsNewTeam }) }); setDsShowTeamForm(false); loadDsTeam(); toast.success('Team member added'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--dark)', color: 'var(--cream)', cursor: 'pointer' }}>Add Member</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DELUXE SUITE: Event Dashboard ── */}
        {activeTab === 'ds-event-dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Award size={14} color="var(--gold)" />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 500, color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase' }}>Deluxe Suite</span>
                </div>
                <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Event Dashboard</h2>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '2px' }}>Your command centre. Tasks, team, and progress — all per booking.</p>
              </div>
              <button onClick={() => { setDsNewTask({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '', related_client_name: '', category: 'general' }); setDsShowTaskForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--dark)', color: 'var(--cream)', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}>
                <Plus size={14} /> Create Task
              </button>
            </div>

            {/* Task stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
              {[
                { num: String(dsTaskStats.total), label: 'Total', color: 'var(--dark)' },
                { num: String(dsTaskStats.pending), label: 'Pending', color: 'var(--gold)' },
                { num: String(dsTaskStats.in_progress), label: 'In Progress', color: '#1D4ED8' },
                { num: String(dsTaskStats.completed), label: 'Completed', color: '#4CAF50' },
                { num: String(dsTaskStats.overdue), label: 'Overdue', color: '#DC2626' },
              ].map((s, i) => (
                <div key={i} className="card" style={{ textAlign: 'center', padding: '20px 16px', borderLeft: `3px solid ${s.color}` }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '28px', fontWeight: 300, color: s.color }}>{s.num}</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Task filters */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {['all', 'pending', 'in_progress', 'completed', 'overdue'].map(f => (
                <button key={f} onClick={() => setDsTaskFilter(f)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: dsTaskFilter === f ? 500 : 400, padding: '8px 16px', borderRadius: '50px', border: dsTaskFilter === f ? '1px solid var(--gold)' : '1px solid var(--card-border)', background: dsTaskFilter === f ? 'rgba(201,168,76,0.08)' : '#fff', color: dsTaskFilter === f ? 'var(--gold)' : 'var(--grey)', cursor: 'pointer', textTransform: 'capitalize' }}>{f === 'all' ? 'All Tasks' : f.replace('_', ' ')}</button>
              ))}
            </div>

            {/* Task list */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>Tasks</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)' }}>{dsTasks.filter(t => dsTaskFilter === 'all' || t.status === dsTaskFilter).length} tasks</span>
              </div>
              {dsTasks.filter(t => dsTaskFilter === 'all' || t.status === dsTaskFilter).length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                  <CheckSquare size={32} color="var(--grey-light)" />
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--grey)', marginTop: '12px' }}>No tasks found</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Create your first task to start managing your events.</p>
                </div>
              ) : dsTasks.filter(t => dsTaskFilter === 'all' || t.status === dsTaskFilter).map((t, idx, arr) => (
                <div key={t.id} style={{ padding: '16px 20px', borderBottom: idx < arr.length - 1 ? '1px solid var(--card-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                    <button onClick={async () => { const next = t.status === 'pending' ? 'in_progress' : t.status === 'in_progress' ? 'completed' : t.status; await fetch(`${API}/ds/tasks/${t.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) }); loadDsTasks(); loadDsTaskStats(); toast.success('Task updated'); }} style={{ width: '22px', height: '22px', borderRadius: '50%', border: t.status === 'completed' ? '2px solid #4CAF50' : '2px solid var(--card-border)', background: t.status === 'completed' ? '#4CAF50' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>{t.status === 'completed' && <Check size={12} color="#fff" />}</button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: 'var(--dark)', textDecoration: t.status === 'completed' ? 'line-through' : 'none', opacity: t.status === 'completed' ? 0.5 : 1 }}>{t.title}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {t.related_client_name && <span>{t.related_client_name}</span>}
                        {t.due_date && <span>Due: {new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                        {t.category && t.category !== 'general' && <span style={{ textTransform: 'capitalize' }}>{t.category}</span>}
                        {(() => { const member = dsTeam.find(m => m.id === t.assigned_to); return member ? <span>Assigned: {member.name}</span> : null; })()}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '4px', background: t.priority === 'urgent' ? 'rgba(220,38,38,0.08)' : t.priority === 'high' ? 'rgba(234,179,8,0.08)' : t.priority === 'medium' ? 'rgba(29,78,216,0.08)' : 'rgba(140,123,110,0.06)', color: t.priority === 'urgent' ? '#DC2626' : t.priority === 'high' ? '#B8860B' : t.priority === 'medium' ? '#1D4ED8' : 'var(--grey)' }}>{t.priority}</span>
                    <select value={t.status} onChange={async (e) => { await fetch(`${API}/ds/tasks/${t.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: e.target.value }) }); loadDsTasks(); loadDsTaskStats(); toast.success('Status updated'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--card-border)', background: '#fff', cursor: 'pointer' }}>
                      <option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="overdue">Overdue</option>
                    </select>
                    <button onClick={async () => { if (confirm('Delete this task?')) { await fetch(`${API}/ds/tasks/${t.id}`, { method: 'DELETE' }); loadDsTasks(); loadDsTaskStats(); toast.success('Task deleted'); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} color="var(--grey)" /></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Create task form */}
            {dsShowTaskForm && (
              <div className="card" style={{ padding: '28px 32px' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--dark)', marginBottom: '20px' }}>Create Task</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Task Title</label>
                    <input value={dsNewTask.title} onChange={e => setDsNewTask({ ...dsNewTask, title: e.target.value })} placeholder="What needs to be done?" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Description</label>
                    <textarea value={dsNewTask.description} onChange={e => setDsNewTask({ ...dsNewTask, description: e.target.value })} placeholder="Details..." rows={2} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px', resize: 'vertical' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Assign To</label>
                    <select value={dsNewTask.assigned_to} onChange={e => setDsNewTask({ ...dsNewTask, assigned_to: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px', background: '#fff' }}>
                      <option value="">Unassigned</option>
                      {dsTeam.filter(m => m.status === 'active').map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Priority</label>
                    <select value={dsNewTask.priority} onChange={e => setDsNewTask({ ...dsNewTask, priority: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px', background: '#fff' }}>
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Due Date</label>
                    <input type="date" value={dsNewTask.due_date} onChange={e => setDsNewTask({ ...dsNewTask, due_date: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Category</label>
                    <select value={dsNewTask.category} onChange={e => setDsNewTask({ ...dsNewTask, category: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px', background: '#fff' }}>
                      <option value="general">General</option><option value="procurement">Procurement</option><option value="delivery">Delivery</option><option value="trial">Trial</option><option value="setup">Setup</option><option value="payment">Payment</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Client / Event</label>
                    <input value={dsNewTask.related_client_name} onChange={e => setDsNewTask({ ...dsNewTask, related_client_name: e.target.value })} placeholder="e.g. Priya & Rahul Sharma" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setDsShowTaskForm(false)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--card-border)', background: '#fff', cursor: 'pointer', color: 'var(--grey)' }}>Cancel</button>
                  <button onClick={async () => { if (!dsNewTask.title) { toast.error('Task title is required'); return; } await fetch(`${API}/ds/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: vendorData.id, ...dsNewTask, due_date: dsNewTask.due_date ? new Date(dsNewTask.due_date).toISOString() : null, assigned_to: dsNewTask.assigned_to || null }) }); setDsShowTaskForm(false); loadDsTasks(); loadDsTaskStats(); toast.success('Task created'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--dark)', color: 'var(--cream)', cursor: 'pointer' }}>Create Task</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DELUXE SUITE: Team Chat ── */}
        {activeTab === 'ds-team-chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Award size={14} color="var(--gold)" />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 500, color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase' }}>Deluxe Suite</span>
              </div>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Team Chat</h2>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '2px' }}>Event-based group chats, direct messages, and broadcasts. Your team talks here — not on WhatsApp.</p>
            </div>

            {/* Channel selector */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['general', 'broadcast', ...(clients.length > 0 ? clients.slice(0, 5).map((c: any) => c.client_name || c.name) : [])].map(ch => (
                <button key={ch} onClick={() => { setDsChatChannel(ch); loadDsMessages(ch); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: dsChatChannel === ch ? 500 : 400, padding: '8px 16px', borderRadius: '50px', border: dsChatChannel === ch ? '1px solid var(--gold)' : '1px solid var(--card-border)', background: dsChatChannel === ch ? 'rgba(201,168,76,0.08)' : '#fff', color: dsChatChannel === ch ? 'var(--gold)' : 'var(--grey)', cursor: 'pointer', textTransform: 'capitalize' }}>{ch === 'general' ? 'General' : ch === 'broadcast' ? 'Broadcast' : ch}</button>
              ))}
            </div>

            {/* Chat area */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={14} color="var(--gold)" />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--dark)', textTransform: 'capitalize' }}>{dsChatChannel}</span>
                </div>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)' }}>{dsMessages.length} messages</span>
              </div>
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', maxHeight: '400px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dsMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <MessageSquare size={32} color="var(--grey-light)" />
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--grey)', marginTop: '12px' }}>No messages yet</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Start the conversation with your team.</p>
                  </div>
                ) : dsMessages.map(msg => (
                  <div key={msg.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: msg.message_type === 'system' ? 'rgba(201,168,76,0.1)' : 'rgba(44,36,32,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: msg.message_type === 'system' ? 'var(--gold)' : 'var(--dark)' }}>{msg.message_type === 'system' ? 'S' : msg.sender_name?.charAt(0)?.toUpperCase() || '?'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>{msg.sender_name || 'System'}</span>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        {msg.pinned && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 500, color: 'var(--gold)', background: 'rgba(201,168,76,0.08)', padding: '2px 6px', borderRadius: '4px' }}>Pinned</span>}
                      </div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{msg.message}</div>
                    </div>
                    <button onClick={async () => { await fetch(`${API}/ds/messages/${msg.id}/pin`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pinned: !msg.pinned }) }); loadDsMessages(); toast.info(msg.pinned ? 'Unpinned' : 'Pinned'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', opacity: 0.4 }} title={msg.pinned ? 'Unpin' : 'Pin'}><Star size={12} color="var(--gold)" /></button>
                  </div>
                ))}
              </div>
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--card-border)', display: 'flex', gap: '10px' }}>
                <input value={dsChatInput} onChange={e => setDsChatInput(e.target.value)} onKeyDown={async (e) => { if (e.key === 'Enter' && dsChatInput.trim()) { await fetch(`${API}/ds/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: vendorData.id, sender_id: null, sender_name: vendorData.name || 'Owner', channel_type: dsChatChannel === 'broadcast' ? 'broadcast' : dsChatChannel === 'general' ? 'group' : 'event', channel_id: dsChatChannel, message: dsChatInput }) }); setDsChatInput(''); loadDsMessages(); } }} placeholder="Type a message..." style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px', outline: 'none' }} />
                <button onClick={async () => { if (!dsChatInput.trim()) return; await fetch(`${API}/ds/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: vendorData.id, sender_id: null, sender_name: vendorData.name || 'Owner', channel_type: dsChatChannel === 'broadcast' ? 'broadcast' : dsChatChannel === 'general' ? 'group' : 'event', channel_id: dsChatChannel, message: dsChatInput }) }); setDsChatInput(''); loadDsMessages(); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', borderRadius: '8px', background: 'var(--dark)', border: 'none', cursor: 'pointer' }}><Send size={16} color="var(--cream)" /></button>
              </div>
            </div>
          </div>
        )}

        {/* ── DELUXE SUITE: Daily Briefing ── */}
        {activeTab === 'ds-daily-briefing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Award size={14} color="var(--gold)" />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 500, color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase' }}>Deluxe Suite</span>
              </div>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Daily Briefing</h2>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '2px' }}>Your morning overview. Everything that matters today — one glance.</p>
            </div>

            {!dsBriefing ? (
              <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
                <Sunrise size={32} color="var(--grey-light)" />
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--grey)', marginTop: '12px' }}>Loading your briefing...</p>
              </div>
            ) : (
              <>
                {/* Top stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  {[
                    { num: String(dsBriefing.tasks_today), label: 'Tasks Today', color: 'var(--dark)', icon: CheckSquare },
                    { num: String(dsBriefing.tasks_overdue), label: 'Overdue', color: '#DC2626', icon: AlertCircle },
                    { num: String(dsBriefing.trials_this_week), label: 'Trials This Week', color: 'var(--gold)', icon: Calendar },
                    { num: String(dsBriefing.team_onsite_today), label: 'Team On-Site', color: '#4CAF50', icon: MapPin },
                  ].map((s, i) => {
                    const SIcon = s.icon;
                    return (
                      <div key={i} className="card" style={{ padding: '24px 20px', borderLeft: `3px solid ${s.color}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '32px', fontWeight: 300, color: s.color }}>{s.num}</div>
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</div>
                          </div>
                          <SIcon size={18} color={s.color} style={{ opacity: 0.3 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Secondary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {[
                    { num: String(dsBriefing.tasks_pending), label: 'Tasks Pending', icon: Clock },
                    { num: String(dsBriefing.procurement_active), label: 'Active Procurement', icon: Box },
                    { num: String(dsBriefing.deliveries_pending), label: 'Pending Deliveries', icon: Truck },
                  ].map((s, i) => {
                    const SIcon = s.icon;
                    return (
                      <div key={i} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(201,168,76,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SIcon size={18} color="var(--gold)" /></div>
                        <div>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '22px', fontWeight: 300, color: 'var(--dark)' }}>{s.num}</div>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>{s.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Overdue tasks */}
                {dsBriefing.tasks_overdue > 0 && (
                  <div className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: '3px solid #DC2626' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--card-border)', background: 'rgba(220,38,38,0.03)' }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#DC2626' }}>Overdue Tasks</span>
                    </div>
                    {(dsBriefing.tasks_overdue_list || []).map((t: any, idx: number) => (
                      <div key={t.id || idx} style={{ padding: '12px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--dark)' }}>{t.title}</div>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.related_client_name || 'No client'} · Due: {t.due_date ? new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No date'}</div>
                        </div>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, padding: '4px 10px', borderRadius: '4px', background: 'rgba(220,38,38,0.08)', color: '#DC2626', textTransform: 'capitalize' }}>{t.priority}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Today's tasks */}
                {dsBriefing.tasks_today > 0 && (
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--card-border)' }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>Today's Tasks</span>
                    </div>
                    {(dsBriefing.tasks_today_list || []).map((t: any, idx: number) => (
                      <div key={t.id || idx} style={{ padding: '12px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--dark)' }}>{t.title}</div>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.related_client_name || 'No client'}</div>
                        </div>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, padding: '4px 10px', borderRadius: '4px', background: 'rgba(201,168,76,0.08)', color: 'var(--gold)', textTransform: 'capitalize' }}>{t.priority}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upcoming trials */}
                {dsBriefing.trials_this_week > 0 && (
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--card-border)' }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>Upcoming Trials This Week</span>
                    </div>
                    {(dsBriefing.trials_list || []).map((t: any, idx: number) => (
                      <div key={t.id || idx} style={{ padding: '12px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--dark)' }}>{t.client_name}</div>
                          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'capitalize' }}>{t.trial_type} · {new Date(t.scheduled_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, padding: '4px 10px', borderRadius: '4px', background: 'rgba(76,175,80,0.08)', color: '#4CAF50', textTransform: 'capitalize' }}>{t.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Concerns */}
                {dsBriefing.concerns > 0 && (
                  <div className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: '3px solid #F59E0B' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--card-border)', background: 'rgba(245,158,11,0.03)' }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#B8860B' }}>Client Concerns</span>
                    </div>
                    {(dsBriefing.concerns_list || []).map((s: any, idx: number) => (
                      <div key={s.id || idx} style={{ padding: '12px 20px', borderBottom: '1px solid var(--card-border)' }}>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, color: 'var(--dark)' }}>{s.client_name}</div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.milestone} · Logged by {s.logger_name || 'Team'}</div>
                        {s.notes && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#B8860B', marginTop: '4px' }}>{s.notes}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── DELUXE SUITE: Procurement Tracker ── */}
        {activeTab === 'ds-procurement' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}><Award size={14} color="var(--gold)" /><span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 500, color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase' }}>Deluxe Suite</span></div>
                <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Procurement Tracker</h2>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '2px' }}>Track every order and purchase. From ordered to verified — nothing falls through.</p>
              </div>
              <button onClick={() => { setDsNewProc({ item_name: '', vendor_supplier: '', expected_date: '', cost: '', assigned_to: '', related_client_name: '', notes: '' }); setDsShowProcForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--dark)', color: 'var(--cream)', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}><Plus size={14} /> Add Item</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { num: String(dsProcurement.filter(p => p.status === 'ordered').length), label: 'Ordered', color: 'var(--gold)' },
                { num: String(dsProcurement.filter(p => p.status === 'in_transit').length), label: 'In Transit', color: '#1D4ED8' },
                { num: String(dsProcurement.filter(p => p.status === 'received').length), label: 'Received', color: '#4CAF50' },
                { num: String(dsProcurement.filter(p => p.status === 'verified').length), label: 'Verified', color: 'var(--dark)' },
              ].map((s, i) => (
                <div key={i} className="card" style={{ textAlign: 'center', padding: '20px 16px', borderTop: `3px solid ${s.color}` }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '28px', fontWeight: 300, color: s.color }}>{s.num}</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)' }}><span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>All Procurement Items</span></div>
              {dsProcurement.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center' }}><Box size={32} color="var(--grey-light)" /><p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--grey)', marginTop: '12px' }}>No procurement items yet</p></div>
              ) : dsProcurement.map((p, idx) => (
                <div key={p.id} style={{ padding: '16px 20px', borderBottom: idx < dsProcurement.length - 1 ? '1px solid var(--card-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: 'var(--dark)' }}>{p.item_name}</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', gap: '12px' }}>
                      {p.vendor_supplier && <span>Supplier: {p.vendor_supplier}</span>}
                      {p.related_client_name && <span>Client: {p.related_client_name}</span>}
                      {p.expected_date && <span>Expected: {new Date(p.expected_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                      {p.cost && <span>Rs.{(p.cost / 100).toLocaleString('en-IN')}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select value={p.status} onChange={async (e) => { await fetch(`${API}/ds/procurement/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: e.target.value }) }); loadDsProcurement(); toast.success('Status updated'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--card-border)', background: '#fff', cursor: 'pointer' }}>
                      <option value="ordered">Ordered</option><option value="in_transit">In Transit</option><option value="received">Received</option><option value="verified">Verified</option>
                    </select>
                    <button onClick={async () => { if (confirm('Delete this item?')) { await fetch(`${API}/ds/procurement/${p.id}`, { method: 'DELETE' }); loadDsProcurement(); toast.success('Item deleted'); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} color="var(--grey)" /></button>
                  </div>
                </div>
              ))}
            </div>
            {dsShowProcForm && (
              <div className="card" style={{ padding: '28px 32px' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--dark)', marginBottom: '20px' }}>Add Procurement Item</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Item Name</label><input value={dsNewProc.item_name} onChange={e => setDsNewProc({ ...dsNewProc, item_name: e.target.value })} placeholder="What are you ordering?" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} /></div>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Supplier</label><input value={dsNewProc.vendor_supplier} onChange={e => setDsNewProc({ ...dsNewProc, vendor_supplier: e.target.value })} placeholder="Supplier name" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} /></div>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Expected Date</label><input type="date" value={dsNewProc.expected_date} onChange={e => setDsNewProc({ ...dsNewProc, expected_date: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} /></div>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Cost (Rs.)</label><input type="number" value={dsNewProc.cost} onChange={e => setDsNewProc({ ...dsNewProc, cost: e.target.value })} placeholder="Amount" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} /></div>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Assign To</label><select value={dsNewProc.assigned_to} onChange={e => setDsNewProc({ ...dsNewProc, assigned_to: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px', background: '#fff' }}><option value="">Unassigned</option>{dsTeam.filter(m => m.status === 'active').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Client / Event</label><input value={dsNewProc.related_client_name} onChange={e => setDsNewProc({ ...dsNewProc, related_client_name: e.target.value })} placeholder="e.g. Sharma Wedding" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} /></div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setDsShowProcForm(false)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--card-border)', background: '#fff', cursor: 'pointer', color: 'var(--grey)' }}>Cancel</button>
                  <button onClick={async () => { if (!dsNewProc.item_name) { toast.error('Item name is required'); return; } await fetch(`${API}/ds/procurement`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: vendorData.id, ...dsNewProc, cost: dsNewProc.cost ? parseInt(dsNewProc.cost) * 100 : null, assigned_to: dsNewProc.assigned_to || null }) }); setDsShowProcForm(false); loadDsProcurement(); toast.success('Item added'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--dark)', color: 'var(--cream)', cursor: 'pointer' }}>Add Item</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DELUXE SUITE: Delivery Tracker ── */}
        {activeTab === 'ds-deliveries' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}><Award size={14} color="var(--gold)" /><span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 500, color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase' }}>Deluxe Suite</span></div>
                <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Delivery Tracker</h2>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '2px' }}>Monitor all outgoing deliveries. From preparing to client confirmed.</p>
              </div>
              <button onClick={() => { setDsNewDelivery({ item_name: '', delivery_date: '', assigned_to: '', related_client_name: '', notes: '' }); setDsShowDeliveryForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--dark)', color: 'var(--cream)', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}><Plus size={14} /> Add Delivery</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { num: String(dsDeliveries.filter(d => d.status === 'preparing').length), label: 'Preparing', color: 'var(--gold)' },
                { num: String(dsDeliveries.filter(d => d.status === 'dispatched').length), label: 'Dispatched', color: '#1D4ED8' },
                { num: String(dsDeliveries.filter(d => d.status === 'delivered').length), label: 'Delivered', color: '#4CAF50' },
                { num: String(dsDeliveries.filter(d => d.status === 'client_confirmed').length), label: 'Confirmed', color: 'var(--dark)' },
              ].map((s, i) => (
                <div key={i} className="card" style={{ textAlign: 'center', padding: '20px 16px', borderTop: `3px solid ${s.color}` }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '28px', fontWeight: 300, color: s.color }}>{s.num}</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)' }}><span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>All Deliveries</span></div>
              {dsDeliveries.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center' }}><Truck size={32} color="var(--grey-light)" /><p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--grey)', marginTop: '12px' }}>No deliveries yet</p></div>
              ) : dsDeliveries.map((d, idx) => (
                <div key={d.id} style={{ padding: '16px 20px', borderBottom: idx < dsDeliveries.length - 1 ? '1px solid var(--card-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: 'var(--dark)' }}>{d.item_name}</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', gap: '12px' }}>
                      {d.related_client_name && <span>{d.related_client_name}</span>}
                      {d.delivery_date && <span>Date: {new Date(d.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select value={d.status} onChange={async (e) => { await fetch(`${API}/ds/deliveries/${d.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: e.target.value }) }); loadDsDeliveries(); toast.success('Status updated'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--card-border)', background: '#fff', cursor: 'pointer' }}>
                      <option value="preparing">Preparing</option><option value="dispatched">Dispatched</option><option value="delivered">Delivered</option><option value="client_confirmed">Client Confirmed</option>
                    </select>
                    <button onClick={async () => { if (confirm('Delete this delivery?')) { await fetch(`${API}/ds/deliveries/${d.id}`, { method: 'DELETE' }); loadDsDeliveries(); toast.success('Deleted'); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} color="var(--grey)" /></button>
                  </div>
                </div>
              ))}
            </div>
            {dsShowDeliveryForm && (
              <div className="card" style={{ padding: '28px 32px' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--dark)', marginBottom: '20px' }}>Add Delivery</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Item Name</label><input value={dsNewDelivery.item_name} onChange={e => setDsNewDelivery({ ...dsNewDelivery, item_name: e.target.value })} placeholder="What is being delivered?" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} /></div>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Delivery Date</label><input type="date" value={dsNewDelivery.delivery_date} onChange={e => setDsNewDelivery({ ...dsNewDelivery, delivery_date: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} /></div>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Assign To</label><select value={dsNewDelivery.assigned_to} onChange={e => setDsNewDelivery({ ...dsNewDelivery, assigned_to: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px', background: '#fff' }}><option value="">Unassigned</option>{dsTeam.filter(m => m.status === 'active').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Client / Event</label><input value={dsNewDelivery.related_client_name} onChange={e => setDsNewDelivery({ ...dsNewDelivery, related_client_name: e.target.value })} placeholder="e.g. Sharma Wedding" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} /></div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setDsShowDeliveryForm(false)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--card-border)', background: '#fff', cursor: 'pointer', color: 'var(--grey)' }}>Cancel</button>
                  <button onClick={async () => { if (!dsNewDelivery.item_name) { toast.error('Item name is required'); return; } await fetch(`${API}/ds/deliveries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: vendorData.id, ...dsNewDelivery, assigned_to: dsNewDelivery.assigned_to || null }) }); setDsShowDeliveryForm(false); loadDsDeliveries(); toast.success('Delivery added'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--dark)', color: 'var(--cream)', cursor: 'pointer' }}>Add Delivery</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DELUXE SUITE: Trial Schedule ── */}
        {activeTab === 'ds-trials' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}><Award size={14} color="var(--gold)" /><span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 500, color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase' }}>Deluxe Suite</span></div>
                <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Trial Schedule</h2>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '2px' }}>Fittings, consultations, tastings, walkthroughs — scheduled, assigned, and tracked.</p>
              </div>
              <button onClick={() => { setDsNewTrial({ client_name: '', trial_type: 'consultation', scheduled_date: '', assigned_to: '', notes: '' }); setDsShowTrialForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--dark)', color: 'var(--cream)', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}><Plus size={14} /> Schedule Trial</button>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)' }}><span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>All Trials</span></div>
              {dsTrials.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center' }}><Calendar size={32} color="var(--grey-light)" /><p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--grey)', marginTop: '12px' }}>No trials scheduled</p></div>
              ) : dsTrials.map((t, idx) => (
                <div key={t.id} style={{ padding: '16px 20px', borderBottom: idx < dsTrials.length - 1 ? '1px solid var(--card-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: 'var(--dark)' }}>{t.client_name}</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', gap: '12px' }}>
                      <span style={{ textTransform: 'capitalize' }}>{t.trial_type}</span>
                      <span>{new Date(t.scheduled_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      {(() => { const member = dsTeam.find(m => m.id === t.assigned_to); return member ? <span>Assigned: {member.name}</span> : null; })()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select value={t.status} onChange={async (e) => { await fetch(`${API}/ds/trials/${t.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: e.target.value }) }); loadDsTrials(); toast.success('Status updated'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--card-border)', background: '#fff', cursor: 'pointer' }}>
                      <option value="scheduled">Scheduled</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="rescheduled">Rescheduled</option><option value="cancelled">Cancelled</option>
                    </select>
                    <button onClick={async () => { if (confirm('Delete this trial?')) { await fetch(`${API}/ds/trials/${t.id}`, { method: 'DELETE' }); loadDsTrials(); toast.success('Deleted'); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} color="var(--grey)" /></button>
                  </div>
                </div>
              ))}
            </div>
            {dsShowTrialForm && (
              <div className="card" style={{ padding: '28px 32px' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--dark)', marginBottom: '20px' }}>Schedule Trial</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Client Name</label><input value={dsNewTrial.client_name} onChange={e => setDsNewTrial({ ...dsNewTrial, client_name: e.target.value })} placeholder="Client name" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} /></div>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Trial Type</label><select value={dsNewTrial.trial_type} onChange={e => setDsNewTrial({ ...dsNewTrial, trial_type: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px', background: '#fff' }}><option value="consultation">Consultation</option><option value="fitting">Fitting</option><option value="tasting">Tasting</option><option value="walkthrough">Walkthrough</option><option value="other">Other</option></select></div>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Date and Time</label><input type="datetime-local" value={dsNewTrial.scheduled_date} onChange={e => setDsNewTrial({ ...dsNewTrial, scheduled_date: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} /></div>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Assign To</label><select value={dsNewTrial.assigned_to} onChange={e => setDsNewTrial({ ...dsNewTrial, assigned_to: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px', background: '#fff' }}><option value="">Unassigned</option>{dsTeam.filter(m => m.status === 'active').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setDsShowTrialForm(false)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--card-border)', background: '#fff', cursor: 'pointer', color: 'var(--grey)' }}>Cancel</button>
                  <button onClick={async () => { if (!dsNewTrial.client_name || !dsNewTrial.scheduled_date) { toast.error('Client name and date required'); return; } await fetch(`${API}/ds/trials`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: vendorData.id, ...dsNewTrial, scheduled_date: new Date(dsNewTrial.scheduled_date).toISOString(), assigned_to: dsNewTrial.assigned_to || null }) }); setDsShowTrialForm(false); loadDsTrials(); toast.success('Trial scheduled'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--dark)', color: 'var(--cream)', cursor: 'pointer' }}>Schedule Trial</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DELUXE SUITE: Photo Approvals ── */}
        {activeTab === 'ds-photo-approvals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}><Award size={14} color="var(--gold)" /><span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 500, color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase' }}>Deluxe Suite</span></div>
                <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Photo Approvals</h2>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '2px' }}>Review deliverables from your team. Approve or request revisions.</p>
              </div>
              <button onClick={() => { setDsNewPhoto({ file_url: '', title: '', related_client_name: '', uploader_name: '' }); setDsShowPhotoForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--dark)', color: 'var(--cream)', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}><Plus size={14} /> Upload</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {[
                { num: String(dsPhotos.filter(p => p.status === 'pending').length), label: 'Pending Review', color: 'var(--gold)' },
                { num: String(dsPhotos.filter(p => p.status === 'approved').length), label: 'Approved', color: '#4CAF50' },
                { num: String(dsPhotos.filter(p => p.status === 'revision_requested').length), label: 'Needs Revision', color: '#DC2626' },
              ].map((s, i) => (
                <div key={i} className="card" style={{ textAlign: 'center', padding: '20px 16px', borderTop: `3px solid ${s.color}` }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '28px', fontWeight: 300, color: s.color }}>{s.num}</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)' }}><span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>Approval Queue</span></div>
              {dsPhotos.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center' }}><Camera size={32} color="var(--grey-light)" /><p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--grey)', marginTop: '12px' }}>No items in queue</p></div>
              ) : dsPhotos.map((p, idx) => (
                <div key={p.id} style={{ padding: '16px 20px', borderBottom: idx < dsPhotos.length - 1 ? '1px solid var(--card-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                    {p.file_url ? <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: `url(${p.file_url}) center/cover`, border: '1px solid var(--card-border)' }} /> : <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(140,123,110,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera size={18} color="var(--grey)" /></div>}
                    <div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: 'var(--dark)' }}>{p.title || 'Untitled'}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '12px' }}>
                        {p.uploader_name && <span>By: {p.uploader_name}</span>}
                        {p.related_client_name && <span>{p.related_client_name}</span>}
                        <span>{new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, padding: '4px 10px', borderRadius: '4px', background: p.status === 'approved' ? 'rgba(76,175,80,0.08)' : p.status === 'revision_requested' ? 'rgba(220,38,38,0.08)' : 'rgba(201,168,76,0.08)', color: p.status === 'approved' ? '#4CAF50' : p.status === 'revision_requested' ? '#DC2626' : 'var(--gold)', textTransform: 'capitalize' }}>{p.status === 'revision_requested' ? 'Revision' : p.status}</span>
                    {p.status === 'pending' && (
                      <>
                        <button onClick={async () => { await fetch(`${API}/ds/photos/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) }); loadDsPhotos(); toast.success('Approved'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#4CAF50', color: '#fff', cursor: 'pointer' }}>Approve</button>
                        <button onClick={async () => { const notes = prompt('Revision notes:'); if (notes) { await fetch(`${API}/ds/photos/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'revision_requested', revision_notes: notes }) }); loadDsPhotos(); toast.info('Revision requested'); } }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--card-border)', background: '#fff', color: 'var(--dark)', cursor: 'pointer' }}>Revise</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {dsShowPhotoForm && (
              <div className="card" style={{ padding: '28px 32px' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--dark)', marginBottom: '20px' }}>Upload for Review</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Title</label><input value={dsNewPhoto.title} onChange={e => setDsNewPhoto({ ...dsNewPhoto, title: e.target.value })} placeholder="e.g. Edited Photos - Batch 1" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} /></div>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>File URL</label><input value={dsNewPhoto.file_url} onChange={e => setDsNewPhoto({ ...dsNewPhoto, file_url: e.target.value })} placeholder="Cloudinary or drive link" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} /></div>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Uploaded By</label><input value={dsNewPhoto.uploader_name} onChange={e => setDsNewPhoto({ ...dsNewPhoto, uploader_name: e.target.value })} placeholder="Team member name" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} /></div>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Client / Event</label><input value={dsNewPhoto.related_client_name} onChange={e => setDsNewPhoto({ ...dsNewPhoto, related_client_name: e.target.value })} placeholder="e.g. Sharma Wedding" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} /></div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setDsShowPhotoForm(false)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--card-border)', background: '#fff', cursor: 'pointer', color: 'var(--grey)' }}>Cancel</button>
                  <button onClick={async () => { if (!dsNewPhoto.file_url) { toast.error('File URL is required'); return; } await fetch(`${API}/ds/photos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: vendorData.id, ...dsNewPhoto }) }); setDsShowPhotoForm(false); loadDsPhotos(); toast.success('Uploaded for review'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--dark)', color: 'var(--cream)', cursor: 'pointer' }}>Upload</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DELUXE SUITE: Check-in Tracker ── */}
        {activeTab === 'ds-checkin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}><Award size={14} color="var(--gold)" /><span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 500, color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase' }}>Deluxe Suite</span></div>
                <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Check-in Tracker</h2>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '2px' }}>Event day attendance. See who is on-site and who is en route.</p>
              </div>
              <button onClick={() => { setDsNewCheckin({ member_id: '', member_name: '', related_client_name: '', notes: '' }); setDsShowCheckinForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--dark)', color: 'var(--cream)', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}><Plus size={14} /> Check In</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div className="card" style={{ textAlign: 'center', padding: '24px', borderLeft: '3px solid #4CAF50' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '32px', fontWeight: 300, color: '#4CAF50' }}>{dsCheckins.filter(c => c.status === 'checked_in').length}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '4px' }}>On-Site Now</div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: '24px', borderLeft: '3px solid var(--grey)' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '32px', fontWeight: 300, color: 'var(--grey)' }}>{dsCheckins.filter(c => c.status === 'checked_out').length}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '4px' }}>Checked Out</div>
              </div>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)' }}><span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>Check-in Log</span></div>
              {dsCheckins.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center' }}><MapPin size={32} color="var(--grey-light)" /><p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--grey)', marginTop: '12px' }}>No check-ins yet</p></div>
              ) : dsCheckins.map((c, idx) => (
                <div key={c.id} style={{ padding: '14px 20px', borderBottom: idx < dsCheckins.length - 1 ? '1px solid var(--card-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.status === 'checked_in' ? '#4CAF50' : 'var(--grey)' }} />
                    <div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: 'var(--dark)' }}>{c.member_name}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '12px' }}>
                        {c.related_client_name && <span>{c.related_client_name}</span>}
                        <span>In: {new Date(c.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        {c.checked_out_at && <span>Out: {new Date(c.checked_out_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, padding: '4px 10px', borderRadius: '4px', background: c.status === 'checked_in' ? 'rgba(76,175,80,0.08)' : 'rgba(140,123,110,0.06)', color: c.status === 'checked_in' ? '#4CAF50' : 'var(--grey)' }}>{c.status === 'checked_in' ? 'On-Site' : 'Left'}</span>
                    {c.status === 'checked_in' && (
                      <button onClick={async () => { await fetch(`${API}/ds/checkins/${c.id}/checkout`, { method: 'PUT' }); loadDsCheckins(); toast.success('Checked out'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--card-border)', background: '#fff', color: 'var(--dark)', cursor: 'pointer' }}>Check Out</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {dsShowCheckinForm && (
              <div className="card" style={{ padding: '28px 32px' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--dark)', marginBottom: '20px' }}>Check In Team Member</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Team Member</label><select value={dsNewCheckin.member_id} onChange={e => { const m = dsTeam.find(t => t.id === e.target.value); setDsNewCheckin({ ...dsNewCheckin, member_id: e.target.value, member_name: m?.name || '' }); }} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px', background: '#fff' }}><option value="">Select member</option>{dsTeam.filter(m => m.status === 'active').map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Event / Client</label><input value={dsNewCheckin.related_client_name} onChange={e => setDsNewCheckin({ ...dsNewCheckin, related_client_name: e.target.value })} placeholder="e.g. Sharma Wedding" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} /></div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setDsShowCheckinForm(false)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--card-border)', background: '#fff', cursor: 'pointer', color: 'var(--grey)' }}>Cancel</button>
                  <button onClick={async () => { if (!dsNewCheckin.member_id) { toast.error('Select a team member'); return; } await fetch(`${API}/ds/checkins`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: vendorData.id, ...dsNewCheckin }) }); setDsShowCheckinForm(false); loadDsCheckins(); toast.success('Checked in'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--dark)', color: 'var(--cream)', cursor: 'pointer' }}>Check In</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DELUXE SUITE: Client Sentiment ── */}
        {activeTab === 'ds-sentiment' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}><Award size={14} color="var(--gold)" /><span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 500, color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase' }}>Deluxe Suite</span></div>
                <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Client Sentiment</h2>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '2px' }}>Track client mood after every milestone. Spot concerns before they escalate.</p>
              </div>
              <button onClick={() => { setDsNewSentiment({ client_name: '', milestone: '', rating: 'happy', logger_name: '', notes: '' }); setDsShowSentimentForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--dark)', color: 'var(--cream)', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}><Plus size={14} /> Log Sentiment</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {[
                { num: String(dsSentiment.filter(s => s.rating === 'happy').length), label: 'Happy', color: '#4CAF50', emoji: 'Good' },
                { num: String(dsSentiment.filter(s => s.rating === 'neutral').length), label: 'Neutral', color: 'var(--gold)', emoji: 'Okay' },
                { num: String(dsSentiment.filter(s => s.rating === 'concerned').length), label: 'Concerned', color: '#DC2626', emoji: 'Alert' },
              ].map((s, i) => (
                <div key={i} className="card" style={{ textAlign: 'center', padding: '24px', borderTop: `3px solid ${s.color}` }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '28px', fontWeight: 300, color: s.color }}>{s.num}</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)' }}><span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>Sentiment Log</span></div>
              {dsSentiment.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center' }}><ThumbsUp size={32} color="var(--grey-light)" /><p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--grey)', marginTop: '12px' }}>No sentiment logged yet</p></div>
              ) : dsSentiment.map((s, idx) => (
                <div key={s.id} style={{ padding: '14px 20px', borderBottom: idx < dsSentiment.length - 1 ? '1px solid var(--card-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.rating === 'happy' ? '#4CAF50' : s.rating === 'neutral' ? 'var(--gold)' : '#DC2626' }} />
                    <div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: 'var(--dark)' }}>{s.client_name}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '12px' }}>
                        <span>{s.milestone}</span>
                        {s.logger_name && <span>By: {s.logger_name}</span>}
                        <span>{new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      {s.notes && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>{s.notes}</div>}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, padding: '4px 10px', borderRadius: '4px', background: s.rating === 'happy' ? 'rgba(76,175,80,0.08)' : s.rating === 'neutral' ? 'rgba(201,168,76,0.08)' : 'rgba(220,38,38,0.08)', color: s.rating === 'happy' ? '#4CAF50' : s.rating === 'neutral' ? 'var(--gold)' : '#DC2626', textTransform: 'capitalize' }}>{s.rating}</span>
                </div>
              ))}
            </div>
            {dsShowSentimentForm && (
              <div className="card" style={{ padding: '28px 32px' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--dark)', marginBottom: '20px' }}>Log Client Sentiment</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Client Name</label><input value={dsNewSentiment.client_name} onChange={e => setDsNewSentiment({ ...dsNewSentiment, client_name: e.target.value })} placeholder="Client name" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} /></div>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Milestone</label><input value={dsNewSentiment.milestone} onChange={e => setDsNewSentiment({ ...dsNewSentiment, milestone: e.target.value })} placeholder="e.g. First fitting, Final delivery" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} /></div>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Rating</label><select value={dsNewSentiment.rating} onChange={e => setDsNewSentiment({ ...dsNewSentiment, rating: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px', background: '#fff' }}><option value="happy">Happy</option><option value="neutral">Neutral</option><option value="concerned">Concerned</option></select></div>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Logged By</label><input value={dsNewSentiment.logger_name} onChange={e => setDsNewSentiment({ ...dsNewSentiment, logger_name: e.target.value })} placeholder="Your name or team member" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} /></div>
                  <div style={{ gridColumn: 'span 2' }}><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Notes</label><textarea value={dsNewSentiment.notes} onChange={e => setDsNewSentiment({ ...dsNewSentiment, notes: e.target.value })} placeholder="Any context..." rows={2} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px', resize: 'vertical' }} /></div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setDsShowSentimentForm(false)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--card-border)', background: '#fff', cursor: 'pointer', color: 'var(--grey)' }}>Cancel</button>
                  <button onClick={async () => { if (!dsNewSentiment.client_name || !dsNewSentiment.milestone) { toast.error('Client and milestone required'); return; } await fetch(`${API}/ds/sentiment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: vendorData.id, ...dsNewSentiment }) }); setDsShowSentimentForm(false); loadDsSentiment(); toast.success('Sentiment logged'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--dark)', color: 'var(--cream)', cursor: 'pointer' }}>Log Sentiment</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DELUXE SUITE: Delegation Templates ── */}
        {activeTab === 'ds-templates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}><Award size={14} color="var(--gold)" /><span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 500, color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase' }}>Deluxe Suite</span></div>
                <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Delegation Templates</h2>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '2px' }}>Pre-built task bundles. Select a template, apply to a booking — tasks auto-created.</p>
              </div>
              <button onClick={() => { setDsNewTemplate({ template_name: '', event_type: 'wedding', tasks: '[]' }); setDsShowTemplateForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--dark)', color: 'var(--cream)', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}><Plus size={14} /> Create Template</button>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)' }}><span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>Your Templates</span></div>
              {dsTemplates.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center' }}><Clipboard size={32} color="var(--grey-light)" /><p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--grey)', marginTop: '12px' }}>No templates yet</p><p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Create a template to auto-generate tasks for new bookings.</p></div>
              ) : dsTemplates.map((t, idx) => {
                let taskList: any[] = [];
                try { taskList = typeof t.tasks === 'string' ? JSON.parse(t.tasks) : (t.tasks || []); } catch(e) { taskList = []; }
                return (
                  <div key={t.id} style={{ padding: '20px', borderBottom: idx < dsTemplates.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 500, color: 'var(--dark)' }}>{t.template_name}</div>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'capitalize' }}>{t.event_type} · {taskList.length} tasks</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={async () => { if (!vendorData?.id) return; const clientName = prompt('Enter client/event name to apply template:'); if (!clientName) return; for (const task of taskList) { await fetch(`${API}/ds/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: vendorData.id, title: task.title || task, description: task.description || '', priority: task.priority || 'medium', category: task.category || 'general', related_client_name: clientName, status: 'pending' }) }); } toast.success(`${taskList.length} tasks created for ${clientName}`); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 500, padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--gold)', background: 'rgba(201,168,76,0.06)', color: 'var(--gold)', cursor: 'pointer' }}>Apply to Booking</button>
                        <button onClick={async () => { if (confirm('Delete this template?')) { await fetch(`${API}/ds/templates/${t.id}`, { method: 'DELETE' }); loadDsTemplates(); toast.success('Deleted'); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} color="var(--grey)" /></button>
                      </div>
                    </div>
                    {taskList.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {taskList.slice(0, 8).map((task: any, ti: number) => (
                          <span key={ti} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', padding: '4px 10px', borderRadius: '4px', background: 'rgba(140,123,110,0.06)', color: 'var(--grey)' }}>{typeof task === 'string' ? task : task.title}</span>
                        ))}
                        {taskList.length > 8 && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', padding: '4px 10px', color: 'var(--text-muted)' }}>+{taskList.length - 8} more</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {dsShowTemplateForm && (
              <div className="card" style={{ padding: '28px 32px' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--dark)', marginBottom: '20px' }}>Create Delegation Template</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Template Name</label><input value={dsNewTemplate.template_name} onChange={e => setDsNewTemplate({ ...dsNewTemplate, template_name: e.target.value })} placeholder="e.g. Destination Wedding - Udaipur" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }} /></div>
                  <div><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Event Type</label><select value={dsNewTemplate.event_type} onChange={e => setDsNewTemplate({ ...dsNewTemplate, event_type: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px', background: '#fff' }}><option value="wedding">Wedding</option><option value="engagement">Engagement</option><option value="reception">Reception</option><option value="destination">Destination Wedding</option><option value="other">Other</option></select></div>
                  <div style={{ gridColumn: 'span 2' }}><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Tasks (one per line)</label><textarea value={dsNewTemplate.tasks} onChange={e => setDsNewTemplate({ ...dsNewTemplate, tasks: e.target.value })} placeholder="Venue recce and walkthrough\nConfirm vendor deliverables\nBrief second team\nEquipment check and packing\nTravel and hotel arrangements" rows={6} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontFamily: 'Inter, sans-serif', fontSize: '13px', resize: 'vertical' }} /></div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setDsShowTemplateForm(false)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--card-border)', background: '#fff', cursor: 'pointer', color: 'var(--grey)' }}>Cancel</button>
                  <button onClick={async () => { if (!dsNewTemplate.template_name) { toast.error('Template name required'); return; } const taskLines = dsNewTemplate.tasks.split('\n').filter((l: string) => l.trim()); const taskArray = taskLines.map((l: string) => ({ title: l.trim(), priority: 'medium', category: 'general' })); await fetch(`${API}/ds/templates`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: vendorData.id, template_name: dsNewTemplate.template_name, event_type: dsNewTemplate.event_type, tasks: taskArray }) }); setDsShowTemplateForm(false); loadDsTemplates(); toast.success('Template created'); }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--dark)', color: 'var(--cream)', cursor: 'pointer' }}>Create Template</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DELUXE SUITE: Team Performance ── */}
        {activeTab === 'ds-performance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}><Award size={14} color="var(--gold)" /><span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 500, color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase' }}>Deluxe Suite</span></div>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: 500, color: 'var(--dark)' }}>Team Performance</h2>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--grey)', marginTop: '2px' }}>Weekly scorecard. See who delivers and who needs support.</p>
            </div>
            {dsPerformance.length === 0 ? (
              <div className="card" style={{ padding: '48px', textAlign: 'center' }}><UserCheck size={32} color="var(--grey-light)" /><p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--grey)', marginTop: '12px' }}>No performance data yet</p><p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Add team members and assign tasks to see performance metrics.</p></div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: '12px' }}>
                  {['Member', 'Total', 'Completed', 'On Time', 'Overdue', 'Rate'].map(h => (
                    <span key={h} style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: 'var(--grey)', letterSpacing: '1px', textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>
                {dsPerformance.map((p, idx) => (
                  <div key={p.member_id} style={{ padding: '14px 20px', borderBottom: idx < dsPerformance.length - 1 ? '1px solid var(--card-border)' : 'none', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: 'var(--dark)' }}>{p.name}</div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{p.role}</div>
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--dark)' }}>{p.total_tasks}</span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#4CAF50' }}>{p.completed}</span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--gold)' }}>{p.on_time}</span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: p.overdue > 0 ? '#DC2626' : 'var(--grey)' }}>{p.overdue}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(140,123,110,0.1)', overflow: 'hidden' }}>
                        <div style={{ width: `${p.on_time_rate}%`, height: '100%', borderRadius: '3px', background: p.on_time_rate >= 80 ? '#4CAF50' : p.on_time_rate >= 50 ? 'var(--gold)' : '#DC2626' }} />
                      </div>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500, color: p.on_time_rate >= 80 ? '#4CAF50' : p.on_time_rate >= 50 ? 'var(--gold)' : '#DC2626', minWidth: '36px' }}>{p.on_time_rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
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
      {/* Deluxe Suite Modal */}
      <DeluxeSuiteModal tab={deluxeSuiteTab} onClose={() => setDeluxeSuiteTab(null)} />

    </div>
  );
}
