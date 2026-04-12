import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Image, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display/index';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';

const { width } = Dimensions.get('window');

// SWAP: Replace image URIs with real vendor images when confirmed
const OFFERS = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800',
    offerTitle: '20% Off Wedding Photography',
    vendorName: 'Arjun Mehta Photography',
    vendorLocation: 'Delhi NCR',
    category: 'Photography',
    validTill: 'Valid till 30 April 2026',
    discount: '20% OFF',
    tagline: 'Full wedding day coverage included',
    vendorId: 'arjun-mehta',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800',
    offerTitle: 'Free Décor with Venue Booking',
    vendorName: 'The Leela Palace',
    vendorLocation: 'Delhi NCR',
    category: 'Venues',
    validTill: 'Valid till 15 May 2026',
    discount: 'FREE DÉCOR',
    tagline: 'Worth ₹3L — complimentary with booking',
    vendorId: 'leela-palace-delhi',
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800',
    offerTitle: 'Bridal Package at Special Price',
    vendorName: 'Namrata Soni',
    vendorLocation: 'Mumbai',
    category: 'MUAs',
    validTill: 'Valid till 25 April 2026',
    discount: '15% OFF',
    tagline: 'Pre-bridal + wedding day package',
    vendorId: 'namrata-soni',
  },
  {
    id: '4',
    image: 'https://images.unsplash.com/photo-1571266028243-d220c6a5d70b?w=800',
    offerTitle: 'DJ + Sound System Bundle',
    vendorName: 'DJ Chetas',
    vendorLocation: 'Mumbai',
    category: 'DJ & Music',
    validTill: 'Valid till 1 May 2026',
    discount: 'BUNDLE DEAL',
    tagline: 'Full night + premium sound system',
    vendorId: 'dj-chetas',
  },
  {
    id: '5',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
    offerTitle: 'Custom Jewellery at Cost Price',
    vendorName: 'Anmol Jewellers',
    vendorLocation: 'Delhi NCR',
    category: 'Jewellery',
    validTill: 'Valid till 30 June 2026',
    discount: 'COST PRICE',
    tagline: 'Polki & Kundan — custom design only',
    vendorId: 'anmol-jewellers',
  },
  {
    id: '6',
    image: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800',
    offerTitle: 'Sangeet Choreography Package',
    vendorName: 'Shakti Mohan',
    vendorLocation: 'Mumbai',
    category: 'Choreographers',
    validTill: 'Valid till 20 May 2026',
    discount: '10% OFF',
    tagline: '8 sessions — group & solo included',
    vendorId: 'shakti-mohan',
  },
];

const FILTERS = ['All', 'Photography', 'Venues', 'MUAs', 'DJ & Music', 'Jewellery', 'Choreographers'];

export default function SpecialOffersScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentIndex, setCurrentIndex] = useState(0);

  const [fontsLoaded] = useFonts({
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  const filtered = activeFilter === 'All'
    ? OFFERS
    : OFFERS.filter(o => o.category === activeFilter);

  const current = filtered[currentIndex];

  const handleClaim = () => {
    if (!current) return;
    router.push({
      pathname: '/inquiry',
      params: {
        vendorId: current.vendorId,
        vendorName: current.vendorName,
      },
    } as any);
  };

  // fonts load async — render proceeds

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#2C2420" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Special Offers</Text>
          <Text style={styles.subtitle}>Exclusive deals from top vendors</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
            onPress={() => { setActiveFilter(f); setCurrentIndex(0); }}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.filterPillText,
              activeFilter === f && styles.filterPillTextActive,
            ]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Main offer card */}
      {current && (
        <View style={styles.photoWrapper}>
          <Image
            source={{ uri: current.image }}
            style={styles.photo}
            resizeMode="cover"
          />

          <View style={styles.overlayTop} />
          <View style={styles.overlayBottom} />

          {/* Discount badge — top left, architectural */}
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{current.discount}</Text>
          </View>

          {/* Counter — top right */}
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {filtered.length}
            </Text>
          </View>

          {/* Offer info + claim button */}
          <View style={styles.vendorBlock}>
            <View style={styles.vendorInfo}>
              <Text style={styles.offerTitle}>{current.offerTitle}</Text>
              <Text style={styles.vendorName}>{current.vendorName}</Text>
              <View style={styles.vendorLocationRow}>
                <Feather name="map-pin" size={11} color="#C9A84C" />
                <Text style={styles.vendorLocation}>{current.vendorLocation}</Text>
              </View>
              <Text style={styles.vendorTagline}>{current.tagline}</Text>
              <View style={styles.validRow}>
                <Feather name="clock" size={11} color="#8C7B6E" />
                <Text style={styles.validTill}>{current.validTill}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.claimBtn}
              onPress={handleClaim}
              activeOpacity={0.85}
            >
              <Text style={styles.claimBtnText}>Claim Offer</Text>
              <Feather name="arrow-right" size={13} color="#2C2420" />
            </TouchableOpacity>
          </View>

          {/* Nav */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
              onPress={() => currentIndex > 0 && setCurrentIndex(p => p - 1)}
              activeOpacity={0.8}
            >
              <Feather name="chevron-left" size={20} color="#2C2420" />
            </TouchableOpacity>

            <View style={styles.dots}>
              {filtered.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.dot, currentIndex === i && styles.dotActive]}
                  onPress={() => setCurrentIndex(i)}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.navBtn, currentIndex === filtered.length - 1 && styles.navBtnDisabled]}
              onPress={() => currentIndex < filtered.length - 1 && setCurrentIndex(p => p + 1)}
              activeOpacity={0.8}
            >
              <Feather name="chevron-right" size={20} color="#2C2420" />
            </TouchableOpacity>
          </View>

        </View>
      )}

      {/* Bottom card — vendor CTA */}
      <View style={styles.bottomCard}>
        <View style={styles.bottomLeft}>
          <Text style={styles.premiumTitle}>Are you a vendor?</Text>
          <Text style={styles.premiumSub}>
            Post an offer — reach thousands of couples
          </Text>
        </View>
        <TouchableOpacity
          style={styles.postBtn}
          onPress={() => router.push('/vendor-login')}
          activeOpacity={0.85}
        >
          <Text style={styles.postBtnText}>Post Offer</Text>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 3,
  },
  title: {
    fontSize: 18,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.5,
  },

  // Filters
  filterScroll: {
    maxHeight: 44,
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 24,
    gap: 8,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: 18,
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

  // Photo card
  photoWrapper: {
    flex: 1,
    marginHorizontal: 24,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '20%',
    backgroundColor: 'rgba(20,12,4,0.25)',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
    backgroundColor: 'rgba(20,12,4,0.82)',
  },

  // Discount badge — clean, architectural
  discountBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: '#C9A84C',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  discountText: {
    fontSize: 11,
    color: '#2C2420',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 1.2,
  },

  // Counter
  counter: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(245,240,232,0.9)',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  counterText: {
    fontSize: 11,
    color: '#2C2420',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.5,
  },

  // Vendor block
  vendorBlock: {
    position: 'absolute',
    bottom: 64,
    left: 20,
    right: 20,
    gap: 14,
  },
  vendorInfo: {
    gap: 5,
  },
  offerTitle: {
    fontSize: 22,
    color: '#F5F0E8',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
    lineHeight: 30,
  },
  vendorName: {
    fontSize: 15,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.3,
  },
  vendorLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vendorLocation: {
    fontSize: 12,
    color: '#C9A84C',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.3,
  },
  vendorTagline: {
    fontSize: 13,
    color: 'rgba(245,240,232,0.7)',
    fontFamily: 'DMSans_300Light',
    letterSpacing: 0.2,
  },
  validRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  validTill: {
    fontSize: 11,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },

  // Claim button
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C9A84C',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    minWidth: 160,
  },
  claimBtnText: {
    fontSize: 13,
    color: '#2C2420',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.5,
  },

  // Nav
  navRow: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245,240,232,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(245,240,232,0.4)',
  },
  dotActive: {
    width: 20,
    borderRadius: 3,
    backgroundColor: '#C9A84C',
  },

  // Bottom card
  bottomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginTop: 14,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  bottomLeft: {
    flex: 1,
    gap: 3,
  },
  premiumTitle: {
    fontSize: 14,
    color: '#2C2420',
    fontFamily: 'PlayfairDisplay_400Regular',
    letterSpacing: 0.3,
  },
  premiumSub: {
    fontSize: 12,
    color: '#8C7B6E',
    fontFamily: 'DMSans_300Light',
  },
  postBtn: {
    borderWidth: 1,
    borderColor: '#C9A84C',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  postBtnText: {
    fontSize: 13,
    color: '#C9A84C',
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.3,
  },
});