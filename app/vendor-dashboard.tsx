import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  useFonts,
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
import { generateInvoiceNumber, generateInvoicePDF } from '../services/invoice';

const { width } = Dimensions.get('window');
const API = 'https://dream-wedding-production-89ae.up.railway.app';

const TABS = ['Overview', 'Inquiries', 'Calendar', 'Tools', 'Tax & Finance', 'Reviews', 'Clients'];

const STAGE_COLORS: Record<string, string> = {
  'New Inquiry': '#C9A84C',
  'Quoted': '#8C7B6E',
  'Token Received': '#4CAF50',
  'Completed': '#2C2420',
};

const PROMOS = [
  { id: '1', title: '15% Off December Bookings', expires: 'Nov 30, 2025', active: true, leads: 12 },
  { id: '2', title: 'Free Pre-Wedding Shoot', expires: 'Dec 15, 2025', active: false, leads: 0 },
];

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

// ── Locked Feature Card ───────────────────────────────────────────────────────
function LockedFeature({ icon, title, desc, build }: { icon: string; title: string; desc: string; build: string }) {
  const buildColor = build === 'Build 2' ? '#C9A84C' : '#8C7B6E';
  return (
    <View style={lockedStyles.card}>
      <View style={lockedStyles.inner}>
        <View style={lockedStyles.iconBox}>
          <Feather name={icon as any} size={16} color="#8C7B6E" />
        </View>
        <View style={lockedStyles.text}>
          <Text style={lockedStyles.title}>{title}</Text>
          <Text style={lockedStyles.desc}>{desc}</Text>
        </View>
        <View style={[lockedStyles.badge, { borderColor: buildColor }]}>
          <Feather name="lock" size={9} color={buildColor} />
          <Text style={[lockedStyles.badgeText, { color: buildColor }]}>{build}</Text>
        </View>
      </View>
    </View>
  );
}

const lockedStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F0EDE8',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  text: { flex: 1, gap: 2 },
  title: {
    fontSize: 13,
    color: '#8C7B6E',
    fontFamily: 'PlayfairDisplay_400Regular',
  },
  desc: {
    fontSize: 11,
    color: '#B8ADA4',
    fontFamily: 'DMSans_300Light',
    lineHeight: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.3,
  },
});

// ── Main Component ────────────────────────────────────────────────────────────
export default function VendorDashboardScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Overview');
  const [isLive, setIsLive] = useState(true);
  const [vendorSession, setVendorSession] = useState<any>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
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

  useFonts({
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

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
  const [uploadingImage, setUploadingImage] = useState(false);

  // Clients state
  const [clients, setClients] = useState<any[]>([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientDate, setNewClientDate] = useState('');
  const [clientsLoading, setClientsLoading] = useState(false);

  // Promo state
  const [promos, setPromos] = useState(PROMOS);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [newPromoTitle, setNewPromoTitle] = useState('');
  const [newPromoExpiry, setNewPromoExpiry] = useState('');

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

  useEffect(() => { loadSession(); }, []);

  useEffect(() => {
    if (vendorSession?.vendorId) {
      loadBenchmark();
      loadInvoices();
      if (activeTab === 'Inquiries') { loadLeads(); loadBookings(); }
      if (activeTab === 'Calendar') { loadBlockedDates(); }
      if (activeTab === 'Clients') { loadClients(); }
      if (activeTab === 'Tax & Finance') { loadTDS(); }
      if (activeTab === 'Tools') { loadContracts(); loadExpenses(); loadPaymentSchedules(); loadTeamMembers(); }
    }
  }, [vendorSession, activeTab]);

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
          name: editName,
          about: editAbout,
          starting_price: parseInt(editStartingPrice) || 0,
          instagram_url: editInstagram,
          city: editCity,
          vibe_tags: editVibes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const updatedSession = {
          ...vendorSession,
          vendorName: editName,
          city: editCity,
        };
        await AsyncStorage.setItem('vendor_session', JSON.stringify(updatedSession));
        setVendorSession(updatedSession);
        setShowSettingsModal(false);
        Alert.alert('Profile Updated', 'Your changes are live on The Dream Wedding.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveClientNote = async (clientId: string) => {
    try {
      await fetch(`${API}/api/vendor-clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: noteText }),
      });
      setClientNotes(prev => ({ ...prev, [clientId]: noteText }));
      setEditingNoteId(null);
      setNoteText('');
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, notes: noteText } : c));
    } catch (e) {
      Alert.alert('Error', 'Could not save note.');
    }
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
        vendor_id: vendorSession.vendorId,
        client_name: contractClient,
        client_phone: contractPhone,
        event_type: contractEventType,
        event_date: contractEventDate,
        venue: contractVenue,
        service_description: contractServices,
        total_amount: parseInt(contractTotal),
        advance_amount: parseInt(contractAdvance || '0'),
        balance_amount: balance,
        deliverables: contractDeliverables,
        cancellation_policy: contractCancellation,
        status: 'issued',
      };

      // Save to Supabase
      await fetch(`${API}/api/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractData),
      });

      // Generate PDF
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Helvetica, sans-serif; padding: 40px; color: #2C2420; }
            h1 { font-size: 28px; font-weight: 300; letter-spacing: 4px; margin-bottom: 4px; }
            h2 { font-size: 11px; color: #8C7B6E; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 32px; }
            .gold { color: #C9A84C; }
            .section { margin-bottom: 28px; }
            .section-title { font-size: 10px; color: #8C7B6E; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #E8E0D5; padding-bottom: 6px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F5F0E8; font-size: 13px; }
            .amount-box { background: #2C2420; color: #F5F0E8; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .amount-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
            .amount-gold { color: #C9A84C; font-size: 20px; font-weight: 300; }
            .terms { background: #F5F0E8; padding: 16px; border-radius: 8px; font-size: 12px; color: #8C7B6E; line-height: 1.6; }
            .signature { display: flex; justify-content: space-between; margin-top: 60px; }
            .sig-box { width: 45%; border-top: 1px solid #2C2420; padding-top: 8px; font-size: 12px; color: #8C7B6E; }
            .footer { margin-top: 40px; font-size: 10px; color: #8C7B6E; text-align: center; border-top: 1px solid #E8E0D5; padding-top: 16px; }
          </style>
        </head>
        <body>
          <h1>THE DREAM WEDDING</h1>
          <h2>Service Agreement</h2>

          <div class="section">
            <div class="section-title">Parties</div>
            <div class="row"><span>Vendor</span><span><strong>${vendorSession?.vendorName || 'Vendor'}</strong></span></div>
            <div class="row"><span>Client</span><span><strong>${contractClient}</strong></span></div>
            ${contractPhone ? `<div class="row"><span>Client Phone</span><span>${contractPhone}</span></div>` : ''}
          </div>

          <div class="section">
            <div class="section-title">Event Details</div>
            <div class="row"><span>Event Type</span><span>${contractEventType}</span></div>
            <div class="row"><span>Event Date</span><span><strong>${contractEventDate}</strong></span></div>
            ${contractVenue ? `<div class="row"><span>Venue</span><span>${contractVenue}</span></div>` : ''}
          </div>

          ${contractServices ? `
          <div class="section">
            <div class="section-title">Services</div>
            <p style="font-size:13px; line-height:1.6; color:#2C2420;">${contractServices}</p>
          </div>` : ''}

          ${contractDeliverables ? `
          <div class="section">
            <div class="section-title">Deliverables</div>
            <p style="font-size:13px; line-height:1.6; color:#2C2420;">${contractDeliverables}</p>
          </div>` : ''}

          <div class="amount-box">
            <div class="amount-row"><span>Total Amount</span><span class="amount-gold">Rs.${parseInt(contractTotal).toLocaleString('en-IN')}</span></div>
            <div class="amount-row"><span>Advance / Token</span><span>Rs.${parseInt(contractAdvance || '0').toLocaleString('en-IN')}</span></div>
            <div class="amount-row"><span>Balance Due</span><span>Rs.${balance.toLocaleString('en-IN')}</span></div>
          </div>

          <div class="section">
            <div class="section-title">Cancellation Policy</div>
            <div class="terms">${contractCancellation}</div>
          </div>

          <div class="section">
            <div class="section-title">Additional Terms</div>
            <div class="terms">
              1. This agreement is binding once the advance amount is received.<br>
              2. Any additional services requested on the day of the event will be charged separately.<br>
              3. The vendor reserves the right to use images/videos for portfolio purposes unless explicitly requested otherwise in writing.<br>
              4. Disputes subject to jurisdiction of courts in ${vendorSession?.city || 'Delhi NCR'}.
            </div>
          </div>

          <div class="signature">
            <div class="sig-box">
              <strong>${vendorSession?.vendorName || 'Vendor'}</strong><br>
              Vendor Signature & Date
            </div>
            <div class="sig-box">
              <strong>${contractClient}</strong><br>
              Client Signature & Date
            </div>
          </div>

          <div class="footer">
            Generated by The Dream Wedding · thedreamwedding.in · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </body>
        </html>
      `;

      const printModule = await import('expo-print');
      const sharingModule = await import('expo-sharing');
      const { uri } = await printModule.printToFileAsync({ html });
      await sharingModule.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Service Agreement',
        UTI: 'com.adobe.pdf',
      });

      loadContracts();
      setContractClient('');
      setContractPhone('');
      setContractEventDate('');
      setContractVenue('');
      setContractServices('');
      setContractTotal('');
      setContractAdvance('');
      setContractDeliverables('');
      setShowContractForm(false);
      Alert.alert('Contract Ready', 'PDF generated. Share via WhatsApp with your client.');
    } catch (e) {
      Alert.alert('Error', 'Could not generate contract.');
    }
  };

  const handleAddExpense = async () => {
    if (!expenseDesc || !expenseAmount) {
      Alert.alert('Missing info', 'Please enter description and amount.');
      return;
    }
    try {
      const res = await fetch(`${API}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorSession.vendorId,
          description: expenseDesc,
          amount: parseInt(expenseAmount),
          category: expenseCategory,
          client_name: expenseClient,
          expense_date: new Date().toLocaleDateString('en-IN'),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExpenses(prev => [data.data, ...prev]);
        setExpenseDesc('');
        setExpenseAmount('');
        setExpenseClient('');
        setShowExpenseForm(false);
        Alert.alert('Expense Added', 'Expense recorded successfully.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save expense.');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await fetch(`${API}/api/expenses/${id}`, { method: 'DELETE' });
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (e) {}
  };

  const handleExportExpenses = async () => {
    if (expenses.length === 0) {
      Alert.alert('No expenses', 'No expenses recorded yet.');
      return;
    }
    try {
      const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
      const rows = expenses.map(exp => `
        <tr>
          <td>${exp.expense_date || ''}</td>
          <td>${exp.category || ''}</td>
          <td>${exp.description}</td>
          <td>${exp.client_name || '—'}</td>
          <td style="text-align:right">Rs.${(exp.amount || 0).toLocaleString('en-IN')}</td>
        </tr>
      `).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Helvetica,sans-serif;padding:40px;color:#2C2420}h1{font-size:24px;font-weight:300;letter-spacing:4px}h2{font-size:12px;color:#8C7B6E;letter-spacing:2px;text-transform:uppercase;margin-bottom:24px}table{width:100%;border-collapse:collapse}th{font-size:10px;color:#8C7B6E;letter-spacing:1px;text-transform:uppercase;padding:10px 8px;border-bottom:1px solid #E8E0D5;text-align:left}td{padding:12px 8px;border-bottom:1px solid #F5F0E8;font-size:13px}.total{margin-top:24px;background:#2C2420;padding:20px;border-radius:8px;color:#F5F0E8;display:flex;justify-content:space-between}.gold{color:#C9A84C;font-size:18px}</style></head><body><h1>THE DREAM WEDDING</h1><h2>Expense Report — ${vendorSession?.vendorName || 'Vendor'} · FY ${new Date().getFullYear()}</h2><table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Client</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table><div class="total"><span>Total Expenses</span><span class="gold">Rs.${totalExpenses.toLocaleString('en-IN')}</span></div></body></html>`;
      const printModule = await import('expo-print');
      const sharingModule = await import('expo-sharing');
      const { uri } = await printModule.printToFileAsync({ html });
      await sharingModule.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Expense Report', UTI: 'com.adobe.pdf' });
    } catch (e) {
      Alert.alert('Error', 'Could not generate expense report.');
    }
  };

  const handleSavePaymentSchedule = async () => {
    if (!paymentClient || !paymentTotal) {
      Alert.alert('Missing info', 'Please enter client name and total amount.');
      return;
    }
    try {
      const res = await fetch(`${API}/api/payment-schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorSession.vendorId,
          client_name: paymentClient,
          client_phone: paymentPhone,
          total_amount: parseInt(paymentTotal),
          instalments: paymentInstalments,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentSchedules(prev => [data.data, ...prev]);
        setPaymentClient('');
        setPaymentPhone('');
        setPaymentTotal('');
        setPaymentInstalments([
          { label: 'Token', amount: '', due_date: '', paid: false },
          { label: 'Advance', amount: '', due_date: '', paid: false },
          { label: 'Final', amount: '', due_date: '', paid: false },
        ]);
        setShowPaymentForm(false);
        Alert.alert('Schedule Saved', 'Payment schedule created successfully.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save payment schedule.');
    }
  };

  const handleMarkInstalmentPaid = async (scheduleId: string, instalmentIndex: number) => {
    try {
      const schedule = paymentSchedules.find(s => s.id === scheduleId);
      if (!schedule) return;
      const updated = [...schedule.instalments];
      updated[instalmentIndex] = { ...updated[instalmentIndex], paid: true };
      await fetch(`${API}/api/payment-schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instalments: updated }),
      });
      setPaymentSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, instalments: updated } : s));
    } catch (e) {
      Alert.alert('Error', 'Could not update payment.');
    }
  };

  const handleAddTeamMember = async () => {
    if (!teamMemberName || !teamMemberRole) {
      Alert.alert('Missing info', 'Please enter name and role.');
      return;
    }
    try {
      const res = await fetch(`${API}/api/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorSession.vendorId,
          name: teamMemberName,
          phone: teamMemberPhone,
          role: teamMemberRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTeamMembers(prev => [data.data, ...prev]);
        setTeamMemberName('');
        setTeamMemberPhone('');
        setTeamMemberRole('');
        setShowTeamForm(false);
        Alert.alert('Team Member Added', `${teamMemberName} added to your team.`);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not add team member.');
    }
  };

  const handleRemoveTeamMember = async (id: string) => {
    try {
      await fetch(`${API}/api/team/${id}`, { method: 'DELETE' });
      setTeamMembers(prev => prev.filter(m => m.id !== id));
    } catch (e) {}
  };

  const loadSession = async () => {
    try {
      const stored = await AsyncStorage.getItem('vendor_session');
      if (stored) setVendorSession(JSON.parse(stored));
    } catch (e) {}
  };

  const loadBenchmark = async () => {
    try {
      const res = await getBenchmark(vendorSession?.category || 'photographers', vendorSession?.city || 'Delhi NCR');
      if (res.success) setBenchmark(res.data);
    } catch (e) {}
  };

  const loadLeads = async () => {
    try {
      setLeadsLoading(true);
      const res = await getLeads(vendorSession.vendorId);
      if (res.success && res.data?.length > 0) setLeads(res.data);
    } catch (e) {} finally { setLeadsLoading(false); }
  };

  const loadBookings = async () => {
    try {
      setBookingsLoading(true);
      const res = await getVendorBookings(vendorSession.vendorId);
      if (res.success) setBookings(res.data || []);
    } catch (e) {} finally { setBookingsLoading(false); }
  };

  const loadInvoices = async () => {
    try {
      const res = await getInvoices(vendorSession.vendorId);
      if (res.success) setInvoices(res.data || []);
    } catch (e) {}
  };

  const loadBlockedDates = async () => {
    try {
      setCalendarLoading(true);
      const res = await getBlockedDates(vendorSession.vendorId);
      if (res.success) setBlockedDates(res.data || []);
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
    if (!tdsEntryAmount || !tdsEntryClient) {
      Alert.alert('Missing info', 'Please enter client name and amount.');
      return;
    }
    try {
      const res = await fetch(`${API}/api/tds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorSession.vendorId,
          transaction_type: 'client_invoice',
          gross_amount: parseInt(tdsEntryAmount),
          tds_deducted_by: tdsEntryDeductedBy,
          challan_number: tdsEntryChallan,
          notes: `Client: ${tdsEntryClient}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Entry Added', 'TDS entry recorded successfully.');
        setTdsEntryAmount('');
        setTdsEntryClient('');
        setTdsEntryChallan('');
        setShowTDSEntryForm(false);
        loadTDS();
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save TDS entry.');
    }
  };

  const handleExportTDSReport = async () => {
    try {
      if (!tdsSummary || tdsLedger.length === 0) {
        Alert.alert('No data', 'No TDS entries found for this financial year.');
        return;
      }
      const rows = tdsLedger.map((entry: any) => `
        <tr>
          <td>${new Date(entry.created_at).toLocaleDateString('en-IN')}</td>
          <td>${entry.transaction_type === 'platform_booking' ? 'Platform Booking' : 'Client Invoice'}</td>
          <td style="text-align:right">₹${(entry.gross_amount || 0).toLocaleString('en-IN')}</td>
          <td style="text-align:right">${entry.tds_rate || 10}%</td>
          <td style="text-align:right">₹${(entry.tds_amount || 0).toLocaleString('en-IN')}</td>
          <td style="text-align:right">₹${(entry.net_amount || 0).toLocaleString('en-IN')}</td>
          <td>${entry.tds_deducted_by === 'platform' ? 'Platform' : entry.tds_deducted_by === 'client' ? 'Client' : 'Self'}</td>
          <td>${entry.challan_number || '—'}</td>
        </tr>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Helvetica, sans-serif; padding: 40px; color: #2C2420; }
            h1 { font-size: 28px; font-weight: 300; letter-spacing: 4px; margin-bottom: 4px; }
            h2 { font-size: 12px; color: #8C7B6E; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 32px; }
            .summary { background: #2C2420; padding: 24px; border-radius: 8px; color: #F5F0E8; margin-bottom: 32px; display: flex; gap: 40px; }
            .summary-item { display: flex; flex-direction: column; gap: 4px; }
            .summary-label { font-size: 10px; color: #8C7B6E; letter-spacing: 1px; text-transform: uppercase; }
            .summary-value { font-size: 22px; color: #C9A84C; font-weight: 300; }
            .summary-value.white { color: #F5F0E8; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th { font-size: 10px; color: #8C7B6E; letter-spacing: 1px; text-transform: uppercase; padding: 10px 8px; border-bottom: 1px solid #E8E0D5; text-align: left; }
            td { padding: 12px 8px; border-bottom: 1px solid #F5F0E8; font-size: 12px; }
            .footer { margin-top: 40px; font-size: 10px; color: #8C7B6E; text-align: center; border-top: 1px solid #E8E0D5; padding-top: 20px; }
            .notice { background: #FFF8EC; border: 1px solid #E8D9B5; border-radius: 8px; padding: 16px; margin-top: 24px; font-size: 12px; color: #8C7B6E; line-height: 1.6; }
          </style>
        </head>
        <body>
          <h1>THE DREAM WEDDING</h1>
          <h2>TDS Reconciliation Report · ${vendorSession?.vendorName || 'Vendor'} · ${tdsSummary?.financial_year || ''}</h2>
          <div class="summary">
            <div class="summary-item">
              <span class="summary-label">Total Gross Income</span>
              <span class="summary-value">₹${(tdsSummary?.total_gross_income || 0).toLocaleString('en-IN')}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total TDS Deducted</span>
              <span class="summary-value">₹${(tdsSummary?.total_tds_deducted || 0).toLocaleString('en-IN')}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Net Received</span>
              <span class="summary-value white">₹${(tdsSummary?.total_net_received || 0).toLocaleString('en-IN')}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Platform TDS</span>
              <span class="summary-value">₹${(tdsSummary?.platform_tds || 0).toLocaleString('en-IN')}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Client TDS</span>
              <span class="summary-value">₹${(tdsSummary?.client_tds || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th style="text-align:right">Gross</th>
                <th style="text-align:right">TDS Rate</th>
                <th style="text-align:right">TDS Amount</th>
                <th style="text-align:right">Net</th>
                <th>Deducted By</th>
                <th>Challan</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="notice">
            <strong>Note for CA:</strong> TDS deducted by platform is at source on vendor payout (post 5% platform commission). 
            Client-deducted TDS is as declared by vendor. Self-declared entries are vendor's own records. 
            Please verify against Form 26AS before filing. Platform TDS will reflect in 26AS under The Dream Wedding's TAN.
          </div>
          <div class="footer">
            Generated by The Dream Wedding · thedreamwedding.in · ${tdsLedger.length} entries · Report generated ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </body>
        </html>
      `;

      const printModule = await import('expo-print');
      const sharingModule = await import('expo-sharing');
      const { uri } = await printModule.printToFileAsync({ html });
      await sharingModule.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'TDS Reconciliation Report',
        UTI: 'com.adobe.pdf',
      });
    } catch (e) {
      Alert.alert('Error', 'Could not generate TDS report.');
    }
  };

  const handleBlockDate = async () => {
    if (!newBlockDate.trim()) return;
    try {
      const res = await blockDate(vendorSession.vendorId, newBlockDate.trim());
      if (res.success) {
        setBlockedDates(prev => [...prev, res.data]);
        setNewBlockDate('');
        setShowDateInput(false);
      }
    } catch (e) { Alert.alert('Error', 'Could not block date.'); }
  };

  const handleUnblockDate = async (id: string) => {
    try {
      await unblockDate(id);
      setBlockedDates(prev => prev.filter(d => d.id !== id));
    } catch (e) { Alert.alert('Error', 'Could not unblock date.'); }
  };

  const loadClients = async () => {
    try {
      setClientsLoading(true);
      // Try Supabase first
      const res = await fetch(`${API}/api/vendor-clients/${vendorSession.vendorId}`);
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        setClients(data.data);
      } else {
        // Fallback to AsyncStorage for existing clients
        const stored = await AsyncStorage.getItem(`vendor_clients_${vendorSession.vendorId}`);
        if (stored) setClients(JSON.parse(stored));
      }
    } catch (e) {
      try {
        const stored = await AsyncStorage.getItem(`vendor_clients_${vendorSession.vendorId}`);
        if (stored) setClients(JSON.parse(stored));
      } catch {}
    } finally { setClientsLoading(false); }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive', onPress: async () => {
          await AsyncStorage.removeItem('vendor_session');
          await AsyncStorage.removeItem('user_session');
          router.replace('/login');
        }
      }
    ]);
  };

  const handleImageUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      try {
        setUploadingImage(true);
        const url = await uploadImage(result.assets[0].uri);
        setPortfolioImages(prev => [...prev, url]);
        Alert.alert('Uploaded!', 'Photo added to your portfolio.');
      } catch { Alert.alert('Upload failed', 'Please try again.'); }
      finally { setUploadingImage(false); }
    }
  };

  const handleSendWhatsAppInvite = async (client: any) => {
    const message = `Hi ${client.name.split('&')[0].trim()}! 👋\n\nI've added you to The Dream Wedding — India's premium wedding planning app.\n\nYour booking history with me is already saved. You can also discover other vendors and plan your entire wedding in one place.\n\nDownload here: https://thedreamwedding.in\n\nSee you there! 🎉`;
    const url = `whatsapp://send?phone=91${client.phone}&text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url).then(async supported => {
      if (supported) {
        Linking.openURL(url);
        // Mark as invited in Supabase
        try {
          await fetch(`${API}/api/vendor-clients/${client.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invited: true }),
          });
        } catch {}
        setClients(prev => prev.map(c => c.id === client.id ? { ...c, invited: true } : c));
      } else {
        Alert.alert('WhatsApp not found', 'Please make sure WhatsApp is installed.');
      }
    });
  };

  const handleAddClient = async () => {
    if (!newClientName || !newClientPhone || !newClientDate) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    try {
      // Save to Supabase
      const res = await fetch(`${API}/api/vendor-clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorSession.vendorId,
          name: newClientName,
          phone: newClientPhone,
          wedding_date: newClientDate,
          status: 'upcoming',
          invited: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setClients(prev => [data.data, ...prev]);
        setNewClientName('');
        setNewClientPhone('');
        setNewClientDate('');
        setShowAddClient(false);
        Alert.alert('Client Added!', `${newClientName} added. Tap Send Invite to invite them via WhatsApp.`);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save client.');
    }
  };

  const handleConfirmBooking = async (bookingId: string) => {
    Alert.alert('Confirm Booking', 'This will lock the date and release escrow payment to you.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', onPress: async () => {
          try {
            const res = await fetch(`${API}/api/bookings/${bookingId}/confirm`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (data.success) {
              Alert.alert('Confirmed!', 'Payment released from escrow. TDS entry recorded automatically.');
              loadBookings();
              if (activeTab === 'Tax & Finance') loadTDS();
            } else Alert.alert('Error', data.error || 'Could not confirm.');
          } catch (e) { Alert.alert('Error', 'Network error.'); }
        }
      }
    ]);
  };

  const handleDeclineBooking = async (bookingId: string) => {
    Alert.alert('Decline Booking', 'Token will be refunded. ₹999 platform fee is retained.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive', onPress: async () => {
          try {
            const res = await fetch(`${API}/api/bookings/${bookingId}/decline`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason: 'Vendor unavailable' }),
            });
            const data = await res.json();
            if (data.success) {
              Alert.alert('Declined', 'Refund initiated.');
              loadBookings();
            } else Alert.alert('Error', data.error || 'Could not decline.');
          } catch (e) { Alert.alert('Error', 'Network error.'); }
        }
      }
    ]);
  };

  const handleGenerateInvoice = async () => {
    if (!invoiceClient || !invoiceAmount) {
      Alert.alert('Missing info', 'Please enter client name and amount.');
      return;
    }
    try {
      const invNumber = generateInvoiceNumber();

      // Save to Supabase with TDS
      await fetch(`${API}/api/invoices/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorSession.vendorId,
          client_name: invoiceClient,
          client_phone: invoicePhone,
          amount: parseInt(invoiceAmount),
          description: invoiceDesc || 'Wedding Services',
          invoice_number: invNumber,
          tds_applicable: invoiceTDSApplicable,
          tds_deducted_by_client: invoiceTDSDeductedByClient,
          tds_rate: 10,
        }),
      });

      // Generate PDF
      await generateInvoicePDF({
        vendorName: vendorSession?.vendorName || 'Your Business',
        vendorPhone: vendorSession?.phone || '',
        vendorCity: vendorSession?.city || '',
        clientName: invoiceClient,
        amount: parseInt(invoiceAmount),
        description: invoiceDesc || 'Wedding Services',
        invoiceNumber: invNumber,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      });

      // Refresh invoices and TDS
      loadInvoices();
      if (invoiceTDSApplicable) loadTDS();

      // Reset form
      setInvoiceClient('');
      setInvoicePhone('');
      setInvoiceAmount('');
      setInvoiceDesc('');
      setInvoiceTDSApplicable(false);
      setInvoiceTDSDeductedByClient(false);
      setShowInvoiceForm(false);

    } catch { Alert.alert('Error', 'Could not generate invoice.'); }
  };

  const handleMarkInvoicePaid = async (invoiceId: string) => {
    try {
      setUpdatingInvoiceId(invoiceId);
      await fetch(`${API}/api/invoices/save`.replace('/save', `/${invoiceId}`).replace('/invoices/', '/invoices/'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      });
      setInvoices(prev => prev.map((inv: any) => inv.id === invoiceId ? { ...inv, status: 'paid' } : inv));
    } catch (e) {
      Alert.alert('Error', 'Could not update invoice status.');
    } finally {
      setUpdatingInvoiceId(null);
    }
  };

  const handleDownloadGSTReport = async () => {
    try {
      if (invoices.length === 0) {
        Alert.alert('No invoices', 'No invoices found for this financial year.');
        return;
      }
      const totalIncome = invoices.reduce((s: number, i: any) => s + (i.amount || 0), 0);
      const totalGST = invoices.reduce((s: number, i: any) => s + (i.gst_amount || 0), 0);
      const totalWithGST = invoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
      const rows = invoices.map((inv: any) => `
        <tr>
          <td>${inv.invoice_number || '—'}</td>
          <td>${inv.client_name || '—'}</td>
          <td>${new Date(inv.created_at).toLocaleDateString('en-IN')}</td>
          <td style="text-align:right">₹${(inv.amount || 0).toLocaleString('en-IN')}</td>
          <td style="text-align:right">₹${(inv.gst_amount || 0).toLocaleString('en-IN')}</td>
          <td style="text-align:right">₹${(inv.total_amount || 0).toLocaleString('en-IN')}</td>
        </tr>
      `).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Helvetica,sans-serif;padding:40px;color:#2C2420}h1{font-size:24px;font-weight:300;letter-spacing:4px}h2{font-size:12px;color:#8C7B6E;letter-spacing:2px;text-transform:uppercase;margin-bottom:24px}table{width:100%;border-collapse:collapse;margin-top:24px}th{font-size:10px;color:#8C7B6E;letter-spacing:1px;text-transform:uppercase;padding:10px 8px;border-bottom:1px solid #E8E0D5;text-align:left}td{padding:12px 8px;border-bottom:1px solid #F5F0E8;font-size:13px}.totals{margin-top:24px;background:#2C2420;padding:20px;border-radius:8px;color:#F5F0E8}.totals-row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px}.gold{color:#C9A84C;font-size:18px;font-weight:600}.footer{margin-top:40px;font-size:11px;color:#8C7B6E;text-align:center}</style></head><body><h1>DREAMWEDDING</h1><h2>GST Report — ${vendorSession?.vendorName || 'Vendor'} · FY ${new Date().getFullYear()}</h2><table><thead><tr><th>Invoice #</th><th>Client</th><th>Date</th><th style="text-align:right">Amount</th><th style="text-align:right">GST (18%)</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table><div class="totals"><div class="totals-row"><span>Total Income</span><span>₹${totalIncome.toLocaleString('en-IN')}</span></div><div class="totals-row"><span>Total GST (18%)</span><span>₹${totalGST.toLocaleString('en-IN')}</span></div><div class="totals-row"><span>Total Billed</span><span class="gold">₹${totalWithGST.toLocaleString('en-IN')}</span></div></div><div class="footer">Generated by The Dream Wedding · thedreamwedding.in · ${invoices.length} invoices</div></body></html>`;
      const printModule = await import('expo-print');
      const sharingModule = await import('expo-sharing');
      const { uri } = await printModule.printToFileAsync({ html });
      await sharingModule.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'GST Report', UTI: 'com.adobe.pdf' });
    } catch (e) { Alert.alert('Error', 'Could not generate GST report.'); }
  };

  const handleCreatePromo = () => {
    if (!newPromoTitle || !newPromoExpiry) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    setPromos(prev => [...prev, {
      id: Date.now().toString(),
      title: newPromoTitle,
      expires: newPromoExpiry,
      active: true,
      leads: 0,
    }]);
    setNewPromoTitle('');
    setNewPromoExpiry('');
    setShowPromoForm(false);
    Alert.alert('Promo Live!', 'Couples in your city will be notified.');
  };

  const vendorName = vendorSession?.vendorName || 'Your Business';
  const vendorCategory = vendorSession?.category
    ? vendorSession.category.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    : 'Vendor';
  const vendorCity = vendorSession?.city || '';
  const vendorPlan = vendorSession?.plan || 'basic';
  const pendingBookings = bookings.filter((b: any) => b.status === 'pending_confirmation');
  const confirmedBookings = bookings.filter((b: any) => b.status === 'confirmed');

  const displayLeads = leads.length > 0 ? leads : [
    { id: '1', name: 'Priya & Rahul', stage: 'New Inquiry', date: 'Dec 15', value: '₹3,00,000' },
    { id: '2', name: 'Sneha & Arjun', stage: 'Quoted', date: 'Nov 20', value: '₹1,50,000' },
    { id: '3', name: 'Ananya & Dev', stage: 'New Inquiry', date: 'Jan 5', value: '₹3,00,000' },
    { id: '4', name: 'Kavya & Rohan', stage: 'Token Received', date: 'Feb 14', value: '₹3,00,000' },
    { id: '5', name: 'Meera & Vikram', stage: 'Completed', date: 'Oct 10', value: '₹3,00,000' },
  ];

  const MOCK_INQUIRIES = [
    { id: '1', name: 'Priya & Rahul', function: 'Wedding', date: 'December 15, 2025', message: 'Hi! We loved your portfolio, especially the candid shots. Getting married Dec 15 in Delhi — 2 day coverage needed. What are your packages?', status: 'new', phone: '9999999999' },
    { id: '2', name: 'Sneha & Arjun', function: 'Sangeet', date: 'November 20, 2025', message: 'Looking for something editorial and fun for our Sangeet — not too traditional. Budget around Rs 1.5L. Would that work?', status: 'replied', phone: '8888888888' },
    { id: '3', name: 'Ananya & Dev', function: 'Reception', date: 'January 5, 2026', message: 'Can you share pricing for 3 functions — Reception, Sangeet and Wedding day? Flexible on January dates.', status: 'new', phone: '7777777777' },
  ];

  return (
    <View style={styles.container}>

      {/* ── Add Client Modal ── */}
      <Modal visible={showAddClient} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Client</Text>
            <Text style={styles.modalSubtitle}>Saved securely to your account</Text>
            <TextInput style={styles.modalInput} placeholder="Couple names (e.g. Priya & Rahul)" placeholderTextColor="#8C7B6E" value={newClientName} onChangeText={setNewClientName} />
            <TextInput style={styles.modalInput} placeholder="Phone number (10 digits)" placeholderTextColor="#8C7B6E" value={newClientPhone} onChangeText={setNewClientPhone} keyboardType="phone-pad" maxLength={10} />
            <TextInput style={styles.modalInput} placeholder="Wedding date (e.g. March 15, 2026)" placeholderTextColor="#8C7B6E" value={newClientDate} onChangeText={setNewClientDate} />
            <TouchableOpacity style={styles.modalBtn} onPress={handleAddClient}>
              <Text style={styles.modalBtnText}>ADD CLIENT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddClient(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Settings / Profile Edit Modal ── */}
      <Modal visible={showSettingsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Text style={styles.modalSubtitle}>Changes go live immediately on The Dream Wedding</Text>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionLabel}>BUSINESS NAME</Text>
                <TextInput style={styles.settingsInput} value={editName} onChangeText={setEditName} placeholder="Your business name" placeholderTextColor="#8C7B6E" />
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionLabel}>ABOUT</Text>
                <TextInput style={[styles.settingsInput, { height: 90, textAlignVertical: 'top' }]} value={editAbout} onChangeText={setEditAbout} placeholder="Tell couples what makes you special..." placeholderTextColor="#8C7B6E" multiline />
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionLabel}>STARTING PRICE (Rs.)</Text>
                <TextInput style={styles.settingsInput} value={editStartingPrice} onChangeText={setEditStartingPrice} placeholder="e.g. 80000" placeholderTextColor="#8C7B6E" keyboardType="number-pad" />
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionLabel}>INSTAGRAM HANDLE</Text>
                <TextInput style={styles.settingsInput} value={editInstagram} onChangeText={setEditInstagram} placeholder="@yourbusiness" placeholderTextColor="#8C7B6E" autoCapitalize="none" />
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionLabel}>PRIMARY CITY</Text>
                <TextInput style={styles.settingsInput} value={editCity} onChangeText={setEditCity} placeholder="e.g. Delhi NCR" placeholderTextColor="#8C7B6E" />
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionLabel}>YOUR VIBE TAGS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {['Candid', 'Traditional', 'Luxury', 'Cinematic', 'Boho', 'Festive', 'Minimalist', 'Royal'].map(vibe => (
                    <TouchableOpacity
                      key={vibe}
                      style={{
                        borderWidth: 1,
                        borderColor: editVibes.includes(vibe) ? '#C9A84C' : '#E8E0D5',
                        borderRadius: 50,
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        backgroundColor: editVibes.includes(vibe) ? '#C9A84C' : '#FFFFFF',
                      }}
                      onPress={() => {
                        setEditVibes(prev =>
                          prev.includes(vibe)
                            ? prev.filter(v => v !== vibe)
                            : [...prev, vibe]
                        );
                      }}
                    >
                      <Text style={{
                        fontSize: 13,
                        color: editVibes.includes(vibe) ? '#2C2420' : '#2C2420',
                        fontFamily: editVibes.includes(vibe) ? 'DMSans_500Medium' : 'DMSans_400Regular',
                      }}>
                        {vibe}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ height: 16 }} />

              <TouchableOpacity
                style={[styles.goldBtn, savingProfile && { opacity: 0.6 }]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile
                  ? <ActivityIndicator color="#2C2420" />
                  : <Text style={styles.goldBtnText}>SAVE CHANGES</Text>
                }
              </TouchableOpacity>

              <View style={{ height: 12 }} />

              <TouchableOpacity
                style={[styles.goldOutlineBtn, { borderColor: '#B5303A' }]}
                onPress={() => {
                  setShowSettingsModal(false);
                  handleLogout();
                }}
              >
                <Feather name="log-out" size={14} color="#B5303A" />
                <Text style={[styles.goldOutlineBtnText, { color: '#B5303A' }]}>LOG OUT</Text>
              </TouchableOpacity>

              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Create Promo Modal ── */}
      <Modal visible={showPromoForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Promo</Text>
            <Text style={styles.modalSubtitle}>Couples in your city will be notified instantly</Text>
            <TextInput style={styles.modalInput} placeholder="Promo title (e.g. 15% Off December Bookings)" placeholderTextColor="#8C7B6E" value={newPromoTitle} onChangeText={setNewPromoTitle} />
            <TextInput style={styles.modalInput} placeholder="Expires on (e.g. Dec 31, 2025)" placeholderTextColor="#8C7B6E" value={newPromoExpiry} onChangeText={setNewPromoExpiry} />
            <TouchableOpacity style={styles.modalBtn} onPress={handleCreatePromo}>
              <Text style={styles.modalBtnText}>GO LIVE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowPromoForm(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.businessName}>{vendorName}</Text>
          <Text style={styles.category}>{vendorCategory}{vendorCity ? ` · ${vendorCity}` : ''}</Text>
        </View>
        <TouchableOpacity
          style={[styles.liveToggle, isLive && styles.liveToggleActive]}
          onPress={() => setIsLive(!isLive)}
        >
          <View style={[styles.liveDot, isLive && styles.liveDotActive]} />
          <Text style={[styles.liveToggleText, isLive && styles.liveToggleTextActive]}>
            {isLive ? 'Live' : 'Paused'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Tabs ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* ════════════════════════════════
            OVERVIEW TAB
        ════════════════════════════════ */}
        {activeTab === 'Overview' && (
          <View style={styles.tabPane}>
            <View style={styles.statsRow}>
              {[
                { num: '142', lbl: 'Profile Views' },
                { num: '38', lbl: 'Hearts' },
                { num: '12', lbl: 'Enquiries' },
              ].map(s => (
                <View key={s.lbl} style={styles.statCard}>
                  <Text style={styles.statNumber}>{s.num}</Text>
                  <Text style={styles.statLabel}>{s.lbl}</Text>
                </View>
              ))}
            </View>

            <View style={styles.revenueCard}>
              <Text style={styles.revenueEyebrow}>REVENUE OVERVIEW</Text>
              <View style={styles.revenueRow}>
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueAmount}>
                    {invoices.length > 0
                      ? `₹${Math.round(invoices.reduce((s, i) => s + (i.amount || 0), 0) / 100000 * 10) / 10}L`
                      : '₹0'}
                  </Text>
                  <Text style={styles.revenueLabel}>Earned</Text>
                </View>
                <View style={styles.revenueDivider} />
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueAmount}>
                    {pendingBookings.length > 0
                      ? `₹${Math.round(pendingBookings.reduce((s, b) => s + (b.token_amount || 0), 0) / 100000 * 10) / 10}L`
                      : '₹0'}
                  </Text>
                  <Text style={styles.revenueLabel}>In Escrow</Text>
                </View>
                <View style={styles.revenueDivider} />
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueAmount}>{confirmedBookings.length || 0}</Text>
                  <Text style={styles.revenueLabel}>Confirmed</Text>
                </View>
              </View>
            </View>

            <View style={styles.spotlightCard}>
              <View style={styles.spotlightHeader}>
                <Feather name="star" size={13} color="#C9A84C" />
                <Text style={styles.spotlightTitle}>Spotlight Score</Text>
                <View style={styles.spotlightRankBadge}>
                  <Text style={styles.spotlightRankText}>#3 This Month</Text>
                </View>
              </View>
              <Text style={styles.spotlightScore}>2,847</Text>
              <View style={styles.spotlightBreakdown}>
                <View style={styles.spotlightItem}>
                  <Text style={styles.spotlightItemNum}>140</Text>
                  <Text style={styles.spotlightItemLbl}>Saves x3</Text>
                </View>
                <View style={styles.spotlightDivider} />
                <View style={styles.spotlightItem}>
                  <Text style={styles.spotlightItemNum}>57</Text>
                  <Text style={styles.spotlightItemLbl}>Enquiries x5</Text>
                </View>
                <View style={styles.spotlightDivider} />
                <View style={styles.spotlightItem}>
                  <Text style={styles.spotlightItemNum}>12</Text>
                  <Text style={styles.spotlightItemLbl}>Bookings x10</Text>
                </View>
              </View>
              <Text style={styles.spotlightHint}>Refreshes 1st of every month. Earned, not bought.</Text>
            </View>

            {pendingBookings.length > 0 && (
              <View style={styles.alertCard}>
                <View style={styles.alertRow}>
                  <Feather name="zap" size={14} color="#C9A84C" />
                  <Text style={styles.alertTitle}>{pendingBookings.length} booking{pendingBookings.length > 1 ? 's' : ''} waiting</Text>
                </View>
                <Text style={styles.alertText}>Confirm within 48 hours or token is auto-refunded</Text>
                <TouchableOpacity onPress={() => setActiveTab('Inquiries')}>
                  <Text style={styles.alertLink}>Review now →</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.planCard}>
              <View style={styles.planLeft}>
                <Text style={styles.planName}>{vendorPlan === 'premium' ? 'Premium Plan' : 'Basic Plan'}</Text>
                <Text style={styles.planDetail}>{vendorPlan === 'premium' ? 'Priority placement · Verified Elite eligible' : 'Upgrade for priority placement'}</Text>
              </View>
              <View style={[styles.planBadge, vendorPlan === 'premium' && styles.planBadgeElite]}>
                <Text style={styles.planBadgeText}>{vendorPlan === 'premium' ? '★ Elite' : '✓ Active'}</Text>
              </View>
            </View>

            {vendorPlan !== 'premium' && (
              <View style={styles.upgradeCard}>
                <View style={styles.upgradeRow}>
                  <Feather name="trending-up" size={16} color="#C9A84C" />
                  <Text style={styles.upgradeTitle}>Unlock Verified Elite</Text>
                </View>
                <Text style={styles.upgradeText}>Priority placement in swipe deck, Elite badge and competitor benchmarking.</Text>
                <TouchableOpacity style={styles.upgradeBtn}>
                  <Text style={styles.upgradeBtnText}>UPGRADE TO PREMIUM</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.benchmarkCard}>
              <View style={styles.benchmarkHeader}>
                <Feather name="bar-chart-2" size={13} color="#C9A84C" />
                <Text style={styles.benchmarkTitle}>Market Benchmark</Text>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDotSmall} />
                  <Text style={styles.liveBadgeText}>Live</Text>
                </View>
              </View>
              {benchmark ? (
                <>
                  <Text style={styles.benchmarkText}>
                    Average starting price for {vendorCategory} in {vendorCity} is ₹{benchmark.avgStartingPrice?.toLocaleString('en-IN')} across {benchmark.vendorCount} vendors.
                  </Text>
                  <Text style={styles.benchmarkRange}>
                    Range: ₹{benchmark.minStartingPrice?.toLocaleString('en-IN')} – ₹{benchmark.maxStartingPrice?.toLocaleString('en-IN')}
                  </Text>
                </>
              ) : (
                <Text style={styles.benchmarkText}>Loading market data...</Text>
              )}
            </View>

            <View style={styles.actionGrid}>
              {[
                { num: String(pendingBookings.length || 3), lbl: 'Pending\nBookings', tab: 'Inquiries' },
                { num: String(blockedDates.length || 4), lbl: 'Blocked\nDates', tab: 'Calendar' },
                { num: '★ 4.9', lbl: 'Your\nRating', tab: 'Reviews' },
                { num: String(clients.length), lbl: 'My\nClients', tab: 'Clients' },
              ].map(a => (
                <TouchableOpacity key={a.lbl} style={styles.actionCard} onPress={() => setActiveTab(a.tab)}>
                  <Text style={styles.actionNumber}>{a.num}</Text>
                  <Text style={styles.actionLabel}>{a.lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.previewBtn} onPress={() => router.push('/vendor-preview')}>
              <Feather name="eye" size={13} color="#C9A84C" />
              <Text style={styles.previewBtnText}>Preview your profile as couples see it</Text>
            </TouchableOpacity>

            <View style={styles.comingSoonSection}>
              <Text style={styles.comingSoonHeader}>Coming in Build 2</Text>
              <LockedFeature icon="check-square" title="Team Task Board" desc="Assign tasks to your team per event. No more WhatsApp coordination chaos." build="Build 2" />
              <LockedFeature icon="clock" title="Day-of Runsheet" desc="Digital running order shared with your full team in real time." build="Build 2" />
              <LockedFeature icon="activity" title="Performance Analytics" desc="Conversion rates, seasonal demand curves and pricing intelligence." build="Build 3" />
            </View>
          </View>
        )}

        {/* ════════════════════════════════
            INQUIRIES TAB
        ════════════════════════════════ */}
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
                        <Text style={styles.bookingMeta}>Token: ₹{booking.token_amount?.toLocaleString('en-IN')} · Protection: ₹999</Text>
                        <Text style={styles.bookingMeta}>Booked: {new Date(booking.created_at).toLocaleDateString('en-IN')}</Text>
                      </View>
                      <View style={styles.escrowBadge}>
                        <Text style={styles.escrowBadgeText}>In Escrow</Text>
                      </View>
                    </View>
                    <View style={styles.bookingActions}>
                      <TouchableOpacity style={styles.declineBtn} onPress={() => handleDeclineBooking(booking.id)}>
                        <Text style={styles.declineBtnText}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.confirmBtn} onPress={() => handleConfirmBooking(booking.id)}>
                        <Text style={styles.confirmBtnText}>CONFIRM & LOCK DATE</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Reply Templates */}
            <Text style={styles.sectionLabel}>Quick Reply Templates</Text>
            <View style={styles.listCard}>
              {REPLY_TEMPLATES.map((template, index) => (
                <View key={template.id}>
                  <View style={styles.templateRow}>
                    <View style={styles.templateInfo}>
                      <Text style={styles.templateLabel}>{template.label}</Text>
                      <Text style={styles.templatePreview} numberOfLines={1}>{template.message}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.templateCopyBtn}
                      onPress={() => {
                        Alert.alert(
                          template.label,
                          template.message,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Send via WhatsApp', onPress: () => {
                                Linking.openURL(`whatsapp://send?text=${encodeURIComponent(template.message)}`);
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <Feather name="send" size={13} color="#C9A84C" />
                    </TouchableOpacity>
                  </View>
                  {index < REPLY_TEMPLATES.length - 1 && <View style={styles.listDivider} />}
                </View>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Lead Pipeline</Text>
            {leadsLoading ? (
              <ActivityIndicator color="#C9A84C" style={{ paddingVertical: 20 }} />
            ) : (
              <View style={styles.listCard}>
                {displayLeads.map((lead: any, index: number) => (
                  <View key={lead.id}>
                    <View style={styles.leadRow}>
                      <View style={styles.leadInfo}>
                        <Text style={styles.leadName}>{lead.name}</Text>
                        <Text style={styles.leadDate}>{lead.date}</Text>
                      </View>
                      <View style={styles.leadRight}>
                        <Text style={styles.leadValue}>{lead.value}</Text>
                        <View style={[styles.stageBadge, { backgroundColor: (STAGE_COLORS[lead.stage] || '#8C7B6E') + '20' }]}>
                          <Text style={[styles.stageBadgeText, { color: STAGE_COLORS[lead.stage] || '#8C7B6E' }]}>{lead.stage}</Text>
                        </View>
                      </View>
                    </View>
                    {index < displayLeads.length - 1 && <View style={styles.listDivider} />}
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.sectionLabel}>Incoming Enquiries</Text>
            {MOCK_INQUIRIES.map(inquiry => (
              <View key={inquiry.id} style={styles.inquiryCard}>
                <View style={styles.inquiryTop}>
                  <View>
                    <Text style={styles.inquiryName}>{inquiry.name}</Text>
                    <Text style={styles.inquiryMeta}>{inquiry.function} · {inquiry.date}</Text>
                  </View>
                  <View style={[styles.inquiryBadge, { backgroundColor: inquiry.status === 'new' ? '#C9A84C20' : '#E8E0D5' }]}>
                    <Text style={[styles.inquiryBadgeText, { color: inquiry.status === 'new' ? '#C9A84C' : '#8C7B6E' }]}>
                      {inquiry.status === 'new' ? 'New' : 'Replied'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.inquiryMessage} numberOfLines={2}>"{inquiry.message}"</Text>
                {inquiry.status === 'new' && (
                  <TouchableOpacity style={styles.replyBtn} onPress={() => router.push('/messaging')}>
                    <Text style={styles.replyBtnText}>Reply</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <Text style={styles.sectionLabel}>Coming in Build 2</Text>
            <LockedFeature icon="file-text" title="Client Approval Workflows" desc="Submit mood boards and design concepts for couple approval. Full audit trail." build="Build 2" />
            <LockedFeature icon="message-square" title="Vendor-to-Vendor Messaging" desc="Message the photographer, decorator and caterer booked on the same wedding." build="Build 2" />
          </View>
        )}

        {/* ════════════════════════════════
            CALENDAR TAB
        ════════════════════════════════ */}
        {activeTab === 'Calendar' && (
          <View style={styles.tabPane}>
            <Text style={styles.sectionLabel}>Availability</Text>
            <Text style={styles.calendarHint}>Block dates you're already booked. Confirmed bookings are shown automatically.</Text>

            {/* Confirmed bookings on calendar */}
            {confirmedBookings.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Confirmed Bookings</Text>
                <View style={styles.listCard}>
                  {confirmedBookings.map((booking: any, index: number) => (
                    <View key={booking.id}>
                      <View style={styles.blockedRow}>
                        <View style={styles.blockedDateRow}>
                          <Feather name="check-circle" size={13} color="#C9A84C" />
                          <View>
                            <Text style={styles.blockedDate}>{booking.users?.name || 'Couple'}</Text>
                            <Text style={styles.confirmedMeta}>Confirmed · ₹{(booking.token_amount || 10000).toLocaleString('en-IN')} token</Text>
                          </View>
                        </View>
                        <View style={styles.confirmedBadge}>
                          <Text style={styles.confirmedBadgeText}>Locked</Text>
                        </View>
                      </View>
                      {index < confirmedBookings.length - 1 && <View style={styles.listDivider} />}
                    </View>
                  ))}
                </View>
              </>
            )}

            {calendarLoading ? (
              <ActivityIndicator color="#C9A84C" style={{ paddingVertical: 20 }} />
            ) : (
              <View style={styles.listCard}>
                <View style={styles.blockedHeader}>
                  <Text style={styles.blockedTitle}>Blocked Dates ({blockedDates.length})</Text>
                </View>
                {blockedDates.length === 0 && (
                  <View style={{ padding: 16 }}>
                    <Text style={styles.emptyText}>No dates blocked yet</Text>
                  </View>
                )}
                {blockedDates.map((item, index) => (
                  <View key={item.id}>
                    <View style={styles.blockedRow}>
                      <View style={styles.blockedDateRow}>
                        <Feather name="calendar" size={13} color="#8C7B6E" />
                        <Text style={styles.blockedDate}>{item.blocked_date}</Text>
                      </View>
                      <TouchableOpacity style={styles.unblockBtn} onPress={() => handleUnblockDate(item.id)}>
                        <Text style={styles.unblockBtnText}>Unblock</Text>
                      </TouchableOpacity>
                    </View>
                    {index < blockedDates.length - 1 && <View style={styles.listDivider} />}
                  </View>
                ))}
              </View>
            )}

            {showDateInput ? (
              <View style={styles.listCard}>
                <View style={{ padding: 16, gap: 10 }}>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Date (e.g. March 15, 2026)"
                    placeholderTextColor="#8C7B6E"
                    value={newBlockDate}
                    onChangeText={setNewBlockDate}
                  />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={[styles.unblockBtn, { flex: 1, alignItems: 'center' }]} onPress={() => setShowDateInput(false)}>
                      <Text style={styles.unblockBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.goldBtn, { flex: 2 }]} onPress={handleBlockDate}>
                      <Text style={styles.goldBtnText}>BLOCK DATE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.goldOutlineBtn} onPress={() => setShowDateInput(true)}>
                <Feather name="plus" size={14} color="#C9A84C" />
                <Text style={styles.goldOutlineBtnText}>Block a Date</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionLabel}>Coming in Build 2</Text>
            <LockedFeature icon="clock" title="Day-of Runsheet" desc="Build a running order shared with your full team in real time." build="Build 2" />
            <LockedFeature icon="list" title="Checklist Templates" desc="Category-specific pre-wedding checklists that auto-attach to every new booking." build="Build 2" />
          </View>
        )}

        {/* ════════════════════════════════
            TOOLS TAB
        ════════════════════════════════ */}
        {activeTab === 'Tools' && (
          <View style={styles.tabPane}>
            <Text style={styles.sectionLabel}>Live Tools</Text>

            {/* Promo Engine */}
            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <View style={styles.toolTitleRow}>
                  <View style={styles.toolIconBox}>
                    <Feather name="zap" size={14} color="#C9A84C" />
                  </View>
                  <Text style={styles.toolTitle}>Promo Engine</Text>
                </View>
                <TouchableOpacity style={styles.toolActionBtn} onPress={() => setShowPromoForm(true)}>
                  <Text style={styles.toolActionText}>+ Create</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>Run time-limited offers. Couples in your city get notified instantly.</Text>
              {promos.map((promo, index) => (
                <View key={promo.id}>
                  {index > 0 && <View style={styles.listDivider} />}
                  <View style={styles.promoRow}>
                    <View style={styles.promoInfo}>
                      <Text style={styles.promoTitle}>{promo.title}</Text>
                      <Text style={styles.promoMeta}>Expires {promo.expires} · {promo.leads} leads</Text>
                    </View>
                    <View style={[styles.promoBadge, { backgroundColor: promo.active ? '#4CAF5020' : '#E8E0D5' }]}>
                      <Text style={[styles.promoBadgeText, { color: promo.active ? '#4CAF50' : '#8C7B6E' }]}>
                        {promo.active ? 'Live' : 'Ended'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Portfolio */}
            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <View style={styles.toolTitleRow}>
                  <View style={styles.toolIconBox}>
                    <Feather name="image" size={14} color="#C9A84C" />
                  </View>
                  <Text style={styles.toolTitle}>Portfolio Photos</Text>
                </View>
                <TouchableOpacity style={styles.toolActionBtn} onPress={handleImageUpload} disabled={uploadingImage}>
                  {uploadingImage
                    ? <ActivityIndicator size="small" color="#C9A84C" />
                    : <Text style={styles.toolActionText}>+ Upload</Text>
                  }
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>Upload photos to your public portfolio. Basic: 10 photos · Premium: 30 · Elite: Unlimited.</Text>
              {portfolioImages.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {portfolioImages.map((uri, index) => (
                    <Image key={index} source={{ uri }} style={{ width: 80, height: 80, borderRadius: 8, marginRight: 8 }} />
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Invoice Generator — upgraded */}
            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <View style={styles.toolTitleRow}>
                  <View style={styles.toolIconBox}>
                    <Feather name="file-text" size={14} color="#C9A84C" />
                  </View>
                  <Text style={styles.toolTitle}>Invoice Generator</Text>
                </View>
                <TouchableOpacity style={styles.toolActionBtn} onPress={() => setShowInvoiceForm(!showInvoiceForm)}>
                  <Text style={styles.toolActionText}>{showInvoiceForm ? 'Cancel' : 'Create'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>Professional invoices with auto GST calculation. Saved to your account and linked to TDS records.</Text>
              {showInvoiceForm && (
                <View style={styles.invoiceForm}>
                  <TextInput style={styles.fieldInput} placeholder="Client name" placeholderTextColor="#8C7B6E" value={invoiceClient} onChangeText={setInvoiceClient} />
                  <TextInput style={styles.fieldInput} placeholder="Client phone (optional)" placeholderTextColor="#8C7B6E" value={invoicePhone} onChangeText={setInvoicePhone} keyboardType="phone-pad" />
                  <TextInput style={styles.fieldInput} placeholder="Description (e.g. Wedding Photography)" placeholderTextColor="#8C7B6E" value={invoiceDesc} onChangeText={setInvoiceDesc} />
                  <TextInput style={styles.fieldInput} placeholder="Amount (₹)" placeholderTextColor="#8C7B6E" value={invoiceAmount} onChangeText={setInvoiceAmount} keyboardType="number-pad" />

                  {invoiceAmount ? (
                    <View style={styles.gstPreview}>
                      <Text style={styles.gstPreviewText}>GST (18%): ₹{(parseInt(invoiceAmount) * 0.18).toLocaleString('en-IN')}</Text>
                      <Text style={styles.gstPreviewTotal}>Total: ₹{(parseInt(invoiceAmount) * 1.18).toLocaleString('en-IN')}</Text>
                    </View>
                  ) : null}

                  {/* TDS Toggle */}
                  <View style={styles.tdsToggleRow}>
                    <View style={styles.tdsToggleInfo}>
                      <Text style={styles.tdsToggleLabel}>TDS Applicable (10%)</Text>
                      <Text style={styles.tdsToggleHint}>Is TDS deductible on this invoice?</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.toggle, invoiceTDSApplicable && styles.toggleActive]}
                      onPress={() => setInvoiceTDSApplicable(!invoiceTDSApplicable)}
                    >
                      <View style={[styles.toggleKnob, invoiceTDSApplicable && styles.toggleKnobActive]} />
                    </TouchableOpacity>
                  </View>

                  {invoiceTDSApplicable && (
                    <>
                      {invoiceAmount ? (
                        <View style={[styles.gstPreview, { backgroundColor: '#F0F7F0' }]}>
                          <Text style={[styles.gstPreviewText, { color: '#2D6A4F' }]}>TDS (10%): ₹{(parseInt(invoiceAmount) * 0.10).toLocaleString('en-IN')}</Text>
                          <Text style={[styles.gstPreviewTotal, { color: '#2D6A4F' }]}>You receive: ₹{(parseInt(invoiceAmount) * 0.90).toLocaleString('en-IN')}</Text>
                        </View>
                      ) : null}
                      <View style={styles.tdsToggleRow}>
                        <View style={styles.tdsToggleInfo}>
                          <Text style={styles.tdsToggleLabel}>Client deducted TDS</Text>
                          <Text style={styles.tdsToggleHint}>Did the client already deduct TDS?</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.toggle, invoiceTDSDeductedByClient && styles.toggleActive]}
                          onPress={() => setInvoiceTDSDeductedByClient(!invoiceTDSDeductedByClient)}
                        >
                          <View style={[styles.toggleKnob, invoiceTDSDeductedByClient && styles.toggleKnobActive]} />
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  <TouchableOpacity style={styles.goldBtn} onPress={handleGenerateInvoice}>
                    <Text style={styles.goldBtnText}>GENERATE & SAVE INVOICE</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Invoice History */}
            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <View style={styles.toolTitleRow}>
                  <View style={styles.toolIconBox}>
                    <Feather name="list" size={14} color="#C9A84C" />
                  </View>
                  <Text style={styles.toolTitle}>Invoice History</Text>
                </View>
                <TouchableOpacity style={styles.toolActionBtn} onPress={() => setShowInvoiceHistory(!showInvoiceHistory)}>
                  <Text style={styles.toolActionText}>{showInvoiceHistory ? 'Hide' : 'Show All'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>All invoices — app bookings and independent clients. Tap to mark as paid.</Text>
              {showInvoiceHistory && (
                <View style={{ gap: 0 }}>
                  {invoices.length === 0 ? (
                    <Text style={styles.emptyText}>No invoices yet. Create your first invoice above.</Text>
                  ) : (
                    invoices.map((inv: any, index: number) => (
                      <View key={inv.id}>
                        <View style={styles.invoiceHistoryRow}>
                          <View style={{ flex: 1, gap: 3 }}>
                            <Text style={styles.invoiceHistoryClient}>{inv.client_name || 'Client'}</Text>
                            <Text style={styles.invoiceHistoryMeta}>
                              {inv.invoice_number || 'INV'} · {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-IN') : ''}
                            </Text>
                            {inv.description ? <Text style={styles.invoiceHistoryDesc} numberOfLines={1}>{inv.description}</Text> : null}
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 6 }}>
                            <Text style={styles.invoiceHistoryAmount}>Rs.{(inv.total_amount || inv.amount || 0).toLocaleString('en-IN')}</Text>
                            <TouchableOpacity
                              style={[styles.invoiceStatusBtn, { backgroundColor: inv.status === 'paid' ? '#4CAF5020' : '#FFF8EC', borderColor: inv.status === 'paid' ? '#4CAF50' : '#C9A84C' }]}
                              onPress={() => inv.status !== 'paid' && handleMarkInvoicePaid(inv.id)}
                              disabled={inv.status === 'paid' || updatingInvoiceId === inv.id}
                            >
                              {updatingInvoiceId === inv.id ? (
                                <ActivityIndicator size="small" color="#C9A84C" />
                              ) : (
                                <Text style={[styles.invoiceStatusText, { color: inv.status === 'paid' ? '#4CAF50' : '#C9A84C' }]}>
                                  {inv.status === 'paid' ? 'Paid' : 'Mark Paid'}
                                </Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                        {index < invoices.length - 1 && <View style={styles.listDivider} />}
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>

            {/* GST Report */}
            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <View style={styles.toolTitleRow}>
                  <View style={styles.toolIconBox}>
                    <Feather name="percent" size={14} color="#C9A84C" />
                  </View>
                  <Text style={styles.toolTitle}>GST Autopilot</Text>
                </View>
                <TouchableOpacity style={styles.toolActionBtn} onPress={handleDownloadGSTReport}>
                  <Text style={styles.toolActionText}>Download PDF</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>CA-ready annual GST summary. One tap to generate and share.</Text>
              <View style={styles.gstRow}>
                {[
                  { amt: invoices.length > 0 ? `₹${invoices.reduce((s: number, i: any) => s + (i.amount || 0), 0).toLocaleString('en-IN')}` : '₹0', lbl: 'Total Income' },
                  { amt: invoices.length > 0 ? `₹${invoices.reduce((s: number, i: any) => s + (i.gst_amount || 0), 0).toLocaleString('en-IN')}` : '₹0', lbl: 'GST (18%)' },
                  { amt: `FY ${new Date().getFullYear()}`, lbl: 'Period' },
                ].map((g) => (
                  <View key={g.lbl} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <Text style={styles.gstAmount}>{g.amt}</Text>
                    <Text style={styles.gstLabel}>{g.lbl}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Payment Tracker */}
            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <View style={styles.toolTitleRow}>
                  <View style={styles.toolIconBox}>
                    <Feather name="credit-card" size={14} color="#C9A84C" />
                  </View>
                  <Text style={styles.toolTitle}>Payment Tracker</Text>
                </View>
              </View>
              <Text style={styles.toolDesc}>Track all incoming payments and pending amounts.</Text>
              <View style={styles.gstRow}>
                {[
                  {
                    amt: invoices.length > 0
                      ? `₹${invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (i.amount || 0), 0).toLocaleString('en-IN')}`
                      : '₹0',
                    lbl: 'Received',
                    color: '#2C2420',
                  },
                  {
                    amt: pendingBookings.length > 0
                      ? `₹${pendingBookings.reduce((s: any, b: any) => s + (b.token_amount || 0), 0).toLocaleString('en-IN')}`
                      : '₹0',
                    lbl: 'In Escrow',
                    color: '#C9A84C',
                  },
                  {
                    amt: String(confirmedBookings.length),
                    lbl: 'Confirmed',
                    color: '#4CAF50',
                  },
                ].map((p) => (
                  <View key={p.lbl} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <Text style={[styles.gstAmount, { color: p.color }]}>{p.amt}</Text>
                    <Text style={styles.gstLabel}>{p.lbl}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Contract Generator */}
            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <View style={styles.toolTitleRow}>
                  <View style={styles.toolIconBox}>
                    <Feather name="file-text" size={14} color="#C9A84C" />
                  </View>
                  <Text style={styles.toolTitle}>Contract Generator</Text>
                </View>
                <TouchableOpacity style={styles.toolActionBtn} onPress={() => setShowContractForm(!showContractForm)}>
                  <Text style={styles.toolActionText}>{showContractForm ? 'Cancel' : 'Create'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>Professional service agreements for any client. Generated as PDF — share via WhatsApp instantly.</Text>
              {showContractForm && (
                <View style={styles.invoiceForm}>
                  <TextInput style={styles.fieldInput} placeholder="Client name" placeholderTextColor="#8C7B6E" value={contractClient} onChangeText={setContractClient} />
                  <TextInput style={styles.fieldInput} placeholder="Client phone (optional)" placeholderTextColor="#8C7B6E" value={contractPhone} onChangeText={setContractPhone} keyboardType="phone-pad" />
                  <TextInput style={styles.fieldInput} placeholder="Event type (e.g. Wedding, Sangeet)" placeholderTextColor="#8C7B6E" value={contractEventType} onChangeText={setContractEventType} />
                  <TextInput style={styles.fieldInput} placeholder="Event date (e.g. March 15, 2026)" placeholderTextColor="#8C7B6E" value={contractEventDate} onChangeText={setContractEventDate} />
                  <TextInput style={styles.fieldInput} placeholder="Venue (optional)" placeholderTextColor="#8C7B6E" value={contractVenue} onChangeText={setContractVenue} />
                  <TextInput style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]} placeholder="Services description" placeholderTextColor="#8C7B6E" value={contractServices} onChangeText={setContractServices} multiline />
                  <TextInput style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]} placeholder="Deliverables (e.g. 500 edited photos, 2 highlight reels)" placeholderTextColor="#8C7B6E" value={contractDeliverables} onChangeText={setContractDeliverables} multiline />
                  <TextInput style={styles.fieldInput} placeholder="Total amount (Rs.)" placeholderTextColor="#8C7B6E" value={contractTotal} onChangeText={setContractTotal} keyboardType="number-pad" />
                  <TextInput style={styles.fieldInput} placeholder="Advance / token amount (Rs.)" placeholderTextColor="#8C7B6E" value={contractAdvance} onChangeText={setContractAdvance} keyboardType="number-pad" />
                  {contractTotal && contractAdvance ? (
                    <View style={styles.gstPreview}>
                      <Text style={styles.gstPreviewText}>Balance due: Rs.{(parseInt(contractTotal) - parseInt(contractAdvance)).toLocaleString('en-IN')}</Text>
                    </View>
                  ) : null}
                  <TextInput style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]} placeholder="Cancellation policy" placeholderTextColor="#8C7B6E" value={contractCancellation} onChangeText={setContractCancellation} multiline />
                  <TouchableOpacity style={styles.goldBtn} onPress={handleGenerateContract}>
                    <Feather name="file-text" size={14} color="#2C2420" />
                    <Text style={styles.goldBtnText}>GENERATE CONTRACT PDF</Text>
                  </TouchableOpacity>
                </View>
              )}
              {contracts.length > 0 && (
                <View style={{ gap: 0, borderTopWidth: 1, borderTopColor: '#E8E0D5', marginTop: 4 }}>
                  {contracts.slice(0, 3).map((contract: any, index: number) => (
                    <View key={contract.id}>
                      <View style={styles.invoiceHistoryRow}>
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text style={styles.invoiceHistoryClient}>{contract.client_name}</Text>
                          <Text style={styles.invoiceHistoryMeta}>{contract.event_type} · {contract.event_date}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <Text style={styles.invoiceHistoryAmount}>Rs.{(contract.total_amount || 0).toLocaleString('en-IN')}</Text>
                          <View style={[styles.invoiceStatusBtn, { backgroundColor: '#C9A84C20', borderColor: '#C9A84C' }]}>
                            <Text style={[styles.invoiceStatusText, { color: '#C9A84C' }]}>Issued</Text>
                          </View>
                        </View>
                      </View>
                      {index < contracts.slice(0, 3).length - 1 && <View style={styles.listDivider} />}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Payment Schedule Tracker */}
            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <View style={styles.toolTitleRow}>
                  <View style={styles.toolIconBox}>
                    <Feather name="calendar" size={14} color="#C9A84C" />
                  </View>
                  <Text style={styles.toolTitle}>Payment Schedule</Text>
                </View>
                <TouchableOpacity style={styles.toolActionBtn} onPress={() => setShowPaymentForm(!showPaymentForm)}>
                  <Text style={styles.toolActionText}>{showPaymentForm ? 'Cancel' : 'Create'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>Track token, advance and final payments per client. Mark instalments paid with one tap.</Text>
              {showPaymentForm && (
                <View style={styles.invoiceForm}>
                  <TextInput style={styles.fieldInput} placeholder="Client name" placeholderTextColor="#8C7B6E" value={paymentClient} onChangeText={setPaymentClient} />
                  <TextInput style={styles.fieldInput} placeholder="Client phone (optional)" placeholderTextColor="#8C7B6E" value={paymentPhone} onChangeText={setPaymentPhone} keyboardType="phone-pad" />
                  <TextInput style={styles.fieldInput} placeholder="Total booking amount (Rs.)" placeholderTextColor="#8C7B6E" value={paymentTotal} onChangeText={setPaymentTotal} keyboardType="number-pad" />
                  <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Payment Instalments</Text>
                  {paymentInstalments.map((inst, index) => (
                    <View key={index} style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        style={[styles.fieldInput, { flex: 1 }]}
                        placeholder={`${inst.label} amount`}
                        placeholderTextColor="#8C7B6E"
                        value={inst.amount}
                        onChangeText={(text) => {
                          const updated = [...paymentInstalments];
                          updated[index] = { ...updated[index], amount: text };
                          setPaymentInstalments(updated);
                        }}
                        keyboardType="number-pad"
                      />
                      <TextInput
                        style={[styles.fieldInput, { flex: 1 }]}
                        placeholder="Due date"
                        placeholderTextColor="#8C7B6E"
                        value={inst.due_date}
                        onChangeText={(text) => {
                          const updated = [...paymentInstalments];
                          updated[index] = { ...updated[index], due_date: text };
                          setPaymentInstalments(updated);
                        }}
                      />
                    </View>
                  ))}
                  <TouchableOpacity style={styles.goldBtn} onPress={handleSavePaymentSchedule}>
                    <Text style={styles.goldBtnText}>SAVE SCHEDULE</Text>
                  </TouchableOpacity>
                </View>
              )}
              {paymentSchedules.length > 0 && (
                <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: '#E8E0D5', paddingTop: 12, marginTop: 4 }}>
                  {paymentSchedules.map((schedule: any) => (
                    <View key={schedule.id} style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.invoiceHistoryClient}>{schedule.client_name}</Text>
                        <Text style={styles.invoiceHistoryAmount}>Rs.{(schedule.total_amount || 0).toLocaleString('en-IN')}</Text>
                      </View>
                      {(schedule.instalments || []).map((inst: any, idx: number) => (
                        <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 8 }}>
                          <View style={{ gap: 2 }}>
                            <Text style={styles.tdsLedgerType}>{inst.label}</Text>
                            <Text style={styles.tdsLedgerDate}>{inst.due_date || 'No date set'} · Rs.{parseInt(inst.amount || '0').toLocaleString('en-IN')}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {!inst.paid && schedule.client_phone ? (
                              <TouchableOpacity
                                style={[styles.invoiceStatusBtn, { backgroundColor: '#25D36620', borderColor: '#25D366', minWidth: 60 }]}
                                onPress={() => {
                                  const vendorName = vendorSession?.vendorName || 'Your Vendor';
                                  const amount = parseInt(inst.amount || '0').toLocaleString('en-IN');
                                  const message = `Hi ${schedule.client_name}! 👋\n\nThis is a friendly reminder that your *${inst.label}* payment of *Rs.${amount}* was due on *${inst.due_date}*.\n\nRequest you to please transfer at your earliest convenience.\n\nThank you!\n— ${vendorName}\n📱 The Dream Wedding`;
                                  Linking.openURL(`whatsapp://send?phone=91${schedule.client_phone}&text=${encodeURIComponent(message)}`);
                                }}
                              >
                                <Text style={[styles.invoiceStatusText, { color: '#25D366' }]}>Remind</Text>
                              </TouchableOpacity>
                            ) : null}
                            <TouchableOpacity
                              style={[styles.invoiceStatusBtn, { backgroundColor: inst.paid ? '#4CAF5020' : '#FFF8EC', borderColor: inst.paid ? '#4CAF50' : '#C9A84C' }]}
                              onPress={() => !inst.paid && handleMarkInstalmentPaid(schedule.id, idx)}
                              disabled={inst.paid}
                            >
                              <Text style={[styles.invoiceStatusText, { color: inst.paid ? '#4CAF50' : '#C9A84C' }]}>
                                {inst.paid ? 'Paid' : 'Mark Paid'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                      <View style={styles.listDivider} />
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Expense Tracker */}
            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <View style={styles.toolTitleRow}>
                  <View style={styles.toolIconBox}>
                    <Feather name="minus-circle" size={14} color="#C9A84C" />
                  </View>
                  <Text style={styles.toolTitle}>Expense Tracker</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={styles.toolActionBtn} onPress={handleExportExpenses}>
                    <Text style={styles.toolActionText}>Export</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.toolActionBtn} onPress={() => setShowExpenseForm(!showExpenseForm)}>
                    <Text style={styles.toolActionText}>{showExpenseForm ? 'Cancel' : '+ Add'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.toolDesc}>Track travel, equipment, editing and other costs per booking. Know your actual profit margin.</Text>
              {showExpenseForm && (
                <View style={styles.invoiceForm}>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {['Travel', 'Equipment', 'Editing', 'Assistant', 'Food', 'Other'].map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.segmentBtn, expenseCategory === cat && styles.segmentBtnActive]}
                        onPress={() => setExpenseCategory(cat)}
                      >
                        <Text style={[styles.segmentBtnText, expenseCategory === cat && styles.segmentBtnTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput style={styles.fieldInput} placeholder="Description" placeholderTextColor="#8C7B6E" value={expenseDesc} onChangeText={setExpenseDesc} />
                  <TextInput style={styles.fieldInput} placeholder="Amount (Rs.)" placeholderTextColor="#8C7B6E" value={expenseAmount} onChangeText={setExpenseAmount} keyboardType="number-pad" />
                  <TextInput style={styles.fieldInput} placeholder="Client name (optional)" placeholderTextColor="#8C7B6E" value={expenseClient} onChangeText={setExpenseClient} />
                  <TouchableOpacity style={styles.goldBtn} onPress={handleAddExpense}>
                    <Text style={styles.goldBtnText}>SAVE EXPENSE</Text>
                  </TouchableOpacity>
                </View>
              )}
              {expensesLoading ? (
                <ActivityIndicator color="#C9A84C" />
              ) : expenses.length > 0 ? (
                <View style={{ borderTopWidth: 1, borderTopColor: '#E8E0D5', marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#F5F0E8', borderRadius: 8, marginTop: 8 }}>
                    <Text style={styles.tdsBreakdownLabel}>Total Expenses</Text>
                    <Text style={[styles.invoiceHistoryAmount, { color: '#C9A84C' }]}>
                      Rs.{expenses.reduce((s, e) => s + (e.amount || 0), 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  {expenses.slice(0, 5).map((exp: any, index: number) => (
                    <View key={exp.id}>
                      <View style={styles.invoiceHistoryRow}>
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text style={styles.invoiceHistoryClient}>{exp.description}</Text>
                          <Text style={styles.invoiceHistoryMeta}>{exp.category} · {exp.expense_date}</Text>
                          {exp.client_name ? <Text style={styles.invoiceHistoryDesc}>{exp.client_name}</Text> : null}
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          <Text style={[styles.invoiceHistoryAmount, { color: '#B5303A' }]}>
                            -Rs.{(exp.amount || 0).toLocaleString('en-IN')}
                          </Text>
                          <TouchableOpacity onPress={() => handleDeleteExpense(exp.id)}>
                            <Feather name="trash-2" size={13} color="#8C7B6E" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {index < expenses.slice(0, 5).length - 1 && <View style={styles.listDivider} />}
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {/* Team Management */}
            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <View style={styles.toolTitleRow}>
                  <View style={styles.toolIconBox}>
                    <Feather name="users" size={14} color="#C9A84C" />
                  </View>
                  <Text style={styles.toolTitle}>My Team</Text>
                </View>
                <TouchableOpacity style={styles.toolActionBtn} onPress={() => setShowTeamForm(!showTeamForm)}>
                  <Text style={styles.toolActionText}>{showTeamForm ? 'Cancel' : '+ Add'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>Add your assistants, editors and coordinators. Assign them to bookings in Build 2.</Text>
              {showTeamForm && (
                <View style={styles.invoiceForm}>
                  <TextInput style={styles.fieldInput} placeholder="Name" placeholderTextColor="#8C7B6E" value={teamMemberName} onChangeText={setTeamMemberName} />
                  <TextInput style={styles.fieldInput} placeholder="Phone (optional)" placeholderTextColor="#8C7B6E" value={teamMemberPhone} onChangeText={setTeamMemberPhone} keyboardType="phone-pad" />
                  <TextInput style={styles.fieldInput} placeholder="Role (e.g. Second Shooter, Editor)" placeholderTextColor="#8C7B6E" value={teamMemberRole} onChangeText={setTeamMemberRole} />
                  <TouchableOpacity style={styles.goldBtn} onPress={handleAddTeamMember}>
                    <Text style={styles.goldBtnText}>ADD TEAM MEMBER</Text>
                  </TouchableOpacity>
                </View>
              )}
              {teamLoading ? (
                <ActivityIndicator color="#C9A84C" />
              ) : teamMembers.length === 0 ? (
                <Text style={styles.emptyText}>No team members yet.</Text>
              ) : (
                <View style={{ borderTopWidth: 1, borderTopColor: '#E8E0D5', marginTop: 4 }}>
                  {teamMembers.map((member: any, index: number) => (
                    <View key={member.id}>
                      <View style={styles.invoiceHistoryRow}>
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text style={styles.invoiceHistoryClient}>{member.name}</Text>
                          <Text style={styles.invoiceHistoryMeta}>{member.role}{member.phone ? ` · ${member.phone}` : ''}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                          {member.phone ? (
                            <TouchableOpacity onPress={() => Linking.openURL(`whatsapp://send?phone=91${member.phone}`)}>
                              <Feather name="message-circle" size={16} color="#25D366" />
                            </TouchableOpacity>
                          ) : null}
                          <TouchableOpacity onPress={() => handleRemoveTeamMember(member.id)}>
                            <Feather name="trash-2" size={14} color="#8C7B6E" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {index < teamMembers.length - 1 && <View style={styles.listDivider} />}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Refer a Vendor */}
            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <View style={styles.toolTitleRow}>
                  <View style={styles.toolIconBox}>
                    <Feather name="share-2" size={14} color="#C9A84C" />
                  </View>
                  <Text style={styles.toolTitle}>Refer a Vendor</Text>
                </View>
                <TouchableOpacity style={styles.toolActionBtn} onPress={() => {
                  const msg = `Hey! I've been using The Dream Wedding to manage my wedding business — leads, invoices, GST reports. You should check it out!\n\nJoin here: https://thedreamwedding.in/vendor`;
                  Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`);
                }}>
                  <Text style={styles.toolActionText}>Share</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>Refer another vendor and get 1 month subscription free.</Text>
            </View>

            {/* Locked tools */}
            <TouchableOpacity style={styles.toolCard} onPress={() => Alert.alert('WhatsApp Broadcast — Build 2', 'One tap sends a promotional message to all your past clients on WhatsApp simultaneously. Coming in Build 2.')} activeOpacity={0.85}>
              <View style={[styles.toolHeader, { opacity: 0.6 }]}>
                <View style={styles.toolTitleRow}>
                  <View style={[styles.toolIconBox, { borderStyle: 'dashed' }]}>
                    <Feather name="send" size={14} color="#8C7B6E" />
                  </View>
                  <Text style={[styles.toolTitle, { color: '#8C7B6E' }]}>WhatsApp Broadcast</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Feather name="lock" size={10} color="#C9A84C" />
                  <Text style={{ fontSize: 10, color: '#C9A84C', fontFamily: 'DMSans_500Medium' }}>Build 2</Text>
                </View>
              </View>
              <Text style={[styles.toolDesc, { opacity: 0.7 }]}>One tap sends a promo to all past clients on WhatsApp.</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolCard} onPress={() => Alert.alert('Spotlight Auction — Build 2', 'Bid for Spotlight positions 4-10 at ₹999/month. Top 3 are always earned by algorithm — never sold. Coming in Build 2.')} activeOpacity={0.85}>
              <View style={[styles.toolHeader, { opacity: 0.6 }]}>
                <View style={styles.toolTitleRow}>
                  <View style={[styles.toolIconBox, { borderStyle: 'dashed' }]}>
                    <Feather name="trending-up" size={14} color="#8C7B6E" />
                  </View>
                  <Text style={[styles.toolTitle, { color: '#8C7B6E' }]}>Spotlight Auction</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Feather name="lock" size={10} color="#C9A84C" />
                  <Text style={{ fontSize: 10, color: '#C9A84C', fontFamily: 'DMSans_500Medium' }}>Build 2</Text>
                </View>
              </View>
              <Text style={[styles.toolDesc, { opacity: 0.7 }]}>Bid for Spotlight positions 4-10 at ₹999/month.</Text>
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>Coming in Build 2</Text>
            <LockedFeature icon="check-square" title="Team Task Board" desc="Assign tasks to team members per event. Set deadlines, track completion." build="Build 2" />
            <LockedFeature icon="thumbs-up" title="Client Approval Workflows" desc="Send mood boards for couple approval. Full audit trail." build="Build 2" />
            <Text style={styles.sectionLabel}>Coming in Build 3</Text>
            <LockedFeature icon="cpu" title="AI Brief Generation" desc="Auto-generates a structured brief from couple's onboarding data at booking moment." build="Build 3" />
            <LockedFeature icon="bar-chart" title="Full Performance Analytics" desc="Conversion rates, seasonal demand curves, revenue forecasting." build="Build 3" />
          </View>
        )}

        {/* ════════════════════════════════
            TAX & FINANCE TAB
        ════════════════════════════════ */}
        {activeTab === 'Tax & Finance' && (
          <View style={styles.tabPane}>

            {tdsLoading ? (
              <ActivityIndicator color="#C9A84C" style={{ paddingVertical: 40 }} />
            ) : (
              <>
                {/* TDS Summary Card */}
                <View style={styles.revenueCard}>
                  <Text style={styles.revenueEyebrow}>TDS RECONCILIATION · {tdsSummary?.financial_year || `FY ${new Date().getFullYear()}`}</Text>
                  <View style={styles.revenueRow}>
                    <View style={styles.revenueItem}>
                      <Text style={styles.revenueAmount}>
                        ₹{(tdsSummary?.total_gross_income || 0).toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.revenueLabel}>Gross Income</Text>
                    </View>
                    <View style={styles.revenueDivider} />
                    <View style={styles.revenueItem}>
                      <Text style={styles.revenueAmount}>
                        ₹{(tdsSummary?.total_tds_deducted || 0).toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.revenueLabel}>TDS Deducted</Text>
                    </View>
                    <View style={styles.revenueDivider} />
                    <View style={styles.revenueItem}>
                      <Text style={styles.revenueAmount}>
                        ₹{(tdsSummary?.total_net_received || 0).toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.revenueLabel}>Net Received</Text>
                    </View>
                  </View>
                </View>

                {/* TDS Breakdown */}
                <View style={styles.listCard}>
                  <View style={{ padding: 16, gap: 12 }}>
                    <Text style={styles.sectionLabel}>TDS Breakdown</Text>
                    {[
                      { label: 'Platform TDS (auto)', amount: tdsSummary?.platform_tds || 0, color: '#C9A84C', note: 'Deducted at source by The Dream Wedding' },
                      { label: 'Client TDS (declared)', amount: tdsSummary?.client_tds || 0, color: '#4CAF50', note: 'Declared by you as deducted by client' },
                      { label: 'Self-declared TDS', amount: tdsSummary?.self_declared_tds || 0, color: '#8C7B6E', note: 'Manually added entries' },
                    ].map((item, index, arr) => (
                      <View key={item.label}>
                        <View style={styles.tdsBreakdownRow}>
                          <View style={[styles.tdsBreakdownDot, { backgroundColor: item.color }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.tdsBreakdownLabel}>{item.label}</Text>
                            <Text style={styles.tdsBreakdownNote}>{item.note}</Text>
                          </View>
                          <Text style={[styles.tdsBreakdownAmount, { color: item.color }]}>
                            ₹{item.amount.toLocaleString('en-IN')}
                          </Text>
                        </View>
                        {index < arr.length - 1 && <View style={[styles.listDivider, { marginTop: 8 }]} />}
                      </View>
                    ))}
                  </View>
                </View>

                {/* CA Export button */}
                <TouchableOpacity style={styles.goldBtn} onPress={handleExportTDSReport}>
                  <Feather name="download" size={14} color="#2C2420" />
                  <Text style={styles.goldBtnText}>EXPORT FOR CA — PDF</Text>
                </TouchableOpacity>

                {/* Add manual TDS entry */}
                <View style={styles.toolCard}>
                  <View style={styles.toolHeader}>
                    <View style={styles.toolTitleRow}>
                      <View style={styles.toolIconBox}>
                        <Feather name="plus-circle" size={14} color="#C9A84C" />
                      </View>
                      <Text style={styles.toolTitle}>Add TDS Entry</Text>
                    </View>
                    <TouchableOpacity style={styles.toolActionBtn} onPress={() => setShowTDSEntryForm(!showTDSEntryForm)}>
                      <Text style={styles.toolActionText}>{showTDSEntryForm ? 'Cancel' : 'Add'}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.toolDesc}>Add client payments where TDS was deducted but not through the platform.</Text>

                  {showTDSEntryForm && (
                    <View style={styles.invoiceForm}>
                      <TextInput style={styles.fieldInput} placeholder="Client name" placeholderTextColor="#8C7B6E" value={tdsEntryClient} onChangeText={setTdsEntryClient} />
                      <TextInput style={styles.fieldInput} placeholder="Gross amount received (₹)" placeholderTextColor="#8C7B6E" value={tdsEntryAmount} onChangeText={setTdsEntryAmount} keyboardType="number-pad" />

                      {tdsEntryAmount ? (
                        <View style={styles.gstPreview}>
                          <Text style={styles.gstPreviewText}>TDS (10%): ₹{(parseInt(tdsEntryAmount) * 0.10).toLocaleString('en-IN')}</Text>
                          <Text style={styles.gstPreviewTotal}>Net after TDS: ₹{(parseInt(tdsEntryAmount) * 0.90).toLocaleString('en-IN')}</Text>
                        </View>
                      ) : null}

                      <View style={styles.tdsToggleRow}>
                        <Text style={styles.tdsToggleLabel}>Deducted by:</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {(['client', 'self'] as const).map(opt => (
                            <TouchableOpacity
                              key={opt}
                              style={[styles.segmentBtn, tdsEntryDeductedBy === opt && styles.segmentBtnActive]}
                              onPress={() => setTdsEntryDeductedBy(opt)}
                            >
                              <Text style={[styles.segmentBtnText, tdsEntryDeductedBy === opt && styles.segmentBtnTextActive]}>
                                {opt === 'client' ? 'Client' : 'Self'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <TextInput style={styles.fieldInput} placeholder="Challan number (optional)" placeholderTextColor="#8C7B6E" value={tdsEntryChallan} onChangeText={setTdsEntryChallan} />

                      <TouchableOpacity style={styles.goldBtn} onPress={handleAddTDSEntry}>
                        <Text style={styles.goldBtnText}>SAVE TDS ENTRY</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* TDS Ledger */}
                <Text style={styles.sectionLabel}>TDS Ledger ({tdsLedger.length} entries)</Text>
                {tdsLedger.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Feather name="file-text" size={28} color="#C4B8AC" />
                    <Text style={styles.emptyTitle}>No entries yet</Text>
                    <Text style={styles.emptySub}>TDS entries are created automatically when bookings are confirmed. Add manual entries above for offline transactions.</Text>
                  </View>
                ) : (
                  <View style={styles.listCard}>
                    {tdsLedger.map((entry: any, index: number) => (
                      <View key={entry.id}>
                        <View style={styles.tdsLedgerRow}>
                          <View style={{ flex: 1, gap: 3 }}>
                            <Text style={styles.tdsLedgerType}>
                              {entry.transaction_type === 'platform_booking' ? '🔒 Platform Booking' : '📄 Client Invoice'}
                            </Text>
                            <Text style={styles.tdsLedgerDate}>{new Date(entry.created_at).toLocaleDateString('en-IN')}</Text>
                            {entry.notes ? <Text style={styles.tdsLedgerNote} numberOfLines={1}>{entry.notes}</Text> : null}
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 3 }}>
                            <Text style={styles.tdsLedgerGross}>₹{(entry.gross_amount || 0).toLocaleString('en-IN')}</Text>
                            <Text style={styles.tdsLedgerTDS}>TDS: ₹{(entry.tds_amount || 0).toLocaleString('en-IN')}</Text>
                            <View style={[styles.tdsSourceBadge, {
                              backgroundColor: entry.tds_deducted_by === 'platform' ? '#C9A84C20' : entry.tds_deducted_by === 'client' ? '#4CAF5020' : '#E8E0D5'
                            }]}>
                              <Text style={[styles.tdsSourceText, {
                                color: entry.tds_deducted_by === 'platform' ? '#C9A84C' : entry.tds_deducted_by === 'client' ? '#4CAF50' : '#8C7B6E'
                              }]}>
                                {entry.tds_deducted_by === 'platform' ? 'Platform' : entry.tds_deducted_by === 'client' ? 'Client' : 'Self'}
                              </Text>
                            </View>
                          </View>
                        </View>
                        {index < tdsLedger.length - 1 && <View style={styles.listDivider} />}
                      </View>
                    ))}
                  </View>
                )}

                {/* 26AS notice */}
                <View style={styles.noticeBox}>
                  <Feather name="info" size={14} color="#C9A84C" />
                  <Text style={styles.noticeBoxText}>
                    Platform TDS will appear in your Form 26AS under The Dream Wedding's TAN. Share this report with your CA before quarterly advance tax payment and annual ITR filing.
                  </Text>
                </View>

                <Text style={styles.sectionLabel}>Coming in Build 2</Text>
                <LockedFeature icon="refresh-cw" title="26AS Auto-Sync" desc="Connect your TRACES account and reconcile automatically. No manual input needed." build="Build 2" />
                <LockedFeature icon="calculator" title="Advance Tax Calculator" desc="Based on your income pattern, calculates exact advance tax instalments due in June, September, December and March." build="Build 2" />
              </>
            )}
          </View>
        )}

        {/* ════════════════════════════════
            REVIEWS TAB
        ════════════════════════════════ */}
        {activeTab === 'Reviews' && (
          <View style={styles.tabPane}>
            <View style={styles.ratingOverview}>
              <Text style={styles.ratingBig}>4.9</Text>
              <Text style={styles.ratingStars}>★★★★★</Text>
              <Text style={styles.ratingCount}>124 reviews</Text>
              <Text style={styles.ratingNote}>Only app-booked couples can leave verified reviews</Text>
            </View>

            <Text style={styles.sectionLabel}>Video Reviews</Text>
            {[
              { id: '1', client: 'Priya & Rahul', function: 'Wedding · Dec 2024', rating: 5 },
              { id: '2', client: 'Sneha & Arjun', function: 'Sangeet · Nov 2024', rating: 5 },
            ].map(review => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>{review.client[0]}</Text>
                  </View>
                  <View style={styles.reviewInfo}>
                    <Text style={styles.reviewName}>{review.client}</Text>
                    <Text style={styles.reviewFunction}>{review.function}</Text>
                  </View>
                  <Text style={styles.reviewRating}>{'★'.repeat(review.rating)}</Text>
                </View>
                <View style={styles.videoThumb}>
                  <Feather name="play-circle" size={20} color="#C9A84C" />
                  <Text style={styles.videoThumbText}>Play Video Review</Text>
                </View>
              </View>
            ))}

            <Text style={styles.sectionLabel}>Coming in Build 2</Text>
            <LockedFeature icon="star" title="Review Response System" desc="Respond publicly to couple reviews." build="Build 2" />
            <LockedFeature icon="award" title="Verified Elite Badge" desc="Earn the badge after 5 confirmed app bookings with 4.8+ average rating." build="Build 2" />
          </View>
        )}

        {/* ════════════════════════════════
            CLIENTS TAB
        ════════════════════════════════ */}
        {activeTab === 'Clients' && (
          <View style={[styles.tabPane, { paddingBottom: 40 }]}>
            <View style={styles.clientsHeader}>
              <Text style={styles.sectionLabel}>My Clients ({clients.length})</Text>
              <TouchableOpacity style={styles.addClientBtn} onPress={() => setShowAddClient(true)}>
                <Feather name="plus" size={12} color="#C9A84C" />
                <Text style={styles.addClientBtnText}>Add Client</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.viralCard}>
              <View style={styles.viralHeader}>
                <Feather name="zap" size={14} color="#C9A84C" />
                <Text style={styles.viralTitle}>Your network is your growth engine</Text>
              </View>
              <Text style={styles.viralText}>
                Zero ad spend. Every vendor with 20 clients = 20 new platform users instantly.
              </Text>
            </View>

            {clientsLoading ? (
              <ActivityIndicator color="#C9A84C" style={{ paddingVertical: 20 }} />
            ) : clients.length === 0 ? (
              <View style={styles.emptyCard}>
                <Feather name="users" size={28} color="#C4B8AC" />
                <Text style={styles.emptyTitle}>No clients yet</Text>
                <Text style={styles.emptySub}>Add your first client and send them a WhatsApp invite to join the platform</Text>
                <TouchableOpacity style={styles.goldBtn} onPress={() => setShowAddClient(true)}>
                  <Text style={styles.goldBtnText}>ADD FIRST CLIENT</Text>
                </TouchableOpacity>
              </View>
            ) : (
              clients.map(client => (
                <View key={client.id} style={[styles.clientCard, { flexDirection: 'column', alignItems: 'stretch' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{client.name}</Text>
                      <Text style={styles.clientPhone}>{client.phone}</Text>
                      <Text style={styles.clientDate}>{client.wedding_date}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.whatsappBtn, client.invited && styles.whatsappBtnDone]}
                      onPress={() => !client.invited && handleSendWhatsAppInvite(client)}
                      disabled={client.invited}
                    >
                      <Text style={[styles.whatsappBtnText, client.invited && styles.whatsappBtnTextDone]}>
                        {client.invited ? 'Invited ✓' : '📲 Invite'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {editingNoteId === client.id ? (
                    <View style={styles.noteEditRow}>
                      <TextInput
                        style={styles.noteInput}
                        value={noteText}
                        onChangeText={setNoteText}
                        placeholder="Add notes — lehenga colour, skin tone, preferences..."
                        placeholderTextColor="#8C7B6E"
                        multiline
                        autoFocus
                      />
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        <TouchableOpacity
                          style={[styles.unblockBtn, { flex: 1, alignItems: 'center' }]}
                          onPress={() => { setEditingNoteId(null); setNoteText(''); }}
                        >
                          <Text style={styles.unblockBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.goldBtn, { flex: 2 }]}
                          onPress={() => handleSaveClientNote(client.id)}
                        >
                          <Text style={styles.goldBtnText}>SAVE NOTE</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.noteRow}
                      onPress={() => {
                        setEditingNoteId(client.id);
                        setNoteText(client.notes || '');
                      }}
                    >
                      <Feather name="edit-2" size={11} color="#8C7B6E" />
                      <Text style={styles.noteText} numberOfLines={2}>
                        {client.notes ? client.notes : 'Add notes...'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}

            <Text style={styles.sectionLabel}>Coming in Build 2</Text>
            <LockedFeature icon="database" title="Bulk Client Import" desc="Import your entire client database via CSV upload." build="Build 2" />
            <LockedFeature icon="gift" title="Client Anniversary Reminders" desc="Get reminded on each couple's wedding anniversary. One tap to send a personalised message." build="Build 2" />
            <LockedFeature icon="repeat" title="Repeat Booking Tracker" desc="Track which clients have hired you more than once." build="Build 3" />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Bottom Nav ── */}
      <View style={styles.bottomNav}>
        {[
          { label: 'Dashboard', icon: 'grid', active: true, onPress: () => {} },
          { label: 'Messages', icon: 'message-circle', active: false, onPress: () => router.push('/messaging') },
          { label: 'Settings', icon: 'settings', active: false, onPress: () => openSettings() },
        ].map(item => (
          <TouchableOpacity key={item.label} style={styles.navItem} onPress={item.onPress}>
            <Feather name={item.icon as any} size={20} color={item.active ? '#2C2420' : '#8C7B6E'} />
            <Text style={[styles.navLabel, item.active && styles.navLabelActive]}>{item.label}</Text>
            {item.active && <View style={styles.navDot} />}
          </TouchableOpacity>
        ))}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  headerLeft: { gap: 3 },
  businessName: { fontSize: 20, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.3 },
  category: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.2 },
  liveToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  liveToggleActive: { borderColor: '#4CAF50', backgroundColor: '#4CAF5010' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8C7B6E' },
  liveDotActive: { backgroundColor: '#4CAF50' },
  liveToggleText: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_500Medium' },
  liveToggleTextActive: { color: '#4CAF50' },
  tabScroll: { maxHeight: 44, marginBottom: 16 },
  tabContent: { paddingHorizontal: 24, gap: 8, alignItems: 'center' },
  tab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 50, borderWidth: 1, borderColor: '#E8E0D5', backgroundColor: '#FFFFFF' },
  tabActive: { backgroundColor: '#2C2420', borderColor: '#2C2420' },
  tabText: { fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  tabTextActive: { color: '#F5F0E8', fontFamily: 'DMSans_500Medium' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  tabPane: { gap: 14 },
  sectionLabel: { fontSize: 11, color: '#8C7B6E', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: 'DMSans_500Medium' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#E8E0D5' },
  statNumber: { fontSize: 26, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  statLabel: { fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light', textAlign: 'center', letterSpacing: 0.3 },
  revenueCard: { backgroundColor: '#2C2420', borderRadius: 16, padding: 20, gap: 14 },
  revenueEyebrow: { fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_500Medium', letterSpacing: 1.5 },
  revenueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  revenueItem: { flex: 1, alignItems: 'center', gap: 4 },
  revenueDivider: { width: 1, height: 36, backgroundColor: '#3C3430' },
  revenueAmount: { fontSize: 22, color: '#C9A84C', fontFamily: 'PlayfairDisplay_400Regular' },
  revenueLabel: { fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.3 },
  alertCard: { backgroundColor: '#FFF8EC', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#C9A84C', gap: 6 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  alertTitle: { fontSize: 14, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  alertText: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  alertLink: { fontSize: 13, color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  planCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#E8E0D5' },
  planLeft: { gap: 3 },
  planName: { fontSize: 15, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  planDetail: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  planBadge: { backgroundColor: '#C9A84C', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6 },
  planBadgeElite: { backgroundColor: '#2C2420', borderWidth: 1, borderColor: '#C9A84C' },
  planBadgeText: { fontSize: 12, color: '#FFFFFF', fontFamily: 'DMSans_500Medium' },
  upgradeCard: { backgroundColor: '#FFF8EC', borderRadius: 12, padding: 16, gap: 10, borderWidth: 1, borderColor: '#E8D9B5' },
  upgradeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  upgradeTitle: { fontSize: 14, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  upgradeText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', lineHeight: 20 },
  upgradeBtn: { backgroundColor: '#2C2420', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  upgradeBtnText: { fontSize: 12, color: '#C9A84C', fontFamily: 'DMSans_500Medium', letterSpacing: 1 },
  benchmarkCard: { backgroundColor: '#FFF8EC', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8D9B5', gap: 8 },
  benchmarkHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  benchmarkTitle: { fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_500Medium', flex: 1 },
  benchmarkText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', lineHeight: 20 },
  benchmarkRange: { fontSize: 12, color: '#C9A84C', fontFamily: 'DMSans_300Light' },
  benchmarkMini: { backgroundColor: '#F5F0E8', borderRadius: 8, padding: 12, gap: 4 },
  benchmarkMiniText: { fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  benchmarkMiniSub: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDotSmall: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#4CAF50' },
  liveBadgeText: { fontSize: 10, color: '#4CAF50', fontFamily: 'DMSans_500Medium' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { width: (width - 58) / 2, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, gap: 6, borderWidth: 1, borderColor: '#E8E0D5' },
  actionNumber: { fontSize: 22, color: '#C9A84C', fontFamily: 'PlayfairDisplay_400Regular' },
  actionLabel: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light', lineHeight: 16 },
  previewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 10, paddingVertical: 14, backgroundColor: '#FFFFFF' },
  previewBtnText: { fontSize: 13, color: '#C9A84C', fontFamily: 'DMSans_300Light' },
  comingSoonSection: { gap: 10 },
  comingSoonHeader: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_500Medium', letterSpacing: 1.5, textTransform: 'uppercase' },
  bookingCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#C9A84C', gap: 14 },
  bookingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bookingName: { fontSize: 15, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  bookingMeta: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', marginTop: 3 },
  escrowBadge: { backgroundColor: '#C9A84C20', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  escrowBadgeText: { fontSize: 11, color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
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
  inquiryCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8E0D5', gap: 10 },
  inquiryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  inquiryName: { fontSize: 15, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  inquiryMeta: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', marginTop: 2 },
  inquiryBadge: { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  inquiryBadgeText: { fontSize: 11, fontFamily: 'DMSans_500Medium' },
  inquiryMessage: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', lineHeight: 20, fontStyle: 'italic' },
  replyBtn: { borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  replyBtnText: { fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular' },
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
  toolCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#E8E0D5', gap: 12 },
  toolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toolTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toolIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#E8D9B5', justifyContent: 'center', alignItems: 'center' },
  toolTitle: { fontSize: 14, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  toolActionBtn: { borderWidth: 1, borderColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  toolActionText: { fontSize: 12, color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  toolDesc: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', lineHeight: 20 },
  promoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  promoInfo: { flex: 1, gap: 3 },
  promoTitle: { fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  promoMeta: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  promoBadge: { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  promoBadgeText: { fontSize: 11, fontFamily: 'DMSans_500Medium' },
  invoiceForm: { gap: 10, borderTopWidth: 1, borderTopColor: '#E8E0D5', paddingTop: 12 },
  fieldInput: { backgroundColor: '#F5F0E8', borderRadius: 8, borderWidth: 1, borderColor: '#E8E0D5', paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  gstPreview: { backgroundColor: '#F5F0E8', borderRadius: 8, padding: 12, gap: 4 },
  gstPreviewText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  gstPreviewTotal: { fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_500Medium' },
  gstRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E8E0D5', paddingTop: 12 },
  gstAmount: { fontSize: 16, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  gstLabel: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  tdsToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  tdsToggleInfo: { flex: 1, gap: 2 },
  tdsToggleLabel: { fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_500Medium' },
  tdsToggleHint: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#E8E0D5', justifyContent: 'center', paddingHorizontal: 2 },
  toggleActive: { backgroundColor: '#C9A84C' },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 },
  toggleKnobActive: { transform: [{ translateX: 20 }] },
  tdsBreakdownRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tdsBreakdownDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  tdsBreakdownLabel: { fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_500Medium' },
  tdsBreakdownNote: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light', marginTop: 2 },
  tdsBreakdownAmount: { fontSize: 15, fontFamily: 'PlayfairDisplay_400Regular' },
  tdsLedgerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14 },
  tdsLedgerType: { fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_500Medium' },
  tdsLedgerDate: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  tdsLedgerNote: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light', fontStyle: 'italic' },
  tdsLedgerGross: { fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_500Medium' },
  tdsLedgerTDS: { fontSize: 11, color: '#C9A84C', fontFamily: 'DMSans_300Light' },
  tdsSourceBadge: { borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-end' },
  tdsSourceText: { fontSize: 10, fontFamily: 'DMSans_500Medium' },
  segmentBtn: { borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  segmentBtnActive: { backgroundColor: '#2C2420', borderColor: '#2C2420' },
  segmentBtnText: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  segmentBtnTextActive: { color: '#F5F0E8', fontFamily: 'DMSans_500Medium' },
  noticeBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFF8EC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E8D9B5' },
  noticeBoxText: { flex: 1, fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', lineHeight: 18 },
  ratingOverview: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E8E0D5' },
  ratingBig: { fontSize: 52, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  ratingStars: { fontSize: 20, color: '#C9A84C' },
  ratingCount: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  ratingNote: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light', textAlign: 'center', fontStyle: 'italic' },
  reviewCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8E0D5', gap: 12 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' },
  reviewAvatarText: { fontSize: 16, color: '#C9A84C', fontFamily: 'PlayfairDisplay_400Regular' },
  reviewInfo: { flex: 1, gap: 2 },
  reviewName: { fontSize: 14, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  reviewFunction: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  reviewRating: { fontSize: 13, color: '#C9A84C' },
  videoThumb: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  videoThumbText: { fontSize: 14, color: '#F5F0E8', fontFamily: 'DMSans_300Light', letterSpacing: 0.5 },
  clientsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addClientBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2C2420', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  addClientBtnText: { fontSize: 12, color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  viralCard: { backgroundColor: '#2C2420', borderRadius: 14, padding: 18, gap: 10 },
  viralHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viralTitle: { fontSize: 14, color: '#C9A84C', fontFamily: 'PlayfairDisplay_400Regular' },
  viralText: { fontSize: 13, color: '#B8A99A', fontFamily: 'DMSans_300Light', lineHeight: 20 },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#E8E0D5', gap: 12 },
  emptyTitle: { fontSize: 16, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  emptySub: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', textAlign: 'center', lineHeight: 20 },
  clientCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E8E0D5', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientInfo: { gap: 3 },
  clientName: { fontSize: 15, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  clientPhone: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  clientDate: { fontSize: 12, color: '#C9A84C', fontFamily: 'DMSans_300Light' },
  whatsappBtn: { backgroundColor: '#25D366', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  whatsappBtnDone: { backgroundColor: '#E8E0D5' },
  whatsappBtnText: { fontSize: 12, color: '#FFFFFF', fontFamily: 'DMSans_500Medium' },
  whatsappBtnTextDone: { color: '#8C7B6E' },
  goldBtn: { backgroundColor: '#C9A84C', borderRadius: 10, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  goldBtnText: { fontSize: 12, color: '#2C2420', fontFamily: 'DMSans_500Medium', letterSpacing: 1 },
  goldOutlineBtn: { borderWidth: 1, borderColor: '#C9A84C', borderRadius: 10, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, backgroundColor: '#FFFFFF' },
  goldOutlineBtnText: { fontSize: 13, color: '#C9A84C', fontFamily: 'DMSans_400Regular' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#F5F0E8', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, gap: 14 },
  modalTitle: { fontSize: 24, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: 0.3 },
  modalSubtitle: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', marginTop: -8, lineHeight: 20 },
  modalInput: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E8E0D5', paddingVertical: 14, paddingHorizontal: 16, fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_400Regular' },
  modalBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  modalBtnText: { fontSize: 13, color: '#F5F0E8', fontFamily: 'DMSans_500Medium', letterSpacing: 1.5 },
  modalCancel: { alignItems: 'center', paddingVertical: 8 },
  modalCancelText: { fontSize: 14, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: '#E8E0D5', backgroundColor: '#F5F0E8' },
  navItem: { alignItems: 'center', gap: 4 },
  navLabel: { fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.3 },
  navLabelActive: { color: '#2C2420', fontFamily: 'DMSans_500Medium' },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C9A84C' },
  spotlightCard: { backgroundColor: '#2C2420', borderRadius: 16, padding: 18, gap: 12, borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)' },
  spotlightHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  spotlightTitle: { flex: 1, fontSize: 13, color: '#F5F0E8', fontFamily: 'DMSans_500Medium' },
  spotlightRankBadge: { backgroundColor: 'rgba(201,168,76,0.12)', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)' },
  spotlightRankText: { fontSize: 10, color: '#C9A84C', fontFamily: 'DMSans_500Medium' },
  spotlightScore: { fontSize: 44, color: '#C9A84C', fontFamily: 'PlayfairDisplay_400Regular', lineHeight: 48 },
  spotlightBreakdown: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 12 },
  spotlightItem: { flex: 1, alignItems: 'center', gap: 3 },
  spotlightItemNum: { fontSize: 18, color: '#F5F0E8', fontFamily: 'PlayfairDisplay_400Regular' },
  spotlightItemLbl: { fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.3 },
  spotlightDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.07)' },
  spotlightHint: { fontSize: 10, color: 'rgba(140,123,110,0.55)', fontFamily: 'DMSans_300Light' },
  settingsSection: { gap: 6, marginBottom: 16 },
  settingsSectionLabel: { fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_500Medium', letterSpacing: 1.5 },
  settingsInput: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E8E0D5', paddingVertical: 14, paddingHorizontal: 16, fontSize: 15, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0EDE8', marginTop: 4 },
  noteText: { flex: 1, fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light', fontStyle: 'italic', lineHeight: 18 },
  noteEditRow: { paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0EDE8', marginTop: 4 },
  noteInput: { backgroundColor: '#F5F0E8', borderRadius: 8, borderWidth: 1, borderColor: '#E8E0D5', paddingVertical: 10, paddingHorizontal: 12, fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_400Regular', minHeight: 70, textAlignVertical: 'top' },
  noticeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFF8EC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E8D9B5' },
  invoiceHistoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14 },
  invoiceHistoryClient: { fontSize: 14, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  invoiceHistoryMeta: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light' },
  invoiceHistoryDesc: { fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light', fontStyle: 'italic' },
  invoiceHistoryAmount: { fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_500Medium' },
  invoiceStatusBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center', minWidth: 80 },
  invoiceStatusText: { fontSize: 11, fontFamily: 'DMSans_500Medium' },
  noticeCardText: { flex: 1, fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', lineHeight: 20 },
});