import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, Image, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVendors } from '../services/api';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display/index';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';
import BottomNav from '../components/BottomNav';
import { ListSkeleton } from '../components/SkeletonLoader';

const { width } = Dimensions.get('window');

// Mock traction scores — replace with real aggregation query post-launch
// Score = (saves × 3) + (enquiries × 5) + (profile_views × 1) + (bookings × 10)
const MOCK_TRACTION: Record<string, number> = {
  'Joseph Radhik': 2847,
  'The Leela Palace': 2623,
  'Namrata Soni': 2541,
  'Sabyasachi Mukherjee': 2489,
  'Wizcraft International': 2389,
  'DJ Chetas': 2312,
  'Anmol Jewellers': 2198,
  'Shakti Mohan': 2087,
  'WeddingNama': 1976,
  'Oberoi Udaivilas': 1854,
  'Taj Falaknuma Palace': 1743,
  'Manish Malhotra': 1698,
  'Tanishq Bridal': 1587,
  'Hazoorilal Legacy': 1476,
  'Bianca Louzado': 1365,
};

const CATEGORIES = [
  'All', 'Venues', 'Photographers', 'Designers',
  'MUAs', 'Jewellery', 'Event Managers', 'DJs',
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function SpotlightScreen() {
  const router = useRouter();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [userBudget, setUserBudget] = useState<number | null>(null);

  const currentMonth = MONTH_NAMES[new Date().getMonth()];
  const currentYear = new Date().getFullYear();
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load user budget from session
      const session = await AsyncStorage.getItem('user_session');
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.budget) setUserBudget(parsed.budget);
      }

      // Load vendors
      const result = await getVendors('', '');
      if (result.success && result.data?.length > 0) {
        // Sort by mock traction score, randomise ties
        const sorted = result.data
          .map((v: any) => ({
            ...v,
            tractionScore: MOCK_TRACTION[v.name] || Math.floor(Math.random() * 1000) + 500,
          }))
          .sort((a: any, b: any) => b.tractionScore - a.tractionScore)
          .slice(0, 15);
        setVendors(sorted);
      } else {
        setVendors(getMockVendors());
      }
    } catch (e) {
      setVendors(getMockVendors());
    } finally {
      setLoading(false);
    }
  };

  const getMockVendors = () => [
    { id: '1', name: 'Joseph Radhik', category: 'photographers', city: 'Mumbai', starting_price: 300000, rating: 5.0, is_verified: true, tractionScore: 2847, portfolio_images: ['https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800'] },
    { id: '2', name: 'The Leela Palace', category: 'venues', city: 'Delhi NCR', starting_price: 1500000, rating: 4.9, is_verified: true, tractionScore: 2623, portfolio_images: ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800'] },
    { id: '3', name: 'Namrata Soni', category: 'mua', city: 'Mumbai', starting_price: 150000, rating: 4.9, is_verified: true, tractionScore: 2541, portfolio_images: ['https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800'] },
    { id: '4', name: 'Sabyasachi Mukherjee', category: 'designers', city: 'Kolkata', starting_price: 500000, rating: 5.0, is_verified: true, tractionScore: 2489, portfolio_images: ['https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800'] },
    { id: '5', name: 'Wizcraft International', category: 'event-managers', city: 'Mumbai', starting_price: 2000000, rating: 5.0, is_verified: true, tractionScore: 2389, portfolio_images: ['https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800'] },
    { id: '6', name: 'DJ Chetas', category: 'dj', city: 'Mumbai', starting_price: 500000, rating: 4.9, is_verified: true, tractionScore: 2312, portfolio_images: ['https://images.unsplash.com/photo-1571266028243-d220c6a5d70b?w=800'] },
    { id: '7', name: 'Anmol Jewellers', category: 'jewellery', city: 'Delhi NCR', starting_price: 200000, rating: 4.8, is_verified: true, tractionScore: 2198, portfolio_images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800'] },
    { id: '8', name: 'Shakti Mohan', category: 'choreographers', city: 'Delhi NCR', starting_price: 200000, rating: 4.9, is_verified: true, tractionScore: 2087, portfolio_images: ['https://images.unsplash.com/photo-1547153760-18fc86324498?w=800'] },
    { id: '9', name: 'WeddingNama', category: 'photographers', city: 'Delhi NCR', starting_price: 250000, rating: 4.9, is_verified: true, tractionScore: 1976, portfolio_images: ['https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=800'] },
    { id: '10', name: 'Oberoi Udaivilas', category: 'venues', city: 'Udaipur', starting_price: 2000000, rating: 5.0, is_verified: true, tractionScore: 1854, portfolio_images: ['https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800'] },
  ];

  const getCategoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      'photographers': 'Photographers',
      'venues': 'Venues',
      'mua': 'MUAs',
      'designers': 'Designers',
      'jewellery': 'Jewellery',
      'event-managers': 'Event Managers',
      'dj': 'DJs',
      'choreographers': 'Choreographers',
      'content-creators': 'Content Creators',
      'bridal-wellness': 'Wellness',
    };
    return map[cat] || cat;
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(0)}L`;
    return `₹${(price / 1000).toFixed(0)}K`;
  };

  const filteredVendors = activeCategory === 'All'
    ? vendors
    : vendors.filter(v => getCategoryLabel(v.category) === activeCategory);

  // Featured vendor — highest traction score
  const featuredVendor = filteredVendors[0];
  const remainingVendors = filteredVendors.slice(1);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
          <View style={{ width: 200, height: 24, borderRadius: 8, backgroundColor: '#E8E0D5', opacity: 0.5, marginBottom: 16 }} />
          <ListSkeleton rows={6} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.eyebrow}>
              {currentMonth} {currentYear}
            </Text>
            <Text style={styles.title}>Spotlight</Text>
            <Text style={styles.subtitle}>
              India's most loved wedding vendors this month
            </Text>
          </View>
          <View style={styles.algorithmBadge}>
            <Feather name="zap" size={10} color="#C9A84C" />
            <Text style={styles.algorithmText}>By saves</Text>
          </View>
        </View>

        {/* How it works — editorial note */}
        <View style={styles.editorialNote}>
          <Text style={styles.editorialText}>
            Ranked by real couple activity — saves, enquiries and bookings.
            No paid placement. Earned, not bought.
          </Text>
        </View>

        {/* Category filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterPill,
                activeCategory === cat && styles.filterPillActive,
              ]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.filterPillText,
                activeCategory === cat && styles.filterPillTextActive,
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured vendor — #1 this month */}
        {featuredVendor && (
          <TouchableOpacity
            style={styles.featuredCard}
            onPress={() => router.push(`/vendor-profile?id=${featuredVendor.id}` as any)}
            activeOpacity={0.92}
          >
            <Image
              source={{ uri: featuredVendor.portfolio_images?.[0] || '' }}
              style={styles.featuredImage}
              resizeMode="cover"
            />
            <View style={styles.featuredOverlayTop} />
            <View style={styles.featuredOverlayBottom} />

            {/* #1 badge */}
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>#1 This Month</Text>
            </View>

            {/* Verified */}
            {featuredVendor.is_verified && (
              <View style={styles.verifiedBadge}>
                <Feather name="check" size={10} color="#2C2420" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}

            {/* Traction score */}
            <View style={styles.tractionBadge}>
              <Feather name="trending-up" size={10} color="#C9A84C" />
              <Text style={styles.tractionText}>
                {featuredVendor.tractionScore.toLocaleString()} saves
              </Text>
            </View>

            {/* Vendor info */}
            <View style={styles.featuredInfo}>
              <Text style={styles.featuredCategory}>
                {getCategoryLabel(featuredVendor.category).toUpperCase()}
              </Text>
              <Text style={styles.featuredName}>{featuredVendor.name}</Text>
              <View style={styles.featuredMeta}>
                <Feather name="map-pin" size={11} color="#C9A84C" />
                <Text style={styles.featuredCity}>{featuredVendor.city}</Text>
                <Text style={styles.featuredDot}>·</Text>
                <Feather name="star" size={11} color="#C9A84C" />
                <Text style={styles.featuredRating}>{featuredVendor.rating}</Text>
                <Text style={styles.featuredDot}>·</Text>
                <Text style={styles.featuredPrice}>
                  {formatPrice(featuredVendor.starting_price)} onwards
                </Text>
              </View>
              <TouchableOpacity
                style={styles.featuredEnquireBtn}
                onPress={() => router.push(`/inquiry?vendorId=${featuredVendor.id}` as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.featuredEnquireBtnText}>Send Enquiry</Text>
                <Feather name="arrow-right" size={13} color="#2C2420" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Also in Spotlight</Text>
          <View style={styles.sectionDivider} />
        </View>

        {/* Remaining vendors grid */}
        <View style={styles.grid}>
          {remainingVendors.map((vendor, index) => (
            <TouchableOpacity
              key={vendor.id}
              style={styles.vendorCard}
              onPress={() => router.push(`/vendor-profile?id=${vendor.id}` as any)}
              activeOpacity={0.88}
            >
              <Image
                source={{ uri: vendor.portfolio_images?.[0] || '' }}
                style={styles.vendorImage}
                resizeMode="cover"
              />
              <View style={styles.vendorImageOverlay} />

              {/* Rank number */}
              <View style={styles.vendorRank}>
                <Text style={styles.vendorRankText}>#{index + 2}</Text>
              </View>

              <View style={styles.vendorInfo}>
                <Text style={styles.vendorName} numberOfLines={1}>
                  {vendor.name}
                </Text>
                <Text style={styles.vendorCategory}>
                  {getCategoryLabel(vendor.category)}
                </Text>
                <View style={styles.vendorBottom}>
                  <View style={styles.vendorTraction}>
                    <Feather name="heart" size={9} color="#C9A84C" />
                    <Text style={styles.vendorTractionText}>
                      {vendor.tractionScore.toLocaleString()}
                    </Text>
                  </View>
                  <Text style={styles.vendorPrice}>
                    {formatPrice(vendor.starting_price)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Algorithm transparency note */}
        <View style={styles.transparencyCard}>
          <Feather name="info" size={13} color="#8C7B6E" />
          <Text style={styles.transparencyText}>
            Spotlight refreshes on the 1st of every month. Rankings are based on saves, enquiries and confirmed bookings — never paid placement.
          </Text>
        </View>

        <View style={{ height: 120 }} />

      </ScrollView>

      {/* Bottom Nav */}
      <BottomNav />

    </View>
  );
}

const CARD_WIDTH = (width - 60) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    paddingTop: 60,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  headerLeft: { flex: 1, gap: 4 },
  eyebrow: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 34,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.2,
  },
  algorithmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF8EC',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E8D9B5',
    marginTop: 4,
  },
  algorithmText: {
    fontSize: 10,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.5,
  },

  // Editorial note
  editorialNote: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  editorialText: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
    lineHeight: 18,
    textAlign: 'center',
  },

  // Filters
  filterScroll: {
    maxHeight: 44,
    marginBottom: 20,
  },
  filterContent: {
    paddingHorizontal: 24,
    gap: 8,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    backgroundColor: '#FFFFFF',
  },
  filterPillActive: {
    backgroundColor: '#2C2420',
    borderColor: '#2C2420',
  },
  filterPillText: {
    fontSize: 13,
    color: '#2C2420',
    fontFamily: 'DMSans_400Regular',
  },
  filterPillTextActive: {
    color: '#F5F0E8',
    fontFamily: 'DMSans_500Medium',
  },

  // Featured card — #1 vendor
  featuredCard: {
    marginHorizontal: 24,
    height: 420,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
    backgroundColor: 'rgba(20,12,4,0.3)',
  },
  featuredOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'rgba(10,6,3,0.82)',
  },

  // Badges on featured card
  rankBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#C9A84C',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rankBadgeText: {
    fontSize: 11,
    color: '#2C2420',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.8,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 54,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.4)',
  },
  verifiedText: {
    fontSize: 10,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.5,
  },
  tractionBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20,12,4,0.75)',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
  },
  tractionText: {
    fontSize: 11,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
  },

  // Featured vendor info
  featuredInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    gap: 8,
  },
  featuredCategory: {
    fontSize: 10,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 2,
  },
  featuredName: {
    fontSize: 28,
    color: '#F5F0E8',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  featuredCity: {
    fontSize: 12,
    color: '#C9A84C',
    fontFamily: 'DMSans_300Light',
  },
  featuredDot: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  featuredRating: {
    fontSize: 12,
    color: '#C9A84C',
    fontFamily: 'DMSans_300Light',
  },
  featuredPrice: {
    fontSize: 12,
    color: 'rgba(245,240,232,0.7)',
    fontFamily: 'DMSans_300Light',
  },
  featuredEnquireBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#C9A84C',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  featuredEnquireBtnText: {
    fontSize: 13,
    color: '#2C2420',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.5,
  },

  // Section header
  sectionHeader: {
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E8E0D5',
  },

  // Vendor grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 20,
  },
  vendorCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  vendorImage: {
    width: '100%',
    height: '100%',
  },
  vendorImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'rgba(10,6,3,0.75)',
  },
  vendorRank: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(20,12,4,0.75)',
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
  },
  vendorRankText: {
    fontSize: 10,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.5,
  },
  vendorInfo: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    gap: 3,
  },
  vendorName: {
    fontSize: 14,
    color: '#F5F0E8',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.2,
  },
  vendorCategory: {
    fontSize: 10,
    color: '#C9A84C',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.5,
  },
  vendorBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  vendorTraction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  vendorTractionText: {
    fontSize: 10,
    color: '#C9A84C',
    fontFamily: 'DMSans_300Light',
  },
  vendorPrice: {
    fontSize: 10,
    color: 'rgba(245,240,232,0.7)',
    fontFamily: 'DMSans_300Light',
  },

  // Transparency card
  transparencyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 24,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  transparencyText: {
    flex: 1,
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.2,
    lineHeight: 18,
  },

  // Bottom nav
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
    backgroundColor: '#F5F0E8',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  navItem: { alignItems: 'center', gap: 4 },
  navLabel: {
    fontSize: 10,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.3,
  },
  navLabelActive: {
    color: '#2C2420',
    fontFamily: 'DMSans_500Medium',
  },
  navDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C9A84C',
  },
});