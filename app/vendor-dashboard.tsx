import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  } from '@expo-google-fonts/playfair-display';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Image, Linking, Modal,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { blockDate, getBenchmark, getBlockedDates, getInvoices, getLeads, getVendorBookings, unblockDate } from '../services/api';
import { uploadImage } from '../services/cloudinary';
import { registerForPushNotifications } from '../services/notifications';
import { generateInvoiceNumber, generateInvoicePDF, generateContractPDF } from '../services/invoice';
import DateTimePicker from '@react-native-community/datetimepicker';
import { VendorDashSkeleton, ListSkeleton } from '../components/SkeletonLoader';

const { width } = Dimensions.get('window');
const API = 'https://dream-wedding-production-89ae.up.railway.app';

// ── Tier System ──────────────────────────────────────────────────────────────

type VendorTier = 'essential' | 'signature' | 'prestige';

const TIER_DISPLAY: Record<VendorTier, { label: string; color: string; bg: string; tag: string }> = {
  essential: { label: 'Essential', color: '#8C7B6E', bg: '#F0EDE8', tag: 'Solo Vendor' },
  signature: { label: 'Signature', color: '#C9A84C', bg: '#FFF8EC', tag: 'Established Business' },
  prestige: { label: 'Prestige', color: '#C9A84C', bg: '#2C2420', tag: 'Invite Only' },
};

// Essential tools — the daily drivers for a solo vendor
const ESSENTIAL_TOOLS: { id: string; icon: string; label: string; tab: string }[] = [
  { id: 'overview', icon: 'home', label: 'Overview', tab: 'Overview' },
  { id: 'inquiries', icon: 'mail', label: 'Enquiries', tab: 'Inquiries' },
  { id: 'calendar', icon: 'calendar', label: 'Calendar', tab: 'Calendar' },
  { id: 'clients', icon: 'users', label: 'Clients', tab: 'Clients' },
  { id: 'invoices', icon: 'file-text', label: 'Invoices', tab: 'Invoices' },
  { id: 'contracts', icon: 'shield', label: 'Contracts', tab: 'Contracts' },
  { id: 'payments', icon: 'credit-card', label: 'Payments', tab: 'Payments' },
  { id: 'availability', icon: 'clock', label: 'Availability', tab: 'Calendar' },
];

// Signature-only tools — business intelligence layer
const SIGNATURE_TOOLS: { id: string; icon: string; label: string; tab: string }[] = [
  { id: 'expenses', icon: 'trending-down', label: 'Expenses', tab: 'Expenses' },
  { id: 'tax', icon: 'percent', label: 'Tax & TDS', tab: 'Tax' },
  { id: 'team', icon: 'users', label: 'My Team', tab: 'Team' },
  { id: 'referral', icon: 'share-2', label: 'Referrals', tab: 'Referral' },
  { id: 'whatsapp', icon: 'message-circle', label: 'Broadcast', tab: 'WhatsApp' },
  { id: 'analytics', icon: 'bar-chart-2', label: 'Analytics', tab: 'Analytics' },
];

// Prestige command cards — CEO-level action items
const PRESTIGE_COMMANDS: { id: string; icon: string; label: string; color: string }[] = [
  { id: 'tasks', icon: 'check-square', label: 'Tasks', color: '#C9A84C' },
  { id: 'procurement', icon: 'package', label: 'Procurement', color: '#8C7B6E' },
  { id: 'delivery', icon: 'truck', label: 'Deliveries', color: '#4CAF50' },
  { id: 'trials', icon: 'clipboard', label: 'Trials', color: '#E57373' },
  { id: 'payments', icon: 'dollar-sign', label: 'Payments', color: '#C9A84C' },
  { id: 'team-activity', icon: 'activity', label: 'Team', color: '#8C7B6E' },
  { id: 'appointments', icon: 'calendar', label: 'Appointments', color: '#2C2420' },
];

const STAGE_COLORS: Record<string, string> = {
  'New Inquiry': '#C9A84C',
  'Quoted': '#8C7B6E',
  'Token Received': '#4CAF50',
  'Completed': '#2C2420',
};

const REPLY_TEMPLATES = [
  {
    id: '1',
    label: 'Availability Check',
    message: 'Hi! Thank you for reaching out. I would love to be part of your special day. Could you please confirm your wedding date and venue city so I can check my availability?',
  },
  {
    id: '2',
    label: 'Package Details',
    message: 'Thank you for your interest! I have multiple packages starting from our base rate. I would love to set up a quick call to understand your vision and share a customised quote. When are you free this week?',
  },
  {
    id: '3',
    label: 'Booking Confirmation',
    message: 'Wonderful news — I am available on your date and would love to work with you! To secure your booking, the next step is confirming through the app. This locks your date and gets us started. Looking forward to it!',
  },
];

// ── Tier Badge Component ─────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: VendorTier }) {
  const config = TIER_DISPLAY[tier];
  const isPrestige = tier === 'prestige';
  return (
    <View style={{
      backgroundColor: isPrestige ? '#2C2420' : config.bg,
      borderRadius: 50,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: isPrestige ? 1 : 0,
      borderColor: '#C9A84C',
    }}>
      <Text style={{
        fontSize: 10,
        color: isPrestige ? '#C9A84C' : config.color,
        fontFamily: 'DMSans_500Medium',
        letterSpacing: 0.5,
      }}>{config.label}</Text>
    </View>
  );
}

// ── Founding Badge (Gold Dot) ────────────────────────────────────────────────

function FoundingDot() {
  return (
    <View style={{
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#C9A84C',
      shadowColor: '#C9A84C',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 3,
      elevation: 4,
      marginLeft: 6,
    }} />
  );
}

// ── Tool Grid Item ───────────────────────────────────────────────────────────

function ToolGridItem({ icon, label, onPress, locked, badge }: {
  icon: string; label: string; onPress: () => void; locked?: boolean; badge?: number;
}) {
  return (
    <TouchableOpacity
      style={[toolGridStyles.item, locked && toolGridStyles.itemLocked]}
      onPress={onPress}
      activeOpacity={locked ? 1 : 0.7}
      disabled={locked}
    >
      <View style={[toolGridStyles.iconBox, locked && toolGridStyles.iconBoxLocked]}>
        <Feather name={icon as any} size={18} color={locked ? '#B8ADA4' : '#2C2420'} />
        {locked && (
          <View style={toolGridStyles.lockBadge}>
            <Feather name="lock" size={7} color="#B8963A" />
          </View>
        )}
      </View>
      {badge !== undefined && badge > 0 && (
        <View style={toolGridStyles.badge}>
          <Text style={toolGridStyles.badgeText}>{badge}</Text>
        </View>
      )}
      <Text style={[toolGridStyles.label, locked && toolGridStyles.labelLocked]}>{label}</Text>
    </TouchableOpacity>
  );
}

const toolGridStyles = StyleSheet.create({
  item: {
    width: (width - 64) / 4,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  itemLocked: { opacity: 0.4 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E0D5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxLocked: {
    backgroundColor: '#F5F0E8',
    borderColor: '#E8E0D5',
    borderStyle: 'dashed',
  },
  lockBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#E8D9B5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: (width - 64) / 8 - 16,
    backgroundColor: '#E57373',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontFamily: 'DMSans_500Medium',
  },
  label: {
    fontSize: 11,
    color: '#2C2420',
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 14,
  },
  labelLocked: {
    color: '#B8ADA4',
  },
});

// ── Today Card ───────────────────────────────────────────────────────────────

function TodayCard({ bookings, invoices, clients }: { bookings: any[]; invoices: any[]; clients: any[] }) {
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayBookings = bookings.filter((b: any) => {
    if (!b.event_date) return false;
    const eventDate = new Date(b.event_date).toDateString();
    return eventDate === new Date().toDateString();
  });
  const pendingPayments = invoices.filter((i: any) => i.status !== 'paid').length;
  const upcomingBookings = bookings.filter((b: any) => b.status === 'confirmed').length;

  return (
    <View style={todayStyles.card}>
      <View style={todayStyles.dateRow}>
        <Text style={todayStyles.dateText}>{today}</Text>
        <View style={todayStyles.dot} />
      </View>
      <View style={todayStyles.statsRow}>
        <View style={todayStyles.statItem}>
          <Text style={todayStyles.statNum}>{todayBookings.length}</Text>
          <Text style={todayStyles.statLabel}>Today</Text>
        </View>
        <View style={todayStyles.divider} />
        <View style={todayStyles.statItem}>
          <Text style={todayStyles.statNum}>{upcomingBookings}</Text>
          <Text style={todayStyles.statLabel}>Upcoming</Text>
        </View>
        <View style={todayStyles.divider} />
        <View style={todayStyles.statItem}>
          <Text style={[todayStyles.statNum, pendingPayments > 0 && { color: '#E57373' }]}>{pendingPayments}</Text>
          <Text style={todayStyles.statLabel}>Unpaid</Text>
        </View>
        <View style={todayStyles.divider} />
        <View style={todayStyles.statItem}>
          <Text style={todayStyles.statNum}>{clients.length}</Text>
          <Text style={todayStyles.statLabel}>Clients</Text>
        </View>
      </View>
    </View>
  );
}

const todayStyles = StyleSheet.create({
  card: {
    backgroundColor: '#2C2420',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#F5F0E8',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statNum: {
    fontSize: 24,
    color: '#C9A84C',
    fontFamily: 'PlayfairDisplay_400Regular',
  },
  statLabel: {
    fontSize: 10,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.3,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: '#3C3430',
  },
});

// ── Business Pulse Card (Signature+) ─────────────────────────────────────────

function BusinessPulseCard({ invoices, expenses, referralStats }: {
  invoices: any[]; expenses: any[]; referralStats: { active: number } | null;
}) {
  const totalRevenue = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const profit = totalRevenue - totalExpenses;

  return (
    <View style={pulseStyles.card}>
      <Text style={pulseStyles.eyebrow}>BUSINESS PULSE</Text>
      <View style={pulseStyles.row}>
        <View style={pulseStyles.item}>
          <Text style={pulseStyles.amount}>
            {totalRevenue > 0 ? `${(totalRevenue / 100000).toFixed(1)}L` : '0'}
          </Text>
          <Text style={pulseStyles.label}>Revenue</Text>
        </View>
        <View style={pulseStyles.divider} />
        <View style={pulseStyles.item}>
          <Text style={pulseStyles.amount}>
            {totalExpenses > 0 ? `${(totalExpenses / 100000).toFixed(1)}L` : '0'}
          </Text>
          <Text style={pulseStyles.label}>Expenses</Text>
        </View>
        <View style={pulseStyles.divider} />
        <View style={pulseStyles.item}>
          <Text style={[pulseStyles.amount, profit >= 0 ? { color: '#4CAF50' } : { color: '#E57373' }]}>
            {profit !== 0 ? `${(profit / 100000).toFixed(1)}L` : '0'}
          </Text>
          <Text style={pulseStyles.label}>Profit</Text>
        </View>
        <View style={pulseStyles.divider} />
        <View style={pulseStyles.item}>
          <Text style={pulseStyles.amount}>{referralStats?.active || 0}</Text>
          <Text style={pulseStyles.label}>Referrals</Text>
        </View>
      </View>
    </View>
  );
}

const pulseStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E8D9B5',
  },
  eyebrow: {
    fontSize: 10,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  amount: {
    fontSize: 20,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
  },
  label: {
    fontSize: 10,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.3,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: '#E8E0D5',
  },
});

// ── Prestige Command Card ────────────────────────────────────────────────────

function CommandCard({ icon, label, color, count, urgent, onPress }: {
  icon: string; label: string; color: string; count: number; urgent?: number; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={cmdStyles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={cmdStyles.top}>
        <View style={[cmdStyles.iconBox, { backgroundColor: color + '15', borderColor: color + '30' }]}>
          <Feather name={icon as any} size={16} color={color} />
        </View>
        {urgent !== undefined && urgent > 0 && (
          <View style={cmdStyles.urgentBadge}>
            <Text style={cmdStyles.urgentText}>{urgent}</Text>
          </View>
        )}
      </View>
      <Text style={cmdStyles.count}>{count}</Text>
      <Text style={cmdStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const cmdStyles = StyleSheet.create({
  card: {
    width: (width - 56) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentBadge: {
    backgroundColor: '#E57373',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  urgentText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontFamily: 'DMSans_500Medium',
  },
  count: {
    fontSize: 22,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    marginTop: 4,
  },
  label: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
  },
});

// ── Upgrade Prompt (single elegant CTA) ──────────────────────────────────────

function UpgradePrompt({ currentTier, onPress }: { currentTier: VendorTier; onPress: () => void }) {
  if (currentTier === 'prestige') return null;
  const nextTier = currentTier === 'essential' ? 'Signature' : 'Prestige';
  const desc = currentTier === 'essential'
    ? 'Track revenue, expenses and profit. Broadcast to clients. Build your referral network.'
    : 'Command your entire operation from one dashboard. Team management, procurement, and client sentiment tracking.';

  return (
    <TouchableOpacity style={upgradeStyles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={upgradeStyles.row}>
        <View style={upgradeStyles.iconBox}>
          <Feather name="arrow-up-right" size={14} color="#C9A84C" />
        </View>
        <View style={upgradeStyles.textBox}>
          <Text style={upgradeStyles.title}>Upgrade to {nextTier}</Text>
          <Text style={upgradeStyles.desc}>{desc}</Text>
        </View>
        <Feather name="chevron-right" size={16} color="#C9A84C" />
      </View>
    </TouchableOpacity>
  );
}

const upgradeStyles = StyleSheet.create({
  card: {
    backgroundColor: '#2C2420',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(201,168,76,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBox: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    color: '#C9A84C',
    fontFamily: 'PlayfairDisplay_400Regular',
  },
  desc: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    lineHeight: 16,
  },
});

// ── Prestige Quick Stats Row ─────────────────────────────────────────────────

function PrestigeStatsRow({ dsData }: { dsData: any }) {
  return (
    <View style={pStatsStyles.row}>
      {[
        { num: dsData.activeBookings || 0, label: 'Active', icon: 'briefcase' },
        { num: dsData.overdueTasks || 0, label: 'Overdue', icon: 'alert-circle', alert: true },
        { num: dsData.revenueThisMonth || '0', label: 'Revenue', icon: 'trending-up' },
        { num: dsData.teamOnline || 0, label: 'Team On', icon: 'users' },
      ].map((s, i) => (
        <View key={i} style={pStatsStyles.item}>
          <Feather name={s.icon as any} size={12} color={s.alert && s.num > 0 ? '#E57373' : '#8C7B6E'} />
          <Text style={[pStatsStyles.num, s.alert && s.num > 0 && { color: '#E57373' }]}>
            {s.num}
          </Text>
          <Text style={pStatsStyles.label}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const pStatsStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: '#2C2420',
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  num: {
    fontSize: 20,
    color: '#C9A84C',
    fontFamily: 'PlayfairDisplay_400Regular',
  },
  label: {
    fontSize: 9,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.3,
  },
});

// ── Deluxe Suite Bottom Sheet Items ──────────────────────────────────────────

const DELUXE_SUITE_TABS = [
  { id: 'ds-event-dashboard', icon: 'grid', label: 'Event Dashboard' },
  { id: 'ds-team-hub', icon: 'users', label: 'Team Hub' },
  { id: 'ds-team-chat', icon: 'message-circle', label: 'Team Chat' },
  { id: 'ds-daily-briefing', icon: 'sunrise', label: 'Daily Briefing' },
  { id: 'ds-procurement', icon: 'package', label: 'Procurement' },
  { id: 'ds-deliveries', icon: 'truck', label: 'Deliveries' },
  { id: 'ds-trials', icon: 'clipboard', label: 'Trials' },
  { id: 'ds-photo-approvals', icon: 'image', label: 'Photo Approvals' },
  { id: 'ds-checkin', icon: 'map-pin', label: 'Check-in' },
  { id: 'ds-sentiment', icon: 'heart', label: 'Client Sentiment' },
  { id: 'ds-templates', icon: 'copy', label: 'Delegation' },
  { id: 'ds-performance', icon: 'award', label: 'Performance' },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function VendorDashboardScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Overview');
  const [isLive, setIsLive] = useState(true);
  const [vendorSession, setVendorSession] = useState<any>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAbout, setEditAbout] = useState('');
  const [editStartingPrice, setEditStartingPrice] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editVibes, setEditVibes] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [clientNotes, setClientNotes] = useState<Record<string, string>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // Tools state
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showInvoiceHistory, setShowInvoiceHistory] = useState(false);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | null>(null);
  const [invoiceClient, setInvoiceClient] = useState('');
  const [invoicePhone, setInvoicePhone] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDesc, setInvoiceDesc] = useState('');
  const [invoiceTDSApplicable, setInvoiceTDSApplicable] = useState(false);
  const [invoiceTDSDeductedByClient, setInvoiceTDSDeductedByClient] = useState(false);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [featuredPhotos, setFeaturedPhotos] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Clients state
  const [clients, setClients] = useState<any[]>([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientDate, setNewClientDate] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientCity, setNewClientCity] = useState('');
  const [newClientVenue, setNewClientVenue] = useState('');
  const [newClientPackage, setNewClientPackage] = useState('');
  const [newClientAmount, setNewClientAmount] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');
  const [clientsLoading, setClientsLoading] = useState(false);

  // Contract state
  const [contracts, setContracts] = useState<any[]>([]);
  const [showContractForm, setShowContractForm] = useState(false);
  const [contractClient, setContractClient] = useState('');
  const [contractPhone, setContractPhone] = useState('');
  const [contractEventType, setContractEventType] = useState('Wedding');
  const [contractEventDate, setContractEventDate] = useState('');
  const [contractVenue, setContractVenue] = useState('');
  const [contractServices, setContractServices] = useState('');
  const [contractTotal, setContractTotal] = useState('');
  const [contractAdvance, setContractAdvance] = useState('');
  const [contractDeliverables, setContractDeliverables] = useState('');
  const [contractCancellation, setContractCancellation] = useState('Token amount is non-refundable. Balance refundable if cancelled 30+ days before event.');

  // Expense state
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Travel');
  const [expenseClient, setExpenseClient] = useState('');
  const [expensesLoading, setExpensesLoading] = useState(false);

  // Payment schedule state
  const [paymentSchedules, setPaymentSchedules] = useState<any[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentClient, setPaymentClient] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentTotal, setPaymentTotal] = useState('');
  const [paymentInstalments, setPaymentInstalments] = useState([
    { label: 'Token', amount: '', due_date: '', paid: false },
    { label: 'Advance', amount: '', due_date: '', paid: false },
    { label: 'Final', amount: '', due_date: '', paid: false },
  ]);

  // Team state
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [teamMemberName, setTeamMemberName] = useState('');
  const [teamMemberPhone, setTeamMemberPhone] = useState('');
  const [teamMemberRole, setTeamMemberRole] = useState('');
  const [teamLoading, setTeamLoading] = useState(false);
  const [loginCode, setLoginCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Data state
  const [benchmark, setBenchmark] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [showDateInput, setShowDateInput] = useState(false);
  const [newBlockDate, setNewBlockDate] = useState('');

  // TDS state
  const [tdsLedger, setTdsLedger] = useState<any[]>([]);
  const [tdsSummary, setTdsSummary] = useState<any>(null);
  const [tdsLoading, setTdsLoading] = useState(false);
  const [showTDSEntryForm, setShowTDSEntryForm] = useState(false);
  const [tdsEntryAmount, setTdsEntryAmount] = useState('');
  const [tdsEntryClient, setTdsEntryClient] = useState('');
  const [tdsEntryDeductedBy, setTdsEntryDeductedBy] = useState<'client' | 'self'>('client');
  const [tdsEntryChallan, setTdsEntryChallan] = useState('');

  // Tier state
  const [vendorTier, setVendorTier] = useState<VendorTier>('essential');
  const [foundingBadge, setFoundingBadge] = useState(false);
  const [referralStats, setReferralStats] = useState<any>(null);
  const [showDeluxeSuite, setShowDeluxeSuite] = useState(false);

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<string>('');
  const [datePickerValue, setDatePickerValue] = useState(new Date());

  const openDatePicker = (target: string, currentValue?: string) => {
    setDatePickerTarget(target);
    if (currentValue) {
      const parsed = new Date(currentValue);
      if (!isNaN(parsed.getTime())) setDatePickerValue(parsed);
      else setDatePickerValue(new Date());
    } else {
      setDatePickerValue(new Date());
    }
    setShowDatePicker(true);
  };

  const handleDatePicked = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (!selectedDate || event.type === 'dismissed') return;
    const formatted = selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    if (datePickerTarget === 'clientDate') setNewClientDate(formatted);
    else if (datePickerTarget === 'promoExpiry') setNewPromoExpiry(formatted);
    else if (datePickerTarget === 'blockDate') setNewBlockDate(formatted);
    else if (datePickerTarget === 'contractDate') setContractEventDate(formatted);
    else if (datePickerTarget === 'dsTaskDue') setNewTaskDueDate(formatted);
    else if (datePickerTarget.startsWith('instalment_')) {
      const idx = parseInt(datePickerTarget.split('_')[1]);
      const u = [...paymentInstalments];
      u[idx] = { ...u[idx], due_date: formatted };
      setPaymentInstalments(u);
    }
  };

  // Deluxe Suite create states
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [dsTeamMembers, setDsTeamMembers] = useState<any[]>([]);
  const [dsMessages, setDsMessages] = useState<any[]>([]);
  const [dsNewMessage, setDsNewMessage] = useState('');
  const [dsChannel, setDsChannel] = useState('general');
  const [dsCheckins, setDsCheckins] = useState<any[]>([]);
  const [dsSentiment, setDsSentiment] = useState<any[]>([]);
  const [dsPhotos, setDsPhotos] = useState<any[]>([]);
  const [dsTemplates, setDsTemplates] = useState<any[]>([]);
  const [dsPerformance, setDsPerformance] = useState<any[]>([]);

  // WhatsApp broadcast state
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Prestige Deluxe Suite data
  const [dsData, setDsData] = useState({
    activeBookings: 0,
    overdueTasks: 0,
    revenueThisMonth: '0',
    teamOnline: 0,
    tasks: [] as any[],
    procurement: [] as any[],
    deliveries: [] as any[],
    trials: [] as any[],
    teamActivity: [] as any[],
    appointments: [] as any[],
  });

  // Promo state
  const [promos, setPromos] = useState([
    { id: '1', title: '15% Off December Bookings', expires: 'Nov 30, 2025', active: true, leads: 12 },
    { id: '2', title: 'Free Pre-Wedding Shoot', expires: 'Dec 15, 2025', active: false, leads: 0 },
  ]);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [newPromoTitle, setNewPromoTitle] = useState('');
  const [newPromoExpiry, setNewPromoExpiry] = useState('');

  useEffect(() => { loadSession(); }, []);

  useEffect(() => {
    if (vendorSession?.vendorId) {
      loadBenchmark();
      loadInvoices();
      loadSubscription();
      if (activeTab === 'Inquiries') { loadLeads(); loadBookings(); }
      if (activeTab === 'Calendar') { loadBlockedDates(); }
      if (activeTab === 'Clients') { loadClients(); }
      if (activeTab === 'Payments') { loadPaymentSchedules(); }
      if (activeTab === 'Contracts') { loadContracts(); }
      if (activeTab === 'Expenses') { loadExpenses(); }
      if (activeTab === 'Tax') { loadTDS(); }
      if (activeTab === 'Team') { loadTeamMembers(); }
      if (activeTab === 'Referral') { loadReferralStats(); }
      if (activeTab === 'WhatsApp') { loadClients(); }
      if (activeTab === 'Analytics') { loadLeads(); loadBookings(); loadInvoices(); loadExpenses(); }
    }
  }, [vendorSession, activeTab]);

  // Load Prestige data when tier is prestige
  useEffect(() => {
    if (vendorTier === 'prestige' && vendorSession?.vendorId) {
      loadDeluxeSuiteData();
    }
  }, [vendorTier, vendorSession]);

  // ── Load Subscription/Tier ─────────────────────────────────────────────────

  const loadSubscription = async () => {
    try {
      const res = await fetch(`${API}/api/subscriptions/${vendorSession.vendorId}`);
      const data = await res.json();
      if (data.success && data.data?.tier) {
        setVendorTier(data.data.tier as VendorTier);
        if (data.data.founding_badge) setFoundingBadge(true);
      }
    } catch (e) {}
  };

  const loadReferralStats = async () => {
    try {
      const res = await fetch(`${API}/api/referrals/stats/${vendorSession.vendorId}`);
      const data = await res.json();
      if (data.success) setReferralStats(data.data);
    } catch (e) {}
  };

  const loadDeluxeSuiteData = async () => {
    try {
      const [briefingRes, tasksRes, procRes, delRes, trialsRes, teamRes, msgRes, checkRes, sentRes, photoRes, tmplRes, perfRes] = await Promise.all([
        fetch(`${API}/api/ds/briefing/${vendorSession.vendorId}`).then(r => r.json()),
        fetch(`${API}/api/ds/tasks/${vendorSession.vendorId}`).then(r => r.json()),
        fetch(`${API}/api/ds/procurement/${vendorSession.vendorId}`).then(r => r.json()),
        fetch(`${API}/api/ds/deliveries/${vendorSession.vendorId}`).then(r => r.json()),
        fetch(`${API}/api/ds/trials/${vendorSession.vendorId}`).then(r => r.json()),
        fetch(`${API}/api/ds/team/${vendorSession.vendorId}`).then(r => r.json()),
        fetch(`${API}/api/ds/messages/${vendorSession.vendorId}`).then(r => r.json()),
        fetch(`${API}/api/ds/checkins/${vendorSession.vendorId}`).then(r => r.json()),
        fetch(`${API}/api/ds/sentiment/${vendorSession.vendorId}`).then(r => r.json()),
        fetch(`${API}/api/ds/photos/${vendorSession.vendorId}`).then(r => r.json()),
        fetch(`${API}/api/ds/templates/${vendorSession.vendorId}`).then(r => r.json()),
        fetch(`${API}/api/ds/performance/${vendorSession.vendorId}`).then(r => r.json()),
      ]);
      if (teamRes.success) setDsTeamMembers(teamRes.data || []);
      if (msgRes.success) setDsMessages(msgRes.data || []);
      if (checkRes.success) setDsCheckins(checkRes.data || []);
      if (sentRes.success) setDsSentiment(sentRes.data || []);
      if (photoRes.success) setDsPhotos(photoRes.data || []);
      if (tmplRes.success) setDsTemplates(tmplRes.data || []);
      if (perfRes.success) setDsPerformance(perfRes.data || []);
      const tasks = tasksRes.success ? tasksRes.data || [] : [];
      const overdue = tasks.filter((t: any) => t.status !== 'completed' && new Date(t.due_date) < new Date()).length;
      setDsData({
        activeBookings: briefingRes.success ? briefingRes.data?.active_bookings || 0 : 0,
        overdueTasks: overdue,
        revenueThisMonth: briefingRes.success ? briefingRes.data?.revenue_this_month || '0' : '0',
        teamOnline: briefingRes.success ? briefingRes.data?.team_online || 0 : 0,
        tasks,
        procurement: procRes.success ? procRes.data || [] : [],
        deliveries: delRes.success ? delRes.data || [] : [],
        trials: trialsRes.success ? trialsRes.data || [] : [],
        teamActivity: [],
        appointments: [],
      });
    } catch (e) {}
  };

  // ── All existing business logic functions (unchanged) ──────────────────────

  // ── Deluxe Suite Handlers ────────────────────────────────────────────────

  const handleCreateDsTask = async () => {
    if (!newTaskTitle) { Alert.alert('Missing info', 'Please enter a task title.'); return; }
    try {
      const res = await fetch(`${API}/api/ds/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: vendorSession.vendorId, title: newTaskTitle, assigned_to: newTaskAssignee || null, priority: newTaskPriority, due_date: newTaskDueDate || null, status: 'pending' }) });
      const data = await res.json();
      if (data.success) {
        setDsData(prev => ({ ...prev, tasks: [data.data, ...prev.tasks] }));
        setNewTaskTitle(''); setNewTaskAssignee(''); setNewTaskDueDate(''); setShowCreateTask(false);
      }
    } catch (e) { Alert.alert('Error', 'Could not create task.'); }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await fetch(`${API}/api/ds/tasks/${taskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      setDsData(prev => ({ ...prev, tasks: prev.tasks.map((t: any) => t.id === taskId ? { ...t, status: newStatus } : t) }));
    } catch (e) {}
  };

  const handleUpdateProcStatus = async (id: string, newStatus: string) => {
    try {
      await fetch(`${API}/api/ds/procurement/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      setDsData(prev => ({ ...prev, procurement: prev.procurement.map((p: any) => p.id === id ? { ...p, status: newStatus } : p) }));
    } catch (e) {}
  };

  const handleUpdateDelStatus = async (id: string, newStatus: string) => {
    try {
      await fetch(`${API}/api/ds/deliveries/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      setDsData(prev => ({ ...prev, deliveries: prev.deliveries.map((d: any) => d.id === id ? { ...d, status: newStatus } : d) }));
    } catch (e) {}
  };

  const handleSendDsMessage = async () => {
    if (!dsNewMessage.trim()) return;
    try {
      const res = await fetch(`${API}/api/ds/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: vendorSession.vendorId, channel: dsChannel, sender_name: vendorSession.vendorName || 'Owner', message: dsNewMessage }) });
      const data = await res.json();
      if (data.success) { setDsMessages(prev => [data.data, ...prev]); setDsNewMessage(''); }
    } catch (e) {}
  };

  const handleApprovePhoto = async (photoId: string, status: string) => {
    try {
      await fetch(`${API}/api/ds/photos/${photoId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      setDsPhotos(prev => prev.map((p: any) => p.id === photoId ? { ...p, status } : p));
    } catch (e) {}
  };

  const handleUpdateTrialStatus = async (trialId: string, status: string) => {
    try {
      await fetch(`${API}/api/ds/trials/${trialId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      setDsData(prev => ({ ...prev, trials: prev.trials.map((t: any) => t.id === trialId ? { ...t, status } : t) }));
    } catch (e) {}
  };

  const openSettings = async () => {
    try {
      const res = await fetch(`${API}/api/vendors/${vendorSession.vendorId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setEditName(data.data.name || '');
        setEditAbout(data.data.about || '');
        setEditStartingPrice(String(data.data.starting_price || ''));
        setEditInstagram(data.data.instagram_url || '');
        setEditCity(data.data.city || '');
        setEditVibes(data.data.vibe_tags || []);
      }
    } catch (e) {}
    setShowSettingsModal(true);
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const res = await fetch(`${API}/api/vendors/${vendorSession.vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName, about: editAbout, starting_price: parseInt(editStartingPrice) || 0,
          instagram_url: editInstagram, city: editCity, vibe_tags: editVibes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const updatedSession = { ...vendorSession, vendorName: editName, city: editCity };
        await AsyncStorage.setItem('vendor_session', JSON.stringify(updatedSession));
        setVendorSession(updatedSession);
        setShowSettingsModal(false);
        Alert.alert('Profile Updated', 'Your changes are live on The Dream Wedding.');
      }
    } catch (e) { Alert.alert('Error', 'Could not save profile.'); }
    finally { setSavingProfile(false); }
  };

  const handleSaveClientNote = async (clientId: string) => {
    try {
      await fetch(`${API}/api/vendor-clients/${clientId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: noteText }),
      });
      setClientNotes(prev => ({ ...prev, [clientId]: noteText }));
      setEditingNoteId(null); setNoteText('');
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, notes: noteText } : c));
    } catch (e) { Alert.alert('Error', 'Could not save note.'); }
  };

  const loadContracts = async () => {
    try {
      const res = await fetch(`${API}/api/contracts/${vendorSession.vendorId}`);
      const data = await res.json();
      if (data.success) setContracts(data.data || []);
    } catch (e) {}
  };

  const loadExpenses = async () => {
    try {
      setExpensesLoading(true);
      const res = await fetch(`${API}/api/expenses/${vendorSession.vendorId}`);
      const data = await res.json();
      if (data.success) setExpenses(data.data || []);
    } catch (e) {} finally { setExpensesLoading(false); }
  };

  const loadPaymentSchedules = async () => {
    try {
      const res = await fetch(`${API}/api/payment-schedules/${vendorSession.vendorId}`);
      const data = await res.json();
      if (data.success) setPaymentSchedules(data.data || []);
    } catch (e) {}
  };

  const loadTeamMembers = async () => {
    try {
      setTeamLoading(true);
      const res = await fetch(`${API}/api/team/${vendorSession.vendorId}`);
      const data = await res.json();
      if (data.success) setTeamMembers(data.data || []);
    } catch (e) {} finally { setTeamLoading(false); }
  };

  const handleGenerateContract = async () => {
    if (!contractClient || !contractTotal || !contractEventDate) {
      Alert.alert('Missing info', 'Please enter client name, event date and total amount.');
      return;
    }
    try {
      const balance = parseInt(contractTotal) - parseInt(contractAdvance || '0');
      const contractData = {
        vendor_id: vendorSession.vendorId, client_name: contractClient, client_phone: contractPhone,
        event_type: contractEventType, event_date: contractEventDate, venue: contractVenue,
        service_description: contractServices, total_amount: parseInt(contractTotal),
        advance_amount: parseInt(contractAdvance || '0'), balance_amount: balance,
        deliverables: contractDeliverables, cancellation_policy: contractCancellation, status: 'issued',
      };
      await fetch(`${API}/api/contracts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contractData) });

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Helvetica,sans-serif;padding:40px;color:#2C2420}h1{font-size:28px;font-weight:300;letter-spacing:4px;margin-bottom:4px}h2{font-size:11px;color:#8C7B6E;letter-spacing:2px;text-transform:uppercase;margin-bottom:32px}.section{margin-bottom:28px}.section-title{font-size:10px;color:#8C7B6E;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;border-bottom:1px solid #E8E0D5;padding-bottom:6px}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F5F0E8;font-size:13px}.amount-box{background:#2C2420;color:#F5F0E8;padding:20px;border-radius:8px;margin:20px 0}.amount-row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px}.amount-gold{color:#C9A84C;font-size:20px;font-weight:300}.terms{background:#F5F0E8;padding:16px;border-radius:8px;font-size:12px;color:#8C7B6E;line-height:1.6}.signature{display:flex;justify-content:space-between;margin-top:60px}.sig-box{width:45%;border-top:1px solid #2C2420;padding-top:8px;font-size:12px;color:#8C7B6E}.footer{margin-top:40px;font-size:10px;color:#8C7B6E;text-align:center;border-top:1px solid #E8E0D5;padding-top:16px}</style></head><body><h1>THE DREAM WEDDING</h1><h2>Service Agreement</h2><div class="section"><div class="section-title">Parties</div><div class="row"><span>Vendor</span><span><strong>${vendorSession?.vendorName || 'Vendor'}</strong></span></div><div class="row"><span>Client</span><span><strong>${contractClient}</strong></span></div>${contractPhone ? `<div class="row"><span>Client Phone</span><span>${contractPhone}</span></div>` : ''}</div><div class="section"><div class="section-title">Event Details</div><div class="row"><span>Event Type</span><span>${contractEventType}</span></div><div class="row"><span>Event Date</span><span><strong>${contractEventDate}</strong></span></div>${contractVenue ? `<div class="row"><span>Venue</span><span>${contractVenue}</span></div>` : ''}</div>${contractServices ? `<div class="section"><div class="section-title">Services</div><p style="font-size:13px;line-height:1.6;color:#2C2420">${contractServices}</p></div>` : ''}${contractDeliverables ? `<div class="section"><div class="section-title">Deliverables</div><p style="font-size:13px;line-height:1.6;color:#2C2420">${contractDeliverables}</p></div>` : ''}<div class="amount-box"><div class="amount-row"><span>Total Amount</span><span class="amount-gold">Rs.${parseInt(contractTotal).toLocaleString('en-IN')}</span></div><div class="amount-row"><span>Advance / Token</span><span>Rs.${parseInt(contractAdvance || '0').toLocaleString('en-IN')}</span></div><div class="amount-row"><span>Balance Due</span><span>Rs.${balance.toLocaleString('en-IN')}</span></div></div><div class="section"><div class="section-title">Cancellation Policy</div><div class="terms">${contractCancellation}</div></div><div class="section"><div class="section-title">Additional Terms</div><div class="terms">1. This agreement is binding once the advance amount is received.<br>2. Any additional services requested on the day will be charged separately.<br>3. The vendor reserves the right to use images/videos for portfolio purposes unless requested otherwise in writing.<br>4. Disputes subject to jurisdiction of courts in ${vendorSession?.city || 'Delhi NCR'}.</div></div><div class="signature"><div class="sig-box"><strong>${vendorSession?.vendorName || 'Vendor'}</strong><br>Vendor Signature & Date</div><div class="sig-box"><strong>${contractClient}</strong><br>Client Signature & Date</div></div><div class="footer">Generated by The Dream Wedding · thedreamwedding.in · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div></body></html>`;

      const printModule = await import('expo-print');
      const sharingModule = await import('expo-sharing');
      const { uri } = await printModule.printToFileAsync({ html });
      await sharingModule.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Service Agreement', UTI: 'com.adobe.pdf' });

      loadContracts();
      setContractClient(''); setContractPhone(''); setContractEventDate(''); setContractVenue('');
      setContractServices(''); setContractTotal(''); setContractAdvance(''); setContractDeliverables('');
      setShowContractForm(false);
      Alert.alert('Contract Ready', 'PDF generated. Share via WhatsApp with your client.');
    } catch (e) { Alert.alert('Error', 'Could not generate contract.'); }
  };

  const handleAddExpense = async () => {
    if (!expenseDesc || !expenseAmount) { Alert.alert('Missing info', 'Please enter description and amount.'); return; }
    try {
      const res = await fetch(`${API}/api/expenses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorSession.vendorId, description: expenseDesc, amount: parseInt(expenseAmount), category: expenseCategory, client_name: expenseClient, expense_date: new Date().toLocaleDateString('en-IN') }),
      });
      const data = await res.json();
      if (data.success) {
        setExpenses(prev => [data.data, ...prev]);
        setExpenseDesc(''); setExpenseAmount(''); setExpenseClient(''); setShowExpenseForm(false);
        Alert.alert('Expense Added', 'Expense recorded successfully.');
      }
    } catch (e) { Alert.alert('Error', 'Could not save expense.'); }
  };

  const handleDeleteExpense = async (id: string) => {
    try { await fetch(`${API}/api/expenses/${id}`, { method: 'DELETE' }); setExpenses(prev => prev.filter(e => e.id !== id)); } catch (e) {}
  };

  const handleSavePaymentSchedule = async () => {
    if (!paymentClient || !paymentTotal) { Alert.alert('Missing info', 'Please enter client name and total amount.'); return; }
    try {
      const res = await fetch(`${API}/api/payment-schedules`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorSession.vendorId, client_name: paymentClient, client_phone: paymentPhone, total_amount: parseInt(paymentTotal), instalments: paymentInstalments }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentSchedules(prev => [data.data, ...prev]);
        setPaymentClient(''); setPaymentPhone(''); setPaymentTotal('');
        setPaymentInstalments([ { label: 'Token', amount: '', due_date: '', paid: false }, { label: 'Advance', amount: '', due_date: '', paid: false }, { label: 'Final', amount: '', due_date: '', paid: false } ]);
        setShowPaymentForm(false);
        Alert.alert('Schedule Saved', 'Payment schedule created successfully.');
      }
    } catch (e) { Alert.alert('Error', 'Could not save payment schedule.'); }
  };

  const handleShareContract = async (contract: any) => {
    try {
      await generateContractPDF({
        vendorName: vendorSession?.vendorName || 'Vendor', vendorPhone: vendorSession?.phone || '', vendorCity: vendorSession?.city || '',
        clientName: contract.client_name || 'Client', clientPhone: contract.client_phone || '', eventType: contract.event_type || 'Wedding',
        eventDate: contract.event_date || 'TBD', venue: contract.venue || '', services: contract.services || '',
        totalAmount: contract.total_amount || 0, advanceAmount: contract.advance_amount || 0,
        deliverables: contract.deliverables || '', cancellationTerms: contract.cancellation_terms || 'Token amount is non-refundable. Balance refundable if cancelled 30+ days before event.',
      });
    } catch (e) { Alert.alert('Error', 'Could not generate contract PDF.'); }
  };

  const handleMarkInstalmentPaid = async (scheduleId: string, instalmentIndex: number) => {
    try {
      const schedule = paymentSchedules.find(s => s.id === scheduleId);
      if (!schedule) return;
      const updated = [...schedule.instalments];
      updated[instalmentIndex] = { ...updated[instalmentIndex], paid: true };
      await fetch(`${API}/api/payment-schedules/${scheduleId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instalments: updated }) });
      setPaymentSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, instalments: updated } : s));
    } catch (e) { Alert.alert('Error', 'Could not update payment.'); }
  };

  const handleAddTeamMember = async () => {
    if (!teamMemberName || !teamMemberRole) { Alert.alert('Missing info', 'Please enter name and role.'); return; }
    try {
      const res = await fetch(`${API}/api/team`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: vendorSession.vendorId, name: teamMemberName, phone: teamMemberPhone, role: teamMemberRole }) });
      const data = await res.json();
      if (data.success) {
        setTeamMembers(prev => [data.data, ...prev]);
        setTeamMemberName(''); setTeamMemberPhone(''); setTeamMemberRole(''); setShowTeamForm(false);
        Alert.alert('Team Member Added', `${teamMemberName} added to your team.`);
      }
    } catch (e) { Alert.alert('Error', 'Could not add team member.'); }
  };

  const handleRemoveTeamMember = async (id: string) => {
    try { await fetch(`${API}/api/team/${id}`, { method: 'DELETE' }); setTeamMembers(prev => prev.filter(m => m.id !== id)); } catch (e) {}
  };

  const handleGenerateCode = async () => {
    try {
      setGeneratingCode(true);
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await fetch(`${API}/api/vendor-login-codes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: vendorSession.vendorId, code, expires_at: expires }) });
      setLoginCode(code);
      setTimeout(() => setLoginCode(null), 5 * 60 * 1000);
    } catch (e) { Alert.alert('Error', 'Could not generate code. Please try again.'); }
    finally { setGeneratingCode(false); }
  };

  const loadSession = async () => {
    try { const stored = await AsyncStorage.getItem('vendor_session'); if (stored) setVendorSession(JSON.parse(stored)); } catch (e) {}
  };

  const loadBenchmark = async () => {
    try { const res = await getBenchmark(vendorSession?.category || 'photographers', vendorSession?.city || 'Delhi NCR'); if (res.success) setBenchmark(res.data); } catch (e) {}
  };

  const loadLeads = async () => {
    try {
      setLeadsLoading(true);
      const cacheKey = `cache_leads_${vendorSession.vendorId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) setLeads(JSON.parse(cached));
      const res = await getLeads(vendorSession.vendorId);
      if (res.success && res.data?.length > 0) { setLeads(res.data); AsyncStorage.setItem(cacheKey, JSON.stringify(res.data)); }
    } catch (e) {} finally { setLeadsLoading(false); }
  };

  const loadBookings = async () => {
    try {
      setBookingsLoading(true);
      const cacheKey = `cache_bookings_${vendorSession.vendorId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) setBookings(JSON.parse(cached));
      const res = await getVendorBookings(vendorSession.vendorId);
      if (res.success) { setBookings(res.data || []); AsyncStorage.setItem(cacheKey, JSON.stringify(res.data || [])); }
    } catch (e) {} finally { setBookingsLoading(false); }
  };

  const loadInvoices = async () => {
    try {
      const cacheKey = `cache_invoices_${vendorSession.vendorId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) setInvoices(JSON.parse(cached));
      const res = await getInvoices(vendorSession.vendorId);
      if (res.success) { setInvoices(res.data || []); AsyncStorage.setItem(cacheKey, JSON.stringify(res.data || [])); }
    } catch (e) {}
  };

  const loadBlockedDates = async () => {
    try {
      setCalendarLoading(true);
      const cacheKey = `cache_calendar_${vendorSession.vendorId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) setBlockedDates(JSON.parse(cached));
      const res = await getBlockedDates(vendorSession.vendorId);
      if (res.success) { setBlockedDates(res.data || []); AsyncStorage.setItem(cacheKey, JSON.stringify(res.data || [])); }
    } catch (e) {} finally { setCalendarLoading(false); }
  };

  const loadTDS = async () => {
    try {
      setTdsLoading(true);
      const [ledgerRes, summaryRes] = await Promise.all([
        fetch(`${API}/api/tds/${vendorSession.vendorId}`).then(r => r.json()),
        fetch(`${API}/api/tds/${vendorSession.vendorId}/summary`).then(r => r.json()),
      ]);
      if (ledgerRes.success) setTdsLedger(ledgerRes.data || []);
      if (summaryRes.success) setTdsSummary(summaryRes.data);
    } catch (e) {} finally { setTdsLoading(false); }
  };

  const handleAddTDSEntry = async () => {
    if (!tdsEntryAmount || !tdsEntryClient) { Alert.alert('Missing info', 'Please enter client name and amount.'); return; }
    try {
      const res = await fetch(`${API}/api/tds`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: vendorSession.vendorId, transaction_type: 'client_invoice', gross_amount: parseInt(tdsEntryAmount), tds_deducted_by: tdsEntryDeductedBy, challan_number: tdsEntryChallan, notes: `Client: ${tdsEntryClient}` }) });
      const data = await res.json();
      if (data.success) { Alert.alert('Entry Added', 'TDS entry recorded successfully.'); setTdsEntryAmount(''); setTdsEntryClient(''); setTdsEntryChallan(''); setShowTDSEntryForm(false); loadTDS(); }
    } catch (e) { Alert.alert('Error', 'Could not save TDS entry.'); }
  };

  const handleBlockDate = async () => {
    if (!newBlockDate.trim()) return;
    try {
      const res = await blockDate(vendorSession.vendorId, newBlockDate.trim());
      if (res.success) { setBlockedDates(prev => [...prev, res.data]); setNewBlockDate(''); setShowDateInput(false); }
    } catch (e) { Alert.alert('Error', 'Could not block date.'); }
  };

  const handleUnblockDate = async (id: string) => {
    try { await unblockDate(id); setBlockedDates(prev => prev.filter(d => d.id !== id)); } catch (e) { Alert.alert('Error', 'Could not unblock date.'); }
  };

  const loadClients = async () => {
    try {
      setClientsLoading(true);
      const res = await fetch(`${API}/api/vendor-clients/${vendorSession.vendorId}`);
      const data = await res.json();
      if (data.success && data.data?.length > 0) { setClients(data.data); AsyncStorage.setItem(`vendor_clients_${vendorSession.vendorId}`, JSON.stringify(data.data)); }
      else { const stored = await AsyncStorage.getItem(`vendor_clients_${vendorSession.vendorId}`); if (stored) setClients(JSON.parse(stored)); }
    } catch (e) { try { const stored = await AsyncStorage.getItem(`vendor_clients_${vendorSession.vendorId}`); if (stored) setClients(JSON.parse(stored)); } catch {} }
    finally { setClientsLoading(false); }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => { await AsyncStorage.removeItem('vendor_session'); await AsyncStorage.removeItem('user_session'); router.replace('/login'); } }
    ]);
  };

  const handleImageUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission needed', 'Please allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
    if (!result.canceled) {
      const asset = result.assets[0];
      // Resolution check — minimum 1080px on shortest side
      const minDim = Math.min(asset.width || 0, asset.height || 0);
      if (minDim > 0 && minDim < 1080) {
        Alert.alert(
          'Higher Resolution Needed',
          'For the best presentation of your work, please upload photos with a minimum resolution of 1080px. This photo is ' + minDim + 'px on the shortest side.',
          [
            { text: 'Upload Anyway', onPress: async () => {
              try { setUploadingImage(true); const url = await uploadImage(asset.uri); setPortfolioImages(prev => [...prev, url]); Alert.alert('Uploaded', 'Photo added. Consider replacing with a higher resolution version for best results.'); }
              catch { Alert.alert('Upload failed', 'Please try again.'); }
              finally { setUploadingImage(false); }
            }},
            { text: 'Choose Another', style: 'cancel' },
          ]
        );
        return;
      }
      try {
        setUploadingImage(true);
        const url = await uploadImage(asset.uri);
        setPortfolioImages(prev => [...prev, url]);
        // Ask if this should be a swipe hero
        Alert.alert(
          'Featured?',
          'Should this photo appear in the discover feed? Mark your best work as featured so couples see your strongest images first.',
          [
            { text: 'Portfolio Only', style: 'cancel' },
            { text: 'Mark as Featured', onPress: () => {
              setFeaturedPhotos(prev => [...prev, url]);
              // Save to backend
              if (vendorSession?.vendorId) {
                fetch(API + '/api/vendors/' + vendorSession.vendorId, {
                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ featured_photos: [...featuredPhotos, url] }),
                }).catch(() => {});
              }
            }},
          ]
        );
      }
      catch { Alert.alert('Upload failed', 'Please try again.'); }
      finally { setUploadingImage(false); }
    }
  };

  const handleSendWhatsAppInvite = async (client: any) => {
    const message = `Hi ${client.name.split('&')[0].trim()}!\n\nI have added you to The Dream Wedding — India's premium wedding planning app.\n\nYour booking history with me is already saved. You can also discover other vendors and plan your entire wedding in one place.\n\nDownload here: https://thedreamwedding.in\n\nSee you there!`;
    const url = `whatsapp://send?phone=91${client.phone}&text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url).then(async supported => {
      if (supported) {
        Linking.openURL(url);
        try { await fetch(`${API}/api/vendor-clients/${client.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invited: true }) }); } catch {}
        setClients(prev => prev.map(c => c.id === client.id ? { ...c, invited: true } : c));
      } else { Alert.alert('WhatsApp not found', 'Please make sure WhatsApp is installed.'); }
    });
  };

  const handleAddClient = async () => {
    if (!newClientName || !newClientPhone || !newClientDate) { Alert.alert('Missing info', 'Please fill in all fields.'); return; }
    try {
      const res = await fetch(`${API}/api/vendor-clients`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: vendorSession.vendorId, name: newClientName, phone: newClientPhone, wedding_date: newClientDate, email: newClientEmail || undefined, city: newClientCity || undefined, venue: newClientVenue || undefined, package_name: newClientPackage || undefined, total_amount: newClientAmount ? parseInt(newClientAmount) : undefined, notes: newClientNotes || undefined, status: 'upcoming', invited: false, source: 'app' }) });
      const data = await res.json();
      if (data.success) {
        setClients(prev => [data.data, ...prev]);
        setNewClientName(''); setNewClientPhone(''); setNewClientDate(''); setNewClientEmail(''); setNewClientCity(''); setNewClientVenue(''); setNewClientPackage(''); setNewClientAmount(''); setNewClientNotes(''); setShowAddClient(false);
        Alert.alert('Client Added!', `${newClientName} added. Tap Send Invite to invite them via WhatsApp.`);
      }
    } catch (e) { Alert.alert('Error', 'Could not save client.'); }
  };

  const handleConfirmBooking = async (bookingId: string) => {
    Alert.alert('Confirm Booking', 'This will lock the date and activate Payment Shield release to you.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        try {
          const res = await fetch(`${API}/api/bookings/${bookingId}/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
          const data = await res.json();
          if (data.success) { Alert.alert('Confirmed!', 'Payment Shield released successfully. TDS entry recorded automatically.'); loadBookings(); }
          else Alert.alert('Error', data.error || 'Could not confirm.');
        } catch (e) { Alert.alert('Error', 'Network error.'); }
      }}
    ]);
  };

  const handleDeclineBooking = async (bookingId: string) => {
    Alert.alert('Decline Booking', 'Token will be refunded. Platform fee is retained.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: async () => {
        try {
          const res = await fetch(`${API}/api/bookings/${bookingId}/decline`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Vendor unavailable' }) });
          const data = await res.json();
          if (data.success) { Alert.alert('Declined', 'Refund initiated.'); loadBookings(); }
          else Alert.alert('Error', data.error || 'Could not decline.');
        } catch (e) { Alert.alert('Error', 'Network error.'); }
      }}
    ]);
  };

  const handleGenerateInvoice = async () => {
    if (!invoiceClient || !invoiceAmount) { Alert.alert('Missing info', 'Please enter client name and amount.'); return; }
    try {
      const invNumber = generateInvoiceNumber();
      await fetch(`${API}/api/invoices/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendor_id: vendorSession.vendorId, client_name: invoiceClient, client_phone: invoicePhone, amount: parseInt(invoiceAmount), description: invoiceDesc || 'Wedding Services', invoice_number: invNumber, tds_applicable: invoiceTDSApplicable, tds_deducted_by_client: invoiceTDSDeductedByClient, tds_rate: 10 }) });
      await generateInvoicePDF({ vendorName: vendorSession?.vendorName || 'Your Business', vendorPhone: vendorSession?.phone || '', vendorCity: vendorSession?.city || '', clientName: invoiceClient, amount: parseInt(invoiceAmount), description: invoiceDesc || 'Wedding Services', invoiceNumber: invNumber, date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) });
      loadInvoices(); if (invoiceTDSApplicable) loadTDS();
      setInvoiceClient(''); setInvoicePhone(''); setInvoiceAmount(''); setInvoiceDesc(''); setInvoiceTDSApplicable(false); setInvoiceTDSDeductedByClient(false); setShowInvoiceForm(false);
    } catch { Alert.alert('Error', 'Could not generate invoice.'); }
  };

  const handleMarkInvoicePaid = async (invoiceId: string) => {
    try {
      setUpdatingInvoiceId(invoiceId);
      await fetch(`${API}/api/invoices/${invoiceId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'paid' }) });
      setInvoices(prev => prev.map((inv: any) => inv.id === invoiceId ? { ...inv, status: 'paid' } : inv));
    } catch (e) { Alert.alert('Error', 'Could not update invoice status.'); }
    finally { setUpdatingInvoiceId(null); }
  };

  const handleCreatePromo = () => {
    if (!newPromoTitle || !newPromoExpiry) { Alert.alert('Missing info', 'Please fill in all fields.'); return; }
    setPromos(prev => [...prev, { id: Date.now().toString(), title: newPromoTitle, expires: newPromoExpiry, active: true, leads: 0 }]);
    setNewPromoTitle(''); setNewPromoExpiry(''); setShowPromoForm(false);
    Alert.alert('Promo Live!', 'Couples in your city will be notified.');
  };

  const vendorName = vendorSession?.vendorName || 'Your Business';
  const vendorCategory = vendorSession?.category ? vendorSession.category.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Vendor';
  const vendorCity = vendorSession?.city || '';
  const pendingBookings = bookings.filter((b: any) => b.status === 'pending_confirmation');
  const confirmedBookings = bookings.filter((b: any) => b.status === 'confirmed');

  const displayLeads = leads.length > 0 ? leads : [
    { id: '1', name: 'Priya & Rahul', stage: 'New Inquiry', date: 'Dec 15', value: '\u20B93,00,000' },
    { id: '2', name: 'Sneha & Arjun', stage: 'Quoted', date: 'Nov 20', value: '\u20B91,50,000' },
    { id: '3', name: 'Ananya & Dev', stage: 'New Inquiry', date: 'Jan 5', value: '\u20B93,00,000' },
    { id: '4', name: 'Kavya & Rohan', stage: 'Token Received', date: 'Feb 14', value: '\u20B93,00,000' },
    { id: '5', name: 'Meera & Vikram', stage: 'Completed', date: 'Oct 10', value: '\u20B93,00,000' },
  ];

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════════

  return (
    <View style={styles.container}>

      {/* ── Modals (shared across all tiers) ── */}

      {/* Add Client Modal */}
      <Modal visible={showAddClient} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Client</Text>
            <Text style={styles.modalSubtitle}>Saved securely to your account</Text>
            <TextInput style={styles.modalInput} placeholder="Couple names (e.g. Priya & Rahul)" placeholderTextColor="#8C7B6E" value={newClientName} onChangeText={setNewClientName} />
            <TextInput style={styles.modalInput} placeholder="Phone number (10 digits)" placeholderTextColor="#8C7B6E" value={newClientPhone} onChangeText={setNewClientPhone} keyboardType="phone-pad" maxLength={10} />
            <TouchableOpacity style={styles.modalInput} onPress={() => openDatePicker('clientDate', newClientDate)}><Text style={{ fontSize: 14, color: newClientDate ? '#2C2420' : '#8C7B6E', fontFamily: 'DMSans_400Regular' }}>{newClientDate || 'Wedding date'}</Text></TouchableOpacity>
            <TextInput style={styles.modalInput} placeholder="Email (optional)" placeholderTextColor="#8C7B6E" value={newClientEmail} onChangeText={setNewClientEmail} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={styles.modalInput} placeholder="Wedding city (optional)" placeholderTextColor="#8C7B6E" value={newClientCity} onChangeText={setNewClientCity} />
            <TextInput style={styles.modalInput} placeholder="Venue (optional)" placeholderTextColor="#8C7B6E" value={newClientVenue} onChangeText={setNewClientVenue} />
            <TextInput style={styles.modalInput} placeholder="Package selected (optional)" placeholderTextColor="#8C7B6E" value={newClientPackage} onChangeText={setNewClientPackage} />
            <TextInput style={styles.modalInput} placeholder="Total amount (optional)" placeholderTextColor="#8C7B6E" value={newClientAmount} onChangeText={setNewClientAmount} keyboardType="numeric" />
            <TextInput style={styles.modalInput} placeholder="Notes (optional)" placeholderTextColor="#8C7B6E" value={newClientNotes} onChangeText={setNewClientNotes} multiline />
            <TouchableOpacity style={styles.modalBtn} onPress={handleAddClient}><Text style={styles.modalBtnText}>ADD CLIENT</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddClient(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings / Profile Edit Modal */}
      <Modal visible={showSettingsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Text style={styles.modalSubtitle}>Changes go live immediately on The Dream Wedding</Text>
              <View style={styles.settingsSection}><Text style={styles.settingsSectionLabel}>BUSINESS NAME</Text><TextInput style={styles.settingsInput} value={editName} onChangeText={setEditName} placeholder="Your business name" placeholderTextColor="#8C7B6E" /></View>
              <View style={styles.settingsSection}><Text style={styles.settingsSectionLabel}>ABOUT</Text><TextInput style={[styles.settingsInput, { height: 90, textAlignVertical: 'top' }]} value={editAbout} onChangeText={setEditAbout} placeholder="Tell couples what makes you special..." placeholderTextColor="#8C7B6E" multiline /></View>
              <View style={styles.settingsSection}><Text style={styles.settingsSectionLabel}>STARTING PRICE (Rs.)</Text><TextInput style={styles.settingsInput} value={editStartingPrice} onChangeText={setEditStartingPrice} placeholder="e.g. 80000" placeholderTextColor="#8C7B6E" keyboardType="number-pad" /></View>
              <View style={styles.settingsSection}><Text style={styles.settingsSectionLabel}>INSTAGRAM HANDLE</Text><TextInput style={styles.settingsInput} value={editInstagram} onChangeText={setEditInstagram} placeholder="@yourbusiness" placeholderTextColor="#8C7B6E" autoCapitalize="none" /></View>
              <View style={styles.settingsSection}><Text style={styles.settingsSectionLabel}>PRIMARY CITY</Text><TextInput style={styles.settingsInput} value={editCity} onChangeText={setEditCity} placeholder="e.g. Delhi NCR" placeholderTextColor="#8C7B6E" /></View>
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionLabel}>YOUR VIBE TAGS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {['Candid', 'Traditional', 'Luxury', 'Cinematic', 'Boho', 'Festive', 'Minimalist', 'Royal'].map(vibe => (
                    <TouchableOpacity key={vibe} style={{ borderWidth: 1, borderColor: editVibes.includes(vibe) ? '#C9A84C' : '#E8E0D5', borderRadius: 50, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: editVibes.includes(vibe) ? '#C9A84C' : '#FFFFFF' }} onPress={() => setEditVibes(prev => prev.includes(vibe) ? prev.filter(v => v !== vibe) : [...prev, vibe])}>
                      <Text style={{ fontSize: 13, color: '#2C2420', fontFamily: editVibes.includes(vibe) ? 'DMSans_500Medium' : 'DMSans_400Regular' }}>{vibe}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={{ height: 16 }} />

              {/* Subscription Info */}
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8E0D5', gap: 8, marginBottom: 16 }}>
                <Text style={styles.settingsSectionLabel}>SUBSCRIPTION</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TierBadge tier={vendorTier} />
                  {foundingBadge && <FoundingDot />}
                  <Text style={{ fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>Free Trial</Text>
                </View>
              </View>

              <TouchableOpacity style={[styles.goldBtn, savingProfile && { opacity: 0.6 }]} onPress={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? <ActivityIndicator color="#2C2420" /> : <Text style={styles.goldBtnText}>SAVE CHANGES</Text>}
              </TouchableOpacity>
              <View style={{ height: 12 }} />
              <TouchableOpacity style={[styles.goldOutlineBtn, { borderColor: '#B5303A' }]} onPress={() => { setShowSettingsModal(false); handleLogout(); }}>
                <Feather name="log-out" size={14} color="#B5303A" />
                <Text style={[styles.goldOutlineBtnText, { color: '#B5303A' }]}>LOG OUT</Text>
              </TouchableOpacity>
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Promo Modal */}
      <Modal visible={showPromoForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Promo</Text>
            <Text style={styles.modalSubtitle}>Couples in your city will be notified instantly</Text>
            <TextInput style={styles.modalInput} placeholder="Promo title (e.g. 15% Off December Bookings)" placeholderTextColor="#8C7B6E" value={newPromoTitle} onChangeText={setNewPromoTitle} />
            <TouchableOpacity style={styles.modalInput} onPress={() => openDatePicker('promoExpiry', newPromoExpiry)}><Text style={{ fontSize: 14, color: newPromoExpiry ? '#2C2420' : '#8C7B6E', fontFamily: 'DMSans_400Regular' }}>{newPromoExpiry || 'Expires on'}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalBtn} onPress={handleCreatePromo}><Text style={styles.modalBtnText}>GO LIVE</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowPromoForm(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Deluxe Suite Bottom Sheet (Prestige only) */}
      <Modal visible={showDeluxeSuite} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '70%' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="award" size={16} color="#C9A84C" />
                <Text style={styles.modalTitle}>Deluxe Suite</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDeluxeSuite(false)}><Feather name="x" size={20} color="#8C7B6E" /></TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', marginTop: -8 }}>Your command centre</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
              {DELUXE_SUITE_TABS.map((tab) => (
                <TouchableOpacity key={tab.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E8E0D5' }} onPress={() => { setShowDeluxeSuite(false); setActiveTab(tab.id); }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#E8D9B5', justifyContent: 'center', alignItems: 'center' }}>
                    <Feather name={tab.icon as any} size={16} color="#C9A84C" />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' }}>{tab.label}</Text>
                  <Feather name="chevron-right" size={14} color="#8C7B6E" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Header with Tier Badge & Founding Dot ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.businessName}>{vendorName}</Text>
            {foundingBadge && <FoundingDot />}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.category}>{vendorCategory}{vendorCity ? ` · ${vendorCity}` : ''}</Text>
            <TierBadge tier={vendorTier} />
          </View>
        </View>
        <TouchableOpacity style={[styles.liveToggle, isLive && styles.liveToggleActive]} onPress={() => setIsLive(!isLive)}>
          <View style={[styles.liveDot, isLive && styles.liveDotActive]} />
          <Text style={[styles.liveToggleText, isLive && styles.liveToggleTextActive]}>{isLive ? 'Live' : 'Paused'}</Text>
        </TouchableOpacity>
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          TIER-SPECIFIC DASHBOARD HOME
      ══════════════════════════════════════════════════════════════════════ */}

      {activeTab === 'Overview' ? (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* ── TODAY CARD (all tiers) ── */}
          <TodayCard bookings={bookings} invoices={invoices} clients={clients} />

          {/* ── PENDING BOOKINGS ALERT (all tiers) ── */}
          {pendingBookings.length > 0 && (
            <TouchableOpacity style={styles.alertCard} onPress={() => setActiveTab('Inquiries')}>
              <View style={styles.alertRow}>
                <Feather name="zap" size={14} color="#C9A84C" />
                <Text style={styles.alertTitle}>{pendingBookings.length} booking{pendingBookings.length > 1 ? 's' : ''} waiting</Text>
              </View>
              <Text style={styles.alertText}>Confirm within 48 hours or token is auto-refunded</Text>
              <Text style={styles.alertLink}>Review now</Text>
            </TouchableOpacity>
          )}


          {/* ── PRESTIGE: Live Command Feed ── */}
          {vendorTier === 'prestige' && (
            <>
              <PrestigeStatsRow dsData={dsData} />

              {/* ── TASKS (inline, actionable) ── */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.sectionLabel}>TASKS</Text>
                <TouchableOpacity onPress={() => setShowCreateTask(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2C2420', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Feather name="plus" size={11} color="#C9A84C" />
                  <Text style={{ fontSize: 11, color: '#C9A84C', fontFamily: 'DMSans_500Medium' }}>New Task</Text>
                </TouchableOpacity>
              </View>
              {showCreateTask && (
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#EDE8E0', gap: 10 }}>
                  <TextInput style={styles.fieldInput} placeholder="Task title" placeholderTextColor="#B8ADA4" value={newTaskTitle} onChangeText={setNewTaskTitle} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput style={[styles.fieldInput, { flex: 1 }]} placeholder="Assign to" placeholderTextColor="#B8ADA4" value={newTaskAssignee} onChangeText={setNewTaskAssignee} />
                    <TouchableOpacity style={[styles.fieldInput, { justifyContent: 'center' }]} onPress={() => openDatePicker('dsTaskDue', newTaskDueDate)}>
                      <Text style={{ fontSize: 14, color: newTaskDueDate ? '#2C2420' : '#B8ADA4', fontFamily: 'DMSans_400Regular' }}>{newTaskDueDate || 'Due date'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {['low', 'medium', 'high', 'urgent'].map(p => (
                      <TouchableOpacity key={p} onPress={() => setNewTaskPriority(p)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50, backgroundColor: newTaskPriority === p ? '#2C2420' : '#FFFFFF', borderWidth: 1, borderColor: newTaskPriority === p ? '#2C2420' : '#EDE8E0' }}>
                        <Text style={{ fontSize: 11, color: newTaskPriority === p ? '#C9A84C' : '#8C7B6E', fontFamily: 'DMSans_500Medium', textTransform: 'capitalize' }}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={[styles.unblockBtn, { flex: 1, alignItems: 'center' }]} onPress={() => setShowCreateTask(false)}><Text style={styles.unblockBtnText}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.goldBtn, { flex: 2 }]} onPress={handleCreateDsTask}><Text style={styles.goldBtnText}>CREATE TASK</Text></TouchableOpacity>
                  </View>
                </View>
              )}
              {dsData.tasks.length === 0 ? (
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#EDE8E0', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>No tasks yet. Create your first task above.</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EDE8E0', overflow: 'hidden' }}>
                  {dsData.tasks.slice(0, 8).map((task: any, idx: number) => (
                    <View key={task.id}>
                      <TouchableOpacity onPress={() => handleToggleTaskStatus(task.id, task.status)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
                        <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: task.status === 'completed' ? '#4CAF50' : task.priority === 'urgent' ? '#E57373' : task.priority === 'high' ? '#C9A84C' : '#EDE8E0', backgroundColor: task.status === 'completed' ? '#4CAF5015' : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                          {task.status === 'completed' && <Feather name="check" size={12} color="#4CAF50" />}
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ fontSize: 14, color: task.status === 'completed' ? '#B8ADA4' : '#2C2420', fontFamily: 'DMSans_400Regular', textDecorationLine: task.status === 'completed' ? 'line-through' : 'none' }}>{task.title}</Text>
                          <Text style={{ fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>{task.assigned_to || 'Unassigned'}{task.due_date ? ' · ' + task.due_date : ''}</Text>
                        </View>
                        {task.priority === 'urgent' && <View style={{ backgroundColor: '#E5737320', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#E57373', fontFamily: 'DMSans_500Medium' }}>URGENT</Text></View>}
                      </TouchableOpacity>
                      {idx < Math.min(dsData.tasks.length, 8) - 1 && <View style={{ height: 1, backgroundColor: '#EDE8E0', marginHorizontal: 16 }} />}
                    </View>
                  ))}
                </View>
              )}

              {/* ── TEAM CHAT (inline) ── */}
              <Text style={styles.sectionLabel}>TEAM CHAT</Text>
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#EDE8E0', gap: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {['general', 'broadcast'].map(ch => (
                    <TouchableOpacity key={ch} onPress={() => setDsChannel(ch)} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 50, backgroundColor: dsChannel === ch ? '#2C2420' : '#FAF6F0', borderWidth: 1, borderColor: dsChannel === ch ? '#2C2420' : '#EDE8E0' }}>
                      <Text style={{ fontSize: 11, color: dsChannel === ch ? '#C9A84C' : '#8C7B6E', fontFamily: 'DMSans_500Medium', textTransform: 'capitalize' }}>#{ch}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {dsMessages.filter((m: any) => m.channel === dsChannel).slice(0, 5).map((msg: any) => (
                  <View key={msg.id} style={{ gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 12, color: '#2C2420', fontFamily: 'DMSans_500Medium' }}>{msg.sender_name || 'Team'}</Text>
                      <Text style={{ fontSize: 9, color: '#B8ADA4', fontFamily: 'DMSans_300Light' }}>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', lineHeight: 18 }}>{msg.message}</Text>
                  </View>
                ))}
                {dsMessages.filter((m: any) => m.channel === dsChannel).length === 0 && (
                  <Text style={{ fontSize: 12, color: '#B8ADA4', fontFamily: 'DMSans_300Light', textAlign: 'center' }}>No messages in #{dsChannel}</Text>
                )}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput style={[styles.fieldInput, { flex: 1 }]} placeholder="Type a message..." placeholderTextColor="#B8ADA4" value={dsNewMessage} onChangeText={setDsNewMessage} />
                  <TouchableOpacity onPress={handleSendDsMessage} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#C9A84C', justifyContent: 'center', alignItems: 'center' }}>
                    <Feather name="send" size={14} color="#2C2420" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── PROCUREMENT STATUS ── */}
              {dsData.procurement.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>PROCUREMENT</Text>
                  {dsData.procurement.slice(0, 5).map((item: any) => {
                    const nextStatus: Record<string, string> = { ordered: 'in_transit', in_transit: 'received', received: 'verified' };
                    return (
                      <View key={item.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EDE8E0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular' }}>{item.item_name || item.description || 'Item'}</Text>
                          <Text style={{ fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>{item.supplier || ''}</Text>
                        </View>
                        <TouchableOpacity onPress={() => nextStatus[item.status] && handleUpdateProcStatus(item.id, nextStatus[item.status])} style={{ backgroundColor: item.status === 'verified' ? '#4CAF5015' : '#FFF8EC', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: item.status === 'verified' ? '#4CAF50' : '#E8D9B5' }}>
                          <Text style={{ fontSize: 10, color: item.status === 'verified' ? '#4CAF50' : '#C9A84C', fontFamily: 'DMSans_500Medium', textTransform: 'capitalize' }}>{item.status === 'verified' ? 'Done' : item.status?.replace('_', ' ') + ' →'}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </>
              )}

              {/* ── DELIVERIES STATUS ── */}
              {dsData.deliveries.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>DELIVERIES</Text>
                  {dsData.deliveries.slice(0, 5).map((item: any) => {
                    const nextStatus: Record<string, string> = { preparing: 'dispatched', dispatched: 'delivered', delivered: 'client_confirmed' };
                    return (
                      <View key={item.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EDE8E0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular' }}>{item.item_name || item.description || 'Delivery'}</Text>
                          <Text style={{ fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>{item.client_name || ''}</Text>
                        </View>
                        <TouchableOpacity onPress={() => nextStatus[item.status] && handleUpdateDelStatus(item.id, nextStatus[item.status])} style={{ backgroundColor: item.status === 'client_confirmed' ? '#4CAF5015' : '#FFF8EC', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: item.status === 'client_confirmed' ? '#4CAF50' : '#E8D9B5' }}>
                          <Text style={{ fontSize: 10, color: item.status === 'client_confirmed' ? '#4CAF50' : '#C9A84C', fontFamily: 'DMSans_500Medium', textTransform: 'capitalize' }}>{item.status === 'client_confirmed' ? 'Confirmed' : item.status?.replace('_', ' ') + ' →'}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </>
              )}

              {/* ── TRIALS ── */}
              {dsData.trials.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>UPCOMING TRIALS</Text>
                  {dsData.trials.slice(0, 4).map((trial: any) => (
                    <View key={trial.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EDE8E0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular' }}>{trial.type || 'Trial'} — {trial.client_name || 'Client'}</Text>
                        <Text style={{ fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>{trial.date} · {trial.assigned_to || 'Unassigned'}</Text>
                      </View>
                      {trial.status === 'scheduled' ? (
                        <TouchableOpacity onPress={() => handleUpdateTrialStatus(trial.id, 'confirmed')} style={{ backgroundColor: '#FFF8EC', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#E8D9B5' }}>
                          <Text style={{ fontSize: 10, color: '#C9A84C', fontFamily: 'DMSans_500Medium' }}>Confirm</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={{ backgroundColor: '#4CAF5015', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Text style={{ fontSize: 10, color: '#4CAF50', fontFamily: 'DMSans_500Medium' }}>{trial.status}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </>
              )}

              {/* ── TEAM ON SITE ── */}
              {dsTeamMembers.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>TEAM ({dsTeamMembers.filter((m: any) => m.status === 'active').length} active)</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {dsTeamMembers.filter((m: any) => m.status === 'active').slice(0, 8).map((member: any) => (
                      <View key={member.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#EDE8E0', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ fontSize: 10, color: '#C9A84C', fontFamily: 'DMSans_500Medium' }}>{(member.name || '?')[0]}</Text>
                        </View>
                        <View>
                          <Text style={{ fontSize: 12, color: '#2C2420', fontFamily: 'DMSans_400Regular' }}>{member.name}</Text>
                          <Text style={{ fontSize: 9, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>{member.role || 'Staff'}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* ── PHOTO APPROVALS ── */}
              {dsPhotos.filter((p: any) => p.status === 'pending').length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>PHOTO APPROVALS ({dsPhotos.filter((p: any) => p.status === 'pending').length} pending)</Text>
                  {dsPhotos.filter((p: any) => p.status === 'pending').slice(0, 4).map((photo: any) => (
                    <View key={photo.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EDE8E0', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#FAF6F0', justifyContent: 'center', alignItems: 'center' }}>
                        <Feather name="image" size={20} color="#C9A84C" />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular' }}>{photo.description || 'Photo submission'}</Text>
                        <Text style={{ fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>{photo.submitted_by || 'Team member'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity onPress={() => handleApprovePhoto(photo.id, 'approved')} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#4CAF5015', justifyContent: 'center', alignItems: 'center' }}>
                          <Feather name="check" size={14} color="#4CAF50" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleApprovePhoto(photo.id, 'revision_needed')} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#E5737315', justifyContent: 'center', alignItems: 'center' }}>
                          <Feather name="rotate-ccw" size={14} color="#E57373" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* ── Quick access to remaining tools ── */}
              <TouchableOpacity style={{ backgroundColor: '#2C2420', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)' }} onPress={() => setShowDeluxeSuite(true)}>
                <Feather name="award" size={16} color="#C9A84C" />
                <Text style={{ fontSize: 14, color: '#C9A84C', fontFamily: 'PlayfairDisplay_400Regular' }}>All Deluxe Suite Tools</Text>
                <Feather name="chevron-right" size={14} color="#C9A84C" />
              </TouchableOpacity>
            </>
          )}


          {/* ── SIGNATURE: Business Pulse + Tool Grid ── */}
          {vendorTier === 'signature' && (
            <>
              <BusinessPulseCard invoices={invoices} expenses={expenses} referralStats={referralStats} />
              <Text style={styles.sectionLabel}>YOUR TOOLS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {ESSENTIAL_TOOLS.map(tool => (
                  <ToolGridItem key={tool.id} icon={tool.icon} label={tool.label} onPress={() => setActiveTab(tool.tab)} badge={tool.id === 'inquiries' ? pendingBookings.length : undefined} />
                ))}
              </View>
              <Text style={styles.sectionLabel}>BUSINESS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {SIGNATURE_TOOLS.map(tool => (
                  <ToolGridItem key={tool.id} icon={tool.icon} label={tool.label} onPress={() => setActiveTab(tool.tab)} />
                ))}
              </View>
            </>
          )}

          {/* ── ESSENTIAL: Clean Tool Grid ── */}
          {vendorTier === 'essential' && (
            <>
              {/* Onboarding checklist for new vendors */}
              {!checklistDismissed && (
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E8E0D5', padding: 20, gap: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 16, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.2 }}>Complete your profile</Text>
                      <Text style={{ fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>Finish these steps to go live</Text>
                    </View>
                    <TouchableOpacity onPress={() => setChecklistDismissed(true)}><Feather name="x" size={16} color="#8C7B6E" /></TouchableOpacity>
                  </View>
                  {[
                    { label: 'Upload 10+ portfolio photos', icon: 'image', done: (vendorSession?.portfolioCount || 0) >= 10 },
                    { label: 'Add 3 past clients', icon: 'users', done: clients.length >= 3 },
                    { label: 'Set your starting price', icon: 'tag', done: !!vendorSession?.startingPrice },
                    { label: 'Write your bio', icon: 'edit-2', done: !!vendorSession?.about },
                  ].map((step, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, opacity: step.done ? 0.5 : 1 }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: step.done ? '#4CAF5015' : '#FFF8EC', borderWidth: 1, borderColor: step.done ? '#4CAF50' : '#E8D9B5', justifyContent: 'center', alignItems: 'center' }}>
                        {step.done ? <Feather name="check" size={10} color="#4CAF50" /> : <Feather name={step.icon as any} size={10} color="#C9A84C" />}
                      </View>
                      <Text style={{ flex: 1, fontSize: 13, color: '#2C2420', fontFamily: step.done ? 'DMSans_300Light' : 'DMSans_400Regular', textDecorationLine: step.done ? 'line-through' : 'none' }}>{step.label}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.sectionLabel}>YOUR TOOLS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {ESSENTIAL_TOOLS.map(tool => (
                  <ToolGridItem key={tool.id} icon={tool.icon} label={tool.label} onPress={() => setActiveTab(tool.tab)} badge={tool.id === 'inquiries' ? pendingBookings.length : undefined} />
                ))}
              </View>
            </>
          )}

          {/* ── Web Dashboard Login Code (all tiers) ── */}
          <TouchableOpacity style={styles.loginCodeBtn} onPress={handleGenerateCode} disabled={generatingCode} activeOpacity={0.85}>
            {generatingCode ? <ActivityIndicator color="#C9A84C" size="small" /> : loginCode ? (
              <View style={styles.loginCodeInner}>
                <View style={styles.loginCodeLeft}><Feather name="monitor" size={14} color="#C9A84C" /><View><Text style={styles.loginCodeLabel}>Web Dashboard Code</Text><Text style={styles.loginCodeHint}>Expires in 5 min</Text></View></View>
                <Text style={styles.loginCodeValue}>{loginCode}</Text>
              </View>
            ) : (
              <View style={styles.loginCodeInner}>
                <View style={styles.loginCodeLeft}><Feather name="monitor" size={14} color="#C9A84C" /><View><Text style={styles.loginCodeLabel}>Open Web Dashboard</Text><Text style={styles.loginCodeHint}>vendor.thedreamwedding.in</Text></View></View>
                <Feather name="chevron-right" size={16} color="#C9A84C" />
              </View>
            )}
          </TouchableOpacity>

          {/* ── Upgrade Prompt (Essential & Signature only) ── */}
          <UpgradePrompt currentTier={vendorTier} onPress={() => Alert.alert('Coming Soon', 'Upgrade options will be available when subscriptions launch.')} />

          {/* ── Settings Quick Access ── */}
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 10, paddingVertical: 14, backgroundColor: '#FFFFFF' }} onPress={openSettings}>
            <Feather name="settings" size={13} color="#8C7B6E" />
            <Text style={{ fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>Edit Profile & Settings</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* ══════════════════════════════════════════════════════════════════
            TAB CONTENT (when a tool is selected)
        ══════════════════════════════════════════════════════════════════ */
        <>
          {/* Tab header with back button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E8E0D5' }}>
            <TouchableOpacity onPress={() => setActiveTab('Overview')} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E0D5', justifyContent: 'center', alignItems: 'center' }}>
              <Feather name="arrow-left" size={16} color="#2C2420" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', flex: 1 }}>{activeTab.startsWith('ds-') ? DELUXE_SUITE_TABS.find(t => t.id === activeTab)?.label || activeTab : activeTab}</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.scrollContent}>

            {/* ── INQUIRIES ── */}
            {activeTab === 'Inquiries' && (
              <View style={styles.tabPane}>
                {pendingBookings.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>Awaiting Confirmation</Text>
                    {pendingBookings.map((booking: any) => (
                      <View key={booking.id} style={styles.bookingCard}>
                        <View style={styles.bookingTop}>
                          <View>
                            <Text style={styles.bookingName}>{booking.users?.name || 'Couple'}</Text>
                            <Text style={styles.bookingMeta}>Token: {'\u20B9'}{booking.token_amount?.toLocaleString('en-IN')} · Protection: {'\u20B9'}999</Text>
                            <Text style={styles.bookingMeta}>Booked: {new Date(booking.created_at).toLocaleDateString('en-IN')}</Text>
                          </View>
                          <View style={styles.shieldBadge}><Text style={styles.shieldBadgeText}>Payment Shield</Text></View>
                        </View>
                        <View style={styles.bookingActions}>
                          <TouchableOpacity style={styles.declineBtn} onPress={() => handleDeclineBooking(booking.id)}><Text style={styles.declineBtnText}>Decline</Text></TouchableOpacity>
                          <TouchableOpacity style={styles.confirmBtn} onPress={() => handleConfirmBooking(booking.id)}><Text style={styles.confirmBtnText}>CONFIRM & LOCK DATE</Text></TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                <Text style={styles.sectionLabel}>Quick Reply Templates</Text>
                <View style={styles.listCard}>
                  {REPLY_TEMPLATES.map((template, index) => (
                    <View key={template.id}>
                      <View style={styles.templateRow}>
                        <View style={styles.templateInfo}><Text style={styles.templateLabel}>{template.label}</Text><Text style={styles.templatePreview} numberOfLines={1}>{template.message}</Text></View>
                        <TouchableOpacity style={styles.templateCopyBtn} onPress={() => Alert.alert(template.label, template.message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Send via WhatsApp', onPress: () => Linking.openURL(`whatsapp://send?text=${encodeURIComponent(template.message)}`) }])}>
                          <Feather name="send" size={13} color="#C9A84C" />
                        </TouchableOpacity>
                      </View>
                      {index < REPLY_TEMPLATES.length - 1 && <View style={styles.listDivider} />}
                    </View>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>Lead Pipeline</Text>
                {leadsLoading ? <ActivityIndicator color="#C9A84C" style={{ paddingVertical: 20 }} /> : (
                  <View style={styles.listCard}>
                    {displayLeads.map((lead: any, index: number) => (
                      <View key={lead.id}>
                        <View style={styles.leadRow}>
                          <View style={styles.leadInfo}><Text style={styles.leadName}>{lead.name}</Text><Text style={styles.leadDate}>{lead.date}</Text></View>
                          <View style={styles.leadRight}>
                            <Text style={styles.leadValue}>{lead.value}</Text>
                            <View style={[styles.stageBadge, { backgroundColor: (STAGE_COLORS[lead.stage] || '#8C7B6E') + '20' }]}><Text style={[styles.stageBadgeText, { color: STAGE_COLORS[lead.stage] || '#8C7B6E' }]}>{lead.stage}</Text></View>
                          </View>
                        </View>
                        {index < displayLeads.length - 1 && <View style={styles.listDivider} />}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ── CALENDAR ── */}
            {activeTab === 'Calendar' && (
              <View style={styles.tabPane}>
                <Text style={styles.calendarHint}>Block dates you are already booked. Confirmed bookings are shown automatically.</Text>
                {confirmedBookings.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>Confirmed Bookings</Text>
                    <View style={styles.listCard}>
                      {confirmedBookings.map((booking: any, index: number) => (
                        <View key={booking.id}>
                          <View style={styles.blockedRow}>
                            <View style={styles.blockedDateRow}><Feather name="check-circle" size={13} color="#C9A84C" /><View><Text style={styles.blockedDate}>{booking.users?.name || 'Couple'}</Text><Text style={styles.confirmedMeta}>Confirmed · {'\u20B9'}{(booking.token_amount || 10000).toLocaleString('en-IN')} token</Text></View></View>
                            <View style={styles.confirmedBadge}><Text style={styles.confirmedBadgeText}>Locked</Text></View>
                          </View>
                          {index < confirmedBookings.length - 1 && <View style={styles.listDivider} />}
                        </View>
                      ))}
                    </View>
                  </>
                )}
                {calendarLoading ? <ActivityIndicator color="#C9A84C" style={{ paddingVertical: 20 }} /> : (
                  <View style={styles.listCard}>
                    <View style={styles.blockedHeader}><Text style={styles.blockedTitle}>Blocked Dates ({blockedDates.length})</Text></View>
                    {blockedDates.length === 0 && <View style={{ padding: 16 }}><Text style={styles.emptyText}>No dates blocked yet</Text></View>}
                    {blockedDates.map((item, index) => (
                      <View key={item.id}>
                        <View style={styles.blockedRow}>
                          <View style={styles.blockedDateRow}><Feather name="calendar" size={13} color="#8C7B6E" /><Text style={styles.blockedDate}>{item.blocked_date}</Text></View>
                          <TouchableOpacity style={styles.unblockBtn} onPress={() => handleUnblockDate(item.id)}><Text style={styles.unblockBtnText}>Unblock</Text></TouchableOpacity>
                        </View>
                        {index < blockedDates.length - 1 && <View style={styles.listDivider} />}
                      </View>
                    ))}
                  </View>
                )}
                {showDateInput ? (
                  <View style={styles.listCard}>
                    <View style={{ padding: 16, gap: 10 }}>
                      <TouchableOpacity style={styles.fieldInput} onPress={() => openDatePicker('blockDate', newBlockDate)}><Text style={{ fontSize: 14, color: newBlockDate ? '#2C2420' : '#8C7B6E', fontFamily: 'DMSans_400Regular' }}>{newBlockDate || 'Select date'}</Text></TouchableOpacity>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity style={[styles.unblockBtn, { flex: 1, alignItems: 'center' }]} onPress={() => setShowDateInput(false)}><Text style={styles.unblockBtnText}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.goldBtn, { flex: 2 }]} onPress={handleBlockDate}><Text style={styles.goldBtnText}>BLOCK DATE</Text></TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.goldOutlineBtn} onPress={() => setShowDateInput(true)}><Feather name="plus" size={14} color="#C9A84C" /><Text style={styles.goldOutlineBtnText}>Block a Date</Text></TouchableOpacity>
                )}
              </View>
            )}

            {/* ── CLIENTS ── */}
            {activeTab === 'Clients' && (
              <View style={styles.tabPane}>
                <View style={styles.clientsHeader}>
                  <Text style={styles.sectionLabel}>My Clients ({clients.length})</Text>
                  <TouchableOpacity style={styles.addClientBtn} onPress={() => setShowAddClient(true)}><Feather name="plus" size={12} color="#C9A84C" /><Text style={styles.addClientBtnText}>Add Client</Text></TouchableOpacity>
                </View>
                {clientsLoading ? <ActivityIndicator color="#C9A84C" style={{ paddingVertical: 20 }} /> : clients.length === 0 ? (
                  <View style={styles.emptyCard}><Feather name="users" size={32} color="#E8E0D5" /><Text style={styles.emptyTitle}>No clients yet</Text><Text style={styles.emptySub}>Add your past and upcoming clients to build your CRM</Text></View>
                ) : clients.map((client: any) => (
                  <View key={client.id} style={styles.clientCard}>
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{client.name}</Text>
                      <Text style={styles.clientPhone}>{client.phone}</Text>
                      <Text style={styles.clientDate}>{client.wedding_date}</Text>
                      {client.notes && <Text style={{ fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light', fontStyle: 'italic', marginTop: 4 }}>{client.notes}</Text>}
                    </View>
                    <TouchableOpacity style={[styles.whatsappBtn, client.invited && styles.whatsappBtnDone]} onPress={() => handleSendWhatsAppInvite(client)}>
                      <Text style={[styles.whatsappBtnText, client.invited && styles.whatsappBtnTextDone]}>{client.invited ? 'Invited' : 'Invite'}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* ── INVOICES ── */}
            {activeTab === 'Invoices' && (
              <View style={styles.tabPane}>
                <TouchableOpacity style={styles.goldBtn} onPress={() => setShowInvoiceForm(true)}><Feather name="plus" size={14} color="#2C2420" /><Text style={styles.goldBtnText}>CREATE INVOICE</Text></TouchableOpacity>
                {showInvoiceForm && (
                  <View style={[styles.listCard, { padding: 16, gap: 10 }]}>
                    <TextInput style={styles.fieldInput} placeholder="Client name" placeholderTextColor="#8C7B6E" value={invoiceClient} onChangeText={setInvoiceClient} />
                    <TextInput style={styles.fieldInput} placeholder="Phone (optional)" placeholderTextColor="#8C7B6E" value={invoicePhone} onChangeText={setInvoicePhone} keyboardType="phone-pad" />
                    <TextInput style={styles.fieldInput} placeholder="Amount (Rs.)" placeholderTextColor="#8C7B6E" value={invoiceAmount} onChangeText={setInvoiceAmount} keyboardType="numeric" />
                    <TextInput style={styles.fieldInput} placeholder="Description (optional)" placeholderTextColor="#8C7B6E" value={invoiceDesc} onChangeText={setInvoiceDesc} />
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity style={[styles.unblockBtn, { flex: 1, alignItems: 'center' }]} onPress={() => setShowInvoiceForm(false)}><Text style={styles.unblockBtnText}>Cancel</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.goldBtn, { flex: 2 }]} onPress={handleGenerateInvoice}><Text style={styles.goldBtnText}>GENERATE PDF</Text></TouchableOpacity>
                    </View>
                  </View>
                )}
                <Text style={styles.sectionLabel}>Invoice History</Text>
                {invoices.length === 0 ? (
                  <View style={styles.emptyCard}><Feather name="file-text" size={32} color="#E8E0D5" /><Text style={styles.emptyTitle}>No invoices yet</Text><Text style={styles.emptySub}>Create your first invoice above</Text></View>
                ) : (
                  <View style={styles.listCard}>
                    {invoices.map((inv: any, index: number) => (
                      <View key={inv.id}>
                        <View style={styles.invoiceHistoryRow}>
                          <View style={{ gap: 3 }}>
                            <Text style={styles.invoiceHistoryClient}>{inv.client_name}</Text>
                            <Text style={styles.invoiceHistoryMeta}>{inv.invoice_number} · {new Date(inv.created_at).toLocaleDateString('en-IN')}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            <Text style={styles.invoiceHistoryAmount}>{'\u20B9'}{(inv.amount || 0).toLocaleString('en-IN')}</Text>
                            <TouchableOpacity
                              style={[styles.invoiceStatusBtn, { borderColor: inv.status === 'paid' ? '#4CAF50' : '#C9A84C' }]}
                              onPress={() => inv.status !== 'paid' && handleMarkInvoicePaid(inv.id)}
                              disabled={inv.status === 'paid' || updatingInvoiceId === inv.id}
                            >
                              {updatingInvoiceId === inv.id ? <ActivityIndicator size="small" color="#C9A84C" /> :
                                <Text style={[styles.invoiceStatusText, { color: inv.status === 'paid' ? '#4CAF50' : '#C9A84C' }]}>{inv.status === 'paid' ? 'Paid' : 'Mark Paid'}</Text>
                              }
                            </TouchableOpacity>
                          </View>
                        </View>
                        {index < invoices.length - 1 && <View style={styles.listDivider} />}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ── PAYMENTS ── */}
            {activeTab === 'Payments' && (
              <View style={styles.tabPane}>
                <TouchableOpacity style={styles.goldBtn} onPress={() => setShowPaymentForm(true)}><Feather name="plus" size={14} color="#2C2420" /><Text style={styles.goldBtnText}>CREATE PAYMENT SCHEDULE</Text></TouchableOpacity>
                {showPaymentForm && (
                  <View style={[styles.listCard, { padding: 16, gap: 10 }]}>
                    <TextInput style={styles.fieldInput} placeholder="Client name" placeholderTextColor="#8C7B6E" value={paymentClient} onChangeText={setPaymentClient} />
                    <TextInput style={styles.fieldInput} placeholder="Phone (optional)" placeholderTextColor="#8C7B6E" value={paymentPhone} onChangeText={setPaymentPhone} keyboardType="phone-pad" />
                    <TextInput style={styles.fieldInput} placeholder="Total amount (Rs.)" placeholderTextColor="#8C7B6E" value={paymentTotal} onChangeText={setPaymentTotal} keyboardType="numeric" />
                    {paymentInstalments.map((inst, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', gap: 8 }}>
                        <Text style={{ width: 60, fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_400Regular', alignSelf: 'center' }}>{inst.label}</Text>
                        <TextInput style={[styles.fieldInput, { flex: 1 }]} placeholder="Amount" placeholderTextColor="#8C7B6E" value={inst.amount} onChangeText={(v) => { const u = [...paymentInstalments]; u[idx] = { ...u[idx], amount: v }; setPaymentInstalments(u); }} keyboardType="numeric" />
                        <TouchableOpacity style={[styles.fieldInput, { flex: 1 }]} onPress={() => openDatePicker('instalment_' + idx, inst.due_date)}><Text style={{ fontSize: 14, color: inst.due_date ? '#2C2420' : '#8C7B6E', fontFamily: 'DMSans_400Regular' }}>{inst.due_date || 'Due date'}</Text></TouchableOpacity>
                      </View>
                    ))}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity style={[styles.unblockBtn, { flex: 1, alignItems: 'center' }]} onPress={() => setShowPaymentForm(false)}><Text style={styles.unblockBtnText}>Cancel</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.goldBtn, { flex: 2 }]} onPress={handleSavePaymentSchedule}><Text style={styles.goldBtnText}>SAVE SCHEDULE</Text></TouchableOpacity>
                    </View>
                  </View>
                )}
                {paymentSchedules.length === 0 ? (
                  <View style={styles.emptyCard}><Feather name="credit-card" size={32} color="#E8E0D5" /><Text style={styles.emptyTitle}>No payment schedules</Text><Text style={styles.emptySub}>Create a schedule to track instalments from clients</Text></View>
                ) : paymentSchedules.map((schedule: any) => (
                  <View key={schedule.id} style={[styles.listCard, { padding: 16, gap: 10 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={styles.bookingName}>{schedule.client_name}</Text><Text style={styles.invoiceHistoryAmount}>{'\u20B9'}{(schedule.total_amount || 0).toLocaleString('en-IN')}</Text></View>
                    {(schedule.instalments || []).map((inst: any, idx: number) => (
                      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: '#F0EDE8' }}>
                        <View style={{ gap: 2 }}><Text style={{ fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular' }}>{inst.label}</Text><Text style={{ fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>{inst.due_date || 'No date set'}</Text></View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_500Medium' }}>{'\u20B9'}{(parseInt(inst.amount) || 0).toLocaleString('en-IN')}</Text>
                          {inst.paid ? <View style={{ backgroundColor: '#4CAF5020', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: '#4CAF50', fontFamily: 'DMSans_500Medium' }}>Paid</Text></View> :
                            <TouchableOpacity style={{ backgroundColor: '#FFF8EC', borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#E8D9B5' }} onPress={() => handleMarkInstalmentPaid(schedule.id, idx)}><Text style={{ fontSize: 10, color: '#C9A84C', fontFamily: 'DMSans_500Medium' }}>Mark Paid</Text></TouchableOpacity>
                          }
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}

            {/* ── CONTRACTS ── */}
            {activeTab === 'Contracts' && (
              <View style={styles.tabPane}>
                <TouchableOpacity style={styles.goldBtn} onPress={() => setShowContractForm(true)}><Feather name="plus" size={14} color="#2C2420" /><Text style={styles.goldBtnText}>CREATE CONTRACT</Text></TouchableOpacity>
                {showContractForm && (
                  <View style={[styles.listCard, { padding: 16, gap: 10 }]}>
                    <TextInput style={styles.fieldInput} placeholder="Client name" placeholderTextColor="#8C7B6E" value={contractClient} onChangeText={setContractClient} />
                    <TextInput style={styles.fieldInput} placeholder="Phone (optional)" placeholderTextColor="#8C7B6E" value={contractPhone} onChangeText={setContractPhone} keyboardType="phone-pad" />
                    <TouchableOpacity style={styles.fieldInput} onPress={() => openDatePicker('contractDate', contractEventDate)}><Text style={{ fontSize: 14, color: contractEventDate ? '#2C2420' : '#8C7B6E', fontFamily: 'DMSans_400Regular' }}>{contractEventDate || 'Event date'}</Text></TouchableOpacity>
                    <TextInput style={styles.fieldInput} placeholder="Venue (optional)" placeholderTextColor="#8C7B6E" value={contractVenue} onChangeText={setContractVenue} />
                    <TextInput style={styles.fieldInput} placeholder="Services description" placeholderTextColor="#8C7B6E" value={contractServices} onChangeText={setContractServices} multiline />
                    <TextInput style={styles.fieldInput} placeholder="Total amount (Rs.)" placeholderTextColor="#8C7B6E" value={contractTotal} onChangeText={setContractTotal} keyboardType="numeric" />
                    <TextInput style={styles.fieldInput} placeholder="Advance/Token amount" placeholderTextColor="#8C7B6E" value={contractAdvance} onChangeText={setContractAdvance} keyboardType="numeric" />
                    <TextInput style={styles.fieldInput} placeholder="Deliverables (optional)" placeholderTextColor="#8C7B6E" value={contractDeliverables} onChangeText={setContractDeliverables} multiline />
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity style={[styles.unblockBtn, { flex: 1, alignItems: 'center' }]} onPress={() => setShowContractForm(false)}><Text style={styles.unblockBtnText}>Cancel</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.goldBtn, { flex: 2 }]} onPress={handleGenerateContract}><Text style={styles.goldBtnText}>GENERATE PDF</Text></TouchableOpacity>
                    </View>
                  </View>
                )}
                {contracts.length === 0 ? (
                  <View style={styles.emptyCard}><Feather name="shield" size={32} color="#E8E0D5" /><Text style={styles.emptyTitle}>No contracts yet</Text><Text style={styles.emptySub}>Generate professional contracts with one tap</Text></View>
                ) : contracts.map((contract: any) => (
                  <View key={contract.id} style={[styles.listCard, { padding: 16, gap: 8 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={styles.bookingName}>{contract.client_name}</Text><Text style={styles.invoiceHistoryAmount}>{'\u20B9'}{(contract.total_amount || 0).toLocaleString('en-IN')}</Text></View>
                    <Text style={styles.invoiceHistoryMeta}>{contract.event_type} · {contract.event_date}</Text>
                    <TouchableOpacity style={styles.goldOutlineBtn} onPress={() => handleShareContract(contract)}><Feather name="share-2" size={12} color="#C9A84C" /><Text style={styles.goldOutlineBtnText}>Share via WhatsApp</Text></TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* ── EXPENSES (Signature+) ── */}
            {activeTab === 'Expenses' && (
              <View style={styles.tabPane}>
                <TouchableOpacity style={styles.goldBtn} onPress={() => setShowExpenseForm(true)}><Feather name="plus" size={14} color="#2C2420" /><Text style={styles.goldBtnText}>ADD EXPENSE</Text></TouchableOpacity>
                {showExpenseForm && (
                  <View style={[styles.listCard, { padding: 16, gap: 10 }]}>
                    <TextInput style={styles.fieldInput} placeholder="Description" placeholderTextColor="#8C7B6E" value={expenseDesc} onChangeText={setExpenseDesc} />
                    <TextInput style={styles.fieldInput} placeholder="Amount (Rs.)" placeholderTextColor="#8C7B6E" value={expenseAmount} onChangeText={setExpenseAmount} keyboardType="numeric" />
                    <TextInput style={styles.fieldInput} placeholder="Client (optional)" placeholderTextColor="#8C7B6E" value={expenseClient} onChangeText={setExpenseClient} />
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity style={[styles.unblockBtn, { flex: 1, alignItems: 'center' }]} onPress={() => setShowExpenseForm(false)}><Text style={styles.unblockBtnText}>Cancel</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.goldBtn, { flex: 2 }]} onPress={handleAddExpense}><Text style={styles.goldBtnText}>SAVE EXPENSE</Text></TouchableOpacity>
                    </View>
                  </View>
                )}
                {expensesLoading ? <ActivityIndicator color="#C9A84C" style={{ paddingVertical: 20 }} /> : expenses.length === 0 ? (
                  <View style={styles.emptyCard}><Feather name="trending-down" size={32} color="#E8E0D5" /><Text style={styles.emptyTitle}>No expenses yet</Text><Text style={styles.emptySub}>Track your business expenses for tax season</Text></View>
                ) : (
                  <View style={styles.listCard}>
                    {expenses.map((exp: any, index: number) => (
                      <View key={exp.id}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
                          <View style={{ gap: 2, flex: 1 }}><Text style={{ fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_400Regular' }}>{exp.description}</Text><Text style={{ fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>{exp.category} · {exp.expense_date}</Text></View>
                          <Text style={styles.invoiceHistoryAmount}>{'\u20B9'}{(exp.amount || 0).toLocaleString('en-IN')}</Text>
                        </View>
                        {index < expenses.length - 1 && <View style={styles.listDivider} />}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ── TAX & TDS (Signature+) ── */}
            {activeTab === 'Tax' && (
              <View style={styles.tabPane}>
                {tdsSummary && (
                  <View style={{ backgroundColor: '#2C2420', borderRadius: 14, padding: 18, gap: 12 }}>
                    <Text style={{ fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_500Medium', letterSpacing: 1.5 }}>TDS SUMMARY · {tdsSummary.financial_year}</Text>
                    <View style={{ flexDirection: 'row' }}>
                      <View style={{ flex: 1, alignItems: 'center', gap: 4 }}><Text style={{ fontSize: 20, color: '#C9A84C', fontFamily: 'PlayfairDisplay_400Regular' }}>{'\u20B9'}{(tdsSummary.total_tds_deducted || 0).toLocaleString('en-IN')}</Text><Text style={{ fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>TDS Deducted</Text></View>
                      <View style={{ width: 1, backgroundColor: '#3C3430', height: 32 }} />
                      <View style={{ flex: 1, alignItems: 'center', gap: 4 }}><Text style={{ fontSize: 20, color: '#F5F0E8', fontFamily: 'PlayfairDisplay_400Regular' }}>{'\u20B9'}{(tdsSummary.total_net_received || 0).toLocaleString('en-IN')}</Text><Text style={{ fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>Net Received</Text></View>
                    </View>
                  </View>
                )}
                <TouchableOpacity style={styles.goldBtn} onPress={() => setShowTDSEntryForm(true)}><Feather name="plus" size={14} color="#2C2420" /><Text style={styles.goldBtnText}>ADD TDS ENTRY</Text></TouchableOpacity>
                {showTDSEntryForm && (
                  <View style={[styles.listCard, { padding: 16, gap: 10 }]}>
                    <TextInput style={styles.fieldInput} placeholder="Client name" placeholderTextColor="#8C7B6E" value={tdsEntryClient} onChangeText={setTdsEntryClient} />
                    <TextInput style={styles.fieldInput} placeholder="Gross amount (Rs.)" placeholderTextColor="#8C7B6E" value={tdsEntryAmount} onChangeText={setTdsEntryAmount} keyboardType="numeric" />
                    <TextInput style={styles.fieldInput} placeholder="Challan number (optional)" placeholderTextColor="#8C7B6E" value={tdsEntryChallan} onChangeText={setTdsEntryChallan} />
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity style={[styles.unblockBtn, { flex: 1, alignItems: 'center' }]} onPress={() => setShowTDSEntryForm(false)}><Text style={styles.unblockBtnText}>Cancel</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.goldBtn, { flex: 2 }]} onPress={handleAddTDSEntry}><Text style={styles.goldBtnText}>SAVE ENTRY</Text></TouchableOpacity>
                    </View>
                  </View>
                )}
                {tdsLoading ? <ActivityIndicator color="#C9A84C" style={{ paddingVertical: 20 }} /> : tdsLedger.length === 0 ? (
                  <View style={styles.emptyCard}><Feather name="percent" size={32} color="#E8E0D5" /><Text style={styles.emptyTitle}>No TDS entries</Text><Text style={styles.emptySub}>Your TDS ledger for the current financial year</Text></View>
                ) : null}
              </View>
            )}

            {/* ── TEAM (Signature+) ── */}
            {activeTab === 'Team' && (
              <View style={styles.tabPane}>
                <TouchableOpacity style={styles.goldBtn} onPress={() => setShowTeamForm(true)}><Feather name="plus" size={14} color="#2C2420" /><Text style={styles.goldBtnText}>ADD TEAM MEMBER</Text></TouchableOpacity>
                {showTeamForm && (
                  <View style={[styles.listCard, { padding: 16, gap: 10 }]}>
                    <TextInput style={styles.fieldInput} placeholder="Name" placeholderTextColor="#8C7B6E" value={teamMemberName} onChangeText={setTeamMemberName} />
                    <TextInput style={styles.fieldInput} placeholder="Phone (optional)" placeholderTextColor="#8C7B6E" value={teamMemberPhone} onChangeText={setTeamMemberPhone} keyboardType="phone-pad" />
                    <TextInput style={styles.fieldInput} placeholder="Role (e.g. Assistant, Editor)" placeholderTextColor="#8C7B6E" value={teamMemberRole} onChangeText={setTeamMemberRole} />
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity style={[styles.unblockBtn, { flex: 1, alignItems: 'center' }]} onPress={() => setShowTeamForm(false)}><Text style={styles.unblockBtnText}>Cancel</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.goldBtn, { flex: 2 }]} onPress={handleAddTeamMember}><Text style={styles.goldBtnText}>ADD MEMBER</Text></TouchableOpacity>
                    </View>
                  </View>
                )}
                {teamLoading ? <ActivityIndicator color="#C9A84C" style={{ paddingVertical: 20 }} /> : teamMembers.length === 0 ? (
                  <View style={styles.emptyCard}><Feather name="users" size={32} color="#E8E0D5" /><Text style={styles.emptyTitle}>No team members</Text><Text style={styles.emptySub}>Add your team to collaborate on events</Text></View>
                ) : teamMembers.map((member: any) => (
                  <View key={member.id} style={styles.clientCard}>
                    <View style={styles.clientInfo}><Text style={styles.clientName}>{member.name}</Text><Text style={styles.clientPhone}>{member.role}</Text>{member.phone && <Text style={styles.clientDate}>{member.phone}</Text>}</View>
                    <TouchableOpacity onPress={() => handleRemoveTeamMember(member.id)}><Feather name="x" size={16} color="#E57373" /></TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* ── REFERRAL (Signature+) ── */}
            {activeTab === 'Referral' && (
              <View style={styles.tabPane}>
                <View style={{ backgroundColor: '#2C2420', borderRadius: 14, padding: 18, gap: 12 }}>
                  <Text style={{ fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_500Medium', letterSpacing: 1.5 }}>YOUR REFERRAL LINK</Text>
                  <Text style={{ fontSize: 14, color: '#C9A84C', fontFamily: 'DMSans_400Regular' }}>thedreamwedding.in/ref/{vendorSession?.vendorId?.slice(0, 8)}</Text>
                  <TouchableOpacity style={{ backgroundColor: '#25D366', borderRadius: 8, paddingVertical: 12, alignItems: 'center' }} onPress={() => Linking.openURL(`whatsapp://send?text=${encodeURIComponent('Join The Dream Wedding using my link: https://thedreamwedding.in/ref/' + (vendorSession?.vendorId?.slice(0, 8) || ''))}`)}>
                    <Text style={{ fontSize: 12, color: '#FFFFFF', fontFamily: 'DMSans_500Medium', letterSpacing: 0.5 }}>SHARE VIA WHATSAPP</Text>
                  </TouchableOpacity>
                </View>
                {referralStats && (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {[{ n: referralStats.active || 0, l: 'Active' }, { n: referralStats.signed_up || 0, l: 'Signed Up' }, { n: referralStats.clicks || 0, l: 'Clicks' }].map((s, i) => (
                      <View key={i} style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E8E0D5' }}>
                        <Text style={{ fontSize: 22, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' }}>{s.n}</Text>
                        <Text style={{ fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>{s.l}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}


            {/* ── WHATSAPP BROADCAST (Signature+) ── */}
            {activeTab === 'WhatsApp' && (
              <View style={styles.tabPane}>
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#EDE8E0', gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#25D36615', justifyContent: 'center', alignItems: 'center' }}>
                      <Feather name="message-circle" size={16} color="#25D366" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' }}>Compose Message</Text>
                      <Text style={{ fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>Write once, send to all clients via WhatsApp</Text>
                    </View>
                  </View>
                  <TextInput
                    style={{ backgroundColor: '#FAF6F0', borderRadius: 10, borderWidth: 1, borderColor: '#EDE8E0', padding: 14, fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_400Regular', minHeight: 100, textAlignVertical: 'top' }}
                    placeholder="Type your message here..."
                    placeholderTextColor="#B8ADA4"
                    multiline
                    value={broadcastMessage}
                    onChangeText={setBroadcastMessage}
                  />
                </View>

                <Text style={styles.sectionLabel}>QUICK TEMPLATES</Text>
                {[
                  { label: 'Seasonal Offer', icon: 'gift', msg: 'Exciting news! I am offering a special discount for upcoming wedding season bookings. Limited slots available. Reply to know more!' },
                  { label: 'Portfolio Update', icon: 'image', msg: 'Hi! I have just updated my portfolio with my latest work. Would love for you to check it out on The Dream Wedding app!' },
                  { label: 'Referral Request', icon: 'share-2', msg: 'Hi! If you know any couple planning their wedding, I would love a referral. They get a special rate through The Dream Wedding. Here is my link: https://thedreamwedding.in' },
                  { label: 'Festival Greeting', icon: 'sun', msg: 'Wishing you and your family a very happy festival season! If you are planning any celebrations, I would love to be part of them.' },
                  { label: 'Availability Alert', icon: 'calendar', msg: 'Quick update — I have a few dates opening up for the upcoming season. If you or anyone you know is looking, please reach out soon!' },
                ].map((tmpl, idx) => (
                  <TouchableOpacity key={idx} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EDE8E0', flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    onPress={() => setBroadcastMessage(tmpl.msg)}>
                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#E8D9B5', justifyContent: 'center', alignItems: 'center' }}>
                      <Feather name={tmpl.icon as any} size={14} color="#C9A84C" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_500Medium' }}>{tmpl.label}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: '#C9A84C', fontFamily: 'DMSans_400Regular' }}>Use</Text>
                  </TouchableOpacity>
                ))}

                {broadcastMessage.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>SEND TO CLIENTS</Text>
                    {clients.length === 0 ? (
                      <View style={styles.emptyCard}><Feather name="users" size={24} color="#EDE8E0" /><Text style={styles.emptyTitle}>No clients yet</Text><Text style={styles.emptySub}>Add clients first, then broadcast</Text></View>
                    ) : clients.map((client: any) => (
                      <TouchableOpacity key={client.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EDE8E0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                        onPress={() => { const url = 'whatsapp://send?phone=91' + client.phone + '&text=' + encodeURIComponent(broadcastMessage); Linking.openURL(url); }}>
                        <View style={{ gap: 2 }}>
                          <Text style={{ fontSize: 14, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' }}>{client.name}</Text>
                          <Text style={{ fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>{client.phone}</Text>
                        </View>
                        <View style={{ backgroundColor: '#25D366', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                          <Text style={{ fontSize: 11, color: '#FFFFFF', fontFamily: 'DMSans_500Medium' }}>Send</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </View>
            )}

            {/* ── ANALYTICS (Signature+) ── */}
            {activeTab === 'Analytics' && (
              <View style={styles.tabPane}>
                {/* Revenue Overview */}
                <View style={{ backgroundColor: '#2C2420', borderRadius: 14, padding: 18, gap: 14 }}>
                  <Text style={{ fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_500Medium', letterSpacing: 1.5 }}>REVENUE OVERVIEW</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 22, color: '#C9A84C', fontFamily: 'PlayfairDisplay_400Regular' }}>
                        {invoices.length > 0 ? '₹' + Math.round(invoices.reduce((s: number, i: any) => s + (i.amount || 0), 0) / 100000 * 10) / 10 + 'L' : '₹0'}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>Total Revenue</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: '#3C3430', height: 32 }} />
                    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 22, color: '#F5F0E8', fontFamily: 'PlayfairDisplay_400Regular' }}>{invoices.length}</Text>
                      <Text style={{ fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>Invoices</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: '#3C3430', height: 32 }} />
                    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 22, color: '#F5F0E8', fontFamily: 'PlayfairDisplay_400Regular' }}>{clients.length}</Text>
                      <Text style={{ fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>Clients</Text>
                    </View>
                  </View>
                </View>

                {/* Booking Pipeline */}
                <Text style={styles.sectionLabel}>BOOKING PIPELINE</Text>
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#EDE8E0', gap: 12 }}>
                  {[
                    { label: 'New Enquiries', count: leads.filter((l: any) => l.stage === 'New Inquiry').length, color: '#C9A84C' },
                    { label: 'Quoted', count: leads.filter((l: any) => l.stage === 'Quoted').length, color: '#8C7B6E' },
                    { label: 'Confirmed', count: bookings.filter((b: any) => b.status === 'confirmed').length, color: '#4CAF50' },
                    { label: 'Completed', count: leads.filter((l: any) => l.stage === 'Completed').length, color: '#2C2420' },
                  ].map((stage, idx) => (
                    <View key={idx} style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular' }}>{stage.label}</Text>
                        <Text style={{ fontSize: 15, color: stage.color, fontFamily: 'PlayfairDisplay_400Regular' }}>{stage.count}</Text>
                      </View>
                      <View style={{ height: 4, backgroundColor: '#F5F0E8', borderRadius: 2 }}>
                        <View style={{ height: 4, backgroundColor: stage.color, borderRadius: 2, width: (stage.count > 0 ? Math.min(100, stage.count * 20) + '%' : '0%') as any, opacity: 0.7 }} />
                      </View>
                    </View>
                  ))}
                </View>

                {/* Expense Breakdown */}
                <Text style={styles.sectionLabel}>EXPENSE BREAKDOWN</Text>
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#EDE8E0', gap: 10 }}>
                  {expenses.length === 0 ? (
                    <Text style={{ fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>No expenses recorded yet</Text>
                  ) : (
                    (() => {
                      const cats: Record<string, number> = {};
                      expenses.forEach((e: any) => { cats[e.category || 'Other'] = (cats[e.category || 'Other'] || 0) + (e.amount || 0); });
                      const total = Object.values(cats).reduce((a, b) => a + b, 0);
                      return Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([cat, amt], idx) => (
                        <View key={idx} style={{ gap: 4 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular' }}>{cat}</Text>
                            <Text style={{ fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_500Medium' }}>{'₹'}{amt.toLocaleString('en-IN')}</Text>
                          </View>
                          <View style={{ height: 4, backgroundColor: '#F5F0E8', borderRadius: 2 }}>
                            <View style={{ height: 4, backgroundColor: '#C9A84C', borderRadius: 2, width: (total > 0 ? Math.round(amt / total * 100) + '%' : '0%') as any, opacity: 0.6 }} />
                          </View>
                        </View>
                      ));
                    })()
                  )}
                </View>

                {/* Quick Stats */}
                <Text style={styles.sectionLabel}>PERFORMANCE</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[
                    { n: invoices.filter((i: any) => i.status === 'paid').length, l: 'Paid', t: invoices.length > 0 ? Math.round(invoices.filter((i: any) => i.status === 'paid').length / invoices.length * 100) + '%' : '0%' },
                    { n: bookings.filter((b: any) => b.status === 'confirmed').length, l: 'Confirmed', t: bookings.length > 0 ? Math.round(bookings.filter((b: any) => b.status === 'confirmed').length / bookings.length * 100) + '%' : '0%' },
                  ].map((s, i) => (
                    <View key={i} style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#EDE8E0' }}>
                      <Text style={{ fontSize: 24, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' }}>{s.t}</Text>
                      <Text style={{ fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light' }}>{s.l} Rate</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ── Deluxe Suite tabs — redirect to overview feed ── */}
            {activeTab.startsWith('ds-') && (
              <View style={styles.tabPane}>
                <View style={{ backgroundColor: '#FFF8EC', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E8D9B5', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Feather name="info" size={14} color="#C9A84C" />
                  <Text style={{ flex: 1, fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', lineHeight: 18 }}>All Deluxe Suite tools are available in your command feed. Tap Dashboard to access them.</Text>
                </View>
                <TouchableOpacity style={styles.goldBtn} onPress={() => setActiveTab('Overview')}><Feather name="grid" size={14} color="#2C2420" /><Text style={styles.goldBtnText}>GO TO DASHBOARD</Text></TouchableOpacity>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </>
      )}

      {/* ── Date Picker ── */}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerValue}
          mode="date"
          display="spinner"
          onChange={handleDatePicked}
          minimumDate={new Date()}
        />
      )}

      {/* ── Bottom Nav ── */}
      <View style={styles.bottomNav}>
        {[
          { icon: 'grid', label: 'Dashboard', active: true },
          { icon: 'mail', label: 'Enquiries', active: false },
          { icon: 'calendar', label: 'Calendar', active: false },
          { icon: 'settings', label: 'Settings', active: false },
        ].map((nav, i) => (
          <TouchableOpacity key={i} style={styles.navItem} onPress={() => {
            if (nav.label === 'Dashboard') setActiveTab('Overview');
            else if (nav.label === 'Enquiries') setActiveTab('Inquiries');
            else if (nav.label === 'Calendar') setActiveTab('Calendar');
            else if (nav.label === 'Settings') openSettings();
          }}>
            <Feather name={nav.icon as any} size={20} color={nav.label === 'Dashboard' && activeTab === 'Overview' ? '#2C2420' : '#8C7B6E'} />
            <Text style={[styles.navLabel, nav.label === 'Dashboard' && activeTab === 'Overview' && styles.navLabelActive]}>{nav.label}</Text>
            {nav.label === 'Dashboard' && activeTab === 'Overview' && <View style={styles.navDot} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  headerLeft: { gap: 4, flex: 1 },
  businessName: { fontSize: 22, color: '#2C2420', fontFamily: 'PlayfairDisplay_600SemiBold', letterSpacing: 0.3 },
  category: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  liveToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FFFFFF' },
  liveToggleActive: { borderColor: '#4CAF50', backgroundColor: '#4CAF5010' },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#E8E0D5' },
  liveDotActive: { backgroundColor: '#4CAF50' },
  liveToggleText: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  liveToggleTextActive: { color: '#4CAF50', fontFamily: 'DMSans_500Medium' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20, gap: 16 },
  tabPane: { gap: 16 },
  sectionLabel: { fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_500Medium', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 },
  alertCard: { backgroundColor: '#FFF8EC', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#C9A84C', gap: 6 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  alertTitle: { fontSize: 14, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  alertText: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  alertLink: { fontSize: 13, color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  bookingCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#C9A84C', gap: 14 },
  bookingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bookingName: { fontSize: 15, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  bookingMeta: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', marginTop: 3 },
  shieldBadge: { backgroundColor: '#C9A84C20', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  shieldBadgeText: { fontSize: 11, color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  bookingActions: { flexDirection: 'row', gap: 10 },
  declineBtn: { flex: 1, borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  declineBtnText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  confirmBtn: { flex: 2, backgroundColor: '#2C2420', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  confirmBtnText: { fontSize: 12, color: '#C9A84C', fontFamily: 'DMSans_500Medium', letterSpacing: 0.8 },
  listCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E8E0D5', overflow: 'hidden' },
  listDivider: { height: 1, backgroundColor: '#E8E0D5', marginHorizontal: 16 },
  leadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  leadInfo: { gap: 3 },
  leadName: { fontSize: 14, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  leadDate: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  leadRight: { alignItems: 'flex-end', gap: 4 },
  leadValue: { fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_500Medium' },
  stageBadge: { borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3 },
  stageBadgeText: { fontSize: 10, fontFamily: 'DMSans_500Medium' },
  templateRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  templateInfo: { flex: 1, gap: 3 },
  templateLabel: { fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_500Medium' },
  templatePreview: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  templateCopyBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#E8D9B5', justifyContent: 'center', alignItems: 'center' },
  calendarHint: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', lineHeight: 20 },
  confirmedMeta: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light', marginTop: 2 },
  confirmedBadge: { backgroundColor: '#C9A84C20', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  confirmedBadgeText: { fontSize: 11, color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  blockedHeader: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E8E0D5' },
  blockedTitle: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_500Medium' },
  blockedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  blockedDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  blockedDate: { fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  unblockBtn: { borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  unblockBtnText: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  emptyText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#E8E0D5', gap: 12 },
  emptyTitle: { fontSize: 16, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  emptySub: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', textAlign: 'center', lineHeight: 20 },
  clientCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E8E0D5', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientInfo: { gap: 3, flex: 1 },
  clientName: { fontSize: 15, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  clientPhone: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  clientDate: { fontSize: 12, color: '#C9A84C', fontFamily: 'DMSans_300Light' },
  whatsappBtn: { backgroundColor: '#25D366', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  whatsappBtnDone: { backgroundColor: '#E8E0D5' },
  whatsappBtnText: { fontSize: 12, color: '#FFFFFF', fontFamily: 'DMSans_500Medium' },
  whatsappBtnTextDone: { color: '#8C7B6E' },
  clientsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addClientBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2C2420', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  addClientBtnText: { fontSize: 12, color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  goldBtn: { backgroundColor: '#C9A84C', borderRadius: 10, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  goldBtnText: { fontSize: 12, color: '#2C2420', fontFamily: 'DMSans_500Medium', letterSpacing: 1 },
  goldOutlineBtn: { borderWidth: 1, borderColor: '#C9A84C', borderRadius: 10, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, backgroundColor: '#FFFFFF' },
  goldOutlineBtnText: { fontSize: 13, color: '#C9A84C', fontFamily: 'DMSans_400Regular' },
  fieldInput: { backgroundColor: '#F5F0E8', borderRadius: 8, borderWidth: 1, borderColor: '#E8E0D5', paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  invoiceHistoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14 },
  invoiceHistoryClient: { fontSize: 14, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  invoiceHistoryMeta: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  invoiceHistoryAmount: { fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_500Medium' },
  invoiceStatusBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center', minWidth: 80 },
  invoiceStatusText: { fontSize: 11, fontFamily: 'DMSans_500Medium' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#F5F0E8', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, gap: 14 },
  modalTitle: { fontSize: 24, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.3 },
  modalSubtitle: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', marginTop: -8, lineHeight: 20 },
  modalInput: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E8E0D5', paddingVertical: 14, paddingHorizontal: 16, fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  modalBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  modalBtnText: { fontSize: 13, color: '#F5F0E8', fontFamily: 'DMSans_500Medium', letterSpacing: 1.5 },
  modalCancel: { alignItems: 'center', paddingVertical: 8 },
  modalCancelText: { fontSize: 14, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  settingsSection: { gap: 6, marginBottom: 16 },
  settingsSectionLabel: { fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_500Medium', letterSpacing: 1.5 },
  settingsInput: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E8E0D5', paddingVertical: 14, paddingHorizontal: 16, fontSize: 15, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  loginCodeBtn: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1.5, borderColor: '#C9A84C' },
  loginCodeInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  loginCodeLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  loginCodeLabel: { fontSize: 14, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.2 },
  loginCodeHint: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light', marginTop: 2 },
  loginCodeValue: { fontSize: 28, color: '#C9A84C', fontFamily: 'PlayfairDisplay_600SemiBold', letterSpacing: 6 },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: '#E8E0D5', backgroundColor: '#F5F0E8' },
  navItem: { alignItems: 'center', gap: 4 },
  navLabel: { fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.3 },
  navLabelActive: { color: '#2C2420', fontFamily: 'DMSans_500Medium' },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C9A84C' },
});
