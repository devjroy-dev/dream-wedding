import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');
const API = 'https://dream-wedding-production-89ae.up.railway.app';

// ── Luxury Categories ────────────────────────────────────────────────────────

const LUXURY_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'designer', label: 'Designers' },
  { id: 'mua', label: 'MUAs' },
  { id: 'venue', label: 'Venues' },
  { id: 'photographer', label: 'Photographers' },
  { id: 'jeweller', label: 'Jewellery' },
  { id: 'honeymoon', label: 'Honeymoons' },
];

// ── Price Tier Labels ────────────────────────────────────────────────────────

const PRICE_TIER: Record<string, string> = {
  premium: 'Premium',
  ultra_premium: 'Ultra-Premium',
  bespoke: 'Bespoke',
};

// ── Mock Luxury Vendors (until backend serves real data) ─────────────────────

const MOCK_LUXURY_VENDORS = [
  {
    id: 'lv1', name: 'Atelier Elegance', category: 'designer', city: 'Delhi',
    tagline: 'Couture bridal wear for the modern Indian bride',
    price_tier: 'ultra_premium', weddings_completed: 340,
    appointment_fee: 500000, // paisa = Rs.5,000
    photos: ['https://images.unsplash.com/photo-1519741497674-611481863552?w=800', 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800'],
    destination_tags: ['Delhi', 'Mumbai', 'Udaipur'],
  },
  {
    id: 'lv2', name: 'Priya Arora Artistry', category: 'mua', city: 'Mumbai',
    tagline: 'Redefining bridal beauty since 2008',
    price_tier: 'premium', weddings_completed: 520,
    appointment_fee: 300000,
    photos: ['https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=800', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800'],
    destination_tags: ['Mumbai', 'Goa', 'Jaipur'],
  },
  {
    id: 'lv3', name: 'The Grand Heritage', category: 'venue', city: 'Udaipur',
    tagline: 'A palace that writes its own love stories',
    price_tier: 'bespoke', weddings_completed: 180,
    appointment_fee: 500000,
    photos: ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800', 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800'],
    destination_tags: ['Udaipur'],
  },
  {
    id: 'lv4', name: 'Ravi Sharma Films', category: 'photographer', city: 'Delhi',
    tagline: 'Cinema-grade wedding films and editorial photography',
    price_tier: 'premium', weddings_completed: 680,
    appointment_fee: 200000,
    photos: ['https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800', 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800'],
    destination_tags: ['Delhi', 'Jaipur', 'Goa', 'International'],
  },
  {
    id: 'lv5', name: 'Mehrasons Heritage', category: 'jeweller', city: 'Delhi',
    tagline: 'Four generations of bridal jewellery excellence',
    price_tier: 'ultra_premium', weddings_completed: 0,
    appointment_fee: 0,
    photos: ['https://images.unsplash.com/photo-1515562141589-67f0d4da8539?w=800', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800'],
    destination_tags: ['Delhi'],
  },
  {
    id: 'lv6', name: 'Paradise Honeymoons', category: 'honeymoon', city: 'Pan-India',
    tagline: 'Curated luxury escapes for newlyweds',
    price_tier: 'premium', weddings_completed: 0,
    appointment_fee: 0,
    photos: ['https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800', 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800'],
    destination_tags: ['Maldives', 'Bali', 'Switzerland', 'Greece'],
  },
];

// ── Vendor Card Component ────────────────────────────────────────────────────

function LuxuryVendorCard({ vendor, onPress }: { vendor: any; onPress: () => void }) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeIn }}>
      <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.9}>
        {/* Hero Image */}
        <View style={cardStyles.imageWrap}>
          <Image source={{ uri: vendor.photos[0] }} style={cardStyles.image} resizeMode="cover" />
          <View style={cardStyles.imageOverlay} />
          {/* Category pill on image */}
          <View style={cardStyles.categoryPill}>
            <Text style={cardStyles.categoryText}>
              {LUXURY_CATEGORIES.find(c => c.id === vendor.category)?.label || vendor.category}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View style={cardStyles.info}>
          <Text style={cardStyles.name}>{vendor.name}</Text>
          <Text style={cardStyles.city}>{vendor.city}</Text>
          <View style={cardStyles.divider} />
          <Text style={cardStyles.tagline} numberOfLines={2}>{vendor.tagline}</Text>
          <View style={cardStyles.metaRow}>
            {vendor.price_tier && (
              <View style={cardStyles.tierPill}>
                <Text style={cardStyles.tierText}>{PRICE_TIER[vendor.price_tier] || vendor.price_tier}</Text>
              </View>
            )}
            {vendor.weddings_completed > 0 && (
              <Text style={cardStyles.weddings}>{vendor.weddings_completed}+ weddings</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E0D5',
    marginBottom: 20,
  },
  imageWrap: {
    width: '100%',
    height: 260,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent',
  },
  categoryPill: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(44,36,32,0.75)',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  categoryText: {
    fontSize: 10,
    color: '#F5F0E8',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  info: {
    padding: 20,
    gap: 6,
  },
  name: {
    fontSize: 22,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_600SemiBold',
    letterSpacing: 0.3,
  },
  city: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_400Regular',
    letterSpacing: 0.5,
  },
  divider: {
    width: 24,
    height: 1,
    backgroundColor: '#C9A84C',
    marginVertical: 6,
    opacity: 0.5,
  },
  tagline: {
    fontSize: 14,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  tierPill: {
    backgroundColor: '#2C2420',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tierText: {
    fontSize: 10,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.5,
  },
  weddings: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
  },
});

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function LuxuryBrowseScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('all');
  const [vendors, setVendors] = useState<any[]>(MOCK_LUXURY_VENDORS);
  const [loading, setLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showAppointment, setShowAppointment] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [userSession, setUserSession] = useState<any>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    loadUserSession();
    loadLuxuryVendors();
  }, []);

  const loadUserSession = async () => {
    try {
      const stored = await AsyncStorage.getItem('user_session');
      if (stored) setUserSession(JSON.parse(stored));
    } catch (e) {}
  };

  const loadLuxuryVendors = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/luxury/vendors`);
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        setVendors(data.data);
      }
      // Falls back to mock data if API doesn't exist yet
    } catch (e) {}
    finally { setLoading(false); }
  };

  const filteredVendors = activeCategory === 'all'
    ? vendors
    : vendors.filter(v => v.category === activeCategory);

  const handleOpenPreview = (vendor: any) => {
    setSelectedVendor(vendor);
    setActivePhotoIndex(0);
    setShowPreview(true);
  };

  const handleBookAppointment = () => {
    if (!userSession) {
      Alert.alert('Sign In Required', 'Please sign in to book an appointment.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/login') },
      ]);
      return;
    }
    setShowAppointment(true);
  };

  const handleConfirmAppointment = async () => {
    if (!selectedVendor || !userSession) return;
    try {
      setBookingInProgress(true);
      // In production, this triggers Razorpay
      // For now, simulate the appointment request
      const res = await fetch(`${API}/api/luxury/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: selectedVendor.id,
          couple_id: userSession.userId,
          appointment_fee: selectedVendor.appointment_fee,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAppointment(false);
        setShowPreview(false);
        Alert.alert(
          'Appointment Requested',
          `Your appointment request has been sent to ${selectedVendor.name}. They have 48 hours to confirm. If they don't respond, you'll receive a full refund.`,
          [{ text: 'OK' }]
        );
      } else {
        // Mock success for demo
        setShowAppointment(false);
        setShowPreview(false);
        Alert.alert(
          'Appointment Requested',
          `Your appointment request has been sent to ${selectedVendor.name}. They have 48 hours to confirm. If they don't respond, you'll receive a full refund.`,
          [{ text: 'OK' }]
        );
      }
    } catch (e) {
      // Mock success for demo
      setShowAppointment(false);
      setShowPreview(false);
      Alert.alert(
        'Appointment Requested',
        `Your appointment request has been sent to ${selectedVendor.name}. They have 48 hours to confirm. If they don't respond, you'll receive a full refund.`,
        [{ text: 'OK' }]
      );
    } finally {
      setBookingInProgress(false);
    }
  };

  const isHoneymoon = selectedVendor?.category === 'honeymoon';
  const isJeweller = selectedVendor?.category === 'jeweller';
  const hasAppointmentFee = selectedVendor?.appointment_fee > 0;

  return (
    <View style={s.container}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={18} color="#2C2420" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>THE DREAM WEDDING</Text>
          <Text style={s.headerSub}>C U R A T E D</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Category Tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabsContent}
        style={s.tabsScroll}
      >
        {LUXURY_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[s.tab, activeCategory === cat.id && s.tabActive]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Text style={[s.tabText, activeCategory === cat.id && s.tabTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Vendor List ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
      >
        {/* Section intro */}
        <View style={s.introWrap}>
          <View style={s.introDivider} />
          <Text style={s.introText}>
            {activeCategory === 'honeymoon'
              ? 'Curated luxury escapes to begin your journey together'
              : activeCategory === 'all'
                ? 'India\'s most distinguished wedding professionals'
                : `Handpicked ${LUXURY_CATEGORIES.find(c => c.id === activeCategory)?.label?.toLowerCase() || 'vendors'} for the discerning couple`
            }
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#C9A84C" style={{ paddingVertical: 40 }} />
        ) : filteredVendors.length === 0 ? (
          <View style={s.emptyWrap}>
            <Feather name="search" size={32} color="#E8E0D5" />
            <Text style={s.emptyTitle}>Coming Soon</Text>
            <Text style={s.emptyText}>We are curating the finest vendors in this category</Text>
          </View>
        ) : (
          filteredVendors.map(vendor => (
            <LuxuryVendorCard
              key={vendor.id}
              vendor={vendor}
              onPress={() => handleOpenPreview(vendor)}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════
          VENDOR PREVIEW MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <Modal visible={showPreview} animationType="slide" presentationStyle="pageSheet">
        {selectedVendor && (
          <View style={s.previewContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Photo Gallery */}
              <View style={s.galleryWrap}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                    setActivePhotoIndex(idx);
                  }}
                >
                  {selectedVendor.photos.map((photo: string, idx: number) => (
                    <Image key={idx} source={{ uri: photo }} style={s.galleryImage} resizeMode="cover" />
                  ))}
                </ScrollView>
                {/* Photo indicators */}
                <View style={s.indicators}>
                  {selectedVendor.photos.map((_: string, idx: number) => (
                    <View key={idx} style={[s.indicator, activePhotoIndex === idx && s.indicatorActive]} />
                  ))}
                </View>
                {/* Close button */}
                <TouchableOpacity style={s.closeBtn} onPress={() => setShowPreview(false)}>
                  <Feather name="x" size={18} color="#F5F0E8" />
                </TouchableOpacity>
              </View>

              {/* Vendor Info */}
              <View style={s.previewInfo}>
                <View style={s.previewCategoryRow}>
                  <Text style={s.previewCategory}>
                    {LUXURY_CATEGORIES.find(c => c.id === selectedVendor.category)?.label || ''}
                  </Text>
                  <View style={s.previewDot} />
                  <Text style={s.previewCity}>{selectedVendor.city}</Text>
                </View>

                <Text style={s.previewName}>{selectedVendor.name}</Text>

                <View style={s.previewGoldLine} />

                <Text style={s.previewTagline}>{selectedVendor.tagline}</Text>

                {/* Meta */}
                <View style={s.previewMetaRow}>
                  {selectedVendor.price_tier && (
                    <View style={s.previewTierPill}>
                      <Text style={s.previewTierText}>{PRICE_TIER[selectedVendor.price_tier]}</Text>
                    </View>
                  )}
                  {selectedVendor.weddings_completed > 0 && (
                    <View style={s.previewStatBox}>
                      <Text style={s.previewStatNum}>{selectedVendor.weddings_completed}+</Text>
                      <Text style={s.previewStatLabel}>Weddings</Text>
                    </View>
                  )}
                </View>

                {/* Destinations */}
                {selectedVendor.destination_tags?.length > 0 && (
                  <View style={s.destWrap}>
                    <Text style={s.destLabel}>
                      {isHoneymoon ? 'DESTINATIONS' : 'AVAILABLE IN'}
                    </Text>
                    <View style={s.destRow}>
                      {selectedVendor.destination_tags.map((tag: string) => (
                        <View key={tag} style={s.destPill}>
                          <Text style={s.destText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Appointment / Action Section */}
                <View style={s.actionSection}>
                  {isHoneymoon ? (
                    <>
                      <TouchableOpacity style={s.primaryAction} onPress={() => {
                        Alert.alert('Request Sent', 'A travel advisor will contact you within 24 hours with curated honeymoon packages.');
                        setShowPreview(false);
                      }}>
                        <Feather name="send" size={14} color="#2C2420" />
                        <Text style={s.primaryActionText}>REQUEST QUOTE</Text>
                      </TouchableOpacity>
                      <Text style={s.actionHint}>A travel advisor will reach out within 24 hours</Text>
                    </>
                  ) : isJeweller ? (
                    <>
                      <TouchableOpacity style={s.primaryAction} onPress={() => {
                        Alert.alert('Visit Scheduled', 'The showroom will contact you to confirm your visit.');
                        setShowPreview(false);
                      }}>
                        <Feather name="calendar" size={14} color="#2C2420" />
                        <Text style={s.primaryActionText}>SCHEDULE VISIT</Text>
                      </TouchableOpacity>
                      <Text style={s.actionHint}>Complimentary showroom visit</Text>
                    </>
                  ) : hasAppointmentFee ? (
                    <>
                      <TouchableOpacity style={s.primaryAction} onPress={handleBookAppointment}>
                        <Feather name="calendar" size={14} color="#2C2420" />
                        <Text style={s.primaryActionText}>BOOK APPOINTMENT</Text>
                      </TouchableOpacity>
                      <Text style={s.actionHint}>
                        Consultation fee: Rs.{(selectedVendor.appointment_fee / 100).toLocaleString('en-IN')} · Fully refundable if vendor declines
                      </Text>
                    </>
                  ) : (
                    <TouchableOpacity style={s.primaryAction} onPress={() => {
                      Alert.alert('Enquiry Sent', 'The vendor will respond within 48 hours.');
                      setShowPreview(false);
                    }}>
                      <Feather name="send" size={14} color="#2C2420" />
                      <Text style={s.primaryActionText}>SEND ENQUIRY</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          APPOINTMENT BOOKING MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <Modal visible={showAppointment} transparent animationType="slide">
        <View style={s.appointmentOverlay}>
          <View style={s.appointmentCard}>
            <View style={s.appointmentHeader}>
              <Text style={s.appointmentTitle}>Book Appointment</Text>
              <TouchableOpacity onPress={() => setShowAppointment(false)}>
                <Feather name="x" size={18} color="#8C7B6E" />
              </TouchableOpacity>
            </View>

            {selectedVendor && (
              <>
                <View style={s.appointmentVendor}>
                  <Text style={s.appointmentVendorName}>{selectedVendor.name}</Text>
                  <Text style={s.appointmentVendorCity}>{selectedVendor.city}</Text>
                </View>

                <View style={s.appointmentFeeBox}>
                  <View style={s.appointmentFeeRow}>
                    <Text style={s.appointmentFeeLabel}>Consultation Fee</Text>
                    <Text style={s.appointmentFeeAmount}>
                      Rs.{(selectedVendor.appointment_fee / 100).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={s.appointmentFeeDivider} />
                  <View style={s.appointmentGuarantee}>
                    <Feather name="shield" size={12} color="#4CAF50" />
                    <Text style={s.appointmentGuaranteeText}>
                      Full refund if vendor does not confirm within 48 hours
                    </Text>
                  </View>
                </View>

                <View style={s.appointmentTerms}>
                  <View style={s.appointmentTermRow}>
                    <Feather name="check" size={11} color="#C9A84C" />
                    <Text style={s.appointmentTermText}>Reserves a personal consultation slot</Text>
                  </View>
                  <View style={s.appointmentTermRow}>
                    <Feather name="check" size={11} color="#C9A84C" />
                    <Text style={s.appointmentTermText}>Vendor responds within 48 hours</Text>
                  </View>
                  <View style={s.appointmentTermRow}>
                    <Feather name="check" size={11} color="#C9A84C" />
                    <Text style={s.appointmentTermText}>Auto-refund if vendor declines or does not respond</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[s.payBtn, bookingInProgress && { opacity: 0.6 }]}
                  onPress={handleConfirmAppointment}
                  disabled={bookingInProgress}
                >
                  {bookingInProgress ? (
                    <ActivityIndicator color="#2C2420" />
                  ) : (
                    <>
                      <Feather name="lock" size={13} color="#2C2420" />
                      <Text style={s.payBtnText}>
                        PAY Rs.{(selectedVendor.appointment_fee / 100).toLocaleString('en-IN')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <Text style={s.razorpayHint}>Secured by Razorpay</Text>
              </>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFAF5' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E8E0D5', justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerTitle: {
    fontSize: 14, color: '#2C2420', fontFamily: 'PlayfairDisplay_600SemiBold',
    letterSpacing: 3,
  },
  headerSub: {
    fontSize: 9, color: '#C9A84C', fontFamily: 'DMSans_500Medium',
    letterSpacing: 4,
  },

  // Category Tabs
  tabsScroll: { maxHeight: 44 },
  tabsContent: { paddingHorizontal: 20, gap: 6, paddingBottom: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50,
    borderWidth: 1, borderColor: '#E8E0D5', backgroundColor: '#FFFFFF',
  },
  tabActive: {
    backgroundColor: '#2C2420', borderColor: '#2C2420',
  },
  tabText: {
    fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_400Regular',
    letterSpacing: 0.3,
  },
  tabTextActive: {
    color: '#F5F0E8', fontFamily: 'DMSans_500Medium',
  },

  // Content
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

  // Intro
  introWrap: { alignItems: 'center', gap: 10, marginBottom: 24 },
  introDivider: { width: 28, height: 1, backgroundColor: '#C9A84C', opacity: 0.4 },
  introText: {
    fontSize: 13, color: '#8C7B6E', fontFamily: 'PlayfairDisplay_400Regular',
    textAlign: 'center', lineHeight: 22, fontStyle: 'italic',
  },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  emptyText: { fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', textAlign: 'center' },

  // ── Preview Modal ──
  previewContainer: { flex: 1, backgroundColor: '#FDFAF5' },
  galleryWrap: { position: 'relative' },
  galleryImage: { width, height: width * 1.1 },
  indicators: {
    position: 'absolute', bottom: 16, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  indicator: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)',
  },
  indicatorActive: { backgroundColor: '#FFFFFF', width: 20 },
  closeBtn: {
    position: 'absolute', top: 56, right: 20,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(44,36,32,0.6)', justifyContent: 'center', alignItems: 'center',
  },

  previewInfo: { padding: 24, gap: 12 },
  previewCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewCategory: {
    fontSize: 10, color: '#C9A84C', fontFamily: 'DMSans_500Medium',
    letterSpacing: 2, textTransform: 'uppercase',
  },
  previewDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#E8E0D5' },
  previewCity: { fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_400Regular' },
  previewName: {
    fontSize: 28, color: '#2C2420', fontFamily: 'PlayfairDisplay_600SemiBold',
    letterSpacing: 0.3, lineHeight: 36,
  },
  previewGoldLine: { width: 32, height: 2, backgroundColor: '#C9A84C', opacity: 0.5 },
  previewTagline: {
    fontSize: 15, color: '#8C7B6E', fontFamily: 'DMSans_300Light',
    lineHeight: 24, letterSpacing: 0.2,
  },
  previewMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  previewTierPill: {
    backgroundColor: '#2C2420', borderRadius: 50,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  previewTierText: {
    fontSize: 11, color: '#C9A84C', fontFamily: 'DMSans_500Medium', letterSpacing: 0.5,
  },
  previewStatBox: { alignItems: 'center', gap: 2 },
  previewStatNum: { fontSize: 16, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular' },
  previewStatLabel: { fontSize: 9, color: '#8C7B6E', fontFamily: 'DMSans_300Light', letterSpacing: 0.5 },

  destWrap: { marginTop: 8, gap: 8 },
  destLabel: {
    fontSize: 10, color: '#8C7B6E', fontFamily: 'DMSans_500Medium',
    letterSpacing: 1.5,
  },
  destRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  destPill: {
    borderWidth: 1, borderColor: '#E8E0D5', borderRadius: 50,
    paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#FFFFFF',
  },
  destText: { fontSize: 11, color: '#2C2420', fontFamily: 'DMSans_400Regular' },

  // Action section
  actionSection: { marginTop: 16, gap: 8, paddingBottom: 40 },
  primaryAction: {
    backgroundColor: '#C9A84C', borderRadius: 12, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primaryActionText: {
    fontSize: 13, color: '#2C2420', fontFamily: 'DMSans_500Medium', letterSpacing: 1.5,
  },
  actionHint: {
    fontSize: 11, color: '#8C7B6E', fontFamily: 'DMSans_300Light',
    textAlign: 'center', lineHeight: 16,
  },

  // ── Appointment Modal ──
  appointmentOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  appointmentCard: {
    backgroundColor: '#FDFAF5', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, gap: 16,
  },
  appointmentHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  appointmentTitle: {
    fontSize: 22, color: '#2C2420', fontFamily: 'PlayfairDisplay_400Regular',
  },
  appointmentVendor: { gap: 2 },
  appointmentVendorName: {
    fontSize: 16, color: '#2C2420', fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  appointmentVendorCity: {
    fontSize: 12, color: '#8C7B6E', fontFamily: 'DMSans_300Light',
  },
  appointmentFeeBox: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#E8E0D5', gap: 12,
  },
  appointmentFeeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  appointmentFeeLabel: {
    fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_400Regular',
  },
  appointmentFeeAmount: {
    fontSize: 20, color: '#2C2420', fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  appointmentFeeDivider: { height: 1, backgroundColor: '#E8E0D5' },
  appointmentGuarantee: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  appointmentGuaranteeText: {
    flex: 1, fontSize: 12, color: '#4CAF50', fontFamily: 'DMSans_400Regular',
    lineHeight: 18,
  },
  appointmentTerms: { gap: 8 },
  appointmentTermRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appointmentTermText: {
    fontSize: 13, color: '#8C7B6E', fontFamily: 'DMSans_300Light', lineHeight: 18,
  },
  payBtn: {
    backgroundColor: '#C9A84C', borderRadius: 12, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  payBtnText: {
    fontSize: 14, color: '#2C2420', fontFamily: 'DMSans_500Medium', letterSpacing: 1,
  },
  razorpayHint: {
    fontSize: 10, color: '#B8ADA4', fontFamily: 'DMSans_300Light',
    textAlign: 'center', letterSpacing: 0.5,
  },
});
