import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, TextInput
} from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const TABS = ['Overview', 'Inquiries', 'Calendar', 'Tools', 'Reviews'];

const MOCK_INQUIRIES = [
  {
    id: '1',
    name: 'Priya & Rahul',
    function: 'Wedding',
    date: 'December 15, 2025',
    message: 'Hi, I\'m Priya, interested in Photography for Wedding on Dec 15. Are you available?',
    status: 'new',
  },
  {
    id: '2',
    name: 'Sneha & Arjun',
    function: 'Sangeet',
    date: 'November 20, 2025',
    message: 'Hi, I\'m Sneha, interested in Photography for Sangeet on Nov 20. Are you available?',
    status: 'replied',
  },
  {
    id: '3',
    name: 'Ananya & Dev',
    function: 'Reception',
    date: 'January 5, 2026',
    message: 'Hi, I\'m Ananya, interested in Photography for Reception on Jan 5. Are you available?',
    status: 'new',
  },
];

const BLOCKED_DATES = [
  'Dec 10, 2025',
  'Dec 15, 2025',
  'Dec 22, 2025',
  'Jan 1, 2026',
];

const LEAD_PIPELINE = [
  { id: '1', name: 'Priya & Rahul', stage: 'New Inquiry', date: 'Dec 15', value: '₹3,00,000' },
  { id: '2', name: 'Sneha & Arjun', stage: 'Quoted', date: 'Nov 20', value: '₹1,50,000' },
  { id: '3', name: 'Ananya & Dev', stage: 'New Inquiry', date: 'Jan 5', value: '₹3,00,000' },
  { id: '4', name: 'Kavya & Rohan', stage: 'Token Received', date: 'Feb 14', value: '₹3,00,000' },
  { id: '5', name: 'Meera & Vikram', stage: 'Completed', date: 'Oct 10', value: '₹3,00,000' },
];

const STAGE_COLORS: Record<string, string> = {
  'New Inquiry': '#C9A84C',
  'Quoted': '#8C7B6E',
  'Token Received': '#4CAF50',
  'Completed': '#2C2420',
};

export default function VendorDashboardScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Overview');
  const [isLive, setIsLive] = useState(true);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceClient, setInvoiceClient] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.businessName}>Arjun Mehta Photography</Text>
          <Text style={styles.category}>Photographer · Delhi NCR</Text>
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabContent}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >

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
                <Text style={styles.subscriptionPlan}>Premium Plan</Text>
                <Text style={styles.subscriptionDetail}>Renews January 1, 2026</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
              </View>
            </View>

            {/* Benchmark */}
            <View style={styles.benchmarkCard}>
              <Text style={styles.benchmarkTitle}>Market Benchmark</Text>
              <Text style={styles.benchmarkText}>
                Your starting price of ₹80,000 is 15% below the average for candid photographers in Delhi NCR (₹94,000). Consider revising your pricing.
              </Text>
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
              <TouchableOpacity style={styles.actionCard} onPress={() => setActiveTab('Tools')}>
                <Text style={styles.actionNumber}>5</Text>
                <Text style={styles.actionLabel}>Tools</Text>
              </TouchableOpacity>
            </View>

 <TouchableOpacity
          style={styles.previewBtn}
          onPress={() => router.push('/vendor-preview')}
        >
          <Text style={styles.previewBtnText}>Preview your profile as couples see it →</Text>
        </TouchableOpacity>

          </View>
        )}

        {/* INQUIRIES */}
        {activeTab === 'Inquiries' && (
          <View style={styles.tabPane}>

            <Text style={styles.sectionLabel}>Lead Pipeline</Text>
            <View style={styles.listCard}>
              {LEAD_PIPELINE.map((lead, index) => (
                <View key={lead.id}>
                  <View style={styles.leadRow}>
                    <View style={styles.leadInfo}>
                      <Text style={styles.leadName}>{lead.name}</Text>
                      <Text style={styles.leadDate}>{lead.date}</Text>
                    </View>
                    <View style={styles.leadRight}>
                      <Text style={styles.leadValue}>{lead.value}</Text>
                      <View style={[styles.stageBadge, { backgroundColor: STAGE_COLORS[lead.stage] + '20' }]}>
                        <Text style={[styles.stageBadgeText, { color: STAGE_COLORS[lead.stage] }]}>
                          {lead.stage}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {index < LEAD_PIPELINE.length - 1 && <View style={styles.listDivider} />}
                </View>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Incoming Inquiries</Text>
            {MOCK_INQUIRIES.map(inquiry => (
              <View key={inquiry.id} style={styles.inquiryCard}>
                <View style={styles.inquiryTop}>
                  <View>
                    <Text style={styles.inquiryName}>{inquiry.name}</Text>
                    <Text style={styles.inquiryMeta}>{inquiry.function} · {inquiry.date}</Text>
                  </View>
                  <View style={[
                    styles.inquiryBadge,
                    { backgroundColor: inquiry.status === 'new' ? '#C9A84C20' : '#E8E0D5' }
                  ]}>
                    <Text style={[
                      styles.inquiryBadgeText,
                      { color: inquiry.status === 'new' ? '#C9A84C' : '#8C7B6E' }
                    ]}>
                      {inquiry.status === 'new' ? 'New' : 'Replied'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.inquiryMessage} numberOfLines={2}>
                  "{inquiry.message}"
                </Text>
                {inquiry.status === 'new' && (
                  <View style={styles.inquiryActions}>
                    <TouchableOpacity style={styles.replyBtn}>
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
            <Text style={styles.calendarHint}>
              Block dates you're already booked so you don't appear in couples' filtered search
            </Text>

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

            <TouchableOpacity style={styles.blockDateBtn}>
              <Text style={styles.blockDateBtnText}>+ Block a Date</Text>
            </TouchableOpacity>

          </View>
        )}

        {/* TOOLS */}
        {activeTab === 'Tools' && (
          <View style={styles.tabPane}>

            <Text style={styles.sectionLabel}>Business Tools</Text>

            {/* Invoice Generator */}
            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>Invoice Generator</Text>
                <TouchableOpacity
                  style={styles.toolAction}
                  onPress={() => setShowInvoiceForm(!showInvoiceForm)}
                >
                  <Text style={styles.toolActionText}>
                    {showInvoiceForm ? 'Cancel' : 'Create Invoice'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>Create and send professional invoices to clients</Text>

              {showInvoiceForm && (
                <View style={styles.invoiceForm}>
                  <TextInput
                    style={styles.invoiceInput}
                    placeholder="Client name"
                    placeholderTextColor="#8C7B6E"
                    value={invoiceClient}
                    onChangeText={setInvoiceClient}
                  />
                  <TextInput
                    style={styles.invoiceInput}
                    placeholder="Amount (₹)"
                    placeholderTextColor="#8C7B6E"
                    value={invoiceAmount}
                    onChangeText={setInvoiceAmount}
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity style={styles.generateBtn}>
                    <Text style={styles.generateBtnText}>Generate Invoice</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Contract Templates */}
            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>Contract Templates</Text>
                <TouchableOpacity style={styles.toolAction}>
                  <Text style={styles.toolActionText}>View</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>Standard wedding photography contracts ready to send</Text>
              <View style={styles.templateList}>
                {['Full Day Coverage', 'Pre-Wedding Shoot', 'Album Package'].map((template, index, arr) => (
                  <View key={template}>
                    <TouchableOpacity style={styles.templateRow}>
                      <Text style={styles.templateName}>{template}</Text>
                      <Text style={styles.templateArrow}>›</Text>
                    </TouchableOpacity>
                    {index < arr.length - 1 && <View style={styles.listDivider} />}
                  </View>
                ))}
              </View>
            </View>

            {/* Payment Tracker */}
            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>Payment Tracker</Text>
                <TouchableOpacity style={styles.toolAction}>
                  <Text style={styles.toolActionText}>View All</Text>
                </TouchableOpacity>
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

            {/* Portfolio Analytics */}
            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>Portfolio Analytics</Text>
                <TouchableOpacity style={styles.toolAction}>
                  <Text style={styles.toolActionText}>View</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>See which photos get the most saves and views</Text>
              <View style={styles.analyticsList}>
                {[
                  { photo: 'Beach Wedding Shot', saves: 47, views: 312 },
                  { photo: 'Bridal Portrait', saves: 38, views: 289 },
                  { photo: 'Candid Reception', saves: 31, views: 198 },
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

            {/* GST Summary */}
            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>GST & Tax Summary</Text>
                <TouchableOpacity style={styles.toolAction}>
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

            {/* Referral */}
            <View style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolTitle}>Refer a Vendor</Text>
                <TouchableOpacity style={styles.toolAction}>
                  <Text style={styles.toolActionText}>Share Link</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.toolDesc}>Refer another vendor and get 1 month subscription free</Text>
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
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/login')}>
          <Text style={styles.navLabel}>Log Out</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  businessName: {
    fontSize: 18,
    color: '#2C2420',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  category: {
    fontSize: 13,
    color: '#8C7B6E',
    marginTop: 3,
  },
  liveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  liveToggleActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF5010',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8C7B6E',
  },
  liveDotActive: {
    backgroundColor: '#4CAF50',
  },
  liveToggleText: {
    fontSize: 13,
    color: '#8C7B6E',
    fontWeight: '500',
  },
  liveToggleTextActive: {
    color: '#4CAF50',
  },
  tabScroll: {
    maxHeight: 44,
    marginBottom: 16,
  },
  tabContent: {
    paddingHorizontal: 24,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    backgroundColor: '#FFFFFF',
  },
  tabActive: {
    backgroundColor: '#2C2420',
    borderColor: '#2C2420',
  },
  tabText: {
    fontSize: 13,
    color: '#2C2420',
  },
  tabTextActive: {
    color: '#F5F0E8',
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  tabPane: {
    gap: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  statNumber: {
    fontSize: 24,
    color: '#2C2420',
    fontWeight: '400',
  },
  statLabel: {
    fontSize: 11,
    color: '#8C7B6E',
    textAlign: 'center',
  },
  revenueCard: {
    backgroundColor: '#2C2420',
    borderRadius: 14,
    padding: 20,
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revenueItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  revenueDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#3C3430',
  },
  revenueAmount: {
    fontSize: 22,
    color: '#C9A84C',
    fontWeight: '400',
  },
  revenueLabel: {
    fontSize: 11,
    color: '#8C7B6E',
  },
  subscriptionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  subscriptionPlan: {
    fontSize: 15,
    color: '#2C2420',
    fontWeight: '500',
  },
  subscriptionDetail: {
    fontSize: 12,
    color: '#8C7B6E',
    marginTop: 3,
  },
  verifiedBadge: {
    backgroundColor: '#C9A84C',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  verifiedBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  benchmarkCard: {
    backgroundColor: '#FFF8EC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8D9B5',
    gap: 8,
  },
  benchmarkTitle: {
    fontSize: 13,
    color: '#2C2420',
    fontWeight: '500',
  },
  benchmarkText: {
    fontSize: 13,
    color: '#8C7B6E',
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#8C7B6E',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  actionNumber: {
    fontSize: 22,
    color: '#C9A84C',
    fontWeight: '500',
  },
  actionLabel: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  previewBtn: {
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  previewBtnText: {
    fontSize: 13,
    color: '#C9A84C',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    overflow: 'hidden',
  },
  listDivider: {
    height: 1,
    backgroundColor: '#E8E0D5',
    marginHorizontal: 16,
  },
  leadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  leadInfo: {
    gap: 3,
  },
  leadName: {
    fontSize: 14,
    color: '#2C2420',
    fontWeight: '500',
  },
  leadDate: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  leadRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  leadValue: {
    fontSize: 13,
    color: '#2C2420',
    fontWeight: '500',
  },
  stageBadge: {
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stageBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  inquiryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    gap: 10,
  },
  inquiryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  inquiryName: {
    fontSize: 15,
    color: '#2C2420',
    fontWeight: '500',
  },
  inquiryMeta: {
    fontSize: 12,
    color: '#8C7B6E',
    marginTop: 2,
  },
  inquiryBadge: {
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  inquiryBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  inquiryMessage: {
    fontSize: 13,
    color: '#8C7B6E',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  inquiryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  replyBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  replyBtnText: {
    fontSize: 13,
    color: '#2C2420',
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#2C2420',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    color: '#F5F0E8',
    fontWeight: '500',
  },
  calendarHint: {
    fontSize: 13,
    color: '#8C7B6E',
    lineHeight: 20,
  },
  blockedHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D5',
  },
  blockedTitle: {
    fontSize: 13,
    color: '#8C7B6E',
    fontWeight: '500',
  },
  blockedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  blockedDate: {
    fontSize: 14,
    color: '#2C2420',
  },
  unblockBtn: {
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  unblockBtnText: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  blockDateBtn: {
    borderWidth: 1,
    borderColor: '#C9A84C',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  blockDateBtnText: {
    fontSize: 14,
    color: '#C9A84C',
    fontWeight: '500',
  },
  toolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    gap: 12,
  },
  toolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toolTitle: {
    fontSize: 15,
    color: '#2C2420',
    fontWeight: '500',
  },
  toolAction: {
    borderWidth: 1,
    borderColor: '#C9A84C',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toolActionText: {
    fontSize: 12,
    color: '#C9A84C',
    fontWeight: '500',
  },
  toolDesc: {
    fontSize: 13,
    color: '#8C7B6E',
    lineHeight: 20,
    marginTop: -4,
  },
  invoiceForm: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
    paddingTop: 12,
  },
  invoiceInput: {
    backgroundColor: '#F5F0E8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#2C2420',
  },
  generateBtn: {
    backgroundColor: '#2C2420',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  generateBtnText: {
    fontSize: 14,
    color: '#F5F0E8',
    fontWeight: '500',
  },
  templateList: {
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
    overflow: 'hidden',
  },
  templateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  templateName: {
    fontSize: 14,
    color: '#2C2420',
  },
  templateArrow: {
    fontSize: 18,
    color: '#C9A84C',
  },
  paymentTrackerRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
    paddingTop: 12,
  },
  paymentTrackerItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  paymentTrackerDivider: {
    width: 1,
    backgroundColor: '#E8E0D5',
  },
  paymentTrackerAmount: {
    fontSize: 18,
    color: '#2C2420',
    fontWeight: '500',
  },
  paymentTrackerLabel: {
    fontSize: 11,
    color: '#8C7B6E',
  },
  analyticsList: {
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
    overflow: 'hidden',
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  analyticsPhoto: {
    fontSize: 13,
    color: '#2C2420',
    fontWeight: '500',
  },
  analyticsStats: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  gstRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
    paddingTop: 12,
  },
  gstItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  gstAmount: {
    fontSize: 16,
    color: '#2C2420',
    fontWeight: '500',
  },
  gstLabel: {
    fontSize: 11,
    color: '#8C7B6E',
  },
  ratingOverview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  ratingBig: {
    fontSize: 48,
    color: '#2C2420',
    fontWeight: '300',
  },
  ratingStars: {
    fontSize: 20,
    color: '#C9A84C',
  },
  ratingCount: {
    fontSize: 13,
    color: '#8C7B6E',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    gap: 12,
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewAvatarText: {
    fontSize: 16,
    color: '#C9A84C',
    fontWeight: '400',
  },
  reviewInfo: {
    flex: 1,
    gap: 2,
  },
  reviewName: {
    fontSize: 14,
    color: '#2C2420',
    fontWeight: '500',
  },
  reviewFunction: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  reviewRating: {
    fontSize: 13,
    color: '#C9A84C',
  },
  videoThumb: {
    backgroundColor: '#2C2420',
    borderRadius: 8,
    paddingVertical: 20,
    alignItems: 'center',
  },
  videoThumbText: {
    fontSize: 14,
    color: '#F5F0E8',
    letterSpacing: 0.5,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
    backgroundColor: '#F5F0E8',
  },
  navItem: {
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 14,
    color: '#8C7B6E',
    fontWeight: '500',
  },
  navActive: {
    color: '#2C2420',
  },
});