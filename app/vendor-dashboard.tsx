import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Image, Modal,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadImage } from '../services/cloudinary';
import { generateInvoicePDF, generateInvoiceNumber } from '../services/invoice';
import { getBenchmark, getLeads, getInvoices } from '../services/api';

const { width } = Dimensions.get('window');

const TABS = ['Overview', 'Inquiries', 'Calendar', 'Tools', 'Reviews', 'Clients'];

const BLOCKED_DATES = ['Dec 10, 2025', 'Dec 15, 2025', 'Dec 22, 2025', 'Jan 1, 2026'];

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

const INITIAL_CLIENTS = [
  { id: '1', name: 'Rohit & Simran', phone: '9876543210', wedding_date: 'March 15, 2026', status: 'upcoming', invited: false },
  { id: '2', name: 'Amit & Pooja', phone: '9988776655', wedding_date: 'February 8, 2026', status: 'upcoming', invited: true },
  { id: '3', name: 'Vikram & Neha', phone: '9123456789', wedding_date: 'October 20, 2025', status: 'completed', invited: false },
];

export default function VendorDashboardScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Overview');
  const [isLive, setIsLive] = useState(true);
  const [vendorSession, setVendorSession] = useState<any>(null);

  // Tools state
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceClient, setInvoiceClient] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Clients state
  const [clients, setClients] = useState(INITIAL_CLIENTS);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientDate, setNewClientDate] = useState('');

  // Promo state
  const [promos, setPromos] = useState(PROMOS);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [newPromoTitle, setNewPromoTitle] = useState('');
  const [newPromoExpiry, setNewPromoExpiry] = useState('');

  // Data state
  const [benchmark, setBenchmark] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (vendorSession?.vendorId) {
      loadBenchmark();
      if (activeTab === 'Inquiries') loadLeads();
    }
  }, [vendorSession, activeTab]);

  const loadSession = async () => {
    try {
      const stored = await AsyncStorage.getItem('vendor_session');
      if (stored) setVendorSession(JSON.parse(stored));
    } catch (e) {}
  };

  const loadBenchmark = async () => {
    try {
      const category = vendorSession?.category || 'photographers';
      const city = vendorSession?.city || 'Delhi NCR';
      const res = await getBenchmark(category, city);
      if (res.success) setBenchmark(res.data);
    } catch (e) {}
  };

  const loadLeads = async () => {
    try {
      setLeadsLoading(true);
      const res = await getLeads(vendorSession.vendorId);
      if (res.success && res.data?.length > 0) setLeads(res.data);
    } catch (e) {}
    finally { setLeadsLoading(false); }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('vendor_session');
            await AsyncStorage.removeItem('user_session');
            router.replace('/login');
          }
        }
      ]
    );
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
      } catch {
        Alert.alert('Upload failed', 'Please try again.');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleSendInvite = (clientId: string) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, invited: true } : c));
    Alert.alert('Invite Sent!', 'Your client will receive a WhatsApp message to join The Dream Wedding.');
  };

  const handleAddClient = () => {
    if (!newClientName || !newClientPhone || !newClientDate) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    const newClient = {
      id: Date.now().toString(),
      name: newClientName,
      phone: newClientPhone,
      wedding_date: newClientDate,
      status: 'upcoming',
      invited: false,
    };
    setClients(prev => [...prev, newClient]);
    setNewClientName('');
    setNewClientPhone('');
    setNewClientDate('');
    setShowAddClient(false);
    Alert.alert('Client Added!', `${newClientName} has been added. Send them an invite to join The Dream Wedding.`);
  };

  const handleGenerateInvoice = async () => {
    if (!invoiceClient || !invoiceAmount) {
      Alert.alert('Missing info', 'Please enter client name and amount.');
      return;
    }
    try {
      await generateInvoicePDF({
        vendorName: vendorSession?.vendorName || 'Your Business',
        vendorPhone: vendorSession?.phone || '',
        vendorCity: vendorSession?.city || '',
        clientName: invoiceClient,
        amount: parseInt(invoiceAmount),
        description: 'Wedding Services',
        invoiceNumber: generateInvoiceNumber(),
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      });
    } catch {
      Alert.alert('Error', 'Could not generate invoice. Please try again.');
    }
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
    Alert.alert('Promo Live!', 'Couples in your city will be notified of your offer.');
  };

  const vendorName = vendorSession?.vendorName || 'Your Business';
  const vendorCategory = vendorSession?.category
    ? vendorSession.category.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    : 'Vendor';
  const vendorCity = vendorSession?.city || '';
  const vendorPlan = vendorSession?.plan || 'basic';

  const displayLeads = leads.length > 0 ? leads : [
    { id: '1', name: 'Priya & Rahul', stage: 'New Inquiry', date: 'Dec 15', value: '₹3,00,000' },
    { id: '2', name: 'Sneha & Arjun', stage: 'Quoted', date: 'Nov 20', value: '₹1,50,000' },
    { id: '3', name: 'Ananya & Dev', stage: 'New Inquiry', date: 'Jan 5', value: '₹3,00,000' },
    { id: '4', name: 'Kavya & Rohan', stage: 'Token Received', date: 'Feb 14', value: '₹3,00,000' },
    { id: '5', name: 'Meera & Vikram', stage: 'Completed', date: 'Oct 10', value: '₹3,00,000' },
  ];

  const MOCK_INQUIRIES = [
    { id: '1', name: 'Priya & Rahul', function: 'Wedding', date: 'December 15, 2025', message: 'Hi, I\'m interested in your services for my Wedding on Dec 15. Are you available?', status: 'new' },
    { id: '2', name: 'Sneha & Arjun', function: 'Sangeet', date: 'November 20, 2025', message: 'Hi, I\'m interested in your services for Sangeet on Nov 20. Are you available?', status: 'replied' },
    { id: '3', name: 'Ananya & Dev', function: 'Reception', date: 'January 5, 2026', message: 'Hi, I\'m interested in your services for Reception on Jan 5. Are you available?', status: 'new' },
  ];

  return (
    <View style={styles.container}>

      {/* Add Client Modal */}
      <Modal visible={showAddClient} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Client</Text>
            <Text style={styles.modalSubtitle}>They'll get a WhatsApp invite to join The Dream Wedding</Text>
            <TextInput style={styles.modalInput} placeholder="Couple names (e.g. Priya & Rahul)" placeholderTextColor="#8C7B6E" value={newClientName} onChangeText={setNewClientName} />
            <TextInput style={styles.modalInput} placeholder="Phone number" placeholderTextColor="#8C7B6E" value={newClientPhone} onChangeText={setNewClientPhone} keyboardType="phone-pad" maxLength={10} />
            <TextInput style={styles.modalInput} placeholder="Wedding date (e.g. March 15, 2026)" placeholderTextColor="#8C7B6E" value={newClientDate} onChangeText={setNewClientDate} />
            <TouchableOpacity style={styles.modalBtn} onPress={handleAddClient}>
              <Text style={styles.modalBtnText}>Add & Invite</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddClient(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
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
            <TextInput style={styles.modalInput} placeholder="Expires on (e.g. Dec 31, 2025)" placeholderTextColor="#8C7B6E" value={newPromoExpiry} onChangeText={setNewPromoExpiry} />
            <TouchableOpacity style={styles.modalBtn} onPress={handleCreatePromo}>
              <Text style={styles.modalBtnText}>Go Live</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowPromoForm(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View>
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

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* OVERVIEW */}
        {activeTab === 'Overview' && (
          <View style={styles.tabPane}>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>142</Text>
                <Text style={styles.statLabel}>Profile Views</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>38</Text>
                <Text style={styles.statLabel}>Hearts</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>12</Text>
                <Text style={styles.statLabel}>Inquiries</Text>
              </View>
            </View>

            <View style={styles.revenueCard}>
              <View style={styles.revenueRow}>
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueAmount}>₹9L</Text>
                  <Text style={styles.revenueLabel}>This Month</Text>
                </View>
                <View style={styles.revenueDivider} />
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueAmount}>₹84L</Text>
                  <Text style={styles.revenueLabel}>This Year</Text>
                </View>
                <View style={styles.revenueDivider} />
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueAmount}>8</Text>
                  <Text style={styles.revenueLabel}>Bookings</Text>
                </View>
              </View>
            </View>

            <View style={styles.subscriptionCard}>
              <View>
                <Text style={styles.subscriptionPlan}>
                  {vendorPlan === 'premium' ? 'Premium Plan' : 'Basic Plan'}
                </Text>
                <Text style={styles.subscriptionDetail}>
                  {vendorPlan === 'premium' ? 'Priority placement active' : 'Upgrade for priority placement'}
                </Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓ Active</Text>
              </View>
            </View>

            <View style={styles.benchmarkCard}>
              <Text style={styles.benchmarkTitle}>Market Benchmark · Live</Text>
              {benchmark ? (
                <>
                  <Text style={styles.benchmarkText}>
                    Average starting price for {vendorCategory} in {vendorCity} is ₹{benchmark.avgStartingPrice?.toLocaleString('en-IN')} across {benchmark.vendorCount} vendors.
                  </Text>
                  <Text style={[styles.benchmarkText, { color: '#C9A84C', marginTop: 4 }]}>
                    Range: ₹{benchmark.minStartingPrice?.toLocaleString('en-IN')} – ₹{benchmark.maxStartingPrice?.toLocaleString('en-IN')}
                  </Text>
                </>
              ) : (
                <Text style={styles.benchmarkText}>Loading market data...</Text>
              )}
            </View>

            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('Inquiries')}>
                <Text style={styles.actionNumber}>3</Text>
                <Text style={styles.actionLabel}>New Inquiries</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('Calendar')}>
                <Text style={styles.actionNumber}>4</Text>
                <Text style={styles.actionLabel}>Blocked Dates</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('Reviews')}>
                <Text style={styles.actionNumber}>★ 4.9</Text>
                <Text style={styles.actionLabel}>Your Rating</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('Clients')}>
                <Text style={styles.actionNumber}>{clients.length}</Text>
                <Text style={styles.actionLabel}>My Clients</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.previewBtn} onPress={() => router.push('/vendor-preview')}>
              <Text style={styles.previewBtnText}>Preview your profile as couples see it →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* INQUIRIES */}
        {activeTab === 'Inquiries' && (
          <View style={styles.tabPane}>
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
                          <Text style={[styles.stageBadgeText, { color: STAGE_COLORS[lead.stage] || '#8C7B6E' }]}>
                            {lead.stage}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {index < displayLeads.length - 1 && <View style={styles.listDivider} />}
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.sectionLabel}>Incoming Inquiries</Text>
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
                  <View style={styles.inquiryActions}>
                    <TouchableOpacity style={styles.replyBtn} onPress={() => router.push('/messaging')}>
                      <Text style={styles.replyBtnText}>Reply</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.confirmBtn}>
                      <Text style={styles.confirmBtnText}>Confirm & Lock Date</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* CALENDAR */}
        {activeTab === 'Calendar' && (
          <View style={styles.tabPane}>
            <Text style={styles.sectionLabel}>Availability</Text>
            <Text style={styles.calendarHint}>Block dates you're already booked so couples see accurate availability</Text>
            <View style={styles.listCard}>
              <View style={styles.blockedHeader}>
                <Text style={styles.blockedTitle}>Blocked Dates</Text>
              </View>
              {BLOCKED_DATES.map((date, index) => (
                <View key={date}>
                  <View style={styles.blockedRow}>
                    <Text style={styles.blockedDate}>{date}</Text>
                    <TouchableOpacity style={styles.unblockBtn}>
                      <Text style={styles.unblockBtnText}>Unblock</Text>
                    </TouchableOpacity>
                  </View>
                  {index < BLOCKED_DATES.length - 1 && <View style={styles.listDivider} />}
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.blockDateBtn}
              onPress={() => Alert.alert('Block a Date', 'Full calendar integration coming soon. Your blocked dates are saved.')}
            >
              <Text style={styles.blockDateBtnText}>+ Block a Date</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TOOLS */}
        {activeTab === 'Tools' && (
          <View style={styles.tabPane}>
            <Text style={styles.sectionLabel}>Business Tools</Text>

            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>Promo Engine</Text>
                <TouchableOpacity style={styles.toolAction} onPress={() => setShowPromoForm(true)}>
                  <Text style={styles.toolActionText}>+ Create Promo</Text>
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

            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>Portfolio Photos</Text>
                <TouchableOpacity style={styles.toolAction} onPress={handleImageUpload} disabled={uploadingImage}>
                  {uploadingImage
                    ? <ActivityIndicator size="small" color="#C9A84C" />
                    : <Text style={styles.toolActionText}>+ Upload</Text>
                  }
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>Upload photos to your public portfolio</Text>
              {portfolioImages.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {portfolioImages.map((uri, index) => (
                    <Image key={index} source={{ uri }} style={{ width: 80, height: 80, borderRadius: 8, marginRight: 8 }} />
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>Invoice Generator</Text>
                <TouchableOpacity style={styles.toolAction} onPress={() => setShowInvoiceForm(!showInvoiceForm)}>
                  <Text style={styles.toolActionText}>{showInvoiceForm ? 'Cancel' : 'Create Invoice'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>Professional invoices with auto GST calculation</Text>
              {showInvoiceForm && (
                <View style={styles.invoiceForm}>
                  <TextInput style={styles.invoiceInput} placeholder="Client name" placeholderTextColor="#8C7B6E" value={invoiceClient} onChangeText={setInvoiceClient} />
                  <TextInput style={styles.invoiceInput} placeholder="Amount (₹)" placeholderTextColor="#8C7B6E" value={invoiceAmount} onChangeText={setInvoiceAmount} keyboardType="number-pad" />
                  {invoiceAmount ? (
                    <View style={styles.gstPreview}>
                      <Text style={styles.gstPreviewText}>GST (18%): ₹{(parseInt(invoiceAmount) * 0.18).toLocaleString('en-IN')}</Text>
                      <Text style={styles.gstPreviewTotal}>Total: ₹{(parseInt(invoiceAmount) * 1.18).toLocaleString('en-IN')}</Text>
                    </View>
                  ) : null}
                  <TouchableOpacity style={styles.generateBtn} onPress={handleGenerateInvoice}>
                    <Text style={styles.generateBtnText}>Generate Invoice PDF</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>GST & Tax Summary</Text>
                <TouchableOpacity style={styles.toolAction} onPress={() => Alert.alert('Coming Soon', 'Annual GST report PDF download is being built.')}>
                  <Text style={styles.toolActionText}>Download</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>Annual income summary for GST filing</Text>
              <View style={styles.gstRow}>
                <View style={styles.gstItem}>
                  <Text style={styles.gstAmount}>₹84L</Text>
                  <Text style={styles.gstLabel}>Total Income</Text>
                </View>
                <View style={styles.gstItem}>
                  <Text style={styles.gstAmount}>₹15.1L</Text>
                  <Text style={styles.gstLabel}>GST (18%)</Text>
                </View>
                <View style={styles.gstItem}>
                  <Text style={styles.gstAmount}>FY 2025</Text>
                  <Text style={styles.gstLabel}>Period</Text>
                </View>
              </View>
            </View>

            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>Payment Tracker</Text>
              </View>
              <Text style={styles.toolDesc}>Track all incoming payments and pending amounts</Text>
              <View style={styles.paymentTrackerRow}>
                <View style={styles.paymentTrackerItem}>
                  <Text style={styles.paymentTrackerAmount}>₹9L</Text>
                  <Text style={styles.paymentTrackerLabel}>Received</Text>
                </View>
                <View style={styles.paymentTrackerDivider} />
                <View style={styles.paymentTrackerItem}>
                  <Text style={[styles.paymentTrackerAmount, { color: '#C9A84C' }]}>₹6L</Text>
                  <Text style={styles.paymentTrackerLabel}>Pending</Text>
                </View>
                <View style={styles.paymentTrackerDivider} />
                <View style={styles.paymentTrackerItem}>
                  <Text style={styles.paymentTrackerAmount}>₹60K</Text>
                  <Text style={styles.paymentTrackerLabel}>In Escrow</Text>
                </View>
              </View>
            </View>

            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>Refer a Vendor</Text>
                <TouchableOpacity style={styles.toolAction} onPress={() => Alert.alert('Refer a Vendor', 'Share your referral link:\n\nthedreamwedding.com/vendor-refer/your-code\n\nGet 1 month free when they join!')}>
                  <Text style={styles.toolActionText}>Share Link</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>Refer another vendor and get 1 month subscription free</Text>
            </View>

            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>Portfolio Analytics</Text>
              </View>
              <Text style={styles.toolDesc}>See which photos get the most saves and views</Text>
              <View style={styles.analyticsList}>
                {[
                  { photo: 'Top portfolio image', saves: 47, views: 312 },
                  { photo: 'Second image', saves: 38, views: 289 },
                  { photo: 'Third image', saves: 31, views: 198 },
                ].map((item, index, arr) => (
                  <View key={item.photo}>
                    <View style={styles.analyticsRow}>
                      <Text style={styles.analyticsPhoto}>{item.photo}</Text>
                      <Text style={styles.analyticsStats}>{item.saves} saves · {item.views} views</Text>
                    </View>
                    {index < arr.length - 1 && <View style={styles.listDivider} />}
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* REVIEWS */}
        {activeTab === 'Reviews' && (
          <View style={styles.tabPane}>
            <View style={styles.ratingOverview}>
              <Text style={styles.ratingBig}>4.9</Text>
              <Text style={styles.ratingStars}>★★★★★</Text>
              <Text style={styles.ratingCount}>124 reviews</Text>
              <Text style={styles.ratingNote}>Only app-booked couples can leave reviews</Text>
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
                  <Text style={styles.videoThumbText}>▶  Play Video Review</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* CLIENTS */}
        {activeTab === 'Clients' && (
          <View style={[styles.tabPane, { paddingBottom: 40 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionLabel}>My Clients ({clients.length})</Text>
              <TouchableOpacity style={styles.addClientBtn} onPress={() => setShowAddClient(true)}>
                <Text style={styles.addClientBtnText}>+ Add Client</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.viralCard}>
              <Text style={styles.viralTitle}>Your network is your growth engine</Text>
              <Text style={styles.viralText}>
                Add your existing clients to The Dream Wedding. They get onboarded, discover vendors for their other functions, and refer their friends. This is how you grow without spending on ads.
              </Text>
            </View>
            {clients.map(client => (
              <View key={client.id} style={styles.clientCard}>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{client.name}</Text>
                  <Text style={styles.clientPhone}>{client.phone}</Text>
                  <Text style={styles.clientDate}>{client.wedding_date}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.inviteBtn, client.invited && styles.inviteBtnDone]}
                  onPress={() => !client.invited && handleSendInvite(client.id)}
                  disabled={client.invited}
                >
                  <Text style={[styles.inviteBtnText, client.invited && styles.inviteBtnTextDone]}>
                    {client.invited ? 'Invited ✓' : 'Send Invite'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={[styles.navLabel, styles.navActive]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/messaging')}>
          <Text style={styles.navLabel}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={handleLogout}>
          <Text style={styles.navLabel}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  businessName: { fontSize: 18, color: '#2C2420', fontWeight: '500', letterSpacing: 0.3 },
  category: { fontSize: 13, color: '#8C7B6E', marginTop: 3 },
  liveToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  liveToggleActive: { borderColor: '#4CAF50', backgroundColor: '#4CAF5010' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8C7B6E' },
  liveDotActive: { backgroundColor: '#4CAF50' },
  liveToggleText: { fontSize: 13, color: '#8C7B6E', fontWeight: '500' },
  liveToggleTextActive: { color: '#4CAF50' },
  tabScroll: { maxHeight: 44, marginBottom: 16 },
  tabContent: { paddingHorizontal: 24, gap: 8, alignItems: 'center' },
  tab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 50, borderWidth: 1, borderColor: '#E8E0D5', backgroundColor: '#FFFFFF' },
  tabActive: { backgroundColor: '#2C2420', borderColor: '#2C2420' },
  tabText: { fontSize: 13, color: '#2C2420' },
  tabTextActive: { color: '#F5F0E8', fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  tabPane: { gap: 14 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E8E0D5' },
  statNumber: { fontSize: 24, color: '#2C2420', fontWeight: '400' },
  statLabel: { fontSize: 11, color: '#8C7B6E', textAlign: 'center' },
  revenueCard: { backgroundColor: '#2C2420', borderRadius: 14, padding: 20 },
  revenueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  revenueItem: { flex: 1, alignItems: 'center', gap: 4 },
  revenueDivider: { width: 1, height: 36, backgroundColor: '#3C3430' },
  revenueAmount: { fontSize: 22, color: '#C9A84C', fontWeight: '400' },
  revenueLabel: { fontSize: 11, color: '#8C7B6E' },
  subscriptionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#E8E0D5' },
  subscriptionPlan: { fontSize: 15, color: '#2C2420', fontWeight: '500' },
  subscriptionDetail: { fontSize: 12, color: '#8C7B6E', marginTop: 3 },
  verifiedBadge: { backgroundColor: '#C9A84C', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6 },
  verifiedBadgeText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  benchmarkCard: { backgroundColor: '#FFF8EC', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8D9B5', gap: 8 },
  benchmarkTitle: { fontSize: 13, color: '#2C2420', fontWeight: '500' },
  benchmarkText: { fontSize: 13, color: '#8C7B6E', lineHeight: 20 },
  sectionLabel: { fontSize: 12, color: '#8C7B6E', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '500' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: (width - 60) / 2, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, gap: 6, borderWidth: 1, borderColor: '#E8E0D5' },
  actionNumber: { fontSize: 22, color: '#C9A84C', fontWeight: '500' },
  actionLabel: { fontSize: 12, color: '#8C7B6E' },
  previewBtn: { borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 10, paddingVertical: 14, alignItems: 'center', backgroundColor: '#FFFFFF' },
  previewBtnText: { fontSize: 13, color: '#C9A84C' },
  listCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E8E0D5', overflow: 'hidden' },
  listDivider: { height: 1, backgroundColor: '#E8E0D5', marginHorizontal: 16 },
  leadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  leadInfo: { gap: 3 },
  leadName: { fontSize: 14, color: '#2C2420', fontWeight: '500' },
  leadDate: { fontSize: 12, color: '#8C7B6E' },
  leadRight: { alignItems: 'flex-end', gap: 4 },
  leadValue: { fontSize: 13, color: '#2C2420', fontWeight: '500' },
  stageBadge: { borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3 },
  stageBadgeText: { fontSize: 10, fontWeight: '500' },
  inquiryCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8E0D5', gap: 10 },
  inquiryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  inquiryName: { fontSize: 15, color: '#2C2420', fontWeight: '500' },
  inquiryMeta: { fontSize: 12, color: '#8C7B6E', marginTop: 2 },
  inquiryBadge: { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  inquiryBadgeText: { fontSize: 11, fontWeight: '500' },
  inquiryMessage: { fontSize: 13, color: '#8C7B6E', lineHeight: 20, fontStyle: 'italic' },
  inquiryActions: { flexDirection: 'row', gap: 8 },
  replyBtn: { flex: 1, borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  replyBtnText: { fontSize: 13, color: '#2C2420' },
  confirmBtn: { flex: 2, backgroundColor: '#2C2420', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  confirmBtnText: { fontSize: 13, color: '#F5F0E8', fontWeight: '500' },
  calendarHint: { fontSize: 13, color: '#8C7B6E', lineHeight: 20 },
  blockedHeader: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E8E0D5' },
  blockedTitle: { fontSize: 13, color: '#8C7B6E', fontWeight: '500' },
  blockedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  blockedDate: { fontSize: 14, color: '#2C2420' },
  unblockBtn: { borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  unblockBtnText: { fontSize: 12, color: '#8C7B6E' },
  blockDateBtn: { borderWidth: 1, borderColor: '#C9A84C', borderRadius: 10, paddingVertical: 14, alignItems: 'center', backgroundColor: '#FFFFFF' },
  blockDateBtnText: { fontSize: 14, color: '#C9A84C', fontWeight: '500' },
  toolCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#E8E0D5', gap: 12 },
  toolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toolTitle: { fontSize: 15, color: '#2C2420', fontWeight: '500' },
  toolAction: { borderWidth: 1, borderColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  toolActionText: { fontSize: 12, color: '#C9A84C', fontWeight: '500' },
  toolDesc: { fontSize: 13, color: '#8C7B6E', lineHeight: 20, marginTop: -4 },
  promoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  promoInfo: { flex: 1, gap: 3 },
  promoTitle: { fontSize: 14, color: '#2C2420', fontWeight: '500' },
  promoMeta: { fontSize: 12, color: '#8C7B6E' },
  promoBadge: { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  promoBadgeText: { fontSize: 11, fontWeight: '500' },
  invoiceForm: { gap: 10, borderTopWidth: 1, borderTopColor: '#E8E0D5', paddingTop: 12 },
  invoiceInput: { backgroundColor: '#F5F0E8', borderRadius: 8, borderWidth: 1, borderColor: '#E8E0D5', paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, color: '#2C2420' },
  gstPreview: { backgroundColor: '#F5F0E8', borderRadius: 8, padding: 12, gap: 4 },
  gstPreviewText: { fontSize: 13, color: '#8C7B6E' },
  gstPreviewTotal: { fontSize: 14, color: '#2C2420', fontWeight: '600' },
  generateBtn: { backgroundColor: '#2C2420', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  generateBtnText: { fontSize: 14, color: '#F5F0E8', fontWeight: '500' },
  paymentTrackerRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E8E0D5', paddingTop: 12 },
  paymentTrackerItem: { flex: 1, alignItems: 'center', gap: 4 },
  paymentTrackerDivider: { width: 1, backgroundColor: '#E8E0D5' },
  paymentTrackerAmount: { fontSize: 18, color: '#2C2420', fontWeight: '500' },
  paymentTrackerLabel: { fontSize: 11, color: '#8C7B6E' },
  analyticsList: { borderTopWidth: 1, borderTopColor: '#E8E0D5', overflow: 'hidden' },
  analyticsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  analyticsPhoto: { fontSize: 13, color: '#2C2420', fontWeight: '500' },
  analyticsStats: { fontSize: 12, color: '#8C7B6E' },
  gstRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E8E0D5', paddingTop: 12 },
  gstItem: { flex: 1, alignItems: 'center', gap: 4 },
  gstAmount: { fontSize: 16, color: '#2C2420', fontWeight: '500' },
  gstLabel: { fontSize: 11, color: '#8C7B6E' },
  ratingOverview: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E8E0D5' },
  ratingBig: { fontSize: 48, color: '#2C2420', fontWeight: '300' },
  ratingStars: { fontSize: 20, color: '#C9A84C' },
  ratingCount: { fontSize: 13, color: '#8C7B6E' },
  ratingNote: { fontSize: 11, color: '#8C7B6E', textAlign: 'center', fontStyle: 'italic' },
  reviewCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8E0D5', gap: 12 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' },
  reviewAvatarText: { fontSize: 16, color: '#C9A84C', fontWeight: '400' },
  reviewInfo: { flex: 1, gap: 2 },
  reviewName: { fontSize: 14, color: '#2C2420', fontWeight: '500' },
  reviewFunction: { fontSize: 12, color: '#8C7B6E' },
  reviewRating: { fontSize: 13, color: '#C9A84C' },
  videoThumb: { backgroundColor: '#2C2420', borderRadius: 8, paddingVertical: 20, alignItems: 'center' },
  videoThumbText: { fontSize: 14, color: '#F5F0E8', letterSpacing: 0.5 },
  clientCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E8E0D5', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientInfo: { gap: 3 },
  clientName: { fontSize: 15, color: '#2C2420', fontWeight: '500' },
  clientPhone: { fontSize: 12, color: '#8C7B6E' },
  clientDate: { fontSize: 12, color: '#C9A84C' },
  inviteBtn: { backgroundColor: '#2C2420', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  inviteBtnDone: { backgroundColor: '#E8E0D5' },
  inviteBtnText: { fontSize: 12, color: '#C9A84C', fontWeight: '500' },
  inviteBtnTextDone: { color: '#8C7B6E' },
  addClientBtn: { backgroundColor: '#2C2420', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addClientBtnText: { fontSize: 12, color: '#C9A84C', fontWeight: '500' },
  viralCard: { backgroundColor: '#2C2420', borderRadius: 14, padding: 18, gap: 8 },
  viralTitle: { fontSize: 15, color: '#C9A84C', fontWeight: '500' },
  viralText: { fontSize: 13, color: '#B8A99A', lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#F5F0E8', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, gap: 14 },
  modalTitle: { fontSize: 22, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5 },
  modalSubtitle: { fontSize: 13, color: '#8C7B6E', marginTop: -8, lineHeight: 20 },
  modalInput: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E8E0D5', paddingVertical: 14, paddingHorizontal: 16, fontSize: 14, color: '#2C2420' },
  modalBtn: { backgroundColor: '#2C2420', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  modalBtnText: { fontSize: 15, color: '#F5F0E8', fontWeight: '500' },
  modalCancel: { alignItems: 'center', paddingVertical: 8 },
  modalCancelText: { fontSize: 14, color: '#8C7B6E' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20, paddingBottom: 32, borderTopWidth: 1, borderTopColor: '#E8E0D5', backgroundColor: '#F5F0E8' },
  navItem: { alignItems: 'center' },
  navLabel: { fontSize: 14, color: '#8C7B6E', fontWeight: '500' },
  navActive: { color: '#2C2420' },
});